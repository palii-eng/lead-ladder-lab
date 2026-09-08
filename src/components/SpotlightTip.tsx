import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LeadOslavAvatar } from '@/components/LeadOslav';

interface SpotlightTipProps {
  show: boolean;
  /**
   * CSS-селектор цілі, а не React ref — навмисно. Кнопки, які підсвічуються
   * тут, можуть монтуватись у кількох гілках лейауту одночасно (розгалужений/
   * нерозгалужений сценарій), і спільний ref тоді "перескакує" на останній
   * змонтований екземпляр. querySelector завжди бере перший реальний елемент
   * у DOM-порядку — стабільно і без цієї плутанини.
   */
  targetSelector: string;
  lines: string[];
  /** Заокруглення підсвітки: велике число для круглих/пігулкових кнопок, менше для прямокутних. */
  radius?: number;
}

export const SpotlightTip: React.FC<SpotlightTipProps> = ({ show, targetSelector, lines, radius = 999 }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!show) return;
    const update = () => {
      const el = document.querySelector(targetSelector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const raf = requestAnimationFrame(update);
    // DOM-структура канвасу може ще "осідати" (нові вузли зʼявляються з
    // затримкою) — кілька повторних спроб перші секунди після показу.
    const interval = setInterval(update, 300);
    const stopRetry = setTimeout(() => clearInterval(interval), 3000);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      cancelAnimationFrame(raf);
      clearInterval(interval);
      clearTimeout(stopRetry);
    };
  }, [show, targetSelector]);

  if (!show || !rect) return null;

  return createPortal(
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
    </>,
    document.body
  );
};
