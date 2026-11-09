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
  review_pdf_path     text,                -- member's written analysis as a PDF (same bucket)
  paper_type          text not null default 'Empirical'
                       check (paper_type in ('Survey','Empirical','Theoretical','Review','Case study','Dataset','Other')),
  status              text not null default 'To read'
                       check (status in ('To read','Reading','Completed')),
  date_read           date,
  read_method         text check (read_method in ('full_read','skim','abstract_only','group_discussion')),
  time_spent_minutes  int check (time_spent_minutes >= 0),
  summary             text,
  novelty             text,
  research_gap        text,
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

-- PASSWORD RESET REQUESTS ("Forgot password") -------------------------
create table if not exists public.password_reset_requests (
  id           uuid primary key default gen_random_uuid(),
  username     text not null check (char_length(username) between 1 and 64),
  user_id      uuid references public.profiles (id) on delete cascade,  -- null if no such username
  note         text check (char_length(note) <= 300),
  status       text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles (id) on delete set null
);

-- At most one open request per username (repeat clicks don't pile up).
create unique index if not exists password_reset_requests_one_pending
  on public.password_reset_requests (lower(username)) where status = 'pending';
create index if not exists password_reset_requests_status_idx
  on public.password_reset_requests (status, created_at desc);

alter table public.password_reset_requests enable row level security;

-- Only admins can see / resolve requests. There is no INSERT policy:
-- requests are created by the server route /api/auth/forgot-password
-- (service role), so anonymous visitors can't write to the table directly.
drop policy if exists "reset_requests: admin read" on public.password_reset_requests;
create policy "reset_requests: admin read" on public.password_reset_requests
  for select to authenticated using (public.is_admin());

drop policy if exists "reset_requests: admin update" on public.password_reset_requests;
create policy "reset_requests: admin update" on public.password_reset_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reset_requests: admin delete" on public.password_reset_requests;
create policy "reset_requests: admin delete" on public.password_reset_requests
  for delete to authenticated using (public.is_admin());

-- PREPARATIONS & PROGRESS UPDATES ------------------------------------
create table if not exists public.preparations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text check (char_length(description) <= 2000),
  category     text not null default 'Topic study'
                check (category in ('Topic study','Paper writing','Experiment','Exam / Course','Skill','Other')),
  topic_id     uuid references public.topics (id) on delete set null,
  target_date  date,
  progress     int not null default 0 check (progress between 0 and 100),
  status       text not null default 'Active' check (status in ('Active','Paused','Completed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.preparation_updates (
  id              uuid primary key default gen_random_uuid(),
  preparation_id  uuid not null references public.preparations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  progress        int not null check (progress between 0 and 100),
  note            text check (char_length(note) <= 1000),
  created_at      timestamptz not null default now()
);

create index if not exists preparations_user_idx      on public.preparations (user_id);
create index if not exists preparations_topic_idx     on public.preparations (topic_id);
create index if not exists preparations_updated_idx   on public.preparations (updated_at desc);
create index if not exists prep_updates_prep_idx      on public.preparation_updates (preparation_id, created_at desc);
create index if not exists prep_updates_created_idx   on public.preparation_updates (created_at desc);

-- updated_at + immutable owner (reuses helpers from schema.sql)
drop trigger if exists preparations_updated_at on public.preparations;
create trigger preparations_updated_at before update on public.preparations
  for each row execute function public.set_updated_at();
drop trigger if exists preparations_protect_owner on public.preparations;
create trigger preparations_protect_owner before update on public.preparations
  for each row execute function public.protect_owner_column();

-- Posting an update moves the preparation's progress (and completes it at 100 %).
create or replace function public.apply_preparation_update()
returns trigger
language plpgsql
as $$
begin
  update public.preparations
     set progress = new.progress,
         status = case
                    when new.progress = 100 then 'Completed'
                    when status = 'Completed' then 'Active'
                    else status
                  end
   where id = new.preparation_id;
  return new;
end;
$$;

drop trigger if exists preparation_updates_apply on public.preparation_updates;
create trigger preparation_updates_apply after insert on public.preparation_updates
  for each row execute function public.apply_preparation_update();

-- Row Level Security: everyone signed in can READ (the whole lab sees progress);
-- members write only their own; admins can moderate (delete).
alter table public.preparations        enable row level security;
alter table public.preparation_updates enable row level security;

drop policy if exists "preparations: authenticated read" on public.preparations;
create policy "preparations: authenticated read" on public.preparations
  for select to authenticated using (true);

drop policy if exists "preparations: insert own" on public.preparations;
create policy "preparations: insert own" on public.preparations
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "preparations: update own" on public.preparations;
create policy "preparations: update own" on public.preparations
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_active_user())
  with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "preparations: delete own or admin" on public.preparations;
create policy "preparations: delete own or admin" on public.preparations
  for delete to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());

drop policy if exists "prep_updates: authenticated read" on public.preparation_updates;
create policy "prep_updates: authenticated read" on public.preparation_updates
  for select to authenticated using (true);

drop policy if exists "prep_updates: insert own" on public.preparation_updates;
create policy "prep_updates: insert own" on public.preparation_updates
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and exists (select 1 from public.preparations p where p.id = preparation_id and p.user_id = (select auth.uid()))
  );

drop policy if exists "prep_updates: delete own or admin" on public.preparation_updates;
create policy "prep_updates: delete own or admin" on public.preparation_updates
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

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

-- ---------------------------------------------------------------------
-- 7. Venue posters + lab chat (same as migrations/005_posters_and_chat.sql)
-- ---------------------------------------------------------------------

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


-- Done. Verify with:
--   select username, role, must_change_password from public.profiles;
