import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useScenarios, ClientBrief, createDefaultDecompSet } from '@/context/ScenariosContext';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, UserX, ExternalLink, Send, Clock, CheckCircle2, XCircle, Award, Inbox, ChevronDown, ChevronUp, FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/AppHeader';
import { GamificationSidebar } from '@/components/GamificationSidebar';
import { LeadOslavTour, markLeadOslavTourSeen } from '@/components/LeadOslavTour';
import { pickAvailableLeads, AvailableLead } from '@/components/SimulationIntro';
import { daysSinceRegistration } from '@/lib/daysSinceRegistration';
import { getStudentQuotaStatus } from '@/lib/studentLimits';
import { truncateForPreview } from '@/lib/truncateForPreview';
import { DailyVideoCard, DailyVideo } from '@/components/DailyVideoCard';
import { estimateClientBudgetUsd } from '@/lib/budgetEstimate';
import { resolveClientPhoto } from '@/data/clientPhotos';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

const LEADS_FEED_SIZE = 4;

// "Відео дня" — щоденний контент, новий кожен день з моменту реєстрації.
// Поки заповнений лише перший день; коли зʼявляться відео на наступні дні —
// просто додати нові записи з відповідним day.
const TREND_VIDEOS: DailyVideo[] = [
  { day: 1, youtubeId: 'fz635iOwzEc', caption: 'Як використовувати GPT у роботі маркетолога' },
  { day: 2, youtubeId: 'YgPhObm7OfQ', caption: 'Стратегія розвитку та зростання таргетолога з нуля' },
  { day: 3, youtubeId: 'DJvqK6TShMs', caption: 'Актуальна тема для маркетолога' },
  { day: 4, youtubeId: 'DX_f6DdoPvA', caption: 'Відео з курсу' },
  { day: 5, youtubeId: 'IT8hrMJmeeM', caption: 'Вайбкодимо сайти безлімітно' },
  { day: 6, youtubeId: 'jPYI67MSFjE', caption: 'Етапи роботи над проектом по таргету' },
];

// Клієнти, від яких студент явно відмовився ("Відмовитись від клієнта" на
// вже взятому в роботу проєкті), не повинні знову зʼявлятись у фіді
// "Опрацювання вхідних лідів" — інакше видалений сценарій просто звільняє
// імʼя з takenLeadNames і той самий лід випливає знову. Персистимо окремо
// від scenarios, бо сам сценарій справді видаляється безслідно.
const DECLINED_LEADS_PREFIX = 'declined_leads_';

