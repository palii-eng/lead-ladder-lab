import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  scenarios_count: number;
}

const Admin: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/', { replace: true });
  }, [authLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: profiles, error: pErr }, { data: workspaces, error: wErr }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('scenario_workspaces').select('user_id, scenarios'),
      ]);
      if (pErr) throw pErr;
      if (wErr) throw wErr;

      const counts = new Map<string, number>();
      (workspaces || []).forEach((w: { user_id: string | null; scenarios: unknown }) => {
        if (!w.user_id) return;
        const arr = Array.isArray(w.scenarios) ? w.scenarios : [];
        counts.set(w.user_id, arr.length);
      });

      setRows((profiles || []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        status: p.status,
        created_at: p.created_at,
        scenarios_count: counts.get(p.id) ?? 0,
      })));
    } catch (e: unknown) {
      toast({ title: 'Помилка завантаження', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: status === 'approved' ? 'Користувача підтверджено' : status === 'rejected' ? 'Користувача відхилено' : 'Скинуто до очікування' });
    load();
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
            <h1 className="text-xl font-bold">Адмін-панель</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Оновити
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Всього" value={rows.length} />
          <StatCard label="Очікують" value={rows.filter(r => r.status === 'pending').length} />
          <StatCard label="Активних" value={rows.filter(r => r.status === 'approved').length} />
        </div>

        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Користувач</th>
                <th className="text-left p-3 font-medium">Статус</th>
                <th className="text-left p-3 font-medium">Сценаріїв</th>
                <th className="text-left p-3 font-medium">Зареєстровано</th>
                <th className="text-right p-3 font-medium">Дії</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Немає користувачів</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium text-foreground">{r.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
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
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString('uk-UA')}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {r.status !== 'approved' && (
                        <Button size="sm" onClick={() => updateStatus(r.id, 'approved')} className="bg-success text-success-foreground hover:bg-success/90">
                          <Check className="w-3.5 h-3.5 mr-1" /> Підтвердити
                        </Button>
                      )}
                      {r.status !== 'rejected' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'rejected')}>
                          <X className="w-3.5 h-3.5 mr-1" /> Відхилити
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
