-- Migration 007: Add persisted Light / Dark theme_mode setting & RPCs
alter table public.user_settings
  add column if not exists theme_mode text not null default 'dark'
  check (theme_mode in ('dark', 'light'));

create or replace function public.get_theme_mode(p_session_token text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile_id uuid;
  v_mode text;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    return 'dark';
  end if;

  select us.theme_mode into v_mode
  from public.user_settings us
  where us.profile_id = v_profile_id;

  return coalesce(v_mode, 'dark');
end;
$$;

create or replace function public.set_theme_mode(
  p_session_token text,
  p_theme_mode text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_profile_id uuid;
  v_mode text := case when p_theme_mode = 'light' then 'light' else 'dark' end;
begin
  v_profile_id := public.verify_session_token(p_session_token);
  if v_profile_id is null then
    return false;
  end if;

  perform set_config('handover.trusted_rpc', '1', true);

  insert into public.user_settings (profile_id, theme_mode)
  values (v_profile_id, v_mode)
  on conflict (profile_id) do update set
    theme_mode = v_mode;

  return true;
end;
$$;

grant execute on function public.get_theme_mode(text) to anon, authenticated;
grant execute on function public.set_theme_mode(text, text) to anon, authenticated;
