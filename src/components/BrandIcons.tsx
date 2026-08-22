import React from 'react';

// Rendered as an inline SVG (like TikTokIcon/GoogleIcon below) instead of an
// <img> pointing at a Lovable-only "*.asset.json" reference. That JSON's url
// field is a relative path served by Lovable's own preview proxy
// (/__l5e/assets-v1/...) — it 404s on any other host (e.g. Vercel), which is
// why the icon showed as a broken image in production.
export const MetaIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="metaLoopGradientLeft" x1="6" y1="18" x2="6" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0064E1" />
        <stop offset="40%" stopColor="#0064E1" />
        <stop offset="83%" stopColor="#0073EE" />
        <stop offset="100%" stopColor="#0082FB" />
      </linearGradient>
      <linearGradient id="metaLoopGradientRight" x1="42" y1="15.5" x2="42" y2="34.5" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0082FB" />
        <stop offset="100%" stopColor="#0064E0" />
      </linearGradient>
    </defs>
    <path
      d="M8.4 27.9c0 1.9.4 3.4 1 4.3.7 1.2 1.8 1.7 2.9 1.7 1.4 0 2.7-.4 5.2-3.7 2-2.6 4.3-6.3 5.9-8.6l2.7-4.1c1.8-2.8 4-5.9 6.4-8 2-1.7 4.1-2.7 6.3-2.7 3.6 0 7 2.1 9.6 6 2.8 4.2 4.2 9.5 4.2 15 0 3.3-.6 5.6-1.7 7.5-1.1 1.8-3.1 3.6-6.5 3.6v-5.2c2.9 0 3.6-2.7 3.6-5.7 0-4.5-1-9.5-3.4-13.2-1.7-2.6-3.8-4.2-6.2-4.2-2.6 0-4.6 1.9-6.9 5.4-1.2 1.8-2.4 4-3.8 6.5l-1.5 2.7c-3 5.4-3.8 6.6-5.3 8.6C18.1 39.3 15.9 40.5 13 40.5c-3.6 0-5.9-1.6-7.3-4-1.2-2-1.8-4.6-1.8-7.5l4.5-1.1z"
      fill="url(#metaLoopGradientLeft)"
    />
    <path
      d="M7.4 15.1c2.4-3.7 5.9-6.3 9.9-6.3 2.3 0 4.6.7 7 2.6 2.6 2.1 5.4 5.6 8.9 11.3l1.2 2c3 4.8 4.7 7.3 5.7 8.5 1.3 1.5 2.2 2 3.4 2 2.9 0 3.6-2.7 3.6-5.7l4-.1c0 3.3-.6 5.6-1.7 7.5-1.1 1.8-3.1 3.6-6.5 3.6-2.1 0-4-.5-6.1-2.4-1.6-1.5-3.5-4.1-4.9-6.4l-4.3-7.2c-2.2-3.6-4.1-6.3-5.3-7.5-1.2-1.3-2.8-2.9-5.4-2.9-2.1 0-3.9 1.4-5.4 3.7l-4.1-2.7z"
      fill="url(#metaLoopGradientRight)"
    />
    <path
      d="M17.3 12.8c-2.1 0-3.9 1.4-5.4 3.7-2 3.1-3.5 7.8-3.5 12.3 0 1.8.3 3.3.9 4.5l-4.5 1.1C4 32.7 3.6 30.5 3.6 28c0-5.1 1.5-10.5 4.4-14.9 2.4-3.7 5.9-6.3 9.9-6.3l-0.6 6z"
      fill="#0082FB"
    />
  </svg>
);

export const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <path d="M38.4 10.2c-2.06-1.38-3.5-3.6-3.86-6.18h.02A9.14 9.14 0 0134.4 2h-7.56v28.44c0 .1 0 .2-.01.3v.1A5.28 5.28 0 0121.6 36a5.28 5.28 0 01-5.24-5.32 5.28 5.28 0 015.24-5.32c.54 0 1.08.08 1.58.24v-7.72A13.04 13.04 0 008.8 30.68 13.04 13.04 0 0021.6 43.48a13.04 13.04 0 0012.8-12.8V16.34A16.54 16.54 0 0044 19.6v-7.62a9.16 9.16 0 01-5.6-1.78z" fill="#000"/>
    <path d="M36.4 8.2c1.52 1.12 3.38 1.78 5.6 1.78v3.48a12.54 12.54 0 01-7.6-3.26v14.48A9.04 9.04 0 0125.6 33.48 9.04 9.04 0 0116.8 24.68 9.04 9.04 0 0125.6 15.88c.36 0 .72.02 1.08.06v3.66a5.28 5.28 0 00-1.08-.12 5.28 5.28 0 00-5.24 5.32A5.28 5.28 0 0025.6 30.12a5.28 5.28 0 005.23-5.22V2h3.56c.04.7.16 1.38.36 2.02.64 2.06 2.1 3.72 3.86 4.18h-.21z" fill="#25F4EE"/>
    <path d="M30.84 24.9V6h3.56s-.04-.68 0-2h-7.56v28.44c0 .1 0 .2-.01.3v.1A5.28 5.28 0 0121.6 38a5.22 5.22 0 01-3.72-1.56A5.28 5.28 0 0025.6 30.12a5.28 5.28 0 005.24-5.22z" fill="#FE2C55"/>
  </svg>
);

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 48 48" className={className}>
    <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
    <path d="M5.3 14.7l7.4 5.4C14.5 16.2 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 6.1 29.6 4 24 4 15.4 4 8.1 8.5 5.3 14.7z" fill="#FF3D00"/>
    <path d="M24 44c5.4 0 10.2-1.8 14-5l-6.5-5.5C29.5 35.1 26.9 36 24 36c-6 0-11.1-4-12.8-9.5l-7.3 5.6C6.9 38.4 14.8 44 24 44z" fill="#4CAF50"/>
    <path d="M44.5 20H24v8.5h11.8c-.9 3-3 5.5-5.8 7l6.5 5.5c4.5-4.2 7-10.4 7-17 0-1.3-.2-2.7-.5-4h.5z" fill="#1976D2"/>
  </svg>
);
