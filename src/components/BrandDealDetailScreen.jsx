import React, { useEffect, useState } from 'react';
import {
  applyForBrandDeal,
  fetchBrandDealById,
  fetchMyDealApplications,
  getStoredDealApplications,
  withdrawBrandDealApplication,
} from '../services/dealsService';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/nativeBridge';
import BrandLogoMark from './BrandLogoMark';
import { BackTriangleIcon } from './Icons';

export default function BrandDealDetailScreen({
  dealId,
  initialDeal,
  currentUserId = '',
  onBack,
}) {
  const [deal, setDeal] = useState(initialDeal || null);
  const [loadingDeal, setLoadingDeal] = useState(!initialDeal);
  const [application, setApplication] = useState(() =>
    getStoredDealApplications().find((a) => a.dealId === dealId) || null
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    setFeedbackMsg('');
    if (!initialDeal || initialDeal.id !== dealId) {
      setLoadingDeal(true);
    }

    fetchBrandDealById(dealId).then((fetched) => {
      if (!mounted) return;
      if (fetched) {
        setDeal(fetched);
      }
      setLoadingDeal(false);
    });

    fetchMyDealApplications().then((apps) => {
      if (!mounted) return;
      const found = Array.isArray(apps)
        ? apps.find((a) => a.dealId === dealId) || null
        : null;
      setApplication(found);
    });

    return () => {
      mounted = false;
    };
  }, [dealId, initialDeal]);

  const handleClaimDeal = async () => {
    if (!deal || submitting || application) return;
    triggerLightHaptic();
    setSubmitting(true);
    setFeedbackMsg('');

    const res = await applyForBrandDeal(deal);
    setSubmitting(false);

    if (!res.ok) {
      setFeedbackMsg('Could not submit right now. Please try again.');
      return;
    }

    triggerSuccessHaptic();
    setApplication(res.application);
    setFeedbackMsg('Application saved to your creator profile.');
  };

  const handleWithdraw = async () => {
    if (!deal || submitting || !application) return;
    triggerLightHaptic();
    setSubmitting(true);
    setFeedbackMsg('');

    const res = await withdrawBrandDealApplication(deal.id);
    setSubmitting(false);
    if (res.ok) {
      setApplication(null);
      setFeedbackMsg('Application withdrawn.');
    }
  };

  if (loadingDeal && !deal) {
    return (
      <div className="deal-detail-screen">
        <div className="deal-detail-inner">
          <header className="deal-detail-top">
            <button
              type="button"
              className="notif-back-btn deal-detail-back-btn"
              onClick={onBack}
              aria-label="Go back"
            >
              <BackTriangleIcon />
            </button>
          </header>
          <div className="deal-detail-loading">Loading brand deal...</div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="deal-detail-screen">
        <div className="deal-detail-inner">
          <header className="deal-detail-top">
            <button
              type="button"
              className="notif-back-btn deal-detail-back-btn"
              onClick={onBack}
              aria-label="Go back"
            >
              <BackTriangleIcon />
            </button>
          </header>
          <div className="deal-detail-loading">Brand deal unavailable.</div>
        </div>
      </div>
    );
  }

  const deliverables = Array.isArray(deal.deliverables)
    ? deal.deliverables.slice(0, 3)
    : [];
  const minRequirements = Array.isArray(deal.minRequirements)
    ? deal.minRequirements.filter(Boolean).slice(0, 3)
    : [];
  const hasBriefSection = Boolean(deal.brief?.trim()) || minRequirements.length > 0;

  return (
    <div className="deal-detail-screen">
      <div className="deal-detail-scroll">
        <header className="deal-detail-top">
          <button
            type="button"
            className="notif-back-btn deal-detail-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <BackTriangleIcon />
          </button>
        </header>

        <div className="deal-detail-hero">
          <div className="deal-detail-logo">
            <BrandLogoMark
              logoKey={deal.logoKey}
              logoUrl={deal.brandLogoUrl}
              name={deal.brandName}
              size="hero"
            />
          </div>
          <h1 className="deal-detail-title">{deal.headline}</h1>
          <p className="deal-detail-subtitle">{deal.subtitle}</p>
        </div>

        <section
          className="deal-detail-features-card"
          aria-label="Campaign deliverables"
        >
          {deliverables.map((item, idx) => (
            <div key={idx} className="deal-detail-feature-row">
              <span className={`deal-feature-badge is-step-${idx + 1}`}>
                {`0${idx + 1}`}
              </span>
              <span className="deal-feature-text">{item}</span>
            </div>
          ))}
        </section>

        {hasBriefSection && (
          <section
            className="deal-detail-brief-card"
            aria-label="Brief and minimum requirements"
          >
            {deal.brief?.trim() && (
              <div className="deal-brief-block">
                <div className="deal-brief-heading">Brief</div>
                <p className="deal-brief-text">{deal.brief}</p>
              </div>
            )}
            {minRequirements.length > 0 && (
              <div className="deal-brief-reqs">
                <div className="deal-brief-heading">Minimum Requirements</div>
                {minRequirements.map((req, idx) => (
                  <div key={idx} className="deal-brief-req-row">
                    <span className="deal-brief-req-num">{idx + 1}</span>
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section
          className="deal-detail-payment-card"
          aria-label="Deal payment amount"
        >
          <div className="deal-payment-top">
            <span className="deal-payment-label">Campaign Payout</span>
            <span className="deal-payment-check" aria-hidden="true">
              ✓
            </span>
          </div>
          <div className="deal-payment-amount">{deal.paymentAmount}</div>
          <div className="deal-payment-sub">
            {deal.category} Partnership · Fixed payment
          </div>
        </section>

        <div className="deal-detail-cta-stage">
          {deal.creatorProfileId && deal.creatorProfileId === currentUserId ? (
            <div className="deal-detail-owner-badge">
              You posted this campaign · {deal.isActive === false ? 'Closed' : 'Open for creators'}
            </div>
          ) : deal.isActive === false ? (
            <div className="deal-detail-owner-badge">
              This brand deal is currently closed.
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`deal-detail-cta ${application ? 'is-applied' : ''}`}
                onClick={handleClaimDeal}
                disabled={submitting || Boolean(application)}
              >
                {submitting
                  ? 'Submitting interest...'
                  : application
                    ? `Interest Submitted · ${deal.paymentAmount}`
                    : `Submit Interest · ${deal.paymentAmount}`}
              </button>

              <p className="deal-detail-payout-note">{deal.payoutTerms}</p>

              {feedbackMsg && (
                <p className="deal-detail-feedback" role="status">
                  {feedbackMsg}
                </p>
              )}

              {application && !submitting && (
                <button
                  type="button"
                  className="deal-detail-withdraw-btn"
                  onClick={handleWithdraw}
                >
                  Withdraw request
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
