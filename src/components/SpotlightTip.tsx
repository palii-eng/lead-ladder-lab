import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { LeadOslavAvatar } from '@/components/LeadOslav';
import { TOTAL_ONBOARD_HINTS } from '@/lib/onboardingHints';

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
  /** Якщо задано — в бульбашці зʼявляється кнопка підтвердження кроку. */
  confirmLabel?: string;
  onConfirm?: () => void;
  /** Наскрізний номер кроку в онбордингу — показує "Підказка N з 15". */
  hintNumber?: number;
}

export const SpotlightTip: React.FC<SpotlightTipProps> = ({ show, targetSelector, lines, radius = 999, confirmLabel, onConfirm, hintNumber }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!show) return;
    const update = () => {
      const els = document.querySelectorAll(targetSelector);
      if (els.length === 0) { setRect(null); return; }
      let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        top = Math.min(top, r.top);
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      });
      setRect(new DOMRect(left, top, right - left, bottom - top));
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
      <style>{`
        @keyframes spotlight-blink {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 4px hsl(var(--primary)), 0 0 24px 6px hsl(var(--primary) / 0.9); }
          50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 4px hsl(var(--primary)), 0 0 4px 2px hsl(var(--primary) / 0.3); }
        }
      `}</style>
      <div
        className="fixed z-40 pointer-events-none"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: radius,
          animation: 'spotlight-blink 1.1s ease-in-out infinite',
        }}
      />
      <div
        className="fixed z-40 pointer-events-none animate-ping"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: radius,
          boxShadow: '0 0 0 3px hsl(var(--primary))',
          opacity: 0.7,
        }}
      />
      <div
        className="fixed z-50"
        style={{ top: rect.bottom + 14, left: Math.max(12, rect.left) }}
      >
        <div className="flex gap-2.5 items-start bg-card border border-primary rounded-xl shadow-lg p-3 max-w-[340px]">
          <LeadOslavAvatar size={36} />
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="font-bold text-xs text-foreground">AI LeadОслав</p>
              {hintNumber && (
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  Підказка {hintNumber} з {TOTAL_ONBOARD_HINTS}
                </span>
              )}
            </div>
            {lines.map((line, i) => (
              <p key={i} className={`text-xs text-foreground leading-snug ${i > 0 ? 'mt-1.5' : ''}`}>{line}</p>
            ))}
            {confirmLabel && onConfirm && (
              <Button size="sm" onClick={onConfirm} className="mt-2.5 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-7">
                {confirmLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
