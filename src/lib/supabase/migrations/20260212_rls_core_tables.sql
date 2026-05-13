-- =============================================================================
-- RLS hardening: registrations, registration_submissions, registration_children,
-- email_template_overrides, and optional public.camps
--
-- Run in Supabase SQL Editor (or psql) as a single transaction after review.
--
-- IMPORTANT (site owner):
--   Some coach browser reads use the Supabase browser client with an authenticated JWT
--   (not the service role) — e.g. listCoachRegistrations(). Those require is_staff_admin() = true.
--   Staff access uses public.is_staff_admin(), which checks:
--     (A) JWT app_metadata.role in ('admin','staff'), OR
--     (B) JWT email listed in public.staff_admin_emails
--   If the owner account is NOT in staff_admin_emails and has no app_metadata.role,
--   add the owner email to staff_admin_emails OR set role in Supabase Auth for that user.
--
-- COLUMN NOTE:
--   registration_submissions uses auth_user_id (references auth.users), not user_id.
--
-- SERVICE ROLE:
--   Server Actions using createServiceRoleClient() bypass RLS — they are NOT blocked.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Helper: staff / admin (matches app intent; DB cannot read OWNER_EMAIL env)
-- ---------------------------------------------------------------------------

create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))) in ('admin', 'staff')
    or exists (
      select 1
      from public.staff_admin_emails e
      where lower(trim(e.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    );
$$;

revoke all on function public.is_staff_admin() from public;
grant execute on function public.is_staff_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Optional: camps catalog (create if missing — Security Advisor may expect it)
-- ---------------------------------------------------------------------------

create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text unique,
  location text,
  start_date date,
  end_date date,
  description text,
  is_published boolean not null default true,
  sort_order int not null default 0
);

alter table public.camps enable row level security;

drop policy if exists "camps_public_read_published" on public.camps;
create policy "camps_public_read_published"
  on public.camps
  for select
  to anon, authenticated
  using (coalesce(is_published, true) = true);

drop policy if exists "camps_staff_all" on public.camps;
create policy "camps_staff_all"
  on public.camps
  for all
  to authenticated
  using (public.is_staff_admin())
  with check (public.is_staff_admin());

-- ---------------------------------------------------------------------------
-- registrations
-- ---------------------------------------------------------------------------

alter table public.registrations enable row level security;

drop policy if exists "Anyone can register" on public.registrations;
drop policy if exists "Admins can view registrations" on public.registrations;
drop policy if exists "Parents insert own registrations" on public.registrations;

drop policy if exists "registrations_select_parent_or_staff" on public.registrations;
create policy "registrations_select_parent_or_staff"
  on public.registrations
  for select
  to authenticated
  using (
    (user_id is not null and user_id = auth.uid())
    or public.is_staff_admin()
  );

drop policy if exists "registrations_insert_own_user" on public.registrations;
create policy "registrations_insert_own_user"
  on public.registrations
  for insert
  to authenticated
  with check (user_id is not null and user_id = auth.uid());

drop policy if exists "registrations_update_parent_or_staff" on public.registrations;
create policy "registrations_update_parent_or_staff"
  on public.registrations
  for update
  to authenticated
  using (
    (user_id is not null and user_id = auth.uid())
    or public.is_staff_admin()
  )
  with check (
    (user_id is not null and user_id = auth.uid())
    or public.is_staff_admin()
  );

drop policy if exists "registrations_delete_parent_or_staff" on public.registrations;
create policy "registrations_delete_parent_or_staff"
  on public.registrations
  for delete
  to authenticated
  using (
    (user_id is not null and user_id = auth.uid())
    or public.is_staff_admin()
  );

-- ---------------------------------------------------------------------------
-- registration_submissions  (ownership = auth_user_id)
-- ---------------------------------------------------------------------------

alter table public.registration_submissions enable row level security;

drop policy if exists "Public can insert registration submissions" on public.registration_submissions;
drop policy if exists "Admins can view registration submissions" on public.registration_submissions;
drop policy if exists "Parents can view own submissions" on public.registration_submissions;
drop policy if exists "Parents can update pending own submissions" on public.registration_submissions;
drop policy if exists "Parents can delete pending own submissions" on public.registration_submissions;

drop policy if exists "submissions_select_own_or_staff" on public.registration_submissions;
create policy "submissions_select_own_or_staff"
  on public.registration_submissions
  for select
  to authenticated
  using (
    (auth_user_id is not null and auth_user_id = auth.uid())
    or public.is_staff_admin()
  );

drop policy if exists "submissions_insert_own" on public.registration_submissions;
create policy "submissions_insert_own"
  on public.registration_submissions
  for insert
  to authenticated
  with check (auth_user_id is not null and auth_user_id = auth.uid());

drop policy if exists "submissions_update_own_or_staff" on public.registration_submissions;
create policy "submissions_update_own_or_staff"
  on public.registration_submissions
  for update
  to authenticated
  using (
    (auth_user_id is not null and auth_user_id = auth.uid())
    or public.is_staff_admin()
  )
  with check (
    (auth_user_id is not null and auth_user_id = auth.uid())
    or public.is_staff_admin()
  );

drop policy if exists "submissions_delete_own_pending_or_staff" on public.registration_submissions;
create policy "submissions_delete_own_pending_or_staff"
  on public.registration_submissions
  for delete
  to authenticated
  using (
    public.is_staff_admin()
    or (
      auth_user_id is not null
      and auth_user_id = auth.uid()
      and lower(coalesce(status, 'pending')) = 'pending'
    )
  );

-- ---------------------------------------------------------------------------
-- registration_children (via submission ownership)
-- ---------------------------------------------------------------------------

alter table public.registration_children enable row level security;

drop policy if exists "Public can insert registration children" on public.registration_children;
drop policy if exists "Admins can view registration children" on public.registration_children;
drop policy if exists "Parents can view own children" on public.registration_children;
drop policy if exists "Parents can update pending own children" on public.registration_children;
drop policy if exists "Parents can delete pending own children" on public.registration_children;

drop policy if exists "children_select_own_or_staff" on public.registration_children;
create policy "children_select_own_or_staff"
  on public.registration_children
  for select
  to authenticated
  using (
    public.is_staff_admin()
    or exists (
      select 1
      from public.registration_submissions s
      where s.id = registration_children.submission_id
        and s.auth_user_id is not null
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "children_insert_own_submission" on public.registration_children;
create policy "children_insert_own_submission"
  on public.registration_children
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.registration_submissions s
      where s.id = registration_children.submission_id
        and s.auth_user_id is not null
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "children_update_own_pending_or_staff" on public.registration_children;
create policy "children_update_own_pending_or_staff"
  on public.registration_children
  for update
  to authenticated
  using (
    public.is_staff_admin()
    or exists (
      select 1
      from public.registration_submissions s
      where s.id = registration_children.submission_id
        and s.auth_user_id is not null
        and s.auth_user_id = auth.uid()
        and lower(coalesce(s.status, 'pending')) = 'pending'
    )
  )
  with check (
    public.is_staff_admin()
    or exists (
      select 1
      from public.registration_submissions s
      where s.id = registration_children.submission_id
        and s.auth_user_id is not null
        and s.auth_user_id = auth.uid()
        and lower(coalesce(s.status, 'pending')) = 'pending'
    )
  );

drop policy if exists "children_delete_own_pending_or_staff" on public.registration_children;
create policy "children_delete_own_pending_or_staff"
  on public.registration_children
  for delete
  to authenticated
  using (
    public.is_staff_admin()
    or exists (
      select 1
      from public.registration_submissions s
      where s.id = registration_children.submission_id
        and s.auth_user_id is not null
        and s.auth_user_id = auth.uid()
        and lower(coalesce(s.status, 'pending')) = 'pending'
    )
  );

-- ---------------------------------------------------------------------------
-- email_template_overrides (browser: staff only; service role bypasses RLS)
-- ---------------------------------------------------------------------------

alter table public.email_template_overrides enable row level security;

drop policy if exists "email_templates_staff_select" on public.email_template_overrides;
create policy "email_templates_staff_select"
  on public.email_template_overrides
  for select
  to authenticated
  using (public.is_staff_admin());

drop policy if exists "email_templates_staff_write" on public.email_template_overrides;
create policy "email_templates_staff_write"
  on public.email_template_overrides
  for insert
  to authenticated
  with check (public.is_staff_admin());

drop policy if exists "email_templates_staff_update" on public.email_template_overrides;
create policy "email_templates_staff_update"
  on public.email_template_overrides
  for update
  to authenticated
  using (public.is_staff_admin())
  with check (public.is_staff_admin());

drop policy if exists "email_templates_staff_delete" on public.email_template_overrides;
create policy "email_templates_staff_delete"
  on public.email_template_overrides
  for delete
  to authenticated
  using (public.is_staff_admin());

-- Post-deploy checks (manual):
--   1) Parent: /dashboard and /register (hydrate) still load.
--   2) Staff in staff_admin_emails: /coaches + listCoachRegistrations + /admin list.
--   3) submitFamilyRegistration still succeeds (service role).
--   4) Optional: insert published rows into public.camps for public schedule UI.

commit;
