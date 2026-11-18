import {
  getServerSupabase,
  redisDeleteKeys,
  respondWithRedisCache,
} from './_lib/redisCache.js';

const DEALS_CACHE_KEY = 'handover:deals:active:v1';

export default async function handler(req, res) {
  if (req.method === 'POST' || req.method === 'DELETE') {
    await redisDeleteKeys(DEALS_CACHE_KEY);
    return res.status(200).json({ ok: true, invalidated: DEALS_CACHE_KEY });
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
      key: DEALS_CACHE_KEY,
      ttlSeconds: 120,
      loader: async () => {
        const { data, error } = await supabase
          .from('brand_deals')
          .select(
            'id, creator_profile_id, brand_name, category, logo_key, brand_logo_url, payment_amount, payment_cents, currency, headline, subtitle, deliverables, min_requirements, brief, payout_terms, is_active, sort_order'
          )
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .order('sort_order', { ascending: true });

        if (error || !Array.isArray(data)) return [];
        return data.map((row) => ({
          ...row,
          brand_logo_url:
            row.brand_logo_url && row.brand_logo_url.length > 48000
              ? `/api/avatar?id=${row.id}&kind=deal`
              : row.brand_logo_url,
        }));
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'ERROR' });
  }
}
