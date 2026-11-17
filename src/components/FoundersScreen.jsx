import React, { useEffect, useMemo, useState } from 'react';
import {
  FOUNDER_CATEGORIES,
  fetchFoundersDirectory,
  getFallbackFounders,
} from '../services/foundersService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { SearchIcon } from './Icons';

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

function LocationPinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21C15.5 17.4 19 14.18 19 10.2C19 6.22 15.87 3 12 3C8.13 3 5 6.22 5 10.2C5 14.18 8.5 17.4 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function FoundersScreen({ onBack, onOpenChat }) {
  const [founders, setFounders] = useState(() => getFallbackFounders());
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFounder, setActiveFounder] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchFoundersDirectory().then((list) => {
      if (!mounted || !Array.isArray(list) || list.length === 0) return;
      setFounders(list);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleFounders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return founders.filter((f) => {
      const catOk =
        selectedCategory === 'All' || f.sector === selectedCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        f.companyName.toLowerCase().includes(q) ||
        f.fullName.toLowerCase().includes(q) ||
        f.sector.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q)
      );
    });
  }, [founders, query, selectedCategory]);

  return (
    <div className="founders-screen">
      <div className="founders-fixed-top">
        <header className="founders-header">
          <button
            type="button"
            className="founders-back-btn"
            onClick={() => {
              triggerLightHaptic();
              onBack?.();
            }}
            aria-label="Back to feed"
          >
            <BackArrowIcon />
          </button>
          <h1 className="founders-title">Founders</h1>
          <span className="founders-header-spacer" aria-hidden="true" />
        </header>

        <label className="founders-search-pill" aria-label="Search founders">
          <SearchIcon />
          <input
            type="search"
            className="founders-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Explore founders, startups, sectors..."
          />
        </label>

        <nav className="founders-pills-row" aria-label="Founder sectors">
          {FOUNDER_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                className={`founders-cat-pill ${isActive ? 'active' : ''}`}
                onClick={() => {
                  triggerLightHaptic();
                  setSelectedCategory(category);
                }}
              >
                {category}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="founders-list-scroll">
        {visibleFounders.length === 0 ? (
          <div className="founders-empty">
            No founders matched your search.
          </div>
        ) : (
          <div className="founders-cards-stack">
            {visibleFounders.map((founder) => (
              <button
                key={founder.id}
                type="button"
                className="founders-spot-card"
                onClick={() => {
                  triggerLightHaptic();
                  setActiveFounder(founder);
                }}
              >
                <img
                  src={founder.avatar}
                  alt={founder.companyName}
                  className="founders-spot-thumb"
                />
                <div className="founders-spot-body">
                  <div className="founders-spot-title">
                    {founder.companyName}
                  </div>
                  <div className="founders-spot-location">
                    <LocationPinIcon />
                    <span>{founder.location}</span>
                  </div>
                  <div className="founders-spot-rate">
                    <span className="founders-rate-label">Rate </span>
                    <span className="founders-rate-val">
                      {founder.rating}/5
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeFounder && (
        <div
          className="founders-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={activeFounder.companyName}
          onClick={() => setActiveFounder(null)}
        >
          <div
            className="founders-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="founders-modal-head">
              <img
                src={activeFounder.avatar}
                alt={activeFounder.companyName}
                className="founders-modal-thumb"
              />
              <div>
                <h2 className="founders-modal-title">
                  {activeFounder.companyName}
                </h2>
                <p className="founders-modal-sub">
                  {activeFounder.fullName} · @{activeFounder.username}
                </p>
                <p className="founders-modal-sector">{activeFounder.sector}</p>
              </div>
            </div>

            <p className="founders-modal-pitch">{activeFounder.companyPitch}</p>

            {activeFounder.websiteUrl && (
              <p className="founders-modal-meta">{activeFounder.websiteUrl}</p>
            )}

            <div className="founders-modal-actions">
              <button
                type="button"
                className="founders-modal-secondary"
                onClick={() => setActiveFounder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="founders-modal-primary"
                onClick={() => {
                  triggerLightHaptic();
                  setActiveFounder(null);
                  onOpenChat?.();
                }}
              >
                Message Founder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
