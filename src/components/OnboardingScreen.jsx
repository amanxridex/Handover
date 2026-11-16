import React from 'react';
import handoverWordmark from '../assets/logos/handover-wordmark.png';
import { triggerLightHaptic } from '../utils/nativeBridge';

export default function OnboardingScreen({ onComplete }) {
  const handleNext = () => {
    triggerLightHaptic();
    onComplete();
  };

  return (
    <section className="onboarding-screen" aria-label="Onboarding">
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

        <button
          type="button"
          className="onboarding-next-btn"
          onClick={handleNext}
        >
          <span className="onboarding-next-label">letsssss go !</span>
        </button>
      </div>
    </section>
  );
}
