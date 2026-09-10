import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** Якщо true — пробує стати збоку від цілі одразу, а не тільки коли не влазить знизу. За замовчуванням false (звичайна поведінка — знизу). */
  preferSide?: boolean;
}

export const SpotlightTip: React.FC<SpotlightTipProps> = ({ show, targetSelector, lines, radius = 999, confirmLabel, onConfirm, hintNumber, preferSide }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!show) return;
    const update = () => {
      const els = Array.from(document.querySelectorAll(targetSelector))
        .filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
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

  // Наївна початкова позиція — під ціллю. useLayoutEffect нижче міряє
  // реальний розмір бульбашки й підправляє її, якщо вона вилазить за межі
  // екрана (знизу — піднімає вище або ставить збоку від цілі; по боках —
  // притискає в межі viewport).
  useLayoutEffect(() => {
    if (!rect) { setBubblePos(null); return; }
    const margin = 12;
    const el = bubbleRef.current;
    const bw = el?.offsetWidth || 340;
    const bh = el?.offsetHeight || 120;

    let top = rect.bottom + 14;
    let left = Math.max(margin, rect.left);

    const overflowsBottom = top + bh > window.innerHeight - margin;
    if (preferSide || overflowsBottom) {
      // Пробуємо збоку від цілі (справа, або зліва якщо справа не влазить),
      // вертикально вирівняну по верху цілі й притиснуту в межі екрана.
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      if (spaceRight >= bw + 20 || spaceRight >= spaceLeft) {
        left = Math.min(rect.right + 14, window.innerWidth - bw - margin);
        top = rect.top;
      } else if (spaceLeft >= bw + 20) {
        left = Math.max(margin, rect.left - bw - 14);
        top = rect.top;
      } else if (overflowsBottom) {
        top = Math.min(Math.max(margin, rect.top), window.innerHeight - bh - margin);
      }
    }

    left = Math.min(Math.max(margin, left), window.innerWidth - bw - margin);
    top = Math.min(Math.max(margin, top), window.innerHeight - bh - margin);

    setBubblePos(prev => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  }, [rect, lines, preferSide]);

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
        data-spotlight-ring={targetSelector}
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
        ref={bubbleRef}
        className="fixed z-50"
        style={{
          top: (bubblePos || { top: rect.bottom + 14, left: Math.max(12, rect.left) }).top,
          left: (bubblePos || { top: rect.bottom + 14, left: Math.max(12, rect.left) }).left,
          visibility: bubblePos ? 'visible' : 'hidden',
        }}
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
