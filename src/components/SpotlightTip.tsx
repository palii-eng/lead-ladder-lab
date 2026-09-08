import React, { useEffect, useState } from 'react';
import { LeadOslavAvatar } from '@/components/LeadOslav';

interface SpotlightTipProps {
  show: boolean;
  targetRef: React.RefObject<HTMLElement>;
  lines: string[];
  /** Заокруглення підсвітки: велике число для круглих/пігулкових кнопок, менше для прямокутних. */
  radius?: number;
}

export const SpotlightTip: React.FC<SpotlightTipProps> = ({ show, targetRef, lines, radius = 999 }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!show) return;
    const update = () => setRect(targetRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const raf = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      cancelAnimationFrame(raf);
    };
  }, [show, targetRef]);

  if (!show || !rect) return null;

  return (
    <>
      <div
        className="fixed z-40 pointer-events-none transition-all"
        style={{
          top: rect.top - 5,
          left: rect.left - 5,
          width: rect.width + 10,
          height: rect.height + 10,
          borderRadius: radius,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45), 0 0 0 3px hsl(var(--primary))',
        }}
      />
      <div
        className="fixed z-40 pointer-events-none animate-ping"
        style={{
          top: rect.top - 5,
          left: rect.left - 5,
          width: rect.width + 10,
          height: rect.height + 10,
          borderRadius: radius,
          boxShadow: '0 0 0 2px hsl(var(--primary))',
          opacity: 0.6,
        }}
      />
      <div
        className="fixed z-50"
        style={{ top: rect.bottom + 14, left: Math.max(12, rect.left) }}
      >
        <div className="flex gap-2.5 items-start bg-card border border-primary rounded-xl shadow-lg p-3 max-w-[340px]">
          <LeadOslavAvatar size={36} />
          <div>
            <p className="font-bold text-xs text-foreground mb-1">AI LeadОслав</p>
            {lines.map((line, i) => (
              <p key={i} className={`text-xs text-foreground leading-snug ${i > 0 ? 'mt-1.5' : ''}`}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
