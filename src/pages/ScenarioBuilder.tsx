import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScenarios, Scenario, DecompositionScenario } from '@/context/ScenariosContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FlowNode from '@/components/FlowNode';
import { ArrowLeft, Check, Download, Info, Play, Save, Sparkles, X, Zap } from 'lucide-react';

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

const STEP_VIDEOS: Record<number, { title: string; url: string }[]> = {
  0: [
    { title: 'Як обрати нішу для реклами', url: 'https://ads-school.online/' },
    { title: 'Аналіз конкурентів', url: 'https://ads-school.online/' },
  ],
  1: [
    { title: 'Огляд рекламних каналів', url: 'https://ads-school.online/' },
    { title: 'SEO vs PPC: що обрати', url: 'https://ads-school.online/' },
  ],
  2: [
    { title: 'Як рахувати декомпозицію', url: 'https://ads-school.online/' },
    { title: 'Бенчмарки по нішах', url: 'https://ads-school.online/' },
  ],
  3: [
    { title: 'Куди направляти ліди', url: 'https://ads-school.online/' },
  ],
  4: [
    { title: 'Інтеграція CRM з рекламою', url: 'https://ads-school.online/' },
  ],
  5: [
    { title: 'Скрипти продажів', url: 'https://ads-school.online/' },
    { title: 'Follow-up стратегії', url: 'https://ads-school.online/' },
  ],
  6: [
    { title: 'Email-маркетинг для retention', url: 'https://ads-school.online/' },
  ],
  7: [
    { title: 'Аналіз результатів', url: 'https://ads-school.online/' },
  ],
};

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
  'Kommo', 'HubSpot', 'SalesDrive', 'Pipedrive', 'KeyCRM', 'Trello',
  'Google Таблиця', 'Telegram-чат з менеджером', 'Інша',
];
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
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoDialogStep, setVideoDialogStep] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // SEO organic state
  const [seoEnabled, setSeoEnabled] = useState(false);
  const [seoLeads, setSeoLeads] = useState('');
  const [seoAvgCheck, setSeoAvgCheck] = useState('');

  // Saved steps tracking (local to session, persisted via scenario completion check)
  const [savedSteps, setSavedSteps] = useState<Set<number>>(() => {
    // Pre-populate with already completed steps
    const set = new Set<number>();
    if (scenario) {
      for (let i = 0; i < STEPS.length; i++) {
        if (isStepCompletedStatic(scenario, i)) set.add(i);
      }
    }
    return set;
  });

  // Drag-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const wasDragged = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('[data-flow-node] button')) return;
    setIsDragging(true);
    wasDragged.current = false;
    setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    if (Math.abs(newX - canvasOffset.x) > 3 || Math.abs(newY - canvasOffset.y) > 3) {
      wasDragged.current = true;
    }
    setCanvasOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

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
        bad: make({ cpm: 1.3, ctr: 0.7, cpl: 1.5, conv: 0.65 }, scenario.decomposition.bad.budget || 10000),
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
    const total = r.emailCount;
    const opens = Math.round(total * rate);
    const clicks = Math.round(opens * 0.15);
    const conversions = Math.round(clicks * 0.05);
    const revenue = conversions * (scenario.decomposition.realistic.averageCheck || 2000);
    return { total, opens, clicks, conversions, revenue };
  };

  function isStepCompletedStatic(s: Scenario, i: number): boolean {
    switch (i) {
      case 0: return !!s.niche;
      case 1: return !!s.channel;
      case 2: return s.decomposition.realistic.cpl > 0;
      case 3: return s.leadDestinations.length > 0;
      case 4: return !!s.integrationMethod;
      case 5: return !!s.companyDescription;
      case 6: return s.retention.emailCount > 0;
      case 7: return s.status === 'completed';
      default: return false;
    }
  }

  const isStepCompleted = (i: number): boolean => isStepCompletedStatic(scenario, i) && savedSteps.has(i);

  const isStepUnlocked = (i: number): boolean => {
    if (i === 0) return true;
    return isStepCompleted(i - 1);
  };

  const canSaveStep = (i: number): boolean => {
    return isStepCompletedStatic(scenario, i);
  };

  const handleSaveStep = (step: number) => {
    setSavedSteps(prev => new Set(prev).add(step));
    // Auto-open next step
    if (step < STEPS.length - 1) {
      setActiveStep(step + 1);
    } else {
      setActiveStep(null);
    }
  };

  const AdschoolVideoButton: React.FC<{ step: number }> = ({ step }) => (
    <button
      onClick={() => { setVideoDialogStep(step); setVideoDialogOpen(true); }}
      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-[10px] font-bold ring-2 ring-primary/30 hover:scale-110 transition-transform flex-shrink-0"
      title="Відео від AdsSchool"
    >
      <span className="leading-none">AS</span>
    </button>
  );

  const SaveButton: React.FC<{ step: number }> = ({ step }) => (
    <Button
      onClick={() => handleSaveStep(step)}
      disabled={!canSaveStep(step)}
      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold mt-4"
    >
      <Save className="w-4 h-4" /> Зберегти та продовжити
    </Button>
  );

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
                <Sparkles className="w-4 h-4" /> Згенерувати автоматично
              </Button>
              <SaveButton step={0} />
            </div>
          );

        case 1:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Оберіть рекламне джерело</h3>
              <p className="text-xs text-muted-foreground">Оберіть один обов'язковий канал:</p>
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

              {/* SEO organic option */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Додаткова опція:</p>
                <button
                  onClick={() => setSeoEnabled(!seoEnabled)}
                  className={`w-full p-3 rounded-lg border text-left text-sm transition-all ${
                    seoEnabled
                      ? 'border-success bg-success/10 text-foreground font-semibold'
                      : 'border-border bg-card text-foreground hover:border-success/40'
                  }`}
                >
                  🌿 SEO — органіка
                  <span className="text-xs text-muted-foreground ml-2">(опціонально)</span>
                </button>
                {seoEnabled && (
                  <div className="mt-3 space-y-3 p-3 bg-secondary rounded-lg">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Скільки продажів зараз з органіки?</label>
                      <Input
                        type="number"
                        value={seoLeads}
                        onChange={e => setSeoLeads(e.target.value)}
                        placeholder="Наприклад: 10"
                        className="bg-card border-border text-foreground h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Середній чек з органіки (₴)</label>
                      <Input
                        type="number"
                        value={seoAvgCheck}
                        onChange={e => setSeoAvgCheck(e.target.value)}
                        placeholder="Наприклад: 2000"
                        className="bg-card border-border text-foreground h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <SaveButton step={1} />
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
                {([
                  { key: 'bad' as const, label: '😟 Поганий', bg: 'bg-warning text-warning-foreground', inactive: 'bg-warning/20 text-warning-foreground' },
                  { key: 'realistic' as const, label: '📊 Реалістичний', bg: 'bg-primary text-primary-foreground', inactive: 'bg-primary/20 text-primary' },
                  { key: 'positive' as const, label: '🚀 Позитивний', bg: 'bg-success text-success-foreground', inactive: 'bg-success/20 text-success' },
                ]).map(tab => (
                  <button key={tab.key} onClick={() => setDecompTab(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      decompTab === tab.key ? tab.bg : tab.inactive
                    }`}>
                    {tab.label}
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
              <SaveButton step={2} />
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
              <SaveButton step={3} />
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
              <SaveButton step={4} />
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
                    { icon: '📞', title: 'Скрипт дзвінка', filename: 'script-call.txt' },
                    { icon: '💬', title: 'Скрипт переписки', filename: 'script-chat.txt' },
                    { icon: '🔄', title: 'Follow-up', filename: 'follow-up.txt' },
                  ].map(s => (
                    <div key={s.title} className="bg-secondary rounded-lg p-3 flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm">{s.icon} {s.title}</span>
                      <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                        <Download className="w-3 h-3" /> Завантажити
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <SaveButton step={5} />
            </div>
          );

        case 6: {
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Retention — база</h3>
              
              {/* Email - active */}
              <div>
                <label className="text-xs text-muted-foreground mb-0.5 block">📧 Email-база</label>
                <Input type="number" value={scenario.retention.emailCount || ''}
                  onChange={e => update({ retention: { ...scenario.retention, emailCount: parseInt(e.target.value) || 0 } })}
                  className="bg-secondary border-border text-foreground h-9 text-sm"
                  placeholder="Кількість контактів" />
              </div>

              {/* Disabled channels */}
              {[
                { label: '💬 Telegram-база', key: 'telegramCount' },
                { label: '📱 SMS', key: 'smsCount' },
              ].map(ch => (
                <div key={ch.key} className="opacity-50">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-xs text-muted-foreground">{ch.label}</label>
                    <Badge className="bg-warning text-warning-foreground text-[10px]">Скоро</Badge>
                  </div>
                  <Input type="number" disabled placeholder="Недоступно наразі"
                    className="bg-muted border-border text-muted-foreground h-9 text-sm cursor-not-allowed" />
                </div>
              ))}

              {scenario.retention.emailCount > 0 && (
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
              <SaveButton step={6} />
            </div>
          );
        }

        case 7: {
          const real = calcMetrics(scenario.decomposition.realistic);
          const bad = calcMetrics(scenario.decomposition.bad);
          const pos = calcMetrics(scenario.decomposition.positive);
          const channelLabel = CHANNELS.find(c => c.value === scenario.channel)?.label || scenario.channel || '—';
          return (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-foreground">🏆 Підсумок воронки</h3>

              {/* Summary of what was done */}
              <div className="bg-secondary rounded-lg p-3 space-y-2">
                <h4 className="font-bold text-foreground text-sm mb-2">📌 Що було зроблено</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Ніша:</span>
                    <p className="font-semibold text-foreground">{scenario.niche || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Канал:</span>
                    <p className="font-semibold text-foreground">{channelLabel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Бюджет:</span>
                    <p className="font-semibold text-foreground">{scenario.decomposition.realistic.budget.toLocaleString()} ₴</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ліди йдуть у:</span>
                    <p className="font-semibold text-foreground">{scenario.leadDestinations.join(', ') || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Інтеграція:</span>
                    <p className="font-semibold text-foreground">{scenario.integrationMethod || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email-база:</span>
                    <p className="font-semibold text-foreground">{scenario.retention.emailCount || 0} контактів</p>
                  </div>
                </div>
              </div>

              {/* Expected results */}
              <div>
                <h4 className="font-bold text-foreground text-sm mb-2">📊 Очікувані результати</h4>
                <div className="space-y-2">
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
              </div>

              {/* Recommendations */}
              <div className="bg-secondary rounded-lg p-3">
                <h4 className="font-bold text-foreground text-sm mb-2">💡 Рекомендації</h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {real.romi < 0 && <li>⚠️ ROMI від'ємний — зменшіть CPL або збільшіть середній чек</li>}
                  {real.romi >= 0 && real.romi < 50 && <li>📉 ROMI низький — оптимізуйте конверсію та середній чек</li>}
                  {real.romi >= 50 && real.romi < 100 && <li>📈 Є потенціал — тестуйте нові креативи та аудиторії</li>}
                  {real.romi >= 100 && <li>✅ Відмінний ROMI! Масштабуйте бюджет поступово</li>}
                  <li>⏱️ Обробляйте ліди протягом 5 хвилин — це підвищує конверсію на 80%</li>
                  <li>🔄 Налаштуйте follow-up через 24 та 72 години</li>
                  <li>📧 Збирайте email-базу з першого дня для retention</li>
                  {scenario.retention.emailCount > 0 && <li>📬 Запустіть welcome-серію з 3-5 листів для нових контактів</li>}
                  {real.leads > 50 && <li>🤖 Автоматизуйте обробку лідів через {scenario.integrationMethod || 'CRM-інтеграцію'}</li>}
                  <li>📊 Аналізуйте результати щотижня та коригуйте бюджет</li>
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
      <div ref={panelRef} className="bg-card border border-border rounded-2xl shadow-lg w-[400px] max-h-full overflow-y-auto">
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
            <AdschoolVideoButton step={activeStep} />
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
          <div className="flex-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>
              ⚡ Заряджено в{' '}
              <a href="https://ads-school.online/" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                Ads School
              </a>
            </span>
            <span className="text-border">|</span>
            <span>
              🛠 Створено в{' '}
              <a href="https://ai.ads-wind.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                ADS WindAI Lab
              </a>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {scenario.status === 'completed' ? '✅ Завершено' : '📝 Чернетка'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasWrapperRef}
          className={`w-full h-full overflow-hidden relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, hsl(0 0% 80%) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: `${canvasOffset.x % 24}px ${canvasOffset.y % 24}px`,
          }} />

          <div
            ref={canvasRef}
            className="relative min-h-full flex items-center justify-center select-none"
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div className="flex items-start gap-0 px-12 py-8">
              {STEPS.map((s, i) => {
                const getSubtitle = () => {
                  switch (i) {
                    case 0: return scenario.niche || '';
                    case 1: {
                      const label = CHANNELS.find(c => c.value === scenario.channel)?.label || '';
                      return seoEnabled ? (label ? `${label} + SEO` : 'SEO') : label;
                    }
                    case 2: {
                      const bad = calcMetrics(scenario.decomposition.bad);
                      const real = calcMetrics(scenario.decomposition.realistic);
                      const pos = calcMetrics(scenario.decomposition.positive);
                      if (real.revenue <= 0 && bad.revenue <= 0 && pos.revenue <= 0) return '';
                      return [
                        `😟 ${bad.leads} лідів → ${bad.revenue.toLocaleString()}₴ → ${bad.romi}%`,
                        `📊 ${real.leads} лідів → ${real.revenue.toLocaleString()}₴ → ${real.romi}%`,
                        `🚀 ${pos.leads} лідів → ${pos.revenue.toLocaleString()}₴ → ${pos.romi}%`,
                      ].join('\n');
                    }
                    case 3: return scenario.leadDestinations.length > 0 ? scenario.leadDestinations[0] : '';
                    case 4: return scenario.integrationMethod || '';
                    default: return '';
                  }
                };
                return (
                  <div key={i} data-flow-node>
                    <FlowNode
                      icon={s.icon}
                      title={s.title}
                      index={i}
                      isActive={activeStep === i}
                      isCompleted={isStepCompleted(i)}
                      isLast={i === STEPS.length - 1}
                      isLocked={!isStepUnlocked(i)}
                      subtitle={isStepCompleted(i) || isStepCompletedStatic(scenario, i) ? getSubtitle() : ''}
                      onClick={() => {
                        if (!wasDragged.current && isStepUnlocked(i)) {
                          setActiveStep(activeStep === i ? null : i);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Popup panel overlay */}
        {activeStep !== null && (
          <>
            <div
              className="absolute inset-0 bg-foreground/5 z-30"
              onClick={() => setActiveStep(null)}
            />
            <div className="absolute right-6 top-6 bottom-6 z-40 animate-slide-in-right">
              {renderPanel()}
            </div>
          </>
        )}
      </div>

      {/* Video dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold">AS</div>
              Відео від AdsSchool — {STEPS[videoDialogStep]?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {(STEP_VIDEOS[videoDialogStep] || []).map((v, i) => (
              <a
                key={i}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary hover:border-primary/40 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Play className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{v.title}</span>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScenarioBuilder;
