-- =====================================================================
--  Research Lab Paper Tracker - Supabase schema
--  Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
--  It is idempotent where practical (safe to re-run for functions/policies).
--
--  Contents
--    0. Extensions
--    1. Tables (profiles, topics, papers, paper_topics, venues, submissions, app_settings)
--    2. Indexes
--    3. Helper functions (is_admin, is_active_user) + triggers
--    4. Row Level Security policies
--    5. Storage buckets (avatars, papers) + policies
--    6. Seed: initial admin account + starter topics
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- One row per auth user. Created automatically by trigger on auth.users.
create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  username              text not null unique
                         check (username ~ '^[a-zA-Z0-9._-]{3,32}$'),
  full_name             text not null default '',
  avatar_url            text,
  research_area         text,
  bio                   text,
  role                  text not null default 'member' check (role in ('admin', 'member')),
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  joined_at             date not null default current_date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.topics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  color       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.papers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 500),
  authors             text,
  year                int check (year between 1900 and 2100),
  venue               text,
  doi_url             text,
  pdf_path            text,                -- object path inside the 'papers' storage bucket
  paper_type          text not null default 'Empirical'
                       check (paper_type in ('Survey','Empirical','Theoretical','Review','Case study','Dataset','Other')),
  status              text not null default 'To read'
                       check (status in ('To read','Reading','Completed')),
  date_read           date,
  read_method         text check (read_method in ('full_read','skim','abstract_only','group_discussion')),
  time_spent_minutes  int check (time_spent_minutes >= 0),
  summary             text,
  key_contributions   text,
  methodology         text,
  results             text,
  limitations         text,
  notes               text,
  rating              int check (rating between 1 and 5),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.paper_topics (
  paper_id  uuid not null references public.papers (id) on delete cascade,
  topic_id  uuid not null references public.topics (id) on delete cascade,
  primary key (paper_id, topic_id)
);

