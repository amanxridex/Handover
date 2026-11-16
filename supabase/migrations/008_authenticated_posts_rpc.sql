-- Migration 008: Server-authenticated post creation RPC linked to verified user profile
alter table public.posts add column if not exists is_deleted boolean not null default false;

create or replace function public.create_authenticated_post(
  p_session_token text,
  p_headline text,
  p_image_url text default null,
  p_category text default 'Personal'
)
returns table (
  id uuid,
  author_id uuid,
  headline text,
  image_url text,
  likes_count integer,
  created_at timestamptz,
  author_name text,
  author_username text,
  author_avatar_url text,
  author_role text,
  author_company_name text,
  author_company_logo_url text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile_id uuid;
  v_prof public.profiles%rowtype;
  v_post_id uuid;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_headline, ''))) = 0 then
    raise exception 'EMPTY_HEADLINE';
  end if;

  select * into v_prof
  from public.profiles
  where public.profiles.id = v_profile_id
  limit 1;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into public.posts (
    author_id,
    headline,
    image_url,
    category,
    author_name,
    author_username,
    author_avatar_url,
    author_role,
    author_company_name,
    author_company_logo_url
  )
  values (
    v_prof.id,
    trim(p_headline),
    p_image_url,
    coalesce(nullif(trim(p_category), ''), 'Personal'),
    v_prof.full_name,
    v_prof.username,
    v_prof.avatar_url,
    v_prof.role,
    v_prof.company_name,
    v_prof.company_logo_url
  )
  returning public.posts.id into v_post_id;

  return query
  select
    p.id,
    p.author_id,
    p.headline,
    p.image_url,
    p.likes_count,
    p.created_at,
    p.author_name,
    p.author_username,
    p.author_avatar_url,
    p.author_role,
    p.author_company_name,
    p.author_company_logo_url
  from public.posts p
  where p.id = v_post_id;
end;
$$;

grant execute on function public.create_authenticated_post(text, text, text, text) to anon, authenticated;
