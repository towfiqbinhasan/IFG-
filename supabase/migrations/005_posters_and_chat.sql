-- =====================================================================
--  Migration 005: Venue posters + lab chat (direct messages & groups)
--  Run once in Supabase -> SQL Editor (safe to re-run).
--
--  1. venues.poster_path + public 'venue-posters' bucket (images)
--  2. conversations / conversation_members / messages
--     - members chat 1:1 or in groups; admins can read every chat,
--       lock ("block") a chat, and delete messages or whole chats
--     - writes that need cross-user checks go through SECURITY DEFINER
--       functions (start_direct_chat, create_group, ...)
--  3. private 'chat' bucket for attachments (images, PDFs, documents)
--  4. realtime on messages
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Venue posters
-- ---------------------------------------------------------------------
alter table public.venues add column if not exists poster_path text;  -- object path in 'venue-posters'

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('venue-posters', 'venue-posters', true, 10485760, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "venue-posters: public read" on storage.objects;
create policy "venue-posters: public read" on storage.objects
  for select using (bucket_id = 'venue-posters');

drop policy if exists "venue-posters: write own folder" on storage.objects;
create policy "venue-posters: write own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'venue-posters' and (storage.foldername(name))[1] = (select auth.uid())::text and public.is_active_user());

drop policy if exists "venue-posters: delete own or admin" on storage.objects;
create policy "venue-posters: delete own or admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'venue-posters' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- ---------------------------------------------------------------------
-- 2. Chat tables
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('direct', 'group')),
  name             text check (char_length(name) <= 80),
  created_by       uuid references public.profiles (id) on delete set null,
  is_locked        boolean not null default false,       -- admin "block": nobody can send
  direct_key       text unique,                          -- '<uuid>:<uuid>' (sorted) for direct chats
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             text not null default 'member' check (role in ('owner', 'member')),
  last_read_at     timestamptz not null default now(),
  joined_at        timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid references public.profiles (id) on delete set null,
  body             text check (char_length(body) <= 4000),
  attachment_path  text,      -- object path in 'chat' bucket: <conversation_id>/<sender_id>/<file>
  attachment_name  text check (char_length(attachment_name) <= 200),
  attachment_type  text check (char_length(attachment_type) <= 120),
  attachment_size  int check (attachment_size >= 0),
  created_at       timestamptz not null default now(),
  check (body is not null or attachment_path is not null)
);

create index if not exists conversation_members_user_idx on public.conversation_members (user_id);
create index if not exists messages_conversation_idx     on public.messages (conversation_id, created_at desc);
create index if not exists conversations_last_idx         on public.conversations (last_message_at desc);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id = p_conversation and user_id = auth.uid());
$$;

-- Same, for storage paths (text folder name; never throws on a bad uuid).
create or replace function public.is_conversation_member_text(p_conversation text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id::text = p_conversation and user_id = auth.uid());
$$;

create or replace function public.conversation_is_open(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations where id = p_conversation and not is_locked);
$$;

create or replace function public.is_group_owner(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id = p_conversation and user_id = auth.uid() and role = 'owner');
$$;

-- New message: bump the conversation and mark it read for the sender.
create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_insert();

-- ---------------------------------------------------------------------
-- RPCs (all checks happen inside; callers must be signed-in active users)
-- ---------------------------------------------------------------------

