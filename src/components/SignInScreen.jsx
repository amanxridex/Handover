import React, { useState } from 'react';
import handoverWordmark from '../assets/logos/handover-wordmark.png';
import { loginWithCredentials } from '../services/profileService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { BackTriangleIcon } from './Icons';

export default function SignInScreen({
  onBack,
  onSuccess,
  onSwitchToSignUp,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    if (loading) return;
    triggerLightHaptic();

    if (!username.trim()) {
      setErrorMsg('Please enter your @username');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const result = await loginWithCredentials({ username, password });
    setLoading(false);

    if (result?.error || !result?.profile) {
      setErrorMsg(result?.error || 'Invalid @username or password');
      return;
    }

    onSuccess(result.profile);
  };

  return (
    <section className="onboarding-screen" aria-label="Sign in">
      <div className="onboarding-glow" aria-hidden="true">
        <div className="onboarding-glow-fade" />
      </div>

      <form className="setup-content" onSubmit={handleSubmit} noValidate>
        <header className="setup-top-bar">
          <button
            type="button"
            className="back-btn setup-back-btn"
            onClick={() => {
              triggerLightHaptic();
              onBack();
            }}
            aria-label="Back to welcome screen"
          >
            <BackTriangleIcon />
          </button>

          <img
            src={handoverWordmark}
            alt="handover"
            className="setup-brand-logo"
          />
        </header>

        <div className="setup-header signin-header">
          <h1 className="setup-title">Welcome back</h1>
          <p className="setup-subtitle">
            Sign in with your @username and password to continue to your feed.
          </p>
        </div>

        <div className="setup-fields signin-fields">
          <div className="setup-field-group">
            <label htmlFor="signin-username" className="setup-label">
              Username
            </label>
            <div className="setup-username-box">
              <span className="setup-at-prefix">@</span>
              <input
                id="signin-username"
                type="text"
                className="setup-username-input"
                placeholder="yourhandle"
                value={username}
                onChange={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="setup-field-group">
            <label htmlFor="signin-password" className="setup-label">
              Password
            </label>
            <div className="setup-password-box">
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                className="setup-password-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                autoComplete="current-password"
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
            disabled={loading}
          >
            <span className="onboarding-next-label">
              {loading ? 'Signing in...' : 'Sign In'}
            </span>
          </button>

          <button
            type="button"
            className="auth-switch-link"
            onClick={() => {
              triggerLightHaptic();
              onSwitchToSignUp();
            }}
          >
            Don&apos;t have an account? <span>Sign up</span>
          </button>
        </div>
      </form>
    </section>
  );
}
