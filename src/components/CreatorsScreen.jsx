import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchCreatorsDirectory,
  getFallbackCreatorsData,
} from '../services/creatorsService';
import { triggerLightHaptic } from '../utils/nativeBridge';

function BackArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19 12H5M5 12L11 6M5 12L11 18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FoldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 3V18M15 6V21" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function UserCircleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.4" fill="currentColor" />
      <path
        d="M5.5 19.5C6.8 16.4 9.1 15 12 15C14.9 15 17.2 16.4 18.5 19.5"
        fill="currentColor"
      />
    </svg>
  );
}

function CircleArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#111827" />
      <path
        d="M9 12H15M15 12L12.5 9.5M15 12L12.5 14.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CreatorsScreen({ onBack, onOpenProfile, onOpenChat }) {
  const [directory, setDirectory] = useState(() => getFallbackCreatorsData());
  const [query, setQuery] = useState('');
  const [activeCreator, setActiveCreator] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchCreatorsDirectory().then((data) => {
      if (!mounted || !data) return;
      setDirectory(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = directory.list || [];
    if (!q) return base;
    return base.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        (c.contentTypes || []).some((t) => t.toLowerCase().includes(q)) ||
        (c.statsLine || '').toLowerCase().includes(q)
    );
  }, [directory.list, query]);

  const filteredFeatured = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = directory.featured || [];
    if (!q) return base;
    const matches = base.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.nicheSummary || '').toLowerCase().includes(q)
    );
    return matches.length > 0 ? matches : base;
  }, [directory.featured, query]);

  return (
    <div className="creators-screen">
      <div className="creators-scroll">
        {/* Top Search & Action Row */}
        <header className="creators-top-row">
          <button
            type="button"
            className="creators-circle-btn"
            onClick={() => {
              triggerLightHaptic();
              onBack?.();
            }}
            aria-label="Back to feed"
          >
            <BackArrowIcon />
          </button>

          <label className="creators-search-bar" aria-label="Search creators">
            <input
              type="search"
              className="creators-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Creators, Niches, Reels"
            />
            <span className="creators-search-glyph" aria-hidden="true">
              <FoldIcon />
            </span>
          </label>

          <button
            type="button"
            className="creators-circle-btn"
            onClick={() => {
              triggerLightHaptic();
              onOpenProfile?.();
            }}
            aria-label="Your profile"
          >
            <UserCircleGlyph />
          </button>
        </header>

        {/* Horizontal Peek Featured Creator Cards */}
        <div className="creators-hero-rail" aria-label="Featured creators">
          {filteredFeatured.map((creator) => (
            <button
              key={creator.id}
              type="button"
              className="creators-hero-card"
              onClick={() => {
                triggerLightHaptic();
                setActiveCreator(creator);
              }}
            >
              <img
                src={creator.coverImage}
                alt={creator.fullName}
                className="creators-hero-img"
              />
              <div className="creators-hero-scrim" aria-hidden="true" />

              <div className="creators-hero-top">
                <span className="creators-hero-kicker">
                  {creator.featuredTag}
                </span>
                <div className="creators-hero-name">{creator.fullName}</div>
                <div className="creators-hero-sub">{creator.nicheSummary}</div>
              </div>

              <div className="creators-hero-bottom">
                <div className="creators-mini-stack" aria-hidden="true">
                  {(creator.miniAvatars || []).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="creators-mini-avatar"
                    />
                  ))}
                </div>
                <span className="creators-hero-count">
                  {creator.campaignsText}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Creator Rows List */}
        <section className="creators-nearby-section">
          <h2 className="creators-section-heading">Popular Creators</h2>

          {filteredList.length === 0 ? (
            <div className="creators-empty">No creators matched your search.</div>
          ) : (
            <div className="creators-rows-list">
              {filteredList.map((creator) => (
                <button
                  key={creator.id}
                  type="button"
                  className="creators-list-row"
                  onClick={() => {
                    triggerLightHaptic();
                    setActiveCreator(creator);
                  }}
                >
                  <img
                    src={creator.avatar}
                    alt={creator.fullName}
                    className="creators-row-thumb"
                  />

                  <div className="creators-row-main">
                    <div className="creators-row-name">{creator.fullName}</div>
                    <div className="creators-row-meta">
                      <span
                        className="creators-row-dot"
                        style={{ background: creator.accentColor || '#111827' }}
                        aria-hidden="true"
                      />
                      <span>{creator.statsLine}</span>
                    </div>
                  </div>

                  <span className="creators-metric-pill">
                    <span>{creator.metricShort}</span>
                    <CircleArrowRight />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {activeCreator && (
        <div
          className="founders-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={activeCreator.fullName}
          onClick={() => setActiveCreator(null)}
        >
          <div
            className="founders-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="founders-modal-head">
              <img
                src={activeCreator.avatar}
                alt={activeCreator.fullName}
                className="founders-modal-thumb"
              />
              <div>
                <h2 className="founders-modal-title">
                  {activeCreator.fullName}
                </h2>
                <p className="founders-modal-sub">
                  @{activeCreator.username} · {activeCreator.metricShort}
                </p>
                <p className="founders-modal-sector">
                  {(activeCreator.contentTypes || ['Creator']).join(' · ')}
                </p>
              </div>
            </div>

            <p className="founders-modal-pitch">
              {activeCreator.bio || activeCreator.statsLine}
            </p>

            {activeCreator.instagram && (
              <p className="founders-modal-meta">@{activeCreator.instagram}</p>
            )}

            <div className="founders-modal-actions">
              <button
                type="button"
                className="founders-modal-secondary"
                onClick={() => setActiveCreator(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="founders-modal-primary"
                onClick={() => {
                  triggerLightHaptic();
                  setActiveCreator(null);
                  onOpenChat?.();
                }}
              >
                Message Creator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
