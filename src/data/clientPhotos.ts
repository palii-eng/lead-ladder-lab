import f1 from '@/assets/clients/f1.jpg';
import f2 from '@/assets/clients/f2.jpg';
import f3 from '@/assets/clients/f3.jpg';
import f4 from '@/assets/clients/f4.jpg';
import f5 from '@/assets/clients/f5.jpg';
import f6 from '@/assets/clients/f6.jpg';
import f7 from '@/assets/clients/f7.jpg';
import f8 from '@/assets/clients/f8.jpg';
import f9 from '@/assets/clients/f9.jpg';
import f10 from '@/assets/clients/f10.jpg';
import f11 from '@/assets/clients/f11.jpg';
import m1 from '@/assets/clients/m1.jpg';
import m2 from '@/assets/clients/m2.jpg';
import m3 from '@/assets/clients/m3.jpg';
import m4 from '@/assets/clients/m4.jpg';
import m5 from '@/assets/clients/m5.jpg';
import m6 from '@/assets/clients/m6.jpg';
import m7 from '@/assets/clients/m7.jpg';
import m8 from '@/assets/clients/m8.jpg';
import m9 from '@/assets/clients/m9.jpg';
import m10 from '@/assets/clients/m10.jpg';
import m11 from '@/assets/clients/m11.jpg';

export const CLIENT_PHOTOS: Record<string, string> = {
  f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11,
  m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11,
};

export type ClientPhotoKey = keyof typeof CLIENT_PHOTOS;

// Resolve a stable image URL for a stored client brief.
// New briefs persist `photoKey` (e.g. 'f5') which maps to the bundled asset.
// Legacy briefs stored a raw URL in `photo` — try to recover the key from the
// filename so the image survives production builds (Vite hashes asset paths).
export const resolveClientPhoto = (brief?: { photo?: string; photoKey?: string } | null): string => {
  if (!brief) return '';
  if (brief.photoKey && CLIENT_PHOTOS[brief.photoKey]) return CLIENT_PHOTOS[brief.photoKey];
  const raw = brief.photo || '';
  const match = raw.match(/\/(f\d{1,2}|m\d{1,2})\.jpg(\?|$)/i);
  if (match) {
    const key = match[1].toLowerCase();
    if (CLIENT_PHOTOS[key]) return CLIENT_PHOTOS[key];
  }
  return raw;
};
