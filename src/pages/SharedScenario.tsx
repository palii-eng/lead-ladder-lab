import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Scenario } from '@/context/ScenariosContext';
import { Loader2, Zap, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SharedRow {
  scenario: Scenario;
  ai_conclusion: string | null;
  active_lead_type: string | null;
  created_at: string;
}

const calcMetrics = (d: Scenario['decomposition']['realistic']) => {
  const leads = d.cpl ? d.budget / d.cpl : 0;
  const sales = leads * (d.conversionRate / 100);
  const revenue = sales * d.averageCheck;
  const profit = revenue * (d.marginality / 100);
  const netIncome = profit - d.budget;
  const romi = d.budget ? ((revenue - d.budget) / d.budget) * 100 : 0;
  return {
    leads: Math.round(leads),
    sales: Math.round(sales),
    revenue: Math.round(revenue),
    netIncome: Math.round(netIncome),
    romi: Math.round(romi),
  };
};

const SharedScenario: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [row, setRow] = useState<SharedRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('shared_scenarios')
          .select('scenario, ai_conclusion, active_lead_type, created_at')
          .eq('id', shareId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setError('Посилання не знайдено або більше не дійсне.');
        } else {
          setRow(data as unknown as SharedRow);
        }
      } catch (e: any) {
        setError(e.message || 'Не вдалося завантажити воронку.');
      } finally {
        setLoading(false);
      }
    })();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">Воронку не знайдено</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link to="/" className="text-primary font-semibold hover:underline">На головну</Link>
      </div>
    );
  }

  const s = row.scenario;
  const activeLeadType = row.active_lead_type;
  const decompSet = activeLeadType && s.branchData?.[activeLeadType]?.decomposition
    ? s.branchData[activeLeadType].decomposition
    : s.decomposition;
  const real = calcMetrics(decompSet.realistic);
  const dests = (activeLeadType && s.branchData?.[activeLeadType]?.leadDestinations) || s.leadDestinations || [];
  const intMethod = (activeLeadType && s.branchData?.[activeLeadType]?.integrationMethod) || s.integrationMethod || '';
  const compDesc = (activeLeadType && s.branchData?.[activeLeadType]?.companyDescription) || s.companyDescription || '';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">SmartFunnel AI</h1>
          </Link>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-semibold">
            <Eye className="w-3.5 h-3.5" /> Тільки перегляд
          </span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-3xl space-y-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Воронка</p>
          <h2 className="text-3xl font-extrabold text-foreground mt-1">{s.name}</h2>
          {s.description && <p className="text-muted-foreground mt-1">{s.description}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            Створено {new Date(row.created_at).toLocaleString('uk-UA')}
          </p>
        </div>

        {s.clientBrief && (
          <section className="glass-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">Клієнт</h3>
            <div className="flex gap-4">
              {s.clientBrief.photo && (
                <img src={s.clientBrief.photo} alt={s.clientBrief.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-accent" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{s.clientBrief.name}</p>
                {s.clientBrief.niche && <p className="text-xs text-muted-foreground">{s.clientBrief.niche}</p>}
                {s.clientBrief.task && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{s.clientBrief.task}</p>}
              </div>
            </div>
          </section>
        )}

        <section className="glass-card p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Ніша</p>
            <p className="font-semibold text-foreground">{s.niche || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Канал</p>
            <p className="font-semibold text-foreground">{s.channel || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Джерело лідів</p>
            <p className="font-semibold text-foreground">{s.leadSource || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Типи лідгену</p>
            <p className="font-semibold text-foreground">{(s.leadTypes || []).join(', ') || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Ліди йдуть у</p>
            <p className="font-semibold text-foreground">{dests.join(', ') || '—'}</p>
          </div>
          {intMethod && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Інтеграція</p>
              <p className="font-semibold text-foreground">{intMethod}</p>
            </div>
          )}
          {compDesc && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Опис компанії</p>
              <p className="text-foreground whitespace-pre-wrap">{compDesc}</p>
            </div>
          )}
        </section>

        <section className="glass-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Реалістичний сценарій</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Бюджет</p><p className="font-bold">{decompSet.realistic.budget.toLocaleString()} $</p></div>
            <div><p className="text-xs text-muted-foreground">Ліди</p><p className="font-bold">{real.leads}</p></div>
            <div><p className="text-xs text-muted-foreground">Продажі</p><p className="font-bold">{real.sales}</p></div>
            <div><p className="text-xs text-muted-foreground">Дохід</p><p className="font-bold">{real.revenue.toLocaleString()} $</p></div>
            <div><p className="text-xs text-muted-foreground">Чистий</p><p className="font-bold">{real.netIncome.toLocaleString()} $</p></div>
            <div><p className="text-xs text-muted-foreground">ROMI</p><p className={`font-bold ${real.romi > 0 ? 'text-success' : real.romi < 0 ? 'text-destructive' : ''}`}>{real.romi}%</p></div>
          </div>
        </section>

        {row.ai_conclusion && (
          <section className="glass-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">AI Висновок</h3>
            <div className="prose prose-sm max-w-none text-foreground text-sm leading-relaxed">
              <ReactMarkdown>{row.ai_conclusion}</ReactMarkdown>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default SharedScenario;
