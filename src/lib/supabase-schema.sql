-- Next Level Soccer: registration schema (Supabase SQL editor)
-- Run in order. Legacy `registrations` kept for historical rows; new flow uses submissions + children.

-- Legacy single-row registrations (optional — skip if table never existed)
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  parent_first_name text not null,
  parent_last_name  text not null,
  parent_email      text not null,
  parent_phone      text not null,
  player_first_name text not null,
  player_last_name  text not null,
  player_dob        date not null,
  player_age_group  text not null,
  player_experience text not null,
  camp_session      text not null,
  shirt_size        text not null,
  child_photo_url   text,
  medical_notes     text,
  emergency_contact_name  text not null,
  emergency_contact_phone text not null,
  status            text default 'pending',

  user_id uuid references auth.users (id) on delete set null,
  refund_requested_weeks text[] not null default '{}'
);

-- Optional legacy columns (aligned with registration_children / playing level incl. Silver as free text)
alter table public.registrations add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.registrations add column if not exists refund_requested_weeks text[] default '{}';
-- Optional: multiple weeks per row (mirrors registration_children). When null/empty, `camp_session` is used for spot counts.
alter table public.registrations add column if not exists camp_weeks text[];
alter table public.registrations add column if not exists primary_position text;
alter table public.registrations add column if not exists secondary_position text;
alter table public.registrations add column if not exists playing_level text;
alter table public.registrations add column if not exists soccer_club text;

alter table registrations enable row level security;
alter table registrations add column if not exists child_photo_url text;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registrations' and policyname = 'Anyone can register'
  ) then
    create policy "Anyone can register" on registrations for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registrations' and policyname = 'Admins can view registrations'
  ) then
    create policy "Admins can view registrations" on registrations for select using (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registrations' and policyname = 'Parents insert own registrations'
  ) then
    create policy "Parents insert own registrations"
      on registrations for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- One parent submission; multiple children in registration_children
create table if not exists registration_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  auth_user_id uuid references auth.users (id) on delete set null,

  parent_first_name text not null,
  parent_last_name  text not null,
  parent_email      text not null,
  parent_phone      text not null,

  second_parent_first_name text,
  second_parent_last_name  text,
  second_parent_email      text,
  second_parent_phone      text,

  total_amount_cents int,
  status text not null default 'pending'
);

create table if not exists registration_children (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references registration_submissions (id) on delete cascade,
  sort_order int not null default 0,

  player_first_name text not null,
  player_last_name  text not null,
  player_pronouns   text not null,
  player_dob        date not null,
  player_gender     text not null,
  player_experience_level text not null,
  player_experience_other text,
  primary_position  text not null,
  secondary_position text not null,
  grade_fall        text not null,
  school_fall       text not null,
  child_photo_url   text,

  camp_weeks text[] not null,
  shirt_size text not null,

  medical_notes text,
  emergency_contact_name  text not null,
  emergency_contact_phone text not null,

  refund_requested_weeks text[] not null default '{}'
);

-- Migration for existing databases that already have registration_children with legacy columns:
-- Run this block in the Supabase SQL editor if your table was created before pronouns/gender/etc.
alter table registration_children add column if not exists player_pronouns text;
alter table registration_children add column if not exists player_gender text;
alter table registration_children add column if not exists player_experience_level text;
alter table registration_children add column if not exists player_experience_other text;
alter table registration_children add column if not exists grade_fall text;
alter table registration_children add column if not exists school_fall text;
alter table registration_children add column if not exists child_photo_url text;
alter table registration_children add column if not exists primary_position text;
alter table registration_children add column if not exists secondary_position text;
alter table registration_children add column if not exists refund_requested_weeks text[] default '{}';
alter table registration_children add column if not exists soccer_club text;

do $$
begin
  alter table registration_children alter column player_age_group drop not null;
exception
  when undefined_column then null;
end $$;

do $$
begin
  alter table registration_children alter column player_experience drop not null;
exception
  when undefined_column then null;
end $$;

create index if not exists registration_children_submission_id_idx on registration_children (submission_id);

-- Denormalized `registrations` rows (per child × week) link back to the family submission for admin status sync.
alter table public.registrations add column if not exists registration_submission_id uuid references public.registration_submissions (id) on delete set null;
create index if not exists registrations_registration_submission_id_idx on public.registrations (registration_submission_id);

