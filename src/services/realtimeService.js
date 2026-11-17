import { isSupabaseConfigured, supabase } from '../lib/supabase';

// Multiplexed listener registry so multiple screens (e.g. App + ChatScreen)
// can listen to the same channel topic without removing each other's socket.
const channelRegistry = new Map();

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

export async function broadcastRealtimeEvent(channelName, event, payload = {}) {
  if (!channelName || !event || !isSupabaseConfigured || !supabase) return;

  try {
    // Fast HTTP 202 broadcast directly into Realtime cluster (no WS join latency)
    const activeEntry = channelRegistry.get(channelName);
    const targetChannel = activeEntry?.channel || supabase.channel(channelName);
    if (typeof targetChannel.httpSend === 'function') {
      const res = await targetChannel.httpSend(event, payload);
      if (res?.success !== false) {
        return;
      }
    }
  } catch {
    // Fall through to ephemeral WebSocket broadcast
  }

  try {
    const channel = supabase.channel(`tx:${channelName}:${Date.now()}`);
    // Note: tx uses target channelName so listeners on channelName receive it
    try {
      supabase.removeChannel(channel);
    } catch {
      // Ignore
    }

    const tx = supabase.channel(channelName);
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      if (!channelRegistry.has(channelName)) {
        try {
          supabase.removeChannel(tx);
        } catch {
          // Ignore
        }
      }
    };
    const timer = setTimeout(cleanup, 3000);

    tx.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        Promise.resolve(
          tx.send({
            type: 'broadcast',
            event,
            payload,
          })
        ).finally(() => {
          clearTimeout(timer);
          setTimeout(cleanup, 200);
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        cleanup();
      }
    });
  } catch {
    // Polling & Web Push still deliver reliably
  }
}
