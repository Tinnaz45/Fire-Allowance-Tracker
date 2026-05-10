-- ═══════════════════════════════════════════════════════════════════════════════
-- FIRE ALLOWANCE TRACKER — MIGRATION v2 (SHARED-SAFE EDITION)
-- This file is fully self-contained. It does NOT require supabase-schema.sql or
-- supabase-migration-rates.sql to have been run first. All prerequisite tables,
-- functions, policies, and triggers are created here with full idempotency guards.
--
-- SAFE FOR:
--   • Clean installs (no prior migrations)
--   • Reruns (all statements are idempotent)
--   • Partial install recovery (each block is independent)
--   • Shared DEV Supabase environments (fat_ namespace, no shared table mutation)
--   • Future shared PROD Supabase environments (same guarantees)
--
-- NAMESPACE POLICY:
--   All Fire Allowance Tracker-owned tables, functions, triggers, and policies
--   are prefixed with "fat_" to prevent collisions in a shared Supabase project.
--   The shared public.profiles table is NOT mutated — FAT-specific profile fields
--   live in public.fat_profile_ext (1:1 extension table).
--
-- What this migration creates/ensures:
--   0.  fat_set_updated_at()     — FAT-owned trigger function (no shared dependency)
--       set_updated_at()          — shared trigger function (created if missing)
--   PREREQ TABLES (created if not present; no-ops if already exist):
--       recalls, retain, standby, spoilt, fire_allowance_user_rates
--   FAT TABLES:
--   1.  fat_financial_years      — FY workspace isolation
--   2.  fat_claim_sequences      — sequential numbering per claim type per FY per user
--   3.  fat_claim_groups         — parent/child grouped claims
--   4.  fat_stations             — FRV station index (name, abbreviation)
--   5.  fat_profile_ext          — FAT-specific profile extension
--   6.  fat_distance_cache       — home-to-station distance cache
--   COLUMN ADDITIONS (idempotent ADD COLUMN IF NOT EXISTS):
--   7.  adjusted_amount, calc_snapshot, financial_year_id, claim_group_id, etc.
--   8.  double_meal_allowance + default corrections on fire_allowance_user_rates
--   9.  OCR-ready columns on recalls + spoilt
--   RPC FUNCTIONS:
--   10. fat_increment_claim_sequence() — atomic sequence increment
--   SEED DATA:
--   11. fat_stations initial FRV station list
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 0A. FAT-OWNED TRIGGER FUNCTION
-- All FAT triggers call fat_set_updated_at() — no dependency on shared function.
-- CREATE OR REPLACE is always idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fat_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 0B. SHARED UPDATED_AT TRIGGER FUNCTION
-- Created here in case supabase-schema.sql was never run.
-- CREATE OR REPLACE is always idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PREREQUISITE: BASE CLAIM TABLES
-- Each table is created with IF NOT EXISTS — safe no-op if already present.
-- Policies and triggers are each guarded with DO $$ IF NOT EXISTS blocks.
-- Trigger checks filter by BOTH tgname AND tgrelid to prevent false positives
-- in shared Supabase environments where another app may share a trigger name.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── RECALLS ──────────────────────────────────────────────────────────────────

create table if not exists public.recalls (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users on delete cascade not null,
  date              date not null,
  rostered_stn_id   integer,
  recall_stn_id     integer,
  platoon           text,
  shift             text check (shift in ('Day','Night')),
  arrived           text,
  dist_home_km      numeric(6,1) default 0,
  dist_stn_km       numeric(6,1) default 0,
  total_km          numeric(6,1) generated always as (dist_home_km + dist_stn_km) stored,
  travel_amount     numeric(8,2),
  mealie_amount     numeric(8,2),
  total_amount      numeric(8,2),
  notes             text,
  pay_number        text,
  status            text default 'Pending' check (status in ('Pending','Paid','Disputed')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.recalls enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recalls'
      and policyname = 'Users manage own recalls'
  ) then
    create policy "Users manage own recalls"
      on public.recalls for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_recalls_updated_at'
      and tgrelid = 'public.recalls'::regclass
  ) then
    create trigger set_recalls_updated_at
      before update on public.recalls
      for each row execute procedure public.set_updated_at();
  end if;
end $$;


-- ── RETAIN ───────────────────────────────────────────────────────────────────

create table if not exists public.retain (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  date            date not null,
  station_id      integer,
  platoon         text,
  shift           text check (shift in ('Day','Night')),
  booked_off_time text,
  rmss_number     text,
  is_firecall     boolean default false,
  overnight_cash  numeric(8,2) default 0,
  retain_amount   numeric(8,2),
  total_amount    numeric(8,2),
  pay_number      text,
  status          text default 'Pending' check (status in ('Pending','Paid','Disputed')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.retain enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'retain'
      and policyname = 'Users manage own retain'
  ) then
    create policy "Users manage own retain"
      on public.retain for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_retain_updated_at'
      and tgrelid = 'public.retain'::regclass
  ) then
    create trigger set_retain_updated_at
      before update on public.retain
      for each row execute procedure public.set_updated_at();
  end if;
end $$;


-- ── STANDBY ──────────────────────────────────────────────────────────────────

create table if not exists public.standby (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users on delete cascade not null,
  date                date not null,
  standby_type        text check (standby_type in ('Standby','M&D')),
  rostered_stn_id     integer,
  standby_stn_id      integer,
  shift               text check (shift in ('Day','Night')),
  arrived             text,
  dist_km             numeric(6,1) default 0,
  travel_amount       numeric(8,2) default 0,
  night_mealie        numeric(8,2) default 0,
  total_amount        numeric(8,2),
  notes               text,
  free_from_home      boolean default false,
  pay_number          text,
  status              text default 'Pending' check (status in ('Pending','Paid','Disputed')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.standby enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'standby'
      and policyname = 'Users manage own standby'
  ) then
    create policy "Users manage own standby"
      on public.standby for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_standby_updated_at'
      and tgrelid = 'public.standby'::regclass
  ) then
    create trigger set_standby_updated_at
      before update on public.standby
      for each row execute procedure public.set_updated_at();
  end if;