alter table registration_submissions enable row level security;
alter table registration_children enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_submissions' and policyname = 'Public can insert registration submissions'
  ) then
    create policy "Public can insert registration submissions"
      on registration_submissions for insert
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_submissions' and policyname = 'Admins can view registration submissions'
  ) then
    create policy "Admins can view registration submissions"
      on registration_submissions for select
      using (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_submissions' and policyname = 'Parents can view own submissions'
  ) then
    create policy "Parents can view own submissions"
      on registration_submissions for select
      using (auth.uid() = auth_user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_submissions' and policyname = 'Parents can update pending own submissions'
  ) then
    create policy "Parents can update pending own submissions"
      on registration_submissions for update
      using (auth.uid() = auth_user_id and status = 'pending')
      with check (auth.uid() = auth_user_id and status = 'pending');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_submissions' and policyname = 'Parents can delete pending own submissions'
  ) then
    create policy "Parents can delete pending own submissions"
      on registration_submissions for delete
      using (auth.uid() = auth_user_id and status = 'pending');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_children' and policyname = 'Public can insert registration children'
  ) then
    create policy "Public can insert registration children"
      on registration_children for insert
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_children' and policyname = 'Admins can view registration children'
  ) then
    create policy "Admins can view registration children"
      on registration_children for select
      using (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_children' and policyname = 'Parents can view own children'
  ) then
    create policy "Parents can view own children"
      on registration_children for select
      using (
        exists (
          select 1 from registration_submissions s
          where s.id = registration_children.submission_id
            and s.auth_user_id = auth.uid()
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_children' and policyname = 'Parents can update pending own children'
  ) then
    create policy "Parents can update pending own children"
      on registration_children for update
      using (
        exists (
          select 1 from registration_submissions s
          where s.id = registration_children.submission_id
            and s.auth_user_id = auth.uid()
            and s.status = 'pending'
        )
      )
      with check (
        exists (
          select 1 from registration_submissions s
          where s.id = registration_children.submission_id
            and s.auth_user_id = auth.uid()
            and s.status = 'pending'
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'registration_children' and policyname = 'Parents can delete pending own children'
  ) then
    create policy "Parents can delete pending own children"
      on registration_children for delete
      using (
        exists (
          select 1 from registration_submissions s
          where s.id = registration_children.submission_id
            and s.auth_user_id = auth.uid()
            and s.status = 'pending'
        )
      );
  end if;
end $$;

-- Coach player reports (16 metric columns; 12 used for parent-facing doc; *_4 legacy/null on new saves)
create table if not exists player_reports (
  id uuid primary key default gen_random_uuid(),

  registration_child_id uuid not null references registration_children (id) on delete cascade,

  technical_1 int check (technical_1 is null or (technical_1 between 1 and 5)),
  technical_2 int check (technical_2 is null or (technical_2 between 1 and 5)),
  technical_3 int check (technical_3 is null or (technical_3 between 1 and 5)),
  technical_4 int check (technical_4 is null or (technical_4 between 1 and 5)),

  tactical_1 int check (tactical_1 is null or (tactical_1 between 1 and 5)),
  tactical_2 int check (tactical_2 is null or (tactical_2 between 1 and 5)),
  tactical_3 int check (tactical_3 is null or (tactical_3 between 1 and 5)),
  tactical_4 int check (tactical_4 is null or (tactical_4 between 1 and 5)),

  physical_1 int check (physical_1 is null or (physical_1 between 1 and 5)),
  physical_2 int check (physical_2 is null or (physical_2 between 1 and 5)),
  physical_3 int check (physical_3 is null or (physical_3 between 1 and 5)),
  physical_4 int check (physical_4 is null or (physical_4 between 1 and 5)),

  psychological_1 int check (psychological_1 is null or (psychological_1 between 1 and 5)),
  psychological_2 int check (psychological_2 is null or (psychological_2 between 1 and 5)),
  psychological_3 int check (psychological_3 is null or (psychological_3 between 1 and 5)),
  psychological_4 int check (psychological_4 is null or (psychological_4 between 1 and 5)),

  coach_comments text,
  date_generated timestamptz not null default now(),
  parent_email_sent_at timestamptz,

  created_by uuid references auth.users (id) on delete set null
);

create index if not exists player_reports_registration_child_id_idx on player_reports (registration_child_id);
create index if not exists player_reports_date_generated_idx on player_reports (date_generated desc);

-- Which camp week this report is for (matches registrations.camp_session / CAMP_SESSIONS labels).
alter table public.player_reports add column if not exists camp_session text;
alter table public.player_reports add column if not exists parent_email_sent_at timestamptz;
create index if not exists player_reports_child_camp_idx on public.player_reports (registration_child_id, camp_session);

-- One submitted report per camper per camp week (coach finalizes → parent email).
create unique index if not exists player_reports_child_camp_unique
  on public.player_reports (registration_child_id, camp_session)
  where camp_session is not null;

alter table public.registrations add column if not exists decline_reason text;
alter table public.registrations add column if not exists refund_denial_reason text;
alter table public.registrations add column if not exists camp_completed_at timestamptz;
alter table public.registrations add column if not exists refund_approved_at timestamptz;
alter table public.registrations add column if not exists refund_money_sent_at timestamptz;
alter table public.registrations add column if not exists organizer_cancelled_at timestamptz;

-- Staff-applied discount for this camp week (USD cents); only when status is confirmed. Max = one week list price.
alter table public.registrations add column if not exists coach_discount_cents int not null default 0;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'registrations_coach_discount_cents_check'
  ) then
    alter table public.registrations add constraint registrations_coach_discount_cents_check
      check (coach_discount_cents >= 0 and coach_discount_cents <= 35000);
  end if;
end $$;

alter table player_reports enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'player_reports' and policyname = 'Authenticated coaches manage player reports'
  ) then
    execute 'drop policy "Authenticated coaches manage player reports" on public.player_reports';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'player_reports' and policyname = 'Coaches insert player reports'
  ) then
    create policy "Coaches insert player reports"
      on public.player_reports
      for insert
      to authenticated
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'player_reports' and policyname = 'Parents read own player reports'
  ) then
    create policy "Parents read own player reports"
      on public.player_reports
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.registration_children rc
          join public.registration_submissions s on s.id = rc.submission_id
          where rc.id = player_reports.registration_child_id
            and s.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Legacy registrations: parent auth link (needed for player_report_cards RLS)
