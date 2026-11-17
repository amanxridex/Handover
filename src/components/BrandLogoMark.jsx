import React from 'react';
import adidasLogo from '../assets/brands/adidas.svg';
import appleLogo from '../assets/brands/apple.svg';
import chipotleLogo from '../assets/brands/chipotle.png';
import dominosLogo from '../assets/brands/dominos.svg';
import gymsharkLogo from '../assets/brands/gymshark.png';
import hmLogo from '../assets/brands/hm.svg';
import mcdonaldsLogo from '../assets/brands/mcdonalds.svg';
import nikeLogo from '../assets/brands/nike.svg';
import playstationLogo from '../assets/brands/playstation.svg';
import pumaLogo from '../assets/brands/puma.svg';
import reebokLogo from '../assets/brands/reebok.svg';
import sonyLogo from '../assets/brands/sony.svg';
import spotifyLogo from '../assets/brands/spotify.svg';
import starbucksLogo from '../assets/brands/starbucks.svg';
import uniqloLogo from '../assets/brands/uniqlo.svg';
import zaraLogo from '../assets/brands/zara.svg';

const BRAND_LOGO_ASSETS = {
  mcdonalds: mcdonaldsLogo,
  dominos: dominosLogo,
  starbucks: starbucksLogo,
  chipotle: chipotleLogo,
  nike: nikeLogo,
  reebok: reebokLogo,
  puma: pumaLogo,
  gymshark: gymsharkLogo,
  zara: zaraLogo,
  adidas: adidasLogo,
  uniqlo: uniqloLogo,
  hm: hmLogo,
  playstation: playstationLogo,
  spotify: spotifyLogo,
  apple: appleLogo,
  sony: sonyLogo,
};

const WIDE_LOGOS = new Set(['zara', 'sony', 'puma', 'reebok', 'nike']);

export default function BrandLogoMark({ logoKey, logoUrl, name, size = 'card' }) {
  const isHero = size === 'hero';
  const className = isHero ? 'brand-logo-wrap is-hero' : 'brand-logo-wrap';

  if (logoUrl) {
    return (
      <span className={className}>
        <img
          src={logoUrl}
          alt={name}
          className="brand-logo-custom-img"
        />
      </span>
    );
  }

  const assetSrc = BRAND_LOGO_ASSETS[logoKey];
  if (assetSrc) {
    const modifiers = [
      'brand-logo-real-img',
      WIDE_LOGOS.has(logoKey) ? 'is-wide' : '',
      logoKey === 'gymshark' ? 'is-invert' : '',
      logoKey === 'chipotle' ? 'is-chipotle' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className={className}>
        <img
          src={assetSrc}
          alt={name}
          className={modifiers}
          loading="eager"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <div className="brand-logo-fallback">
      {String(name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}
