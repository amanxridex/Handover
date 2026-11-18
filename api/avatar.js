import { getServerSupabase } from './_lib/redisCache.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#0b2875"/><circle cx="64" cy="48" r="22" fill="#60a5fa" opacity="0.88"/><path d="M26 108c6-20 22-30 38-30s32 10 38 30" fill="#60a5fa" opacity="0.88"/></svg>`;

function sendSvgFallback(res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(200).send(FALLBACK_SVG);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const id = String(req.query?.id || '').trim();
  const kind = String(req.query?.kind || 'avatar').trim().toLowerCase();
  const supabase = getServerSupabase();

  if (!id || !supabase) {
    return sendSvgFallback(res);
  }

  let rawValue = '';
  try {
    if (kind === 'post') {
      if (!UUID_RE.test(id)) return sendSvgFallback(res);
      const { data } = await supabase
        .from('posts')
        .select('image_url')
        .eq('id', id)
        .maybeSingle();
      rawValue = data?.image_url || '';
    } else if (kind === 'deal') {
      const { data } = await supabase
        .from('brand_deals')
        .select('brand_logo_url')
        .eq('id', id)
        .maybeSingle();
      rawValue = data?.brand_logo_url || '';
    } else {
      if (!UUID_RE.test(id)) return sendSvgFallback(res);
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, company_logo_url')
        .eq('id', id)
        .maybeSingle();
      if (kind === 'founder' || kind === 'logo') {
        rawValue = data?.company_logo_url || data?.avatar_url || '';
      } else {
        rawValue = data?.avatar_url || '';
      }
    }
  } catch {
    return sendSvgFallback(res);
  }

  if (!rawValue) {
    return sendSvgFallback(res);
  }

  if (/^https?:\/\//i.test(rawValue)) {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.redirect(302, rawValue);
  }

  const dataMatch = rawValue.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataMatch) {
    const contentType = dataMatch[1] || 'image/jpeg';
    const buf = Buffer.from(dataMatch[2], 'base64');
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
    );
    return res.status(200).send(buf);
  }

  return sendSvgFallback(res);
}
