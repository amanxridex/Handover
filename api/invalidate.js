import { redisDeleteKeys } from './_lib/redisCache.js';

const TAG_MAP = {
  feed: 'handover:feed:posts:v1',
  deals: 'handover:deals:active:v1',
  founders: 'handover:founders:directory:v1',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const keysToDelete = [];

    for (const tag of tags) {
      if (TAG_MAP[tag]) {
        keysToDelete.push(TAG_MAP[tag]);
      } else if (typeof tag === 'string' && tag.startsWith('profile:')) {
        const suffix = tag.slice('profile:'.length).trim().toLowerCase();
        if (suffix) {
          keysToDelete.push(`handover:profile:overview:v1:${suffix}`);
        }
      }
    }

    if (keysToDelete.length > 0) {
      await redisDeleteKeys(keysToDelete);
    }

    return res.status(200).json({ ok: true, deleted: keysToDelete.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'ERROR' });
  }
}
