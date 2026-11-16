import React, { useState } from 'react';
import avatarJacob from '../assets/avatar-jacob.jpg';
import creation3 from '../assets/creation-3.jpg';
import creation5 from '../assets/creation-5.jpg';
import creation6 from '../assets/creation-6.jpg';
import feedPillowFight from '../assets/feed-pillow-fight.jpg';
import feedWarmPost from '../assets/feed-warm-post.jpg';
import profileHero from '../assets/profile-hero.jpg';
import { triggerLightHaptic } from '../utils/nativeBridge';
import {
  BellIcon,
  ChevronDownIcon,
  CommentBubbleIcon,
  HeartIcon,
  PlusIcon,
  SearchIcon,
} from './Icons';

const FEED_CATEGORIES = ['All', 'Groups', 'Personal', 'Work', 'Public'];

const STORY_CAPSULES = [
  {
    id: 'squad-1',
    avatars: [profileHero, creation5],
    badge: 37,
    featured: true,
  },
  {
    id: 'squad-2',
    avatars: [creation3, creation6],
    badge: 4,
    featured: false,
  },
  {
    id: 'squad-3',
    avatars: [avatarJacob, feedWarmPost],
    badge: 86,
    featured: false,
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
    category: 'Personal',
    liked: false,
  },
  {
    id: 'skyline-sunset',
    author: '@Olivia Beits',
    time: '9h ago',
    avatar: profileHero,
    headline: 'Golden hour above the skyline with my favourite crew',
    image: feedWarmPost,
    category: 'Groups',
    liked: false,
  },
  {
    id: 'courtside-dusk',
    author: '@Jacob Jones',
    time: '1d ago',
    avatar: avatarJacob,
    headline: 'Courtside dusk sessions & twilight match point',
    image: creation3,
    category: 'Public',
    liked: false,
  },
];

export default function HomeFeedScreen({
  onOpenSearch,
  onOpenProfile,
  tabs,
  activeTab,
  onSelectTab,
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeCapsule, setActiveCapsule] = useState('squad-1');
  const [feedMode, setFeedMode] = useState('Feed');
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [postedNotice, setPostedNotice] = useState('');

  const visiblePosts =
    selectedCategory === 'All'
      ? posts
      : posts.filter((p) => p.category === selectedCategory);
  const displayPosts = visiblePosts.length > 0 ? visiblePosts : posts;

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
    setPostedNotice('Comment added');
    setTimeout(() => setPostedNotice(''), 1600);
  };

  return (
    <section className="feed-screen" aria-label="Home feed">
      {/* Scrollable Feed Content */}
      <div className="feed-scroll">
        {/* Top Bar */}
        <header className="feed-top-bar">
          <button
            type="button"
            className="feed-icon-btn"
            onClick={() => {
              triggerLightHaptic();
              onOpenSearch();
            }}
            aria-label="Open search"
          >
            <SearchIcon />
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
              setPostedNotice('6 new notifications');
              setTimeout(() => setPostedNotice(''), 1600);
            }}
            aria-label="Notifications (6 unread)"
          >
            <BellIcon />
            <span className="feed-notif-badge">6</span>
          </button>
        </header>

        {/* Category Text Tabs + Plus Button */}
        <div className="feed-tabs-row">
          <nav className="feed-tabs-scroll" aria-label="Feed filters">
            {FEED_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`feed-tab-link ${
                  selectedCategory === cat ? 'active' : ''
                }`}
                onClick={() => {
                  triggerLightHaptic();
                  setSelectedCategory(cat);
                }}
              >
                {cat}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="feed-plus-btn"
            onClick={() => {
              triggerLightHaptic();
              setPostedNotice('Create post coming soon');
              setTimeout(() => setPostedNotice(''), 1600);
            }}
            aria-label="Create post"
          >
            <PlusIcon />
          </button>
        </div>

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
          {displayPosts.map((post) => (
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

      {/* Floating Dark Glass Bottom Navigation Bar */}
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

      {postedNotice && (
        <div className="feed-toast" role="status">
          {postedNotice}
        </div>
      )}
    </section>
  );
}
