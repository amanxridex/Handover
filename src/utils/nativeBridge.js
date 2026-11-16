import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export async function initNativeShell() {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Ignore when StatusBar plugin is unavailable on web/desktop
  }
}

export async function triggerLightHaptic() {
  if (!isNativePlatform()) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
    return;
  }
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics unsupported on device
  }
}

