import React from 'react';

// Real Meta logo, bundled as a static asset via Vite's normal import pipeline
// (not Lovable's "*.asset.json" proxy references, which 404 on Vercel).
import metaLogoPng from '@/assets/icons/meta-logo.png';

export const MetaIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <img src={metaLogoPng} alt="Meta" className={className} style={{ objectFit: 'contain' }} />
);

import tiktokLogoPng from '@/assets/icons/tiktok-logo.png';

export const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <img src={tiktokLogoPng} alt="TikTok" className={className} style={{ objectFit: 'contain' }} />
);

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 48 48" className={className}>
    <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
    <path d="M5.3 14.7l7.4 5.4C14.5 16.2 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 6.1 29.6 4 24 4 15.4 4 8.1 8.5 5.3 14.7z" fill="#FF3D00"/>
    <path d="M24 44c5.4 0 10.2-1.8 14-5l-6.5-5.5C29.5 35.1 26.9 36 24 36c-6 0-11.1-4-12.8-9.5l-7.3 5.6C6.9 38.4 14.8 44 24 44z" fill="#4CAF50"/>
    <path d="M44.5 20H24v8.5h11.8c-.9 3-3 5.5-5.8 7l6.5 5.5c4.5-4.2 7-10.4 7-17 0-1.3-.2-2.7-.5-4h.5z" fill="#1976D2"/>
  </svg>
);
