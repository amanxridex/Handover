import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { setHapticsEnabled } from '../utils/nativeBridge';
import { getStoredSessionToken } from './profileService';

const SETTINGS_STORAGE_KEY = 'handover_settings_v1';

export const DEFAULT_SETTINGS = {
  planTier: 'free', // free | pro | founder_pro
  hapticsEnabled: true,
  soundEnabled: true,
  biometricLockEnabled: false,
  hasPasscode: false,
  passcodeHash: '',
  biometricCredentialId: '',
  notificationsEnabled: true,
  privateAccount: false,
  autoplayMedia: true,
  showActivity: true,
  showBadges: true,
  language: 'English',
  themeMode: 'dark', // dark | light
};

export function applyThemeMode(mode) {
  const normalized = mode === 'light' ? 'light' : 'dark';
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = normalized;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', normalized === 'light' ? '#eff6ff' : '#000000');
    }
  }
}

function readLocalSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      hasPasscode: Boolean(parsed.hasPasscode || parsed.passcodeHash),
      themeMode: parsed.themeMode === 'light' ? 'light' : 'dark',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeLocalSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
  setHapticsEnabled(Boolean(settings.hapticsEnabled));
  applyThemeMode(settings.themeMode);
}

export function getStoredSettings() {
  const settings = readLocalSettings();
  setHapticsEnabled(Boolean(settings.hapticsEnabled));
  applyThemeMode(settings.themeMode);
  return settings;
}

export function clearStoredSettings() {
  try {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // Ignore
  }
  setHapticsEnabled(true);
  applyThemeMode('dark');
}

// Local offline fallback PIN hash (used only if Supabase is unconfigured)
export async function hashPasscode(pin) {
  const clean = String(pin || '').trim();
  const input = `handover:pin:v1:${clean}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && window.isSecureContext) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (code + i), 0x85ebca6b) >>> 0;
  }
  return `fnv:${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export async function verifyPasscode(pin, storedHash) {
  const token = getStoredSessionToken();
  if (isSupabaseConfigured && supabase && token) {
    try {
      const { data, error } = await supabase.rpc('verify_authenticated_passcode', {
        p_session_token: token,
        p_passcode: String(pin || ''),
      });
      if (!error && typeof data === 'boolean') {
        return data;
      }
    } catch {
      // Fall through to local hash only on network failure
    }
  }
  if (!storedHash) return false;
  const computed = await hashPasscode(pin);
  return computed === storedHash;
}

export async function isPlatformBiometricAvailable() {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !window.isSecureContext ||
    !navigator.credentials
  ) {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function enrollBiometricPasskey({ username, displayName }) {
  const available = await isPlatformBiometricAvailable();
  if (!available) {
    return { supported: false, credentialId: '' };
  }
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new TextEncoder().encode(username || 'handover_user');

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Handover',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: username || 'handover_user',
          displayName: displayName || 'Handover Member',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 45000,
        attestation: 'none',
      },
    });

    if (!credential?.rawId) {
      return { supported: true, cancelled: true };
    }
    const base64Id = btoa(
      String.fromCharCode(...new Uint8Array(credential.rawId))
    );
    return { supported: true, credentialId: base64Id };
  } catch {
    return { supported: true, cancelled: true };
  }
}

export async function verifyBiometricPasskey(credentialId) {
  const available = await isPlatformBiometricAvailable();
  if (!available || !credentialId) {
    return { verified: false, unsupported: true };
  }
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const rawBytes = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawBytes,
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 45000,
      },
    });
    return { verified: Boolean(assertion) };
  } catch {
    return { verified: false };
  }
}

