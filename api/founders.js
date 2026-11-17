import {
  getServerSupabase,
  redisDeleteKeys,
  respondWithRedisCache,
} from './_lib/redisCache.js';

const FOUNDERS_CACHE_KEY = 'handover:founders:directory:v1';

export default async function handler(req, res) {
  if (req.method === 'POST' || req.method === 'DELETE') {
    await redisDeleteKeys(FOUNDERS_CACHE_KEY);
    return res.status(200).json({ ok: true, invalidated: FOUNDERS_CACHE_KEY });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }

  try {
    return await respondWithRedisCache(req, res, {
      key: FOUNDERS_CACHE_KEY,
      ttlSeconds: 120,
      loader: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, full_name, username, avatar_url, role, company_name, company_logo_url, company_pitch, sector, website_url, instagram_handle, created_at'
          )
          .eq('role', 'founder')
          .eq('onboarding_completed', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error || !Array.isArray(data)) return [];
        return data;
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'ERROR' });
  }
}