create table if not exists public.venues (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(name) between 1 and 200),
  type                 text not null default 'conference' check (type in ('conference','journal')),
  website              text,
  location             text,
  field                text,              -- research field / topic area, used for filtering
  abstract_deadline    timestamptz,
  submission_deadline  timestamptz,
  notification_date    timestamptz,
  camera_ready_date    timestamptz,
  notes                text,
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venues (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  paper_title  text not null check (char_length(paper_title) between 1 and 500),
  status       text not null default 'Planning'
                check (status in ('Planning','Writing','Submitted','Accepted','Rejected')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Single-row lab settings table (id is always 1).
create table if not exists public.app_settings (
  id                    int primary key default 1 check (id = 1),
  allow_member_venues   boolean not null default true,
  lab_name              text not null default 'The Intelligence Forge Lab',
  updated_at            timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------
create unique index if not exists topics_name_lower_idx on public.topics (lower(name));
create index if not exists papers_user_id_idx          on public.papers (user_id);
create index if not exists papers_created_at_idx       on public.papers (created_at desc);
create index if not exists papers_status_idx           on public.papers (status);
create index if not exists papers_type_idx             on public.papers (paper_type);
create index if not exists papers_year_idx             on public.papers (year);
create index if not exists papers_date_read_idx        on public.papers (date_read);
create index if not exists paper_topics_topic_idx      on public.paper_topics (topic_id);
create index if not exists venues_submission_idx       on public.venues (submission_deadline);
create index if not exists venues_abstract_idx         on public.venues (abstract_deadline);
create index if not exists submissions_venue_idx       on public.submissions (venue_id);
create index if not exists submissions_user_idx        on public.submissions (user_id);
create index if not exists profiles_role_idx           on public.profiles (role);

-- ---------------------------------------------------------------------
-- 3. Helper functions & triggers
-- ---------------------------------------------------------------------

-- TRUE when the calling user is an active admin. SECURITY DEFINER so it can
-- read profiles without recursing through profiles' own RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- TRUE when the calling user exists and is not deactivated.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  );
$$;

-- Generic updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists papers_updated_at on public.papers;
create trigger papers_updated_at before update on public.papers
  for each row execute function public.set_updated_at();
drop trigger if exists venues_updated_at on public.venues;
create trigger venues_updated_at before update on public.venues
  for each row execute function public.set_updated_at();
drop trigger if exists submissions_updated_at on public.submissions;
create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

-- Create a profile whenever an auth user is created (by the admin API route
-- or the seed below). The role is ALWAYS 'member' here; only the server-side
-- admin route (service role) can promote. This prevents privilege escalation
-- through user-supplied metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(new.raw_user_meta_data ->> 'username', lower(split_part(new.email, '@', 1)));
  insert into public.profiles (id, username, full_name, role, must_change_password)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', v_username),
    'member',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Members may edit their own profile (name, bio, avatar, research area) but
-- must NOT be able to change privileged columns. Only admins, the service
-- role (server API routes) and the SQL editor (postgres) can change them.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.role                 := old.role;
    new.is_active            := old.is_active;
    new.must_change_password := old.must_change_password;
    new.username             := old.username;
    new.joined_at            := old.joined_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Paper ownership is immutable for non-admins (cannot re-assign a paper).
create or replace function public.protect_owner_column()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists papers_protect_owner on public.papers;
create trigger papers_protect_owner before update on public.papers
  for each row execute function public.protect_owner_column();
drop trigger if exists submissions_protect_owner on public.submissions;
create trigger submissions_protect_owner before update on public.submissions
  for each row execute function public.protect_owner_column();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.topics       enable row level security;
alter table public.papers       enable row level security;
alter table public.paper_topics enable row level security;
alter table public.venues       enable row level security;
alter table public.submissions  enable row level security;
alter table public.app_settings enable row level security;

-- PROFILES -------------------------------------------------------------
drop policy if exists "profiles: authenticated read" on public.profiles;
create policy "profiles: authenticated read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles: admin delete" on public.profiles;
create policy "profiles: admin delete" on public.profiles
  for delete to authenticated using (public.is_admin());
-- No INSERT policy: profiles are created only by the auth trigger.

-- TOPICS ---------------------------------------------------------------
drop policy if exists "topics: authenticated read" on public.topics;
create policy "topics: authenticated read" on public.topics
  for select to authenticated using (true);

drop policy if exists "topics: active users create" on public.topics;
create policy "topics: active users create" on public.topics
  for insert to authenticated
  with check (public.is_active_user() and created_by = (select auth.uid()));

drop policy if exists "topics: admin update" on public.topics;
create policy "topics: admin update" on public.topics
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "topics: admin delete" on public.topics;
create policy "topics: admin delete" on public.topics
  for delete to authenticated using (public.is_admin());

-- PAPERS ---------------------------------------------------------------
drop policy if exists "papers: authenticated read" on public.papers;
create policy "papers: authenticated read" on public.papers
  for select to authenticated using (true);

drop policy if exists "papers: insert own" on public.papers;
create policy "papers: insert own" on public.papers
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "papers: update own or admin" on public.papers;
create policy "papers: update own or admin" on public.papers
  for update to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin())
  with check ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());

drop policy if exists "papers: delete own or admin" on public.papers;
create policy "papers: delete own or admin" on public.papers
  for delete to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());

-- PAPER_TOPICS (writable by the owner of the linked paper, or admin) ----
drop policy if exists "paper_topics: authenticated read" on public.paper_topics;
create policy "paper_topics: authenticated read" on public.paper_topics
  for select to authenticated using (true);

drop policy if exists "paper_topics: owner insert" on public.paper_topics;
create policy "paper_topics: owner insert" on public.paper_topics
  for insert to authenticated
  with check (
    public.is_admin() or exists (
      select 1 from public.papers p
      where p.id = paper_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "paper_topics: owner delete" on public.paper_topics;
create policy "paper_topics: owner delete" on public.paper_topics
  for delete to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.papers p
      where p.id = paper_id and p.user_id = (select auth.uid())
    )
  );

-- VENUES ---------------------------------------------------------------
drop policy if exists "venues: authenticated read" on public.venues;
create policy "venues: authenticated read" on public.venues
  for select to authenticated using (true);

