import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LeadOslavAvatar } from '@/components/LeadOslav';

const SEEN_KEY_PREFIX = 'leadoslav_tour_seen_';

interface LeadOslavTourProps {
  createBtnRef: React.RefObject<HTMLButtonElement>;
}

export const LeadOslavTour: React.FC<LeadOslavTourProps> = ({ createBtnRef }) => {
  const { user } = useAuth();
  // 0 = not running, 1 = welcome modal, 2 = spotlight on the create button
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const key = `${SEEN_KEY_PREFIX}${user.id}`;
      if (!localStorage.getItem(key)) setStep(1);
    } catch { /* localStorage unavailable — skip tour */ }
  }, [user]);

  useEffect(() => {
    if (step !== 2) return;
    const update = () => setRect(createBtnRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const raf = requestAnimationFrame(update); // catch layout settling right after step change
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      cancelAnimationFrame(raf);
    };
  }, [step, createBtnRef]);

  if (step === 1) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <div className="flex gap-3 items-start">
            <LeadOslavAvatar />
            <div>
              <p className="font-bold text-foreground mb-1">LeadОслав</p>
              <p className="text-sm text-foreground leading-relaxed">
                Дякую за реєстрацію! З цього моменту починається ваш шлях байєра. З боку зліва у вас є панель, де відображається ваш баланс коштів та активних проєктів.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setStep(2)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Зрозумів
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 2 && rect) {
    return (
      <>
        {/* Spotlight ring around the target button + dims the rest of the page */}
        <div
          className="fixed z-40 pointer-events-none transition-all"
          style={{
            top: rect.top - 5,
            left: rect.left - 5,
            width: rect.width + 10,
            height: rect.height + 10,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45), 0 0 0 3px hsl(var(--primary))',
          }}
        />
        <div
          className="fixed z-40 rounded-lg pointer-events-none animate-ping"
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
          style={{ top: rect.bottom + 14, left: Math.max(12, rect.right - 320) }}
        >
          <div className="flex gap-2.5 items-start bg-card border border-primary rounded-xl shadow-lg p-3 max-w-[320px]">
            <LeadOslavAvatar size={36} />
            <div>
              <p className="font-bold text-xs text-foreground mb-1">LeadОслав</p>
              <p className="text-xs text-foreground leading-snug">
                Давайте для початку знайдемо ваш новий проєкт та спробуємо втримати його якомога довше. Натисніть «Знайти новий проєкт»!
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
};

export const markLeadOslavTourSeen = (userId: string | undefined) => {
  if (!userId) return;
  try { localStorage.setItem(`${SEEN_KEY_PREFIX}${userId}`, '1'); } catch { /* ignore */ }
};
