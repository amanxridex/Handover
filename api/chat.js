import crypto from 'node:crypto';
import {
  getServerSupabase,
  redisDeleteKeys,
  redisGetJson,
  redisSetJson,
  respondWithRedisCache,
} from './_lib/redisCache.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function compactAvatar(rawAvatar, profileId) {
  if (!profileId || !UUID_RE.test(profileId)) return rawAvatar || '';
  if (!rawAvatar || rawAvatar.length > 16000) {
    return `/api/avatar?id=${profileId}&kind=avatar`;
  }
  return rawAvatar;
}

function getThreadPairKey(idA, idB) {
  const sorted = [String(idA), String(idB)].sort();
  return `handover:dm:thread:v1:${sorted[0]}:${sorted[1]}`;
}

function extractSessionToken(req) {
  const authHeader = String(req.headers?.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return String(req.headers?.['x-session-token'] || '').trim();
}

async function resolveSessionActor(supabase, sessionToken) {
  if (!sessionToken) return null;
  const tokenHash = crypto
    .createHash('sha256')
    .update(sessionToken)
    .digest('hex')
    .slice(0, 24);
  const sessKey = `handover:sess:v1:${tokenHash}`;
  const cached = await redisGetJson(sessKey);
  if (cached?.id) return cached;

  const { data } = await supabase.rpc('get_session_actor_summary', {
    p_session_token: sessionToken,
  });
  if (data?.id) {
    await redisSetJson(sessKey, data, 120);
    return data;
  }
  return null;
}

export default async function handler(req, res) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }

  const sessionToken = extractSessionToken(req);
  const actor = await resolveSessionActor(supabase, sessionToken);
  if (!actor?.id) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const recipientId = String(body.recipientId || '').trim();
    const messageBody = String(body.body || '').trim();

    if (!UUID_RE.test(recipientId) || !messageBody) {
      return res.status(400).json({ ok: false, error: 'INVALID_MESSAGE' });
    }

    const { data, error } = await supabase.rpc('send_direct_message', {
      p_session_token: sessionToken,
      p_recipient_id: recipientId,
      p_body: messageBody,
    });

    if (error || !data?.ok || !data?.message) {
      return res.status(400).json({
        ok: false,
        error: data?.error || error?.message || 'SEND_FAILED',
      });
    }

    await redisDeleteKeys(
      `handover:dm:threads:v1:${actor.id}`,
      `handover:dm:threads:v1:${recipientId}`,
      getThreadPairKey(actor.id, recipientId)
    );

    return res.status(200).json({
      ok: true,
      message: data.message,
      senderId: actor.id,
      senderName: actor.name || actor.username || 'New Message',
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const mode = String(req.query?.mode || 'threads').trim();
  const peerId = String(req.query?.peerId || '').trim();

  if (mode === 'messages') {
    if (!UUID_RE.test(peerId)) {
      return res.status(400).json({ ok: false, error: 'INVALID_PEER' });
    }

    return respondWithRedisCache(req, res, {
      key: getThreadPairKey(actor.id, peerId),
      ttlSeconds: 15,
      loader: async () => {
        const { data, error } = await supabase.rpc('get_direct_messages', {
          p_session_token: sessionToken,
          p_peer_id: peerId,
        });
        if (error || !data?.ok) return null;
        return {
          ...data,
          peer: data.peer
            ? {
                ...data.peer,
                avatar: compactAvatar(data.peer.avatar, data.peer.id),
              }
            : null,
        };
      },
    });
  }

  return respondWithRedisCache(req, res, {
    key: `handover:dm:threads:v1:${actor.id}`,
    ttlSeconds: 20,
    loader: async () => {
      const { data, error } = await supabase.rpc('get_my_direct_threads', {
        p_session_token: sessionToken,
      });
      if (error || !Array.isArray(data)) return [];
      return data.map((row) => ({
        ...row,
        avatar: compactAvatar(row.avatar, row.id),
      }));
    },
  });
}
