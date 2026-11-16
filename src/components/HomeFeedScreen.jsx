import React, { useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import avatarJacob from '../assets/avatar-jacob.jpg';
import creation3 from '../assets/creation-3.jpg';
import creation5 from '../assets/creation-5.jpg';
import creation6 from '../assets/creation-6.jpg';
import feedPillowFight from '../assets/feed-pillow-fight.jpg';
import feedWarmPost from '../assets/feed-warm-post.jpg';
import handoverMark from '../assets/logos/handover-mark.png';
import profileHero from '../assets/profile-hero.jpg';
import { triggerLightHaptic } from '../utils/nativeBridge';
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
    author: '@Maria Theodor',
    time: '6h ago',
    avatar: creation5,
    headline: 'Check out my pillow fight with beautiful views',
    image: feedPillowFight,
    liked: false,
  },
  {
    id: 'skyline-sunset',
    author: '@Olivia Beits',
    time: '9h ago',
    avatar: profileHero,
    headline: 'Golden hour above the skyline with my favourite crew',
    image: feedWarmPost,
    liked: false,
  },
  {
    id: 'courtside-dusk',
    author: '@Jacob Jones',
    time: '1d ago',
    avatar: avatarJacob,
    headline: 'Courtside dusk sessions & twilight match point',
    image: creation3,
    liked: false,
  },
];

export default function HomeFeedScreen({
  currentUser,
  unreadNotifications,
  onOpenNotifications,
  onOpenProfile,
  tabs,
  activeTab,
  onSelectTab,
}) {
  const fileInputRef = useRef(null);
  const [activeCapsule, setActiveCapsule] = useState('squad-1');
  const [feedMode, setFeedMode] = useState('Feed');
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [postedNotice, setPostedNotice] = useState('');

  // Create Post sheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [newHeadline, setNewHeadline] = useState('');
  const [newImage, setNewImage] = useState('');

  const showNotice = (msg) => {
    setPostedNotice(msg);
    setTimeout(() => setPostedNotice(''), 1800);
  };

  const toggleLike = (postId) => {
    triggerLightHaptic();
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, liked: !p.liked } : p))
    );
  };

  const handleCommentSubmit = (e, postId) => {
    e.preventDefault();
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    triggerLightHaptic();
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    showNotice('Comment added');
  };

  const handlePostPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublishPost = (e) => {
    e.preventDefault();
    const headline = newHeadline.trim();
    if (!headline) {
      showNotice('Write a headline for your post');
      return;
    }
    triggerLightHaptic();
    const handle = currentUser?.username
      ? `@${currentUser.username}`
      : currentUser?.name
        ? `@${currentUser.name}`
        : '@you';
    const created = {
      id: `post-${Date.now()}`,
      author: handle,
      time: 'Just now',
      avatar: currentUser?.avatar || avatarDefault,
      headline,
      image: newImage || feedWarmPost,
      liked: false,
    };
    setPosts((prev) => [created, ...prev]);
    setNewHeadline('');
    setNewImage('');
    setCreateOpen(false);
    showNotice('Post published!');
  };

  return (
    <section className="feed-screen" aria-label="Home feed">
      {/* Scrollable Feed Content */}
      <div className="feed-scroll">
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
                    alt={post.author}
                    className="feed-author-avatar"
                  />
                  <div className="feed-author-meta">
                    <span className="feed-author-name">{post.author}</span>
                    <span className="feed-author-time">{post.time}</span>
                  </div>
                </button>

                <h2 className="feed-card-headline">{post.headline}</h2>
              </div>

              <div className="feed-card-bottom">
                <form
                  className="feed-comment-pill"
                  onSubmit={(e) => handleCommentSubmit(e, post.id)}
                >
                  <CommentBubbleIcon />
                  <input
                    type="text"
                    className="feed-comment-input"
                    placeholder="Add comment"
                    value={commentDrafts[post.id] || ''}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                  />
                </form>

                <button
                  type="button"
                  className="feed-heart-btn"
                  onClick={() => toggleLike(post.id)}
                  aria-label={post.liked ? 'Unlike post' : 'Like post'}
                  aria-pressed={post.liked}
                >
                  <HeartIcon filled={post.liked} />
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

      {postedNotice && (
        <div className="feed-toast" role="status">
          {postedNotice}
        </div>
      )}
    </section>
  );
}