end $$;


-- ── SPOILT ───────────────────────────────────────────────────────────────────

create table if not exists public.spoilt (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  date            date not null,
  meal_type       text check (meal_type in ('Spoilt','Delayed')),
  station_id      integer,
  claim_stn_id    integer,
  platoon         text,
  shift           text check (shift in ('Day','Night')),
  call_time       text,
  call_number     text,
  meal_amount     numeric(8,2) default 22.80,
  claim_date      date,
  pay_number      text,
  status          text default 'Pending' check (status in ('Pending','Paid','Disputed')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.spoilt enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'spoilt'
      and policyname = 'Users manage own spoilt'
  ) then
    create policy "Users manage own spoilt"
      on public.spoilt for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_spoilt_updated_at'
      and tgrelid = 'public.spoilt'::regclass
  ) then
    create trigger set_spoilt_updated_at
      before update on public.spoilt
      for each row execute procedure public.set_updated_at();
  end if;
end $$;


-- ── FIRE_ALLOWANCE_USER_RATES ─────────────────────────────────────────────────
-- Created here as a no-op if supabase-migration-rates.sql was already run.
-- All columns from migration-rates.sql are included in the CREATE TABLE
-- so a clean install gets the full schema in one pass.
-- NOTE: This table is created BEFORE it is altered later in this migration
--       (section 8). Ordering is intentional — do not reorder.

create table if not exists public.fire_allowance_user_rates (
  id                           uuid default gen_random_uuid() primary key,
  user_id                      uuid references auth.users on delete cascade not null unique,
  kilometre_rate               numeric(6,4) not null default 1.20,
  small_meal_allowance         numeric(8,2) not null default 10.90,
  large_meal_allowance         numeric(8,2) not null default 20.55,
  spoilt_meal_allowance        numeric(8,2) not null default 10.90,
  delayed_meal_allowance       numeric(8,2) not null default 10.90,
  double_meal_allowance        numeric(8,2) not null default 31.45,
  overnight_allowance          numeric(8,2) not null default 0.00,
  standby_night_meal_allowance numeric(8,2) not null default 10.90,
  created_at                   timestamptz default now(),
  updated_at                   timestamptz default now()
);

alter table public.fire_allowance_user_rates enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fire_allowance_user_rates'
      and policyname = 'Users can view own rates'
  ) then
    create policy "Users can view own rates"
      on public.fire_allowance_user_rates for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fire_allowance_user_rates'
      and policyname = 'Users can insert own rates'
  ) then
    create policy "Users can insert own rates"
      on public.fire_allowance_user_rates for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fire_allowance_user_rates'
      and policyname = 'Users can update own rates'
  ) then
    create policy "Users can update own rates"
      on public.fire_allowance_user_rates for update using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_user_rates_updated_at'
      and tgrelid = 'public.fire_allowance_user_rates'::regclass
  ) then
    create trigger set_user_rates_updated_at
      before update on public.fire_allowance_user_rates
      for each row execute procedure public.set_updated_at();
  end if;
end $$;


-- ── RATES_SNAPSHOT + CALCULATION_INPUTS (from migration-rates.sql — idempotent) ─

alter table public.recalls  add column if not exists rates_snapshot     jsonb default null;
alter table public.retain   add column if not exists rates_snapshot     jsonb default null;
alter table public.standby  add column if not exists rates_snapshot     jsonb default null;
alter table public.spoilt   add column if not exists rates_snapshot     jsonb default null;
alter table public.recalls  add column if not exists calculation_inputs jsonb default null;
alter table public.retain   add column if not exists calculation_inputs jsonb default null;
alter table public.standby  add column if not exists calculation_inputs jsonb default null;
alter table public.spoilt   add column if not exists calculation_inputs jsonb default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FAT_FINANCIAL_YEARS
-- Each row represents one FY workspace per user.
-- label: '2026FY', '2025FY', etc.
-- start_date / end_date: 01 Jul → 30 Jun
-- is_active: currently selected FY for a user session (soft state only)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_financial_years (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  label       text not null,               -- e.g. '2026FY'
  start_date  date not null,               -- e.g. 2025-07-01
  end_date    date not null,               -- e.g. 2026-06-30
  is_active   boolean not null default false,
  created_at  timestamptz default now(),
  unique (user_id, label)
);

alter table public.fat_financial_years enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_financial_years'
      and policyname = 'fat: users manage own financial years'
  ) then
    create policy "fat: users manage own financial years"
      on public.fat_financial_years for all using (auth.uid() = user_id);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FAT_CLAIM_SEQUENCES
-- Tracks the next sequential number for each claim type per FY per user.
-- claim_type: 'recalls' | 'retain' | 'standby' | 'spoilt'
-- Depends on: fat_financial_years (created above)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_claim_sequences (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users on delete cascade not null,
  financial_year_id   uuid references public.fat_financial_years on delete cascade not null,
  claim_type          text not null,
  next_seq            integer not null default 1,
  unique (user_id, financial_year_id, claim_type)
);

alter table public.fat_claim_sequences enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_claim_sequences'
      and policyname = 'fat: users manage own claim sequences'
  ) then
    create policy "fat: users manage own claim sequences"
      on public.fat_claim_sequences for all using (auth.uid() = user_id);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FAT_CLAIM_GROUPS
