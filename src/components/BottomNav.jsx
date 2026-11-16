import React from 'react';

export default function BottomNav({
  tabs,
  activeTab,
  onSelectTab,
  dark = false,
  floating = false,
}) {
  return (
    <div className={`bottom-nav-wrap ${floating ? 'feed-bottom-nav-wrap' : ''}`}>
      <nav
        className={`bottom-nav ${dark ? 'feed-bottom-nav' : ''}`}
        aria-label="Primary navigation"
      >
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`nav-item ${dark ? 'feed-nav-item' : ''} ${
                isActive ? 'active' : ''
              }`}
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon active={isActive} dark={dark} />
              <span className="nav-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
