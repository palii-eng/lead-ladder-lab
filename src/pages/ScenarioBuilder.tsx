import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScenarios, Scenario, DecompositionScenario } from '@/context/ScenariosContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import FlowNode from '@/components/FlowNode';
import { ArrowLeft, Check, Info, Play, Sparkles, X, Zap } from 'lucide-react';

const STEPS = [
  { title: 'Вибір ніші', icon: '🎯' },
  { title: 'Спосіб запуску', icon: '🚀' },
  { title: 'Декомпозиція', icon: '📊' },
  { title: 'Куди йдуть ліди', icon: '📥' },
  { title: 'Інтеграція', icon: '🔗' },
  { title: 'Продажі', icon: '💰' },
  { title: 'Retention', icon: '🔄' },
  { title: 'Результат', icon: '🏆' },
];

const CHANNELS = [
  { value: 'leadgen', label: 'Лідогенерація' },
  { value: 'quiz', label: 'Квіз' },
  { value: 'direct', label: 'Direct' },
  { value: 'traffic', label: 'Трафік на сайт' },
  { value: 'ppc', label: 'PPC' },
  { value: 'tiktok', label: 'Реклама в TikTok' },
  { value: 'linkedin', label: 'Реклама в LinkedIn', soon: true },
  { value: 'other', label: 'Інший варіант' },
];

const LEAD_DESTINATIONS = [
  'Власна CRM', 'Kommo', 'HubSpot', 'SalesDrive', 'Pipedrive',
  'Google Таблиця', 'Telegram-чат з менеджером', 'Інша',
];
const CRM_OPTIONS = ['KeyCRM', 'Trello', 'SalesDrive', 'Pipedrive', 'Інша'];
const INTEGRATIONS = ['Пряма інтеграція', 'Webhook', 'Make', 'ApiX-Drive'];

const BENCHMARKS: Record<string, Partial<DecompositionScenario>> = {
  leadgen: { cpm: 8, ctr: 1.2, cpc: 6.67, cpl: 45, conversionRate: 5, averageCheck: 3000 },
  quiz: { cpm: 6, ctr: 2.5, cpc: 2.4, cpl: 25, conversionRate: 8, averageCheck: 2500 },
  direct: { cpm: 10, ctr: 0.8, cpc: 12.5, cpl: 60, conversionRate: 3, averageCheck: 5000 },
  traffic: { cpm: 5, ctr: 1.5, cpc: 3.33, cpl: 35, conversionRate: 4, averageCheck: 2000 },
  ppc: { cpm: 15, ctr: 3.5, cpc: 4.29, cpl: 30, conversionRate: 6, averageCheck: 4000 },
  tiktok: { cpm: 4, ctr: 1.8, cpc: 2.22, cpl: 20, conversionRate: 4, averageCheck: 1500 },
  other: { cpm: 7, ctr: 1.5, cpc: 4.67, cpl: 35, conversionRate: 5, averageCheck: 3000 },
};

const calcMetrics = (d: DecompositionScenario) => {
  const leads = d.cpl > 0 ? d.budget / d.cpl : 0;
  const sales = leads * ((d.conversionRate || 0) / 100);
  const revenue = sales * (d.averageCheck || 0);
  const profit = revenue - d.budget;
  const romi = d.budget > 0 ? ((revenue - d.budget) / d.budget) * 100 : 0;
  return { leads: Math.round(leads), sales: Math.round(sales * 10) / 10, revenue: Math.round(revenue), profit: Math.round(profit), romi: Math.round(romi) };
};

const ScenarioBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getScenario, updateScenario } = useScenarios();
  const scenario = getScenario(id!);
  const [activeStep, setActiveStep] = useState<number | null>(0);
  const [decompTab, setDecompTab] = useState<'bad' | 'realistic' | 'positive'>('realistic');
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll active node into view
  useEffect(() => {
    if (activeStep !== null && canvasRef.current) {
      const nodes = canvasRef.current.querySelectorAll('[data-flow-node]');
      if (nodes[activeStep]) {
        nodes[activeStep].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeStep]);

  if (!scenario) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Сценарій не знайдено</h2>
          <Button onClick={() => navigate('/')} variant="secondary">На головну</Button>
        </div>
      </div>
    );
  }

  const update = (u: Partial<Scenario>) => updateScenario(id!, u);

  const updateDecomp = (type: 'bad' | 'realistic' | 'positive', field: keyof DecompositionScenario, value: number) => {
    update({
      decomposition: {
        ...scenario.decomposition,
        [type]: { ...scenario.decomposition[type], [field]: value },
      },
    });
  };

  const fillBenchmarks = () => {
    const ch = scenario.channel || 'other';
    const bench = BENCHMARKS[ch] || BENCHMARKS.other;
    const make = (mult: { cpm: number; ctr: number; cpl: number; conv: number }, budget: number) => {
      const d: DecompositionScenario = {
        cpm: (bench.cpm || 7) * mult.cpm,
        ctr: (bench.ctr || 1) * mult.ctr,
        cpc: 0,
        cpl: (bench.cpl || 35) * mult.cpl,
        conversionRate: (bench.conversionRate || 5) * mult.conv,
        averageCheck: bench.averageCheck || 3000,
        budget,
      };
      d.cpc = d.cpm / ((d.ctr || 1) / 100) / 1000;
      return d;
    };
    update({
      decomposition: {
        bad: make({ cpm: 1.5, ctr: 0.6, cpl: 1.8, conv: 0.4 }, scenario.decomposition.bad.budget || 10000),
        realistic: make({ cpm: 1, ctr: 1, cpl: 1, conv: 1 }, scenario.decomposition.realistic.budget || 10000),
        positive: make({ cpm: 0.7, ctr: 1.5, cpl: 0.6, conv: 1.6 }, scenario.decomposition.positive.budget || 10000),
      },
    });
  };

  const toggleLeadDest = (dest: string) => {
    const current = scenario.leadDestinations;
    update({ leadDestinations: current.includes(dest) ? current.filter(d => d !== dest) : [...current, dest] });
  };

  const currentDecomp = scenario.decomposition[decompTab];
  const metrics = calcMetrics(currentDecomp);

  const retentionCalc = (rate: number) => {
    const r = scenario.retention;
    const total = r.emailCount + r.telegramCount + r.smsCount + r.pushCount;
    const opens = Math.round(total * rate);
    const clicks = Math.round(opens * 0.15);
    const conversions = Math.round(clicks * 0.05);
    const revenue = conversions * (scenario.decomposition.realistic.averageCheck || 2000);
    return { total, opens, clicks, conversions, revenue };
  };

  const isStepCompleted = (i: number): boolean => {
    switch (i) {
      case 0: return !!scenario.niche;
      case 1: return !!scenario.channel;
      case 2: return scenario.decomposition.realistic.cpl > 0;
      case 3: return scenario.leadDestinations.length > 0;
      case 4: return !!scenario.integrationMethod;
      case 5: return !!scenario.companyDescription;
      case 6: return (scenario.retention.emailCount + scenario.retention.telegramCount + scenario.retention.smsCount + scenario.retention.pushCount) > 0;
      case 7: return scenario.status === 'completed';
      default: return false;
    }
  };

  const renderPanel = () => {
    if (activeStep === null) return null;

    const stepContent = () => {
      switch (activeStep) {
        case 0:
          return (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-foreground">Вкажіть нішу вашого бізнесу</h3>
              <Input
                value={scenario.niche}
                onChange={e => update({ niche: e.target.value })}
                placeholder="Наприклад: Стоматологія, Кав'ярня, SaaS..."
                className="bg-secondary border-border text-foreground text-base py-5 placeholder:text-muted-foreground"
              />
              <Button variant="secondary" size="sm" onClick={() => {
                const niches = ['Стоматологія', 'Фітнес-студія', 'Онлайн-школа', 'eCommerce', 'SaaS', 'Ресторан', 'Нерухомість', 'Юридичні послуги'];
                update({ niche: niches[Math.floor(Math.random() * niches.length)] });
              }} className="gap-2">
                <Sparkles className="w-4 h-4" /> Обрати випадкову
              </Button>
            </div>
          );

        case 1:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Оберіть спосіб запуску</h3>
              <div className="grid gap-2">
                {CHANNELS.map(ch => (
                  <button key={ch.value} disabled={ch.soon} onClick={() => update({ channel: ch.value })}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      scenario.channel === ch.value
                        ? 'border-primary bg-accent text-accent-foreground font-semibold'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    } ${ch.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <span>{ch.label}</span>
                    {ch.soon && <Badge className="ml-2 bg-warning text-warning-foreground text-xs">Скоро</Badge>}
                  </button>
                ))}
              </div>
            </div>
          );

        case 2: {
          const decompLabels = { bad: '😟 Поганий', realistic: '📊 Реалістичний', positive: '🚀 Позитивний' };
          const fields: { key: keyof DecompositionScenario; label: string; suffix: string }[] = [
            { key: 'budget', label: 'Бюджет', suffix: '₴' },
            { key: 'cpm', label: 'CPM', suffix: '₴' },
            { key: 'ctr', label: 'CTR', suffix: '%' },
            { key: 'cpc', label: 'CPC', suffix: '₴' },
            { key: 'cpl', label: 'CPL', suffix: '₴' },
            { key: 'conversionRate', label: 'Конверсія', suffix: '%' },
            { key: 'averageCheck', label: 'Сер. чек', suffix: '₴' },
          ];
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Декомпозиція</h3>
                <Button variant="secondary" size="sm" onClick={fillBenchmarks} className="gap-1 text-xs">
                  <Sparkles className="w-3 h-3" /> Авто
                </Button>
              </div>
              <div className="flex gap-1">
                {(Object.keys(decompLabels) as Array<'bad' | 'realistic' | 'positive'>).map(key => (
                  <button key={key} onClick={() => setDecompTab(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      decompTab === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    }`}>
                    {decompLabels[key]}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 grid-cols-2">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-0.5 block">{f.label} ({f.suffix})</label>
                    <Input type="number" value={currentDecomp[f.key] || ''}
                      onChange={e => updateDecomp(decompTab, f.key, parseFloat(e.target.value) || 0)}
                      className="bg-secondary border-border text-foreground h-9 text-sm" />
                  </div>
                ))}
              </div>
              <div className="bg-secondary rounded-lg p-3 grid grid-cols-2 gap-3 text-center">
                {[
                  { label: 'Ліди', value: metrics.leads },
                  { label: 'Продажі', value: metrics.sales },
                  { label: 'Дохід', value: `${metrics.revenue.toLocaleString()} ₴` },
                  { label: 'ROMI', value: `${metrics.romi}%`, color: metrics.romi > 0 ? 'text-success' : 'text-destructive' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="text-[10px] text-muted-foreground uppercase">{m.label}</div>
                    <div className={`text-base font-bold ${(m as any).color || 'text-foreground'}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        case 3:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Куди надходять ліди?</h3>
              <div className="grid gap-2">
                {LEAD_DESTINATIONS.map(d => (
                  <button key={d} onClick={() => toggleLeadDest(d)}
                    className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
                      scenario.leadDestinations.includes(d)
                        ? 'border-primary bg-accent text-accent-foreground font-semibold'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
              {scenario.leadDestinations.includes('Власна CRM') && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">CRM</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CRM_OPTIONS.map(c => (
                      <button key={c} onClick={() => update({ crmSystem: c })}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                          scenario.crmSystem === c ? 'border-primary bg-accent text-accent-foreground font-semibold' : 'border-border bg-card text-foreground'
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );

        case 4:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Спосіб інтеграції</h3>
              <div className="grid gap-2">
                {INTEGRATIONS.map(i => (
                  <button key={i} onClick={() => update({ integrationMethod: i })}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      scenario.integrationMethod === i
                        ? 'border-primary bg-accent text-accent-foreground font-semibold'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    }`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          );

        case 5:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Продажі</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Про компанію</label>
                <Textarea value={scenario.companyDescription}
                  onChange={e => update({ companyDescription: e.target.value })}
                  placeholder="Опишіть компанію, продукт, ЦА..."
                  rows={3} className="bg-secondary border-border text-foreground text-sm placeholder:text-muted-foreground resize-none" />
              </div>
              {scenario.companyDescription && (
                <div className="space-y-3">
                  {[
                    { icon: '📞', title: 'Скрипт дзвінка', text: `Вітаю! Компанія "${scenario.niche || '...'}". Ви залишали заявку...` },
                    { icon: '💬', title: 'Скрипт переписки', text: `Доброго дня! Дякуємо за звернення до "${scenario.niche || 'нас'}"...` },
                    { icon: '🔄', title: 'Follow-up', text: 'Нагадую про вашу заявку. Чи обдумали пропозицію?' },
                  ].map(s => (
                    <div key={s.title} className="bg-secondary rounded-lg p-3">
                      <h4 className="font-semibold text-foreground text-sm mb-1">{s.icon} {s.title}</h4>
                      <p className="text-xs text-muted-foreground">{s.text}</p>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" className="gap-2 w-full text-xs" disabled>
                    📦 Повний пакет <Badge className="bg-warning text-warning-foreground text-[10px]">Pro</Badge>
                  </Button>
                </div>
              )}
            </div>
          );

        case 6: {
          const fields = [
            { key: 'emailCount' as const, label: 'Email' },
            { key: 'telegramCount' as const, label: 'Telegram' },
            { key: 'smsCount' as const, label: 'SMS' },
            { key: 'pushCount' as const, label: 'Push' },
          ];
          const total = scenario.retention.emailCount + scenario.retention.telegramCount + scenario.retention.smsCount + scenario.retention.pushCount;
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Retention — база</h3>
              <div className="grid gap-3 grid-cols-2">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-0.5 block">{f.label}</label>
                    <Input type="number" value={scenario.retention[f.key] || ''}
                      onChange={e => update({ retention: { ...scenario.retention, [f.key]: parseInt(e.target.value) || 0 } })}
                      className="bg-secondary border-border text-foreground h-9 text-sm" />
                  </div>
                ))}
              </div>
              {total > 0 && (
                <div className="space-y-2">
                  {[
                    { label: '😟 Поганий', rate: 0.1 },
                    { label: '📊 Реалістичний', rate: 0.2 },
                    { label: '🚀 Оптимістичний', rate: 0.35 },
                  ].map(s => {
                    const r = retentionCalc(s.rate);
                    return (
                      <div key={s.label} className="bg-secondary rounded-lg p-3">
                        <h4 className="font-semibold text-foreground text-sm">{s.label}</h4>
                        <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-1">
                          <span>Open: {Math.round(s.rate * 100)}%</span>
                          <span>Кліки: {r.clicks}</span>
                          <span>Конверсії: {r.conversions}</span>
                          <span className="font-bold text-foreground">Дохід: {r.revenue.toLocaleString()} ₴</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        case 7: {
          const real = calcMetrics(scenario.decomposition.realistic);
          const bad = calcMetrics(scenario.decomposition.bad);
          const pos = calcMetrics(scenario.decomposition.positive);
          return (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-foreground">🏆 Результат</h3>
              <div className="space-y-3">
                {[
                  { label: 'Поганий', m: bad, border: 'border-destructive/40' },
                  { label: 'Реалістичний', m: real, border: 'border-primary/40' },
                  { label: 'Позитивний', m: pos, border: 'border-success/40' },
                ].map(s => (
                  <div key={s.label} className={`bg-secondary rounded-lg p-3 border-l-4 ${s.border}`}>
                    <h4 className="font-bold text-foreground text-sm mb-1">{s.label}</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Ліди: <b className="text-foreground">{s.m.leads}</b></span>
                      <span>Продажі: <b className="text-foreground">{s.m.sales}</b></span>
                      <span>ROMI: <b className={s.m.romi >= 0 ? 'text-success' : 'text-destructive'}>{s.m.romi}%</b></span>
                    </div>
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground">Прибуток: </span>
                      <b className={s.m.profit >= 0 ? 'text-success' : 'text-destructive'}>{s.m.profit.toLocaleString()} ₴</b>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <h4 className="font-bold text-foreground text-sm mb-2">📋 Рекомендації</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {real.romi < 0 && <li>⚠️ ROMI від'ємний — оптимізуйте CPL</li>}
                  {real.romi >= 0 && real.romi < 100 && <li>📈 Є потенціал оптимізації конверсії</li>}
                  {real.romi >= 100 && <li>✅ Відмінний ROMI! Масштабуйте</li>}
                  <li>💡 Обробка ліда: до 5 хвилин</li>
                  <li>🔄 Використовуйте retention-канали</li>
                </ul>
              </div>
              <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={() => { update({ status: 'completed' }); navigate('/'); }}>
                <Check className="w-4 h-4" /> Завершити
              </Button>
            </div>
          );
        }

        default: return null;
      }
    };

    return (
      <div ref={panelRef} className="animate-scale-in bg-card border border-border rounded-2xl shadow-lg w-[380px] max-h-[calc(100vh-220px)] overflow-y-auto flex-shrink-0">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">{STEPS[activeStep].icon}</span>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Крок {activeStep + 1} з {STEPS.length}
              </div>
              <h2 className="text-sm font-extrabold text-foreground">{STEPS[activeStep].title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
              <Info className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
              <Play className="w-4 h-4" />
            </button>
            <button onClick={() => setActiveStep(null)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {stepContent()}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-muted overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0 z-20">
        <div className="px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-foreground truncate">{scenario.name}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {scenario.status === 'completed' ? '✅ Завершено' : '📝 Чернетка'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Flow canvas */}
        <div className="flex-1 overflow-auto relative">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, hsl(0 0% 80%) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          {/* Flow nodes - centered */}
          <div
            ref={canvasRef}
            className="relative min-h-full flex items-center justify-center px-12 py-8"
          >
            <div className="flex items-start gap-0">
              {STEPS.map((s, i) => (
                <div key={i} data-flow-node>
                  <FlowNode
                    icon={s.icon}
                    title={s.title}
                    index={i}
                    isActive={activeStep === i}
                    isCompleted={isStepCompleted(i)}
                    isLast={i === STEPS.length - 1}
                    onClick={() => setActiveStep(activeStep === i ? null : i)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        {activeStep !== null && (
          <div className="border-l border-border bg-background p-4 overflow-y-auto">
            {renderPanel()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioBuilder;
