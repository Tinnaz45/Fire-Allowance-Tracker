-- ═══════════════════════════════════════════════════════════════
-- FIRE ALLOWANCE TRACKER — SUPABASE SCHEMA
-- Run this in your Supabase SQL editor to set up the database.
-- ═══════════════════════════════════════════════════════════════

-- PROFILES (one per user, extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  first_name  text not null default '',
  last_name   text not null default '',
  station_id  integer,
  platoon     text check (platoon in ('A','B','C','D','Z')),
  home_dist_km numeric(6,1) default 0,
  home_address text,
  employee_id text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id, '', '');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- RECALLS
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
create policy "Users manage own recalls" on public.recalls for all using (auth.uid() = user_id);


-- RETAIN
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
create policy "Users manage own retain" on public.retain for all using (auth.uid() = user_id);


-- STANDBY / M&D
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
create policy "Users manage own standby" on public.standby for all using (auth.uid() = user_id);


-- SPOILT / DELAYED MEALS
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
create policy "Users manage own spoilt" on public.spoilt for all using (auth.uid() = user_id);


-- STATION DISTANCES (cached driving distances between stations, refreshed annually)
create table if not exists public.station_distances (
  from_station_id integer not null,
  to_station_id   integer not null,
  distance_m      integer not null,
  duration_s      integer not null,
  calculated_year integer not null,
  primary key (from_station_id, to_station_id)
);

alter table public.station_distances enable row level security;
create policy "Anyone can read station distances"        on public.station_distances for select using (true);
create policy "Authenticated users can insert distances" on public.station_distances for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update distances" on public.station_distances for update using (auth.role() = 'authenticated');


-- UPDATED_AT trigger (reusable)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_recalls_updated_at  before update on public.recalls  for each row execute procedure public.set_updated_at();
create trigger set_retain_updated_at   before update on public.retain   for each row execute procedure public.set_updated_at();
create trigger set_standby_updated_at  before update on public.standby  for each row execute procedure public.set_updated_at();
create trigger set_spoilt_updated_at   before update on public.spoilt   for each row execute procedure public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
