import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getStoredSessionToken } from './profileService';
import { broadcastRealtimeEvent } from './realtimeService';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function formatMessageTime(iso) {
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

export async function fetchMyDirectThreads() {
  const token = getStoredSessionToken();
  if (!token || !isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('get_my_direct_threads', {
      p_session_token: token,
    });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      shortName: row.shortName || row.name?.split(' ')[0] || 'Member',
      name: row.name || 'Handover Member',
      username: row.username || '',
      avatar: row.avatar || '',
      preview: row.preview || '',
      time: formatThreadTime(row.lastAt),
      isDbThread: true,
      messages: [],
    }));
  } catch {
    return [];
  }
}

export async function fetchDirectMessages(peerId) {
  const token = getStoredSessionToken();
  if (!token || !isUuid(peerId) || !isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('get_direct_messages', {
      p_session_token: token,
      p_peer_id: peerId,
    });

    if (error || !data?.ok) {
      return null;
    }

    const peer = data.peer
      ? {
          id: data.peer.id,
          shortName:
            data.peer.shortName ||
            data.peer.name?.split(' ')[0] ||
            'Member',
          name: data.peer.name || 'Handover Member',
          username: data.peer.username || '',
          avatar: data.peer.avatar || '',
        }
      : null;

    const messages = Array.isArray(data.messages)
      ? data.messages.map((m) => ({
          id: m.id,
          from: m.from === 'me' ? 'me' : 'them',
          text: m.text,
          time: formatMessageTime(m.createdAt),
        }))
      : [];

    return { peer, messages };
  } catch {
    return null;
  }
}

export async function sendDirectMessage(recipientId, text) {
  const token = getStoredSessionToken();
  const cleanText = String(text || '').trim();
  if (!token || !isUuid(recipientId) || !cleanText || !isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Unable to send message right now.' };
  }

  try {
    const { data, error } = await supabase.rpc('send_direct_message', {
      p_session_token: token,
      p_recipient_id: recipientId,
      p_body: cleanText,
    });

    if (error || !data?.ok || !data?.message) {
      return {
        ok: false,
        error: data?.error || error?.message || 'Failed to send message.',
      };
    }

    broadcastRealtimeEvent(`dm:${recipientId}`, 'new_dm', {
      id: data.message.id,
      text: data.message.text,
      createdAt: data.message.createdAt,
    });

    return {
      ok: true,
      message: {
        id: data.message.id,
        from: 'me',
        text: data.message.text,
        time: formatMessageTime(data.message.createdAt),
      },
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
}
