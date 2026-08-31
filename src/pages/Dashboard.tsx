import React, { useEffect, useState } from 'react';
import { useScenarios } from '@/context/ScenariosContext';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Trash2, ExternalLink, Zap, Send, Clock, CheckCircle2, XCircle, Trophy, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/UserMenu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

const Dashboard: React.FC = () => {
  const { scenarios, loading, addScenario, deleteScenario } = useScenarios();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const scenarioToDelete = deleteId ? scenarios.find(s => s.id === deleteId) : null;
  const [reviewByName, setReviewByName] = useState<Record<string, ReviewStatus>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

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
    const defaultName = `Сценарій #${scenarios.length + 1}`;
    const s = addScenario(defaultName, '');
    navigate(`/scenario/${s.id}`);
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              SmartFunnel AI
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              ⚡ Заряджено в{' '}
              <a href="https://ads-school.online/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                Ads School
              </a>
            </span>
            <span className="text-border">|</span>
            <span>
              🛠 Створено в{' '}
              <a href="https://ai.ads-wind.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                ADS WindAI Lab
              </a>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              <Plus className="w-4 h-4" />
              Створити сценарій
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-muted-foreground">Завантаження сценаріїв…</p>
          </div>
        ) : scenarios.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-accent">
              <LayoutDashboard className="w-10 h-10 text-accent-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Немає сценаріїв</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">
              Створіть свій перший маркетинговий сценарій та побудуйте повну воронку продажів
            </p>
            <Button onClick={handleCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              <Plus className="w-4 h-4" />
              Створити перший сценарій
            </Button>
          </div>
        ) : (
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

                  <div className="flex items-center justify-between gap-2 pt-1">
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
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити сценарій?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити сценарій{scenarioToDelete ? ` «${scenarioToDelete.name}»` : ''}? Цю дію не можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteScenario(deleteId); setDeleteId(null); }}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