-- A claim group is a named parent that groups related child claims.
-- Example: "Recall #16 (12/02/2026)" groups a travel child, meal child, etc.
-- parent_status is auto-computed by the app (all children Paid → Paid).
-- overdue_at: set when first created; UI flags red after 4 weeks.
-- Depends on: fat_financial_years (created above)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_claim_groups (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users on delete cascade not null,
  financial_year_id   uuid references public.fat_financial_years on delete cascade,
  label               text not null,         -- e.g. 'Recall #16 (12/02/2026)'
  claim_type          text not null,         -- root type: 'recalls'
  claim_number        integer,               -- sequential number within FY
  incident_date       date,
  incident_number     text,
  parent_status       text not null default 'Pending'
                        check (parent_status in ('Pending','Paid','Disputed')),
  overdue_at          timestamptz,           -- created_at + 28 days; UI uses this
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.fat_claim_groups enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_claim_groups'
      and policyname = 'fat: users manage own claim groups'
  ) then
    create policy "fat: users manage own claim groups"
      on public.fat_claim_groups for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'fat_set_claim_groups_updated_at'
      and tgrelid = 'public.fat_claim_groups'::regclass
  ) then
    create trigger fat_set_claim_groups_updated_at
      before update on public.fat_claim_groups
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FAT_STATIONS
-- FRV station index. Admin-managed, not user-editable.
-- Namespaced to avoid collision with any other app's station concepts.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_stations (
  id            integer primary key,          -- station number e.g. 45
  name          text not null,               -- e.g. 'Brooklyn'
  abbreviation  text,                         -- e.g. 'FS45'
  region        text,
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.fat_stations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_stations'
      and policyname = 'fat: authenticated users can read stations'
  ) then
    create policy "fat: authenticated users can read stations"
      on public.fat_stations for select using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_stations'
      and policyname = 'fat: service role can manage stations'
  ) then
    create policy "fat: service role can manage stations"
      on public.fat_stations for all using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'fat_set_stations_updated_at'
      and tgrelid = 'public.fat_stations'::regclass
  ) then
    create trigger fat_set_stations_updated_at
      before update on public.fat_stations
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FAT_PROFILE_EXT
-- Fire Allowance Tracker-specific profile extension.
-- 1:1 with auth.users. Does NOT mutate public.profiles (shared with other apps).
-- All FAT-specific fields (station, platoon, pay number, home address, distances)
-- live here — not on the shared profiles table.
-- Depends on: fat_stations (created above)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_profile_ext (
  user_id                 uuid primary key references auth.users on delete cascade,
  station_id              integer references public.fat_stations on delete set null,
  rostered_station_label  text,              -- e.g. 'FS45 - Brooklyn' (display cache)
  platoon                 text,              -- 'A' | 'B' | 'C' | 'D' | 'Z'
  pay_number              text,              -- employee/pay number for payslip reconciliation
  home_address            text,              -- home address for travel distance calculations
  home_dist_km            numeric(6,1) default 0, -- cached home-to-station distance
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.fat_profile_ext enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_profile_ext'
      and policyname = 'fat: users manage own profile ext'
  ) then
    create policy "fat: users manage own profile ext"
      on public.fat_profile_ext for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'fat_set_profile_ext_updated_at'
      and tgrelid = 'public.fat_profile_ext'::regclass
  ) then
    create trigger fat_set_profile_ext_updated_at
      before update on public.fat_profile_ext
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FAT_DISTANCE_CACHE
-- Caches calculated driving distance for a specific home address → station pair.
-- Per-user, per-address, per-station. Namespaced to avoid collision.
-- NOTE: station_id is an unconstrained integer (not a FK to fat_stations)
--       to allow caching distances to stations not yet in the seed list.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_distance_cache (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users on delete cascade not null,
  home_address      text not null,
  station_id        integer not null,
  distance_km       numeric(6,1) not null,
  source            text not null default 'manual'
                      check (source in ('google_maps', 'manual')),
  user_override_km  numeric(6,1) default null,
  calculated_at     timestamptz default now(),
  unique (user_id, home_address, station_id)
);

alter table public.fat_distance_cache enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_distance_cache'
      and policyname = 'fat: users manage own distance cache'
  ) then
    create policy "fat: users manage own distance cache"
      on public.fat_distance_cache for all using (auth.uid() = user_id);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CLAIM TABLE COLUMN ADDITIONS
-- Add financial_year_id, claim_group_id, claim_number, adjusted_amount,
-- calc_snapshot, and auxiliary columns to the existing FAT claim tables.
-- All use ADD COLUMN IF NOT EXISTS — fully idempotent.
-- FKs reference fat_financial_years and fat_claim_groups (created above).
-- ─────────────────────────────────────────────────────────────────────────────

-- RECALLS
alter table public.recalls
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists incident_number    text         default null,
  add column if not exists recall_stn_label   text         default null,
  add column if not exists rostered_stn_label text         default null,
  add column if not exists home_address_snap  text         default null,
  add column if not exists payslip_pay_nbr    text         default null;

-- RETAIN
alter table public.retain
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists payslip_pay_nbr    text         default null;

-- STANDBY
alter table public.standby
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists arrived_time       text         default null,
  add column if not exists payslip_pay_nbr    text         default null;

-- SPOILT
-- NOTE: total_amount is NOT in the base spoilt schema — added here via ADD COLUMN IF NOT EXISTS.
alter table public.spoilt
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists incident_time      text         default null,
  add column if not exists meal_interrupted   text         default null,
  add column if not exists return_to_stn      text         default null,
  add column if not exists total_amount       numeric(8,2) default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FIRE_ALLOWANCE_USER_RATES — ADD MISSING COLUMNS + FIX DEFAULTS
