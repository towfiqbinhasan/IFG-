-- =====================================================================
--  Migration 002: "Forgot password" requests
--  Run once in Supabase -> SQL Editor (safe to re-run).
--  Members can't receive reset emails (logins are usernames), so a
--  forgotten password becomes a request the lab admin resolves by issuing
--  a new temporary password from Admin -> Users.
-- =====================================================================

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