-- ---------------------------------------------------------------------------
alter table public.registrations
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists registrations_user_id_idx on public.registrations (user_id);

-- ---------------------------------------------------------------------------
-- Player report cards (12 metrics × 1–5): 3 Technical, 3 Tactical, 3 Physical, 3 Psychological
-- Links: registration_id → registrations.id, user_id → auth.users (parent; mirror registrations.user_id)
-- ---------------------------------------------------------------------------
create table if not exists public.player_report_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  registration_id uuid not null references public.registrations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,

  technical_1 int not null check (technical_1 between 1 and 5),
  technical_2 int not null check (technical_2 between 1 and 5),
  technical_3 int not null check (technical_3 between 1 and 5),

  tactical_1 int not null check (tactical_1 between 1 and 5),
  tactical_2 int not null check (tactical_2 between 1 and 5),
  tactical_3 int not null check (tactical_3 between 1 and 5),

  physical_1 int not null check (physical_1 between 1 and 5),
  physical_2 int not null check (physical_2 between 1 and 5),
  physical_3 int not null check (physical_3 between 1 and 5),

  psychological_1 int not null check (psychological_1 between 1 and 5),
  psychological_2 int not null check (psychological_2 between 1 and 5),
  psychological_3 int not null check (psychological_3 between 1 and 5),

  coach_comments text,
  date_generated timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists player_report_cards_registration_id_idx on public.player_report_cards (registration_id);
create index if not exists player_report_cards_user_id_idx on public.player_report_cards (user_id);

alter table public.player_report_cards enable row level security;

-- Parents: SELECT only their own kids’ report cards (match parent user on card or on registrations row)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'player_report_cards' and policyname = 'Parents read own player report cards'
  ) then
    create policy "Parents read own player report cards"
      on public.player_report_cards
      for select
      to authenticated
      using (
        auth.uid() = user_id
        or exists (
          select 1
          from public.registrations r
          where r.id = player_report_cards.registration_id
            and r.user_id is not null
            and r.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Optional: coaches/admins using the browser Supabase client (not service role) need separate policies
-- for INSERT/UPDATE/SELECT-all; the service role bypasses RLS for server-only tools.

-- Delegated staff admins (Google sign-in). Owner email is configured in app env (OWNER_EMAIL); owner manages this list in /admin/staff.
create table if not exists staff_admin_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  created_by_email text
);

alter table staff_admin_emails enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'staff_admin_emails' and policyname = 'Staff can read own admin row'
  ) then
    create policy "Staff can read own admin row"
      on staff_admin_emails
      for select
      to authenticated
      using (
        lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      );
  end if;
end $$;

-- Relax legacy NOT NULL on player_reports metric columns (existing DBs).
do $$
declare
  col text;
  cols text[] := array[
    'technical_1','technical_2','technical_3','technical_4',
    'tactical_1','tactical_2','tactical_3','tactical_4',
    'physical_1','physical_2','physical_3','physical_4',
    'psychological_1','psychological_2','psychological_3','psychological_4'
  ];
begin
  foreach col in array cols
  loop
    execute format('alter table public.player_reports alter column %I drop not null', col);
    execute format('alter table public.player_reports drop constraint if exists player_reports_%I_check', col);
    begin
      execute format(
        'alter table public.player_reports add constraint player_reports_%I_check check (%I is null or (%I between 1 and 5))',
        col,
        col,
        col
      );
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Parent email copy overrides (structured fields; coach portal + sends merge with code defaults)
-- ---------------------------------------------------------------------------
create table if not exists public.email_template_overrides (
  template_key text primary key,
  fields jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists email_template_overrides_updated_at_idx
  on public.email_template_overrides (updated_at desc);

alter table public.email_template_overrides enable row level security;
-- No policies: anon/authenticated cannot read/write; service role bypasses RLS for server actions.
