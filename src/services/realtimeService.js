import { isSupabaseConfigured, supabase } from '../lib/supabase';

// Multiplexed listener registry so multiple screens (e.g. App + ChatScreen)
// can listen to the same channel topic without removing each other's socket.
const channelRegistry = new Map();

export function sanitizeRealtimeAvatar(avatar, profileId = '') {
  const val = String(avatar || '');
  if (val.startsWith('/api/avatar') || /^https?:\/\//i.test(val)) {
    return val;
  }
  if (val && val.length <= 2048) {
    return val;
  }
  if (profileId && import.meta.env.PROD) {
    return `/api/avatar?id=${profileId}&kind=avatar`;
  }
  return '';
}

function ensureSubscribedChannel(channelName) {
  let entry = channelRegistry.get(channelName);
  if (entry) return entry;

  const eventsMap = new Map();
  const channel = supabase.channel(channelName, {
    config: { broadcast: { ack: false, self: false } },
  });

  channel.on('broadcast', { event: '*' }, (packet) => {
    const ev = packet?.event;
    if (!ev) return;
    const set = eventsMap.get(ev);
    if (!set || set.size === 0) return;
    const payload = packet?.payload || {};
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch {
        // Isolate callback failures
      }
    }
  });

  channel.subscribe();
  entry = { channel, eventsMap };
  channelRegistry.set(channelName, entry);
  return entry;
}

export function subscribeRealtimeChannel(channelName, event, onMessage) {
  if (!channelName || !event || typeof onMessage !== 'function' || !isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const entry = ensureSubscribedChannel(channelName);
    let set = entry.eventsMap.get(event);
    if (!set) {
      set = new Set();
      entry.eventsMap.set(event, set);
    }
    set.add(onMessage);

    return () => {
      const current = channelRegistry.get(channelName);
      if (!current) return;
      const listeners = current.eventsMap.get(event);
      if (listeners) {
        listeners.delete(onMessage);
        if (listeners.size === 0) {
          current.eventsMap.delete(event);
        }
      }
      if (current.eventsMap.size === 0) {
        channelRegistry.delete(channelName);
        try {
          supabase.removeChannel(current.channel);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  } catch {
    return () => {};
  }
}

// Persistent transmitter channel pool for instant zero-latency broadcasts
const txChannelPool = new Map();

export async function broadcastRealtimeEvent(channelName, event, payload = {}) {
  if (!channelName || !event || !isSupabaseConfigured || !supabase) return;

  // 1. If this client already has an active listener channel for this topic, reuse it directly
  const listenerEntry = channelRegistry.get(channelName);
  if (listenerEntry?.channel) {
    try {
      listenerEntry.channel.send({
        type: 'broadcast',
        event,
        payload,
      });
      return;
    } catch {
      // Fall through to transmitter pool
    }
  }

  // 2. Persistent transmitter channel pool
  let txEntry = txChannelPool.get(channelName);
  if (!txEntry) {
    const queue = [];
    const tx = supabase.channel(`tx-${channelName}`, {
      config: { broadcast: { ack: false, self: false } },
    });

    txEntry = {
      channel: tx,
      isSubscribed: false,
      queue,
      idleTimer: null,
    };
    txChannelPool.set(channelName, txEntry);

    tx.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        txEntry.isSubscribed = true;
        // Flush all queued messages immediately in arrival order
        while (queue.length > 0) {
          const item = queue.shift();
          try {
            tx.send({
              type: 'broadcast',
              event: item.event,
              payload: item.payload,
            });
          } catch {
            // Isolate individual send errors
          }
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        txEntry.isSubscribed = false;
      }
    });
  }

  // Refresh idle keep-alive timer (keep alive for 5 minutes of reuse)
  if (txEntry.idleTimer) clearTimeout(txEntry.idleTimer);
  txEntry.idleTimer = setTimeout(() => {
    txChannelPool.delete(channelName);
    try {
      supabase.removeChannel(txEntry.channel);
    } catch {
      // Ignore
    }
  }, 5 * 60 * 1000);

  // If already subscribed, send immediately with 0ms delay!
  if (txEntry.isSubscribed) {
    try {
      txEntry.channel.send({
        type: 'broadcast',
        event,
        payload,
      });
      return;
    } catch {
      // Fallback: enqueue
    }
  }

  // If currently joining/subscribing, enqueue to flush upon SUBSCRIBED
  txEntry.queue.push({ event, payload });
}
