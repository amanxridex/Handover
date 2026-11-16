import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

const HAPTICS_PREF_KEY = 'handover_haptics_enabled_v1';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export function getHapticsEnabled() {
  try {
    const raw = window.localStorage.getItem(HAPTICS_PREF_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled) {
  try {
    window.localStorage.setItem(HAPTICS_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

export async function initNativeShell() {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Ignore when StatusBar plugin is unavailable on web/desktop
  }
}

export async function triggerLightHaptic(force = false) {
  if (!force && !getHapticsEnabled()) return;
  if (!isNativePlatform()) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    return;
  }
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics unsupported on device
  }
}

export async function triggerMediumHaptic(force = false) {
  if (!force && !getHapticsEnabled()) return;
  if (!isNativePlatform()) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(18);
    }
    return;
  }
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // Haptics unsupported on device
  }
}

export async function triggerSuccessHaptic(force = false) {
  if (!force && !getHapticsEnabled()) return;
  if (!isNativePlatform()) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([12, 30, 18]);
    }
    return;
  }
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Haptics unsupported on device
  }
}
