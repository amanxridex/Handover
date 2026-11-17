import React from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import { BellIcon } from './Icons';

export function NotificationPermissionPrompt({
  open,
  busy = false,
  onAllow,
  onDismiss,
}) {
  if (!open) return null;

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
          Turn on notifications
        </h2>
        <p className="notif-perm-desc">
          Allow real-time alerts so you know right away when someone likes your
          post, comments, follows you, or sends a message.
        </p>

        <div className="notif-perm-actions">
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

  return (
    <div className="live-notif-banner-wrap" role="status" aria-live="polite">
      <div
        className="live-notif-banner"
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
        <img
          src={alert.avatar || avatarDefault}
          alt={alert.title}
          className="live-notif-avatar"
        />
        <div className="live-notif-copy">
          <div className="live-notif-top-row">
            <span className="live-notif-title">{alert.title}</span>
            <span className={`live-notif-pill is-${alert.kind || 'info'}`}>
              {alert.label || 'Alert'}
            </span>
          </div>
          <p className="live-notif-body">{alert.body}</p>
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
