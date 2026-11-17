import React, { useEffect, useMemo, useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import { fetchBrandDeals, getFallbackDeals } from '../services/dealsService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import BottomNav from './BottomNav';
import BrandLogoMark from './BrandLogoMark';
import { BellIcon, SearchIcon } from './Icons';

const CARD_PALETTES = {
  mcdonalds: 'linear-gradient(155deg, #2b1608 0%, #5c2708 55%, #1d1007 100%)',
  dominos: 'linear-gradient(155deg, #0b1c48 0%, #15347a 58%, #091536 100%)',
  starbucks: 'linear-gradient(155deg, #07291c 0%, #0f4c35 58%, #061c14 100%)',
  chipotle: 'linear-gradient(155deg, #2f0d11 0%, #5e1820 58%, #1f090c 100%)',
  nike: 'linear-gradient(155deg, #1e6bff 0%, #5b9dff 52%, #0d3eb8 100%)',
  reebok: 'linear-gradient(155deg, #0f1f4a 0%, #1d3c8c 58%, #0a1433 100%)',
  puma: 'linear-gradient(155deg, #ec4899 0%, #a855f7 52%, #6366f1 100%)',
  gymshark: 'linear-gradient(155deg, #0ea5e9 0%, #2563eb 58%, #0c3599 100%)',
  zara: 'linear-gradient(155deg, #f97316 0%, #fb7185 52%, #be123c 100%)',
  adidas: 'linear-gradient(155deg, #06b6d4 0%, #0284c7 56%, #1e3a8a 100%)',
  uniqlo: 'linear-gradient(155deg, #1b2234 0%, #2b3654 58%, #101521 100%)',
  hm: 'linear-gradient(155deg, #1d2438 0%, #313b5a 58%, #121724 100%)',
  playstation: 'linear-gradient(155deg, #071940 0%, #103278 58%, #05112c 100%)',
  spotify: 'linear-gradient(155deg, #062116 0%, #0d3b27 58%, #04150e 100%)',
  apple: 'linear-gradient(155deg, #6366f1 0%, #3b82f6 54%, #1d4ed8 100%)',
  sony: 'linear-gradient(155deg, #334155 0%, #1e293b 54%, #0f172a 100%)',
};

function getCardPalette(logoKey) {
  return (
    CARD_PALETTES[logoKey] ||
    'linear-gradient(155deg, #1a66ff 0%, #0b45dc 60%, #051c63 100%)'
  );
}

function PrevStepIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="2.4" height="14" rx="1.2" fill="currentColor" />
      <path
        d="M18.5 6.2C18.5 5.35 17.55 4.85 16.85 5.32L8.45 11.12C7.85 11.54 7.85 12.46 8.45 12.88L16.85 18.68C17.55 19.15 18.5 18.65 18.5 17.8V6.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NextStepIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="17.6" y="5" width="2.4" height="14" rx="1.2" fill="currentColor" />
      <path
        d="M5.5 6.2C5.5 5.35 6.45 4.85 7.15 5.32L15.55 11.12C16.15 11.54 16.15 12.46 15.55 12.88L7.15 18.68C6.45 19.15 5.5 18.65 5.5 17.8V6.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function BrandDealsScreen({
  currentUser,
  onSelectDeal,
  onOpenNotifications,
  onOpenProfile,
  tabs,
  activeTab,
  onSelectTab,
}) {
  const [deals, setDeals] = useState(() => getFallbackDeals());
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const touchStartXRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    fetchBrandDeals().then((rows) => {
      if (!mounted || !Array.isArray(rows) || rows.length === 0) return;
      setDeals(rows);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter(
      (d) =>
        d.brandName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.headline.toLowerCase().includes(q)
    );
  }, [deals, query]);

  // Top 6 recently added deals shown in the hero coverflow stage; rest in the grid below
  const recentDeals = useMemo(() => {
    const source = query.trim() ? filteredDeals : deals;
    return source.slice(0, 6);
  }, [deals, filteredDeals, query]);

  const restDeals = useMemo(() => {
    if (query.trim()) {
      return filteredDeals;
    }
    return deals.slice(6);
  }, [deals, filteredDeals, query]);

  const safeIndex =
    recentDeals.length > 0 ? carouselIndex % recentDeals.length : 0;
  const activeDeal = recentDeals[safeIndex] || null;
  const prevDeal =
    recentDeals.length > 1
      ? recentDeals[(safeIndex - 1 + recentDeals.length) % recentDeals.length]
      : null;
  const nextDeal =
    recentDeals.length > 1
      ? recentDeals[(safeIndex + 1) % recentDeals.length]
      : null;

  const stepCarousel = (delta) => {
    if (recentDeals.length <= 1) return;
    triggerLightHaptic();
    setCarouselIndex(
      (prev) => (prev + delta + recentDeals.length) % recentDeals.length
    );
  };

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current == null) return;
    const endX = e.changedTouches?.[0]?.clientX;
    if (endX == null) {
      touchStartXRef.current = null;
      return;
    }
    const dx = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(dx) > 36) {
      stepCarousel(dx < 0 ? 1 : -1);
    }
  };

  const displayName = currentUser?.name || 'Jacob Jones';
  const avatarSrc = currentUser?.avatar || avatarDefault;

  return (
    <div className="deals-showcase-screen">
      <div className="deals-showcase-scroll">
        {/* Top Greeting & Action Circles Header */}
        <header className="deals-top-header">
          <button
            type="button"
            className="deals-user-chip"
            onClick={() => {
              triggerLightHaptic();
              onOpenProfile?.();
            }}
          >
            <img
              src={avatarSrc}
              alt={displayName}
              className="deals-user-avatar"
            />
            <div className="deals-user-greeting">
              <span className="deals-hello-label">Hello</span>
              <span className="deals-user-name">{displayName}</span>
            </div>
          </button>

          <div className="deals-top-actions">
            <button
              type="button"
              className={`deals-circle-icon-btn ${searchOpen ? 'is-active' : ''}`}
              aria-label="Search brand deals"
              onClick={() => {
                triggerLightHaptic();
                setSearchOpen((prev) => !prev);
                if (searchOpen) setQuery('');
              }}
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              className="deals-circle-icon-btn"
              aria-label="Notifications"
              onClick={() => {
                triggerLightHaptic();
                onOpenNotifications?.();
              }}
            >
              <BellIcon />
            </button>
          </div>
        </header>

        {searchOpen && (
          <div className="deals-inline-search">
            <SearchIcon />
            <input
              type="search"
              className="deals-inline-search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCarouselIndex(0);
              }}
              placeholder="Search brands or categories"
              autoFocus
            />
          </div>
        )}

        {/* Top 5-6 Recently Added Horizontal Coverflow Carousel */}
        {activeDeal && (
          <section
            className="deals-coverflow-section"
            aria-label="Recently added brand deals"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="deals-coverflow-stage">
              {prevDeal && (
                <button
                  type="button"
                  className="deals-cover-card is-peek-left"
                  style={{ background: getCardPalette(prevDeal.logoKey) }}
                  onClick={() => stepCarousel(-1)}
                  aria-label={`Previous deal: ${prevDeal.brandName}`}
                >
                  <div className="deals-cover-logo">
                    <BrandLogoMark
                      logoKey={prevDeal.logoKey}
                      name={prevDeal.brandName}
                    />
                  </div>
                </button>
              )}

              <button
                type="button"
                className="deals-cover-card is-center"
                style={{ background: getCardPalette(activeDeal.logoKey) }}
                onClick={() => {
                  triggerLightHaptic();
                  onSelectDeal?.(activeDeal);
                }}
              >
                <span className="deals-cover-watermark" aria-hidden="true">
                  Deals
                </span>
                <div className="deals-cover-logo is-center">
                  <BrandLogoMark
                    logoKey={activeDeal.logoKey}
                    name={activeDeal.brandName}
                    size="hero"
                  />
                </div>
              </button>

              {nextDeal && (
                <button
                  type="button"
                  className="deals-cover-card is-peek-right"
                  style={{ background: getCardPalette(nextDeal.logoKey) }}
                  onClick={() => stepCarousel(1)}
                  aria-label={`Next deal: ${nextDeal.brandName}`}
                >
                  <div className="deals-cover-logo">
                    <BrandLogoMark
                      logoKey={nextDeal.logoKey}
                      name={nextDeal.brandName}
                    />
                  </div>
                </button>
              )}
            </div>

            {/* Active Card Meta + Title */}
            <div className="deals-active-meta-row">
              <span className="deals-meta-left">{activeDeal.category}</span>
              <div className="deals-meta-center">
                <h1 className="deals-active-title">{activeDeal.headline}</h1>
                <p className="deals-active-sub">{activeDeal.brandName}</p>
              </div>
              <span className="deals-meta-right">{activeDeal.paymentAmount}</span>
            </div>

            {/* Prev / Primary CTA Pill / Next Control Row */}
            <div className="deals-transport-row">
              <button
                type="button"
                className="deals-step-btn"
                onClick={() => stepCarousel(-1)}
                aria-label="Previous brand deal"
              >
                <PrevStepIcon />
              </button>

              <button
                type="button"
                className="deals-primary-pill-cta"
                onClick={() => {
                  triggerLightHaptic();
                  onSelectDeal?.(activeDeal);
                }}
              >
                <span>Open Deal · {activeDeal.paymentAmount}</span>
              </button>

              <button
                type="button"
                className="deals-step-btn"
                onClick={() => stepCarousel(1)}
                aria-label="Next brand deal"
              >
                <NextStepIcon />
              </button>
            </div>
          </section>
        )}

        {/* Rest of Brand Deals Below in 3-Column Grid */}
        <section className="deals-popular-section">
          <h2 className="deals-popular-heading">
            {query.trim() ? 'Matching Brand Deals' : 'More Brand Deals'}
          </h2>

          {restDeals.length === 0 ? (
            <div className="deals-empty-state">No matching brand deals found.</div>
          ) : (
            <div className="deals-three-grid">
              {restDeals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  className="deals-mini-item"
                  onClick={() => {
                    triggerLightHaptic();
                    onSelectDeal?.(deal);
                  }}
                >
                  <div
                    className="deals-mini-card"
                    style={{ background: getCardPalette(deal.logoKey) }}
                  >
                    <BrandLogoMark
                      logoKey={deal.logoKey}
                      name={deal.brandName}
                    />
                  </div>
                  <div className="deals-mini-name">{deal.brandName}</div>
                  <div className="deals-mini-amount">{deal.paymentAmount}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        dark
        floating
      />
    </div>
  );
}
