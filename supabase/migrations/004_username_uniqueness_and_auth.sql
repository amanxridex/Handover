-- Migration 004: Strict unique usernames, password credentials, and sign-in/sign-up RPCs
create unique index if not exists idx_profiles_username_unique
  on public.profiles (lower(trim(username)));

create table if not exists public.profile_credentials (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_credentials enable row level security;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    length(trim(coalesce(p_username, ''))) >= 3
    and lower(trim(p_username)) <> all (array['admin', 'handover', 'support', 'oliviia_be', 'root', 'test', 'taken'])
    and not exists (
      select 1
      from public.profiles
      where lower(trim(username)) = lower(trim(p_username))
    );
$$;

create or replace function public.register_user_profile(
  p_full_name text,
  p_username text,
  p_password text,
  p_avatar_url text default null,
  p_role text default 'creator',
  p_company_name text default null,
  p_company_logo_url text default null,
  p_has_website boolean default null,
  p_website_url text default null,
  p_company_pitch text default null,
  p_sector text default null,
  p_content_types text[] default '{}',
  p_instagram_handle text default null
)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  role text,
  company_name text,
  company_logo_url text,
  has_website boolean,
  website_url text,
  company_pitch text,
  sector text,
  content_types text[],
  instagram_handle text,
  onboarding_completed boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean_username text := lower(trim(coalesce(p_username, '')));
  v_profile_id uuid;
begin
  if length(v_clean_username) < 3 then
    raise exception 'INVALID_USERNAME';
  end if;

  if length(coalesce(p_password, '')) < 6 then
    raise exception 'WEAK_PASSWORD';
  end if;

  if not public.is_username_available(v_clean_username) then
    raise exception 'USERNAME_TAKEN' using errcode = '23505';
  end if;

  insert into public.profiles (
    full_name,
    username,
    avatar_url,
    role,
    company_name,
    company_logo_url,
    has_website,
    website_url,
    company_pitch,
    sector,
    content_types,
    instagram_handle,
    onboarding_completed
  )
  values (
    trim(p_full_name),
    v_clean_username,
    p_avatar_url,
    p_role,
    p_company_name,
    p_company_logo_url,
    p_has_website,
    p_website_url,
    p_company_pitch,
    p_sector,
    coalesce(p_content_types, '{}'),
    p_instagram_handle,
    true
  )
  returning public.profiles.id into v_profile_id;

  insert into public.profile_credentials (profile_id, password_hash)
  values (v_profile_id, crypt(p_password, gen_salt('bf')));

  return query
  select
    pr.id,
    pr.full_name,
    pr.username,
    pr.avatar_url,
    pr.role,
    pr.company_name,
    pr.company_logo_url,
    pr.has_website,
    pr.website_url,
    pr.company_pitch,
    pr.sector,
    pr.content_types,
    pr.instagram_handle,
    pr.onboarding_completed
  from public.profiles pr
  where pr.id = v_profile_id;
end;
$$;

create or replace function public.login_with_credentials(
  p_username text,
  p_password text
)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  role text,
  company_name text,
  company_logo_url text,
  has_website boolean,
  website_url text,
  company_pitch text,
  sector text,
  content_types text[],
  instagram_handle text,
  onboarding_completed boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean_username text := lower(trim(regexp_replace(coalesce(p_username, ''), '^@+', '')));
begin
  if v_clean_username = '' or coalesce(p_password, '') = '' then
    return;
  end if;

  return query
  select
    pr.id,
    pr.full_name,
    pr.username,
    pr.avatar_url,
    pr.role,
    pr.company_name,
    pr.company_logo_url,
    pr.has_website,
    pr.website_url,
    pr.company_pitch,
    pr.sector,
    pr.content_types,
    pr.instagram_handle,
    pr.onboarding_completed
  from public.profiles pr
  join public.profile_credentials pc on pc.profile_id = pr.id
  where lower(trim(pr.username)) = v_clean_username
    and pc.password_hash = crypt(p_password, pc.password_hash)
  limit 1;
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
grant execute on function public.register_user_profile(text, text, text, text, text, text, text, boolean, text, text, text, text[], text) to anon, authenticated;
grant execute on function public.login_with_credentials(text, text) to anon, authenticated;
