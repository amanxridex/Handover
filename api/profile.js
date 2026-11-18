import {
  getServerSupabase,
  redisDeleteKeys,
  respondWithRedisCache,
} from './_lib/redisCache.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildProfileCacheKey(profileId, username) {
  const cleanId = UUID_RE.test(String(profileId || '')) ? String(profileId) : '';
  const cleanUser = String(username || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
  return `handover:profile:overview:v1:${cleanId || cleanUser || 'unknown'}`;
}

export default async function handler(req, res) {
  if (req.method === 'POST' || req.method === 'DELETE') {
    const body = typeof req.body === 'object' ? req.body : {};
    const keys = [
      body.id ? buildProfileCacheKey(body.id, '') : null,
      body.username ? buildProfileCacheKey('', body.username) : null,
    ].filter(Boolean);
    if (keys.length) await redisDeleteKeys(keys);
    return res.status(200).json({ ok: true, invalidated: keys });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const profileId = String(req.query?.id || '').trim();
  const cleanUsername = String(req.query?.username || '')
    .trim()
    .replace(/^@+/, '');
  const hasId = UUID_RE.test(profileId);

  if (!hasId && !cleanUsername) {
    return res.status(400).json({ ok: false, error: 'MISSING_PROFILE_KEY' });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }

  const cacheKey = buildProfileCacheKey(hasId ? profileId : '', cleanUsername);

  try {
    return await respondWithRedisCache(req, res, {
      key: cacheKey,
      ttlSeconds: 60,
      loader: async () => {
        let postsQuery = supabase
          .from('posts')
          .select('id, headline, image_url, category, likes_count, created_at')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        if (hasId && cleanUsername) {
          postsQuery = postsQuery.or(
            `author_id.eq.${profileId},author_username.ilike.${cleanUsername}`
          );
        } else if (hasId) {
          postsQuery = postsQuery.eq('author_id', profileId);
        } else {
          postsQuery = postsQuery.ilike('author_username', cleanUsername);
        }

        const followersPromise = hasId
          ? supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', profileId)
          : Promise.resolve({ count: 0 });

        const followingPromise = hasId
          ? supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('follower_id', profileId)
          : Promise.resolve({ count: 0 });

        const [postsRes, followersRes, followingRes] = await Promise.all([
          postsQuery,
          followersPromise,
          followingPromise,
        ]);

        const rawPosts = Array.isArray(postsRes.data) ? postsRes.data : [];
        const posts = rawPosts.map((row) => ({
          ...row,
          image_url:
            row.image_url && row.image_url.length > 48000
              ? `/api/avatar?id=${row.id}&kind=post`
              : row.image_url || '',
        }));
        return {
          posts,
          followersCount: followersRes.count || 0,
          followingCount: followingRes.count || 0,
          postsCount: posts.length,
        };
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'ERROR' });
  }
}