-- Table is guaranteed to exist by this point (created in PREREQUISITE section).
-- All changes are idempotent.
-- double_meal_allowance is included in the CREATE TABLE above for clean installs,
-- but ADD COLUMN IF NOT EXISTS is retained here to handle installs where the
-- table was created by an earlier version of migration-rates.sql that lacked it.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.fire_allowance_user_rates
  add column if not exists double_meal_allowance numeric(8,2) not null default 31.45;

-- Fix defaults to confirmed FRV rates (existing rows are NOT back-filled — defaults
-- only apply to future inserts; existing users manage their own rate rows in-app).
alter table public.fire_allowance_user_rates
  alter column large_meal_allowance set default 20.55;

alter table public.fire_allowance_user_rates
  alter column spoilt_meal_allowance set default 10.90;

alter table public.fire_allowance_user_rates
  alter column delayed_meal_allowance set default 10.90;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. OCR / ATTACHMENT FUTURE-PROOFING (schema only, not yet implemented in app)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.recalls
  add column if not exists attachment_url text  default null,
  add column if not exists ocr_source     jsonb default null;

alter table public.spoilt
  add column if not exists attachment_url text  default null,
  add column if not exists ocr_source     jsonb default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. fat_increment_claim_sequence()
-- Atomically increments the sequence counter for a claim type in a FY,
-- returning the NEW sequence number (starts at 1 for first claim).
-- CREATE OR REPLACE is idempotent.
-- Depends on: fat_claim_sequences (created above)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fat_increment_claim_sequence(
  p_user_id           uuid,
  p_financial_year_id uuid,
  p_claim_type        text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  -- Upsert: insert with next_seq=2 (first claim gets seq 1 returned), or
  -- increment atomically if the row already exists.
  insert into public.fat_claim_sequences (user_id, financial_year_id, claim_type, next_seq)
  values (p_user_id, p_financial_year_id, p_claim_type, 2)
  on conflict (user_id, financial_year_id, claim_type)
  do update set next_seq = fat_claim_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  -- On fresh insert, next_seq is 2 so next_seq - 1 = 1 (first claim).
  -- On conflict path, returning gives the incremented value minus 1.
  if v_seq is null then
    v_seq := 1;
  end if;

  return v_seq;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SEED: INITIAL FAT_STATIONS DATA
-- ON CONFLICT (id) DO NOTHING — fully idempotent, safe to rerun.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.fat_stations (id, name, abbreviation, region) values
  (1,  'City',            'FS1',  'Metro'),
  (2,  'South Melbourne', 'FS2',  'Metro'),
  (3,  'Prahran',         'FS3',  'Metro'),
  (4,  'Brighton',        'FS4',  'Metro'),
  (5,  'St Kilda',        'FS5',  'Metro'),
  (6,  'Port Melbourne',  'FS6',  'Metro'),
  (7,  'Williamstown',    'FS7',  'Metro'),
  (8,  'Yarraville',      'FS8',  'Metro'),
  (9,  'Footscray',       'FS9',  'Metro'),
  (10, 'Newport',         'FS10', 'Metro'),
  (11, 'Altona',          'FS11', 'Metro'),
  (12, 'Laverton',        'FS12', 'Metro'),
  (13, 'Werribee',        'FS13', 'Metro'),
  (14, 'Hoppers Crossing','FS14', 'Metro'),
  (15, 'Sunshine',        'FS15', 'Metro'),
  (16, 'Deer Park',       'FS16', 'Metro'),
  (17, 'Keilor',          'FS17', 'Metro'),
  (18, 'Essendon',        'FS18', 'Metro'),
  (19, 'Airport West',    'FS19', 'Metro'),
  (20, 'Tullamarine',     'FS20', 'Metro'),
  (21, 'Broadmeadows',    'FS21', 'Metro'),
  (22, 'Thomastown',      'FS22', 'Metro'),
  (23, 'Epping',          'FS23', 'Metro'),
  (24, 'Heidelberg',      'FS24', 'Metro'),
  (25, 'Eltham',          'FS25', 'Metro'),
  (26, 'Diamond Creek',   'FS26', 'Metro'),
  (27, 'Templestowe',     'FS27', 'Metro'),
  (28, 'Nunawading',      'FS28', 'Metro'),
  (29, 'Knox',            'FS29', 'Metro'),
  (30, 'Boronia',         'FS30', 'Metro'),
  (31, 'Bayswater',       'FS31', 'Metro'),
  (32, 'Box Hill',        'FS32', 'Metro'),
  (33, 'Camberwell',      'FS33', 'Metro'),
  (34, 'Hawthorn',        'FS34', 'Metro'),
  (35, 'Burnley',         'FS35', 'Metro'),
  (36, 'Prahran',         'FS36', 'Metro'),
  (37, 'Malvern',         'FS37', 'Metro'),
  (38, 'Oakleigh',        'FS38', 'Metro'),
  (39, 'Moorabbin',       'FS39', 'Metro'),
  (40, 'Mordialloc',      'FS40', 'Metro'),
  (41, 'Dandenong',       'FS41', 'Metro'),
  (42, 'Noble Park',      'FS42', 'Metro'),
  (43, 'Springvale',      'FS43', 'Metro'),
  (44, 'Sunshine',        'FS44', 'Metro'),
  (45, 'Brooklyn',        'FS45', 'Metro'),
  (46, 'Altona North',    'FS46', 'Metro'),
  (47, 'Laverton North',  'FS47', 'Metro'),
  (48, 'Werribee South',  'FS48', 'Metro')
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- POST-MIGRATION VALIDATION CHECKLIST
-- Run these queries manually to confirm a successful migration:
--
--   SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'fat_%';
--   -- Expected: fat_financial_years, fat_claim_sequences, fat_claim_groups,
--   --           fat_stations, fat_profile_ext, fat_distance_cache
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema='public' AND routine_name IN ('fat_set_updated_at','fat_increment_claim_sequence');
--   -- Expected: both rows returned
--
--   SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'
--   AND tablename LIKE 'fat_%' ORDER BY tablename, policyname;
--   -- Expected: at least one policy per fat_ table
--
--   SELECT tgname, tgrelid::regclass FROM pg_trigger
--   WHERE tgname LIKE 'fat_%' OR tgname LIKE 'set_%updated_at';
--   -- Expected: one trigger per claim table + fat_claim_groups + fat_stations + fat_profile_ext
--
--   SELECT COUNT(*) FROM public.fat_stations;
--   -- Expected: 48
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='fire_allowance_user_rates'
--   AND column_name='double_meal_allowance';
--   -- Expected: 1 row
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='recalls'
--   AND column_name IN ('financial_year_id','claim_group_id','adjusted_amount','calc_snapshot');
--   -- Expected: 4 rows
-- ─────────────────────────────────────────────────────────────────────────────
-- FRV station index. Admin-managed, not user-editable.
-- Namespaced to avoid collision with any other app's station concepts.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_stations (
  id            integer primary key,          -- station number e.g. 45
  name          text not null,               -- e.g. 'Brooklyn'
  abbreviation  text,                         -- e.g. 'FS45'
  region        text,
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.fat_stations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_stations'
      and policyname = 'fat: authenticated users can read stations'
  ) then
    create policy "fat: authenticated users can read stations"
      on public.fat_stations for select using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_stations'
      and policyname = 'fat: service role can manage stations'
  ) then
    create policy "fat: service role can manage stations"
      on public.fat_stations for all using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'fat_set_stations_updated_at'
      and tgrelid = 'public.fat_stations'::regclass
  ) then
    create trigger fat_set_stations_updated_at
      before update on public.fat_stations
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FAT_PROFILE_EXT
-- Fire Allowance Tracker-specific profile extension.
-- 1:1 with auth.users. Does NOT mutate public.profiles (shared with other apps).
-- All FAT-specific fields (station, platoon, pay number, home address, distances)
-- live here — not on the shared profiles table.
-- Depends on: fat_stations (created above)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_profile_ext (
  user_id                 uuid primary key references auth.users on delete cascade,
  station_id              integer references public.fat_stations on delete set null,
  rostered_station_label  text,              -- e.g. 'FS45 - Brooklyn' (display cache)
  platoon                 text,              -- 'A' | 'B' | 'C' | 'D' | 'Z'
  pay_number              text,              -- employee/pay number for payslip reconciliation
  home_address            text,              -- home address for travel distance calculations
  home_dist_km            numeric(6,1) default 0, -- cached home-to-station distance
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.fat_profile_ext enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_profile_ext'
      and policyname = 'fat: users manage own profile ext'
  ) then
    create policy "fat: users manage own profile ext"
      on public.fat_profile_ext for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'fat_set_profile_ext_updated_at'
      and tgrelid = 'public.fat_profile_ext'::regclass
  ) then
    create trigger fat_set_profile_ext_updated_at
      before update on public.fat_profile_ext
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FAT_DISTANCE_CACHE
-- Caches calculated driving distance for a specific home address → station pair.
-- Per-user, per-address, per-station. Namespaced to avoid collision.
-- NOTE: station_id is an unconstrained integer (not a FK to fat_stations)
--       to allow caching distances to stations not yet in the seed list.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_distance_cache (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users on delete cascade not null,
  home_address      text not null,
  station_id        integer not null,
  distance_km       numeric(6,1) not null,
  source            text not null default 'manual'
                      check (source in ('google_maps', 'manual')),
  user_override_km  numeric(6,1) default null,
  calculated_at     timestamptz default now(),
  unique (user_id, home_address, station_id)
);

