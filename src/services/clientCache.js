const memoryCache = new Map();
const inFlightRequests = new Map();

const SESSION_PREFIX = 'handover_swr_v1:';

export function getCachedValue(key, maxAgeMs = Infinity) {
  if (!key) return null;

  let entry = memoryCache.get(key);
  if (!entry) {
    try {
      const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
      if (raw) {
        entry = JSON.parse(raw);
        if (entry && typeof entry === 'object') {
          memoryCache.set(key, entry);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  if (!entry || entry.value === undefined) return null;
  if (Number.isFinite(maxAgeMs) && Date.now() - (entry.ts || 0) > maxAgeMs) {
    return null;
  }
  return entry.value;
}

export function isCacheFresh(key, maxAgeMs = 45000) {
  return getCachedValue(key, maxAgeMs) !== null;
}

export function setCachedValue(key, value) {
  if (!key) return;
  const entry = { ts: Date.now(), value };
  memoryCache.set(key, entry);
  try {
    window.sessionStorage.setItem(
      `${SESSION_PREFIX}${key}`,
      JSON.stringify(entry)
    );
  } catch {
    // Ignore storage quota errors (memoryCache still stays warm)
  }
}

export function invalidateCachePrefix(prefix) {
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const storageKey = window.sessionStorage.key(i);
      if (storageKey && storageKey.startsWith(`${SESSION_PREFIX}${prefix}`)) {
        window.sessionStorage.removeItem(storageKey);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export async function withSwrCache(
  key,
  fetcher,
  { ttlMs = 45000, force = false } = {}
) {
  if (!force) {
    const fresh = getCachedValue(key, ttlMs);
    if (fresh !== null) {
      return fresh;
    }
  }

  const existingPromise = inFlightRequests.get(key);
  if (existingPromise && !force) {
    return existingPromise;
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((result) => {
      if (result !== null && result !== undefined) {
        setCachedValue(key, result);
      }
      return result;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === promise) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, promise);
  return promise;
}

export async function fetchRedisEndpoint(path, { force = false } = {}) {
  if (typeof window === 'undefined') return null;
  // In local vite dev without Vercel functions, skip straight to Supabase fallback
  if (!import.meta.env.PROD) return null;

  try {
    const sep = path.includes('?') ? '&' : '?';
    const url = force ? `${path}${sep}refresh=1` : path;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: force ? 'no-store' : 'default',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    const json = await res.json();
    if (!json?.ok || json.data === undefined) return null;
    return json.data;
  } catch {
    return null;
  }
}

export function invalidateServerRedisTags(tags = []) {
  if (
    typeof window === 'undefined' ||
    !import.meta.env.PROD ||
    !Array.isArray(tags) ||
    tags.length === 0
  ) {
    return;
  }

  try {
    Promise.resolve(
      fetch('/api/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      })
    ).catch(() => {});
  } catch {
    // Non-blocking invalidation
  }
}
