import { isSupabaseConfigured, supabase } from '../lib/supabase';

const STORAGE_KEY = 'handover_profile_v1';

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

function persistLocalProfile(profileRecord) {
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
    return isProfileComplete(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearStoredOnboardingState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
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
    const { data, error } = await supabase.rpc('register_user_profile', {
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
    if (row?.id) {
      const synced = mapDbRowToRecord(
        row,
        localProfile.setupData.avatar,
        roleDetails.companyLogoUrl
      );
      persistLocalProfile(synced);
      return { profile: synced };
    }
  } catch {
    // Keep offline local profile only if network is completely unreachable
  }

  persistLocalProfile(localProfile);
  return { profile: localProfile };
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
    const { data, error } = await supabase.rpc('login_with_credentials', {
      p_username: cleanUsername,
      p_password: password,
    });

    if (error) {
      return { error: 'Unable to sign in right now. Please try again.' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id) {
      return { error: 'Invalid @username or password' };
    }

    const profile = mapDbRowToRecord(row);
    persistLocalProfile(profile);
    return { profile };
  } catch {
    return { error: 'Network error while signing in. Please try again.' };
  }
}

export async function syncProfileFromSupabase(stored) {
  if (!stored || !isSupabaseConfigured || !supabase) return stored;

  try {
    const query = supabase
      .from('profiles')
      .select(
        'id, full_name, username, avatar_url, role, company_name, company_logo_url, has_website, website_url, company_pitch, sector, content_types, instagram_handle, onboarding_completed'
      )
      .limit(1);

    const { data, error } = stored.id
      ? await query.eq('id', stored.id).maybeSingle()
      : await query.ilike('username', stored.setupData.username).maybeSingle();

    if (error || !data || !data.onboarding_completed) {
      return stored;
    }

    const hydrated = mapDbRowToRecord(
      data,
      stored.setupData?.avatar,
      stored.roleDetails?.companyLogoUrl
    );
    persistLocalProfile(hydrated);
    return hydrated;
  } catch {
    return stored;
  }
}