drop policy if exists "venues: create (admin or members if allowed)" on public.venues;
create policy "venues: create (admin or members if allowed)" on public.venues
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.is_active_user()
      and created_by = (select auth.uid())
      and (select allow_member_venues from public.app_settings where id = 1)
    )
  );

drop policy if exists "venues: update creator or admin" on public.venues;
create policy "venues: update creator or admin" on public.venues
  for update to authenticated
  using (public.is_admin() or (created_by = (select auth.uid()) and public.is_active_user()))
  with check (public.is_admin() or (created_by = (select auth.uid()) and public.is_active_user()));

drop policy if exists "venues: delete creator or admin" on public.venues;
create policy "venues: delete creator or admin" on public.venues
  for delete to authenticated
  using (public.is_admin() or (created_by = (select auth.uid()) and public.is_active_user()));

-- SUBMISSIONS ----------------------------------------------------------
drop policy if exists "submissions: authenticated read" on public.submissions;
create policy "submissions: authenticated read" on public.submissions
  for select to authenticated using (true);

drop policy if exists "submissions: insert own" on public.submissions;
create policy "submissions: insert own" on public.submissions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "submissions: update own or admin" on public.submissions;
create policy "submissions: update own or admin" on public.submissions
  for update to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin())
  with check ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());

drop policy if exists "submissions: delete own or admin" on public.submissions;
create policy "submissions: delete own or admin" on public.submissions
  for delete to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());

-- APP_SETTINGS ---------------------------------------------------------
drop policy if exists "app_settings: authenticated read" on public.app_settings;
create policy "app_settings: authenticated read" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "app_settings: admin update" on public.app_settings;
create policy "app_settings: admin update" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Storage buckets + policies
--    avatars : public read (images shown everywhere), write own folder
--    papers  : private; authenticated read via signed URLs, write own folder
--    Object paths are always  "<user_id>/<...>"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true,  2097152,  array['image/png','image/jpeg','image/webp','image/gif']),
  ('papers',  'papers',  false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: write own folder" on storage.objects;
create policy "avatars: write own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: update own folder" on storage.objects;
create policy "avatars: update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: delete own or admin" on storage.objects;
create policy "avatars: delete own or admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

drop policy if exists "papers: authenticated read" on storage.objects;
create policy "papers: authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'papers');

drop policy if exists "papers: write own folder" on storage.objects;
create policy "papers: write own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'papers' and (storage.foldername(name))[1] = (select auth.uid())::text
              and public.is_active_user());

drop policy if exists "papers: update own folder" on storage.objects;
create policy "papers: update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'papers' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "papers: delete own or admin" on storage.objects;
create policy "papers: delete own or admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'papers' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- ---------------------------------------------------------------------
-- 6. Seed data
-- ---------------------------------------------------------------------

-- 6a. Initial admin account
--     username: admin
--     password: ChangeMe!2024   <-- temporary; you are forced to change it on first login.
--     To use a different initial password, edit it below BEFORE running.
do $$
declare
  v_uid   uuid;
  v_email text := 'admin@lab.local';   -- must match NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN
  v_pass  text := 'ChangeMe!2024';
begin
  select id into v_uid from auth.users where email = v_email;

  if v_uid is null then
    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","full_name":"Lab Administrator"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- The trigger created the profile as 'member'; promote it (runs as postgres).
  update public.profiles
     set role = 'admin', full_name = coalesce(nullif(full_name, ''), 'Lab Administrator')
   where id = v_uid;
end $$;

-- 6b. Starter topics (optional - delete or edit freely)
insert into public.topics (name, color) values
  ('Machine Learning', '#2a78d6'),
  ('Computer Vision', '#eb6834'),
  ('Natural Language Processing', '#1baf7a'),
  ('Reinforcement Learning', '#eda100'),
  ('Human-Computer Interaction', '#e87ba4'),
  ('Systems', '#008300')
on conflict do nothing;

-- Done. Verify with:
--   select username, role, must_change_password from public.profiles;
