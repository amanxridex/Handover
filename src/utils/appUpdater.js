/* global __APP_BUILD_VERSION__ */

let reloadScheduled = false;

async function forceCleanReload() {
  if (reloadScheduled) return true;
  reloadScheduled = true;

  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
  } catch {
    // Ignore cache clear failure
  }

  window.location.reload();
  return true;
}

export async function checkAndApplyAppUpdate() {
  if (!import.meta.env.PROD || typeof window === 'undefined') {
    return false;
  }

  try {
    const swTask =
      'serviceWorker' in navigator
        ? navigator.serviceWorker
            .getRegistration()
            .then(async (reg) => {
              if (!reg) return false;
              await Promise.race([
                reg.update().catch(() => {}),
                new Promise((resolve) => setTimeout(resolve, 1600)),
              ]);
              if (reg.waiting) {
                reg.waiting.postMessage('SKIP_WAITING');
                return true;
              }
              return false;
            })
            .catch(() => false)
        : Promise.resolve(false);

    const versionTask = fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const remoteVer = String(data?.version || '');
        const localVer =
          typeof __APP_BUILD_VERSION__ !== 'undefined'
            ? String(__APP_BUILD_VERSION__)
            : '';
        return Boolean(remoteVer && localVer && remoteVer !== localVer);
      })
      .catch(() => false);

    const [swHasUpdate, versionChanged] = await Promise.all([
      swTask,
      versionTask,
    ]);

    if (versionChanged || swHasUpdate) {
      await forceCleanReload();
      return true;
    }
  } catch {
    // Ignore network/offline errors on pull-to-refresh
  }

  return false;
}
