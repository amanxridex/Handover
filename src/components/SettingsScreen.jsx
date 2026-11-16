import React, { useMemo, useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import {
  enrollBiometricPasskey,
  isPlatformBiometricAvailable,
  submitUserFeedback,
  updateProfileDetailsInDb,
} from '../services/settingsService';
import { compressImageFile } from '../utils/imageCompress';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
} from '../utils/nativeBridge';
import { BackTriangleIcon, SearchIcon } from './Icons';
import PasscodeLockScreen from './PasscodeLockScreen';

const PLAN_OPTIONS = [
  {
    id: 'free',
    name: 'Starter Free',
    price: '$0 / mo',
    desc: 'Core feed, direct chat, company founder badge & comments.',
  },
  {
    id: 'pro',
    name: 'Handover Pro',
    price: '$9 / mo',
    desc: 'AI audience insights, verified creator boosts, and priority discovery.',
  },
  {
    id: 'founder_pro',
    name: 'Founder Studio',
    price: '$24 / mo',
    desc: 'Brand campaign analytics, team seats, and highlighted founder card.',
  },
];

const LANGUAGES = [
  { name: 'English', native: 'English (US)' },
  { name: 'Hindi', native: 'हिन्दी' },
  { name: 'Spanish', native: 'Español' },
  { name: 'French', native: 'Français' },
  { name: 'German', native: 'Deutsch' },
  { name: 'Japanese', native: '日本語' },
];

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-switch ${checked ? 'is-on' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span className="settings-switch-thumb" />
    </button>
  );
}

