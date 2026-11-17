import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBrandDeals, getFallbackDeals } from '../services/dealsService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import BottomNav from './BottomNav';
import BrandLogoMark from './BrandLogoMark';
import { SearchIcon } from './Icons';

const CARD_PALETTES = {
  mcdonalds: 'linear-gradient(155deg, #b91c1c 0%, #dc2626 58%, #991b1b 100%)',
  dominos: 'linear-gradient(155deg, #1d4ed8 0%, #2563eb 58%, #1e40af 100%)',
  starbucks: 'linear-gradient(155deg, #047857 0%, #059669 58%, #065f46 100%)',
  chipotle: 'linear-gradient(155deg, #f8fafc 0%, #ffffff 55%, #f1f5f9 100%)',
  nike: 'linear-gradient(155deg, #2563eb 0%, #3b82f6 55%, #1d4ed8 100%)',
  reebok: 'linear-gradient(155deg, #1e40af 0%, #3b82f6 58%, #1d4ed8 100%)',
  puma: 'linear-gradient(155deg, #ec4899 0%, #a855f7 55%, #6366f1 100%)',
  gymshark: 'linear-gradient(155deg, #0ea5e9 0%, #2563eb 58%, #1d4ed8 100%)',
  zara: 'linear-gradient(155deg, #f97316 0%, #fb7185 55%, #e11d48 100%)',
  adidas: 'linear-gradient(155deg, #06b6d4 0%, #0284c7 56%, #1d4ed8 100%)',
  uniqlo: 'linear-gradient(155deg, #e2e8f0 0%, #ffffff 55%, #cbd5e1 100%)',
  hm: 'linear-gradient(155deg, #f1f5f9 0%, #ffffff 55%, #e2e8f0 100%)',
  playstation: 'linear-gradient(155deg, #f0f9ff 0%, #ffffff 58%, #e0f2fe 100%)',
  spotify: 'linear-gradient(155deg, #047857 0%, #059669 58%, #065f46 100%)',
  apple: 'linear-gradient(155deg, #6366f1 0%, #3b82f6 54%, #2563eb 100%)',
  sony: 'linear-gradient(155deg, #2563eb 0%, #1d4ed8 56%, #1e3a8a 100%)',
};