alter table public.fat_distance_cache enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_distance_cache'
      and policyname = 'fat: users manage own distance cache'
  ) then
    create policy "fat: users manage own distance cache"
      on public.fat_distance_cache for all using (auth.uid() = user_id);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CLAIM TABLE COLUMN ADDITIONS
-- Add financial_year_id, claim_group_id, claim_number, adjusted_amount,
-- calc_snapshot, and auxiliary columns to the existing FAT claim tables.
-- All use ADD COLUMN IF NOT EXISTS — fully idempotent.
-- FKs reference fat_financial_years and fat_claim_groups (created above).
-- ─────────────────────────────────────────────────────────────────────────────

-- RECALLS
alter table public.recalls
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists incident_number    text         default null,
  add column if not exists recall_stn_label   text         default null,
  add column if not exists rostered_stn_label text         default null,
  add column if not exists home_address_snap  text         default null,
  add column if not exists payslip_pay_nbr    text         default null;

-- RETAIN
alter table public.retain
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists payslip_pay_nbr    text         default null;

-- STANDBY
alter table public.standby
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists arrived_time       text         default null,
  add column if not exists payslip_pay_nbr    text         default null;

-- SPOILT
-- NOTE: total_amount is NOT in the base spoilt schema — added here via ADD COLUMN IF NOT EXISTS.
alter table public.spoilt
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists incident_time      text         default null,
  add column if not exists meal_interrupted   text         default null,
  add column if not exists return_to_stn      text         default null,
  add column if not exists total_amount       numeric(8,2) default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FIRE_ALLOWANCE_USER_RATES — ADD MISSING COLUMNS + FIX DEFAULTS
-- Table is guaranteed to exist by this point (created in PREREQUISITE section).
-- All changes are idempotent.
-- double_meal_allowance is included in the CREATE TABLE above for clean installs,
-- but ADD COLUMN IF NOT EXISTS is retained here to handle installs where the
-- table was created by an earlier version of migration-rates.sql that lacked it.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.fire_allowance_user_rates
  add column if not exists double_meal_allowance numeric(8,2) not null default 31.45;

