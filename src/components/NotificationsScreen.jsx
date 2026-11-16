import React, { useMemo, useRef, useState } from 'react';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { BackChevronIcon, CommentBubbleIcon, HeartIcon } from './Icons';

const FILTERS = ['All', 'Followers', 'Likes', 'Comments'];

function SlideToFollow({ actorName, isFollowing, onFollow }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const maxTravelRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    if (isFollowing) return;
    const track = trackRef.current;
    if (!track) return;
    const thumbSize = 36;
    const padding = 4;
    maxTravelRef.current = Math.max(0, track.clientWidth - thumbSize - padding * 2);
    startXRef.current = e.clientX;
    draggingRef.current = true;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current || isFollowing) return;
    const delta = e.clientX - startXRef.current;
    const clamped = Math.max(0, Math.min(delta, maxTravelRef.current));
    setDragX(clamped);
  };

  const finishDrag = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    const maxTravel = maxTravelRef.current;
    const ratio = maxTravel > 0 ? dragX / maxTravel : 0;

    if (ratio >= 0.65) {
      triggerLightHaptic();
      setDragX(0);
      onFollow();
    } else {
      setDragX(0);
    }
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  if (isFollowing) {
    return (
      <div className="slide-follow-confirmed" aria-live="polite">
        <span className="slide-follow-check">✓</span>
        <span>Following {actorName}</span>
      </div>
    );
  }

  const progressPct =
    maxTravelRef.current > 0
      ? Math.min(100, Math.round((dragX / maxTravelRef.current) * 100))
      : 0;

  return (
    <div
      ref={trackRef}
      className="slide-follow-track"
      role="slider"
      aria-label={`Slide to follow ${actorName}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPct}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerLightHaptic();
          onFollow();
        }
      }}
    >
      <div
        className="slide-follow-fill"
        style={{
          width: dragX > 0 ? `${dragX + 40}px` : '0px',
          transition: isDragging ? 'none' : 'width 0.25s ease',
        }}
      />

      <span
        className="slide-follow-label"
        style={{
          opacity: Math.max(0, 1 - progressPct / 65),
        }}
      >
        Slide to follow <span className="slide-follow-arrows">›››</span>
      </span>

      <button
        type="button"
        className="slide-follow-thumb"
        style={{
          transform: `translate3d(${dragX}px, 0, 0)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        aria-label={`Drag right to follow ${actorName}`}
      >
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M4 9H14M10 5L14 9L10 13"
            stroke="#061437"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export default function NotificationsScreen({
  notifications,
  onBack,
  onFollowBack,
  onMarkAllRead,
  onMarkRead,
  onOpenProfile,
}) {
  const [filter, setFilter] = useState('All');
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'All') return notifications;
    if (filter === 'Followers') return notifications.filter((n) => n.type === 'follow');
    if (filter === 'Likes') return notifications.filter((n) => n.type === 'like');
    return notifications.filter((n) => n.type === 'comment');
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleReplySubmit = (e, item) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    triggerLightHaptic();
    onMarkRead(item.id);
    setReplyText('');
    setReplyTargetId(null);
    showToast(`Replied to ${item.actor}`);
  };

  return (
    <section className="notif-screen" aria-label="Notifications">
      <div className="notif-scroll">
        {/* Top Bar */}
        <header className="notif-header">
          <button
            type="button"
            className="notif-back-btn"
            onClick={() => {
              triggerLightHaptic();
              onBack();
            }}
            aria-label="Back to Home Feed"
          >
            <BackChevronIcon />
          </button>

          <div className="notif-header-center">
            <h1 className="notif-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="notif-count-pill">{unreadCount} new</span>
            )}
          </div>

          <button
            type="button"
            className="notif-mark-btn"
            onClick={() => {
              triggerLightHaptic();
              onMarkAllRead();
              showToast('All caught up');
            }}
          >
            Read all
          </button>
        </header>

        {/* Filter Pills */}
        <nav className="notif-filters" aria-label="Notification filters">
          {FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`notif-filter-pill ${filter === tab ? 'active' : ''}`}
              onClick={() => {
                triggerLightHaptic();
                setFilter(tab);
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Notifications List */}
        <div className="notif-list">
          {filtered.map((item) => (
            <article
              key={item.id}
              className={`notif-card ${item.unread ? 'unread' : ''}`}
              onClick={() => onMarkRead(item.id)}
            >
              <div className="notif-card-main">
                <button
                  type="button"
                  className="notif-avatar-wrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerLightHaptic();
                    onOpenProfile();
                  }}
                  aria-label={`View ${item.actor} profile`}
                >
                  <img
                    src={item.avatar}
                    alt={item.actor}
                    className="notif-avatar"
                  />
                  <span className={`notif-type-badge ${item.type}`} aria-hidden="true">
                    {item.type === 'like' && <HeartIcon filled />}
                    {item.type === 'comment' && <CommentBubbleIcon />}
                    {item.type === 'follow' && (
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="5.2" r="2.7" fill="#FFFFFF" />
                        <path
                          d="M3.2 13.5C4.2 11.2 6 10.2 8 10.2C10 10.2 11.8 11.2 12.8 13.5"
                          stroke="#FFFFFF"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>

                <div className="notif-card-copy">
                  {item.type === 'follow' && (
                    <>
                      <p className="notif-card-text">
                        <strong>{item.actor}</strong> started following you
                        <span className="notif-time"> · {item.time}</span>
                      </p>
                      <p className="notif-follow-prompt">
                        {item.followingBack
                          ? `You and ${item.actor} follow each other.`
                          : 'Do you want to follow them?'}
                      </p>
                    </>
                  )}

                  {item.type === 'like' && (
                    <p className="notif-card-text">
                      <strong>{item.actor}</strong> liked your post{' '}
                      <span className="notif-post-ref">&ldquo;{item.postTitle}&rdquo;</span>
                      <span className="notif-time"> · {item.time}</span>
                    </p>
                  )}

                  {item.type === 'comment' && (
                    <>
                      <p className="notif-card-text">
                        <strong>{item.actor}</strong> commented on your post
                        <span className="notif-time"> · {item.time}</span>
                      </p>
                      <p className="notif-comment-quote">&ldquo;{item.comment}&rdquo;</p>
                      <button
                        type="button"
                        className="notif-reply-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerLightHaptic();
                          setReplyTargetId((prev) =>
                            prev === item.id ? null : item.id
                          );
                        }}
                      >
                        {replyTargetId === item.id ? 'Cancel' : 'Reply'}
                      </button>
                    </>
                  )}
                </div>

                {item.postThumb && (
                  <img
                    src={item.postThumb}
                    alt=""
                    className="notif-post-thumb"
                  />
                )}
              </div>

              {item.type === 'follow' && (
                <div
                  className="notif-slide-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SlideToFollow
                    actorName={item.actor}
                    isFollowing={item.followingBack}
                    onFollow={() => {
                      onFollowBack(item.id);
                      showToast(`You are now following ${item.actor}`);
                    }}
                  />
                </div>
              )}

              {item.type === 'comment' && replyTargetId === item.id && (
                <form
                  className="notif-reply-form"
                  onSubmit={(e) => handleReplySubmit(e, item)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    className="notif-reply-input"
                    placeholder={`Reply to ${item.actor}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="notif-reply-send">
                    Send
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </div>

      {toast && (
        <div className="feed-toast" role="status">
          {toast}
        </div>
      )}
    </section>
  );
}
