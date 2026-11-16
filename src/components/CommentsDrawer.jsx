import React, { useEffect, useMemo, useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import avatarJacob from '../assets/avatar-jacob.jpg';
import chatCharlie from '../assets/chat-charlie.jpg';
import chatDavid from '../assets/chat-david.jpg';
import creation5 from '../assets/creation-5.jpg';
import handoverMarkBlue from '../assets/logos/handover-mark-blue.jpg';
import profileHero from '../assets/profile-hero.jpg';
import {
  createPostComment,
  fetchPostComments,
  toggleCommentLikeInDb,
} from '../services/feedService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { HeartIcon } from './Icons';

const AVATAR_BY_USERNAME = {
  oliviabeits: profileHero,
  mariatheodor: creation5,
  jacobjones: avatarJacob,
  davidsmith: chatDavid,
  charliebrown: chatCharlie,
};

function resolveCommentAvatar(comment) {
  if (comment.authorAvatar) return comment.authorAvatar;
  const key = (comment.authorUsername || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return AVATAR_BY_USERNAME[key] || avatarDefault;
}

function resolveCompanyLogo(comment) {
  if (comment.companyLogoUrl) return comment.companyLogoUrl;
  if (
    comment.authorRole === 'founder' &&
    comment.companyName?.toLowerCase() === 'handover'
  ) {
    return handoverMarkBlue;
  }
  return '';
}

function AuthorBadge({ comment }) {
  if (comment.authorRole !== 'founder') return null;
  const logoUrl = resolveCompanyLogo(comment);
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={comment.companyName || 'Company badge'}
        title={
          comment.companyName
            ? `Founder of ${comment.companyName}`
            : 'Founder'
        }
        className="comment-founder-badge"
      />
    );
  }
  if (comment.companyName) {
    return (
      <span
        className="comment-founder-monogram"
        title={`Founder of ${comment.companyName}`}
        aria-label={`Founder of ${comment.companyName}`}
      >
        {comment.companyName.trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return null;
}

export default function CommentsDrawer({
  post,
  currentUser,
  actorKey,
  onClose,
  onTogglePostLike,
  onCommentsCountChange,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { rootId, authorName, authorUsername }
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!post?.id) return undefined;
    let active = true;
    setLoading(true);
    fetchPostComments({ postId: post.id, actorKey }).then((rows) => {
      if (!active) return;
      setComments(rows);
      setLoading(false);
      onCommentsCountChange?.(post.id, rows.length);
    });
    return () => {
      active = false;
    };
  }, [post?.id, actorKey]);

  // Group into top-level comments and nested replies
  const threadedComments = useMemo(() => {
    const commentById = new Map();
    for (const c of comments) {
      commentById.set(c.id, c);
    }

    const resolveRootId = (comment) => {
      let curr = comment;
      let guard = 0;
      while (curr?.parentCommentId && guard < 10) {
        const parent = commentById.get(curr.parentCommentId);
        if (!parent) break;
        curr = parent;
        guard += 1;
      }
      return curr?.id;
    };

    const topLevel = [];
    const repliesMap = new Map();

    for (const c of comments) {
      if (!c.parentCommentId) {
        topLevel.push(c);
      } else {
        const rootId = resolveRootId({ ...c, id: c.parentCommentId });
        const list = repliesMap.get(rootId) || [];
        list.push(c);
        repliesMap.set(rootId, list);
      }
    }

    return topLevel.map((parent) => ({
      ...parent,
      replies: repliesMap.get(parent.id) || [],
    }));
  }, [comments]);

  const handleToggleCommentLike = (commentId) => {
    triggerLightHaptic();
    let targetPayload = null;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const nextLiked = !c.liked;
        const nextCount = Math.max(
          0,
          (c.likesCount || 0) + (nextLiked ? 1 : -1)
        );
        targetPayload = { liked: nextLiked, likesCount: nextCount };
        return { ...c, liked: nextLiked, likesCount: nextCount };
      })
    );
    if (targetPayload) {
      toggleCommentLikeInDb({
        commentId,
        actorKey,
        liked: targetPayload.liked,
        likesCount: targetPayload.likesCount,
      });
    }
  };

  const startReply = (comment, rootParentId) => {
    triggerLightHaptic();
    const handle = comment.authorUsername
      ? `@${comment.authorUsername}`
      : comment.authorName;
    setReplyingTo({
      rootId: rootParentId || comment.id,
      authorName: comment.authorName,
      handle,
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || submitting || !post?.id) return;
    triggerLightHaptic();
    setSubmitting(true);

    const displayName =
      currentUser?.name?.trim() ||
      currentUser?.username?.trim() ||
      'Handover Member';
    const rawUsername = currentUser?.username?.trim() || '';
    const finalBody = replyingTo
      ? trimmed.startsWith(replyingTo.handle)
        ? trimmed
        : `${replyingTo.handle} ${trimmed}`
      : trimmed;
    const parentId = replyingTo?.rootId || null;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: optimisticId,
      postKey: String(post.id),
      parentCommentId: parentId,
      authorId: currentUser?.id || null,
      authorName: displayName,
      authorUsername: rawUsername,
      authorAvatar: currentUser?.avatar || avatarDefault,
      authorRole: currentUser?.role || 'creator',
      companyName: currentUser?.companyName || '',
      companyLogoUrl: currentUser?.companyLogoUrl || '',
      body: finalBody,
      likesCount: 0,
      liked: false,
      time: 'Just now',
    };

    const nextCount = comments.length + 1;
    setComments((prev) => [...prev, optimisticComment]);
    setDraft('');
    setReplyingTo(null);
    onCommentsCountChange?.(post.id, nextCount);

    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });

    const saved = await createPostComment({
      postId: post.id,
      parentCommentId: parentId,
      authorId: currentUser?.id || null,
      authorName: displayName,
      authorUsername: rawUsername,
      authorAvatar: currentUser?.avatar || avatarDefault,
      authorRole: currentUser?.role || 'creator',
      companyName: currentUser?.companyName || '',
      companyLogoUrl: currentUser?.companyLogoUrl || '',
      body: finalBody,
    });

    if (saved) {
      setComments((prev) =>
        prev.map((c) => (c.id === optimisticId ? saved : c))
      );
    }
    setSubmitting(false);
  };

  if (!post) return null;

  return (
    <div
      className="comments-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Comments for ${post.authorName || 'post'}`}
      onClick={onClose}
    >
      <div
        className="comments-drawer-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="comments-drawer-handle-wrap" onClick={onClose}>
          <span className="comments-drawer-handle" aria-hidden="true" />
        </div>

        {/* Drawer Header */}
        <header className="comments-drawer-header">
          <div className="comments-drawer-title-group">
            <h2 className="comments-drawer-title">Comments</h2>
            <span className="comments-drawer-count">{comments.length}</span>
          </div>

          <div className="comments-drawer-header-actions">
            <button
              type="button"
              className={`comments-post-like-pill ${post.liked ? 'liked' : ''}`}
              onClick={() => onTogglePostLike?.(post.id)}
              aria-label={post.liked ? 'Unlike post' : 'Like post'}
              aria-pressed={post.liked}
            >
              <HeartIcon filled={post.liked} />
              <span>{post.likesCount ?? 0}</span>
            </button>

            <button
              type="button"
              className="comments-drawer-close"
              onClick={() => {
                triggerLightHaptic();
                onClose();
              }}
              aria-label="Close comments drawer"
            >
              ×
            </button>
          </div>
        </header>

        {/* Post Mini Context */}
        <div className="comments-post-context">
          <img
            src={post.avatar}
            alt={post.authorName || 'Author'}
            className="comments-context-avatar"
          />
          <p className="comments-context-headline">{post.headline}</p>
        </div>

        {/* Scrollable Comments List */}
        <div ref={listRef} className="comments-drawer-list">
          {loading ? (
            <div className="comments-loading">Loading comments...</div>
          ) : threadedComments.length === 0 ? (
            <div className="comments-empty">
              No comments yet. Be the first to share a thought!
            </div>
          ) : (
            threadedComments.map((comment) => (
              <div key={comment.id} className="comment-thread-block">
                {/* Top-Level Comment */}
                <div className="comment-item">
                  <img
                    src={resolveCommentAvatar(comment)}
                    alt={comment.authorName}
                    className="comment-avatar"
                  />
                  <div className="comment-body-col">
                    <div className="comment-meta-row">
                      <span className="comment-author-name">
                        {comment.authorName}
                      </span>
                      <AuthorBadge comment={comment} />
                      <span className="comment-time">{comment.time}</span>
                    </div>

                    <p className="comment-text">{comment.body}</p>

                    <div className="comment-actions-row">
                      <button
                        type="button"
                        className="comment-reply-btn"
                        onClick={() => startReply(comment, comment.id)}
                      >
                        Reply
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`comment-like-btn ${comment.liked ? 'liked' : ''}`}
                    onClick={() => handleToggleCommentLike(comment.id)}
                    aria-label={
                      comment.liked ? 'Unlike comment' : 'Like comment'
                    }
                    aria-pressed={comment.liked}
                  >
                    <HeartIcon filled={comment.liked} />
                    <span className="comment-like-count">
                      {comment.likesCount ?? 0}
                    </span>
                  </button>
                </div>

                {/* Nested Replies */}
                {comment.replies.length > 0 && (
                  <div className="comment-replies-list">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="comment-item is-reply">
                        <img
                          src={resolveCommentAvatar(reply)}
                          alt={reply.authorName}
                          className="comment-avatar is-reply"
                        />
                        <div className="comment-body-col">
                          <div className="comment-meta-row">
                            <span className="comment-author-name">
                              {reply.authorName}
                            </span>
                            <AuthorBadge comment={reply} />
                            <span className="comment-time">{reply.time}</span>
                          </div>

                          <p className="comment-text">{reply.body}</p>

                          <div className="comment-actions-row">
                            <button
                              type="button"
                              className="comment-reply-btn"
                              onClick={() => startReply(reply, comment.id)}
                            >
                              Reply
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`comment-like-btn ${reply.liked ? 'liked' : ''}`}
                          onClick={() => handleToggleCommentLike(reply.id)}
                          aria-label={
                            reply.liked ? 'Unlike reply' : 'Like reply'
                          }
                          aria-pressed={reply.liked}
                        >
                          <HeartIcon filled={reply.liked} />
                          <span className="comment-like-count">
                            {reply.likesCount ?? 0}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reply Indicator Banner */}
        {replyingTo && (
          <div className="comments-reply-banner">
            <span>
              Replying to <strong>{replyingTo.authorName}</strong>
            </span>
            <button
              type="button"
              className="comments-reply-cancel"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
            >
              ×
            </button>
          </div>
        )}

        {/* Composer */}
        <form className="comments-composer" onSubmit={handleSubmit}>
          <img
            src={currentUser?.avatar || avatarDefault}
            alt="Your avatar"
            className="comments-composer-avatar"
          />
          <input
            ref={inputRef}
            type="text"
            className="comments-composer-input"
            placeholder={
              replyingTo
                ? `Reply to ${replyingTo.authorName}...`
                : 'Add a comment...'
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="submit"
            className="comments-composer-send"
            disabled={!draft.trim() || submitting}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}

