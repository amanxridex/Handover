import React from 'react';

export default function BrandLogoMark({ logoKey, name, size = 'card' }) {
  const isHero = size === 'hero';
  const className = isHero ? 'brand-logo-wrap is-hero' : 'brand-logo-wrap';

  switch (logoKey) {
    case 'mcdonalds':
      return (
        <span className={className}>
          <svg width="64" height="52" viewBox="0 0 64 52" fill="none" aria-label={name}>
            <path
              d="M10 47C10 21 16 7 22 7C27.5 7 31 19 32 34C33 19 36.5 7 42 7C48 7 54 21 54 47H47C47 25 44 14 41 14C37.8 14 35.4 25 35.2 42H28.8C28.6 25 26.2 14 23 14C20 14 17 25 17 47H10Z"
              fill="#FFC72C"
            />
          </svg>
        </span>
      );

    case 'dominos':
      return (
        <span className={className} aria-label={name}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <g transform="rotate(-45 24 24)">
              <rect x="13" y="4" width="22" height="20" rx="3.5" fill="#E31837" />
              <circle cx="24" cy="14" r="3.1" fill="#FFFFFF" />
              <rect x="13" y="25" width="22" height="20" rx="3.5" fill="#006491" />
              <circle cx="19.5" cy="31" r="2.7" fill="#FFFFFF" />
              <circle cx="28.5" cy="39" r="2.7" fill="#FFFFFF" />
            </g>
          </svg>
        </span>
      );

    case 'starbucks':
      return (
        <span className={className}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-label={name}>
            <circle cx="26" cy="26" r="22" fill="#00704A" />
            <circle cx="26" cy="26" r="18" stroke="#FFFFFF" strokeWidth="1.6" />
            <text
              x="26"
              y="31"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="15"
              fontWeight="800"
              fontFamily="var(--font-display)"
            >
              SBX
            </text>
          </svg>
        </span>
      );

    case 'chipotle':
      return (
        <span className={className}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-label={name}>
            <circle cx="26" cy="26" r="21" fill="#A81612" />
            <path
              d="M27.5 14C29.5 18 33.5 21 33.5 27C33.5 32.5 29.8 36.5 25.5 36.5C21.8 36.5 19.5 33.5 19.5 29.5C19.5 24 24.5 20.5 27.5 14Z"
              fill="#FFFFFF"
            />
            <path d="M27 11C28.2 12.6 28.8 14.5 28.5 16" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </span>
      );

    case 'nike':
      return (
        <span className={className}>
          <svg width="78" height="46" viewBox="0 0 78 46" fill="none" aria-label={name}>
            <text
              x="39"
              y="18"
              textAnchor="middle"
              fill="currentColor"
              fontSize="13.5"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="1.2"
              fontFamily="var(--font-display)"
            >
              NIKE
            </text>
            <path
              d="M15 24C12 29 14.5 35.5 22.5 35.5C27.5 35.5 34.5 33 65 20.5C37.5 28.8 27 30.8 22.5 30.2C18.8 29.7 17.5 26.8 18.8 24H15Z"
              fill="currentColor"
            />
          </svg>
        </span>
      );

    case 'reebok':
      return (
        <span className={className}>
          <svg width="82" height="48" viewBox="0 0 82 48" fill="none" aria-label={name}>
            <text
              x="41"
              y="18"
              textAnchor="middle"
              fill="currentColor"
              fontSize="14.5"
              fontWeight="800"
              letterSpacing="-0.3"
              fontFamily="var(--font-display)"
            >
              Reebok
            </text>
            <path
              d="M14 39C27 30 43 26.5 64 26.5C47 29.5 33.5 34.5 22 41L14 39Z"
              fill="currentColor"
            />
            <path d="M29 26.5L36 23L41 36L35 38.5L29 26.5Z" fill="#E11D48" />
          </svg>
        </span>
      );

    case 'puma':
      return (
        <span className={className}>
          <svg width="82" height="44" viewBox="0 0 82 44" fill="none" aria-label={name}>
            <text
              x="41"
              y="29"
              textAnchor="middle"
              fill="currentColor"
              fontSize="19"
              fontWeight="900"
              letterSpacing="1.5"
              fontFamily="var(--font-display)"
            >
              PUMA
            </text>
          </svg>
        </span>
      );

    case 'gymshark':
      return (
        <span className={className}>
          <svg width="82" height="46" viewBox="0 0 82 46" fill="none" aria-label={name}>
            <path
              d="M27 31C30 22 38 15 49 12C45.5 18.5 46 25 53 31C46.5 29.5 37 29.5 27 31Z"
              fill="currentColor"
            />
            <text
              x="41"
              y="42"
              textAnchor="middle"
              fill="currentColor"
              fontSize="10"
              fontWeight="800"
              letterSpacing="1.4"
              fontFamily="var(--font-display)"
            >
              GYMSHARK
            </text>
          </svg>
        </span>
      );

    case 'zara':
      return (
        <span className={className}>
          <svg width="84" height="42" viewBox="0 0 84 42" fill="none" aria-label={name}>
            <text
              x="42"
              y="28"
              textAnchor="middle"
              fill="currentColor"
              fontSize="24"
              fontWeight="700"
              letterSpacing="-1.2"
              fontFamily="Georgia, 'Times New Roman', serif"
            >
              ZARA
            </text>
          </svg>
        </span>
      );

    case 'adidas':
      return (
        <span className={className}>
          <svg width="76" height="50" viewBox="0 0 76 50" fill="none" aria-label={name}>
            <rect x="21" y="21" width="6.5" height="9" transform="rotate(-28 21 21)" fill="currentColor" />
            <rect x="31" y="15" width="6.5" height="15" transform="rotate(-28 31 15)" fill="currentColor" />
            <rect x="41" y="9" width="6.5" height="21" transform="rotate(-28 41 9)" fill="currentColor" />
            <text
              x="38"
              y="44"
              textAnchor="middle"
              fill="currentColor"
              fontSize="13.5"
              fontWeight="800"
              letterSpacing="-0.3"
              fontFamily="var(--font-display)"
            >
              adidas
            </text>
          </svg>
        </span>
      );

    case 'uniqlo':
      return (
        <span className={className}>
          <div className="brand-logo-uniqlo" aria-label={name}>
            <span>UNI</span>
            <span>QLO</span>
          </div>
        </span>
      );

    case 'hm':
      return (
        <span className={className}>
          <svg width="74" height="44" viewBox="0 0 74 44" fill="none" aria-label={name}>
            <text
              x="37"
              y="31"
              textAnchor="middle"
              fill="#E50010"
              fontSize="26"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="-1"
              fontFamily="Georgia, serif"
            >
              H&amp;M
            </text>
          </svg>
        </span>
      );

    case 'playstation':
      return (
        <span className={className}>
          <svg width="64" height="48" viewBox="0 0 64 48" fill="none" aria-label={name}>
            <path
              d="M27 9V38.5L34 41V16.5C34 14.5 35.2 13.7 36.8 14.3C38.4 14.9 39.2 16.2 39.2 18.2V26.8C43.8 28.6 47.5 26.2 47.5 20.6C47.5 14.8 43.8 11.4 36.8 9.2C33.4 8.1 29.8 8.2 27 9Z"
              fill="#0070D1"
            />
            <path
              d="M24 31.2L14 34.7C11.4 35.6 10.6 37.5 12.6 38.6C14.7 39.8 18.2 39.7 21 38.7L24 37.6V31.2ZM36.5 32.5L47.5 28.8C50.3 27.9 53 28.7 53.6 30.3C54.2 31.8 52.3 33.4 49.4 34.4L36.5 38.9V32.5Z"
              fill="#0070D1"
            />
          </svg>
        </span>
      );

    case 'spotify':
      return (
        <span className={className}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label={name}>
            <circle cx="24" cy="24" r="21" fill="#1DB954" />
            <path
              d="M14.5 19.2C21.2 17.2 29.2 17.6 34.8 20.8"
              stroke="#06140C"
              strokeWidth="3.1"
              strokeLinecap="round"
            />
            <path
              d="M16.2 25.2C21.6 23.7 27.8 24 32.6 26.8"
              stroke="#06140C"
              strokeWidth="2.7"
              strokeLinecap="round"
            />
            <path
              d="M17.8 30.8C22 29.6 26.7 29.9 30.5 32"
              stroke="#06140C"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );

    case 'apple':
      return (
        <span className={className}>
          <svg width="44" height="50" viewBox="0 0 44 50" fill="none" aria-label={name}>
            <path
              d="M28.2 12.2C29.8 10.2 30.8 7.5 30.4 4.8C27.8 5 24.8 6.6 23.1 8.7C21.5 10.5 20.4 13.2 20.9 15.8C23.7 16 26.6 14.3 28.2 12.2ZM36.2 27.1C36.1 22.1 40.3 19.6 40.5 19.5C38.1 16 34.4 15.5 33.1 15.4C30 15.1 27 17.2 25.4 17.2C23.8 17.2 21.3 15.4 18.7 15.5C15.3 15.6 12.1 17.5 10.4 20.6C6.8 26.8 9.5 36.1 12.9 41.1C14.6 43.6 16.6 46.3 19.3 46.2C21.9 46.1 22.9 44.5 26 44.5C29.1 44.5 30 46.2 32.7 46.1C35.5 46.1 37.2 43.6 38.9 41.1C40.9 38.2 41.7 35.4 41.7 35.2C41.6 35.1 36.3 33.1 36.2 27.1Z"
              fill="currentColor"
            />
          </svg>
        </span>
      );

    case 'sony':
      return (
        <span className={className}>
          <svg width="82" height="40" viewBox="0 0 82 40" fill="none" aria-label={name}>
            <text
              x="41"
              y="26"
              textAnchor="middle"
              fill="currentColor"
              fontSize="20"
              fontWeight="700"
              letterSpacing="2.2"
              fontFamily="Georgia, 'Times New Roman', serif"
            >
              SONY
            </text>
          </svg>
        </span>
      );

    default:
      return (
        <div className="brand-logo-fallback">
          {String(name || '?').slice(0, 2).toUpperCase()}
        </div>
      );
  }
}
