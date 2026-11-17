import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

let cachedRedis = undefined;
let cachedSupabase = undefined;

export function getRedisClient() {
  if (cachedRedis !== undefined) return cachedRedis;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    '';
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    '';

  if (!url || !token) {
    cachedRedis = null;
    return null;
  }

  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

export function getServerSupabase() {
  if (cachedSupabase !== undefined) return cachedSupabase;

  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!url || !key) {
    cachedSupabase = null;
    return null;
  }

  cachedSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedSupabase;
}

export async function redisGetJson(key) {
  const redis = getRedisClient();
  if (!redis || !key) return null;
  try {
    const val = await redis.get(key);
    if (val === null || val === undefined) return null;
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return null;
  }
}

export async function redisSetJson(key, value, ttlSeconds = 60) {
  const redis = getRedisClient();
  if (!redis || !key) return false;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

export async function redisDeleteKeys(...keys) {
  const redis = getRedisClient();
  const cleanKeys = keys.flat().filter(Boolean);
  if (!redis || cleanKeys.length === 0) return 0;
  try {
    return await redis.del(...cleanKeys);
  } catch {
    return 0;
  }
}

export async function respondWithRedisCache(
  req,
  res,
  { key, ttlSeconds = 60, loader }
) {
  const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true';
  const hasRedis = Boolean(getRedisClient());

  if (!forceRefresh && hasRedis) {
    const cached = await redisGetJson(key);
    if (cached !== null) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader(
        'Cache-Control',
        'public, max-age=10, s-maxage=20, stale-while-revalidate=60'
      );
      return res.status(200).json({ ok: true, cache: 'HIT', data: cached });
    }
  }

  const data = await loader();
  if (data !== null && data !== undefined && hasRedis) {
    await redisSetJson(key, data, ttlSeconds);
  }

  res.setHeader('X-Cache', hasRedis ? 'MISS' : 'BYPASS');
  res.setHeader(
    'Cache-Control',
    forceRefresh
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=10, s-maxage=20, stale-while-revalidate=60'
  );
  return res
    .status(200)
    .json({ ok: true, cache: hasRedis ? 'MISS' : 'BYPASS', data });
}
