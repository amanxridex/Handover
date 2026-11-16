import React, { useEffect, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import { fetchUserProfileOverview } from '../services/feedService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import BottomNav from './BottomNav';
import { CloseXIcon } from './Icons';

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="1.9" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.79 1.02 1.51 1.08H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="#FFFFFF"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function ProfileScreen({
  currentUser,
  roleDetails,
  showBadges = true,
  onClose,
  selectedPost,
  onSelectPost,
  onClosePost,
  onOpenSettings,
  tabs,
  activeTab,
  onSelectTab,
}) {
  const [toastMsg, setToastMsg] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overview, setOverview] = useState({
    posts: [],
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  });

  const displayName = currentUser?.name?.trim() || 'Handover Member';
  const username = currentUser?.username?.trim() || 'member';
  const avatarSrc = currentUser?.avatar || avatarDefault;
  const isFounder = roleDetails?.role === 'founder';

  const bioText =
    currentUser?.bio?.trim() ||
    (isFounder
      ? [
          roleDetails?.companyName
            ? `Founder of ${roleDetails.companyName}`
            : 'Founder',
          roleDetails?.sector,
          roleDetails?.companyPitch,
        ]
          .filter(Boolean)
          .join(' · ')
      : Array.isArray(roleDetails?.contentTypes) &&
          roleDetails.contentTypes.length > 0
        ? `Creator · ${roleDetails.contentTypes.join(', ')}`
        : '');

  useEffect(() => {
    let active = true;
    setLoadingOverview(true);
    fetchUserProfileOverview(currentUser?.id, currentUser?.username).then(
      (data) => {
        if (!active) return;
        setOverview(data);
        setLoadingOverview(false);
      }
    );
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.username]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 1800);
  };

  const handleCopyHandle = async () => {
    triggerLightHaptic();
    const handle = `@${username}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(handle);
      }
      showToast(`Copied ${handle}`);
    } catch {
      showToast(handle);
    }
  };

  const handleOpenPost = (post) => {
    triggerLightHaptic();
    onSelectPost(post);
  };

  return (
    <section className="profile-screen" aria-label={`${displayName} profile`}>
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

        <button
          type="button"
          className="profile-circle-btn"
          onClick={() => {
            triggerLightHaptic();
            onOpenSettings?.();
          }}
          aria-label="Open settings"
        >
          <GearIcon />
        </button>
      </header>

      {/* Scrollable Real User Profile */}
      <div className="profile-scroll">
        {/* User Portrait Backdrop + Progressive Blur Scrim */}
        <div className="profile-backdrop" aria-hidden="true">
          <img src={avatarSrc} alt="" className="profile-hero-img" />
          <img src={avatarSrc} alt="" className="profile-hero-blur" />
          <div className="profile-scrim" />
        </div>

        <div className="profile-first-fold">
          <div className="profile-spacer" />

          <div className="profile-body">
            <div className="profile-name-row">
              <h1 className="profile-name">{displayName}</h1>
              {showBadges &&
                isFounder &&
                (roleDetails?.companyLogoUrl ? (
                  <img
                    src={roleDetails.companyLogoUrl}
                    alt={roleDetails.companyName || 'Company badge'}
                    title={
                      roleDetails.companyName
                        ? `Founder of ${roleDetails.companyName}`
                        : 'Founder'
                    }
                    className="profile-founder-badge"
                  />
                ) : roleDetails?.companyName ? (
                  <span
                    className="profile-founder-monogram"
                    title={`Founder of ${roleDetails.companyName}`}
                  >
                    {roleDetails.companyName.trim().charAt(0).toUpperCase()}
                  </span>
                ) : null)}
            </div>
            <p className="profile-handle">@{username}</p>

            <div className="profile-actions">
              {onOpenSettings && (
                <button
                  type="button"
                  className="profile-follow-btn"
                  onClick={() => {
                    triggerLightHaptic();
                    onOpenSettings();
                  }}
                >
                  Settings &amp; Edit
                </button>
              )}

              <button
                type="button"
                className="profile-msg-btn"
                onClick={handleCopyHandle}
                aria-label={`Copy handle @${username}`}
                title="Copy handle"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="9"
                    y="9"
                    width="11"
                    height="11"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M6 15H5C3.9 15 3 14.1 3 13V5C3 3.9 3.9 3 5 3H13C14.1 3 15 3.9 15 5V6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-value">
                  {overview.followingCount}
                </div>
                <div className="profile-stat-label">Following</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">
                  {overview.followersCount}
                </div>
                <div className="profile-stat-label">Followers</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{overview.postsCount}</div>
                <div className="profile-stat-label">Posts</div>
              </div>
            </div>

            <div className="profile-bio-card">
              <p className="profile-bio-text">
                {bioText || 'No bio yet — customize your profile in Settings.'}
              </p>
            </div>

            {loadingOverview ? (
              <div className="profile-empty-state">
                <p className="profile-empty-sub">Loading your posts...</p>
              </div>
            ) : overview.posts.length === 0 ? (
              <div className="profile-empty-state">
                <div className="profile-empty-title">No posts yet</div>
                <p className="profile-empty-sub">
                  You haven&apos;t posted anything yet. Share your first post from
                  the Home feed and it will show up right here.
                </p>
                <button
                  type="button"
                  className="profile-empty-cta"
                  onClick={() => {
                    triggerLightHaptic();
                    onClose();
                  }}
                >
                  Back to Home Feed
                </button>
              </div>
            ) : (
              <div className="profile-gallery">
                {overview.posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    className="profile-gallery-card"
                    onClick={() => handleOpenPost(post)}
                    aria-label={post.title}
                  >
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.alt}
                        className="profile-gallery-img"
                      />
                    ) : (
                      <div className="profile-text-post-tile">{post.title}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {tabs && onSelectTab && (
        <BottomNav
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          dark
          floating
        />
      )}

      {toastMsg && (
        <div className="profile-toast" role="status">
          {toastMsg}
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
            {selectedPost.image && (
              <img
                src={selectedPost.image}
                alt={selectedPost.alt}
                className="post-modal-img"
              />
            )}
            <div className="post-modal-meta">
              <div>
                <div className="post-modal-title">{selectedPost.title}</div>
                <div className="post-modal-tag">
                  @{username} · {selectedPost.likesCount ?? 0} likes ·{' '}
                  {selectedPost.time}
                </div>
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
