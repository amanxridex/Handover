import React, { useEffect, useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import handoverWordmark from '../assets/logos/handover-wordmark.png';
import { checkUsernameAvailable } from '../services/profileService';
import { compressImageFile } from '../utils/imageCompress';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { BackTriangleIcon } from './Icons';

export default function ProfileSetupScreen({
  initialData,
  initialError,
  onBack,
  onComplete,
  onSwitchToSignIn,
}) {
  const fileInputRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState(initialData?.avatar || avatarDefault);
  const [fullName, setFullName] = useState(initialData?.name || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [checkStatus, setCheckStatus] = useState('idle'); // idle | invalid | checking | available | taken
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError || '');

  useEffect(() => {
    if (initialError) {
      setErrorMsg(initialError);
      setCheckStatus('taken');
    }
  }, [initialError]);

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setCheckStatus('idle');
      return undefined;
    }
    if (clean.length < 3) {
      setCheckStatus('invalid');
      return undefined;
    }

    let cancelled = false;
    setCheckStatus('checking');

    const minDelay = new Promise((resolve) => setTimeout(resolve, 450));
    Promise.all([checkUsernameAvailable(clean), minDelay]).then(
      ([available]) => {
        if (cancelled) return;
        setCheckStatus(available ? 'available' : 'taken');
      }
    );

    return () => {
      cancelled = true;
    };
  }, [username]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 1440, 0.92);
    if (compressed) {
      setAvatarSrc(compressed);
    }
    e.target.value = '';
  };

  const handleUsernameChange = (e) => {
    const sanitized = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);
    setUsername(sanitized);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    triggerLightHaptic();

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!username || username.length < 3 || checkStatus === 'invalid') {
      setErrorMsg('Choose a username with at least 3 characters');
      return;
    }
    if (checkStatus === 'checking') {
      setErrorMsg('Wait a moment while we finish checking your username');
      return;
    }
    if (checkStatus === 'taken') {
      setErrorMsg('That username is already taken — choose another one');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Create a password with at least 6 characters');
      return;
    }

    setSubmitting(true);
    const stillAvailable = await checkUsernameAvailable(username);
    setSubmitting(false);

    if (!stillAvailable) {
      setCheckStatus('taken');
      setErrorMsg(`@${username} was just taken — please pick another username`);
      return;
    }

    onComplete({
      name: fullName.trim(),
      username,
      avatar: avatarSrc,
      password,
    });
  };

  return (
    <section className="onboarding-screen" aria-label="Profile setup">
      <div className="onboarding-glow" aria-hidden="true">
        <div className="onboarding-glow-fade" />
      </div>

      <form className="setup-content" onSubmit={handleSubmit} noValidate>
        {/* Top Logo & Back Row */}
        <header className="setup-top-bar">
          <button
            type="button"
            className="back-btn setup-back-btn"
            onClick={() => {
              triggerLightHaptic();
              onBack();
            }}
            aria-label="Back to onboarding"
          >
            <BackTriangleIcon />
          </button>

          <img
            src={handoverWordmark}
            alt="handover"
            className="setup-brand-logo"
          />
        </header>

        <div className="setup-header">
          <h1 className="setup-title">Create your profile</h1>
          <p className="setup-subtitle">
            Choose your profile image, full name and claim your @username.
          </p>
        </div>

        {/* Choose Profile Image */}
        <div className="setup-avatar-section">
          <button
            type="button"
            className="setup-avatar-picker"
            onClick={() => {
              triggerLightHaptic();
              fileInputRef.current?.click();
            }}
            aria-label="Choose your profile image"
          >
            <img
              src={avatarSrc}
              alt="Selected profile"
              className="setup-avatar-img"
            />
            <span className="setup-avatar-badge" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8.5C4 7.4 4.9 6.5 6 6.5H8.2L9.5 4.8C9.88 4.3 10.47 4 11.1 4H12.9C13.53 4 14.12 4.3 14.5 4.8L15.8 6.5H18C19.1 6.5 20 7.4 20 8.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V8.5Z"
                  stroke="#FFFFFF"
                  strokeWidth="1.9"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="3.2"
                  stroke="#FFFFFF"
                  strokeWidth="1.9"
                />
              </svg>
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
        </div>

        {/* Form Fields */}
        <div className="setup-fields">
          <div className="setup-field-group">
            <label htmlFor="setup-fullname" className="setup-label">
              Full name
            </label>
            <input
              id="setup-fullname"
              type="text"
              className="setup-input"
              placeholder="e.g. Jacob Jones"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setErrorMsg('');
              }}
              autoComplete="name"
            />
          </div>

          <div className="setup-field-group">
            <label htmlFor="setup-username" className="setup-label">
              Choose username
            </label>

            <div
              className={`setup-username-box ${
                checkStatus === 'checking'
                  ? 'is-checking'
                  : checkStatus === 'available'
                    ? 'is-available'
                    : checkStatus === 'taken'
                      ? 'is-taken'
                      : ''
              }`}
            >
              <span className="setup-at-prefix">@</span>
              <input
                id="setup-username"
                type="text"
                className="setup-username-input"
                placeholder="yourhandle"
                value={username}
                onChange={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />

              <div className="setup-check-indicator" aria-live="polite">
                {checkStatus === 'checking' && (
                  <span className="setup-spinner" aria-label="Checking" />
                )}
                {checkStatus === 'available' && (
                  <span className="setup-badge-ok" aria-label="Available">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3.2 8.4L6.4 11.6L12.8 4.8"
                        stroke="#FFFFFF"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                {checkStatus === 'taken' && (
                  <span className="setup-badge-taken" aria-label="Taken">
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                        stroke="#FFFFFF"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                )}
              </div>

              {checkStatus === 'checking' && (
                <div className="setup-check-shimmer" aria-hidden="true" />
              )}
            </div>

            <div className="setup-status-line" aria-live="polite">
              {checkStatus === 'checking' && (
                <span className="setup-status checking">
                  <span className="setup-pulse-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  Checking @{username} availability...
                </span>
              )}
              {checkStatus === 'available' && (
                <span className="setup-status available">
                  @{username} is available
                </span>
              )}
              {checkStatus === 'taken' && (
                <span className="setup-status taken">
                  @{username} is already taken
                </span>
              )}
              {checkStatus === 'invalid' && (
                <span className="setup-status hint">
                  Use at least 3 letters, numbers or underscores
                </span>
              )}
              {checkStatus === 'idle' && (
                <span className="setup-status hint">
                  Unique handle · letters, numbers &amp; underscores only
                </span>
              )}
            </div>
          </div>

          <div className="setup-field-group">
            <label htmlFor="setup-password" className="setup-label">
              Create password
            </label>
            <div className="setup-password-box">
              <input
                id="setup-password"
                type={showPassword ? 'text' : 'password'}
                className="setup-password-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="setup-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="setup-error-banner" role="alert">
              {errorMsg}
            </p>
          )}
        </div>

        <div className="setup-footer">
          <button
            type="submit"
            className="onboarding-next-btn"
            disabled={submitting}
          >
            <span className="onboarding-next-label">
              {submitting ? 'Checking...' : 'Continue'}
            </span>
          </button>

          {onSwitchToSignIn && (
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                triggerLightHaptic();
                onSwitchToSignIn();
              }}
            >
              Already have an account? <span>Sign in</span>
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

