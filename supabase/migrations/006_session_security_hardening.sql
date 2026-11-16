-- Migration 006: Server session tokens, RPC write-guard triggers, & locked-down security locks

create table if not exists public.user_sessions (
  token_hash text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  revoked boolean not null default false,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_sessions_profile on public.user_sessions (profile_id, expires_at desc);
alter table public.user_sessions enable row level security;

-- Private table with zero public policies for passcode bcrypt hashes & biometric lock state
create table if not exists public.user_security_locks (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  biometric_lock_enabled boolean not null default false,
  passcode_hash text,
  updated_at timestamptz not null default now()
);

alter table public.user_security_locks enable row level security;

-- Block direct REST inserts/updates on profiles & user_settings; require SECURITY DEFINER RPCs
create or replace function public.enforce_trusted_rpc_write()
returns trigger
language plpgsql
as $$
begin
  if current_setting('handover.trusted_rpc', true) is distinct from '1' then
    raise exception 'DIRECT_WRITE_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_rpc_only on public.profiles;
create trigger trg_profiles_rpc_only
  before insert or update on public.profiles
  for each row
  execute function public.enforce_trusted_rpc_write();

drop trigger if exists trg_user_settings_rpc_only on public.user_settings;
create trigger trg_user_settings_rpc_only
  before insert or update on public.user_settings
  for each row
  execute function public.enforce_trusted_rpc_write();

create or replace function public.verify_session_token(p_session_token text)
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select s.profile_id
  from public.user_sessions s
  where s.token_hash = encode(digest(coalesce(p_session_token, ''), 'sha256'), 'hex')
    and s.revoked = false
    and s.expires_at > now()
  limit 1;
$$;

create or replace function public.issue_session_token(p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_raw_token text;
begin
  v_raw_token := encode(gen_random_bytes(32), 'hex');
  insert into public.user_sessions (token_hash, profile_id)
  values (encode(digest(v_raw_token, 'sha256'), 'hex'), p_profile_id);
  return v_raw_token;
end;
$$;

create or replace function public.register_user_session(
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
  bio text,
  role text,
  company_name text,
  company_logo_url text,
  has_website boolean,
  website_url text,
  company_pitch text,
  sector text,
  content_types text[],
  instagram_handle text,
  onboarding_completed boolean,
  session_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean_username text := lower(trim(coalesce(p_username, '')));
  v_profile_id uuid;
  v_session_token text;
begin
  if length(v_clean_username) < 3 or v_clean_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'INVALID_USERNAME';
  end if;

  if length(coalesce(p_password, '')) < 6 then
    raise exception 'WEAK_PASSWORD';
  end if;

  if not public.is_username_available(v_clean_username) then
    raise exception 'USERNAME_TAKEN' using errcode = '23505';
  end if;

  perform set_config('handover.trusted_rpc', '1', true);

  insert into public.profiles (
    full_name, username, avatar_url, role, company_name, company_logo_url,
    has_website, website_url, company_pitch, sector, content_types, instagram_handle, onboarding_completed
  )
  values (
    trim(p_full_name), v_clean_username, p_avatar_url, p_role, p_company_name, p_company_logo_url,
    p_has_website, p_website_url, p_company_pitch, p_sector, coalesce(p_content_types, '{}'), p_instagram_handle, true
  )
  returning public.profiles.id into v_profile_id;

  insert into public.profile_credentials (profile_id, password_hash)
  values (v_profile_id, crypt(p_password, gen_salt('bf')));

  v_session_token := public.issue_session_token(v_profile_id);

  return query
  select
    pr.id, pr.full_name, pr.username, pr.avatar_url, pr.bio, pr.role,
    pr.company_name, pr.company_logo_url, pr.has_website, pr.website_url,
    pr.company_pitch, pr.sector, pr.content_types, pr.instagram_handle,
    pr.onboarding_completed, v_session_token
  from public.profiles pr
  where pr.id = v_profile_id;
end;
$$;

create or replace function public.login_user_session(
  p_username text,
  p_password text
)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  role text,
  company_name text,
  company_logo_url text,
  has_website boolean,
  website_url text,
  company_pitch text,
  sector text,
  content_types text[],
  instagram_handle text,
  onboarding_completed boolean,
  session_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean_username text := lower(trim(regexp_replace(coalesce(p_username, ''), '^@+', '')));
  v_profile_id uuid;
  v_session_token text;
begin
  if v_clean_username = '' or coalesce(p_password, '') = '' then
    return;
  end if;

  select pr.id into v_profile_id
  from public.profiles pr
  join public.profile_credentials pc on pc.profile_id = pr.id
  where lower(trim(pr.username)) = v_clean_username
    and pc.password_hash = crypt(p_password, pc.password_hash)
  limit 1;

  if v_profile_id is null then
    return;
  end if;

  v_session_token := public.issue_session_token(v_profile_id);

  return query
  select
    pr.id, pr.full_name, pr.username, pr.avatar_url, pr.bio, pr.role,
    pr.company_name, pr.company_logo_url, pr.has_website, pr.website_url,
    pr.company_pitch, pr.sector, pr.content_types, pr.instagram_handle,
    pr.onboarding_completed, v_session_token
  from public.profiles pr
  where pr.id = v_profile_id;
end;
$$;

create or replace function public.validate_session(p_session_token text)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  bio text,
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
  v_profile_id uuid;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    return;
  end if;

  return query
  select
    pr.id, pr.full_name, pr.username, pr.avatar_url, pr.bio, pr.role,
    pr.company_name, pr.company_logo_url, pr.has_website, pr.website_url,
    pr.company_pitch, pr.sector, pr.content_types, pr.instagram_handle,
    pr.onboarding_completed
  from public.profiles pr
  where pr.id = v_profile_id and pr.onboarding_completed = true;
end;
$$;

create or replace function public.logout_session(p_session_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.user_sessions
  set revoked = true
  where token_hash = encode(digest(coalesce(p_session_token, ''), 'sha256'), 'hex');
end;
$$;

create or replace function public.update_authenticated_profile(
  p_session_token text,
  p_full_name text default null,
  p_bio text default null,
  p_avatar_url text default null,
  p_company_name text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    return false;
  end if;

  perform set_config('handover.trusted_rpc', '1', true);

  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    bio = coalesce(p_bio, bio),
    avatar_url = coalesce(p_avatar_url, avatar_url),
    company_name = coalesce(nullif(trim(p_company_name), ''), company_name)
  where id = v_profile_id;

  return true;
end;
$$;

create or replace function public.get_authenticated_settings(p_session_token text)
returns table (
  plan_tier text,
  haptics_enabled boolean,
  biometric_lock_enabled boolean,
  has_passcode boolean,
  notifications_enabled boolean,
  private_account boolean,
  autoplay_media boolean,
  show_activity boolean,
  show_badges boolean,
  language text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    return;
  end if;

  return query
  select
    coalesce(us.plan_tier, 'free'),
    coalesce(us.haptics_enabled, true),
    coalesce(sl.biometric_lock_enabled, false),
    (sl.passcode_hash is not null and sl.passcode_hash <> '') as has_passcode,
    coalesce(us.notifications_enabled, true),
    coalesce(us.private_account, false),
    coalesce(us.autoplay_media, true),
    coalesce(us.show_activity, true),
    coalesce(us.show_badges, true),
    coalesce(us.language, 'English')
  from public.profiles pr
  left join public.user_settings us on us.profile_id = pr.id
  left join public.user_security_locks sl on sl.profile_id = pr.id
  where pr.id = v_profile_id;
end;
$$;

create or replace function public.save_authenticated_settings(
  p_session_token text,
  p_plan_tier text default null,
  p_haptics_enabled boolean default null,
  p_biometric_lock_enabled boolean default null,
  p_new_passcode text default null,
  p_clear_passcode boolean default false,
  p_notifications_enabled boolean default null,
  p_private_account boolean default null,
  p_autoplay_media boolean default null,
  p_show_activity boolean default null,
  p_show_badges boolean default null,
  p_language text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile_id uuid;
  v_hashed_pin text;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    return false;
  end if;

  perform set_config('handover.trusted_rpc', '1', true);

  if p_new_passcode is not null and length(trim(p_new_passcode)) = 4 then
    v_hashed_pin := crypt(trim(p_new_passcode), gen_salt('bf'));
  end if;

  insert into public.user_settings (
    profile_id, plan_tier, haptics_enabled, notifications_enabled,
    private_account, autoplay_media, show_activity, show_badges, language
  )
  values (
    v_profile_id,
    coalesce(p_plan_tier, 'free'),
    coalesce(p_haptics_enabled, true),
    coalesce(p_notifications_enabled, true),
    coalesce(p_private_account, false),
    coalesce(p_autoplay_media, true),
    coalesce(p_show_activity, true),
    coalesce(p_show_badges, true),
    coalesce(p_language, 'English')
  )
  on conflict (profile_id) do update set
    plan_tier = coalesce(p_plan_tier, public.user_settings.plan_tier),
    haptics_enabled = coalesce(p_haptics_enabled, public.user_settings.haptics_enabled),
    notifications_enabled = coalesce(p_notifications_enabled, public.user_settings.notifications_enabled),
    private_account = coalesce(p_private_account, public.user_settings.private_account),
    autoplay_media = coalesce(p_autoplay_media, public.user_settings.autoplay_media),
    show_activity = coalesce(p_show_activity, public.user_settings.show_activity),
    show_badges = coalesce(p_show_badges, public.user_settings.show_badges),
    language = coalesce(p_language, public.user_settings.language);

  insert into public.user_security_locks (
    profile_id, biometric_lock_enabled, passcode_hash
  )
  values (
    v_profile_id,
    coalesce(p_biometric_lock_enabled, false),
    case when p_clear_passcode then null else v_hashed_pin end
  )
  on conflict (profile_id) do update set
    biometric_lock_enabled = coalesce(p_biometric_lock_enabled, public.user_security_locks.biometric_lock_enabled),
    passcode_hash = case
      when p_clear_passcode then null
      when v_hashed_pin is not null then v_hashed_pin
      else public.user_security_locks.passcode_hash
    end,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.verify_authenticated_passcode(
  p_session_token text,
  p_passcode text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.user_security_locks sl
    where sl.profile_id = v_profile_id
      and sl.passcode_hash is not null
      and sl.passcode_hash = crypt(trim(coalesce(p_passcode, '')), sl.passcode_hash)
  );
end;
$$;

grant execute on function public.register_user_session(text, text, text, text, text, text, text, boolean, text, text, text, text[], text) to anon, authenticated;
grant execute on function public.login_user_session(text, text) to anon, authenticated;
grant execute on function public.validate_session(text) to anon, authenticated;
grant execute on function public.logout_session(text) to anon, authenticated;
grant execute on function public.update_authenticated_profile(text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_authenticated_settings(text) to anon, authenticated;
grant execute on function public.save_authenticated_settings(text, text, boolean, boolean, text, boolean, boolean, boolean, boolean, boolean, boolean, text) to anon, authenticated;
grant execute on function public.verify_authenticated_passcode(text, text) to anon, authenticated;
