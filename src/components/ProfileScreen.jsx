import React, { useState } from 'react';
import creationLeft from '../assets/creation-left.jpg';
import creationRight from '../assets/creation-right.jpg';
import creation3 from '../assets/creation-3.jpg';
import creation4 from '../assets/creation-4.jpg';
import creation5 from '../assets/creation-5.jpg';
import creation6 from '../assets/creation-6.jpg';
import profileHero from '../assets/profile-hero.jpg';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { CloseXIcon, MessageBubbleIcon, MoreDotsIcon } from './Icons';

const FEATURED_POSTS = [
  {
    id: 'court-heels',
    image: creationLeft,
    alt: 'Editorial tennis court footwear creation',
    title: 'Court Heels · Drop 04',
    tag: 'Footwear',
  },
  {
    id: 'jersey-twelve',
    image: creationRight,
    alt: 'Editorial tennis court apparel creation',
    title: 'Varsity 12 · Twilight',
    tag: 'Apparel',
  },
];

const MORE_POSTS = [
  {
    id: 'bench-racket',
    image: creation3,
    alt: 'Model seated on green court bench holding vintage tennis racket',
    title: 'Courtside Dusk',
    tag: 'Editorial',
  },
  {
    id: 'still-life',
    image: creation4,
    alt: 'Retro tennis sneakers, cherry-red bag and tennis balls on green court',
    title: 'Match Point Kit',
    tag: 'Objects',
  },
  {
    id: 'coastal-profile',
    image: creation5,
    alt: 'Coastal cliffside sunlight editorial portrait with palm fronds',
    title: 'Mediterranean Blue',
    tag: 'Campaign',
  },
  {
    id: 'fence-walk',
    image: creation6,
    alt: 'Model walking past tennis court chain-link fence at dusk',
    title: 'Baseline Motion',
    tag: 'Lookbook',
  },
];

export default function ProfileScreen({
  onClose,
  selectedPost,
  onSelectPost,
  onClosePost,
  onResetOnboarding,
  onLogout,
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [messageToast, setMessageToast] = useState(false);

  const handleFollow = () => {
    triggerLightHaptic();
    setIsFollowing((prev) => !prev);
  };

  const handleMessage = () => {
    triggerLightHaptic();
    setMessageToast(true);
    setTimeout(() => setMessageToast(false), 1800);
  };

  const handleOpenPost = (post) => {
    triggerLightHaptic();
    onSelectPost(post);
  };

  return (
    <section className="profile-screen" aria-label="Olivia Beits profile">
      {/* Pinned Top Controls */}
      <header className="profile-top-bar">
        <button
          type="button"
          className="profile-circle-btn"
          onClick={() => {
            triggerLightHaptic();
            onClose();
          }}
          aria-label="Close profile"
        >
          <CloseXIcon />
        </button>

        <div className="profile-top-right">
          {onLogout && (
            <button
              type="button"
              className="profile-logout-pill"
              onClick={() => {
                triggerLightHaptic();
                onLogout();
              }}
            >
              Log out
            </button>
          )}

          <div className="profile-more-wrap">
            <button
              type="button"
              className="profile-circle-btn"
              onClick={() => {
                triggerLightHaptic();
                setMenuOpen((prev) => !prev);
              }}
              aria-label="More options"
              aria-expanded={menuOpen}
            >
              <MoreDotsIcon />
            </button>

            {menuOpen && (
              <div className="profile-more-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="profile-more-item"
                  onClick={() => {
                    triggerLightHaptic();
                    setMenuOpen(false);
                  }}
                >
                  Share profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="profile-more-item"
                  onClick={() => {
                    triggerLightHaptic();
                    setMenuOpen(false);
                  }}
                >
                  Copy handle (@oliviia_be)
                </button>
                {(onLogout || onResetOnboarding) && (
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-more-item is-danger"
                    onClick={() => {
                      triggerLightHaptic();
                      setMenuOpen(false);
                      (onLogout || onResetOnboarding)();
                    }}
                  >
                    Log out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Profile Feed */}
      <div className="profile-scroll">
        {/* Hero Portrait + Progressive Blur Scrim */}
        <div className="profile-backdrop" aria-hidden="true">
          <img src={profileHero} alt="" className="profile-hero-img" />
          <img src={profileHero} alt="" className="profile-hero-blur" />
          <div className="profile-scrim" />
        </div>

        {/* First Fold — Matches exact reference screen */}
        <div className="profile-first-fold">
          <div className="profile-spacer" />

          <div className="profile-body">
            <h1 className="profile-name">Olivia Beits</h1>
            <p className="profile-handle">@oliviia_be</p>

            <div className="profile-actions">
              <button
                type="button"
                className={`profile-follow-btn ${isFollowing ? 'following' : ''}`}
                onClick={handleFollow}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>

              <button
                type="button"
                className="profile-msg-btn"
                onClick={handleMessage}
                aria-label="Message Olivia Beits"
              >
                <MessageBubbleIcon />
              </button>
            </div>

            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-value">252</div>
                <div className="profile-stat-label">Following</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">24K</div>
                <div className="profile-stat-label">Followers</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">732</div>
                <div className="profile-stat-label">Creations</div>
              </div>
            </div>

            <div className="profile-bio-card">
              <p className="profile-bio-text">
                Designers focused on creating impactful, user-cantered digital
                experiences and branding.
              </p>
            </div>

            <div className="profile-gallery">
              {FEATURED_POSTS.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="profile-gallery-card"
                  onClick={() => handleOpenPost(post)}
                  aria-label={post.title}
                >
                  <img
                    src={post.image}
                    alt={post.alt}
                    className="profile-gallery-img"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Scrollable Creations Grid */}
        <div className="profile-more-posts">
          <div className="profile-gallery">
            {MORE_POSTS.map((post) => (
              <button
                key={post.id}
                type="button"
                className="profile-gallery-card profile-gallery-card-tall"
                onClick={() => handleOpenPost(post)}
                aria-label={post.title}
              >
                <img
                  src={post.image}
                  alt={post.alt}
                  className="profile-gallery-img"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {messageToast && (
        <div className="profile-toast" role="status">
          Direct message ready for @oliviia_be
        </div>
      )}

      {selectedPost && (
        <div
          className="post-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={selectedPost.title}
          onClick={onClosePost}
        >
          <div className="post-modal-card" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPost.image}
              alt={selectedPost.alt}
              className="post-modal-img"
            />
            <div className="post-modal-meta">
              <div>
                <div className="post-modal-title">{selectedPost.title}</div>
                <div className="post-modal-tag">{selectedPost.tag} · @oliviia_be</div>
              </div>
              <button
                type="button"
                className="post-modal-close"
                onClick={onClosePost}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
