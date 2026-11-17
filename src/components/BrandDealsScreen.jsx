import React, { useEffect, useState } from 'react';
import { BRAND_DEAL_SECTIONS } from '../data/brandsData';
import { fetchBrandDeals, groupDealsByCategory } from '../services/dealsService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import BottomNav from './BottomNav';
import BrandLogoMark from './BrandLogoMark';
import { BackTriangleIcon } from './Icons';

export default function BrandDealsScreen({
  onBack,
  onSelectDeal,
  tabs,
  activeTab,
  onSelectTab,
}) {
  const [sections, setSections] = useState(BRAND_DEAL_SECTIONS);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    let mounted = true;
    fetchBrandDeals().then((rows) => {
      if (!mounted || !Array.isArray(rows) || rows.length === 0) return;
      setSections(groupDealsByCategory(rows));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleSection = (sectionId) => {
    triggerLightHaptic();
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <div className="deals-screen">
      <div className="deals-scroll">
        <header className="deals-header">
          <button
            type="button"
            className="notif-back-btn deals-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <BackTriangleIcon />
          </button>
          <h1 className="deals-header-title">Brand deals</h1>
          <span className="deals-header-spacer" aria-hidden="true" />
        </header>

        <div className="deals-sections">
          {sections.map((section) => {
            const isExpanded = Boolean(expandedSections[section.id]);
            const visibleDeals = isExpanded
              ? section.deals
              : section.deals.slice(0, 2);

            return (
              <section key={section.id} className="deals-section">
                <div className="deals-section-head">
                  <h2 className="deals-section-title">{section.category}</h2>
                  {section.deals.length > 2 && (
                    <button
                      type="button"
                      className="deals-view-all-btn"
                      onClick={() => toggleSection(section.id)}
                    >
                      {isExpanded ? 'Show less' : 'View All'}
                    </button>
                  )}
                </div>

                <div className="deals-grid">
                  {visibleDeals.map((deal) => (
                    <button
                      key={deal.id}
                      type="button"
                      className="deal-card"
                      onClick={() => {
                        triggerLightHaptic();
                        onSelectDeal?.(deal);
                      }}
                    >
                      <span className="deal-amount-pill">
                        {deal.paymentAmount}
                      </span>
                      <div className="deal-logo-stage">
                        <BrandLogoMark
                          logoKey={deal.logoKey}
                          name={deal.brandName}
                        />
                      </div>
                      <div className="deal-brand-name">{deal.brandName}</div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
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
