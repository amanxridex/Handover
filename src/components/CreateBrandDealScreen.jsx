import React, { useState } from 'react';
import { createBrandDeal } from '../services/dealsService';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/nativeBridge';

const DEAL_CATEGORIES = ['Restaurants', 'Sports', 'Clothing', 'Tech'];

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19 12H5M5 12L11 6M5 12L11 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CreateBrandDealScreen({
  currentUser,
  onBack,
  onPublished,
}) {
  const [brandName, setBrandName] = useState(
    currentUser?.companyName?.trim() || ''
  );
  const [category, setCategory] = useState('Tech');
  const [objectives, setObjectives] = useState(['', '', '']);
  const [brief, setBrief] = useState('');
  const [minRequirements, setMinRequirements] = useState(['', '', '']);
  const [paymentInput, setPaymentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const updateObjective = (idx, val) => {
    setObjectives((prev) => prev.map((item, i) => (i === idx ? val : item)));
    if (errorMsg) setErrorMsg('');
  };

  const updateRequirement = (idx, val) => {
    setMinRequirements((prev) =>
      prev.map((item, i) => (i === idx ? val : item))
    );
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const cleanBrand = brandName.trim();
    const cleanObjectives = objectives.map((s) => s.trim()).filter(Boolean);
    const cleanReqs = minRequirements.map((s) => s.trim()).filter(Boolean);
    const cleanBrief = brief.trim();
    const numericAmount = Number(
      String(paymentInput || '').replace(/[^0-9.]/g, '')
    );

    if (!cleanBrand) {
      setErrorMsg('Enter your brand name.');
      return;
    }
    if (cleanObjectives.length < 3) {
      setErrorMsg('Please fill in all 3 campaign objectives.');
      return;
    }
    if (!cleanBrief) {
      setErrorMsg('Add a short campaign brief for creators.');
      return;
    }
    if (cleanReqs.length < 3) {
      setErrorMsg('Please fill in all 3 minimum requirements.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Enter a valid payment amount.');
      return;
    }

    triggerLightHaptic();
    setSubmitting(true);
    setErrorMsg('');

    const res = await createBrandDeal({
      brandName: cleanBrand,
      category,
      objectives: cleanObjectives,
      minRequirements: cleanReqs,
      brief: cleanBrief,
      paymentAmount: numericAmount,
      brandLogoUrl: currentUser?.companyLogoUrl || null,
    });

    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Could not publish deal. Please try again.');
      return;
    }

    triggerSuccessHaptic();
    onPublished?.(res.deal);
  };

  const formattedPreview = (() => {
    const n = Number(String(paymentInput || '').replace(/[^0-9.]/g, ''));
    return n > 0 ? `$${Math.round(n).toLocaleString('en-US')}` : '';
  })();

  return (
    <div className="composer-page-screen">
      <form className="composer-page-scroll" onSubmit={handleSubmit}>
        <header className="composer-page-header">
          <button
            type="button"
            className="composer-back-btn"
            onClick={() => {
              triggerLightHaptic();
              onBack?.();
            }}
            aria-label="Back to feed"
          >
            <BackArrowIcon />
          </button>
          <h1 className="composer-page-title">Deal for Creators</h1>
          <span className="composer-header-spacer" aria-hidden="true" />
        </header>

        <div className="composer-section">
          <label className="composer-field-label" htmlFor="deal-brand-name">
            Brand Name
          </label>
          <input
            id="deal-brand-name"
            type="text"
            className="composer-text-input"
            placeholder="e.g. Handover Studio"
            value={brandName}
            onChange={(e) => {
              setBrandName(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </div>

        <div className="composer-section">
          <div className="composer-field-label">Category</div>
          <div className="composer-chip-row">
            {DEAL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`composer-chip ${category === cat ? 'active' : ''}`}
                onClick={() => {
                  triggerLightHaptic();
                  setCategory(cat);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="composer-section">
          <div className="composer-field-label">3 Objectives</div>
          <div className="composer-numbered-stack">
            {[
              'Objective 1 (e.g. 1x 45-60s Reel or Short review)',
              'Objective 2 (e.g. 2x Story frames with brand tag)',
              'Objective 3 (e.g. 30-day creator usage rights)',
            ].map((placeholder, idx) => (
              <div key={idx} className="composer-numbered-row">
                <span className="composer-step-pill">{`0${idx + 1}`}</span>
                <input
                  type="text"
                  className="composer-row-input"
                  placeholder={placeholder}
                  value={objectives[idx]}
                  onChange={(e) => updateObjective(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="composer-section">
          <label className="composer-field-label" htmlFor="deal-brief-input">
            Campaign Brief
          </label>
          <textarea
            id="deal-brief-input"
            className="composer-textarea"
            rows={3}
            placeholder="Explain what creators should highlight, tone, and call to action..."
            value={brief}
            onChange={(e) => {
              setBrief(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </div>

        <div className="composer-section">
          <div className="composer-field-label">3 Minimum Requirements</div>
          <div className="composer-numbered-stack">
            {[
              'Requirement 1 (e.g. Minimum 10K active followers)',
              'Requirement 2 (e.g. 1080p vertical 9:16 video)',
              'Requirement 3 (e.g. Publish within 7 days)',
            ].map((placeholder, idx) => (
              <div key={idx} className="composer-numbered-row">
                <span className="composer-step-pill is-req">{`R${idx + 1}`}</span>
                <input
                  type="text"
                  className="composer-row-input"
                  placeholder={placeholder}
                  value={minRequirements[idx]}
                  onChange={(e) => updateRequirement(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="composer-section">
          <label className="composer-field-label" htmlFor="deal-payment-input">
            Payment Amount
          </label>
          <div className="composer-amount-box">
            <span className="composer-currency-prefix">$</span>
            <input
              id="deal-payment-input"
              type="text"
              inputMode="decimal"
              className="composer-amount-input"
              placeholder="1500"
              value={paymentInput}
              onChange={(e) => {
                setPaymentInput(e.target.value.replace(/[^0-9.]/g, ''));
                if (errorMsg) setErrorMsg('');
              }}
            />
            {formattedPreview && (
              <span className="composer-amount-preview">{formattedPreview}</span>
            )}
          </div>
        </div>

        {errorMsg && (
          <p className="composer-error" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="composer-submit-wrap">
          <button
            type="submit"
            className="composer-primary-btn"
            disabled={submitting}
          >
            {submitting
              ? 'Publishing deal...'
              : formattedPreview
                ? `Publish Brand Deal · ${formattedPreview}`
                : 'Publish Brand Deal'}
          </button>
        </div>
      </form>
    </div>
  );
}
