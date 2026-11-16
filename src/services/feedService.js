import { isSupabaseConfigured, supabase } from '../lib/supabase';

function formatRelativeTime(iso) {
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
        liked: false,
      };
    });
  } catch {
    return [];
  }
}

export async function createFeedPost(post) {
  if (!isSupabaseConfigured || !supabase || !post.authorId) {
    return null;
  }
  try {
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

    if (error || !data) return null;
    return {
      ...post,
      id: data.id,
      time: 'Just now',
    };
  } catch {
    return null;
  }
}

export async function updatePostLikes(postId, likesCount) {
  if (!isSupabaseConfigured || !supabase) return;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      String(postId)
    );
  if (!isUuid) return;
  try {
    await supabase
      .from('posts')
      .update({ likes_count: Math.max(0, likesCount) })
      .eq('id', postId);
  } catch {
    // Ignore network error
  }
}

export async function savePostComment({ postId, authorId, authorName, body }) {
  if (!isSupabaseConfigured || !supabase) return;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      String(postId)
    );
  if (!isUuid) return;
  try {
    await supabase.from('post_comments').insert({
      post_id: postId,
      author_id: authorId || null,
      author_name: authorName || 'Member',
      body,
    });
  } catch {
    // Ignore network error
  }
}
