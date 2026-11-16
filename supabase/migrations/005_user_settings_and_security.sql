-- Migration 005: User settings, security lock, preferences, and feedback tables
alter table public.profiles
  add column if not exists bio text;

create table if not exists public.user_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'founder_pro')),
  haptics_enabled boolean not null default true,
  biometric_lock_enabled boolean not null default false,
  passcode_hash text,
  notifications_enabled boolean not null default true,
  private_account boolean not null default false,
  autoplay_media boolean not null default true,
  show_activity boolean not null default true,
  show_badges boolean not null default true,
  language text not null default 'English',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "User settings are viewable" on public.user_settings;
create policy "User settings are viewable"
  on public.user_settings for select using (true);

drop policy if exists "Anyone can insert user settings" on public.user_settings;
create policy "Anyone can insert user settings"
  on public.user_settings for insert with check (true);

drop policy if exists "Anyone can update user settings" on public.user_settings;
create policy "Anyone can update user settings"
  on public.user_settings for update using (true);

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'feedback' check (kind in ('feedback', 'support')),
  rating integer,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

drop policy if exists "Anyone can insert feedback" on public.user_feedback;
create policy "Anyone can insert feedback"
  on public.user_feedback for insert with check (true);

drop policy if exists "Feedback is readable" on public.user_feedback;
create policy "Feedback is readable"
  on public.user_feedback for select using (true);

