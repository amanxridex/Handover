import React, { useState } from 'react';

export default function BottomNav({
  tabs,
  activeTab,
  onSelectTab,
  dark = false,
  floating = false,
}) {
  const [rippleTab, setRippleTab] = useState(null);

  const handleTap = (id) => {
    setRippleTab(id);
    setTimeout(() => {
      setRippleTab((prev) => (prev === id ? null : prev));
    }, 340);
    onSelectTab(id);
  };

  return (
    <div className={`bottom-nav-wrap ${floating ? 'feed-bottom-nav-wrap' : ''}`}>
      <nav
        className={`bottom-nav ${dark ? 'feed-bottom-nav' : ''}`}
        aria-label="Primary navigation"
      >
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const isRippling = rippleTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`nav-item ${dark ? 'feed-nav-item' : ''} ${
                isActive ? 'active' : ''
              } ${isRippling ? 'is-rippling' : ''}`}
              onClick={() => handleTap(id)}
              aria-current={isActive ? 'page' : undefined}
            >
              {isRippling && <span className="nav-tap-ripple" aria-hidden="true" />}
              <span className="nav-icon-wrap">
                <Icon active={isActive} dark={dark} />
              </span>
              <span className="nav-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