export async function fetchUserSettings(profileId) {
  const local = readLocalSettings();
  const token = getStoredSessionToken();
  if (!profileId || !token || !isSupabaseConfigured || !supabase) {
    return local;
  }
  try {
    const [settingsRes, themeRes] = await Promise.all([
      supabase.rpc('get_authenticated_settings', {
        p_session_token: token,
      }),
      supabase.rpc('get_theme_mode', {
        p_session_token: token,
      }),
    ]);

    const { data, error } = settingsRes;
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return local;

    const remoteTheme =
      !themeRes.error &&
      (themeRes.data === 'light' || themeRes.data === 'dark')
        ? themeRes.data
        : local.themeMode;

    const merged = {
      ...local,
      planTier: row.plan_tier || local.planTier,
      hapticsEnabled:
        typeof row.haptics_enabled === 'boolean'
          ? row.haptics_enabled
          : local.hapticsEnabled,
      biometricLockEnabled:
        typeof row.biometric_lock_enabled === 'boolean'
          ? row.biometric_lock_enabled
          : local.biometricLockEnabled,
      hasPasscode: Boolean(row.has_passcode),
      notificationsEnabled:
        typeof row.notifications_enabled === 'boolean'
          ? row.notifications_enabled
          : local.notificationsEnabled,
      privateAccount:
        typeof row.private_account === 'boolean'
          ? row.private_account
          : local.privateAccount,
      autoplayMedia:
        typeof row.autoplay_media === 'boolean'
          ? row.autoplay_media
          : local.autoplayMedia,
      showActivity:
        typeof row.show_activity === 'boolean'
          ? row.show_activity
          : local.showActivity,
      showBadges:
        typeof row.show_badges === 'boolean'
          ? row.show_badges
          : local.showBadges,
      language: row.language || local.language,
      themeMode: remoteTheme,
    };
    writeLocalSettings(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveUserSettings(profileId, patch) {
  const { newPasscode, clearPasscode, ...cleanPatch } = patch;
  const current = readLocalSettings();
  const next = {
    ...current,
    ...cleanPatch,
    themeMode:
      (cleanPatch.themeMode ?? current.themeMode) === 'light'
        ? 'light'
        : 'dark',
    hasPasscode: clearPasscode
      ? false
      : newPasscode
        ? true
        : Boolean(cleanPatch.hasPasscode ?? current.hasPasscode),
  };

  if (newPasscode && !isSupabaseConfigured) {
    next.passcodeHash = await hashPasscode(newPasscode);
  } else if (clearPasscode) {
    next.passcodeHash = '';
  }

  writeLocalSettings(next);

  const token = getStoredSessionToken();
  if (!profileId || !token || !isSupabaseConfigured || !supabase) {
    return next;
  }

  try {
    const rpcCalls = [
      supabase.rpc('save_authenticated_settings', {
        p_session_token: token,
        p_plan_tier: next.planTier,
        p_haptics_enabled: Boolean(next.hapticsEnabled),
        p_biometric_lock_enabled: Boolean(next.biometricLockEnabled),
        p_new_passcode: newPasscode || null,
        p_clear_passcode: Boolean(clearPasscode),
        p_notifications_enabled: Boolean(next.notificationsEnabled),
        p_private_account: Boolean(next.privateAccount),
        p_autoplay_media: Boolean(next.autoplayMedia),
        p_show_activity: Boolean(next.showActivity),
        p_show_badges: Boolean(next.showBadges),
        p_language: next.language || 'English',
      }),
    ];
    if (cleanPatch.themeMode !== undefined) {
      rpcCalls.push(
        supabase.rpc('set_theme_mode', {
          p_session_token: token,
          p_theme_mode: next.themeMode,
        })
      );
    }
    await Promise.all(rpcCalls);
  } catch {
    // Keep local settings even when offline
  }

  return next;
}

export async function updateProfileDetailsInDb(
  profileId,
  { fullName, bio, avatarUrl, companyName }
) {
  const token = getStoredSessionToken();
  if (!profileId || !isSupabaseConfigured || !supabase) {
    return { ok: true };
  }
  if (!token) {
    return { ok: false, error: 'Session expired. Please sign in again.' };
  }
  try {
    const { data, error } = await supabase.rpc('update_authenticated_profile', {
      p_session_token: token,
      p_full_name: fullName ?? null,
      p_bio: bio ?? null,
      p_avatar_url: avatarUrl ?? null,
      p_company_name: companyName ?? null,
    });
    if (error || data === false) {
      return { ok: false, error: 'Session invalid or expired' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to update profile' };
  }
}

export async function submitUserFeedback({ profileId, kind, rating, message }) {
  if (!message?.trim()) return { ok: false, error: 'Please write a message' };
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, localOnly: true };
  }
  try {
    const { error } = await supabase.from('user_feedback').insert({
      profile_id: profileId || null,
      kind: kind === 'support' ? 'support' : 'feedback',
      rating: rating || null,
      message: message.trim(),
    });
    return { ok: !error, error: error?.message };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}
