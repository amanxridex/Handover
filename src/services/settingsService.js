import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { setHapticsEnabled } from '../utils/nativeBridge';

const SETTINGS_STORAGE_KEY = 'handover_settings_v1';

export const DEFAULT_SETTINGS = {
  planTier: 'free', // free | pro | founder_pro
  hapticsEnabled: true,
  biometricLockEnabled: false,
  passcodeHash: '',
  biometricCredentialId: '',
  notificationsEnabled: true,
  privateAccount: false,
  autoplayMedia: true,
  showActivity: true,
  showBadges: true,
  language: 'English',
};

function readLocalSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
}

export function getStoredSettings() {
  const settings = readLocalSettings();
  setHapticsEnabled(Boolean(settings.hapticsEnabled));
  return settings;
}

export function clearStoredSettings() {
  try {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // Ignore
  }
  setHapticsEnabled(true);
}

// Hash 4-digit passcode safely across HTTP & HTTPS
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
  // Fallback deterministic multi-round hash when subtle crypto is unavailable
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
  if (!storedHash) return false;
  const computed = await hashPasscode(pin);
  return computed === storedHash;
}

// Check platform authenticator availability (Face ID / Touch ID / Windows Hello)
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
  if (!profileId || !isSupabaseConfigured || !supabase) {
    return local;
  }
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select(
        'plan_tier, haptics_enabled, biometric_lock_enabled, passcode_hash, notifications_enabled, private_account, autoplay_media, show_activity, show_badges, language'
      )
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error || !data) return local;

    const merged = {
      ...local,
      planTier: data.plan_tier || local.planTier,
      hapticsEnabled:
        typeof data.haptics_enabled === 'boolean'
          ? data.haptics_enabled
          : local.hapticsEnabled,
      biometricLockEnabled:
        typeof data.biometric_lock_enabled === 'boolean'
          ? data.biometric_lock_enabled
          : local.biometricLockEnabled,
      passcodeHash: data.passcode_hash || local.passcodeHash || '',
      notificationsEnabled:
        typeof data.notifications_enabled === 'boolean'
          ? data.notifications_enabled
          : local.notificationsEnabled,
      privateAccount:
        typeof data.private_account === 'boolean'
          ? data.private_account
          : local.privateAccount,
      autoplayMedia:
        typeof data.autoplay_media === 'boolean'
          ? data.autoplay_media
          : local.autoplayMedia,
      showActivity:
        typeof data.show_activity === 'boolean'
          ? data.show_activity
          : local.showActivity,
      showBadges:
        typeof data.show_badges === 'boolean'
          ? data.show_badges
          : local.showBadges,
      language: data.language || local.language,
    };
    writeLocalSettings(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveUserSettings(profileId, patch) {
  const next = { ...readLocalSettings(), ...patch };
  writeLocalSettings(next);

  if (!profileId || !isSupabaseConfigured || !supabase) {
    return next;
  }

  try {
    await supabase.from('user_settings').upsert(
      {
        profile_id: profileId,
        plan_tier: next.planTier,
        haptics_enabled: Boolean(next.hapticsEnabled),
        biometric_lock_enabled: Boolean(next.biometricLockEnabled),
        passcode_hash: next.passcodeHash || null,
        notifications_enabled: Boolean(next.notificationsEnabled),
        private_account: Boolean(next.privateAccount),
        autoplay_media: Boolean(next.autoplayMedia),
        show_activity: Boolean(next.showActivity),
        show_badges: Boolean(next.showBadges),
        language: next.language || 'English',
      },
      { onConflict: 'profile_id' }
    );
  } catch {
    // Keep local settings even when offline
  }

  return next;
}

export async function updateProfileDetailsInDb(
  profileId,
  { fullName, bio, avatarUrl, companyName, companyLogoUrl }
) {
  if (!profileId || !isSupabaseConfigured || !supabase) {
    return { ok: true };
  }
  try {
    const updatePayload = {};
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (bio !== undefined) updatePayload.bio = bio;
    if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;
    if (companyName !== undefined) updatePayload.company_name = companyName;
    if (companyLogoUrl !== undefined) {
      updatePayload.company_logo_url = companyLogoUrl;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', profileId);

    return { ok: !error, error: error?.message };
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
