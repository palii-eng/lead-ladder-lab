import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScenarios, Scenario, DecompositionScenario } from '@/context/ScenariosContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Info, Play, Sparkles, ChevronDown, Zap } from 'lucide-react';

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
  const impressions = d.budget / (d.cpm || 1) * 1000;
  const clicks = impressions * ((d.ctr || 0) / 100);
  const leads = d.cpl > 0 ? d.budget / d.cpl : 0;
  const sales = leads * ((d.conversionRate || 0) / 100);
  const revenue = sales * (d.averageCheck || 0);
  const profit = revenue - d.budget;
  const romi = d.budget > 0 ? ((revenue - d.budget) / d.budget) * 100 : 0;
  return { impressions: Math.round(impressions), clicks: Math.round(clicks), leads: Math.round(leads), sales: Math.round(sales * 10) / 10, revenue: Math.round(revenue), profit: Math.round(profit), romi: Math.round(romi) };
};

const ScenarioBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getScenario, updateScenario } = useScenarios();
  const scenario = getScenario(id!);
  const [decompTab, setDecompTab] = useState<'bad' | 'realistic' | 'positive'>('realistic');
  const [customNiche, setCustomNiche] = useState('');

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

  const step = scenario.currentStep;
  const update = (u: Partial<Scenario>) => updateScenario(id!, u);
  const setStep = (s: number) => update({ currentStep: s });
  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

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
    const bad: DecompositionScenario = {
      ...scenario.decomposition.bad,
      ...bench,
      cpm: (bench.cpm || 7) * 1.5,
      ctr: (bench.ctr || 1) * 0.6,
      cpl: (bench.cpl || 35) * 1.8,
      conversionRate: (bench.conversionRate || 5) * 0.4,
      budget: scenario.decomposition.bad.budget || 10000,
    };
    bad.cpc = bad.cpm / ((bad.ctr || 1) / 100) / 1000;
    const realistic: DecompositionScenario = {
      ...scenario.decomposition.realistic,
      ...bench,
      budget: scenario.decomposition.realistic.budget || 10000,
    };
    realistic.cpc = realistic.cpm / ((realistic.ctr || 1) / 100) / 1000;
    const positive: DecompositionScenario = {
      ...scenario.decomposition.positive,
      ...bench,
      cpm: (bench.cpm || 7) * 0.7,
      ctr: (bench.ctr || 1) * 1.5,
      cpl: (bench.cpl || 35) * 0.6,
      conversionRate: (bench.conversionRate || 5) * 1.6,
      budget: scenario.decomposition.positive.budget || 10000,
    };
    positive.cpc = positive.cpm / ((positive.ctr || 1) / 100) / 1000;
    update({ decomposition: { bad, realistic, positive } });
  };

  const toggleLeadDest = (dest: string) => {
    const current = scenario.leadDestinations;
    update({
      leadDestinations: current.includes(dest) ? current.filter(d => d !== dest) : [...current, dest],
    });
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

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Вкажіть нішу вашого бізнесу</h3>
              <Input
                value={scenario.niche}
                onChange={e => update({ niche: e.target.value })}
                placeholder="Наприклад: Стоматологія, Кав'ярня, SaaS..."
                className="bg-muted border-border text-foreground text-lg py-6 placeholder:text-muted-foreground"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  const niches = ['Стоматологія', 'Фітнес-студія', 'Онлайн-школа', 'eCommerce', 'SaaS', 'Ресторан', 'Нерухомість', 'Юридичні послуги'];
                  update({ niche: niches[Math.floor(Math.random() * niches.length)] });
                }}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Обрати випадкову
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">Оберіть спосіб запуску реклами</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch.value}
                  disabled={ch.soon}
                  onClick={() => update({ channel: ch.value })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    scenario.channel === ch.value
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-card hover:border-primary/40 text-foreground'
                  } ${ch.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="font-medium">{ch.label}</span>
                  {ch.soon && <Badge className="ml-2 bg-warning text-warning-foreground text-xs">Вже скоро</Badge>}
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
          { key: 'conversionRate', label: 'Конверсія в продаж', suffix: '%' },
          { key: 'averageCheck', label: 'Середній чек', suffix: '₴' },
        ];
        return (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-lg font-semibold text-foreground">Декомпозиція</h3>
              <Button variant="secondary" size="sm" onClick={fillBenchmarks} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Заповнити автоматично
              </Button>
            </div>
            <div className="flex gap-2">
              {(Object.keys(decompLabels) as Array<'bad' | 'realistic' | 'positive'>).map(key => (
                <button
                  key={key}
                  onClick={() => setDecompTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    decompTab === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {decompLabels[key]}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-sm text-muted-foreground mb-1 block">{f.label} ({f.suffix})</label>
                  <Input
                    type="number"
                    value={currentDecomp[f.key] || ''}
                    onChange={e => updateDecomp(decompTab, f.key, parseFloat(e.target.value) || 0)}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              ))}
            </div>
            <div className="glass-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Ліди', value: metrics.leads },
                { label: 'Продажі', value: metrics.sales },
                { label: 'Дохід', value: `${metrics.revenue.toLocaleString()} ₴` },
                { label: 'ROMI', value: `${metrics.romi}%`, color: metrics.romi > 0 ? 'text-success' : 'text-destructive' },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                  <div className={`text-xl font-bold ${(m as any).color || 'text-foreground'}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">Куди надходять ліди?</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {LEAD_DESTINATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleLeadDest(d)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    scenario.leadDestinations.includes(d)
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/40'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {scenario.leadDestinations.includes('Власна CRM') && (
              <div className="space-y-2 pt-2">
                <label className="text-sm text-muted-foreground">Оберіть CRM</label>
                <div className="flex flex-wrap gap-2">
                  {CRM_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => update({ crmSystem: c })}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        scenario.crmSystem === c ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card text-foreground'
                      }`}
                    >
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
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">Спосіб інтеграції</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {INTEGRATIONS.map(i => (
                <button
                  key={i}
                  onClick={() => update({ integrationMethod: i })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    scenario.integrationMethod === i
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/40'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">Продажі</h3>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Розкажіть про компанію</label>
              <Textarea
                value={scenario.companyDescription}
                onChange={e => update({ companyDescription: e.target.value })}
                placeholder="Опишіть вашу компанію, продукт, цільову аудиторію..."
                rows={4}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>
            {scenario.companyDescription && (
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <h4 className="font-medium text-foreground mb-2">📞 Скрипт дзвінка</h4>
                  <p className="text-sm text-muted-foreground">
                    Вітаю! Мене звати [Ім'я], компанія "{scenario.niche || 'ваша компанія'}". 
                    Ви залишали заявку на [послугу]. Чи зручно вам зараз поговорити? 
                    Розкажіть, що саме вас цікавить...
                  </p>
                </div>
                <div className="glass-card p-4">
                  <h4 className="font-medium text-foreground mb-2">💬 Скрипт переписки</h4>
                  <p className="text-sm text-muted-foreground">
                    Доброго дня! Дякуємо за звернення до "{scenario.niche || 'нас'}". 
                    Бачу, що вас цікавить [послуга]. Давайте підберемо найкращий варіант для вас...
                  </p>
                </div>
                <div className="glass-card p-4">
                  <h4 className="font-medium text-foreground mb-2">🔄 Follow-up</h4>
                  <p className="text-sm text-muted-foreground">
                    Доброго дня! Нагадую про вашу заявку. Чи встигли ви обдумати пропозицію? 
                    Буду радий/рада відповісти на будь-які питання.
                  </p>
                </div>
                <Button variant="secondary" className="gap-2 w-full" disabled>
                  📦 Завантажити повний пакет
                  <Badge className="bg-warning text-warning-foreground text-xs">Pro</Badge>
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
        const scenarios3 = [
          { label: '😟 Поганий', rate: 0.1 },
          { label: '📊 Реалістичний', rate: 0.2 },
          { label: '🚀 Оптимістичний', rate: 0.35 },
        ];
        return (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground">Retention — наявна база</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-sm text-muted-foreground mb-1 block">{f.label} (кількість)</label>
                  <Input
                    type="number"
                    value={scenario.retention[f.key] || ''}
                    onChange={e => update({ retention: { ...scenario.retention, [f.key]: parseInt(e.target.value) || 0 } })}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="grid gap-4 lg:grid-cols-3">
                {scenarios3.map(s => {
                  const r = retentionCalc(s.rate);
                  return (
                    <div key={s.label} className="glass-card p-4 space-y-2">
                      <h4 className="font-medium text-foreground">{s.label}</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p>Open Rate: <span className="text-foreground">{Math.round(s.rate * 100)}%</span></p>
                        <p>Відкриття: <span className="text-foreground">{r.opens}</span></p>
                        <p>Кліки: <span className="text-foreground">{r.clicks}</span></p>
                        <p>Конверсії: <span className="text-foreground">{r.conversions}</span></p>
                        <p>Дохід: <span className="text-foreground font-bold">{r.revenue.toLocaleString()} ₴</span></p>
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
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-foreground">🏆 Фінальний результат</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Поганий', m: bad, color: 'border-destructive/50' },
                { label: 'Реалістичний', m: real, color: 'border-primary/50' },
                { label: 'Позитивний', m: pos, color: 'border-success/50' },
              ].map(s => (
                <div key={s.label} className={`glass-card p-5 border-2 ${s.color}`}>
                  <h4 className="font-semibold text-foreground mb-3">{s.label}</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">Ліди: <span className="text-foreground font-medium">{s.m.leads}</span></p>
                    <p className="text-muted-foreground">Продажі: <span className="text-foreground font-medium">{s.m.sales}</span></p>
                    <p className="text-muted-foreground">Дохід: <span className="text-foreground font-medium">{s.m.revenue.toLocaleString()} ₴</span></p>
                    <p className="text-muted-foreground">Прибуток: <span className={`font-bold ${s.m.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{s.m.profit.toLocaleString()} ₴</span></p>
                    <p className="text-muted-foreground">ROMI: <span className={`font-bold text-lg ${s.m.romi >= 0 ? 'text-success' : 'text-destructive'}`}>{s.m.romi}%</span></p>
                  </div>
                </div>
              ))}
            </div>
            <div className="glass-card p-5 space-y-3">
              <h4 className="font-semibold text-foreground">📋 Рекомендації</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {real.romi < 0 && <li>⚠️ Реалістичний ROMI від'ємний — переглядньте воронку або зменшіть CPL</li>}
                {real.romi >= 0 && real.romi < 100 && <li>📈 ROMI помірний — є потенціал для оптимізації конверсії</li>}
                {real.romi >= 100 && <li>✅ Відмінний ROMI! Рекомендуємо масштабувати бюджет</li>}
                <li>💡 Рекомендована швидкість обробки ліда: до 5 хвилин</li>
                <li>🔄 Використовуйте retention-канали для повторних продажів</li>
                {scenario.retention.emailCount > 0 && <li>📧 Наявна email-база дає додатковий потенціал доходу</li>}
              </ul>
            </div>
            <Button
              className="w-full py-6 text-lg gap-2"
              style={{ background: 'var(--gradient-primary)' }}
              onClick={() => { update({ status: 'completed' }); navigate('/'); }}
            >
              <Check className="w-5 h-5" />
              Завершити сценарій
            </Button>
          </div>
        );
      }

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="font-semibold text-foreground truncate">{scenario.name}</h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6 max-w-4xl">
        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                i === step
                  ? 'bg-primary text-primary-foreground font-medium'
                  : i < step
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="glass-card p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">{STEPS[step].icon}</span>
            <div>
              <div className="text-xs text-muted-foreground">Крок {step + 1} з {STEPS.length}</div>
              <h2 className="text-xl font-bold text-foreground">{STEPS[step].title}</h2>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Пояснення</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Відео</span>
              </Button>
            </div>
          </div>
          {renderStep()}
        </div>

        {/* Navigation */}
        {step < STEPS.length - 1 && (
          <div className="flex justify-between">
            <Button variant="secondary" onClick={prev} disabled={step === 0} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
            <Button onClick={next} className="gap-2" style={{ background: 'var(--gradient-primary)' }}>
              Далі
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioBuilder;
