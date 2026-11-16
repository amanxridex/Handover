import React from 'react';
import handoverWordmark from '../assets/logos/handover-wordmark.png';
import { triggerLightHaptic } from '../utils/nativeBridge';

export default function OnboardingScreen({ onSignUp, onSignIn, onComplete }) {
  const handleSignUp = () => {
    triggerLightHaptic();
    if (onSignUp) {
      onSignUp();
    } else if (onComplete) {
      onComplete();
    }
  };

  const handleSignIn = () => {
    triggerLightHaptic();
    if (onSignIn) {
      onSignIn();
    }
  };

  return (
    <section className="onboarding-screen" aria-label="Welcome and sign in">
      <div className="onboarding-glow" aria-hidden="true">
        <div className="onboarding-glow-fade" />
      </div>

      <div className="onboarding-content">
        <div className="onboarding-center-block">
          <div className="onboarding-brand">
            <img
              src={handoverWordmark}
              alt="handover"
              className="onboarding-brand-logo"
            />
          </div>

          <h1 className="onboarding-title">
            Own Your Money,
            <br />
            Shape <span className="onboarding-title-accent">Your Life.</span>
          </h1>

          <p className="onboarding-subtitle">
            From saving smart to spending wise, your financial goals begin to
            rise.
          </p>
        </div>

        <div className="onboarding-auth-actions">
          <button
            type="button"
            className="onboarding-next-btn"
            onClick={handleSignUp}
          >
            <span className="onboarding-next-label">Sign Up · Let&apos;s go!</span>
          </button>

          <button
            type="button"
            className="onboarding-signin-btn"
            onClick={handleSignIn}
          >
            Already have an account? <span>Sign In</span>
          </button>
        </div>
      </div>
    </section>
  );
}
