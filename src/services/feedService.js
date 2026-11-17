import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { createActivityNotification } from './notificationsService';
import { getStoredSessionToken } from './profileService';

const ACTOR_KEY_STORAGE = 'handover_actor_key_v1';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export function getClientActorKey(profileId) {
  if (profileId) return `profile:${profileId}`;
  try {
    let existing = window.localStorage.getItem(ACTOR_KEY_STORAGE);
    if (!existing) {
      const rand =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      existing = `device:${rand}`;
      window.localStorage.setItem(ACTOR_KEY_STORAGE, existing);
    }
    return existing;
  } catch {
    return 'device:guest';
  }
}

export function formatRelativeTime(iso) {
  if (!iso) return 'Just now';
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export async function fetchFeedPosts() {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(
        `
        id,
        author_id,
        headline,
        image_url,
        likes_count,
        created_at,
        author_name,
        author_username,
        author_avatar_url,
        author_role,
        author_company_name,
        author_company_logo_url,
        author:profiles (
          id,
          full_name,
          username,
          avatar_url,
          role,
          company_name,
          company_logo_url
        )
      `
      )
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error || !Array.isArray(data)) return [];

    return data.map((row) => {
      const prof = Array.isArray(row.author) ? row.author[0] : row.author;
      return {
        id: row.id,
        authorName: prof?.full_name || row.author_name || 'Handover Member',
        authorHandle: prof?.username
          ? `@${prof.username}`
          : row.author_username
            ? `@${row.author_username}`
            : '@member',
        avatar: prof?.avatar_url || row.author_avatar_url || '',
        authorRole: prof?.role || row.author_role || 'creator',
        companyName: prof?.company_name || row.author_company_name || '',
        companyLogoUrl:
          prof?.company_logo_url || row.author_company_logo_url || '',
        time: formatRelativeTime(row.created_at),
        headline: row.headline,
        image: row.image_url || '',
        likesCount: row.likes_count || 0,
        commentsCount: 0,
        liked: false,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchFeedEngagement({ postKeys, actorKey }) {
  if (!isSupabaseConfigured || !supabase || !postKeys?.length) {
    return { countersByPost: {}, likedPostKeys: new Set(), commentCountsByPost: {} };
  }
  try {
    const [countersRes, likesRes, commentsRes] = await Promise.all([
      supabase
        .from('post_counters')
        .select('post_key, likes_count')
        .in('post_key', postKeys),
      supabase
        .from('post_likes')
        .select('post_key')
        .eq('actor_key', actorKey)
        .in('post_key', postKeys),
      supabase
        .from('post_comments')
        .select('post_key')
        .in('post_key', postKeys),
    ]);

    const countersByPost = {};
    if (Array.isArray(countersRes.data)) {
      for (const row of countersRes.data) {
        countersByPost[row.post_key] = row.likes_count || 0;
      }
    }

    const likedPostKeys = new Set();
    if (Array.isArray(likesRes.data)) {
      for (const row of likesRes.data) {
        likedPostKeys.add(row.post_key);
      }
    }

    const commentCountsByPost = {};
    if (Array.isArray(commentsRes.data)) {
      for (const row of commentsRes.data) {
        commentCountsByPost[row.post_key] =
          (commentCountsByPost[row.post_key] || 0) + 1;
      }
    }

    return { countersByPost, likedPostKeys, commentCountsByPost };
  } catch {
    return { countersByPost: {}, likedPostKeys: new Set(), commentCountsByPost: {} };
  }
}

export async function createFeedPost(post) {
  if (!isSupabaseConfigured || !supabase) {
    return { post: null, error: 'Database not configured' };
  }

  const token = getStoredSessionToken();

  try {
    if (token) {
      const { data, error } = await supabase.rpc('create_authenticated_post', {
        p_session_token: token,
        p_headline: post.headline,
        p_image_url: post.image || null,
        p_category: 'Personal',
      });

      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row?.id) {
        return {
          post: {
            ...post,
            id: row.id,
            authorName: row.author_name || post.authorName,
            authorHandle: row.author_username
              ? `@${row.author_username}`
              : post.authorHandle,
            avatar: row.author_avatar_url || post.avatar,
            authorRole: row.author_role || post.authorRole,
            companyName: row.author_company_name || post.companyName || '',
            companyLogoUrl:
              row.author_company_logo_url || post.companyLogoUrl || '',
            time: 'Just now',
          },
          error: null,
        };
      }
      if (error) {
        return { post: null, error: error.message || 'Could not save post' };
      }
    }

    if (!post.authorId || !isUuid(post.authorId)) {
      return { post: null, error: 'Sign in again to sync posts to database' };
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: post.authorId,
        headline: post.headline,
        image_url: post.image || null,
        author_name: post.authorName,
        author_username: post.authorHandle.replace(/^@/, ''),
        author_avatar_url: post.avatar || null,
        author_role: post.authorRole || 'creator',
        author_company_name: post.companyName || null,
        author_company_logo_url: post.companyLogoUrl || null,
      })
      .select('id, created_at')
      .single();

    if (error || !data) {
      return { post: null, error: error?.message || 'Failed to publish post' };
    }
    return {
      post: {
        ...post,
        id: data.id,
        time: 'Just now',
      },
      error: null,
    };
  } catch (err) {
    return { post: null, error: err?.message || 'Network error saving post' };
  }
}

export async function togglePostLikeInDb({
  postId,
  actorKey,
  liked,
  likesCount,
}) {
  if (!isSupabaseConfigured || !supabase) return;
  const postKey = String(postId);
  const safeCount = Math.max(0, likesCount);
  try {
    const tasks = [];
    if (isUuid(postKey)) {
      tasks.push(
        supabase
          .from('posts')
          .update({ likes_count: safeCount })
          .eq('id', postKey)
      );
    } else {
      tasks.push(
        supabase
          .from('post_counters')
          .upsert(
            { post_key: postKey, likes_count: safeCount },
            { onConflict: 'post_key' }
          )
      );
    }

    if (actorKey) {
      if (liked) {
        tasks.push(
          supabase
            .from('post_likes')
            .upsert(
              { post_key: postKey, actor_key: actorKey },
              { onConflict: 'post_key,actor_key' }
            )
        );
      } else {
        tasks.push(
          supabase
            .from('post_likes')
            .delete()
            .eq('post_key', postKey)
            .eq('actor_key', actorKey)
        );
      }
    }

    await Promise.all(tasks);
    if (liked && isUuid(postKey)) {
      createActivityNotification({
        type: 'like',
        postId: postKey,
      });
    }
  } catch {
    // Ignore network error
  }
}

export async function fetchPostComments({ postId, actorKey }) {
  if (!isSupabaseConfigured || !supabase || !postId) return [];
  const postKey = String(postId);
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select(
        `
        id,
        post_id,
        post_key,
        parent_comment_id,
        author_id,
        author_name,
        author_username,
        author_avatar_url,
        author_role,
        author_company_name,
        author_company_logo_url,
        body,
        likes_count,
        created_at
      `
      )
      .eq('post_key', postKey)
      .order('created_at', { ascending: true });

    if (error || !Array.isArray(data)) return [];

    let likedIds = new Set();
    if (actorKey && data.length > 0) {
      const commentIds = data.map((c) => c.id);
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('actor_key', actorKey)
        .in('comment_id', commentIds);
      if (Array.isArray(likesData)) {
        likedIds = new Set(likesData.map((l) => l.comment_id));
      }
    }

    return data.map((row) => ({
      id: row.id,
      postKey: row.post_key || postKey,
      parentCommentId: row.parent_comment_id || null,
      authorId: row.author_id || null,
      authorName: row.author_name || 'Member',
      authorUsername: row.author_username || '',
      authorAvatar: row.author_avatar_url || '',
      authorRole: row.author_role || 'creator',
      companyName: row.author_company_name || '',
      companyLogoUrl: row.author_company_logo_url || '',
      body: row.body,
      likesCount: row.likes_count || 0,
      liked: likedIds.has(row.id),
      time: formatRelativeTime(row.created_at),
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function createPostComment({
  postId,
  parentCommentId,
  authorId,
  authorName,
  authorUsername,
  authorAvatar,
  authorRole,
  companyName,
  companyLogoUrl,
  body,
}) {
  if (!isSupabaseConfigured || !supabase || !postId || !body?.trim()) {
    return null;
  }
  const postKey = String(postId);
  try {
    const payload = {
      post_id: isUuid(postKey) ? postKey : null,
      post_key: postKey,
      parent_comment_id: isUuid(parentCommentId) ? parentCommentId : null,
      author_id: isUuid(authorId) ? authorId : null,
      author_name: authorName || 'Member',
      author_username: authorUsername ? authorUsername.replace(/^@/, '') : null,
      author_avatar_url: authorAvatar || null,
      author_role: authorRole || 'creator',
      author_company_name: companyName || null,
      author_company_logo_url: companyLogoUrl || null,
      body: body.trim(),
      likes_count: 0,
    };

    const { data, error } = await supabase
      .from('post_comments')
      .insert(payload)
      .select(
        'id, post_key, parent_comment_id, author_id, author_name, author_username, author_avatar_url, author_role, author_company_name, author_company_logo_url, body, likes_count, created_at'
      )
      .single();

    if (error || !data) return null;

    if (isUuid(postKey)) {
      createActivityNotification({
        type: 'comment',
        postId: postKey,
        commentText: data.body,
      });
    }

    return {
      id: data.id,
      postKey: data.post_key,
      parentCommentId: data.parent_comment_id || null,
      authorId: data.author_id || null,
      authorName: data.author_name,
      authorUsername: data.author_username || '',
      authorAvatar: data.author_avatar_url || '',
      authorRole: data.author_role || 'creator',
      companyName: data.author_company_name || '',
      companyLogoUrl: data.author_company_logo_url || '',
      body: data.body,
      likesCount: data.likes_count || 0,
      liked: false,
      time: 'Just now',
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

export async function toggleCommentLikeInDb({
  commentId,
  actorKey,
  liked,
  likesCount,
}) {
  if (!isSupabaseConfigured || !supabase || !isUuid(commentId)) return;
  const safeCount = Math.max(0, likesCount);
  try {
    const tasks = [
      supabase
        .from('post_comments')
        .update({ likes_count: safeCount })
        .eq('id', commentId),
    ];

    if (actorKey) {
      if (liked) {
        tasks.push(
          supabase
            .from('comment_likes')
            .upsert(
              { comment_id: commentId, actor_key: actorKey },
              { onConflict: 'comment_id,actor_key' }
            )
        );
      } else {
        tasks.push(
          supabase
            .from('comment_likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('actor_key', actorKey)
        );
      }
    }

    await Promise.all(tasks);
    if (liked && isUuid(postKey)) {
      createActivityNotification({
        type: 'like',
        postId: postKey,
      });
    }
  } catch {
    // Ignore network error
  }
}

export async function fetchUserProfileOverview(profileId, username) {
  const empty = {
    posts: [],
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  };
  const hasId = Boolean(profileId && isUuid(profileId));
  const cleanUsername = (username || '').trim().replace(/^@+/, '');
  if (!isSupabaseConfigured || !supabase || (!hasId && !cleanUsername)) {
    return empty;
  }
  try {
    let postsQuery = supabase
      .from('posts')
      .select('id, headline, image_url, category, likes_count, created_at')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (hasId && cleanUsername) {
      postsQuery = postsQuery.or(
        `author_id.eq.${profileId},author_username.ilike.${cleanUsername}`
      );
    } else if (hasId) {
      postsQuery = postsQuery.eq('author_id', profileId);
    } else {
      postsQuery = postsQuery.ilike('author_username', cleanUsername);
    }

    const followersPromise = hasId
      ? supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileId)
      : Promise.resolve({ count: 0 });

    const followingPromise = hasId
      ? supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileId)
      : Promise.resolve({ count: 0 });

    const [postsRes, followersRes, followingRes] = await Promise.all([
      postsQuery,
      followersPromise,
      followingPromise,
    ]);

    const posts = Array.isArray(postsRes.data)
      ? postsRes.data.map((row) => ({
          id: row.id,
          title: row.headline,
          image: row.image_url || '',
          alt: row.headline,
          tag: row.category || 'Post',
          likesCount: row.likes_count || 0,
          time: formatRelativeTime(row.created_at),
        }))
      : [];

    return {
      posts,
      followersCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
      postsCount: posts.length,
    };
  } catch {
    return empty;
  }
}
