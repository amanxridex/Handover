import React, { useCallback, useEffect, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import {
  fetchBrandDealApplicants,
  fetchProfileBrandDeals,
  getCachedProfileBrandDeals,
  setBrandDealStatus,
} from '../services/dealsService';
import {
  fetchUserProfileOverview,
  getCachedProfileOverview,
} from '../services/feedService';
import {
  checkIsFollowingProfile,
  fetchPublicProfileByUsername,
  toggleFollowProfile,
} from '../services/profileService';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/nativeBridge';
import BottomNav from './BottomNav';
import BrandLogoMark from './BrandLogoMark';
import { BackTriangleIcon, CloseXIcon } from './Icons';

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
  isPublicView = false,
  viewedUsername = '',
  profileUser = null,
  onMessageUser,
  onOpenUserProfile,
  onOpenDeal,
  onEditDeal,
  onOpenCreateDeal,
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
  const [resolvedPublicUser, setResolvedPublicUser] = useState(profileUser);
  const [loadingProfile, setLoadingProfile] = useState(
    Boolean(isPublicView && !profileUser && viewedUsername)
  );
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const initialCachedOverview = getCachedProfileOverview(
    isPublicView ? profileUser?.id : currentUser?.id,
    isPublicView ? viewedUsername : currentUser?.username
  );
  const initialCachedDeals = getCachedProfileBrandDeals(
    isPublicView ? profileUser?.id : currentUser?.id
  );
  const [loadingOverview, setLoadingOverview] = useState(!initialCachedOverview);
  const [overview, setOverview] = useState(
    initialCachedOverview || {
      posts: [],
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    }
  );
  const [contentTab, setContentTab] = useState('posts'); // posts | deals
  const [profileDeals, setProfileDeals] = useState(initialCachedDeals || []);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [togglingDealId, setTogglingDealId] = useState(null);
  const [requestsDeal, setRequestsDeal] = useState(null);
  const [requestsList, setRequestsList] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (!isPublicView) {
      setResolvedPublicUser(null);
      setLoadingProfile(false);
      return;
    }
    if (profileUser && profileUser.username?.toLowerCase() === viewedUsername?.toLowerCase()) {
      setResolvedPublicUser(profileUser);
    }
    const targetHandle = profileUser?.username || viewedUsername;
    if (!targetHandle) {
      setLoadingProfile(false);
      return;
    }

    let active = true;
    if (!profileUser) setLoadingProfile(true);
    fetchPublicProfileByUsername(targetHandle).then((fetched) => {
      if (!active) return;
      if (fetched) {
        setResolvedPublicUser(fetched);
      }
      setLoadingProfile(false);
    });
    return () => {
      active = false;
    };
  }, [isPublicView, viewedUsername, profileUser]);

  const activeProfileId = isPublicView
    ? resolvedPublicUser?.id || profileUser?.id || null
    : currentUser?.id;
  const activeUsername = isPublicView
    ? resolvedPublicUser?.username || profileUser?.username || viewedUsername || 'member'
    : currentUser?.username?.trim() || 'member';

  const displayName = isPublicView
    ? resolvedPublicUser?.fullName || profileUser?.fullName || `@${activeUsername}`
    : currentUser?.name?.trim() || 'Handover Member';
  const username = activeUsername;
  const avatarSrc = isPublicView
    ? resolvedPublicUser?.avatar || profileUser?.avatar || avatarDefault
    : currentUser?.avatar || avatarDefault;
  const isFounder = isPublicView
    ? (resolvedPublicUser?.role || profileUser?.role) === 'founder'
    : roleDetails?.role === 'founder';
  const activeCompanyName = isPublicView
    ? resolvedPublicUser?.companyName || profileUser?.companyName || ''
    : roleDetails?.companyName || '';
  const activeCompanyLogo = isPublicView
    ? resolvedPublicUser?.companyLogoUrl || profileUser?.companyLogoUrl || ''
    : roleDetails?.companyLogoUrl || '';

  const bioText = isPublicView
    ? resolvedPublicUser?.bio?.trim() ||
      (isFounder
        ? [
            activeCompanyName ? `Founder of ${activeCompanyName}` : 'Founder',
            resolvedPublicUser?.sector,
            resolvedPublicUser?.companyPitch,
          ]
            .filter(Boolean)
            .join(' · ')
        : Array.isArray(resolvedPublicUser?.contentTypes) &&
            resolvedPublicUser.contentTypes.length > 0
          ? `Creator · ${resolvedPublicUser.contentTypes.join(', ')}`
          : '')
    : currentUser?.bio?.trim() ||
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
    if (!activeProfileId && !activeUsername) return;
    let active = true;
    const warm = getCachedProfileOverview(activeProfileId, activeUsername);
    if (warm) {
      setOverview(warm);
      setLoadingOverview(false);
    } else {
      setLoadingOverview(true);
    }
    fetchUserProfileOverview(activeProfileId, activeUsername).then((data) => {
      if (!active) return;
      setOverview(data);
      setLoadingOverview(false);
    });
    return () => {
      active = false;
    };
  }, [activeProfileId, activeUsername]);

  useEffect(() => {
    if (!isPublicView || !activeProfileId) {
      setIsFollowing(false);
      return;
    }
    let active = true;
    checkIsFollowingProfile(activeProfileId).then((following) => {
      if (!active) return;
      setIsFollowing(following);
    });
    return () => {
      active = false;
    };
  }, [isPublicView, activeProfileId]);

  const loadProfileDeals = useCallback(async () => {
    if (!activeProfileId) {
      setProfileDeals([]);
      return;
    }
    const warmDeals = getCachedProfileBrandDeals(activeProfileId);
    if (warmDeals) {
      setProfileDeals(warmDeals);
      setLoadingDeals(false);
    } else {
      setLoadingDeals(true);
    }
    const list = await fetchProfileBrandDeals(activeProfileId);
    setProfileDeals(Array.isArray(list) ? list : []);
    setLoadingDeals(false);
  }, [activeProfileId]);

  useEffect(() => {
    loadProfileDeals();
  }, [loadProfileDeals]);

  useEffect(() => {
    setContentTab('posts');
    setRequestsDeal(null);
    setRequestsList([]);
  }, [activeProfileId, isPublicView]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 1800);
  };

  const handleToggleDealStatus = async (deal) => {
    if (!deal?.id || togglingDealId) return;
    triggerLightHaptic();
    const nextActive = !deal.isActive;
    setTogglingDealId(deal.id);
    const res = await setBrandDealStatus(deal.id, nextActive);
    setTogglingDealId(null);
    if (!res.ok) {
      showToast(res.error || 'Could not update deal status');
      return;
    }
    triggerSuccessHaptic();
    setProfileDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, isActive: res.isActive } : d))
    );
    showToast(res.isActive ? 'Brand deal opened' : 'Brand deal closed');
  };

  const handleOpenRequests = async (deal) => {
    if (!deal?.id) return;
    triggerLightHaptic();
    setRequestsDeal(deal);
    setRequestsList([]);
    setLoadingRequests(true);
    const res = await fetchBrandDealApplicants(deal.id);
    setRequestsList(Array.isArray(res.applicants) ? res.applicants : []);
    setLoadingRequests(false);
  };

  const handleToggleFollow = async () => {
    if (!activeProfileId || followBusy) return;
    triggerLightHaptic();
    const prevFollowing = isFollowing;
    const prevCount = overview.followersCount;

    setFollowBusy(true);
    setIsFollowing(!prevFollowing);
    setOverview((prev) => ({
      ...prev,
      followersCount: Math.max(0, prev.followersCount + (prevFollowing ? -1 : 1)),
    }));

    const res = await toggleFollowProfile(activeProfileId);
    setFollowBusy(false);

    if (!res.ok) {
      setIsFollowing(prevFollowing);
      setOverview((prev) => ({ ...prev, followersCount: prevCount }));
      showToast(res.error || 'Could not update follow');
      return;
    }

    if (res.following) triggerSuccessHaptic();
    setIsFollowing(res.following);
    setOverview((prev) => ({ ...prev, followersCount: res.followersCount }));
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
          aria-label={isPublicView ? 'Go back' : 'Close profile'}
        >
          {isPublicView ? <BackTriangleIcon /> : <CloseXIcon />}
        </button>

        {isPublicView ? (
          <button
            type="button"
            className="profile-circle-btn"
            onClick={handleCopyHandle}
            aria-label={`Copy handle @${username}`}
            title="Copy handle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect
                x="9"
                y="9"
                width="11"
                height="11"
                rx="2.5"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <path
                d="M6 15H5C3.9 15 3 14.1 3 13V5C3 3.9 3.9 3 5 3H13C14.1 3 15 3.9 15 5V6"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
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
        )}
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
              <h1 className="profile-name">
                {loadingProfile ? 'Loading...' : displayName}
              </h1>
              {showBadges &&
                isFounder &&
                (activeCompanyLogo ? (
                  <img
                    src={activeCompanyLogo}
                    alt={activeCompanyName || 'Company badge'}
                    title={
                      activeCompanyName
                        ? `Founder of ${activeCompanyName}`
                        : 'Founder'
                    }
                    className="profile-founder-badge"
                  />
                ) : activeCompanyName ? (
                  <span
                    className="profile-founder-monogram"
                    title={`Founder of ${activeCompanyName}`}
                  >
                    {activeCompanyName.trim().charAt(0).toUpperCase()}
                  </span>
                ) : null)}
            </div>
            <p className="profile-handle">@{username}</p>

            {isPublicView ? (
              <div className="profile-actions">
                <button
                  type="button"
                  className={`profile-follow-btn ${
                    isFollowing ? 'following' : ''
                  }`}
                  onClick={handleToggleFollow}
                  disabled={followBusy || !activeProfileId}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>

                <button
                  type="button"
                  className="profile-msg-pill-btn"
                  onClick={() => {
                    triggerLightHaptic();
                    const peer = resolvedPublicUser ||
                      profileUser || {
                        id: activeProfileId,
                        fullName: displayName,
                        username,
                        avatar: avatarSrc,
                      };
                    onMessageUser?.(peer);
                  }}
                  disabled={!activeProfileId}
                >
                  Message
                </button>
              </div>
            ) : (
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
            )}

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
                {bioText ||
                  (isPublicView
                    ? `${displayName} hasn't added a bio yet.`
                    : 'No bio yet — customize your profile in Settings.')}
              </p>
            </div>

            {(isFounder || profileDeals.length > 0) && (
              <div className="profile-content-tabs" role="tablist" aria-label="Profile sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentTab === 'posts'}
                  className={`profile-content-tab ${contentTab === 'posts' ? 'active' : ''}`}
                  onClick={() => {
                    triggerLightHaptic();
                    setContentTab('posts');
                  }}
                >
                  Feed Posts ({overview.posts.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentTab === 'deals'}
                  className={`profile-content-tab ${contentTab === 'deals' ? 'active' : ''}`}
                  onClick={() => {
                    triggerLightHaptic();
                    setContentTab('deals');
                  }}
                >
                  Brand Deals ({profileDeals.length})
                </button>
              </div>
            )}

            {contentTab === 'deals' && (isFounder || profileDeals.length > 0) ? (
              loadingDeals ? (
                <div className="profile-empty-state">
                  <p className="profile-empty-sub">Loading brand deals...</p>
                </div>
              ) : profileDeals.length === 0 ? (
                <div className="profile-empty-state">
                  <div className="profile-empty-title">No brand deals yet</div>
                  <p className="profile-empty-sub">
                    {isPublicView
                      ? `${displayName} has no active brand deals right now.`
                      : 'Create a brand deal for creators with objectives, brief & payout.'}
                  </p>
                  {!isPublicView && isFounder && onOpenCreateDeal && (
                    <button
                      type="button"
                      className="profile-empty-cta"
                      onClick={() => {
                        triggerLightHaptic();
                        onOpenCreateDeal();
                      }}
                    >
                      Create Brand Deal
                    </button>
                  )}
                </div>
              ) : (
                <div className="profile-deals-stack">
                  {profileDeals.map((deal) => (
                    <div key={deal.id} className="profile-deal-card">
                      <button
                        type="button"
                        className="profile-deal-main"
                        onClick={() => {
                          triggerLightHaptic();
                          onOpenDeal?.(deal);
                        }}
                      >
                        <div className="profile-deal-logo-box">
                          <BrandLogoMark
                            logoKey={deal.logoKey}
                            logoUrl={deal.brandLogoUrl}
                            name={deal.brandName}
                          />
                        </div>
                        <div className="profile-deal-info">
                          <div className="profile-deal-top-row">
                            <span className="profile-deal-title">{deal.headline}</span>
                            <span
                              className={`profile-deal-status ${
                                deal.isActive ? 'is-open' : 'is-closed'
                              }`}
                            >
                              {deal.isActive ? 'Open' : 'Closed'}
                            </span>
                          </div>
                          <div className="profile-deal-meta">
                            {deal.brandName} · {deal.category} · {deal.paymentAmount}
                          </div>
                        </div>
                      </button>

                      {!isPublicView && (
                        <div className="profile-deal-actions">
                          <button
                            type="button"
                            className="profile-deal-btn is-requests"
                            onClick={() => handleOpenRequests(deal)}
                          >
                            Requests ({deal.applicantCount ?? 0})
                          </button>
                          <button
                            type="button"
                            className="profile-deal-btn"
                            onClick={() => {
                              triggerLightHaptic();
                              onEditDeal?.(deal);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`profile-deal-btn ${
                              deal.isActive ? 'is-close' : 'is-reopen'
                            }`}
                            onClick={() => handleToggleDealStatus(deal)}
                            disabled={togglingDealId === deal.id}
                          >
                            {togglingDealId === deal.id
                              ? '...'
                              : deal.isActive
                                ? 'Close Deal'
                                : 'Open Deal'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : loadingOverview ? (
              <div className="profile-empty-state">
                <p className="profile-empty-sub">Loading posts...</p>
              </div>
            ) : overview.posts.length === 0 ? (
              <div className="profile-empty-state">
                <div className="profile-empty-title">No posts yet</div>
                <p className="profile-empty-sub">
                  {isPublicView
                    ? `${displayName} hasn't posted anything yet.`
                    : "You haven't posted anything yet. Share your first post from the Home feed and it will show up right here."}
                </p>
                <button
                  type="button"
                  className="profile-empty-cta"
                  onClick={() => {
                    triggerLightHaptic();
                    onClose();
                  }}
                >
                  {isPublicView ? 'Go Back' : 'Back to Home Feed'}
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

      {requestsDeal && (
        <div
          className="deal-applicants-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Creator requests for ${requestsDeal.headline}`}
          onClick={() => setRequestsDeal(null)}
        >
          <div
            className="deal-applicants-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="deal-applicants-header">
              <div>
                <h2 className="deal-applicants-title">Creator Requests</h2>
                <p className="deal-applicants-sub">
                  {requestsDeal.headline} · {requestsDeal.paymentAmount}
                </p>
              </div>
              <button
                type="button"
                className="feed-create-close"
                onClick={() => setRequestsDeal(null)}
                aria-label="Close requests"
              >
                <CloseXIcon />
              </button>
            </div>

            <div className="deal-applicants-list">
              {loadingRequests ? (
                <div className="profile-empty-state">
                  <p className="profile-empty-sub">Loading creator requests...</p>
                </div>
              ) : requestsList.length === 0 ? (
                <div className="profile-empty-state">
                  <span className="profile-empty-title">No requests yet</span>
                  <p className="profile-empty-sub">
                    When creators submit interest on this brand deal, they will
                    appear here.
                  </p>
                </div>
              ) : (
                requestsList.map((creator) => (
                  <div key={creator.applicationId} className="deal-applicant-row">
                    <button
                      type="button"
                      className="deal-applicant-person"
                      onClick={() => {
                        triggerLightHaptic();
                        setRequestsDeal(null);
                        if (creator.username && onOpenUserProfile) {
                          onOpenUserProfile(creator.username);
                        }
                      }}
                    >
                      <img
                        src={creator.avatar || avatarDefault}
                        alt={creator.fullName}
                        className="deal-applicant-avatar"
                      />
                      <div className="deal-applicant-copy">
                        <div className="deal-applicant-name">
                          {creator.fullName}
                        </div>
                        <div className="deal-applicant-handle">
                          @{creator.username}
                          {Array.isArray(creator.contentTypes) &&
                          creator.contentTypes.length > 0
                            ? ` · ${creator.contentTypes.slice(0, 2).join(', ')}`
                            : ''}
                        </div>
                      </div>
                    </button>

                    <div className="deal-applicant-actions">
                      {creator.username && onOpenUserProfile && (
                        <button
                          type="button"
                          className="deal-applicant-btn"
                          onClick={() => {
                            triggerLightHaptic();
                            setRequestsDeal(null);
                            onOpenUserProfile(creator.username);
                          }}
                        >
                          Profile
                        </button>
                      )}
                      {onMessageUser && (
                        <button
                          type="button"
                          className="deal-applicant-btn is-primary"
                          onClick={() => {
                            triggerLightHaptic();
                            setRequestsDeal(null);
                            onMessageUser({
                              id: creator.id,
                              fullName: creator.fullName,
                              name: creator.fullName,
                              username: creator.username,
                              avatar: creator.avatar || avatarDefault,
                            });
                          }}
                        >
                          Message
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
