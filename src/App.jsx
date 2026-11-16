import React, { useMemo, useState } from 'react';
import avatarJacob from './assets/avatar-jacob.jpg';
import heroCollage from './assets/hero-collage.png';
import {
  BackTriangleIcon,
  BrandsTabIcon,
  CardsTabIcon,
  CaretDownIcon,
  HomeTabIcon,
  ProfileTabIcon,
  SearchIcon,
} from './components/Icons';
import {
  CATEGORIES,
  PROMO_BY_CATEGORY,
  USER_PROFILES,
} from './data/brandsData';
import OnboardingScreen from './components/OnboardingScreen';
import ProfileScreen from './components/ProfileScreen';
import ProfileSetupScreen from './components/ProfileSetupScreen';
import RoleOnboardingFlow from './components/RoleOnboardingFlow';
import { triggerLightHaptic } from './utils/nativeBridge';

const SEARCHABLE_BRANDS = [
  { name: 'Waitrose', category: 'Grocery', rate: '3× miles' },
  { name: 'PlayStation Store', category: 'Retail', rate: '4× miles' },
  { name: 'Ticketmaster Live', category: 'Retail', rate: '2× miles' },
  { name: 'Wagamama', category: 'Dining', rate: '5× miles' },
  { name: 'John Lewis', category: 'Retail', rate: '4× miles' },
  { name: 'Sephora', category: 'Beauty', rate: '6× miles' },
  { name: 'Shell', category: 'Fuel', rate: '2× miles' },
];

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeTabIcon },
  { id: 'brands', label: 'Brands', Icon: BrandsTabIcon },
  { id: 'cards', label: 'My cards', Icon: CardsTabIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileTabIcon },
];