-- Fix defaults to confirmed FRV rates (existing rows are NOT back-filled — defaults
-- only apply to future inserts; existing users manage their own rate rows in-app).
alter table public.fire_allowance_user_rates
  alter column large_meal_allowance set default 20.55;

alter table public.fire_allowance_user_rates
  alter column spoilt_meal_allowance set default 10.90;

alter table public.fire_allowance_user_rates
  alter column delayed_meal_allowance set default 10.90;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. OCR / ATTACHMENT FUTURE-PROOFING (schema only, not yet implemented in app)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.recalls
  add column if not exists attachment_url text  default null,
  add column if not exists ocr_source     jsonb default null;

alter table public.spoilt
  add column if not exists attachment_url text  default null,
  add column if not exists ocr_source     jsonb default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. fat_increment_claim_sequence()
-- Atomically increments the sequence counter for a claim type in a FY,
-- returning the NEW sequence number (starts at 1 for first claim).
-- CREATE OR REPLACE is idempotent.
-- Depends on: fat_claim_sequences (created above)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fat_increment_claim_sequence(
  p_user_id           uuid,
  p_financial_year_id uuid,
  p_claim_type        text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  -- Upsert: insert with next_seq=2 (first claim gets seq 1 returned), or
  -- increment atomically if the row already exists.
  insert into public.fat_claim_sequences (user_id, financial_year_id, claim_type, next_seq)
  values (p_user_id, p_financial_year_id, p_claim_type, 2)
  on conflict (user_id, financial_year_id, claim_type)
  do update set next_seq = fat_claim_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  -- On fresh insert, next_seq is 2 so next_seq - 1 = 1 (first claim).
  -- On conflict path, returning gives the incremented value minus 1.
  if v_seq is null then
    v_seq := 1;
  end if;

  return v_seq;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SEED: INITIAL FAT_STATIONS DATA
-- ON CONFLICT (id) DO NOTHING — fully idempotent, safe to rerun.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.fat_stations (id, name, abbreviation, region) values
  (1,  'City',            'FS1',  'Metro'),
  (2,  'South Melbourne', 'FS2',  'Metro'),
  (3,  'Prahran',         'FS3',  'Metro'),
  (4,  'Brighton',        'FS4',  'Metro'),
  (5,  'St Kilda',        'FS5',  'Metro'),
  (6,  'Port Melbourne',  'FS6',  'Metro'),
  (7,  'Williamstown',    'FS7',  'Metro'),
  (8,  'Yarraville',      'FS8',  'Metro'),
  (9,  'Footscray',       'FS9',  'Metro'),
  (10, 'Newport',         'FS10', 'Metro'),
  (11, 'Altona',          'FS11', 'Metro'),
  (12, 'Laverton',        'FS12', 'Metro'),
  (13, 'Werribee',        'FS13', 'Metro'),
  (14, 'Hoppers Crossing','FS14', 'Metro'),
  (15, 'Sunshine',        'FS15', 'Metro'),
  (16, 'Deer Park',       'FS16', 'Metro'),
  (17, 'Keilor',          'FS17', 'Metro'),
  (18, 'Essendon',        'FS18', 'Metro'),
  (19, 'Airport West',    'FS19', 'Metro'),
  (20, 'Tullamarine',     'FS20', 'Metro'),
  (21, 'Broadmeadows',    'FS21', 'Metro'),
  (22, 'Thomastown',      'FS22', 'Metro'),
  (23, 'Epping',          'FS23', 'Metro'),
  (24, 'Heidelberg',      'FS24', 'Metro'),
  (25, 'Eltham',          'FS25', 'Metro'),
  (26, 'Diamond Creek',   'FS26', 'Metro'),
  (27, 'Templestowe',     'FS27', 'Metro'),
  (28, 'Nunawading',      'FS28', 'Metro'),
  (29, 'Knox',            'FS29', 'Metro'),
  (30, 'Boronia',         'FS30', 'Metro'),
  (31, 'Bayswater',       'FS31', 'Metro'),
  (32, 'Box Hill',        'FS32', 'Metro'),
  (33, 'Camberwell',      'FS33', 'Metro'),
  (34, 'Hawthorn',        'FS34', 'Metro'),
  (35, 'Burnley',         'FS35', 'Metro'),
  (36, 'Prahran',         'FS36', 'Metro'),
  (37, 'Malvern',         'FS37', 'Metro'),
  (38, 'Oakleigh',        'FS38', 'Metro'),
  (39, 'Moorabbin',       'FS39', 'Metro'),
  (40, 'Mordialloc',      'FS40', 'Metro'),
  (41, 'Dandenong',       'FS41', 'Metro'),
  (42, 'Noble Park',      'FS42', 'Metro'),
  (43, 'Springvale',      'FS43', 'Metro'),
  (44, 'Sunshine',        'FS44', 'Metro'),
  (45, 'Brooklyn',        'FS45', 'Metro'),
  (46, 'Altona North',    'FS46', 'Metro'),
  (47, 'Laverton North',  'FS47', 'Metro'),
  (48, 'Werribee South',  'FS48', 'Metro')
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- POST-MIGRATION VALIDATION CHECKLIST
-- Run these queries manually to confirm a successful migration:
--
--   SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'fat_%';
--   -- Expected: fat_financial_years, fat_claim_sequences, fat_claim_groups,
--   --           fat_stations, fat_profile_ext, fat_distance_cache
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema='public' AND routine_name IN ('fat_set_updated_at','fat_increment_claim_sequence');
--   -- Expected: both rows returned
--
--   SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'
--   AND tablename LIKE 'fat_%' ORDER BY tablename, policyname;
--   -- Expected: at least one policy per fat_ table
--
--   SELECT tgname, tgrelid::regclass FROM pg_trigger
--   WHERE tgname LIKE 'fat_%' OR tgname LIKE 'set_%updated_at';
--   -- Expected: one trigger per claim table + fat_claim_groups + fat_stations + fat_profile_ext
--
--   SELECT COUNT(*) FROM public.fat_stations;
--   -- Expected: 48
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='fire_allowance_user_rates'
--   AND column_name='double_meal_allowance';
--   -- Expected: 1 row
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='recalls'
--   AND column_name IN ('financial_year_id','claim_group_id','adjusted_amount','calc_snapshot');
--   -- Expected: 4 rows
-- ─────────────────────────────────────────────────────────────────────────────
-- FRV station index. Admin-managed, not user-editable.
-- Namespaced to avoid collision with any other app's station concepts.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_stations (
  id            integer primary key,
  name          text not null,
  abbreviation  text,
  region        text,
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.fat_stations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_stations'
      and policyname = 'fat: authenticated users can read stations'
  ) then
    create policy "fat: authenticated users can read stations"
      on public.fat_stations for select using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_stations'
      and policyname = 'fat: service role can manage stations'
  ) then
    create policy "fat: service role can manage stations"
      on public.fat_stations for all using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'fat_set_stations_updated_at'
      and tgrelid = 'public.fat_stations'::regclass
  ) then
    create trigger fat_set_stations_updated_at
      before update on public.fat_stations
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FAT_PROFILE_EXT
-- Fire Allowance Tracker-specific profile extension.
-- 1:1 with auth.users. Does NOT mutate public.profiles (shared with other apps).
-- All FAT-specific fields live here — not on the shared profiles table.
-- Depends on: fat_stations (created above).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_profile_ext (
  user_id                 uuid primary key references auth.users on delete cascade,
  station_id              integer references public.fat_stations on delete set null,
  rostered_station_label  text,
  platoon                 text,
  pay_number              text,
  home_address            text,
  home_dist_km            numeric(6,1) default 0,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.fat_profile_ext enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_profile_ext'
      and policyname = 'fat: users manage own profile ext'
  ) then
    create policy "fat: users manage own profile ext"
      on public.fat_profile_ext for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'fat_set_profile_ext_updated_at'
      and tgrelid = 'public.fat_profile_ext'::regclass
  ) then
    create trigger fat_set_profile_ext_updated_at
      before update on public.fat_profile_ext
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FAT_DISTANCE_CACHE
-- Caches driving distance for a home address to station pair, per user.
-- station_id is unconstrained integer (no FK) to allow caching distances
-- to stations not yet in the fat_stations seed list.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_distance_cache (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users on delete cascade not null,
  home_address      text not null,
  station_id        integer not null,
  distance_km       numeric(6,1) not null,
  source            text not null default 'manual'
                      check (source in ('google_maps', 'manual')),
  user_override_km  numeric(6,1) default null,
  calculated_at     timestamptz default now(),
  unique (user_id, home_address, station_id)
);

