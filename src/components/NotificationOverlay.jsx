import React from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import { BellIcon } from './Icons';

export function NotificationPermissionPrompt({
  open,
  mode = 'permission',
  busy = false,
  onAllow,
  onDismiss,
}) {
  if (!open) return null;

  const isIosInstall = mode === 'ios-install';

  return (
    <div
      className="notif-perm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-perm-title"
    >
      <div className="notif-perm-card">
        <div className="notif-perm-icon-ring" aria-hidden="true">
          <BellIcon />
        </div>
        <h2 id="notif-perm-title" className="notif-perm-title">
          {isIosInstall
            ? 'Enable iOS Push Notifications'
            : 'Turn on notifications'}
        </h2>
        <p className="notif-perm-desc">
          {isIosInstall
            ? 'To receive real-time APNs alerts on iPhone & iPad for messages, likes, comments, and followers: tap the Share button in Safari, choose "Add to Home Screen", then open Handover from your Home Screen.'
            : 'Allow priority real-time alerts so you know the millisecond someone likes your post, comments, follows you, or sends a message.'}
        </p>

        <div className="notif-perm-actions">
          {isIosInstall ? (
            <button
              type="button"
              className="notif-perm-allow-btn"
              onClick={onDismiss}
            >
              Got it
            </button>
          ) : (
            <>
              <button
                type="button"
                className="notif-perm-allow-btn"
                onClick={onAllow}
                disabled={busy}
              >
                {busy ? 'Enabling...' : 'Allow Notifications'}
              </button>
              <button
                type="button"
                className="notif-perm-later-btn"
                onClick={onDismiss}
                disabled={busy}
              >
                Not now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LiveNotificationBanner({
  alert,
  onTap,
  onDismiss,
}) {
  if (!alert) return null;

  const messages =
    Array.isArray(alert.messages) && alert.messages.length > 0
      ? alert.messages
      : [alert.body].filter(Boolean);
  const count = alert.count || messages.length;
  const isMulti = messages.length > 1;

  return (
    <div className="live-notif-banner-wrap" role="status" aria-live="polite">
      <div
        key={alert.bumpKey || alert.id || alert.tag}
        className={`live-notif-banner ${isMulti ? 'is-stacked' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => onTap?.(alert)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTap?.(alert);
          }
        }}
      >
        <div className="live-notif-avatar-wrap">
          <img
            src={alert.avatar || avatarDefault}
            alt={alert.title}
            className="live-notif-avatar"
          />
          {count > 1 && (
            <span
              className="live-notif-badge-bubble"
              aria-label={`${count} messages`}
            >
              {count}
            </span>
          )}
        </div>

        <div className="live-notif-copy">
          <div className="live-notif-top-row">
            <span className="live-notif-title">{alert.title}</span>
            <span className={`live-notif-pill is-${alert.kind || 'info'}`}>
              {count > 1 ? `${count} new messages` : alert.label || 'Message'}
            </span>
          </div>

          <div className="live-notif-messages-list">
            {messages.slice(-3).map((text, idx, arr) => {
              const isLatest = idx === arr.length - 1;
              return (
                <div
                  key={`${idx}-${text}`}
                  className={`live-notif-msg-item ${
                    isLatest ? 'is-latest' : 'is-prev'
                  }`}
                >
                  {isMulti && <span className="live-notif-msg-bullet">•</span>}
                  <span className="live-notif-msg-text">{text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="live-notif-close"
          aria-label="Dismiss notification"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
