-- =====================================================================
--  Migration 003: Preparations & progress updates
--  Run once in Supabase -> SQL Editor (safe to re-run).
--
--  A "preparation" is something a member is working towards (studying a
--  topic, writing a paper, preparing an exam, running experiments...).
--  It has a 0-100 % progress value; every progress update is logged in
--  preparation_updates so the whole lab can follow the timeline.
-- =====================================================================

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
