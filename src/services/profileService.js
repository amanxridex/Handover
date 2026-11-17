import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { sendPriorityPushToRecipient } from './nativeNotifySender';
import { broadcastRealtimeEvent } from './realtimeService';

const STORAGE_KEY = 'handover_profile_v1';
const SESSION_TOKEN_KEY = 'handover_session_token_v1';

const RESERVED_USERNAMES = new Set([
  'admin',
  'handover',
  'support',
  'oliviia_be',
  'root',
  'test',
  'taken',
]);

function isProfileComplete(record) {
  if (!record || !record.onboardingCompleted) return false;
  const setup = record.setupData;
  const role = record.roleDetails;
  if (!setup?.name?.trim() || !setup?.username?.trim()) return false;
  if (!role?.role) return false;

  if (role.role === 'founder') {
    const hasContact = role.hasWebsite
      ? Boolean(role.websiteUrl?.trim())
      : Boolean(role.instagram?.trim());
    return Boolean(
      role.companyName?.trim() &&
        hasContact &&
        role.companyPitch?.trim() &&
        role.sector?.trim()
    );
  }

  if (role.role === 'creator') {
    return Boolean(
      role.instagram?.trim() &&
        Array.isArray(role.contentTypes) &&
        role.contentTypes.length > 0
    );
  }

  return false;
}

function mapDbRowToRecord(data, fallbackAvatar = '', fallbackLogo = '') {
  return {
    id: data.id,
    onboardingCompleted: Boolean(data.onboarding_completed),
    setupData: {
      name: data.full_name,
      username: data.username,
      avatar: data.avatar_url || fallbackAvatar || '',
      bio: data.bio || '',
    },
    roleDetails:
      data.role === 'founder'
        ? {
            role: 'founder',
            companyName: data.company_name || '',
            companyLogoUrl: data.company_logo_url || fallbackLogo || '',
            hasWebsite: Boolean(data.has_website),
            websiteUrl: data.website_url || '',
            instagram: data.instagram_handle || '',
            companyPitch: data.company_pitch || '',
            sector: data.sector || '',
          }
        : {
            role: 'creator',
            instagram: data.instagram_handle || '',
            contentTypes: data.content_types || [],
          },
  };
}

export function getStoredSessionToken() {
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredSessionToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function persistLocalProfile(profileRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profileRecord));
  } catch {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...profileRecord,
          setupData: { ...profileRecord.setupData, avatar: '' },
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }
}

