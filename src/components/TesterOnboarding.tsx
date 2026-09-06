import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Calendar, Trophy } from 'lucide-react';

// Shown exactly once per tester account, right after they land on the
// dashboard for the first time, explaining the daily-quota system:
// day 1 gives a bigger allowance (4 offered, take 2) to let them explore,
// every day after that is a steady trickle (2 offered, take 1).
const SEEN_KEY_PREFIX = 'tester_onboarding_seen_';

export const TesterOnboarding: React.FC = () => {
  const { user, isTester } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !isTester) return;
    try {
      const key = `${SEEN_KEY_PREFIX}${user.id}`;
      if (!localStorage.getItem(key)) {
        setOpen(true);
      }
    } catch {
      // localStorage unavailable — just skip onboarding rather than crash
    }
  }, [user, isTester]);

  const dismiss = () => {
    setOpen(false);
    if (user) {
      try { localStorage.setItem(`${SEEN_KEY_PREFIX}${user.id}`, '1'); } catch { /* ignore */ }
    }
  };

  if (!isTester) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Ласкаво просимо в тестовий режим!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 text-sm text-foreground pt-2">
              <p>Тут ви пробуєте симулятор роботи маркетолога на реальних клієнтських запитах. Проєкти видаються не всі одразу, а невеликими порціями щодня:</p>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex gap-3">
                <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Сьогодні — день 1</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Доступно 4 проєкти на вибір — можна взяти в роботу <b>2</b> з них.</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-3 flex gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">З завтра і далі — щодня</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Доступно 2 проєкти на вибір — можна взяти в роботу <b>1</b> новий щодня.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Trophy className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-muted-foreground text-xs">
                  Кожен успішно запущений і втриманий проєкт (весь перший місяць) підвищує ваш рівень та заробіток — дивіться прогрес у бічній панелі.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={dismiss} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Зрозуміло, почати!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
