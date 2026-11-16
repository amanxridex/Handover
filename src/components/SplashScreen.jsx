import React, { useEffect, useState } from 'react';
import handoverMark from '../assets/logos/handover-mark-splash.png';
import GlassIconReveal from './GlassIconReveal';

export default function SplashScreen({ onFinish }) {
  const [exiting, setExiting] = useState(false);

  const finishSplash = React.useCallback(() => {
    setExiting((prev) => {
      if (prev) return prev;
      setTimeout(() => {
        onFinish();
      }, 420);
      return true;
    });
  }, [onFinish]);

  // Safety fallback timer in case WebGL is unavailable or reduced-motion is enabled
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const timeout = setTimeout(finishSplash, reduceMotion ? 1200 : 3800);
    return () => clearTimeout(timeout);
  }, [finishSplash]);

  return (
    <div
      className={`splash-screen ${exiting ? 'exiting' : ''}`}
      onClick={finishSplash}
      aria-label="Handover splash screen"
    >
      <GlassIconReveal
        logo={handoverMark}
        label="Handover"
        look="dark"
        background="#000000"
        plateColor="#061233"
        logoColor="#ffffff"
        iconPlate
        keepPlate={false}
        loop={false}
        speed={1.1}
        tileSize={220}
        logoScale={0.62}
        finalScale={0.82}
        tuning={{
          startZoom: 2.1,
          dispersion: 1.45,
          colorBleed: 0.9,
          halo: 1.15,
          specular: 1.1,
        }}
        onRevealComplete={() => {
          setTimeout(finishSplash, 260);
        }}
        className="splash-canvas"
      />
    </div>
  );
}

