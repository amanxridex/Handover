import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import avatarJacob from '../assets/avatar-jacob.jpg';
import creation3 from '../assets/creation-3.jpg';
import creation5 from '../assets/creation-5.jpg';
import creation6 from '../assets/creation-6.jpg';
import feedPillowFight from '../assets/feed-pillow-fight.jpg';
import feedWarmPost from '../assets/feed-warm-post.jpg';
import handoverMarkBlue from '../assets/logos/handover-mark-blue.jpg';
import handoverMark from '../assets/logos/handover-mark.png';
import profileHero from '../assets/profile-hero.jpg';
import {
  createFeedPost,
  fetchFeedEngagement,
  fetchFeedPosts,
  getClientActorKey,
  togglePostLikeInDb,
} from '../services/feedService';
import { compressImageFile } from '../utils/imageCompress';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/nativeBridge';
import CommentsDrawer from './CommentsDrawer';
import {
  BellIcon,
  ChevronDownIcon,
  CloseXIcon,
  CommentBubbleIcon,
  HeartIcon,
} from './Icons';

const STORY_CAPSULES = [
  {
    id: 'squad-1',
    avatars: [profileHero, creation5],
    badge: 37,
  },
  {
    id: 'squad-2',
    avatars: [creation3, creation6],
    badge: 4,
  },
  {
    id: 'squad-3',
    avatars: [avatarJacob, feedWarmPost],
    badge: 86,
  },
];

const INITIAL_POSTS = [
  {
    id: 'pillow-fight',
    authorName: 'Maria Theodor',
    authorHandle: '@mariatheodor',
    authorRole: 'creator',
    companyName: '',
    companyLogoUrl: '',
    time: '6h ago',
    avatar: creation5,
    headline: 'Check out my pillow fight with beautiful views',
    image: feedPillowFight,
    likesCount: 24,
    commentsCount: 3,
    liked: false,
  },
  {
    id: 'skyline-sunset',
    authorName: 'Olivia Beits',
    authorHandle: '@oliviabeits',
    authorRole: 'creator',
    companyName: '',
    companyLogoUrl: '',
    time: '9h ago',
    avatar: profileHero,
    headline: 'Golden hour above the skyline with my favourite crew',
    image: feedWarmPost,
    likesCount: 18,
    commentsCount: 1,
    liked: false,
  },
  {
    id: 'courtside-dusk',
    authorName: 'Jacob Jones',
    authorHandle: '@jacobjones',
    authorRole: 'founder',
    companyName: 'Handover',
    companyLogoUrl: handoverMarkBlue,
    time: '1d ago',
    avatar: avatarJacob,
    headline: 'Courtside dusk sessions & twilight match point',
    image: creation3,
    likesCount: 41,
    commentsCount: 1,
    liked: false,
  },
];

