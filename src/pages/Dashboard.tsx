import React, { useEffect, useRef, useState } from 'react';
import { useScenarios, ClientBrief, createDefaultDecompSet } from '@/context/ScenariosContext';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, UserX, ExternalLink, Send, Clock, CheckCircle2, XCircle, Trophy, Award, Inbox, GraduationCap, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/UserMenu';
import { GamificationSidebar } from '@/components/GamificationSidebar';
import { LeadOslavTour, markLeadOslavTourSeen } from '@/components/LeadOslavTour';
import { pickAvailableLeads, AvailableLead } from '@/components/SimulationIntro';
import { DailyVideoCard, DailyVideo } from '@/components/DailyVideoCard';
import { estimateClientBudgetUsd } from '@/lib/budgetEstimate';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

const LEADS_FEED_SIZE = 4;

// Загальний відео-туторіал по сервісу (кнопка вгорі справа + перший крок
// туру AI LeadОслав). Порожній рядок — просто заглушка "скоро зʼявиться",
// поки не буде готового відео; вписати YouTube ID сюди, коли буде готове.
const TUTORIAL_VIDEO_ID = '';

// "Відео дня" — щоденний контент, новий кожен день з моменту реєстрації.
// Поки заповнений лише перший день; коли зʼявляться відео на наступні дні —
// просто додати нові записи з відповідним day.
const TARGETING_VIDEOS: DailyVideo[] = [
  { day: 1, youtubeId: 'jPYI67MSFjE', caption: 'Етапи роботи над проектом по таргету' },
];
const TREND_VIDEOS: DailyVideo[] = [
  { day: 1, youtubeId: 'IT8hrMJmeeM', caption: 'Вайбкодимо сайти безлімітно' },
];

const Dashboard: React.FC = () => {
  const { scenarios, loading, addScenario, updateScenario, deleteScenario } = useScenarios();
  const navigate = useNavigate();
  const { user, profile, isTester } = useAuth();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [gamificationCollapsed, setGamificationCollapsed] = useState(false);
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const scenarioToDelete = deleteId ? scenarios.find(s => s.id === deleteId) : null;
  const [reviewByName, setReviewByName] = useState<Record<string, ReviewStatus>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [availableLeads, setAvailableLeads] = useState<AvailableLead[]>(() => pickAvailableLeads(LEADS_FEED_SIZE));
  const [takingLeadKey, setTakingLeadKey] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
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
    markLeadOslavTourSeen(user?.id);
    const defaultName = `Сценарій #${scenarios.length + 1}`;
    const s = addScenario(defaultName, '');
    navigate(`/scenario/${s.id}`);
  };

  // "Опрацювання вхідних лідів" — taking a lead card straight from the
  // dashboard skips the full-screen reveal/accept flow (SimulationIntro):
  // the scenario is created with the brief already attached, seeded with
  // the same decomposition-budget + project-price logic ScenarioBuilder's
  // own onAccept uses, so the two entry points stay consistent.
  const handleTakeLead = (lead: AvailableLead, leadKey: string) => {
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
    const projectPrice = Math.floor(Math.random() * (500 - 300 + 1)) + 300;
    updateScenario(s.id, {
      difficulty: lead._difficulty,
      clientBrief: brief as ClientBrief,
      decomposition: seededDecomp,
      projectPrice,
    });
    toast({ title: 'Ads School', description: `Вітаю з новим проектом — ${lead.name}! Оплата за проєкт: $${projectPrice}.` });
    navigate(`/scenario/${s.id}`);
  };

  const refreshLeads = () => {
    setAvailableLeads(pickAvailableLeads(LEADS_FEED_SIZE));
    setActiveLeadIdx(0);
  };


  return (
    <div
      className="min-h-screen bg-background transition-[padding] duration-200"
      style={{ paddingLeft: gamificationCollapsed ? 56 : 300 }}
    >
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Навчальний простір AdSchool</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <PlayCircle className="w-4 h-4" /> Відео-туторіал
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Відео-туторіал по сервісу</DialogTitle>
          </DialogHeader>
          {TUTORIAL_VIDEO_ID ? (
            <div className="rounded-xl overflow-hidden bg-black aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${TUTORIAL_VIDEO_ID}`}
                title="Відео-туторіал по сервісу"
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">Відео скоро зʼявиться тут.</p>
          )}
        </DialogContent>
      </Dialog>

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
                {availableLeads.length}
              </span>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Кожен день — нові уроки</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative">
              {(() => {
                const lead = availableLeads[activeLeadIdx];
                if (!lead) return null;
                const leadKey = `${lead.name}-${activeLeadIdx}`;
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
                    <p className="text-xs text-muted-foreground line-clamp-6">{lead.task}</p>
                    <div className="flex items-center gap-2 mt-auto">
                      <Button
                        ref={createBtnRef}
                        size="sm"
                        disabled={!!takingLeadKey}
                        onClick={() => handleTakeLead(lead, leadKey)}
                        className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-8"
                      >
                        {isTaking ? 'Беремо в роботу…' : (<><Plus className="w-3.5 h-3.5" /> Взяти в роботу</>)}
                      </Button>
                      {availableLeads.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!takingLeadKey}
                          onClick={() => setActiveLeadIdx(v => (v + 1) % availableLeads.length)}
                          className="h-8 text-xs font-semibold"
                          title="Наступний лід"
                        >
                          Наступний →
                        </Button>
                      )}
                    </div>
                    {availableLeads.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 -mb-1">
                        {availableLeads.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActiveLeadIdx(i)}
                            className="rounded-full transition-all"
                            style={{
                              width: i === activeLeadIdx ? 16 : 6,
                              height: 6,
                              background: i === activeLeadIdx ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.25)',
                            }}
                            title={`Лід ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <DailyVideoCard label="Закриті відео, тільки для абітурієнтів" videos={TARGETING_VIDEOS} registeredAt={profile?.created_at} />
            <DailyVideoCard label="Залишайся в тренді" videos={TREND_VIDEOS} registeredAt={profile?.created_at} />
          </div>
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
                  onClick={() => navigate(`/scenario/${s.id}`)}
                >
                  {(s.monthSurvived || s.status === 'completed') && (
                    <span
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-card shadow-sm z-10"
                      style={{ background: 'hsl(142 71% 45%)' }}
                      title={s.monthSurvived ? 'Проєкт витримав перший місяць' : 'Проєкт завершено'}
                    >
                      {s.monthSurvived ? <Award className="w-3.5 h-3.5 text-white" /> : <Trophy className="w-3.5 h-3.5 text-white" />}
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
                                src={s.clientBrief.photo}
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
                      onClick={(e) => { e.stopPropagation(); navigate(`/scenario/${s.id}`); }}
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
              onClick={() => { if (deleteId) deleteScenario(deleteId); setDeleteId(null); }}
            >
              Так, відмовитись
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GamificationSidebar collapsed={gamificationCollapsed} onToggle={() => setGamificationCollapsed(v => !v)} />
      {isTester && <LeadOslavTour createBtnRef={createBtnRef} />}
    </div>
  );
};

export default Dashboard;
