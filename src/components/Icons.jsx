import React from 'react';

export function BackTriangleIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden="true">
      <path
        d="M7.6 1.15C8.2 0.78 9 1.21 9 1.92V9.08C9 9.79 8.2 10.22 7.6 9.85L1.75 6.27C1.18 5.92 1.18 5.08 1.75 4.73L7.6 1.15Z"
        fill="currentColor"
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
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12.2 12.2L15.8 15.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeTabIcon({ active, dark = false }) {
  const color = active ? (dark ? '#FFFFFF' : '#E11D48') : dark ? 'rgba(255,255,255,0.62)' : '#111827';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.7 2.86C11.46 2.24 12.54 2.24 13.3 2.86L20.3 8.58C20.74 8.94 21 9.48 21 10.05V19.2C21 20.3 20.1 21.2 19 21.2H15.2C14.65 21.2 14.2 20.75 14.2 20.2V15.4C14.2 14.85 13.75 14.4 13.2 14.4H10.8C10.25 14.4 9.8 14.85 9.8 15.4V20.2C9.8 20.75 9.35 21.2 8.8 21.2H5C3.9 21.2 3 20.3 3 19.2V10.05C3 9.48 3.26 8.94 3.7 8.58L10.7 2.86Z"
        fill={color}
      />
    </svg>
  );
}

export function ChatTabIcon({ active, dark = false }) {
  const color = active ? (dark ? '#FFFFFF' : '#E11D48') : dark ? 'rgba(255,255,255,0.62)' : '#111827';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5C6.85 3.5 2.7 7.15 2.7 11.65C2.7 13.78 3.63 15.72 5.15 17.17L4.22 20.42C4.09 20.88 4.56 21.28 4.99 21.07L8.58 19.35C9.65 19.65 10.8 19.8 12 19.8C17.15 19.8 21.3 16.15 21.3 11.65C21.3 7.15 17.15 3.5 12 3.5Z"
        fill={color}
      />
      <circle cx="9.1" cy="11.7" r="1.15" fill={dark ? '#141418' : '#FFFFFF'} />
      <circle cx="12" cy="11.7" r="1.15" fill={dark ? '#141418' : '#FFFFFF'} />
      <circle cx="14.9" cy="11.7" r="1.15" fill={dark ? '#141418' : '#FFFFFF'} />
    </svg>
  );
}

export function SearchTabIcon({ active, dark = false }) {
  const color = active ? (dark ? '#FFFFFF' : '#E11D48') : dark ? 'rgba(255,255,255,0.62)' : '#111827';
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

export function ProfileTabIcon({ active, dark = false }) {
  const color = active ? (dark ? '#FFFFFF' : '#E11D48') : dark ? 'rgba(255,255,255,0.62)' : '#111827';
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


export function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8.5C18 5.46 15.31 3 12 3C8.69 3 6 5.46 6 8.5C6 14.2 3.5 16 3.5 16H20.5C20.5 16 18 14.2 18 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10.1 19.2C10.5 19.95 11.2 20.4 12 20.4C12.8 20.4 13.5 19.95 13.9 19.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 3.5V14.5M3.5 9H14.5"
        stroke="#FFFFFF"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3.5 5.2L7 8.8L10.5 5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommentBubbleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4C7.03 4 3 7.36 3 11.5C3 13.35 3.81 15.05 5.15 16.36L4.35 19.65L7.95 18.25C9.19 18.73 10.56 19 12 19C16.97 19 21 15.64 21 11.5C21 7.36 16.97 4 12 4Z"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.2C12 20.2 4 14.9 4 9.2C4 6.5 6.1 4.5 8.6 4.5C10.1 4.5 11.4 5.2 12 6.3C12.6 5.2 13.9 4.5 15.4 4.5C17.9 4.5 20 6.5 20 9.2C20 14.9 12 20.2 12 20.2Z"
        fill={filled ? '#EF233C' : 'none'}
        stroke={filled ? '#EF233C' : 'currentColor'}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        fill="rgba(48, 18, 4, 0.78)"
      />
      <path
        d="M5.5 11.5C5.5 15.09 8.41 18 12 18C15.59 18 18.5 15.09 18.5 11.5"
        stroke="rgba(48, 18, 4, 0.78)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18V21.5"
        stroke="rgba(48, 18, 4, 0.78)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BackChevronIcon() {
  return (
    <svg width="11" height="18" viewBox="0 0 12 20" fill="none" aria-hidden="true">
      <path
        d="M10 2L2 10L10 18"
        stroke="#FFFFFF"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.6 3.5H9.4C9.95 3.5 10.42 3.88 10.54 4.42L11.2 7.4C11.3 7.86 11.12 8.34 10.74 8.62L9.1 9.85C10.15 12.1 11.9 13.85 14.15 14.9L15.38 13.26C15.66 12.88 16.14 12.7 16.6 12.8L19.58 13.46C20.12 13.58 20.5 14.05 20.5 14.6V17.4C20.5 18.56 19.54 19.5 18.38 19.45C10.65 19.08 4.92 13.35 4.55 5.62C4.5 4.46 5.44 3.5 6.6 3.5Z"
        stroke="#FCE8C8"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserInfoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="#FCE8C8" strokeWidth="1.65" />
      <circle cx="12" cy="9.6" r="2.4" stroke="#FCE8C8" strokeWidth="1.6" />
      <path
        d="M7.6 17.2C8.6 15.35 10.18 14.4 12 14.4C13.82 14.4 15.4 15.35 16.4 17.2"
        stroke="#FCE8C8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PaperPlaneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 4.2L3.8 10.8C3.25 11.02 3.27 11.8 3.83 11.99L10.3 14.15L12.46 20.62C12.65 21.18 13.43 21.2 13.65 20.65L20.5 4.2Z"
        stroke="#1C1C20"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 14.15L15.4 9.05"
        stroke="#1C1C20"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
