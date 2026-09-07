import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useScenarios } from '@/context/ScenariosContext';
import { Trophy, TrendingUp, Lock, Check, ChevronLeft, ChevronRight } from 'lucide-react';

// Five levels — each defined by how many projects have to be launched AND
// successfully sustained (scenario.monthSurvived === true), paired with a
// milestone $ earnings figure at that exact threshold. Earnings between
// thresholds are interpolated so the number climbs smoothly project by
// project instead of jumping only at milestones.
export const GAMIFICATION_LEVELS = [
  { level: 1, name: 'Джуніор', projects: 3, earnings: 1000 },
  { level: 2, name: 'Молодший спеціаліст', projects: 13, earnings: 5000 },
  { level: 3, name: 'Спеціаліст', projects: 30, earnings: 15000 },
  { level: 4, name: 'Мідл спеціаліст', projects: 60, earnings: 35000 },
  { level: 5, name: 'Спеціаліст мідл+', projects: 100, earnings: 75000 },
];

export const getGamificationProgress = (completedCount: number) => {
  const levels = GAMIFICATION_LEVELS;
  let currentLevelIdx = -1;
  for (let i = 0; i < levels.length; i++) {
    if (completedCount >= levels[i].projects) currentLevelIdx = i;
  }
  const currentLevel = currentLevelIdx >= 0 ? levels[currentLevelIdx] : null;
  const nextLevel = levels[currentLevelIdx + 1] || null;

  // Interpolate earnings between the last-reached milestone and the next
  // one (or extrapolate past the last level using its own rate). Before
  // reaching level 1 at all, earnings stay flat at $0 — no partial credit
  // for a level not yet actually reached.
  let earnings: number;
  if (!currentLevel) {
    earnings = 0;
  } else if (!nextLevel) {
    const prev = levels[levels.length - 2];
    const rate = prev ? (currentLevel.earnings - prev.earnings) / (currentLevel.projects - prev.projects) : 0;
    earnings = Math.round(currentLevel.earnings + (completedCount - currentLevel.projects) * rate);
  } else {
    const span = nextLevel.projects - currentLevel.projects;
    const progress = span > 0 ? (completedCount - currentLevel.projects) / span : 0;
    earnings = Math.round(currentLevel.earnings + progress * (nextLevel.earnings - currentLevel.earnings));
  }

  const progressToNext = nextLevel
    ? Math.min(100, Math.round(((completedCount - (currentLevel?.projects || 0)) / (nextLevel.projects - (currentLevel?.projects || 0))) * 100))
    : 100;

  return { currentLevel, nextLevel, earnings, progressToNext, completedCount };
};

interface GamificationSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const GamificationSidebar: React.FC<GamificationSidebarProps> = ({ collapsed, onToggle }) => {
  const { profile } = useAuth();
  const { scenarios } = useScenarios();
  const completedCount = scenarios.filter(s => s.monthSurvived).length;
  const { currentLevel, nextLevel, progressToNext } = getGamificationProgress(completedCount);
  // Real earnings — sum of each successfully sustained project's actual
  // agreed price ($300-500, set when the marketer took it on), not the
  // interpolated milestone figure. Legacy projects without a stored price
  // (created before this field existed) fall back to $400 so they still
  // count toward the total.
  const earnings = scenarios
    .filter(s => s.monthSurvived)
    .reduce((sum, s) => sum + (typeof s.projectPrice === 'number' ? s.projectPrice : 400), 0);
  const initial = (profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase();

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 h-screen w-14 border-r border-border bg-card flex flex-col items-center py-4 gap-3 z-30">
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
          title="Розгорнути прогрес"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {initial}
        </div>
        <div className="flex flex-col items-center gap-1 mt-1" title={currentLevel ? `Рівень ${currentLevel.level}` : 'Ще без рівня'}>
          <Trophy className="w-4 h-4 text-warning" />
          <span className="text-[10px] font-bold text-foreground">{currentLevel?.level ?? '—'}</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[300px] border-r border-border bg-card overflow-y-auto z-30">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="font-bold text-foreground">Ваш прогрес</h2>
        <button
          type="button"
          onClick={onToggle}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
          title="Згорнути"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4">
        <div className="flex flex-col items-center gap-3 py-6 border-b border-border">
          <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
            {initial}
          </div>
          <div className="text-center">
            <p className="font-bold text-foreground">{profile?.full_name || profile?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentLevel ? `Рівень ${currentLevel.level} · ${currentLevel.name}` : 'Ще без рівня'}
            </p>
          </div>
        </div>

        <div className="py-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ваш заробіток</span>
          </div>
          <p className="text-3xl font-extrabold text-success">${earnings.toLocaleString()}</p>
          {nextLevel && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span>До рівня {nextLevel.level} ({nextLevel.name})</span>
                <span>{completedCount}/{nextLevel.projects} проєктів</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progressToNext}%` }} />
              </div>
            </div>
          )}
        </div>


        <div className="py-4 space-y-2 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-warning" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Рівні</span>
          </div>
          {GAMIFICATION_LEVELS.map(lvl => {
            const reached = completedCount >= lvl.projects;
            const isCurrent = currentLevel?.level === lvl.level;
            return (
              <div
                key={lvl.level}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isCurrent ? 'border-primary bg-primary/5' : reached ? 'border-success/40 bg-success/5' : 'border-border bg-secondary/30'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    reached ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {reached ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Рівень {lvl.level} · {lvl.name}</p>
                  {!reached && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">Щоб розблокувати цей рівень, виконайте умови:</p>
                  )}
                  <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5 list-none">
                    <li className="flex items-center gap-1.5">
                      <span className={reached ? 'text-success' : 'text-muted-foreground/60'}>•</span>
                      {lvl.projects} успішно запущених проєктів
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={reached ? 'text-success' : 'text-muted-foreground/60'}>•</span>
                      ${lvl.earnings.toLocaleString()} заробітку
                    </li>
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
