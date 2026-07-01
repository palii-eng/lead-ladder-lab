import f1 from '@/assets/clients/f1.jpg';
import f2 from '@/assets/clients/f2.jpg';
import f3 from '@/assets/clients/f3.jpg';
import f4 from '@/assets/clients/f4.jpg';
import f5 from '@/assets/clients/f5.jpg';
import m1 from '@/assets/clients/m1.jpg';
import m2 from '@/assets/clients/m2.jpg';
import m3 from '@/assets/clients/m3.jpg';
import m4 from '@/assets/clients/m4.jpg';
import m5 from '@/assets/clients/m5.jpg';

export const CLIENT_PHOTOS: Record<string, string> = {
  f1, f2, f3, f4, f5, m1, m2, m3, m4, m5,
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
  const match = raw.match(/\/(f[1-5]|m[1-5])\.jpg(\?|$)/i);
  if (match) {
    const key = match[1].toLowerCase();
    if (CLIENT_PHOTOS[key]) return CLIENT_PHOTOS[key];
  }
  return raw;
};
