import React, { useEffect, useState } from 'react';
import { LeadOslavAvatar } from '@/components/LeadOslav';

const SEEN_KEY_PREFIX = 'leadoslav_meet_tip_seen_';

interface BriefMeetTipProps {
  userId: string | undefined;
  targetRef: React.RefObject<HTMLButtonElement>;
  /** Показувати підказку тільки поки бриф ще не зібрано (кнопка не "done"). */
  active: boolean;
}

export const BriefMeetTip: React.FC<BriefMeetTipProps> = ({ userId, targetRef, active }) => {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!userId || !active) return;
    try {
      const key = `${SEEN_KEY_PREFIX}${userId}`;
      if (!localStorage.getItem(key)) setVisible(true);
    } catch { /* localStorage unavailable — skip tip */ }
  }, [userId, active]);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible, targetRef]);

  useEffect(() => {
    // Ховаємо підказку сама собою, щойно бриф позначено зібраним —
    // не тримати спотлайт на кнопці, яку вже натиснули.
    if (visible && !active) {
      setVisible(false);
      if (userId) {
        try { localStorage.setItem(`${SEEN_KEY_PREFIX}${userId}`, '1'); } catch { /* ignore */ }
      }
    }
  }, [active, visible, userId]);

  if (!visible || !rect) return null;

  return (
    <>
      <div
        className="fixed z-40 pointer-events-none transition-all"
        style={{
          top: rect.top - 5,
          left: rect.left - 5,
          width: rect.width + 10,
          height: rect.height + 10,
          borderRadius: 999,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45), 0 0 0 3px hsl(var(--primary))',
        }}
      />
      <div
        className="fixed z-40 rounded-full pointer-events-none animate-ping"
        style={{
          top: rect.top - 5,
          left: rect.left - 5,
          width: rect.width + 10,
          height: rect.height + 10,
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
            <p className="text-xs text-foreground leading-snug">
              Вітаю! У тебе є перший теплий лід, який готовий працювати з тобою.
              {' '}Спробуй побудувати всю воронку роботи.
            </p>
            <p className="text-xs text-foreground leading-snug mt-1.5">
              Спочатку проведи міт з клієнтом — натисни на цю кнопку.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
