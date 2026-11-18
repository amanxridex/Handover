import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  getCachedValue,
  invalidateCachePrefix,
  setCachedValue,
  withSwrCache,
} from './clientCache';
import { sendPriorityPushToRecipient } from './nativeNotifySender';
import { getStoredOnboardingState, getStoredSessionToken } from './profileService';
import {
  broadcastRealtimeEvent,
  sanitizeRealtimeAvatar,
} from './realtimeService';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export function formatMessageTime(iso) {
  if (!iso) return 'Just Now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just Now';
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatThreadTime(iso) {
  if (!iso) return 'Just Now';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'Just Now';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'Just Now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return formatMessageTime(iso);
  return 'Yesterday';
}

function compactChatAvatar(rawAvatar, id) {
  const val = String(rawAvatar || '');
  if (import.meta.env.PROD && id && isUuid(id) && (!val || val.length > 16000)) {
    return `/api/avatar?id=${id}&kind=avatar`;
  }
  return val;
}

function mapThreadRow(row) {
  return {
    id: row.id,
    shortName: row.shortName || row.name?.split(' ')[0] || 'Member',
    name: row.name || 'Handover Member',
    username: row.username || '',
    avatar: compactChatAvatar(row.avatar, row.id),
    preview: row.preview || '',
    lastAt: row.lastAt || null,
    lastMessageId: row.lastMessageId || '',
    lastSenderId: row.lastSenderId || '',
    time: formatThreadTime(row.lastAt),
    isDbThread: true,
    messages: [],
  };
}

function mapDirectMessagesPayload(data) {
  const peer = data.peer
    ? {
        id: data.peer.id,
        shortName:
          data.peer.shortName ||
          data.peer.name?.split(' ')[0] ||
          'Member',
        name: data.peer.name || 'Handover Member',
        username: data.peer.username || '',
        avatar: compactChatAvatar(data.peer.avatar, data.peer.id),
      }
    : null;

  const messages = Array.isArray(data.messages)
    ? data.messages.map((m) => ({
        id: m.id,
        from: m.from === 'me' ? 'me' : 'them',
        text: m.text,
        createdAt: m.createdAt || null,
        time: formatMessageTime(m.createdAt),
      }))
    : [];

  return { peer, messages };
}

async function fetchChatApi(path, token, { force = false } = {}) {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !token) {
    return null;
  }
  try {
    const sep = path.includes('?') ? '&' : '?';
    const url = force ? `${path}${sep}refresh=1` : path;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: force ? 'no-store' : 'default',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    const json = await res.json();
    return json?.ok && json.data !== undefined ? json.data : null;
  } catch {
    return null;
  }
}

export function getCachedDirectThreads() {
  const cached = getCachedValue('chat:threads');
  return Array.isArray(cached) ? cached : null;
}

export function getCachedDirectMessages(peerId) {
  if (!isUuid(peerId)) return null;
  return getCachedValue(`chat:thread:${peerId}`);
}

export async function fetchMyDirectThreads({ force = false } = {}) {
  const token = getStoredSessionToken();
  if (!token || !isSupabaseConfigured || !supabase) {
    return [];
  }

  return withSwrCache(
    'chat:threads',
    async () => {
      const apiRows = await fetchChatApi('/api/chat?mode=threads', token, {
        force,
      });
      if (Array.isArray(apiRows)) {
        return apiRows.map(mapThreadRow);
      }

      try {
        const { data, error } = await supabase.rpc('get_my_direct_threads', {
          p_session_token: token,
        });
        if (error || !Array.isArray(data)) {
          return [];
        }
        return data.map(mapThreadRow);
      } catch {
        return [];
      }
    },
    { ttlMs: 12000, force }
  );
}

export async function fetchDirectMessages(peerId, { force = false } = {}) {
  const token = getStoredSessionToken();
  if (!token || !isUuid(peerId) || !isSupabaseConfigured || !supabase) {
    return null;
  }

  return withSwrCache(
    `chat:thread:${peerId}`,
    async () => {
      const apiData = await fetchChatApi(
        `/api/chat?mode=messages&peerId=${encodeURIComponent(peerId)}`,
        token,
        { force }
      );
      if (apiData?.ok) {
        return mapDirectMessagesPayload(apiData);
      }

      try {
        const { data, error } = await supabase.rpc('get_direct_messages', {
          p_session_token: token,
          p_peer_id: peerId,
        });
        if (error || !data?.ok) {
          return null;
        }
        return mapDirectMessagesPayload(data);
      } catch {
        return null;
      }
    },
    { ttlMs: 10000, force }
  );
}

