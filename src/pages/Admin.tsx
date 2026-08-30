import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Check, X, RefreshCw, ExternalLink, Eye, Trash2, ShieldCheck, ShieldPlus, ShieldMinus } from 'lucide-react';

type AppRole = 'admin' | 'moderator' | 'user';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  scenarios_count: number;
  reviewed_count: number;
  role: AppRole;
}

interface ReviewRow {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  scenario_name: string;
  shared_id: string | null;
  summary: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const Admin: React.FC = () => {
  const { isAdmin, isModerator, isStaff, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'users' | 'reviews'>('reviews');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewFilterEmail, setReviewFilterEmail] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isStaff) navigate('/', { replace: true });
  }, [authLoading, isStaff, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: profiles, error: pErr }, { data: workspaces, error: wErr }, { data: revs, error: rErr }, { data: roleRows, error: roErr }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('scenario_workspaces').select('user_id, scenarios'),
        supabase.from('scenario_reviews').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      if (pErr) throw pErr;
      if (wErr) throw wErr;
      if (rErr) throw rErr;
      if (roErr) throw roErr;

      const counts = new Map<string, number>();
      (workspaces || []).forEach((w: { user_id: string | null; scenarios: unknown }) => {
        if (!w.user_id) return;
        const arr = Array.isArray(w.scenarios) ? w.scenarios : [];
        counts.set(w.user_id, arr.length);
      });

      const reviewedCounts = new Map<string, number>();
      (revs || []).forEach((r: { user_id: string; status: string }) => {
        if (r.status === 'pending') return;
        reviewedCounts.set(r.user_id, (reviewedCounts.get(r.user_id) || 0) + 1);
      });

      const roleByUser = new Map<string, AppRole>();
      (roleRows || []).forEach((r: { user_id: string; role: AppRole }) => {
        // A user can technically hold multiple rows; keep the highest tier.
        const current = roleByUser.get(r.user_id);
        if (!current || r.role === 'admin' || (r.role === 'moderator' && current !== 'admin')) {
          roleByUser.set(r.user_id, r.role);
        }
      });

      setRows((profiles || []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        status: p.status,
        created_at: p.created_at,
        scenarios_count: counts.get(p.id) ?? 0,
        reviewed_count: reviewedCounts.get(p.id) ?? 0,
        role: roleByUser.get(p.id) ?? 'user',
      })));
      setReviews((revs || []) as ReviewRow[]);
    } catch (e: unknown) {
      toast({ title: 'Помилка завантаження', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  // Live notification: toast + refresh the list the moment a student sends
  // a scenario for review, so a moderator with the panel open doesn't have
  // to manually refresh to see it appear at the top of the queue.
  useEffect(() => {
    if (!isStaff) return;
    const channel = supabase
      .channel('scenario_reviews_admin_watch')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scenario_reviews' },
        (payload) => {
          const row = payload.new as { scenario_name?: string; user_name?: string | null; user_email?: string };
          toast({
            title: 'Нова заявка на перевірку',
            description: `${row.user_name || row.user_email || 'Студент'} відправив(ла) «${row.scenario_name}» — потребує реакції`,
          });
          load();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: status === 'approved' ? 'Користувача підтверджено' : status === 'rejected' ? 'Користувача відхилено' : 'Скинуто до очікування' });
    load();
  };

  const updateReviewStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('scenario_reviews').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Статус оновлено' });
    load();
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Видалити заявку?')) return;
    const { error } = await supabase.from('scenario_reviews').delete().eq('id', id);
    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const deleteUser = async (row: UserRow) => {
    if (!isAdmin) return;
    if (!confirm(`Видалити учасника ${row.full_name || row.email}? Це видалить усі його сценарії та скасувати цю дію неможливо.`)) return;
    setDeletingId(row.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: row.id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Учасника видалено' });
      load();
    } catch (e: unknown) {
      toast({ title: 'Помилка видалення', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleModerator = async (row: UserRow) => {
    if (!isAdmin) return;
    try {
      if (row.role === 'moderator') {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', row.id).eq('role', 'moderator');
        if (error) throw error;
        toast({ title: 'Права модератора знято' });
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: row.id, role: 'moderator' });
        if (error) throw error;
        toast({ title: 'Призначено модератором' });
      }
      load();
    } catch (e: unknown) {
      toast({ title: 'Помилка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  if (authLoading) return null;

  const pendingReviews = reviews.filter(r => r.status === 'pending').length;
  const STATUS_PRIORITY: Record<string, number> = { pending: 0, in_review: 1, approved: 2, rejected: 2 };
  const sortedReviews = [...reviews].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 1;
    const pb = STATUS_PRIORITY[b.status] ?? 1;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const visibleReviews = reviewFilterEmail ? sortedReviews.filter(r => r.user_email === reviewFilterEmail) : sortedReviews;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
            <h1 className="text-xl font-bold">Адмін-панель</h1>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isAdmin ? 'Супер-адмін' : 'Модератор'}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Оновити
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          <Button variant={tab === 'reviews' ? 'default' : 'outline'} onClick={() => setTab('reviews')}>
            Заявки на перевірку {pendingReviews > 0 && <Badge className="ml-2 bg-warning text-warning-foreground">{pendingReviews}</Badge>}
          </Button>
          <Button variant={tab === 'users' ? 'default' : 'outline'} onClick={() => setTab('users')}>
            Користувачі
          </Button>
        </div>

        {tab === 'users' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard label="Всього" value={rows.length} />
              <StatCard label="Очікують" value={rows.filter(r => r.status === 'pending').length} />
              <StatCard label="Активних" value={rows.filter(r => r.status === 'approved').length} />
            </div>

            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-medium">Студент</th>
                    <th className="text-left p-3 font-medium">Роль</th>
                    <th className="text-left p-3 font-medium">Статус</th>
                    <th className="text-left p-3 font-medium">Сценаріїв</th>
                    <th className="text-left p-3 font-medium">Перевірено</th>
                    <th className="text-left p-3 font-medium">Зареєстровано</th>
                    <th className="text-right p-3 font-medium">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && !loading && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Немає користувачів</td></tr>
                  )}
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{r.full_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            r.role === 'admin' ? 'border-primary text-primary' :
                            r.role === 'moderator' ? 'border-accent-foreground text-accent-foreground' :
                            'text-muted-foreground'
                          }
                        >
                          {r.role === 'admin' ? 'Супер-адмін' : r.role === 'moderator' ? 'Модератор' : 'Студент'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            r.status === 'approved' ? 'bg-success text-success-foreground' :
                            r.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                            'bg-warning text-warning-foreground'
                          }
                        >
                          {r.status === 'approved' ? 'Підтверджено' : r.status === 'rejected' ? 'Відхилено' : 'Очікує'}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold">{r.scenarios_count}</td>
                      <td className="p-3 font-semibold">{r.reviewed_count}</td>
                      <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString('uk-UA')}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setReviewFilterEmail(r.email); setTab('reviews'); }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Сценарії
                          </Button>
                          {isAdmin && r.status !== 'approved' && (
                            <Button size="sm" onClick={() => updateStatus(r.id, 'approved')} className="bg-success text-success-foreground hover:bg-success/90">
                              <Check className="w-3.5 h-3.5 mr-1" /> Підтвердити
                            </Button>
                          )}
                          {isAdmin && r.status !== 'rejected' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'rejected')}>
                              <X className="w-3.5 h-3.5 mr-1" /> Відхилити
                            </Button>
                          )}
                          {isAdmin && r.role !== 'admin' && (
                            <Button size="sm" variant="outline" onClick={() => toggleModerator(r)}>
                              {r.role === 'moderator'
                                ? <><ShieldMinus className="w-3.5 h-3.5 mr-1" /> Зняти модератора</>
                                : <><ShieldPlus className="w-3.5 h-3.5 mr-1" /> Зробити модератором</>}
                            </Button>
                          )}
                          {isAdmin && r.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingId === r.id}
                              onClick={() => deleteUser(r)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'reviews' && (
          <div className="space-y-3">
            {reviewFilterEmail && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Фільтр по студенту:</span>
                <Badge variant="outline">{reviewFilterEmail}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setReviewFilterEmail(null)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Скинути
                </Button>
              </div>
            )}
            {visibleReviews.length === 0 && !loading && (
              <div className="glass-card p-8 text-center text-muted-foreground">Немає заявок на перевірку</div>
            )}
            {visibleReviews.map(rv => (
              <div key={rv.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{rv.scenario_name}</h3>
                      <Badge
                        className={
                          rv.status === 'approved' ? 'bg-success text-success-foreground' :
                          rv.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                          rv.status === 'in_review' ? 'bg-primary text-primary-foreground' :
                          'bg-warning text-warning-foreground gap-1.5'
                        }
                      >
                        {rv.status === 'pending' && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-foreground opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-warning-foreground" />
                          </span>
                        )}
                        {rv.status === 'approved' ? 'Зараховано' :
                          rv.status === 'rejected' ? 'Відхилено' :
                          rv.status === 'in_review' ? 'На перевірці' : 'Потребує реакції'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {rv.user_name || '—'} • {rv.user_email} • {new Date(rv.created_at).toLocaleString('uk-UA')}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {rv.shared_id && (
                      <Button size="sm" variant="outline" onClick={() => window.open(`/share/${rv.shared_id}`, '_blank')}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Відкрити
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setExpandedReview(expandedReview === rv.id ? null : rv.id)}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> {expandedReview === rv.id ? 'Згорнути' : 'Підсумок'}
                    </Button>
                  </div>
                </div>

                {expandedReview === rv.id && rv.summary && (
                  <pre className="mt-3 p-3 bg-muted/40 rounded text-xs whitespace-pre-wrap font-mono max-h-96 overflow-auto">{rv.summary}</pre>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  {rv.status !== 'in_review' && (
                    <Button size="sm" variant="outline" onClick={() => updateReviewStatus(rv.id, 'in_review')}>На перевірці</Button>
                  )}
                  {rv.status !== 'approved' && (
                    <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => updateReviewStatus(rv.id, 'approved')}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Зарахувати
                    </Button>
                  )}
                  {rv.status !== 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => updateReviewStatus(rv.id, 'rejected')}>
                      <X className="w-3.5 h-3.5 mr-1" /> Відхилити
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={() => deleteReview(rv.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="glass-card p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold text-foreground">{value}</div>
  </div>
);

export default Admin;
