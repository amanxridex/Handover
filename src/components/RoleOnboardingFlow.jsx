import React, { useMemo, useRef, useState } from 'react';
import handoverWordmark from '../assets/logos/handover-wordmark.png';
import { compressImageFile } from '../utils/imageCompress';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { BackTriangleIcon } from './Icons';

const FOUNDER_SECTORS = [
  'Fintech & Payments',
  'SaaS & AI',
  'E-commerce & Retail',
  'Consumer & Lifestyle',
  'Health & Wellness',
  'Media & Entertainment',
  'Education',
  'Others',
];

const CREATOR_NICHES = [
  'Lifestyle',
  'Tech & AI',
  'Fashion',
  'Fitness',
  'Food & Travel',
  'Finance',
  'Gaming',
  'Comedy',
  'Others',
];

const MAX_PITCH_WORDS = 25;

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function clampToMaxWords(text, maxWords) {
  const trimmedStart = text.replace(/^\s+/, '');
  if (!trimmedStart) return '';
  const words = trimmedStart.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  const hasTrailingSpace = /\s$/.test(text);
  const clamped = words.slice(0, maxWords).join(' ');
  return hasTrailingSpace && words.length === maxWords ? `${clamped} ` : clamped;
}

function FounderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3C15.8 5.2 18.2 9.1 18.5 13.5L15.2 16.8H8.8L5.5 13.5C5.8 9.1 8.2 5.2 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.2" r="2" fill="currentColor" />
      <path
        d="M9.5 16.8L8 20.5M14.5 16.8L16 20.5M12 16.8V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CreatorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L13.9 8.2L19 10.1L13.9 12L12 17.2L10.1 12L5 10.1L10.1 8.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 15.5L19.4 17.6L21.5 18.5L19.4 19.4L18.5 21.5L17.6 19.4L15.5 18.5L17.6 17.6L18.5 15.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function RoleOnboardingFlow({
  userName,
  subStep,
  onSubStepChange,
  initialData,
  onSaveDraft,
  onBackToSetup,
  onComplete,
}) {
  const [role, setRole] = useState(initialData?.role || ''); // founder | creator
  const [errorMsg, setErrorMsg] = useState('');

  // Founder state
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(
    initialData?.companyLogoUrl || ''
  );
  const logoInputRef = useRef(null);
  const [hasWebsite, setHasWebsite] = useState(
    initialData?.hasWebsite !== undefined ? initialData.hasWebsite : null
  ); // true | false | null
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl || '');
  const [founderInstagram, setFounderInstagram] = useState(
    initialData?.founderInstagram || ''
  );
  const [companyPitch, setCompanyPitch] = useState(
    initialData?.companyPitch || ''
  );
  const [sector, setSector] = useState(initialData?.sector || '');
  const [customSector, setCustomSector] = useState(
    initialData?.customSector || ''
  );

  // Creator state
  const [creatorInstagram, setCreatorInstagram] = useState(
    initialData?.creatorInstagram || ''
  );
  const [selectedNiches, setSelectedNiches] = useState(
    initialData?.selectedNiches || []
  );
  const [customNiche, setCustomNiche] = useState(
    initialData?.customNiche || ''
  );

  const displayFirstName = useMemo(() => {
    const clean = (userName || '').trim();
    if (!clean) return 'there';
    return clean.split(/\s+/)[0];
  }, [userName]);

  const pitchWordCount = useMemo(() => countWords(companyPitch), [companyPitch]);

  const buildDraft = (overrides = {}) => ({
    role,
    companyName,
    companyLogoUrl,
    hasWebsite,
    websiteUrl,
    founderInstagram,
    companyPitch,
    sector,
    customSector,
    creatorInstagram,
    selectedNiches,
    customNiche,
    ...overrides,
  });

  const handleBack = () => {
    triggerLightHaptic();
    setErrorMsg('');
    if (onSaveDraft) {
      onSaveDraft(buildDraft());
    }
    onBackToSetup();
  };

  const handleSelectRole = (chosenRole) => {
    triggerLightHaptic();
    setRole(chosenRole);
    setErrorMsg('');
    if (onSaveDraft) {
      onSaveDraft(buildDraft({ role: chosenRole }));
    }
  };

  const handleRoleContinue = () => {
    triggerLightHaptic();
    if (!role) {
      setErrorMsg('Please choose Founder or Creator to continue');
      return;
    }
    setErrorMsg('');
    if (onSaveDraft) {
      onSaveDraft(buildDraft());
    }
    onSubStepChange(role === 'founder' ? 'founder-1' : 'creator-1');
  };

  const handleCompanyLogoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerLightHaptic();
    const compressed = await compressImageFile(file, 512, 0.92);
    if (compressed) {
      setCompanyLogoUrl(compressed);
      setErrorMsg('');
    }
    e.target.value = '';
  };

  const handleFounderStep1Next = (e) => {
    e.preventDefault();
    triggerLightHaptic();
    if (!companyName.trim()) {
      setErrorMsg('Please enter your company name');
      return;
    }
    if (hasWebsite === null) {
      setErrorMsg('Let us know if you have a website');
      return;
    }
    if (hasWebsite && !websiteUrl.trim()) {
      setErrorMsg('Please enter your website URL');
      return;
    }
    if (!hasWebsite && !founderInstagram.trim()) {
      setErrorMsg('Please enter your Instagram handle');
      return;
    }
    setErrorMsg('');
    if (onSaveDraft) {
      onSaveDraft(buildDraft());
    }
    onSubStepChange('founder-2');
  };

  const handleFounderSubmit = (e) => {
    e.preventDefault();
    triggerLightHaptic();
    if (!companyPitch.trim()) {
      setErrorMsg('Please describe what your company does');
      return;
    }
    if (!sector) {
      setErrorMsg('Please choose your company sector');
      return;
    }
    if (sector === 'Others' && !customSector.trim()) {
      setErrorMsg('Please type your sector');
      return;
    }
    const draft = buildDraft();
    if (onSaveDraft) {
      onSaveDraft(draft);
    }
    onComplete({
      ...draft,
      role: 'founder',
      companyName: companyName.trim(),
      companyLogoUrl,
      hasWebsite,
      websiteUrl: hasWebsite ? websiteUrl.trim() : '',
      instagram: !hasWebsite ? founderInstagram.trim() : '',
      companyPitch: companyPitch.trim(),
      sector: sector === 'Others' ? customSector.trim() : sector,
    });
  };

  const toggleCreatorNiche = (niche) => {
    triggerLightHaptic();
    setErrorMsg('');
    setSelectedNiches((prev) =>
      prev.includes(niche) ? prev.filter((item) => item !== niche) : [...prev, niche]
    );
  };

  const handleCreatorSubmit = (e) => {
    e.preventDefault();
    triggerLightHaptic();
    if (!creatorInstagram.trim()) {
      setErrorMsg('Please enter your Instagram handle');
      return;
    }
    if (selectedNiches.length === 0) {
      setErrorMsg('Pick at least one kind of content you make');
      return;
    }
    if (selectedNiches.includes('Others') && !customNiche.trim()) {
      setErrorMsg('Please describe your content type');
      return;
    }
    const draft = buildDraft();
    if (onSaveDraft) {
      onSaveDraft(draft);
    }
    onComplete({
      ...draft,
      role: 'creator',
      instagram: creatorInstagram.trim(),
      contentTypes: selectedNiches.includes('Others')
        ? [...selectedNiches.filter((n) => n !== 'Others'), customNiche.trim()]
        : selectedNiches,
    });
  };

  const sanitizeHandle = (val) =>
    val.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30);

  return (
    <section className="onboarding-screen" aria-label="Role onboarding">
      <div className="onboarding-glow" aria-hidden="true">
        <div className="onboarding-glow-fade" />
      </div>

      <div className="setup-content">
        <header className="setup-top-bar">
          <button
            type="button"
            className="back-btn setup-back-btn"
            onClick={handleBack}
            aria-label="Go back"
          >
            <BackTriangleIcon />
          </button>

          <img
            src={handoverWordmark}
            alt="handover"
            className="setup-brand-logo"
          />
        </header>

        {/* STEP 1: Hey "name" — Founder or Creator */}
        {subStep === 'role' && (
          <div className="role-step">
            <div className="role-hero">
              <p className="role-greeting">
                Hey <span className="role-greeting-name">{displayFirstName}</span> 👋
              </p>
              <h1 className="role-title">
                Are you a <span className="onboarding-title-accent">Founder</span>
                <br />
                or a <span className="onboarding-title-accent">Creator</span>?
              </h1>
              <p className="role-subtitle">
                Pick your path so we can tailor handover for what you&apos;re building.
              </p>
            </div>

            <div className="role-cards">
              <button
                type="button"
                className={`role-card ${role === 'founder' ? 'selected' : ''}`}
                onClick={() => handleSelectRole('founder')}
                aria-pressed={role === 'founder'}
              >
                <div className="role-card-icon">
                  <FounderIcon />
                </div>
                <div className="role-card-copy">
                  <div className="role-card-title">Founder</div>
                  <div className="role-card-desc">
                    Building a company, product, or brand
                  </div>
                </div>
                <span className="role-card-check" aria-hidden="true">
                  {role === 'founder' && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3.2 8.4L6.4 11.6L12.8 4.8"
                        stroke="#FFFFFF"
                        strokeWidth="2.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </button>

              <button
                type="button"
                className={`role-card ${role === 'creator' ? 'selected' : ''}`}
                onClick={() => handleSelectRole('creator')}
                aria-pressed={role === 'creator'}
              >
                <div className="role-card-icon">
                  <CreatorIcon />
                </div>
                <div className="role-card-copy">
                  <div className="role-card-title">Creator</div>
                  <div className="role-card-desc">
                    Crafting content &amp; growing an audience
                  </div>
                </div>
                <span className="role-card-check" aria-hidden="true">
                  {role === 'creator' && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3.2 8.4L6.4 11.6L12.8 4.8"
                        stroke="#FFFFFF"
                        strokeWidth="2.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </button>
            </div>

            {errorMsg && (
              <p className="setup-error-banner" role="alert">
                {errorMsg}
              </p>
            )}

            <div className="setup-footer">
              <button
                type="button"
                className="onboarding-next-btn"
                onClick={handleRoleContinue}
              >
                <span className="onboarding-next-label">Continue</span>
              </button>
            </div>
          </div>
        )}

        {/* FOUNDER STEP 1: Company Name + Website or Instagram */}
        {subStep === 'founder-1' && (
          <form className="role-step" onSubmit={handleFounderStep1Next} noValidate>
            <div className="role-hero compact">
              <span className="role-eyebrow">Founder · Step 1 of 2</span>
              <h1 className="setup-title">Your company details</h1>
              <p className="setup-subtitle">
                Tell us what you&apos;re building and where people can find you.
              </p>
            </div>

            <div className="setup-fields">
              <div className="setup-field-group">
                <label htmlFor="company-name" className="setup-label">
                  Founder of?
                </label>
                <input
                  id="company-name"
                  type="text"
                  className="setup-input"
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setErrorMsg('');
                  }}
                />
              </div>

              <div className="setup-field-group">
                <span className="setup-label">Company logo</span>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="visually-hidden-file"
                  onChange={handleCompanyLogoPick}
                />
                <div className="setup-logo-row">
                  <button
                    type="button"
                    className="setup-logo-btn"
                    onClick={() => {
                      triggerLightHaptic();
                      logoInputRef.current?.click();
                    }}
                  >
                    {companyLogoUrl ? (
                      <img
                        src={companyLogoUrl}
                        alt={companyName || 'Company logo'}
                        className="setup-logo-thumb"
                      />
                    ) : (
                      <span className="setup-logo-placeholder" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 5V19M5 12H19"
                            stroke="currentColor"
                            strokeWidth="2.1"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    )}
                    <div className="setup-logo-copy">
                      <span className="setup-logo-title">
                        {companyLogoUrl ? 'Change company logo' : 'Upload company logo'}
                      </span>
                      <span className="setup-logo-sub">
                        Shown beside your name on posts as a Founder badge
                      </span>
                    </div>
                  </button>
                  {companyLogoUrl && (
                    <button
                      type="button"
                      className="setup-logo-remove"
                      onClick={() => {
                        triggerLightHaptic();
                        setCompanyLogoUrl('');
                      }}
                      aria-label="Remove company logo"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {(companyName.trim() || companyLogoUrl) && (
                  <div className="setup-logo-preview-pill">
                    <span className="setup-logo-preview-label">Post badge preview:</span>
                    <span className="setup-logo-preview-user">
                      {userName || 'Your Name'}
                    </span>
                    {companyLogoUrl ? (
                      <img
                        src={companyLogoUrl}
                        alt={companyName || 'Company badge'}
                        className="feed-founder-badge"
                      />
                    ) : (
                      <span className="feed-founder-monogram" aria-hidden="true">
                        {companyName.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="setup-field-group">
                <span className="setup-label">Do you have a website?</span>
                <div className="role-toggle-row">
                  <button
                    type="button"
                    className={`role-toggle-pill ${hasWebsite === true ? 'active' : ''}`}
                    onClick={() => {
                      triggerLightHaptic();
                      setHasWebsite(true);
                      setErrorMsg('');
                    }}
                  >
                    Yes, I have one
                  </button>
                  <button
                    type="button"
                    className={`role-toggle-pill ${hasWebsite === false ? 'active' : ''}`}
                    onClick={() => {
                      triggerLightHaptic();
                      setHasWebsite(false);
                      setErrorMsg('');
                    }}
                  >
                    No, not yet
                  </button>
                </div>
              </div>

              {hasWebsite === true && (
                <div className="setup-field-group role-reveal">
                  <label htmlFor="company-website" className="setup-label">
                    Website URL
                  </label>
                  <input
                    id="company-website"
                    type="url"
                    className="setup-input"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => {
                      setWebsiteUrl(e.target.value);
                      setErrorMsg('');
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              )}

              {hasWebsite === false && (
                <div className="setup-field-group role-reveal">
                  <label htmlFor="founder-instagram" className="setup-label">
                    Your Instagram handle
                  </label>
                  <div className="setup-username-box">
                    <span className="setup-at-prefix">@</span>
                    <input
                      id="founder-instagram"
                      type="text"
                      className="setup-username-input"
                      placeholder="yourhandle"
                      value={founderInstagram}
                      onChange={(e) => {
                        setFounderInstagram(sanitizeHandle(e.target.value));
                        setErrorMsg('');
                      }}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="setup-error-banner" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="setup-footer">
              <button type="submit" className="onboarding-next-btn">
                <span className="onboarding-next-label">Next</span>
              </button>
            </div>
          </form>
        )}

        {/* FOUNDER STEP 2: 25-word Company Description + Sector Dropdown */}
        {subStep === 'founder-2' && (
          <form className="role-step" onSubmit={handleFounderSubmit} noValidate>
            <div className="role-hero compact">
              <span className="role-eyebrow">Founder · Step 2 of 2</span>
              <h1 className="setup-title">
                What does {companyName.trim() || 'your company'} do?
              </h1>
              <p className="setup-subtitle">
                Keep it crisp — 25 words max and pick your sector.
              </p>
            </div>

            <div className="setup-fields">
              <div className="setup-field-group">
                <div className="role-label-row">
                  <label htmlFor="company-pitch" className="setup-label">
                    What your company does
                  </label>
                  <span
                    className={`role-word-count ${
                      pitchWordCount >= MAX_PITCH_WORDS ? 'limit' : ''
                    }`}
                  >
                    {pitchWordCount} / {MAX_PITCH_WORDS} words
                  </span>
                </div>
                <textarea
                  id="company-pitch"
                  className="setup-textarea"
                  rows={3}
                  placeholder="Describe what your company does in 25 words or less..."
                  value={companyPitch}
                  onChange={(e) => {
                    setCompanyPitch(
                      clampToMaxWords(e.target.value, MAX_PITCH_WORDS)
                    );
                    setErrorMsg('');
                  }}
                />
              </div>

              <div className="setup-field-group">
                <label htmlFor="company-sector" className="setup-label">
                  Choose sector
                </label>
                <div className="setup-select-wrap">
                  <select
                    id="company-sector"
                    className={`setup-select ${!sector ? 'placeholder' : ''}`}
                    value={sector}
                    onChange={(e) => {
                      setSector(e.target.value);
                      setErrorMsg('');
                    }}
                  >
                    <option value="" disabled>
                      Select a sector
                    </option>
                    {FOUNDER_SECTORS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <span className="setup-select-caret" aria-hidden="true">
                    ▾
                  </span>
                </div>
              </div>

              {sector === 'Others' && (
                <div className="setup-field-group role-reveal">
                  <label htmlFor="custom-sector" className="setup-label">
                    Type your sector
                  </label>
                  <input
                    id="custom-sector"
                    type="text"
                    className="setup-input"
                    placeholder="e.g. Clean Energy, Gaming..."
                    value={customSector}
                    onChange={(e) => {
                      setCustomSector(e.target.value);
                      setErrorMsg('');
                    }}
                  />
                </div>
              )}

              {errorMsg && (
                <p className="setup-error-banner" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="setup-footer">
              <button type="submit" className="onboarding-next-btn">
                <span className="onboarding-next-label">Finish Setup</span>
              </button>
            </div>
          </form>
        )}

        {/* CREATOR STEP: Instagram Handle + Content Type */}
        {subStep === 'creator-1' && (
          <form className="role-step" onSubmit={handleCreatorSubmit} noValidate>
            <div className="role-hero compact">
              <span className="role-eyebrow">Creator</span>
              <h1 className="setup-title">Your creator profile</h1>
              <p className="setup-subtitle">
                Drop your Instagram handle and the kind of content you make.
              </p>
            </div>

            <div className="setup-fields">
              <div className="setup-field-group">
                <label htmlFor="creator-instagram" className="setup-label">
                  Your Instagram handle
                </label>
                <div className="setup-username-box">
                  <span className="setup-at-prefix">@</span>
                  <input
                    id="creator-instagram"
                    type="text"
                    className="setup-username-input"
                    placeholder="yourhandle"
                    value={creatorInstagram}
                    onChange={(e) => {
                      setCreatorInstagram(sanitizeHandle(e.target.value));
                      setErrorMsg('');
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div className="setup-field-group">
                <span className="setup-label">
                  Which kind of content do you make?
                </span>
                <div className="role-niche-grid">
                  {CREATOR_NICHES.map((niche) => {
                    const active = selectedNiches.includes(niche);
                    return (
                      <button
                        key={niche}
                        type="button"
                        className={`role-niche-pill ${active ? 'active' : ''}`}
                        onClick={() => toggleCreatorNiche(niche)}
                        aria-pressed={active}
                      >
                        {niche}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedNiches.includes('Others') && (
                <div className="setup-field-group role-reveal">
                  <label htmlFor="custom-niche" className="setup-label">
                    Describe your content
                  </label>
                  <input
                    id="custom-niche"
                    type="text"
                    className="setup-input"
                    placeholder="e.g. Architecture, Podcasts..."
                    value={customNiche}
                    onChange={(e) => {
                      setCustomNiche(e.target.value);
                      setErrorMsg('');
                    }}
                  />
                </div>
              )}

              {errorMsg && (
                <p className="setup-error-banner" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="setup-footer">
              <button type="submit" className="onboarding-next-btn">
                <span className="onboarding-next-label">Finish Setup</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

