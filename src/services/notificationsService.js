import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { sendPriorityPushToRecipient } from './nativeNotifySender';
import { getStoredOnboardingState, getStoredSessionToken } from './profileService';
import {
  broadcastRealtimeEvent,
  subscribeRealtimeChannel,
} from './realtimeService';

export { broadcastRealtimeEvent, subscribeRealtimeChannel };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function formatNotificationTime(iso) {
  if (!iso) return 'Just now';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function fetchMyNotifications() {
  const token = getStoredSessionToken();
  if (!token || !isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('get_my_notifications', {
      p_session_token: token,
    });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      type: row.type,
      actorId: row.actorId || '',
      actor: row.actor || 'Handover Member',
      actorUsername: row.actorUsername || '',
      avatar: row.avatar || '',
      postId: row.postId || null,
      postTitle: row.postTitle || '',
      postThumb: row.postThumb || '',
      comment: row.comment || '',
      unread: Boolean(row.unread),
      followingBack: Boolean(row.followingBack),
      time: formatNotificationTime(row.createdAt),
      createdAt: row.createdAt || null,
    }));
  } catch {
    return [];
  }
}

export async function markNotificationReadInDb(notificationId) {
  const token = getStoredSessionToken();
  if (!token || !isUuid(notificationId) || !isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('mark_notifications_read', {
      p_session_token: token,
      p_notification_id: notificationId,
    });
    return !error && Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function markAllNotificationsReadInDb() {
  const token = getStoredSessionToken();
  if (!token || !isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('mark_notifications_read', {
      p_session_token: token,
      p_notification_id: null,
    });
    return !error && Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function createActivityNotification({
  targetProfileId = null,
  type = 'like',
  postId = null,
  commentText = null,
}) {
  const token = getStoredSessionToken();
  if (!token || !isSupabaseConfigured || !supabase) {
    return { ok: false };
  }

  try {
    const { data, error } = await supabase.rpc('create_activity_notification', {
      p_session_token: token,
      p_target_profile_id: isUuid(targetProfileId) ? targetProfileId : null,
      p_type: type,
      p_post_id: isUuid(postId) ? postId : null,
      p_comment_text: commentText || null,
    });

    if (error || !data?.ok) {
      return { ok: false };
    }

    if (data.recipientId) {
      const me = getStoredOnboardingState();
      const actorId = me?.profileId || '';
      const actorName =
        me?.setupData?.name || me?.setupData?.username || 'Someone';
      const actorAvatar = me?.setupData?.avatar || '';

      broadcastRealtimeEvent(`notif:${data.recipientId}`, 'new_notification', {
        type,
        postId,
        commentText,
        actorId,
        actorName,
        actorAvatar,
      });

      const bodyText =
        type === 'comment'
          ? commentText
            ? `commented: "${commentText}"`
            : 'commented on your post'
          : type === 'follow'
            ? 'started following you'
            : 'liked your post';

      sendPriorityPushToRecipient({
        recipientId: data.recipientId,
        title: actorName,
        body: bodyText,
        url: '/notifications',
        tag: `${type}-${postId || actorId || data.recipientId}`,
        icon: actorAvatar,
      });
    }

    return { ok: true, recipientId: data.recipientId || null };
  } catch {
    return { ok: false };
  }
}