-- Open (or create) the 1:1 chat with another member. Returns its id.
create or replace function public.start_direct_chat(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me  uuid := auth.uid();
  v_key text;
  v_id  uuid;
begin
  if v_me is null or not public.is_active_user() then raise exception 'Not allowed'; end if;
  if p_other is null or p_other = v_me then raise exception 'Choose another member'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then raise exception 'Member not found'; end if;

  v_key := least(v_me::text, p_other::text) || ':' || greatest(v_me::text, p_other::text);
  insert into public.conversations (kind, created_by, direct_key)
  values ('direct', v_me, v_key)
  on conflict (direct_key) do nothing;
  select id into v_id from public.conversations where direct_key = v_key;

  insert into public.conversation_members (conversation_id, user_id) values (v_id, v_me), (v_id, p_other)
  on conflict do nothing;
  return v_id;
end;
$$;

-- Create a group; the caller becomes its owner.
create or replace function public.create_group(p_name text, p_members uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null or not public.is_active_user() then raise exception 'Not allowed'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'Group name is required'; end if;

  insert into public.conversations (kind, name, created_by) values ('group', left(btrim(p_name), 80), v_me)
  returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role) values (v_id, v_me, 'owner');
  insert into public.conversation_members (conversation_id, user_id)
  select v_id, p.id from public.profiles p
   where p.id = any (coalesce(p_members, '{}')) and p.id <> v_me
  on conflict do nothing;
  return v_id;
end;
$$;

create or replace function public.add_group_members(p_conversation uuid, p_members uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.conversations where id = p_conversation and kind = 'group') then
    raise exception 'Group not found';
  end if;
  if not (public.is_group_owner(p_conversation) or public.is_admin()) then raise exception 'Only the group owner can add people'; end if;
  insert into public.conversation_members (conversation_id, user_id)
  select p_conversation, p.id from public.profiles p where p.id = any (coalesce(p_members, '{}'))
  on conflict do nothing;
end;
$$;

-- Owner/admin removes someone, or anyone removes themselves (leave).
create or replace function public.remove_group_member(p_conversation uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.conversations where id = p_conversation and kind = 'group') then
    raise exception 'Group not found';
  end if;
  if not (p_user = auth.uid() or public.is_group_owner(p_conversation) or public.is_admin()) then
    raise exception 'Not allowed';
  end if;
  delete from public.conversation_members where conversation_id = p_conversation and user_id = p_user;
  -- Keep an owner while the group has members.
  if not exists (select 1 from public.conversation_members where conversation_id = p_conversation and role = 'owner') then
    update public.conversation_members set role = 'owner'
     where conversation_id = p_conversation
       and user_id = (select user_id from public.conversation_members
                       where conversation_id = p_conversation order by joined_at limit 1);
  end if;
end;
$$;

create or replace function public.rename_group(p_conversation uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(btrim(p_name), '') = '' then raise exception 'Group name is required'; end if;
  if not (public.is_group_owner(p_conversation) or public.is_admin()) then raise exception 'Only the group owner can rename it'; end if;
  update public.conversations set name = left(btrim(p_name), 80) where id = p_conversation and kind = 'group';
end;
$$;

-- The caller's chats with last message and unread count (newest first).
create or replace function public.my_conversations()
returns table (
  id uuid, kind text, name text, is_locked boolean, created_by uuid, last_message_at timestamptz,
  last_body text, last_attachment_name text, last_sender_id uuid, unread int
)
language sql stable security definer set search_path = public as $$
  select c.id, c.kind, c.name, c.is_locked, c.created_by, c.last_message_at,
         lm.body, lm.attachment_name, lm.sender_id,
         (select count(*) from public.messages m
           where m.conversation_id = c.id and m.created_at > cm.last_read_at
             and m.sender_id is distinct from auth.uid())::int
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    left join lateral (
      select m.body, m.attachment_name, m.sender_id from public.messages m
       where m.conversation_id = c.id order by m.created_at desc limit 1
    ) lm on true
   where cm.user_id = auth.uid()
   order by c.last_message_at desc;
$$;

create or replace function public.unread_message_count()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(count(*), 0)::int
    from public.conversation_members cm
    join public.messages m on m.conversation_id = cm.conversation_id
   where cm.user_id = auth.uid() and m.created_at > cm.last_read_at
     and m.sender_id is distinct from auth.uid();
$$;

revoke all on function public.start_direct_chat(uuid)              from public, anon;
revoke all on function public.create_group(text, uuid[])           from public, anon;
revoke all on function public.add_group_members(uuid, uuid[])      from public, anon;
revoke all on function public.remove_group_member(uuid, uuid)      from public, anon;
revoke all on function public.rename_group(uuid, text)             from public, anon;
revoke all on function public.my_conversations()                   from public, anon;
revoke all on function public.unread_message_count()               from public, anon;
grant execute on function public.start_direct_chat(uuid)            to authenticated;
grant execute on function public.create_group(text, uuid[])         to authenticated;
grant execute on function public.add_group_members(uuid, uuid[])    to authenticated;
grant execute on function public.remove_group_member(uuid, uuid)    to authenticated;
grant execute on function public.rename_group(uuid, text)           to authenticated;
grant execute on function public.my_conversations()                 to authenticated;
grant execute on function public.unread_message_count()             to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;

-- Conversations: members and admins read; only admins update (lock) or delete.
-- Created only through start_direct_chat / create_group.
drop policy if exists "conversations: member or admin read" on public.conversations;
create policy "conversations: member or admin read" on public.conversations
  for select to authenticated using (public.is_conversation_member(id) or public.is_admin());

drop policy if exists "conversations: admin update" on public.conversations;
create policy "conversations: admin update" on public.conversations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "conversations: admin delete" on public.conversations;
create policy "conversations: admin delete" on public.conversations
  for delete to authenticated using (public.is_admin());

-- Members: visible to fellow members and admins; you may only move your own read marker.
drop policy if exists "conversation_members: member or admin read" on public.conversation_members;
create policy "conversation_members: member or admin read" on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id) or public.is_admin());

drop policy if exists "conversation_members: update own" on public.conversation_members;
create policy "conversation_members: update own" on public.conversation_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke update on public.conversation_members from authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;

-- Messages: members and admins read; active members send to open chats;
-- the sender or an admin deletes.
drop policy if exists "messages: member or admin read" on public.messages;
create policy "messages: member or admin read" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id) or public.is_admin());

drop policy if exists "messages: member send" on public.messages;
create policy "messages: member send" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_active_user()
    and public.is_conversation_member(conversation_id)
    and public.conversation_is_open(conversation_id)
  );

drop policy if exists "messages: sender or admin delete" on public.messages;
create policy "messages: sender or admin delete" on public.messages
  for delete to authenticated using (sender_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Chat attachments: private bucket, path <conversation_id>/<sender_id>/<file>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat', 'chat', false, 26214400,
  array[
    'image/png','image/jpeg','image/webp','image/gif',
    'application/pdf','text/plain','text/csv','application/zip',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat: member or admin read" on storage.objects;
create policy "chat: member or admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat' and (public.is_conversation_member_text((storage.foldername(name))[1]) or public.is_admin()));

drop policy if exists "chat: member upload own folder" on storage.objects;
create policy "chat: member upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat'
    and public.is_active_user()
    and public.is_conversation_member_text((storage.foldername(name))[1])
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "chat: sender or admin delete" on storage.objects;
create policy "chat: sender or admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat' and ((storage.foldername(name))[2] = (select auth.uid())::text or public.is_admin()));

-- ---------------------------------------------------------------------
-- 4. Realtime (new messages appear instantly)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

notify pgrst, 'reload schema';
