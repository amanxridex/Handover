import {
  getServerSupabase,
  redisDeleteKeys,
  respondWithRedisCache,
} from './_lib/redisCache.js';

const FEED_CACHE_KEY = 'handover:feed:posts:v2';

function compactImageRef(raw, fallbackUrl) {
  if (!raw) return fallbackUrl || '';
  if (raw.length > 48000 && fallbackUrl) return fallbackUrl;
  return raw;
}

export default async function handler(req, res) {
  if (req.method === 'POST' || req.method === 'DELETE') {
    await redisDeleteKeys(FEED_CACHE_KEY, 'handover:feed:posts:v1');
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
              role,
              company_name
            )
          `
          )
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(25);

        if (error || !Array.isArray(data)) return [];
        return data.map((row) => {
          const authorAvatarEndpoint = row.author_id
            ? `/api/avatar?id=${row.author_id}&kind=avatar`
            : '';
          const authorLogoEndpoint = row.author_id
            ? `/api/avatar?id=${row.author_id}&kind=logo`
            : '';
          return {
            ...row,
            image_url: compactImageRef(
              row.image_url,
              `/api/avatar?id=${row.id}&kind=post`
            ),
            author_avatar_url: authorAvatarEndpoint || compactImageRef(row.author_avatar_url, ''),
            author_company_logo_url:
              authorLogoEndpoint || compactImageRef(row.author_company_logo_url, ''),
          };
        });
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'ERROR' });
  }
}