export default function HomeFeedScreen({
  currentUser,
  unreadNotifications,
  onOpenNotifications,
  onOpenProfile,
  activeCommentsPostId,
  onOpenComments,
  onCloseComments,
  tabs,
  activeTab,
  onSelectTab,
}) {
  const fileInputRef = useRef(null);
  const feedScrollRef = useRef(null);
  const pullStartYRef = useRef(null);
  const pullStartXRef = useRef(null);
  const pullTriggeredHapticRef = useRef(false);

  const [activeCapsule, setActiveCapsule] = useState('squad-1');
  const [feedMode, setFeedMode] = useState('Feed');
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [postedNotice, setPostedNotice] = useState('');
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create Post sheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [newHeadline, setNewHeadline] = useState('');
  const [newImage, setNewImage] = useState('');

  const actorKey = useMemo(
    () => getClientActorKey(currentUser?.id),
    [currentUser?.id]
  );

  const loadFeedData = useCallback(async () => {
    const remotePosts = await fetchFeedPosts();

    const starterIds = INITIAL_POSTS.map((p) => p.id);
    const allKeys = [
      ...new Set([
        ...starterIds,
        ...(remotePosts || []).map((p) => String(p.id)),
      ]),
    ];

    const engagement = await fetchFeedEngagement({
      postKeys: allKeys,
      actorKey,
    });

    setPosts((prev) => {
      const remoteList = remotePosts || [];
      const remoteIds = new Set(remoteList.map((p) => p.id));
      const merged = [
        ...remoteList,
        ...prev.filter((p) => !remoteIds.has(p.id)),
      ];

      return merged.map((post) => {
        const key = String(post.id);
        const counterOverride = engagement.countersByPost?.[key];
        const dbCommentCount = engagement.commentCountsByPost?.[key];
        return {
          ...post,
          likesCount:
            counterOverride !== undefined ? counterOverride : post.likesCount,
          commentsCount:
            dbCommentCount !== undefined
              ? dbCommentCount
              : post.commentsCount || 0,
          liked: engagement.likedPostKeys?.has(key) || post.liked,
        };
      });
    });
  }, [actorKey]);

  // Load live feed posts + live likes & comment counts from Supabase
  useEffect(() => {
    let active = true;
    loadFeedData().catch(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [loadFeedData]);

  const showNotice = (msg) => {
    setPostedNotice(msg);
    setTimeout(() => setPostedNotice(''), 1800);
  };

  const PULL_THRESHOLD = 58;

  const triggerPullRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setPullDistance(52);
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
          if (reg?.waiting) {
            reg.waiting.postMessage('SKIP_WAITING');
          }
        });
      }
      await Promise.all([
        loadFeedData(),
        new Promise((resolve) => setTimeout(resolve, 480)),
      ]);
      triggerSuccessHaptic();
      showNotice('Feed refreshed');
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  const handleTouchStart = (e) => {
    if (isRefreshing || createOpen || activeCommentsPostId) return;
    const scroller = feedScrollRef.current;
    if (!scroller || scroller.scrollTop > 2) {
      pullStartYRef.current = null;
      return;
    }
    const touch = e.touches?.[0];
    if (!touch) return;
    pullStartYRef.current = touch.clientY;
    pullStartXRef.current = touch.clientX;
    pullTriggeredHapticRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (pullStartYRef.current === null || isRefreshing) return;
    const scroller = feedScrollRef.current;
    if (!scroller || scroller.scrollTop > 2) {
      pullStartYRef.current = null;
      setPullDistance(0);
      return;
    }
    const touch = e.touches?.[0];
    if (!touch) return;
    const dy = touch.clientY - pullStartYRef.current;
    const dx = Math.abs(touch.clientX - (pullStartXRef.current || 0));

    // Ignore upward scrolls or horizontal story-capsule swipes
    if (dy <= 8 || dx > dy) {
      if (dy <= 0) setPullDistance(0);
      return;
    }

    const damped = Math.min(88, Math.pow(dy - 8, 0.84));
    setPullDistance(damped);

    if (damped >= PULL_THRESHOLD && !pullTriggeredHapticRef.current) {
      pullTriggeredHapticRef.current = true;
      triggerLightHaptic();
    }
  };

  const handleTouchEnd = () => {
    if (pullStartYRef.current === null) return;
    pullStartYRef.current = null;
    if (pullDistance >= PULL_THRESHOLD) {
      triggerPullRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const toggleLike = (postId) => {
    triggerLightHaptic();
    let nextState = null;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.liked;
        const updatedCount = Math.max(
          0,
          (p.likesCount || 0) + (nextLiked ? 1 : -1)
        );
        nextState = { liked: nextLiked, likesCount: updatedCount };
        return { ...p, liked: nextLiked, likesCount: updatedCount };
      })
    );
    if (nextState) {
      togglePostLikeInDb({
        postId,
        actorKey,
        liked: nextState.liked,
        likesCount: nextState.likesCount,
      });
    }
  };

  const handleCommentsCountChange = (postId, count) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: count } : p))
    );
  };

  const activeCommentsPost = useMemo(
    () =>
      activeCommentsPostId
        ? posts.find((p) => String(p.id) === String(activeCommentsPostId)) || null
        : null,
    [activeCommentsPostId, posts]
  );

  const handlePostPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 900, 0.82);
    if (compressed) {
      setNewImage(compressed);
    }
    e.target.value = '';
  };

  const handlePublishPost = async (e) => {
    e.preventDefault();
    const headline = newHeadline.trim();
    if (!headline) {
      showNotice('Write a headline for your post');
      return;
    }
    triggerLightHaptic();
    const displayName =
      currentUser?.name?.trim() ||
      currentUser?.username?.trim() ||
      'Handover Member';
    const rawUsername = currentUser?.username?.trim() || '';
    const handle = rawUsername
      ? `@${rawUsername}`
      : `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'you'}`;
    const optimisticId = `post-${Date.now()}`;
    const draftPost = {
      id: optimisticId,
      authorName: displayName,
      authorHandle: handle,
      authorRole: currentUser?.role || 'creator',
      companyName: currentUser?.companyName || '',
      companyLogoUrl: currentUser?.companyLogoUrl || '',
      time: 'Just now',
      avatar: currentUser?.avatar || avatarDefault,
      headline,
      image: newImage || feedWarmPost,
      likesCount: 0,
      commentsCount: 0,
      liked: false,
    };
    setPosts((prev) => [draftPost, ...prev]);
    setNewHeadline('');
    setNewImage('');
    setCreateOpen(false);
    showNotice('Post published!');

    const saved = await createFeedPost({
      authorId: currentUser?.id || null,
      authorName: draftPost.authorName,
      authorHandle: draftPost.authorHandle,
      avatar: draftPost.avatar,
      authorRole: draftPost.authorRole,
      companyName: draftPost.companyName,
      companyLogoUrl: draftPost.companyLogoUrl,
      headline: draftPost.headline,
      image: draftPost.image,
      likesCount: 0,
      liked: false,
    });
    if (saved?.id) {
      setPosts((prev) =>
        prev.map((p) => (p.id === optimisticId ? { ...p, id: saved.id } : p))
      );
    }
  };

  return (
    <section className="feed-screen" aria-label="Home feed">
      {/* Pull-to-refresh Indicator */}
      {(pullDistance > 4 || isRefreshing) && (
        <div
          className={`feed-ptr-indicator ${isRefreshing ? 'is-refreshing' : ''} ${
            pullDistance >= PULL_THRESHOLD ? 'is-ready' : ''
          }`}
          style={{
            transform: `translate(-50%, ${Math.max(0, pullDistance - 34)}px)`,
            opacity: Math.min(1, pullDistance / 32),
          }}
          aria-live="polite"
        >
          <span
            className={`feed-ptr-spinner ${isRefreshing ? 'spinning' : ''}`}
            style={
              isRefreshing
                ? undefined
                : { transform: `rotate(${Math.round(pullDistance * 4.5)}deg)` }
            }
          />
          <span className="feed-ptr-label">
            {isRefreshing
              ? 'Refreshing...'
              : pullDistance >= PULL_THRESHOLD
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </span>
        </div>
      )}

      {/* Scrollable Feed Content */}
      <div
        ref={feedScrollRef}
        className="feed-scroll"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={
          pullDistance > 0
            ? {
                transform: `translateY(${pullDistance}px)`,
                transition: pullStartYRef.current
                  ? 'none'
                  : 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
              }
            : { transition: 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)' }
        }
      >
        {/* Top Bar */}
        <header className="feed-top-bar">
          <button
            type="button"
            className="feed-logo-badge"
            onClick={() => {
              triggerLightHaptic();
              setCreateOpen(true);
            }}
            aria-label="Create post"
          >
            <img
              src={handoverMark}
              alt="Handover"
              className="feed-logo-img"
            />
          </button>

          <div className="feed-title-wrap">
            <button
              type="button"
              className="feed-title-btn"
              onClick={() => {
                triggerLightHaptic();
                setFeedMenuOpen((prev) => !prev);
              }}
              aria-expanded={feedMenuOpen}
            >
              <span>{feedMode}</span>
              <ChevronDownIcon />
            </button>

            {feedMenuOpen && (
              <div className="feed-mode-menu" role="menu">
                {['Feed', 'Following', 'Nearby'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="menuitem"
                    className={`feed-mode-item ${
                      feedMode === mode ? 'active' : ''
                    }`}
                    onClick={() => {
                      triggerLightHaptic();
                      setFeedMode(mode);
                      setFeedMenuOpen(false);
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="feed-icon-btn"
            onClick={() => {
              triggerLightHaptic();
              onOpenNotifications();
            }}
            aria-label={`Notifications (${unreadNotifications} unread)`}
          >
            <BellIcon />
            {unreadNotifications > 0 && (
              <span className="feed-notif-badge">{unreadNotifications}</span>
            )}
          </button>
        </header>

        {/* Double-Avatar Story Capsules */}
        <div className="feed-stories-row" aria-label="Active groups">
          {STORY_CAPSULES.map((capsule) => {
            const isSelected = activeCapsule === capsule.id;
            return (
              <button
                key={capsule.id}
                type="button"
                className={`feed-story-capsule ${
                  isSelected ? 'active' : ''
                }`}
                onClick={() => {
                  triggerLightHaptic();
                  setActiveCapsule(capsule.id);
                }}
                aria-pressed={isSelected}
              >
                <img
                  src={capsule.avatars[0]}
                  alt=""
                  className="feed-story-avatar"
                />
                <img
                  src={capsule.avatars[1]}
                  alt=""
                  className="feed-story-avatar"
                />
                <span className="feed-story-badge">{capsule.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Editorial Feed Cards */}
        <div className="feed-cards-list">
          {posts.map((post) => (
            <article key={post.id} className="feed-card">
              <img
                src={post.image}
                alt={post.headline}
                className="feed-card-img"
              />
              <div className="feed-card-scrim" aria-hidden="true" />

              <div className="feed-card-top">
                <button
                  type="button"
                  className="feed-author-row"
                  onClick={() => {
                    triggerLightHaptic();
                    onOpenProfile();
                  }}
                >
                  <img
                    src={post.avatar}
                    alt={post.authorName || post.author || 'Author'}
                    className="feed-author-avatar"
                  />
                  <div className="feed-author-meta">
                    <span className="feed-author-name-row">
                      <span className="feed-author-name">
                        {post.authorName || post.author}
                      </span>
                      {post.authorRole === 'founder' &&
                        (post.companyLogoUrl ? (
                          <img
                            src={post.companyLogoUrl}
                            alt={post.companyName || 'Company badge'}
                            title={
                              post.companyName
                                ? `Founder of ${post.companyName}`
                                : 'Founder'
                            }
                            className="feed-founder-badge"
                          />
                        ) : post.companyName ? (
                          <span
                            className="feed-founder-monogram"
                            title={`Founder of ${post.companyName}`}
                            aria-label={`Founder of ${post.companyName}`}
                          >
                            {post.companyName.trim().charAt(0).toUpperCase()}
                          </span>
                        ) : null)}
                    </span>
                    <span className="feed-author-time">
                      {post.authorHandle ? `${post.authorHandle} · ` : ''}
                      {post.time}
                    </span>
                  </div>
                </button>

                <h2 className="feed-card-headline">{post.headline}</h2>
              </div>

              <div className="feed-card-bottom">
                <button
                  type="button"
                  className="feed-comment-pill feed-comment-trigger"
                  onClick={() => {
                    triggerLightHaptic();
                    onOpenComments?.(post.id);
                  }}
                >
                  <CommentBubbleIcon />
                  <span className="feed-comment-trigger-text">
                    {post.commentsCount > 0
                      ? `View ${post.commentsCount} comment${post.commentsCount === 1 ? '' : 's'} · Add comment`
                      : 'Add comment'}
                  </span>
                </button>

                <button
                  type="button"
                  className={`feed-heart-pill ${post.liked ? 'liked' : ''}`}
                  onClick={() => toggleLike(post.id)}
                  aria-label={post.liked ? 'Unlike post' : 'Like post'}
                  aria-pressed={post.liked}
                >
                  <HeartIcon filled={post.liked} />
                  <span className="feed-heart-count">{post.likesCount ?? 0}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Floating Dark-Blue Glass Bottom Navigation Bar */}
      <div className="feed-bottom-fade" aria-hidden="true" />
      <div className="bottom-nav-wrap feed-bottom-nav-wrap">
        <nav className="bottom-nav feed-bottom-nav" aria-label="Primary navigation">
          {tabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                className={`nav-item feed-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon active={isActive} dark />
                <span className="nav-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Create Post Modal Sheet */}
      {createOpen && (
        <div
          className="feed-create-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Create post"
          onClick={() => setCreateOpen(false)}
        >
          <form
            className="feed-create-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handlePublishPost}
          >
            <div className="feed-create-header">
              <h2 className="feed-create-title">Create post</h2>
              <button
                type="button"
                className="feed-create-close"
                onClick={() => setCreateOpen(false)}
                aria-label="Close create post"
              >
                <CloseXIcon />
              </button>
            </div>

            <textarea
              className="setup-textarea feed-create-textarea"
              rows={3}
              placeholder="Write something cool to share..."
              value={newHeadline}
              onChange={(e) => setNewHeadline(e.target.value)}
            />

            <button
              type="button"
              className="feed-photo-picker"
              onClick={() => fileInputRef.current?.click()}
            >
              {newImage ? (
                <img
                  src={newImage}
                  alt="Selected post"
                  className="feed-photo-preview"
                />
              ) : (
                <span>+ Add a photo from your device</span>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePostPhotoChange}
            />

            <button type="submit" className="onboarding-next-btn">
              <span className="onboarding-next-label">Post to Feed</span>
            </button>
          </form>
        </div>
      )}

      {activeCommentsPost && (
        <CommentsDrawer
          post={activeCommentsPost}
          currentUser={currentUser}
          actorKey={actorKey}
          onClose={() => onCloseComments?.()}
          onTogglePostLike={toggleLike}
          onCommentsCountChange={handleCommentsCountChange}
        />
      )}

      {postedNotice && (
        <div className="feed-toast" role="status">
          {postedNotice}
        </div>
      )}
    </section>
  );
}
