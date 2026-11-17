import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getStoredSessionToken } from './profileService';

const PROMPT_STATE_KEY = 'handover_notif_prompt_v1';

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return window.Notification.permission || 'default';
}

export function shouldShowNotificationPrompt() {
  if (!isNotificationSupported()) return false;
  if (getNotificationPermission() !== 'default') return false;
  try {
    return window.localStorage.getItem(PROMPT_STATE_KEY) !== 'dismissed';
  } catch {
    return true;
  }
}

export function dismissNotificationPrompt() {
  try {
    window.localStorage.setItem(PROMPT_STATE_KEY, 'dismissed');
  } catch {
    // Ignore storage errors
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function syncDevicePushSubscription() {
  const token = getStoredSessionToken();
  if (!token || !isSupabaseConfigured || !supabase) return;
  if (getNotificationPermission() !== 'granted') return;

  let endpoint = `browser-notify:${navigator.userAgent?.slice(0, 120) || 'web'}`;
  let p256dh = '';
  let auth = '';

  try {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (vapidKey && 'serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.pushManager) {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }
        const json = sub.toJSON();
        if (json?.endpoint) {
          endpoint = json.endpoint;
          p256dh = json.keys?.p256dh || '';
          auth = json.keys?.auth || '';
        }
      }
    }
  } catch {
    // Web Push optional when VAPID key is absent; browser Notification API still active
  }

  try {
    await supabase.rpc('save_push_subscription', {
      p_session_token: token,
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
    });
  } catch {
    // Ignore DB sync failure
  }
}

export async function requestNotificationPermissionAndRegister({
  sendWelcome = true,
} = {}) {
  if (!isNotificationSupported()) return 'unsupported';

  let permission = getNotificationPermission();
  if (permission === 'default') {
    try {
      permission = await window.Notification.requestPermission();
    } catch {
      permission = getNotificationPermission();
    }
  }

  try {
    if (permission === 'granted') {
      window.localStorage.setItem(PROMPT_STATE_KEY, 'granted');
    } else if (permission === 'denied') {
      window.localStorage.setItem(PROMPT_STATE_KEY, 'dismissed');
    }
  } catch {
    // Ignore storage error
  }

  if (permission === 'granted') {
    await syncDevicePushSubscription();
    if (sendWelcome) {
      await sendOsNotification({
        title: 'Notifications enabled',
        body: "You'll get instant alerts for likes, comments, follows, and messages.",
        tag: 'handover-welcome',
        url: '/notifications',
      });
    }
  }

  return permission;
}

export async function sendOsNotification({
  title,
  body,
  icon = '/icon-192.png',
  tag,
  url = '/notifications',
  onFallbackClick,
}) {
  if (getNotificationPermission() !== 'granted') return false;

  const safeTitle = String(title || 'Handover');
  const safeBody = String(body || '');
  const safeIcon = icon || '/icon-192.png';
  const safeTag = tag || `handover-${Date.now()}`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(safeTitle, {
          body: safeBody,
          icon: safeIcon,
          badge: '/icon-192.png',
          tag: safeTag,
          renotify: true,
          vibrate: [120, 60, 120],
          data: { url },
        });
        return true;
      }
    }
  } catch {
    // Fall back to direct Notification constructor
  }

  try {
    const notif = new window.Notification(safeTitle, {
      body: safeBody,
      icon: safeIcon,
      tag: safeTag,
    });
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignore
      }
      onFallbackClick?.(url);
      notif.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function buildActivityAlert(item) {
  if (!item) return null;
  const actor = item.actor || 'Someone';

  if (item.type === 'follow') {
    return {
      id: `notif-${item.id}`,
      kind: 'follow',
      label: 'New Follower',
      title: actor,
      body: 'started following you',
      avatar: item.avatar || '',
      url: '/notifications',
      tag: `follow-${item.actorId || item.id}`,
    };
  }

  if (item.type === 'like') {
    return {
      id: `notif-${item.id}`,
      kind: 'like',
      label: 'New Like',
      title: actor,
      body: item.postTitle
        ? `liked "${item.postTitle}"`
        : 'liked your post',
      avatar: item.avatar || '',
      url: '/notifications',
      tag: `like-${item.postId || item.id}`,
    };
  }

  return {
    id: `notif-${item.id}`,
    kind: 'comment',
    label: 'New Comment',
    title: actor,
    body: item.comment
      ? `commented: "${item.comment}"`
      : 'commented on your post',
    avatar: item.avatar || '',
    url: '/notifications',
    tag: `comment-${item.postId || item.id}`,
  };
}

export function buildDmAlert(thread) {
  if (!thread?.id || !thread?.lastMessageId) return null;
  return {
    id: `dm-${thread.lastMessageId}`,
    kind: 'message',
    label: 'Message',
    title: thread.name || 'New Message',
    body: thread.preview || 'Sent you a message',
    avatar: thread.avatar || '',
    peer: thread,
    url: `/chat/${thread.id}`,
    tag: `dm-${thread.id}`,
  };
}
