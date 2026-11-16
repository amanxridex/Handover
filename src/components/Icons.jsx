import React from 'react';

export function BackTriangleIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden="true">
      <path
        d="M7.6 1.15C8.2 0.78 9 1.21 9 1.92V9.08C9 9.79 8.2 10.22 7.6 9.85L1.75 6.27C1.18 5.92 1.18 5.08 1.75 4.73L7.6 1.15Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function CaretDownIcon() {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
      <path
        d="M1.1 0.75H7.9C8.45 0.75 8.75 1.39 8.4 1.82L5.0 5.42C4.74 5.71 4.26 5.71 4.0 5.42L0.6 1.82C0.25 1.39 0.55 0.75 1.1 0.75Z"
        fill="#111827"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke="rgba(255, 255, 255, 0.88)"
        strokeWidth="1.7"
      />
      <path
        d="M12.2 12.2L15.8 15.8"
        stroke="rgba(255, 255, 255, 0.88)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeTabIcon({ active }) {
  const color = active ? '#E11D48' : '#111827';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.7 2.86C11.46 2.24 12.54 2.24 13.3 2.86L20.3 8.58C20.74 8.94 21 9.48 21 10.05V19.2C21 20.3 20.1 21.2 19 21.2H15.2C14.65 21.2 14.2 20.75 14.2 20.2V15.4C14.2 14.85 13.75 14.4 13.2 14.4H10.8C10.25 14.4 9.8 14.85 9.8 15.4V20.2C9.8 20.75 9.35 21.2 8.8 21.2H5C3.9 21.2 3 20.3 3 19.2V10.05C3 9.48 3.26 8.94 3.7 8.58L10.7 2.86Z"
        fill={color}
      />
    </svg>
  );
}

export function BrandsTabIcon({ active }) {
  const color = active ? '#E11D48' : '#111827';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4.5" width="16" height="15" rx="3.4" fill={color} />
      <path
        d="M8.7 9.4C8.7 11.22 10.18 12.7 12 12.7C13.82 12.7 15.3 11.22 15.3 9.4"
        stroke="#FFFFFF"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchTabIcon({ active }) {
  const color = active ? '#E11D48' : '#111827';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" stroke={color} strokeWidth="2.3" />
      <path
        d="M15.2 15.2L19.6 19.6"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfileTabIcon({ active }) {
  const color = active ? '#E11D48' : '#111827';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke={color} strokeWidth="2.1" />
      <circle cx="12" cy="9.4" r="2.7" fill={color} />
      <path
        d="M6.9 17.3C7.95 15.25 9.82 14.1 12 14.1C14.18 14.1 16.05 15.25 17.1 17.3"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseXIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 3L11 11M11 3L3 11"
        stroke="#FFFFFF"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoreDotsIcon() {
  return (
    <svg width="15" height="5" viewBox="0 0 15 5" fill="none" aria-hidden="true">
      <circle cx="2.2" cy="2.5" r="1.4" fill="#FFFFFF" />
      <circle cx="7.5" cy="2.5" r="1.4" fill="#FFFFFF" />
      <circle cx="12.8" cy="2.5" r="1.4" fill="#FFFFFF" />
    </svg>
  );
}

export function MessageBubbleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5C6.85 3.5 2.7 7.15 2.7 11.65C2.7 13.78 3.63 15.72 5.15 17.17L4.22 20.42C4.09 20.88 4.56 21.28 4.99 21.07L8.58 19.35C9.65 19.65 10.8 19.8 12 19.8C17.15 19.8 21.3 16.15 21.3 11.65C21.3 7.15 17.15 3.5 12 3.5Z"
        fill="#FFFFFF"
      />
      <circle cx="9.2" cy="11.7" r="1.15" fill="#2A2B31" />
      <circle cx="12" cy="11.7" r="1.15" fill="#2A2B31" />
      <circle cx="14.8" cy="11.7" r="1.15" fill="#2A2B31" />
    </svg>
  );
}

