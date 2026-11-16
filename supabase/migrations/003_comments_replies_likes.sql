-- Migration 003: Threaded comments, comment likes, and post likes persistence
alter table public.post_comments
  alter column post_id drop not null,
  add column if not exists post_key text not null default '',
  add column if not exists parent_comment_id uuid references public.post_comments(id) on delete cascade,
  add column if not exists author_username text,
  add column if not exists author_avatar_url text,
  add column if not exists author_role text,
  add column if not exists author_company_name text,
  add column if not exists author_company_logo_url text,
  add column if not exists likes_count integer not null default 0;

create index if not exists idx_post_comments_post_key on public.post_comments (post_key, created_at asc);
create index if not exists idx_post_comments_parent on public.post_comments (parent_comment_id, created_at asc);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  actor_key text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, actor_key)
);

create table if not exists public.post_likes (
  post_key text not null,
  actor_key text not null,
  created_at timestamptz not null default now(),
  primary key (post_key, actor_key)
);

create table if not exists public.post_counters (
  post_key text primary key,
  likes_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.comment_likes enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_counters enable row level security;

drop policy if exists "Anyone can update post comments" on public.post_comments;
create policy "Anyone can update post comments"
  on public.post_comments for update using (true);

drop policy if exists "Comment likes are viewable by everyone" on public.comment_likes;
create policy "Comment likes are viewable by everyone"
  on public.comment_likes for select using (true);

drop policy if exists "Anyone can insert comment likes" on public.comment_likes;
create policy "Anyone can insert comment likes"
  on public.comment_likes for insert with check (true);

drop policy if exists "Anyone can delete comment likes" on public.comment_likes;
create policy "Anyone can delete comment likes"
  on public.comment_likes for delete using (true);

drop policy if exists "Post likes are viewable by everyone" on public.post_likes;
create policy "Post likes are viewable by everyone"
  on public.post_likes for select using (true);

drop policy if exists "Anyone can insert post likes" on public.post_likes;
create policy "Anyone can insert post likes"
  on public.post_likes for insert with check (true);

drop policy if exists "Anyone can delete post likes" on public.post_likes;
create policy "Anyone can delete post likes"
  on public.post_likes for delete using (true);

drop policy if exists "Post counters are viewable by everyone" on public.post_counters;
create policy "Post counters are viewable by everyone"
  on public.post_counters for select using (true);

drop policy if exists "Anyone can upsert post counters" on public.post_counters;
create policy "Anyone can upsert post counters"
  on public.post_counters for insert with check (true);

drop policy if exists "Anyone can update post counters" on public.post_counters;
create policy "Anyone can update post counters"
  on public.post_counters for update using (true);

-- Seed starter post counters and initial comments/replies
insert into public.post_counters (post_key, likes_count) values
  ('pillow-fight', 24),
  ('skyline-sunset', 18),
  ('courtside-dusk', 41)
on conflict (post_key) do nothing;

insert into public.post_comments (
  id, post_key, parent_comment_id, author_name, author_username, author_role, author_company_name, body, likes_count, created_at
) values
  ('11111111-1111-4111-8111-000000000001', 'pillow-fight', null, 'Olivia Beits', 'oliviabeits', 'creator', null, 'The flash lighting in this shot looks straight out of a magazine!', 9, now() - interval '4 hours'),
  ('11111111-1111-4111-8111-000000000002', 'pillow-fight', '11111111-1111-4111-8111-000000000001', 'Maria Theodor', 'mariatheodor', 'creator', null, 'Thank you! We literally destroyed two feather pillows for this frame 😂', 4, now() - interval '3 hours'),
  ('11111111-1111-4111-8111-000000000003', 'pillow-fight', null, 'Jacob Jones', 'jacobjones', 'founder', 'Handover', 'Iconic energy. Saving this vibe for our next campaign moodboard.', 6, now() - interval '2 hours'),
  ('11111111-1111-4111-8111-000000000004', 'skyline-sunset', null, 'David Smith', 'davidsmith', 'creator', null, 'That sunset gradient over the skyline is unreal!', 5, now() - interval '5 hours'),
  ('11111111-1111-4111-8111-000000000005', 'courtside-dusk', null, 'Charlie Brown', 'charliebrown', 'creator', null, 'Need this exact camera preset for evening courtside shoots.', 7, now() - interval '12 hours')
on conflict (id) do nothing;
