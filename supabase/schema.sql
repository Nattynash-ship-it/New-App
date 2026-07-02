-- ===========================================================================
-- Life Management Hub — proposed PostgreSQL schema (Supabase)
--
-- The initial app persists locally (Zustand + storage adapter); this schema is
-- the target backend it maps onto 1:1. Every table is scoped to auth.users via
-- user_id with row-level security, so the same schema serves web and the
-- future React Native client through supabase-js.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Daily Compass
-- ---------------------------------------------------------------------------

create table check_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  period      text not null check (period in ('morning', 'evening')),
  mood        smallint not null check (mood between 1 and 5),
  note        text not null default '',
  prompt      text not null default '',
  created_at  timestamptz not null default now(),
  unique (user_id, date, period)
);

create table events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  date        date not null,
  time        time,
  domain      text not null check (domain in ('compass','work','school','meals','fitness','family')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Work Hub
-- ---------------------------------------------------------------------------

create table work_projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text not null default '',
  status        text not null default 'active' check (status in ('active','waiting','blocked','done')),
  tracking_refs text[] not null default '{}',
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

create table work_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references work_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  due_date    date
);

create table meetings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references work_projects(id) on delete set null,
  title        text not null,
  date         date not null,
  time         time not null,
  duration_min integer not null default 30,
  location     text
);

-- ---------------------------------------------------------------------------
-- School Hub (multi-unit courses → units → topics)
-- ---------------------------------------------------------------------------

create table courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  name        text not null,
  credits     smallint not null default 3,
  target_date date
);

create table course_units (
  id        uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null,
  position  smallint not null default 0
);

create table course_topics (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references course_units(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,           -- e.g. 'Graph Theory'
  completed    boolean not null default false,
  completed_at timestamptz,
  position     smallint not null default 0
);

create table assignments (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title     text not null,
  due_date  date not null,
  due_time  time,
  done      boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Nutrition & Grocery
-- ---------------------------------------------------------------------------

create table pantry_items (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  category text not null default 'pantry'
           check (category in ('produce','protein','grains','pantry','frozen','spices')),
  on_hand  boolean not null default false
);

create table recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  ingredients  jsonb not null default '[]',  -- [{name, quantity}]
  steps        jsonb not null default '[]',  -- [string]
  calories     integer,
  volume_score text check (volume_score in ('high','medium','low')),
  vegan        boolean not null default true,
  source       text not null default 'user' check (source in ('ai','local','user')),
  created_at   timestamptz not null default now()
);

create table planned_meals (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  date      date not null,
  slot      text not null check (slot in ('breakfast','lunch','dinner')),
  title     text not null
);

create table grocery_items (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  quantity text not null default '1',
  category text not null default 'pantry',
  checked  boolean not null default false
);

-- Outbox for delivery-service integrations (Whole Foods / Aldi webhooks)
create table grocery_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  service      text not null check (service in ('whole_foods','aldi')),
  payload      jsonb not null,
  status       text not null default 'queued' check (status in ('queued','forwarded','failed')),
  submitted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fitness & Wellness
-- ---------------------------------------------------------------------------

create table routines (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  focus   text not null default ''
);

create table routine_exercises (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,       -- e.g. 'Russian Deadlift'
  target     text not null default '',
  position   smallint not null default 0
);

create table workout_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references routines(id) on delete cascade,
  date       date not null,
  effort     smallint not null check (effort between 1 and 5),
  note       text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Family & Gamified Economy
-- ---------------------------------------------------------------------------

create table kids (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  color   text not null default '#B07B2E',
  points  integer not null default 0 check (points >= 0)
);

create table family_activities (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  kid_id    uuid references kids(id) on delete cascade,  -- null = whole family
  title     text not null,
  date      date not null,
  time      time,
  recurring text check (recurring in ('weekly'))
);

create table chores (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kid_id  uuid references kids(id) on delete cascade,    -- null = anyone
  title   text not null,
  points  integer not null check (points > 0)
);

create table store_rewards (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title   text not null,
  cost    integer not null check (cost > 0)
);

create table point_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kid_id     uuid not null references kids(id) on delete cascade,
  delta      integer not null,             -- + earned, - spent
  reason     text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the hot paths (today's timeline, upcoming deadlines)
-- ---------------------------------------------------------------------------

create index idx_meetings_user_date        on meetings (user_id, date);
create index idx_assignments_user_due      on assignments (user_id, due_date) where not done;
create index idx_activities_user_date      on family_activities (user_id, date);
create index idx_planned_meals_user_date   on planned_meals (user_id, date);
create index idx_events_user_date          on events (user_id, date);
create index idx_workout_logs_user_date    on workout_logs (user_id, date);
create index idx_ledger_kid                on point_transactions (kid_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security: each user sees only their own rows
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'check_ins','events','work_projects','work_tasks','meetings',
    'courses','course_units','course_topics','assignments',
    'pantry_items','recipes','planned_meals','grocery_items','grocery_orders',
    'routines','routine_exercises','workout_logs',
    'kids','family_activities','chores','store_rewards','point_transactions'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_owner', t
    );
  end loop;
end $$;
