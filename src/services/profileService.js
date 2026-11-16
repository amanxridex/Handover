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
  const clean = (username || '').trim().toLowerCase();
  if (!clean || clean.length < 3) return false;
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
      .eq('username', clean)
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
  const existing = getStoredOnboardingState();
  const profileRecord = {
    id: existing?.id || null,
    onboardingCompleted: true,
    setupData: {
      name: setupData.name.trim(),
      username: setupData.username.trim().toLowerCase(),
      avatar: setupData.avatar || '',
    },
    roleDetails,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profileRecord));
  } catch {
    // Ignore quota errors (e.g. very large custom base64 avatar)
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...profileRecord,
          setupData: { ...profileRecord.setupData, avatar: '' },
        })
      );
    } catch {
      // Ignore
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    return profileRecord;
  }

  try {
    const payload = {
      full_name: profileRecord.setupData.name,
      username: profileRecord.setupData.username,
      avatar_url: profileRecord.setupData.avatar || null,
      role: roleDetails.role,
      company_name:
        roleDetails.role === 'founder' ? roleDetails.companyName : null,
      has_website:
        roleDetails.role === 'founder' ? Boolean(roleDetails.hasWebsite) : null,
      website_url:
        roleDetails.role === 'founder' ? roleDetails.websiteUrl || null : null,
      company_pitch:
        roleDetails.role === 'founder' ? roleDetails.companyPitch : null,
      sector: roleDetails.role === 'founder' ? roleDetails.sector : null,
      content_types:
        roleDetails.role === 'creator' ? roleDetails.contentTypes || [] : [],
      instagram_handle: roleDetails.instagram || null,
      onboarding_completed: true,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'username' })
      .select('id')
      .single();

    if (!error && data?.id) {
      const synced = { ...profileRecord, id: data.id };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
      } catch {
        // Ignore
      }
      return synced;
    }
  } catch {
    // Keep local record if Supabase is unreachable
  }

  return profileRecord;
}

export async function syncProfileFromSupabase(stored) {
  if (!stored || !isSupabaseConfigured || !supabase) return stored;

  try {
    const query = supabase.from('profiles').select('*').limit(1);
    const { data, error } = stored.id
      ? await query.eq('id', stored.id).maybeSingle()
      : await query.eq('username', stored.setupData.username).maybeSingle();

    if (error || !data || !data.onboarding_completed) {
      return stored;
    }

    const hydrated = {
      id: data.id,
      onboardingCompleted: Boolean(data.onboarding_completed),
      setupData: {
        name: data.full_name,
        username: data.username,
        avatar: data.avatar_url || stored.setupData.avatar,
      },
      roleDetails:
        data.role === 'founder'
          ? {
              role: 'founder',
              companyName: data.company_name || '',
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

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
    } catch {
      // Ignore
    }
    return hydrated;
  } catch {
    return stored;
  }
}
