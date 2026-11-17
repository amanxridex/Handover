import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function broadcastRealtimeEvent(channelName, event, payload = {}) {
  if (!channelName || !event || !isSupabaseConfigured || !supabase) return;
  try {
    const channel = supabase.channel(channelName);
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try {
        supabase.removeChannel(channel);
      } catch {
        // Ignore cleanup failure
      }
    };
    const timer = setTimeout(cleanup, 3500);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        Promise.resolve(
          channel.send({
            type: 'broadcast',
            event,
            payload,
          })
        ).finally(() => {
          clearTimeout(timer);
          setTimeout(cleanup, 250);
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        cleanup();
      }
    });
  } catch {
    // Ignore broadcast errors; polling fallback still keeps DB in sync
  }
}

export function subscribeRealtimeChannel(channelName, event, onMessage) {
  if (!channelName || !event || !isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event }, (msg) => {
        onMessage?.(msg?.payload || {});
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Ignore cleanup failure
      }
    };
  } catch {
    return () => {};
  }
}
