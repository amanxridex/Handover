import {
  getServerSupabase,
  redisDeleteKeys,
  respondWithRedisCache,
} from './_lib/redisCache.js';

const FEED_CACHE_KEY = 'handover:feed:posts:v1';

export default async function handler(req, res) {
  if (req.method === 'POST' || req.method === 'DELETE') {
    await redisDeleteKeys(FEED_CACHE_KEY);
    return res.status(200).json({ ok: true, invalidated: FEED_CACHE_KEY });
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
      key: FEED_CACHE_KEY,
      ttlSeconds: 60,
      loader: async () => {
        const { data, error } = await supabase
          .from('posts')
          .select(
            `
            id,
            author_id,
            headline,
            image_url,
            likes_count,
            created_at,
            author_name,
            author_username,
            author_avatar_url,
            author_role,
            author_company_name,
            author_company_logo_url,
            author:profiles (
              id,
              full_name,
              username,
              avatar_url,
              role,
              company_name,
              company_logo_url
            )
          `
          )
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(25);

        if (error || !Array.isArray(data)) return [];
        return data;
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'ERROR' });
  }
}
