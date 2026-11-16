-- Handover Onboarding & Social Profile Schema
-- Target Supabase project: vjhadnhizidigrccrsna

create extension if not exists pgcrypto;

-- 1. Profiles table (stores user onboarding: avatar, full name, username, role & details)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  username text not null unique,
  avatar_url text,
  role text not null check (role in ('founder', 'creator')),

  -- Founder-specific fields
  company_name text,
  has_website boolean,
  website_url text,
  company_pitch text,
  sector text,

  -- Creator-specific fields
  content_types text[] not null default '{}',

  -- Shared social handle & onboarding status
  instagram_handle text,
  onboarding_completed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create index if not exists idx_profiles_username on public.profiles (lower(username));
create index if not exists idx_profiles_role on public.profiles (role);

-- Auto-update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Username availability RPC for ProfileSetupScreen
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

-- 2. Posts table (Home Feed & Profile creations)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  headline text not null,
  image_url text,
  category text default 'Personal',
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_author_created on public.posts (author_id, created_at desc);

-- 3. Follows table (powers Follow Back / Slide to Follow)
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- 4. Notifications table (likes, comments, followers)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_text text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on public.notifications (recipient_id, created_at desc);

-- 5. Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;

-- Public read & onboarding upsert policies (tighten with auth.uid() once Auth login is enabled)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Anyone can create an onboarding profile" on public.profiles;
create policy "Anyone can create an onboarding profile"
  on public.profiles for insert
  with check (true);

drop policy if exists "Profiles can be updated" on public.profiles;
create policy "Profiles can be updated"
  on public.profiles for update
  using (true);

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "Anyone can insert posts" on public.posts;
create policy "Anyone can insert posts"
  on public.posts for insert
  with check (true);

drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

drop policy if exists "Anyone can follow" on public.follows;
create policy "Anyone can follow"
  on public.follows for insert
  with check (true);

drop policy if exists "Notifications are viewable" on public.notifications;
create policy "Notifications are viewable"
  on public.notifications for select
  using (true);

drop policy if exists "Notifications can be updated" on public.notifications;
create policy "Notifications can be updated"
  on public.notifications for update
  using (true);