export default function App() {
  const [flowStep, setFlowStep] = useState('onboarding'); // onboarding | setup | role | main
  const [userAvatar, setUserAvatar] = useState(avatarJacob);
  const [roleDetails, setRoleDetails] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('brands');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(USER_PROFILES[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  const activePromo = PROMO_BY_CATEGORY[selectedCategory] || PROMO_BY_CATEGORY.All;

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_BRANDS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCategorySelect = (cat) => {
    triggerLightHaptic();
    setSelectedCategory(cat);
  };

  const handleTabSelect = (tabId) => {
    triggerLightHaptic();
    setActiveTab(tabId);
  };

  const handleCloseProfile = () => {
    setActiveTab('brands');
  };

  const handleBack = () => {
    triggerLightHaptic();
    if (offerOpen) {
      setOfferOpen(false);
      return;
    }
    if (searchQuery) {
      setSearchQuery('');
      return;
    }
    if (selectedCategory !== 'All') {
      setSelectedCategory('All');
      return;
    }
    if (activeTab !== 'brands') {
      setActiveTab('brands');
      return;
    }
    setFlowStep('role');
  };

  const handleSetupComplete = ({ name, avatar }) => {
    if (avatar) {
      setUserAvatar(avatar);
    }
    if (name) {
      setSelectedUser((prev) => ({ ...prev, name }));
    }
    setFlowStep('role');
  };

  const handleRoleComplete = (details) => {
    setRoleDetails(details);
    setFlowStep('main');
  };

  return (
    <div className="viewport-stage">
      <main
        className="mobile-screen"
        aria-label={
          flowStep === 'onboarding'
            ? 'Onboarding screen'
            : flowStep === 'setup'
              ? 'Profile setup screen'
              : flowStep === 'role'
                ? 'Founder or Creator selection'
                : activeTab === 'profile'
                  ? 'Olivia Beits profile screen'
                  : 'Brands discovery screen'
        }
      >
        {flowStep === 'onboarding' ? (
          <OnboardingScreen onComplete={() => setFlowStep('setup')} />
        ) : flowStep === 'setup' ? (
          <ProfileSetupScreen
            onBack={() => setFlowStep('onboarding')}
            onComplete={handleSetupComplete}
          />
        ) : flowStep === 'role' ? (
          <RoleOnboardingFlow
            userName={selectedUser.name}
            onBackToSetup={() => setFlowStep('setup')}
            onComplete={handleRoleComplete}
          />
        ) : activeTab === 'profile' ? (
          <ProfileScreen onClose={handleCloseProfile} />
        ) : (
          <>
            <div className="screen-content">
              {/* Top Navigation Row */}
              <header className="top-bar">
                <button
                  type="button"
                  className="back-btn"
                  onClick={handleBack}
                  aria-label="Go back"
                >
                  <BackTriangleIcon />
                </button>

                <div className="user-pill-wrap">
                  <button
                    type="button"
                    className="user-pill"
                    onClick={() => {
                      triggerLightHaptic();
                      setMenuOpen((prev) => !prev);
                    }}
                    aria-expanded={menuOpen}
                    aria-label="Switch user profile"
                  >
                    <img
                      src={userAvatar}
                      alt={selectedUser.name}
                      className="user-avatar"
                    />
                    <span className="user-name">{selectedUser.name}</span>
                    <CaretDownIcon />
                  </button>

                  {menuOpen && (
                    <div className="user-menu" role="menu">
                      {USER_PROFILES.map((profile) => (
                        <button
                          key={profile.name}
                          type="button"
                          role="menuitem"
                          className={`user-menu-item ${selectedUser.name === profile.name ? 'active' : ''
                            }`}
                          onClick={() => {
                            triggerLightHaptic();
                            setSelectedUser(profile);
                            setMenuOpen(false);
                          }}
                        >
                          <span className="user-menu-title">{profile.name}</span>
                          <span className="user-menu-sub">
                            {profile.name === selectedUser.name && roleDetails
                              ? roleDetails.role === 'founder'
                                ? `${roleDetails.companyName} · ${roleDetails.sector}`
                                : `@${roleDetails.instagram} · Creator`
                              : profile.miles}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </header>

              {/* Subtitle, Title & Search Pill */}
              <section className="hero-header">
                <p className="partner-count">142 partners earning miles</p>
                <h1 className="screen-title">Brands</h1>

                <label className="search-box" aria-label="Search brands, shops or services">
                  <SearchIcon />
                  <input
                    type="search"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search brands, shops or services"
                  />
                </label>
              </section>

              {/* Center 3D Hero Illustration */}
              <section className="collage-stage" aria-hidden={Boolean(searchQuery.trim())}>
                <img
                  src={heroCollage}
                  alt="Gaming, live entertainment ticket, and bowling partner rewards"
                  className="collage-image"
                />

                {searchQuery.trim() && (
                  <div className="search-results-sheet" role="region" aria-label="Search results">
                    <div className="search-results-header">
                      <span>{filteredBrands.length} matching partners</span>
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear
                      </button>
                    </div>
                    {filteredBrands.length > 0 ? (
                      filteredBrands.map((brand) => (
                        <div key={brand.name} className="search-result-row">
                          <div>
                            <div className="search-result-brand">{brand.name}</div>
                            <div className="search-result-cat">{brand.category}</div>
                          </div>
                          <span className="search-result-rate">{brand.rate}</span>
                        </div>
                      ))
                    ) : (
                      <div className="search-result-cat">
                        No partners matched &ldquo;{searchQuery}&rdquo;.
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Category Filter Chips */}
              <nav className="category-row" aria-label="Brand categories">
                {CATEGORIES.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`category-pill ${isActive ? 'active' : ''}`}
                      onClick={() => handleCategorySelect(category)}
                      aria-pressed={isActive}
                    >
                      {category}
                    </button>
                  );
                })}
              </nav>

              {/* Featured Promo Banner */}
              <section className="promo-wrap">
                <button
                  type="button"
                  className="promo-card"
                  onClick={() => {
                    triggerLightHaptic();
                    setOfferOpen(true);
                  }}
                >
                  <div>
                    <div className="promo-title">{activePromo.title}</div>
                    <div className="promo-subtitle">{activePromo.subtitle}</div>
                  </div>
                  <span className="promo-badge">{activePromo.badge}</span>
                </button>
              </section>

              {/* Floating Bottom Tab Navigation */}
              <div className="bottom-nav-wrap">
                <nav className="bottom-nav" aria-label="Primary navigation">
                  {TABS.map(({ id, label, Icon }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleTabSelect(id)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon active={isActive} />
                        <span className="nav-label">{label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Offer Details Bottom Sheet */}
            {offerOpen && (
              <div
                className="offer-backdrop"
                role="dialog"
                aria-modal="true"
                aria-label={activePromo.title}
                onClick={() => setOfferOpen(false)}
              >
                <div className="offer-sheet" onClick={(e) => e.stopPropagation()}>
                  <div className="sheet-handle" />
                  <h2 className="offer-sheet-title">{activePromo.title}</h2>
                  <p className="offer-sheet-sub">{activePromo.subtitle}</p>
                  <p className="offer-sheet-desc">
                    Pay with any linked card in {selectedUser.name}&apos;s wallet to earn
                    bonus miles automatically at checkout.
                  </p>
                  <button
                    type="button"
                    className="offer-cta"
                    onClick={() => {
                      triggerLightHaptic();
                      setOfferOpen(false);
                    }}
                  >
                    Activate offer
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