function SettingIcon({ name }) {
  const stroke = 'currentColor';
  switch (name) {
    case 'gear':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.79 1.02 1.51 1.08H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke={stroke}
            strokeWidth="1.6"
          />
        </svg>
      );
    case 'card':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <rect x="2.5" y="5" width="19" height="14" rx="3" stroke={stroke} strokeWidth="1.8" />
          <path d="M2.5 10H21.5" stroke={stroke} strokeWidth="1.8" />
          <path d="M6.5 14.5H10.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'badge':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="9" r="5.5" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M8.5 14L7 21L12 18.2L17 21L15.5 14"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'haptic':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <rect x="7" y="4" width="10" height="16" rx="2.5" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M3.5 8.5L2 10L3.5 11.5L2 13L3.5 14.5M20.5 8.5L22 10L20.5 11.5L22 13L20.5 14.5"
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'lock':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="10" width="16" height="10" rx="2.5" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M8 10V7a4 4 0 1 1 8 0v3"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="15" r="1.4" fill={stroke} />
        </svg>
      );
    case 'sliders':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7H20M4 12H20M4 17H20"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="9" cy="7" r="2" fill="#0d1a38" stroke={stroke} strokeWidth="1.8" />
          <circle cx="15" cy="12" r="2" fill="#0d1a38" stroke={stroke} strokeWidth="1.8" />
          <circle cx="10" cy="17" r="2" fill="#0d1a38" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );
    case 'shield':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3L4.5 6.2V11.8C4.5 16.5 7.7 19.9 12 21.2C16.3 19.9 19.5 16.5 19.5 11.8V6.2L12 3Z"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M12 10.5V14.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'help':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M9.5 9.5C9.5 8.1 10.6 7 12 7C13.4 7 14.5 8.1 14.5 9.5C14.5 10.9 12 11.4 12 13"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.5" r="1" fill={stroke} />
        </svg>
      );
    case 'feedback':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 5.5C4 4.4 4.9 3.5 6 3.5H18C19.1 3.5 20 4.4 20 5.5V15.5C20 16.6 19.1 17.5 18 17.5H8.5L4 21V5.5Z"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'language':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M3.5 12H20.5M12 3C14.6 5.8 14.6 18.2 12 21M12 3C9.4 5.8 9.4 18.2 12 21"
            stroke={stroke}
            strokeWidth="1.6"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function SettingsScreen({
  currentUser,
  roleDetails,
  settings,
  onUpdateSettings,
  onProfileUpdated,
  onTriggerLockTest,
  onBack,
  onLogout,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeSheet, setActiveSheet] = useState(null); // null | edit-profile | passcode | plan | badges | preferences | privacy | support | feedback | language
  const [passcodeSetupOpen, setPasscodeSetupOpen] = useState(false);
  const [pendingBioEnable, setPendingBioEnable] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Edit profile form state
  const avatarInputRef = useRef(null);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editAvatar, setEditAvatar] = useState(
    currentUser?.avatar || avatarDefault
  );
  const [editCompany, setEditCompany] = useState(roleDetails?.companyName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Feedback / support form state
  const [rating, setRating] = useState(5);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  const openEditProfile = () => {
    triggerLightHaptic();
    setEditName(currentUser?.name || '');
    setEditBio(currentUser?.bio || '');
    setEditAvatar(currentUser?.avatar || avatarDefault);
    setEditCompany(roleDetails?.companyName || '');
    setActiveSheet('edit-profile');
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 360, 0.85);
    if (compressed) {
      setEditAvatar(compressed);
    }
    e.target.value = '';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim() || savingProfile) return;
    triggerLightHaptic();
    setSavingProfile(true);
    const res = await updateProfileDetailsInDb(currentUser?.id, {
      fullName: editName.trim(),
      bio: editBio.trim(),
      avatarUrl: editAvatar,
      companyName:
        roleDetails?.role === 'founder' ? editCompany.trim() : undefined,
    });
    setSavingProfile(false);
    if (res.ok) {
      triggerSuccessHaptic();
      onProfileUpdated?.({
        name: editName.trim(),
        bio: editBio.trim(),
        avatar: editAvatar,
        companyName:
          roleDetails?.role === 'founder' ? editCompany.trim() : undefined,
      });
      setActiveSheet(null);
      showToast('Profile saved to database');
    } else {
      showToast(res.error || 'Could not update profile');
    }
  };

  const handleHapticsToggle = async (nextVal) => {
    await onUpdateSettings({ hapticsEnabled: nextVal });
    if (nextVal) {
      triggerMediumHaptic(true);
      showToast('Haptic feedback enabled');
    } else {
      showToast('Haptic feedback muted');
    }
  };

  const handleBiometricToggle = async (nextVal) => {
    triggerLightHaptic();
    if (!nextVal) {
      await onUpdateSettings({ biometricLockEnabled: false });
      showToast('Face ID / Fingerprint lock disabled');
      return;
    }

    // Attempt platform WebAuthn enrollment when available
    let credentialId = settings.biometricCredentialId || '';
    const supported = await isPlatformBiometricAvailable();
    if (supported && !credentialId) {
      const enrolled = await enrollBiometricPasskey({
        username: currentUser?.username,
        displayName: currentUser?.name,
      });
      if (enrolled?.credentialId) {
        credentialId = enrolled.credentialId;
      }
    }

    if (!settings.passcodeHash) {
      setPendingBioEnable(true);
      if (credentialId) {
        await onUpdateSettings({ biometricCredentialId: credentialId });
      }
      setPasscodeSetupOpen(true);
      return;
    }

    await onUpdateSettings({
      biometricLockEnabled: true,
      biometricCredentialId: credentialId,
    });
    triggerSuccessHaptic();
    showToast(
      credentialId
        ? 'Face ID & Passcode lock enabled'
        : '4-digit Passcode App Lock enabled'
    );
  };

  const handlePasscodeSet = async (hashed) => {
    setPasscodeSetupOpen(false);
    await onUpdateSettings({
      passcodeHash: hashed,
      biometricLockEnabled: pendingBioEnable || settings.biometricLockEnabled,
    });
    setPendingBioEnable(false);
    showToast('Passcode saved & encrypted');
  };

  const handleSendFeedback = async (e, kind) => {
    e.preventDefault();
    if (!messageText.trim() || sendingMessage) return;
    triggerLightHaptic();
    setSendingMessage(true);
    const res = await submitUserFeedback({
      profileId: currentUser?.id,
      kind,
      rating: kind === 'feedback' ? rating : null,
      message: messageText.trim(),
    });
    setSendingMessage(false);
    if (res.ok) {
      triggerSuccessHaptic();
      setMessageText('');
      setActiveSheet(null);
      showToast(
        kind === 'support'
          ? 'Support request submitted'
          : 'Thank you for your feedback!'
      );
    } else {
      showToast(res.error || 'Could not send right now');
    }
  };

  const matchesQuery = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (label) => !q || label.toLowerCase().includes(q);
  }, [searchText]);

  const currentPlanLabel =
    PLAN_OPTIONS.find((p) => p.id === settings.planTier)?.name || 'Starter Free';

  return (
    <section className="settings-screen" aria-label="Settings">
      <div className="settings-glow" aria-hidden="true" />

      {/* Top Navigation */}
      <header className="settings-top-bar">
        <button
          type="button"
          className="settings-circle-btn"
          onClick={() => {
            triggerLightHaptic();
            onBack();
          }}
          aria-label="Back to profile"
        >
          <BackTriangleIcon />
        </button>

        <h1 className="settings-top-title">Profile &amp; Settings</h1>

        <button
          type="button"
          className="settings-circle-btn"
          onClick={() => {
            triggerLightHaptic();
            setSearchOpen((prev) => !prev);
            setSearchText('');
          }}
          aria-label="Search settings"
        >
          <SearchIcon />
        </button>
      </header>

      {searchOpen && (
        <div className="settings-search-wrap">
          <input
            type="text"
            className="settings-search-input"
            placeholder="Search passcode, haptics, plan, language..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Scrollable Settings Cards */}
      <div className="settings-scroll">
        {/* User Summary Card */}
        <button
          type="button"
          className="settings-profile-card"
          onClick={openEditProfile}
        >
          <img
            src={currentUser?.avatar || avatarDefault}
            alt={currentUser?.name || 'User'}
            className="settings-profile-avatar"
          />
          <div className="settings-profile-meta">
            <div className="settings-profile-name-row">
              <span className="settings-profile-name">
                {currentUser?.name || 'Handover Member'}
              </span>
              {roleDetails?.role === 'founder' &&
                (roleDetails?.companyLogoUrl ? (
                  <img
                    src={roleDetails.companyLogoUrl}
                    alt={roleDetails.companyName || 'Founder'}
                    className="feed-founder-badge"
                  />
                ) : null)}
            </div>
            <span className="settings-profile-sub">
              @{currentUser?.username || 'member'} · {currentPlanLabel}
            </span>
          </div>
          <span className="settings-row-chevron">
            <ChevronRight />
          </span>
        </button>

        {/* Upgrade to Pro Banner */}
        <div className="settings-pro-banner">
          <div className="settings-pro-sparkle" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
                fill="url(#proSparkleGrad)"
              />
              <defs>
                <linearGradient id="proSparkleGrad" x1="2" y1="2" x2="22" y2="22">
                  <stop stopColor="#60A5FA" />
                  <stop offset="1" stopColor="#1A66FF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="settings-pro-copy">
            <div className="settings-pro-title">
              {settings.planTier === 'free'
                ? 'Upgrade to Pro'
                : `${currentPlanLabel} Active`}
            </div>
            <div className="settings-pro-desc">
              Unlock analytics insights, custom badges &amp; priority founder reach.
            </div>
          </div>
          <button
            type="button"
            className="settings-pro-btn"
            onClick={() => {
              triggerLightHaptic();
              setActiveSheet('plan');
            }}
          >
            <span>{settings.planTier === 'free' ? 'Upgrade' : 'Manage'}</span>
            <ChevronRight />
          </button>
        </div>

        {/* Group 1: Security, Plan, Badges, Haptics, Biometric */}
        <div className="settings-card-group">
          {matchesQuery('passcode security lock settings') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setActiveSheet('passcode');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="gear" />
              </span>
              <span className="settings-row-label">Passcode &amp; App Lock</span>
              <span className="settings-row-value">
                {settings.passcodeHash ? 'Set' : 'Off'}
              </span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}

          {matchesQuery('plan subscription pro pricing') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setActiveSheet('plan');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="card" />
              </span>
              <span className="settings-row-label">Plan &amp; Subscription</span>
              <span className="settings-row-value">{currentPlanLabel}</span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}

          {matchesQuery('badges founder verification') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setActiveSheet('badges');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="badge" />
              </span>
              <span className="settings-row-label">Badges</span>
              <span className="settings-row-value">
                {settings.showBadges ? 'Visible' : 'Hidden'}
              </span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}

          {matchesQuery('haptics vibration feedback') && (
            <div
              className="settings-row"
              onClick={() => handleHapticsToggle(!settings.hapticsEnabled)}
            >
              <span className="settings-row-icon">
                <SettingIcon name="haptic" />
              </span>
              <span className="settings-row-label">Haptic Feedback</span>
              <ToggleSwitch
                checked={settings.hapticsEnabled}
                onChange={handleHapticsToggle}
                label="Toggle haptic feedback"
              />
            </div>
          )}

          {matchesQuery('enable finger print face id biometric lock') && (
            <div
              className="settings-row"
              onClick={() =>
                handleBiometricToggle(!settings.biometricLockEnabled)
              }
            >
              <span className="settings-row-icon">
                <SettingIcon name="lock" />
              </span>
              <span className="settings-row-label">
                Enable Finger Print / Face ID
              </span>
              <ToggleSwitch
                checked={settings.biometricLockEnabled}
                onChange={handleBiometricToggle}
                label="Toggle Fingerprint or Face ID lock"
              />
            </div>
          )}
        </div>

        {/* Group 2: Preferences, Privacy, Help */}
        <div className="settings-card-group">
          {matchesQuery('preferences notifications privacy autoplay') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setActiveSheet('preferences');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="sliders" />
              </span>
              <span className="settings-row-label">Preferences</span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}

          {matchesQuery('privacy policy security data') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setActiveSheet('privacy');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="shield" />
              </span>
              <span className="settings-row-label">Privacy Policy</span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}

          {matchesQuery('help support faq contact') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setMessageText('');
                setActiveSheet('support');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="help" />
              </span>
              <span className="settings-row-label">Help &amp; Support</span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}
        </div>

        {/* Group 3: Feedback & Language */}
        <div className="settings-card-group">
          {matchesQuery('feedback rating review') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setMessageText('');
                setActiveSheet('feedback');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="feedback" />
              </span>
              <span className="settings-row-label">Feedback</span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}

          {matchesQuery('language english translation') && (
            <button
              type="button"
              className="settings-row"
              onClick={() => {
                triggerLightHaptic();
                setActiveSheet('language');
              }}
            >
              <span className="settings-row-icon">
                <SettingIcon name="language" />
              </span>
              <span className="settings-row-label">Language</span>
              <span className="settings-row-value">{settings.language}</span>
              <span className="settings-row-chevron">
                <ChevronRight />
              </span>
            </button>
          )}
        </div>

        {/* Log out card */}
        <div className="settings-card-group">
          <button
            type="button"
            className="settings-row settings-logout-row"
            onClick={() => {
              triggerLightHaptic();
              onLogout?.();
            }}
          >
            <span className="settings-row-label">Log out</span>
          </button>
        </div>
      </div>

      {/* Sub-sheets */}
      {activeSheet && (
        <div
          className="settings-sheet-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveSheet(null)}
        >
          <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="settings-sheet-handle" />

            {activeSheet === 'edit-profile' && (
              <form className="settings-sheet-body" onSubmit={handleSaveProfile}>
                <h2 className="settings-sheet-title">Edit Profile</h2>

                <div className="settings-edit-avatar-row">
                  <img
                    src={editAvatar}
                    alt="Profile avatar"
                    className="settings-edit-avatar"
                  />
                  <button
                    type="button"
                    className="settings-secondary-btn"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Change photo
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarPick}
                  />
                </div>

                <label className="settings-input-label">
                  Full name
                  <input
                    type="text"
                    className="settings-sheet-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </label>

                {roleDetails?.role === 'founder' && (
                  <label className="settings-input-label">
                    Company name
                    <input
                      type="text"
                      className="settings-sheet-input"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                    />
                  </label>
                )}

                <label className="settings-input-label">
                  Bio
                  <textarea
                    rows={3}
                    className="settings-sheet-textarea"
                    placeholder="Share a short bio..."
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  className="onboarding-next-btn"
                  disabled={savingProfile}
                >
                  <span className="onboarding-next-label">
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </span>
                </button>
              </form>
            )}

            {activeSheet === 'passcode' && (
              <div className="settings-sheet-body">
                <h2 className="settings-sheet-title">Passcode &amp; App Lock</h2>
                <p className="settings-sheet-desc">
                  Protect Handover with a 4-digit passcode and Face ID /
                  Fingerprint unlock whenever you open the app.
                </p>

                <div className="settings-sheet-actions-stack">
                  <button
                    type="button"
                    className="onboarding-next-btn"
                    onClick={() => {
                      triggerLightHaptic();
                      setActiveSheet(null);
                      setPasscodeSetupOpen(true);
                    }}
                  >
                    <span className="onboarding-next-label">
                      {settings.passcodeHash
                        ? 'Change 4-Digit Passcode'
                        : 'Set 4-Digit Passcode'}
                    </span>
                  </button>

                  {settings.passcodeHash && (
                    <>
                      <button
                        type="button"
                        className="settings-secondary-btn full"
                        onClick={() => {
                          triggerLightHaptic();
                          setActiveSheet(null);
                          onTriggerLockTest?.();
                        }}
                      >
                        Lock App Now (Test Lock Screen)
                      </button>

                      <button
                        type="button"
                        className="settings-danger-btn"
                        onClick={async () => {
                          triggerLightHaptic();
                          await onUpdateSettings({
                            passcodeHash: '',
                            biometricLockEnabled: false,
                          });
                          setActiveSheet(null);
                          showToast('Passcode & app lock removed');
                        }}
                      >
                        Remove Passcode
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSheet === 'plan' && (
              <div className="settings-sheet-body">
                <h2 className="settings-sheet-title">Plan &amp; Subscription</h2>
                <div className="settings-plan-list">
                  {PLAN_OPTIONS.map((plan) => {
                    const selected = settings.planTier === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        className={`settings-plan-card ${selected ? 'selected' : ''}`}
                        onClick={async () => {
                          triggerSuccessHaptic();
                          await onUpdateSettings({ planTier: plan.id });
                          showToast(`Switched to ${plan.name}`);
                        }}
                      >
                        <div className="settings-plan-top">
                          <span className="settings-plan-name">{plan.name}</span>
                          <span className="settings-plan-price">{plan.price}</span>
                        </div>
                        <p className="settings-plan-desc">{plan.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSheet === 'badges' && (
              <div className="settings-sheet-body">
                <h2 className="settings-sheet-title">Your Badges</h2>
                <div className="settings-badges-grid">
                  <div className="settings-badge-item">
                    <span className="settings-badge-pill blue">Early Adopter</span>
                    <p>Joined Handover Founding Wave</p>
                  </div>
                  <div className="settings-badge-item">
                    <span className="settings-badge-pill">
                      {roleDetails?.role === 'founder'
                        ? `Founder · ${roleDetails.companyName || 'Company'}`
                        : 'Verified Creator'}
                    </span>
                    <p>Shown beside your name on posts &amp; comments</p>
                  </div>
                </div>

                <div
                  className="settings-pref-row"
                  onClick={async () => {
                    triggerLightHaptic();
                    await onUpdateSettings({
                      showBadges: !settings.showBadges,
                    });
                  }}
                >
                  <span>Display badges publicly</span>
                  <ToggleSwitch
                    checked={settings.showBadges}
                    onChange={(val) => onUpdateSettings({ showBadges: val })}
                    label="Display badges publicly"
                  />
                </div>
              </div>
            )}

            {activeSheet === 'preferences' && (
              <div className="settings-sheet-body">
                <h2 className="settings-sheet-title">Preferences</h2>
                {[
                  {
                    key: 'notificationsEnabled',
                    label: 'Push Notifications',
                    desc: 'Likes, replies, and new follower alerts',
                  },
                  {
                    key: 'privateAccount',
                    label: 'Private Account',
                    desc: 'Approve followers before they see full activity',
                  },
                  {
                    key: 'autoplayMedia',
                    label: 'Auto-load High-Res Media',
                    desc: 'Sharper feed photos on cellular & Wi-Fi',
                  },
                  {
                    key: 'showActivity',
                    label: 'Show Active Status',
                    desc: 'Let chats know when you were recently active',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="settings-pref-row"
                    onClick={async () => {
                      triggerLightHaptic();
                      await onUpdateSettings({
                        [item.key]: !settings[item.key],
                      });
                    }}
                  >
                    <div>
                      <div className="settings-pref-title">{item.label}</div>
                      <div className="settings-pref-desc">{item.desc}</div>
                    </div>
                    <ToggleSwitch
                      checked={Boolean(settings[item.key])}
                      onChange={(val) => onUpdateSettings({ [item.key]: val })}
                      label={item.label}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeSheet === 'privacy' && (
              <div className="settings-sheet-body">
                <h2 className="settings-sheet-title">Privacy Policy</h2>
                <p className="settings-sheet-desc">
                  Handover stores your profile, posts, comments, and preferences
                  securely in encrypted Supabase PostgreSQL tables protected by
                  Row Level Security.
                </p>
                <p className="settings-sheet-desc">
                  Your password and 4-digit passcode are one-way hashed (bcrypt /
                  SHA-256) and are never readable in plaintext. Biometric Face
                  ID / Fingerprint checks remain strictly on your device via
                  WebAuthn.
                </p>
              </div>
            )}

            {activeSheet === 'support' && (
              <form
                className="settings-sheet-body"
                onSubmit={(e) => handleSendFeedback(e, 'support')}
              >
                <h2 className="settings-sheet-title">Help &amp; Support</h2>
                <p className="settings-sheet-desc">
                  Need help with your account, founder badge, or app lock? Send a
                  message directly to our team below.
                </p>
                <textarea
                  rows={4}
                  className="settings-sheet-textarea"
                  placeholder="Describe what you need help with..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button
                  type="submit"
                  className="onboarding-next-btn"
                  disabled={!messageText.trim() || sendingMessage}
                >
                  <span className="onboarding-next-label">
                    {sendingMessage ? 'Sending...' : 'Send Support Request'}
                  </span>
                </button>
              </form>
            )}

            {activeSheet === 'feedback' && (
              <form
                className="settings-sheet-body"
                onSubmit={(e) => handleSendFeedback(e, 'feedback')}
              >
                <h2 className="settings-sheet-title">Share Feedback</h2>
                <div className="settings-rating-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`settings-star-btn ${rating >= star ? 'active' : ''}`}
                      onClick={() => {
                        triggerLightHaptic();
                        setRating(star);
                      }}
                      aria-label={`${star} star rating`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  className="settings-sheet-textarea"
                  placeholder="Tell us what you love or want improved..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button
                  type="submit"
                  className="onboarding-next-btn"
                  disabled={!messageText.trim() || sendingMessage}
                >
                  <span className="onboarding-next-label">
                    {sendingMessage ? 'Submitting...' : 'Submit Feedback'}
                  </span>
                </button>
              </form>
            )}

            {activeSheet === 'language' && (
              <div className="settings-sheet-body">
                <h2 className="settings-sheet-title">Choose Language</h2>
                <div className="settings-lang-list">
                  {LANGUAGES.map((lang) => {
                    const active = settings.language === lang.name;
                    return (
                      <button
                        key={lang.name}
                        type="button"
                        className={`settings-lang-item ${active ? 'active' : ''}`}
                        onClick={async () => {
                          triggerLightHaptic();
                          await onUpdateSettings({ language: lang.name });
                          setActiveSheet(null);
                          showToast(`Language set to ${lang.name}`);
                        }}
                      >
                        <div>
                          <div className="settings-lang-name">{lang.name}</div>
                          <div className="settings-lang-native">{lang.native}</div>
                        </div>
                        {active && <span className="settings-lang-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {passcodeSetupOpen && (
        <PasscodeLockScreen
          mode="setup"
          user={currentUser}
          onPasscodeSet={handlePasscodeSet}
          onCancel={() => {
            setPasscodeSetupOpen(false);
            setPendingBioEnable(false);
          }}
        />
      )}

      {toastMsg && (
        <div className="feed-toast" role="status">
          {toastMsg}
        </div>
      )}
    </section>
  );
}
