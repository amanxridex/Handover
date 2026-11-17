import { isSupabaseConfigured, supabase } from '../lib/supabase';

const PROMPT_STATE_KEY = 'handover_notif_prompt_v1';
const SESSION_TOKEN_KEY = 'handover_session_token_v1';

let cachedVapidPublicKey = '';

function readSessionToken() {
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouchMac =
    navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return /iPad|iPhone|iPod/.test(ua) || isTouchMac;
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator?.standalone === true ||
    Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches)
  );
}

export function detectPushPlatform() {
  if (isIosDevice()) return isStandalonePwa() ? 'ios_pwa' : 'ios_safari';
  if (isAndroidDevice()) {
    return isStandalonePwa() ? 'android_pwa' : 'android_chrome';
  }
  return 'desktop_web';
}

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function needsIosHomeScreenInstall() {
  return isIosDevice() && !isStandalonePwa() && !isNotificationSupported();
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return window.Notification.permission || 'default';
}

export function getNotificationPromptState() {
  try {
    if (window.localStorage.getItem(PROMPT_STATE_KEY) === 'dismissed') {
      return { show: false, mode: null };
    }
  } catch {
    // Ignore storage error
  }

  if (needsIosHomeScreenInstall()) {
    return { show: true, mode: 'ios-install' };
  }

  if (isNotificationSupported() && getNotificationPermission() === 'default') {
    return { show: true, mode: 'permission' };
  }

  return { show: false, mode: null };
}

export function shouldShowNotificationPrompt() {
  return getNotificationPromptState().show;
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

async function fetchWebPushVapidKey() {
  if (cachedVapidPublicKey) return cachedVapidPublicKey;

  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) {
    cachedVapidPublicKey = envKey;
    return cachedVapidPublicKey;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.rpc('get_web_push_public_key');
      if (typeof data === 'string' && data.length > 20) {
        cachedVapidPublicKey = data;
        return cachedVapidPublicKey;
      }
    } catch {
      // Fallback to Edge Function bootstrap GET
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-push`);
        const json = await res.json();
        if (json?.publicKey) {
          cachedVapidPublicKey = json.publicKey;
          return cachedVapidPublicKey;
        }
      }
    } catch {
      // Ignore fetch errors
    }
  }

  return '';
}

async function getActiveServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      });
    }
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(reg), 3000)),
    ]);
    return readyReg || reg;
  } catch {
    return null;
  }
}

export async function syncDevicePushSubscription() {
  const token = readSessionToken();
  if (!token || !isSupabaseConfigured || !supabase) return;
  if (getNotificationPermission() !== 'granted') return;

  const platform = detectPushPlatform();
  let endpoint = `browser-notify:${platform}:${navigator.userAgent?.slice(0, 80) || 'web'}`;
  let p256dh = '';
  let auth = '';

  try {
    const vapidKey = await fetchWebPushVapidKey();
    const reg = await getActiveServiceWorkerRegistration();
    if (vapidKey && reg && 'PushManager' in window) {
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      const json = sub?.toJSON?.();
      if (json?.endpoint && json?.keys?.p256dh && json?.keys?.auth) {
        endpoint = json.endpoint;
        p256dh = json.keys.p256dh;
        auth = json.keys.auth;
      }
    }
  } catch {
    // Try clearing stale key mismatch subscription and re-subscribing once
    try {
      const vapidKey = await fetchWebPushVapidKey();
      const reg = await getActiveServiceWorkerRegistration();
      const existing = await reg?.pushManager?.getSubscription();
      if (existing && vapidKey) {
        await existing.unsubscribe();
        const fresh = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        const json = fresh?.toJSON?.();
        if (json?.endpoint) {
          endpoint = json.endpoint;
          p256dh = json.keys?.p256dh || '';
          auth = json.keys?.auth || '';
        }
      }
    } catch {
      // Browser Notification API remains active even if PushManager is restricted
    }
  }

  try {
    await supabase.rpc('save_push_subscription', {
      p_session_token: token,
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_platform: platform,
    });
  } catch {
    // Ignore DB sync error
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
        body: "You'll get instant priority alerts for likes, comments, follows, and messages.",
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
  const safeIcon =
    icon && !(icon.startsWith('data:') && icon.length > 8192)
      ? icon
      : '/icon-192.png';
  const safeTag = tag || `handover-${Date.now()}`;

  try {
    const reg = await getActiveServiceWorkerRegistration();
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

export function sendPriorityPushToRecipient({
  recipientId,
  kind = 'activity',
  title,
  body,
  url = '/notifications',
  tag,
  icon = '',
}) {
  const sessionToken = readSessionToken();
  if (!sessionToken || !recipientId || !isSupabaseConfigured || !supabase) {
    return;
  }

  // Keep payload small (<4KB limit for Apple APNs & FCM): only send HTTP(S) URLs
  const safeIcon =
    typeof icon === 'string' && icon.startsWith('http') ? icon : '/icon-192.png';

  try {
    Promise.resolve(
      supabase.functions.invoke('send-push', {
        body: {
          sessionToken,
          recipientId,
          kind,
          title: String(title || 'Handover').slice(0, 80),
          body: String(body || '').slice(0, 180),
          url: String(url || '/notifications'),
          tag: String(tag || `handover-${Date.now()}`),
          icon: safeIcon,
        },
      })
    ).catch(() => {});
  } catch {
    // Non-blocking background push
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