const RECENT_COUNT = 6;
const CARD_STRIDE = 202;

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
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const [swipeDir, setSwipeDir] = useState('next');

  const pointerRef = useRef({
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    locked: null, // 'x' | 'y' | null
    dx: 0,
  });
  const suppressClickRef = useRef(false);
  const settleTimerRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    fetchBrandDeals().then((rows) => {
      if (!mounted || !Array.isArray(rows) || rows.length === 0) return;
      setDeals(rows);
    });
    return () => {
      mounted = false;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
    return source.slice(0, RECENT_COUNT);
  }, [deals, filteredDeals, query]);

  const restDeals = useMemo(() => {
    if (query.trim()) {
      return filteredDeals;
    }
    return deals.slice(RECENT_COUNT);
  }, [deals, filteredDeals, query]);

  const safeIndex =
    recentDeals.length > 0 ? carouselIndex % recentDeals.length : 0;
  const activeDeal = recentDeals[safeIndex] || null;

  const visibleSlots = useMemo(() => {
    const len = recentDeals.length;
    if (len === 0) return [];
    if (len === 1) return [0];
    if (len === 2) return [0, 1];
    if (len <= 4) return [-1, 0, 1];
    return [-2, -1, 0, 1, 2];
  }, [recentDeals.length]);

  const stepCarousel = (delta) => {
    const len = recentDeals.length;
    if (len <= 1) return;

    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    triggerLightHaptic();
    setSwipeDir(delta > 0 ? 'next' : 'prev');
    setIsDragging(false);
    setSkipTransition(false);
    setDragOffset(-delta * CARD_STRIDE);

    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      setSkipTransition(true);
      setCarouselIndex((prev) => (prev + delta + len) % len);
      setDragOffset(0);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setSkipTransition(false);
        });
      });
    }, 310);
  };

  const handlePointerDown = (e) => {
    if (recentDeals.length <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    pointerRef.current = {
      active: true,
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      locked: null,
      dx: 0,
    };
  };

  const handlePointerMove = (e) => {
    const st = pointerRef.current;
    if (!st.active || st.id !== e.pointerId) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (!st.locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      st.locked = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (st.locked === 'x') {
        setIsDragging(true);
        setSkipTransition(false);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
    }

    if (st.locked !== 'x') return;

    st.dx = dx;
    const maxPull = CARD_STRIDE * 1.15;
    const clamped = Math.max(-maxPull, Math.min(maxPull, dx));
    setDragOffset(clamped);
  };

  const finishPointerDrag = (e) => {
    const st = pointerRef.current;
    if (!st.active || st.id !== e.pointerId) return;

    const wasHorizontal = st.locked === 'x';
    const dx = st.dx;
    const dt = Math.max(16, Date.now() - st.startTime);
    const velocity = dx / dt;

    st.active = false;
    st.locked = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (!wasHorizontal) {
      return;
    }

    setIsDragging(false);

    if (Math.abs(dx) > 10) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 140);
    }

    if (Math.abs(dx) > 42 || Math.abs(velocity) > 0.35) {
      stepCarousel(dx < 0 ? 1 : -1);
    } else {
      setDragOffset(0);
    }
  };

  return (
    <div className="deals-showcase-screen">
      <div className="deals-showcase-scroll">
        {/* Top Title & Search Header */}
        <header className="deals-top-header">
          <h1 className="deals-header-title">Creator Deals</h1>

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
          >
            <div
              className="deals-coverflow-stage"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerDrag}
              onPointerCancel={finishPointerDrag}
            >
              {visibleSlots.map((slot) => {
                const len = recentDeals.length;
                const itemIdx = (safeIndex + slot + len) % len;
                const deal = recentDeals[itemIdx];
                if (!deal) return null;

                const pos = slot + dragOffset / CARD_STRIDE;
                const absPos = Math.abs(pos);
                const translateX = pos * CARD_STRIDE;
                const scale = Math.max(0.72, 1 - absPos * 0.19);
                const rotateDeg = Math.max(-5, Math.min(5, pos * 2.2));
                const opacity =
                  absPos >= 1.78 ? 0 : Math.max(0.32, 1 - absPos * 0.2);
                const zIndex = Math.max(1, Math.round(10 - absPos * 3));
                const isCenter = slot === 0;

                return (
                  <button
                    key={len >= 5 ? deal.id : `${deal.id}-${slot}`}
                    type="button"
                    className={`deals-cover-card is-floating ${
                      isCenter ? 'is-center-slot' : 'is-side-slot'
                    } ${isDragging || skipTransition ? 'is-immediate' : ''}`}
                    style={{
                      background: getCardPalette(deal.logoKey),
                      transform: `translate3d(${translateX}px, 0, 0) scale(${scale}) rotate(${rotateDeg}deg)`,
                      opacity,
                      zIndex,
                    }}
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      if (slot === 0) {
                        triggerLightHaptic();
                        onSelectDeal?.(deal);
                      } else {
                        stepCarousel(slot > 0 ? 1 : -1);
                      }
                    }}
                    aria-label={`${deal.brandName} brand deal`}
                  >
                    {isCenter && (
                      <span className="deals-cover-watermark" aria-hidden="true">
                        Deals
                      </span>
                    )}
                    <div className="deals-cover-logo">
                      <BrandLogoMark
                        logoKey={deal.logoKey}
                        logoUrl={deal.brandLogoUrl}
                        name={deal.brandName}
                        size={isCenter ? 'hero' : 'card'}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Card Meta + Title */}
            <div
              key={activeDeal.id}
              className={`deals-active-meta-row is-anim-${swipeDir}`}
            >
              <span className="deals-meta-left">{activeDeal.category}</span>
              <div className="deals-meta-center">
                <h2 className="deals-active-title">{activeDeal.headline}</h2>
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
                      logoUrl={deal.brandLogoUrl}
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
