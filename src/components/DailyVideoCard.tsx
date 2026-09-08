import React, { useState } from 'react';
import { Play } from 'lucide-react';

export interface DailyVideo {
  day: number; // 1 = перший день після реєстрації
  youtubeId: string;
  caption: string;
}

interface DailyVideoCardProps {
  label: string;
  videos: DailyVideo[];
  registeredAt?: string; // profile.created_at
  /** data-tour атрибут на корені картки — для спотлайту в онбордингу. */
  tourTag?: string;
}

// Скільки повних днів минуло з моменту реєстрації (день реєстрації = 1).
const daysSinceRegistration = (registeredAt?: string): number => {
  if (!registeredAt) return 1;
  const start = new Date(registeredAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
};

export const DailyVideoCard: React.FC<DailyVideoCardProps> = ({ label, videos, registeredAt, tourTag }) => {
  const [playing, setPlaying] = useState(false);
  if (videos.length === 0) return null;
  const today = daysSinceRegistration(registeredAt);
  // Поки не додано відео на наступні дні — паде на останнє доступне,
  // а не зникає чи ламається.
  const video = videos.find(v => v.day === today) || videos[Math.min(today, videos.length) - 1] || videos[videos.length - 1];

  return (
    <div className="glass-card p-3.5 flex flex-col gap-2" data-tour={tourTag}>
      <span className="text-[11px] font-bold text-primary uppercase tracking-wide">{label}</span>
      <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
        {playing ? (
          <iframe
            key={video.youtubeId}
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
            title={video.caption}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          // Власна "чиста" обкладинка без жодного тексту/панелей від
          // YouTube — сам плеєр (і його оверлей з назвою) підʼїжджає
          // тільки після кліку.
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group"
            title={video.caption}
          >
            <img
              src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt={video.caption}
              className="w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Play className="w-6 h-6 text-red-600 ml-0.5" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground">{video.caption}</p>
    </div>
  );
};