const readDeclinedLeadNames = (userId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(`${DECLINED_LEADS_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

const addDeclinedLeadName = (userId: string, name: string) => {
  try {
    const next = readDeclinedLeadNames(userId);
    next.add(name);
    localStorage.setItem(`${DECLINED_LEADS_PREFIX}${userId}`, JSON.stringify(Array.from(next)));
  } catch { /* ignore */ }
};

const Dashboard: React.FC = () => {
  const { scenarios, loading, addScenario, updateScenario, deleteScenario } = useScenarios();
  const navigate = useNavigate();
  const { user, profile, isTester, isStaff, accessTier, studentSince } = useAuth();

  // Скидання онбордингу/демо через URL (?resetOnboarding=1) тепер
  // обробляється в ProtectedRoute — воно має спрацювати ДО перевірки
  // demoExpired, яка інакше блокує монтування Dashboard узагалі.
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // While the LeadOslav onboarding tour is running, the "Наступний" button
  // (and the carousel dots) let a tester cycle past the highlighted lead
  // without ever clicking "Взяти в роботу" — disabled for the duration.
  // "Взяти в роботу" itself is disabled too until the tour actually reaches
  // step 4 (its own explicit "click this now" instruction) — otherwise a
  // click on step 2 jumps straight into a scenario and skips the rest of
  // the tour (the daily-videos hint on step 3 never gets shown).
  const [tourStep, setTourStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const tourActive = tourStep !== 0;
  const canTakeLead = tourStep === 0 || tourStep === 4;
  // Квота нових проєктів для "Студент ADSchool" (tier 2) — 5/день,
  // накопичуються з дня підвищення. Демо й випускники квоти не мають
  // (studentSince === null для tester, staff тут взагалі не рендериться).
  const studentQuota = useMemo(
    () => getStudentQuotaStatus(accessTier === 'student' ? studentSince : null, scenarios),
    [accessTier, studentSince, scenarios]
  );
  const [gamificationCollapsed, setGamificationCollapsed] = useState(false);
  const [leadsBlockCollapsed, setLeadsBlockCollapsed] = useState(false);
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const scenarioToDelete = deleteId ? scenarios.find(s => s.id === deleteId) : null;
  const [reviewByName, setReviewByName] = useState<Record<string, ReviewStatus>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [availableLeads, setAvailableLeads] = useState<AvailableLead[]>(() => pickAvailableLeads(LEADS_FEED_SIZE, daysSinceRegistration(profile?.created_at)));

  // Ліди, яких уже взяли в роботу (є серед scenarios), не повинні лишатись у
  // фіді "Опрацювання вхідних лідів" — інакше при поверненні на дашборд той
  // самий (для куратованих днів — фіксований) лід продовжує там висіти.
  const takenLeadNames = useMemo(
    () => new Set(scenarios.map(s => s.clientBrief?.name).filter(Boolean)),
    [scenarios]
  );
  const [declinedLeadNames, setDeclinedLeadNames] = useState<Set<string>>(new Set());
  useEffect(() => {
    setDeclinedLeadNames(user?.id ? readDeclinedLeadNames(user.id) : new Set());
  }, [user?.id]);
  const visibleLeads = useMemo(
    () => availableLeads.filter(l => !takenLeadNames.has(l.name) && !declinedLeadNames.has(l.name)),
    [availableLeads, takenLeadNames, declinedLeadNames]
  );
  const [takingLeadKey, setTakingLeadKey] = useState<string | null>(null);
  const [activeLeadIdx, setActiveLeadIdx] = useState(0);

  const loadReviews = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('scenario_reviews')
      .select('scenario_name, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load review statuses', error);
      return;
    }
    const map: Record<string, ReviewStatus> = {};
    (data || []).forEach((r: { scenario_name: string; status: string }) => {
      // Rows are newest-first, so the first one seen per name is the latest.
      if (!(r.scenario_name in map)) map[r.scenario_name] = r.status as ReviewStatus;
    });
    setReviewByName(map);
  };

  useEffect(() => { loadReviews(); }, [user?.id]);

  const sendForReview = async (s: typeof scenarios[0]) => {
    if (!user?.id) return;
    setSendingId(s.id);
    try {
      const { data: shared, error: sharedErr } = await supabase
        .from('shared_scenarios')
        .insert({ scenario: s as any })
        .select('id')
        .single();
      if (sharedErr) throw sharedErr;

      const { error: reviewErr } = await supabase.from('scenario_reviews').insert({
        user_id: user.id,
        user_email: user.email || profile?.email || '',
        user_name: profile?.full_name || null,
        scenario_name: s.name,
        shared_id: shared.id,
        status: 'pending',
      });
      if (reviewErr) throw reviewErr;

      toast({ title: 'Відправлено на перевірку', description: 'Модератор перегляне сценарій і поставить оцінку.' });
      setReviewByName(prev => ({ ...prev, [s.name]: 'pending' }));
    } catch (e: unknown) {
      toast({ title: 'Не вдалося відправити', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };

  // Detect corrupt backups saved by ScenariosContext on a parse failure.
  const [corruptKeys, setCorruptKeys] = useState<string[]>(() => {
    try {
      return Object.keys(localStorage).filter(k => k.startsWith('scenarios__corrupt_'));
    } catch { return []; }
  });

  const handleRecover = () => {
    try {
      // Try each corrupt backup, newest first, and restore the first one that parses.
      const sorted = [...corruptKeys].sort().reverse();
      for (const k of sorted) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            localStorage.setItem('scenarios', raw);
            sorted.forEach(x => localStorage.removeItem(x));
            window.location.reload();
            return;
          }
        } catch {}
      }
      alert('Не вдалося відновити — резервні копії пошкоджені.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = () => {
    if (accessTier === 'student' && !studentQuota.canCreate) {
      toast({ title: 'Денний ліміт вичерпано', description: 'Нові проєкти для студентів нараховуються по 5 щодня — спробуйте завтра.', variant: 'destructive' });
      return;
    }
    markLeadOslavTourSeen(user?.id);
    const defaultName = `Сценарій #${scenarios.length + 1}`;
    const s = addScenario(defaultName, '');
    navigate(`/scenario/${s.id}`);
  };

  // A project the client walked away from is closed — don't even navigate
  // into it, just say so right here on the card.
  const openScenario = (s: { id: string; status?: string; monthSurvived?: boolean }) => {
    if (s.status === 'completed' && s.monthSurvived === false) {
      toast({ title: 'Клієнт пішов', description: 'Проєкт завершено невдало — сценарій недоступний.', variant: 'destructive' });
      return;
    }
    navigate(`/scenario/${s.id}`);
  };

  // "Опрацювання вхідних лідів" — taking a lead card straight from the
  // dashboard skips the full-screen reveal/accept flow (SimulationIntro):
  // the scenario is created with the brief already attached, seeded with
  // the same decomposition-budget + project-price logic ScenarioBuilder's
  // own onAccept uses, so the two entry points stay consistent.
  const handleTakeLead = (lead: AvailableLead, leadKey: string) => {
    if (accessTier === 'student' && !studentQuota.canCreate) {
      toast({ title: 'Денний ліміт вичерпано', description: 'Нові проєкти для студентів нараховуються по 5 щодня — спробуйте завтра.', variant: 'destructive' });
      return;
    }
    setTakingLeadKey(leadKey);
    markLeadOslavTourSeen(user?.id);
    const defaultName = lead.name && lead.niche ? `${lead.name} — ${lead.niche}` : `Сценарій #${scenarios.length + 1}`;
    const s = addScenario(defaultName, '');
    const brief: ClientBrief & { role?: string } = {
      name: lead.name,
      photo: lead.photo,
      photoKey: lead.photoKey,
      task: lead.task,
      niche: lead.niche,
      source: lead.source,
      redFlags: lead.redFlags,
      greyFlags: lead.greyFlags,
      role: lead.role,
    };
    const clientBudget = estimateClientBudgetUsd(lead.task);
    const seededDecomp = createDefaultDecompSet();
    seededDecomp.bad.budget = clientBudget;
    seededDecomp.realistic.budget = clientBudget;
    seededDecomp.positive.budget = clientBudget;
    const projectPrice = Math.round((Math.random() * (500 - 300) + 300) / 50) * 50;
    updateScenario(s.id, {
      difficulty: lead._difficulty,
      clientBrief: brief as ClientBrief,
      decomposition: seededDecomp,
      projectPrice,
    });
    toast({ title: 'Ads School', description: `Вітаю з новим проєктом — ${lead.name}!` });
    navigate(`/scenario/${s.id}`);
  };

  const refreshLeads = () => {
    setAvailableLeads(pickAvailableLeads(LEADS_FEED_SIZE, daysSinceRegistration(profile?.created_at)));
    setActiveLeadIdx(0);
  };

  // "Додати свій сценарій" (мануал режим) — клік одразу створює проєкт і
  // відкриває воронку з вибору ніші, без реального клієнта. Мінімальний
  // stub-бриф — той самий, який ScenarioBuilder уже вміє відкривати для
  // legacy-сценаріїв без брифу. isManual позначає проєкт як такий: без
  // кнопки "Провести міт та зібрати бриф" (нема з ким/що "зустрічатись") і
  // з кнопкою "Додати інформацію" для довільного контексту клієнту/ніші.
  // clientActions одразу проставлені — гейт воронки не блокує старт.
  const handleAddCustomScenario = () => {
    if (accessTier === 'student' && !studentQuota.canCreate) {
      toast({ title: 'Денний ліміт вичерпано', description: 'Нові проєкти для студентів нараховуються по 5 щодня — спробуйте завтра.', variant: 'destructive' });
      return;
    }
    markLeadOslavTourSeen(user?.id);
    const defaultName = `Сценарій #${scenarios.length + 1}`;
    const s = addScenario(defaultName, '');
    const brief: ClientBrief = { name: 'Клієнт', photo: '', task: '', niche: '', source: '', isManual: true };
    updateScenario(s.id, { clientBrief: brief, clientActions: ['brief', 'payment'] });
    navigate(`/scenario/${s.id}`);
  };


  return (
    <>
    <AppHeader active="sim" />
    <div
      className="min-h-screen bg-background transition-[padding] duration-200"
      style={{ paddingLeft: gamificationCollapsed ? 56 : 300 }}
    >
      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        {corruptKeys.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border border-warning/40 bg-warning/10 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Знайдено резервну копію сценаріїв</p>
              <p className="text-sm text-muted-foreground">Попередня сесія завершилась помилкою. Можна відновити старі сценарії.</p>
            </div>
            <Button onClick={handleRecover} className="bg-primary text-primary-foreground">Відновити</Button>
          </div>
        )}

        {/* Опрацювання вхідних лідів — always the first block on the dashboard. */}
        <div
          className="mb-8 p-4 rounded-2xl border-2"
          style={{
            borderColor: 'hsl(var(--primary) / 0.3)',
            background: 'linear-gradient(180deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--primary) / 0.02) 100%)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Inbox className="w-3.5 h-3.5 text-primary-foreground" />
              </span>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Опрацювання вхідних лідів</h2>
              <span className="text-[11px] font-semibold text-muted-foreground bg-primary/10 px-1.5 py-0.5 rounded-full">
                {visibleLeads.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLeadsBlockCollapsed(v => !v)}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-primary/10 transition-colors text-muted-foreground"
                title={leadsBlockCollapsed ? 'Розгорнути' : 'Згорнути'}
              >
                {leadsBlockCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <span className="text-xs font-semibold text-muted-foreground">Кожен день — нові уроки</span>
            </div>
          </div>

          {!leadsBlockCollapsed && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative" data-tour="leads-card">
              {(() => {
                const safeIdx = visibleLeads.length > 0 ? activeLeadIdx % visibleLeads.length : 0;
                const lead = visibleLeads[safeIdx];
                if (!lead) return null;
                const leadKey = `${lead.name}-${safeIdx}`;
                const isTaking = takingLeadKey === leadKey;
                return (
                  <div
                    className="relative rounded-2xl p-4 flex flex-col gap-3 shadow-md h-full border"
                    style={{
                      background: 'linear-gradient(160deg, hsl(var(--warning) / 0.10) 0%, hsl(var(--card)) 55%)',
                      borderColor: 'hsl(var(--warning) / 0.35)',
                      boxShadow: '0 4px 20px -6px hsl(var(--warning) / 0.25)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img src={lead.photo} alt={lead.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{lead.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{lead.niche || lead.role}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{truncateForPreview(lead.task, 380)}</p>
                    <div className="flex items-center gap-2 mt-auto">
                      <Button
                        ref={createBtnRef}
                        size="sm"
                        disabled={!!takingLeadKey || !canTakeLead || (accessTier === 'student' && !studentQuota.canCreate)}
                        onClick={() => handleTakeLead(lead, leadKey)}
                        className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-8"
                      >
                        {isTaking ? 'Беремо в роботу…' : (<><Plus className="w-3.5 h-3.5" /> Взяти в роботу</>)}
                      </Button>
                      {visibleLeads.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!takingLeadKey || tourActive}
                          onClick={() => setActiveLeadIdx(v => (v + 1) % visibleLeads.length)}
                          className="h-8 text-xs font-semibold"
                          title={tourActive ? 'Спочатку візьміть перший лід в роботу' : 'Наступний лід'}
                        >
                          Наступний →
                        </Button>
                      )}
                    </div>
                    {visibleLeads.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 -mb-1">
                        {visibleLeads.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={tourActive}
                            onClick={() => setActiveLeadIdx(i)}
                            className="rounded-full transition-all disabled:cursor-not-allowed"
                            style={{
                              width: i === safeIdx ? 16 : 6,
                              height: 6,
                              background: i === safeIdx ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.25)',
                            }}
                            title={tourActive ? 'Спочатку візьміть перший лід в роботу' : `Лід ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={handleAddCustomScenario}
              className="glass-card p-3.5 flex flex-col items-center justify-center gap-2 text-center hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FilePlus2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Додати свій сценарій</span>
              <span className="text-[11px] text-muted-foreground leading-snug">Одразу перейти до побудови воронки з вибору ніші</span>
            </button>
            <DailyVideoCard label="Залишайся в тренді" videos={TREND_VIDEOS} registeredAt={profile?.created_at} tourTag="daily-videos" />
          </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-muted-foreground">Завантаження сценаріїв…</p>
          </div>
        ) : scenarios.length === 0 ? null : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Ваші проекти</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scenarios.map((s, i) => {
              const review = reviewByName[s.name];
              return (
                <div
                  key={s.id}
                  className="relative glass-card p-5 flex flex-col gap-4 animate-slide-up transition-shadow cursor-pointer hover:shadow-md"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => openScenario(s)}
                >
                  {s.monthSurvived === true && (
                    <span
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-card shadow-sm z-10"
                      style={{ background: 'hsl(142 71% 45%)' }}
                      title="Проєкт витримав перший місяць — зараховано й оплачено"
                    >
                      <Award className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}
                  {s.status === 'completed' && s.monthSurvived === false && (
                    <span
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-card shadow-sm z-10"
                      style={{ background: 'hsl(0 70% 55%)' }}
                      title="Клієнт пішов — проєкт не зараховано, оплата не отримана"
                    >
                      <UserX className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    {s.clientBrief?.photo && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative shrink-0 w-10 h-10">
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-accent bg-secondary cursor-help block"
                            >
                              <img
                                src={resolveClientPhoto(s.clientBrief)}
                                alt={s.clientBrief.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">
                          <p className="font-semibold mb-1">{s.clientBrief.name}</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{s.clientBrief.task}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{s.clientBrief?.name || s.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{s.clientBrief?.niche || s.description || '—'}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Створено</span>
                    <p className="text-foreground font-medium">
                      {new Date(s.createdAt).toLocaleDateString('uk-UA')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">Перевірка модератором</span>
                    {review === 'approved' ? (
                      <Badge className="bg-success text-success-foreground gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Перевірено
                      </Badge>
                    ) : review === 'rejected' ? (
                      <Badge className="bg-destructive text-destructive-foreground gap-1">
                        <XCircle className="w-3 h-3" /> Відхилено
                      </Badge>
                    ) : review === 'pending' || review === 'in_review' ? (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" /> На перевірці
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs"
                        disabled={sendingId === s.id}
                        onClick={(e) => { e.stopPropagation(); sendForReview(s); }}
                      >
                        <Send className="w-3 h-3" /> Відправити
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      onClick={(e) => { e.stopPropagation(); openScenario(s); }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Відкрити
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                      title="Відмовитись від клієнта"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Відмовитись від клієнта?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете відмовитись від клієнта{scenarioToDelete ? ` «${scenarioToDelete.name}»` : ''}? Сценарій буде видалено без можливості відновлення.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const clientName = scenarioToDelete?.clientBrief?.name;
                if (user?.id && clientName) {
                  addDeclinedLeadName(user.id, clientName);
                  setDeclinedLeadNames(prev => new Set(prev).add(clientName));
                }
                if (deleteId) deleteScenario(deleteId);
                setDeleteId(null);
              }}
            >
              Так, відмовитись
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GamificationSidebar collapsed={gamificationCollapsed} onToggle={() => setGamificationCollapsed(v => !v)} />
      {isTester && <LeadOslavTour createBtnRef={createBtnRef} onStepChange={setTourStep} />}
    </div>
    </>
  );
};

export default Dashboard;