alter table public.fat_distance_cache enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fat_distance_cache'
      and policyname = 'fat: users manage own distance cache'
  ) then
    create policy "fat: users manage own distance cache"
      on public.fat_distance_cache for all using (auth.uid() = user_id);
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CLAIM TABLE COLUMN ADDITIONS
-- All use ADD COLUMN IF NOT EXISTS — fully idempotent.
-- FKs reference fat_financial_years and fat_claim_groups (created above).
-- ─────────────────────────────────────────────────────────────────────────────

-- RECALLS
alter table public.recalls
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists incident_number    text         default null,
  add column if not exists recall_stn_label   text         default null,
  add column if not exists rostered_stn_label text         default null,
  add column if not exists home_address_snap  text         default null,
  add column if not exists payslip_pay_nbr    text         default null;

-- RETAIN
alter table public.retain
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists payslip_pay_nbr    text         default null;

-- STANDBY
alter table public.standby
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists arrived_time       text         default null,
  add column if not exists payslip_pay_nbr    text         default null;

-- SPOILT
-- NOTE: total_amount not in base spoilt schema — added here via ADD COLUMN IF NOT EXISTS.
alter table public.spoilt
  add column if not exists adjusted_amount    numeric(8,2) default null,
  add column if not exists calc_snapshot      jsonb        default null,
  add column if not exists claim_number       integer      default null,
  add column if not exists financial_year_id  uuid references public.fat_financial_years on delete set null,
  add column if not exists claim_group_id     uuid references public.fat_claim_groups on delete set null,
  add column if not exists incident_time      text         default null,
  add column if not exists meal_interrupted   text         default null,
  add column if not exists return_to_stn      text         default null,
  add column if not exists total_amount       numeric(8,2) default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FIRE_ALLOWANCE_USER_RATES — ADD MISSING COLUMNS + FIX DEFAULTS
-- Table guaranteed to exist (created in PREREQUISITE section above).
-- ADD COLUMN IF NOT EXISTS handles installs where the table predates v2.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.fire_allowance_user_rates
  add column if not exists double_meal_allowance numeric(8,2) not null default 31.45;

alter table public.fire_allowance_user_rates
  alter column large_meal_allowance set default 20.55;

alter table public.fire_allowance_user_rates
  alter column spoilt_meal_allowance set default 10.90;

alter table public.fire_allowance_user_rates
  alter column delayed_meal_allowance set default 10.90;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. OCR / ATTACHMENT FUTURE-PROOFING (schema only, not yet wired to app UI)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.recalls
  add column if not exists attachment_url text  default null,
  add column if not exists ocr_source     jsonb default null;

