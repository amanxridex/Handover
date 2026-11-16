import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import avatarDefault from './assets/avatar-default.jpg';
import heroCollage from './assets/hero-collage.png';
import {
  BackTriangleIcon,
  BrandsTabIcon,
  HomeTabIcon,
  ProfileTabIcon,
  SearchIcon,
  SearchTabIcon,
} from './components/Icons';
import {
  CATEGORIES,
  PROMO_BY_CATEGORY,
  USER_PROFILES,
} from './data/brandsData';
import OnboardingScreen from './components/OnboardingScreen';
import HomeFeedScreen from './components/HomeFeedScreen';
import ProfileScreen from './components/ProfileScreen';
import ProfileSetupScreen from './components/ProfileSetupScreen';
import RoleOnboardingFlow from './components/RoleOnboardingFlow';
import SplashScreen from './components/SplashScreen';
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
  { id: 'search', label: 'Search', Icon: SearchTabIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileTabIcon },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [flowStep, setFlowStep] = useState('onboarding'); // onboarding | setup | role | main
  const [roleSubStep, setRoleSubStep] = useState('role'); // role | founder-1 | founder-2 | creator-1
  const [setupData, setSetupData] = useState({
    name: '',
    username: '',
    avatar: avatarDefault,
  });
  const [roleDetails, setRoleDetails] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('brands');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(USER_PROFILES[0]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [exitHint, setExitHint] = useState(false);

  const isPoppingRef = useRef(false);
  const historyReadyRef = useRef(false);
  const lastRootBackRef = useRef(0);
  const exitTimerRef = useRef(null);

  const navSnapshot = useMemo(
    () => ({
      flowStep,
      roleSubStep,
      activeTab,
      offerOpen,
      hasPostModal: Boolean(selectedPost),
    }),
    [flowStep, roleSubStep, activeTab, offerOpen, selectedPost]
  );

  const navKey = JSON.stringify(navSnapshot);
  const prevNavKeyRef = useRef(navKey);

  // Initialize browser history sentinel + root entry so phone back gesture never exits unexpectedly
  useEffect(() => {
    const initial = {
      flowStep: 'onboarding',
      roleSubStep: 'role',
      activeTab: 'brands',
      offerOpen: false,
      hasPostModal: false,
    };
    window.history.replaceState({ handoverSentinel: true }, '');
    window.history.pushState({ handoverNav: initial }, '');
    historyReadyRef.current = true;

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Push history entry whenever user navigates forward in-app
  useEffect(() => {
    if (!historyReadyRef.current) return;
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      prevNavKeyRef.current = navKey;
      return;
    }
    if (prevNavKeyRef.current !== navKey) {
      prevNavKeyRef.current = navKey;
      window.history.pushState({ handoverNav: navSnapshot }, '');
    }
  }, [navKey, navSnapshot]);

  // Handle OS back gesture / browser back button
  useEffect(() => {
    const onPopState = (event) => {
      const state = event.state;

      if (state?.handoverNav) {
        isPoppingRef.current = true;
        const target = state.handoverNav;
        setFlowStep(target.flowStep);
        setRoleSubStep(target.roleSubStep || 'role');
        setActiveTab(target.activeTab || 'brands');
        setOfferOpen(Boolean(target.offerOpen));
        if (!target.hasPostModal) {
          setSelectedPost(null);
        }
        return;
      }

      // Hit root sentinel: keep user inside app unless they intentionally swipe twice within 1.8s
      const now = Date.now();
      if (now - lastRootBackRef.current < 1800) {
        return;
      }
      lastRootBackRef.current = now;
      setExitHint(true);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => setExitHint(false), 1800);

      window.history.pushState(
        {
          handoverNav: {
            flowStep,
            roleSubStep,
            activeTab,
            offerOpen,
            hasPostModal: Boolean(selectedPost),
          },
        },
        ''
      );
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [flowStep, roleSubStep, activeTab, offerOpen, selectedPost]);

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

  const goBackInHistory = useCallback(() => {
    window.history.back();
  }, []);

  const handleCategorySelect = (cat) => {
    triggerLightHaptic();
    setSelectedCategory(cat);
  };

  const handleTabSelect = (tabId) => {
    triggerLightHaptic();
    setActiveTab(tabId);
  };

  const handleCloseProfile = () => {
    goBackInHistory();
  };

  const handleBack = () => {
    triggerLightHaptic();
    if (offerOpen) {
      goBackInHistory();
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
    goBackInHistory();
  };

  const handleSetupComplete = (data) => {
    setSetupData(data);
    if (data.name) {
      setSelectedUser((prev) => ({ ...prev, name: data.name }));
    }
    setRoleSubStep('role');
    setFlowStep('role');
  };

  const handleRoleComplete = (details) => {
    setRoleDetails(details);
    setActiveTab('home');
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
            initialData={setupData}
            onBack={goBackInHistory}
            onComplete={handleSetupComplete}
          />
        ) : flowStep === 'role' ? (
          <RoleOnboardingFlow
            userName={selectedUser.name}
            subStep={roleSubStep}
            onSubStepChange={setRoleSubStep}
            initialData={roleDetails}
            onSaveDraft={setRoleDetails}
            onBackToSetup={goBackInHistory}
            onComplete={handleRoleComplete}
          />
        ) : activeTab === 'profile' ? (
          <ProfileScreen
            onClose={handleCloseProfile}
            selectedPost={selectedPost}
            onSelectPost={setSelectedPost}
            onClosePost={goBackInHistory}
          />
        ) : activeTab === 'home' ? (
          <HomeFeedScreen
            onOpenProfile={() => handleTabSelect('profile')}
            tabs={TABS}
            activeTab={activeTab}
            onSelectTab={handleTabSelect}
          />
        ) : (
          <>
            <div className="screen-content">
              {/* Top Navigation Row with Search */}
              <header className="top-bar">
                <button
                  type="button"
                  className="back-btn top-back-btn"
                  onClick={handleBack}
                  aria-label="Go back"
                >
                  <BackTriangleIcon />
                </button>

                <label
                  className="search-box top-search-box"
                  aria-label="Search brands, shops or services"
                >
                  <SearchIcon />
                  <input
                    type="search"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search brands, shops or services"
                  />
                </label>
              </header>

              {/* Subtitle & Title */}
              <section className="hero-header">
                <p className="partner-count">142 partners earning miles</p>
                <h1 className="screen-title">Brands</h1>
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
                onClick={goBackInHistory}
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
                      goBackInHistory();
                    }}
                  >
                    Activate offer
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {exitHint && (
          <div className="app-exit-toast" role="status">
            Swipe back again to exit
          </div>
        )}

        {showSplash && (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </main>
    </div>
  );
}
