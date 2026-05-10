-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: fire_allowance_user_rates
-- ⚠️  NOTE: This file is now superseded by supabase-migration-v2.sql,
--     which contains all of these statements with full idempotency guards.
--     This file is retained for historical reference only.
--     Run supabase-migration-v2.sql instead — it is fully self-contained.
-- ═══════════════════════════════════════════════════════════════════════
-- If you must run this file standalone, all statements are idempotent.
-- ═══════════════════════════════════════════════════════════════════════

-- Shared updated_at trigger function (no-op if already exists)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- USER RATES — one row per user, stores their editable rate overrides.
-- If a user has no row, the app falls back to DEFAULT_RATES in defaultRates.js.

create table if not exists public.fire_allowance_user_rates (
  id                          uuid default gen_random_uuid() primary key,
  user_id                     uuid references auth.users on delete cascade not null unique,

  -- Travel
  -- $1.20/km — user-confirmed award rate 2025. Review annually.
  kilometre_rate              numeric(6,4) not null default 1.20,

  -- Meals
  -- $10.90 — user-confirmed award rate 2025.
  small_meal_allowance        numeric(8,2) not null default 10.90,
  -- $21.80 — derived as 2× small; UNCONFIRMED. Verify against enterprise agreement.
  large_meal_allowance        numeric(8,2) not null default 21.80,
  -- $22.80 — UNCONFIRMED. Verify against enterprise agreement.
  spoilt_meal_allowance       numeric(8,2) not null default 22.80,
  -- $22.80 — UNCONFIRMED. Verify against enterprise agreement.
  delayed_meal_allowance      numeric(8,2) not null default 22.80,

  -- Overnight
  overnight_allowance         numeric(8,2) not null default 0.00,

  -- Standby
  -- $10.90 — assumed equal to small_meal_allowance; UNCONFIRMED.
  standby_night_meal_allowance numeric(8,2) not null default 10.90,

  -- Audit
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

-- Row-level security: users can only see/edit their own rates row.
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

-- Auto-update updated_at on every edit.
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


-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: Add rates_snapshot column to all claim tables
-- ═══════════════════════════════════════════════════════════════════════

alter table public.recalls  add column if not exists rates_snapshot jsonb default null;
alter table public.retain   add column if not exists rates_snapshot jsonb default null;
alter table public.standby  add column if not exists rates_snapshot jsonb default null;
alter table public.spoilt   add column if not exists rates_snapshot jsonb default null;


-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: Add calculation_inputs column to all claim tables
-- ═══════════════════════════════════════════════════════════════════════

alter table public.recalls  add column if not exists calculation_inputs jsonb default null;
alter table public.retain   add column if not exists calculation_inputs jsonb default null;
alter table public.standby  add column if not exists calculation_inputs jsonb default null;
alter table public.spoilt   add column if not exists calculation_inputs jsonb default null;