alter table public.spoilt
  add column if not exists attachment_url text  default null,
  add column if not exists ocr_source     jsonb default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. fat_increment_claim_sequence()
-- Atomically returns the next sequence number for a claim type in a FY.
-- Starts at 1 for the first claim of each type per user per FY.
-- CREATE OR REPLACE is always idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fat_increment_claim_sequence(
  p_user_id           uuid,
  p_financial_year_id uuid,
  p_claim_type        text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  insert into public.fat_claim_sequences (user_id, financial_year_id, claim_type, next_seq)
  values (p_user_id, p_financial_year_id, p_claim_type, 2)
  on conflict (user_id, financial_year_id, claim_type)
  do update set next_seq = fat_claim_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  if v_seq is null then
    v_seq := 1;
  end if;

  return v_seq;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SEED: INITIAL FAT_STATIONS DATA
-- ON CONFLICT (id) DO NOTHING — fully idempotent, safe to rerun.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.fat_stations (id, name, abbreviation, region) values
  (1,  'City',            'FS1',  'Metro'),
  (2,  'South Melbourne', 'FS2',  'Metro'),
  (3,  'Prahran',         'FS3',  'Metro'),
  (4,  'Brighton',        'FS4',  'Metro'),
  (5,  'St Kilda',        'FS5',  'Metro'),
  (6,  'Port Melbourne',  'FS6',  'Metro'),
  (7,  'Williamstown',    'FS7',  'Metro'),
  (8,  'Yarraville',      'FS8',  'Metro'),
  (9,  'Footscray',       'FS9',  'Metro'),
  (10, 'Newport',         'FS10', 'Metro'),
  (11, 'Altona',          'FS11', 'Metro'),
  (12, 'Laverton',        'FS12', 'Metro'),
  (13, 'Werribee',        'FS13', 'Metro'),
  (14, 'Hoppers Crossing','FS14', 'Metro'),
  (15, 'Sunshine',        'FS15', 'Metro'),
  (16, 'Deer Park',       'FS16', 'Metro'),
  (17, 'Keilor',          'FS17', 'Metro'),
  (18, 'Essendon',        'FS18', 'Metro'),
  (19, 'Airport West',    'FS19', 'Metro'),
  (20, 'Tullamarine',     'FS20', 'Metro'),
  (21, 'Broadmeadows',    'FS21', 'Metro'),
  (22, 'Thomastown',      'FS22', 'Metro'),
  (23, 'Epping',          'FS23', 'Metro'),
  (24, 'Heidelberg',      'FS24', 'Metro'),
  (25, 'Eltham',          'FS25', 'Metro'),
  (26, 'Diamond Creek',   'FS26', 'Metro'),
  (27, 'Templestowe',     'FS27', 'Metro'),
  (28, 'Nunawading',      'FS28', 'Metro'),
  (29, 'Knox',            'FS29', 'Metro'),
  (30, 'Boronia',         'FS30', 'Metro'),
  (31, 'Bayswater',       'FS31', 'Metro'),
  (32, 'Box Hill',        'FS32', 'Metro'),
  (33, 'Camberwell',      'FS33', 'Metro'),
  (34, 'Hawthorn',        'FS34', 'Metro'),
  (35, 'Burnley',         'FS35', 'Metro'),
  (36, 'Prahran',         'FS36', 'Metro'),
  (37, 'Malvern',         'FS37', 'Metro'),
  (38, 'Oakleigh',        'FS38', 'Metro'),
  (39, 'Moorabbin',       'FS39', 'Metro'),
  (40, 'Mordialloc',      'FS40', 'Metro'),
  (41, 'Dandenong',       'FS41', 'Metro'),
  (42, 'Noble Park',      'FS42', 'Metro'),
  (43, 'Springvale',      'FS43', 'Metro'),
  (44, 'Sunshine',        'FS44', 'Metro'),
  (45, 'Brooklyn',        'FS45', 'Metro'),
  (46, 'Altona North',    'FS46', 'Metro'),
  (47, 'Laverton North',  'FS47', 'Metro'),
  (48, 'Werribee South',  'FS48', 'Metro')
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- POST-MIGRATION VALIDATION CHECKLIST
-- Run these queries after applying to confirm success:
--
--   SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename LIKE 'fat_%'
--   ORDER BY tablename;
--   -- Expected: fat_claim_groups, fat_claim_sequences, fat_distance_cache,
--   --           fat_financial_years, fat_profile_ext, fat_stations
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema='public'
--   AND routine_name IN ('fat_set_updated_at','fat_increment_claim_sequence');
--   -- Expected: 2 rows
--
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname='public' AND tablename LIKE 'fat_%'
--   ORDER BY tablename, policyname;
--   -- Expected: at least one policy per fat_ table
--
--   SELECT tgname, tgrelid::regclass FROM pg_trigger
--   WHERE tgname LIKE 'fat_%' OR tgname LIKE 'set_%updated_at'
--   ORDER BY tgrelid::regclass::text, tgname;
--   -- Expected: set_recalls_updated_at, set_retain_updated_at,
--   --           set_standby_updated_at, set_spoilt_updated_at,
--   --           set_user_rates_updated_at, fat_set_claim_groups_updated_at,
--   --           fat_set_stations_updated_at, fat_set_profile_ext_updated_at
--
--   SELECT COUNT(*) FROM public.fat_stations;
--   -- Expected: 48
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='fire_allowance_user_rates'
--   AND column_name='double_meal_allowance';
--   -- Expected: 1 row
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='recalls'
--   AND column_name IN ('financial_year_id','claim_group_id','adjusted_amount','calc_snapshot')
--   ORDER BY column_name;
--   -- Expected: 4 rows
-- ─────────────────────────────────────────────────────────────────────────────