async function attemptSendMessage(token, recipientId, cleanText) {
  // Direct PostgreSQL RPC over active Supabase connection (fastest path)
  try {
    const { data, error } = await supabase.rpc('send_direct_message', {
      p_session_token: token,
      p_recipient_id: recipientId,
      p_body: cleanText,
    });

    if (!error && data?.ok && data?.message) {
      return { ok: true, message: data.message };
    }

    if (data?.error === 'UNAUTHORIZED' || data?.error === 'INVALID_MESSAGE') {
      return {
        ok: false,
        fatal: true,
        error: data.error,
      };
    }
  } catch {
    // Fall back to serverless API route if direct RPC encounters network transport fault
  }

  // Fallback to serverless API endpoint
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId, body: cleanText }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && json?.message) {
          return { ok: true, message: json.message };
        }
      }
      if (res.status === 401 || res.status === 400) {
        const errJson = await res.json().catch(() => ({}));
        return {
          ok: false,
          fatal: res.status === 401,
          error: errJson?.error || 'Failed to send message.',
        };
      }
    } catch {
      // Both routes failed
    }
  }

  return {
    ok: false,
    fatal: false,
    error: 'Could not send message. Tap to retry.',
  };
}

export async function sendDirectMessage(recipientId, text) {
  const token = getStoredSessionToken();
  const cleanText = String(text || '').trim();
  if (
    !token ||
    !isUuid(recipientId) ||
    !cleanText ||
    !isSupabaseConfigured ||
    !supabase
  ) {
    return { ok: false, error: 'Unable to send message right now.' };
  }

  const actor = getStoredOnboardingState();
  const senderId = actor?.id || actor?.profileId || '';
  const senderName =
    actor?.setupData?.name || actor?.setupData?.username || 'New Message';
  const safeRealtimeAvatar = sanitizeRealtimeAvatar(
    actor?.setupData?.avatar || '',
    senderId
  );
  const optimisticId = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  // 1. INSTANT PARALLEL REALTIME BROADCAST:
  // Dispatches to recipient within ~10ms without waiting for DB roundtrip
  broadcastRealtimeEvent(`dm:${recipientId}`, 'new_dm', {
    id: optimisticId,
    senderId,
    senderName,
    senderAvatar: safeRealtimeAvatar,
    text: cleanText,
    createdAt: nowIso,
  });

  try {
    let result = await attemptSendMessage(token, recipientId, cleanText);
    if (!result.ok && !result.fatal) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      result = await attemptSendMessage(token, recipientId, cleanText);
    }

    if (!result.ok || !result.message) {
      return {
        ok: false,
        error: result.error || 'Could not send message. Tap to retry.',
      };
    }

    const savedMsg = {
      id: result.message.id,
      from: 'me',
      text: result.message.text,
      createdAt: result.message.createdAt || nowIso,
      time: formatMessageTime(result.message.createdAt || nowIso),
    };

    // If confirmed ID is different from optimistic broadcast, send confirmed ID sync
    if (savedMsg.id !== optimisticId) {
      broadcastRealtimeEvent(`dm:${recipientId}`, 'new_dm', {
        id: savedMsg.id,
        senderId,
        senderName,
        senderAvatar: safeRealtimeAvatar,
        text: savedMsg.text,
        createdAt: savedMsg.createdAt,
      });
    }

    // Invalidate local and server caches asynchronously
    invalidateCachePrefix(`chat:thread:${recipientId}`);
    invalidateCachePrefix('chat:threads');

    // Trigger push notification to recipient's phone / background service worker
    sendPriorityPushToRecipient({
      recipientId,
      kind: 'dm',
      title: senderName,
      body: savedMsg.text,
      url: senderId ? `/chat/${senderId}` : '/chat',
      tag: senderId ? `dm-${senderId}` : `dm-${recipientId}`,
      icon: safeRealtimeAvatar,
    });

    return { ok: true, message: savedMsg };
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error. Tap to retry.' };
  }
}
