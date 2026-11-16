-- Migration 002: Founder company logo badge & full post/comment persistence
alter table public.profiles
  add column if not exists company_logo_url text;

alter table public.posts
  add column if not exists author_name text,
  add column if not exists author_username text,
  add column if not exists author_avatar_url text,
  add column if not exists author_role text,
  add column if not exists author_company_name text,
  add column if not exists author_company_logo_url text;

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_comments_post on public.post_comments (post_id, created_at asc);

alter table public.post_comments enable row level security;

drop policy if exists "Posts can be updated by everyone" on public.posts;
create policy "Posts can be updated by everyone"
  on public.posts for update
  using (true);

drop policy if exists "Post comments are viewable by everyone" on public.post_comments;
create policy "Post comments are viewable by everyone"
  on public.post_comments for select
  using (true);

drop policy if exists "Anyone can insert post comments" on public.post_comments;
create policy "Anyone can insert post comments"
  on public.post_comments for insert
  with check (true);

drop policy if exists "Anyone can unfollow" on public.follows;
create policy "Anyone can unfollow"
  on public.follows for delete
  using (true);

drop policy if exists "Anyone can insert notifications" on public.notifications;
create policy "Anyone can insert notifications"
  on public.notifications for insert
  with check (true);