export function getStoredOnboardingState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isProfileComplete(parsed)) return null;

    // Prevent unauthenticated localStorage spoofing when Supabase auth is active
    if (isSupabaseConfigured && !getStoredSessionToken()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearStoredOnboardingState() {
  const token = getStoredSessionToken();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
  if (token && isSupabaseConfigured && supabase) {
    try {
      Promise.resolve(
        supabase.rpc('logout_session', { p_session_token: token })
      ).catch(() => {});
    } catch {
      // Ignore network / RPC cleanup errors during logout
    }
  }
}

export async function checkUsernameAvailable(username) {
  const clean = (username || '').trim().toLowerCase().replace(/^@+/, '');
  if (!clean || !/^[a-z0-9_]{3,20}$/.test(clean)) return false;
  if (RESERVED_USERNAMES.has(clean)) return false;

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const { data, error } = await supabase.rpc('is_username_available', {
      p_username: clean,
    });
    if (!error && typeof data === 'boolean') {
      return data;
    }
    const { data: rows, error: qErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', clean)
      .limit(1);
    if (!qErr && Array.isArray(rows)) {
      return rows.length === 0;
    }
  } catch {
    // Fall back gracefully when offline
  }

  return true;
}

export async function saveOnboardedProfile({ setupData, roleDetails }) {
  const cleanUsername = setupData.username.trim().toLowerCase().replace(/^@+/, '');
  const localProfile = {
    id: null,
    onboardingCompleted: true,
    setupData: {
      name: setupData.name.trim(),
      username: cleanUsername,
      avatar: setupData.avatar || '',
    },
    roleDetails,
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    persistLocalProfile(localProfile);
    return { profile: localProfile };
  }

  try {
    const { data, error } = await supabase.rpc('register_user_session', {
      p_full_name: localProfile.setupData.name,
      p_username: cleanUsername,
      p_password: setupData.password || '',
      p_avatar_url: localProfile.setupData.avatar || null,
      p_role: roleDetails.role,
      p_company_name:
        roleDetails.role === 'founder' ? roleDetails.companyName : null,
      p_company_logo_url:
        roleDetails.role === 'founder'
          ? roleDetails.companyLogoUrl || null
          : null,
      p_has_website:
        roleDetails.role === 'founder' ? Boolean(roleDetails.hasWebsite) : null,
      p_website_url:
        roleDetails.role === 'founder' ? roleDetails.websiteUrl || null : null,
      p_company_pitch:
        roleDetails.role === 'founder' ? roleDetails.companyPitch : null,
      p_sector: roleDetails.role === 'founder' ? roleDetails.sector : null,
      p_content_types:
        roleDetails.role === 'creator' ? roleDetails.contentTypes || [] : [],
      p_instagram_handle: roleDetails.instagram || null,
    });

    if (error) {
      const msg = `${error.code || ''} ${error.message || ''}`;
      if (msg.includes('23505') || msg.includes('USERNAME_TAKEN')) {
        return { error: 'USERNAME_TAKEN' };
      }
      if (msg.includes('WEAK_PASSWORD')) {
        return { error: 'WEAK_PASSWORD' };
      }
      return { error: error.message || 'REGISTRATION_FAILED' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (row?.id && row?.session_token) {
      setStoredSessionToken(row.session_token);
      const synced = mapDbRowToRecord(
        row,
        localProfile.setupData.avatar,
        roleDetails.companyLogoUrl
      );
      persistLocalProfile(synced);
      return { profile: synced };
    }
    return { error: 'REGISTRATION_FAILED' };
  } catch {
    return { error: 'Network error during registration. Please try again.' };
  }
}

export async function loginWithCredentials({ username, password }) {
  const cleanUsername = (username || '').trim().toLowerCase().replace(/^@+/, '');
  if (!cleanUsername || !password) {
    return { error: 'Please enter both username and password' };
  }

  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Authentication service is unavailable' };
  }

  try {
    const { data, error } = await supabase.rpc('login_user_session', {
      p_username: cleanUsername,
      p_password: password,
    });

    if (error) {
      return { error: 'Unable to sign in right now. Please try again.' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id || !row?.session_token) {
      return { error: 'Invalid @username or password' };
    }

    setStoredSessionToken(row.session_token);
    const profile = mapDbRowToRecord(row);
    persistLocalProfile(profile);
    return { profile };
  } catch {
    return { error: 'Network error while signing in. Please try again.' };
  }
}

export async function syncProfileFromSupabase(stored) {
  if (!stored) return { valid: false };
  if (!isSupabaseConfigured || !supabase) {
    return { valid: true, profile: stored };
  }

  const token = getStoredSessionToken();
  if (!token) {
    return { valid: false };
  }

  try {
    const { data, error } = await supabase.rpc('validate_session', {
      p_session_token: token,
    });

    if (error) {
      // Transient network / server error: keep local UI alive until next check
      return { valid: true, profile: stored };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id || !row?.onboarding_completed) {
      // Invalid, forged, or revoked session token -> force clean logout
      return { valid: false };
    }

    const hydrated = mapDbRowToRecord(
      row,
      stored.setupData?.avatar,
      stored.roleDetails?.companyLogoUrl
    );
    persistLocalProfile(hydrated);
    return { valid: true, profile: hydrated };
  } catch {
    return { valid: true, profile: stored };
  }
}

export async function searchProfilesByName({
  query,
  excludeProfileId,
  excludeUsername,
} = {}) {
  const sanitized = String(query || '')
    .trim()
    .replace(/[,()%_*]/g, '')
    .replace(/^@+/, '');

  if (!sanitized || !isSupabaseConfigured || !supabase) {
    return [];
  }

  const selfUsername = String(excludeUsername || '')
    .trim()
    .toLowerCase();

  try {
    let req = supabase
      .from('profiles')
      .select(
        'id, full_name, username, avatar_url, role, company_name, sector, company_pitch, bio, content_types'
      )
      .eq('onboarding_completed', true)
      .or(
        `full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%,company_name.ilike.%${sanitized}%`
      )
      .order('created_at', { ascending: false })
      .limit(20);

    if (excludeProfileId) {
      req = req.neq('id', excludeProfileId);
    }

    const { data, error } = await req;
    if (error || !Array.isArray(data)) {
      return [];
    }

    return data
      .filter((row) => {
        if (excludeProfileId && row.id === excludeProfileId) return false;
        if (
          selfUsername &&
          String(row.username || '').trim().toLowerCase() === selfUsername
        ) {
          return false;
        }
        return true;
      })
      .map((row) => ({
        id: row.id,
        fullName: row.full_name || 'Handover Member',
        username: row.username || 'member',
        avatar: row.avatar_url || '',
        role: row.role || 'creator',
        companyName: row.company_name || '',
        sector: row.sector || '',
        bio: row.bio || row.company_pitch || '',
        contentTypes: Array.isArray(row.content_types) ? row.content_types : [],
      }));
  } catch {
    return [];
  }
}

export async function fetchPublicProfileByUsername(username) {
  const clean = String(username || '').trim().replace(/^@+/, '').toLowerCase();
  if (!clean || !isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, username, avatar_url, role, company_name, company_logo_url, sector, company_pitch, bio, content_types'
      )
      .ilike('username', clean)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      fullName: data.full_name || 'Handover Member',
      username: data.username || clean,
      avatar: data.avatar_url || '',
      role: data.role || 'creator',
      companyName: data.company_name || '',
      companyLogoUrl: data.company_logo_url || '',
      sector: data.sector || '',
      companyPitch: data.company_pitch || '',
      bio: data.bio || data.company_pitch || '',
      contentTypes: Array.isArray(data.content_types) ? data.content_types : [],
    };
  } catch {
    return null;
  }
}

export async function checkIsFollowingProfile(targetProfileId) {
  const token = getStoredSessionToken();
  if (!token || !targetProfileId || !isSupabaseConfigured || !supabase) {
    return false;
  }
  try {
    const { data, error } = await supabase.rpc('is_following_profile', {
      p_session_token: token,
      p_target_profile_id: targetProfileId,
    });
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function toggleFollowProfile(targetProfileId) {
  const token = getStoredSessionToken();
  if (!token || !targetProfileId || !isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Sign in required to follow users.' };
  }
  try {
    const { data, error } = await supabase.rpc('toggle_follow_profile', {
      p_session_token: token,
      p_target_profile_id: targetProfileId,
    });
    if (error || !data?.ok) {
      return {
        ok: false,
        error: data?.error || error?.message || 'Could not update follow status.',
      };
    }
    if (Boolean(data.following)) {
      const me = getStoredOnboardingState();
      const actorId = me?.profileId || '';
      const actorName =
        me?.setupData?.name || me?.setupData?.username || 'Someone';
      const actorAvatar = me?.setupData?.avatar || '';

      broadcastRealtimeEvent(`notif:${targetProfileId}`, 'new_notification', {
        type: 'follow',
        actorId,
        actorName,
        actorAvatar,
      });

      sendPriorityPushToRecipient({
        recipientId: targetProfileId,
        title: actorName,
        body: 'started following you',
        url: '/notifications',
        tag: `follow-${actorId || targetProfileId}`,
        icon: actorAvatar,
      });
    }
    return {
      ok: true,
      following: Boolean(data.following),
      followersCount: data.followersCount ?? 0,
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
}
