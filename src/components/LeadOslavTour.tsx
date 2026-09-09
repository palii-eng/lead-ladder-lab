import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LeadOslavAvatar } from '@/components/LeadOslav';
import { SpotlightTip } from '@/components/SpotlightTip';
import { TOTAL_ONBOARD_HINTS } from '@/lib/onboardingHints';

const SEEN_KEY_PREFIX = 'leadoslav_tour_seen_';

interface LeadOslavTourProps {
  createBtnRef: React.RefObject<HTMLButtonElement>;
}

export const LeadOslavTour: React.FC<LeadOslavTourProps> = ({ createBtnRef }) => {
  const { user } = useAuth();
  // 0 = not running, 1 = welcome, 2 = leads-card spotlight, 3 = daily-videos
  // spotlight, 4 = spotlight on the create button
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const key = `${SEEN_KEY_PREFIX}${user.id}`;
      if (!localStorage.getItem(key)) setStep(1);
    } catch { /* localStorage unavailable — skip tour */ }
  }, [user]);

  useEffect(() => {
    if (step !== 4) return;
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
            <LeadOslavAvatar size={72} />
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-bold text-foreground">AI LeadОслав</p>
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  Підказка 1 з {TOTAL_ONBOARD_HINTS}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                Привіт! Ти зараз знаходишся в просторі для навчання студентів ADS School.
              </p>
              <p className="text-sm text-foreground leading-relaxed mt-2">
                Мене звати LeadОслав — я твій особистий помічник, співробітник так би мовити.
              </p>
              <p className="text-sm text-foreground leading-relaxed mt-2">
                Я буду допомагати тобі на всіх етапах: створювати ТЗ для дизайнерів, робити гіпотези по аудиторіях
                {' '}і таке інше — щоб процес навчання був простим, а вся рутина буде на мені.
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

  if (step === 2) {
    return (
      <SpotlightTip
        show
        targetSelector='[data-tour="leads-card"]'
        radius={16}
        lines={[
          'Тут кожен день ви будете отримувати 4 ліди для роботи.',
          'Можете обрати будь-який з проєктів і один з них взяти в роботу для побудови воронки. Це дозволить вам тренувати загальне бачення картини маркетингу та вирішення потенційних проблем, які будуть у реальних проєктах.',
        ]}
        confirmLabel="Зрозумів"
        onConfirm={() => setStep(3)}
        hintNumber={2}
      />
    );
  }

  if (step === 3) {
    return (
      <SpotlightTip
        show
        targetSelector='[data-tour="daily-videos"]'
        radius={16}
        lines={[
          'Тут кожен день будуть нові відео.',
          'Одне — навчальний матеріал наших курсів на різні теми.',
          'Друге — актуальні на сьогодні теми, як правило пов\u2019язані з AI або останніми оновленнями в ФБ.',
        ]}
        confirmLabel="Зрозумів"
        onConfirm={() => setStep(4)}
        hintNumber={3}
      />
    );
  }

  if (step === 4) {
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
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-bold text-xs text-foreground">AI LeadОслав</p>
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  Підказка 4 з {TOTAL_ONBOARD_HINTS}
                </span>
              </div>
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
