-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Every table has a user_id + Row Level Security policy, so a user can only
-- ever read/write their own rows. This is what "multi-tenant" actually means
-- at the database level, not just a marketing word.

create extension if not exists vector;

-- ── Profiles ────────────────────────────────────────────────
-- One row per signed-up user, extending Supabase's built-in auth.users.
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    resume_text text,               -- extracted plain text from the uploaded resume
    skill_profile jsonb,            -- structured skills/experience pulled from the resume
    created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
    on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
    on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
    on profiles for insert with check (auth.uid() = id);


-- ── Jobs ────────────────────────────────────────────────────
-- Postings pulled by the Scout agent. Shared across users (not per-user data),
-- so it's cached once and reused — this is also what keeps you under Adzuna's
-- shared free-tier rate limit.
create table jobs (
    id uuid primary key default gen_random_uuid(),
    external_id text unique,        -- Adzuna's own job id, used to avoid duplicate inserts
    title text not null,
    company text,
    location text,
    description text,
    url text,
    embedding vector(384),          -- for similarity search against skill profiles
    fetched_at timestamptz default now()
);

alter table jobs enable row level security;

create policy "Anyone authenticated can read jobs"
    on jobs for select using (auth.role() = 'authenticated');


-- ── Matches ─────────────────────────────────────────────────
-- Output of the Matcher agent: a score + gap analysis for a specific user against a specific job.
create table matches (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    job_id uuid references jobs(id) on delete cascade not null,
    fit_score numeric,
    skill_gaps jsonb,
    reasoning text,
    created_at timestamptz default now(),
    unique (user_id, job_id)
);

alter table matches enable row level security;

create policy "Users can view own matches"
    on matches for select using (auth.uid() = user_id);

create policy "Users can insert own matches"
    on matches for insert with check (auth.uid() = user_id);


-- ── Applications (Tracker) ─────────────────────────────────
-- The in-app pipeline dashboard reads/writes here.
create table applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    job_id uuid references jobs(id) on delete cascade not null,
    status text default 'saved' check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected')),
    notes text,
    updated_at timestamptz default now()
);

alter table applications enable row level security;

create policy "Users can view own applications"
    on applications for select using (auth.uid() = user_id);

create policy "Users can insert own applications"
    on applications for insert with check (auth.uid() = user_id);

create policy "Users can update own applications"
    on applications for update using (auth.uid() = user_id);
