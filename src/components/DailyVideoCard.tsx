import React from 'react';

export interface DailyVideo {
  day: number; // 1 = перший день після реєстрації
  youtubeId: string;
  caption: string;
}

interface DailyVideoCardProps {
  label: string;
  videos: DailyVideo[];
  registeredAt?: string; // profile.created_at
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

export const DailyVideoCard: React.FC<DailyVideoCardProps> = ({ label, videos, registeredAt }) => {
  if (videos.length === 0) return null;
  const today = daysSinceRegistration(registeredAt);
  // Поки не додано відео на наступні дні — паде на останнє доступне,
  // а не зникає чи ламається.
  const video = videos.find(v => v.day === today) || videos[Math.min(today, videos.length) - 1] || videos[videos.length - 1];

  return (
    <div className="glass-card p-3.5 flex flex-col gap-2">
      <span className="text-[11px] font-bold text-primary uppercase tracking-wide">{label}</span>
      <div className="rounded-xl overflow-hidden bg-black aspect-video">
        <iframe
          key={video.youtubeId}
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.caption}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <p className="text-sm font-semibold text-foreground">{video.caption}</p>
    </div>
  );
};
