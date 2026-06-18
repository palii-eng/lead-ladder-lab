import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import { useScenarios, Scenario, DecompositionScenario, DecompositionSet, createDefaultDecompSet, createDefaultBranchData, BranchData } from '@/context/ScenariosContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FlowNode from '@/components/FlowNode';
import SimulationIntro from '@/components/SimulationIntro';
import { ArrowLeft, Check, Download, Info, Loader2, Megaphone, MousePointerClick, MessageCircle, Filter, Users, ShoppingBag, Play, Save, Sparkles, X, Zap, Plus, Minus, Maximize2 } from 'lucide-react';
import { MetaIcon, TikTokIcon, GoogleIcon } from '@/components/BrandIcons';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import adsSchoolLogo from '@/assets/ads-school-logo.png';

const STEPS = [
  { title: 'Вибір ніші', icon: '🎯' },
  { title: 'Джерело лідгену', icon: '📡' },
  { title: 'Ціль оптимізації', icon: '🚀' },
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
    { title: 'Огляд рекламних платформ', url: 'https://ads-school.online/' },
  ],
  2: [
    { title: 'Огляд рекламних каналів', url: 'https://ads-school.online/' },
    { title: 'SEO vs PPC: що обрати', url: 'https://ads-school.online/' },
  ],
  3: [
    { title: 'Як рахувати декомпозицію', url: 'https://ads-school.online/' },
    { title: 'Бенчмарки по нішах', url: 'https://ads-school.online/' },
  ],
  4: [
    { title: 'Куди направляти ліди', url: 'https://ads-school.online/' },
  ],
  5: [
    { title: 'Інтеграція CRM з рекламою', url: 'https://ads-school.online/' },
  ],
  6: [
    { title: 'Скрипти продажів', url: 'https://ads-school.online/' },
    { title: 'Follow-up стратегії', url: 'https://ads-school.online/' },
  ],
  7: [
    { title: 'Email-маркетинг для retention', url: 'https://ads-school.online/' },
  ],
  8: [
    { title: 'Аналіз результатів', url: 'https://ads-school.online/' },
  ],
};
const LEAD_SOURCES = [
  { value: 'meta', label: 'Meta реклама', LogoComponent: 'meta' as const },
  { value: 'tiktok', label: 'TikTok реклама', LogoComponent: 'tiktok' as const, soon: true },
  { value: 'google', label: 'Google реклама', LogoComponent: 'google' as const, soon: true },
];

const CAMPAIGN_GOALS = [
  { value: 'awareness', label: 'Упізнаваність', Icon: Megaphone },
  { value: 'traffic', label: 'Трафік', Icon: MousePointerClick },
  { value: 'engagement', label: 'Взаємодія', Icon: MessageCircle },
  { value: 'leads', label: 'Ліди', Icon: Filter },
  { value: 'app_promotion', label: 'Просування додатка', Icon: Users },
  { value: 'sales', label: 'Продажі', Icon: ShoppingBag },
];

const LEAD_TYPES = [
  { value: 'leadform', label: 'Лідформи', icon: '📋' },
  { value: 'quiz', label: 'Квізи', icon: '❓' },
  { value: 'landing', label: 'Лендінг', icon: '🌐' },
];

const LEAD_DESTINATIONS = [
  'Kommo', 'HubSpot', 'SalesDrive', 'Pipedrive', 'KeyCRM', 'Trello',
  'Google Таблиця', 'Telegram-чат з менеджером', 'Інша',
];
const INTEGRATIONS = ['Пряма інтеграція', 'Webhook', 'Make', 'ApiX-Drive'];

const BENCHMARKS: Record<string, Partial<DecompositionScenario>> = {
  awareness: { cpm: 5, ctr: 1.5, cpc: 3.33, cpl: 40, landingConversion: 50, conversionRate: 3, averageCheck: 2500, marginality: 30 },
  traffic: { cpm: 6, ctr: 2.0, cpc: 3.0, cpl: 30, landingConversion: 50, conversionRate: 4, averageCheck: 2000, marginality: 30 },
  engagement: { cpm: 7, ctr: 1.8, cpc: 3.89, cpl: 35, landingConversion: 50, conversionRate: 5, averageCheck: 2500, marginality: 30 },
  leads: { cpm: 8, ctr: 1.2, cpc: 6.67, cpl: 45, landingConversion: 50, conversionRate: 5, averageCheck: 3000, marginality: 32 },
  app_promotion: { cpm: 6, ctr: 2.5, cpc: 2.4, cpl: 25, landingConversion: 50, conversionRate: 8, averageCheck: 1500, marginality: 30 },
  sales: { cpm: 10, ctr: 1.0, cpc: 10.0, cpl: 50, landingConversion: 50, conversionRate: 6, averageCheck: 4000, marginality: 32 },
  other: { cpm: 7, ctr: 1.5, cpc: 4.67, cpl: 35, landingConversion: 50, conversionRate: 5, averageCheck: 3000, marginality: 30 },
};

const calcMetrics = (d: DecompositionScenario) => {
  const impressions = d.cpm > 0 ? (d.budget / d.cpm) * 1000 : 0;
  const clicks = impressions * ((d.ctr || 0) / 100);
  const cpc = clicks > 0 ? d.budget / clicks : 0;
  const leads = clicks * ((d.landingConversion || 0) / 100);
  const sales = leads * ((d.conversionRate || 0) / 100);
  const revenue = sales * (d.averageCheck || 0);
  const profitPerSale = (d.averageCheck || 0) * ((d.marginality || 0) / 100);
  const totalProfit = sales * profitPerSale;
  const cpa = sales > 0 ? d.budget / sales : 0;
  const roas = d.budget > 0 ? (revenue / d.budget) * 100 : 0;
  const netIncome = totalProfit - d.budget;
  const romi = d.budget > 0 ? ((revenue - d.budget) / d.budget) * 100 : 0;
  return {
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    cpc: Math.round(cpc * 100) / 100,
    leads: Math.round(leads),
    sales: Math.round(sales * 10) / 10,
    revenue: Math.round(revenue),
    profitPerSale: Math.round(profitPerSale),
    totalProfit: Math.round(totalProfit),
    cpa: Math.round(cpa * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    netIncome: Math.round(netIncome),
    romi: Math.round(romi),
  };
};

const ScenarioBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getScenario, updateScenario } = useScenarios();
  const scenario = getScenario(id!);
  const [activeStep, setActiveStep] = useState<number | null>(0);
  const [decompTab, setDecompTab] = useState<'bad' | 'realistic' | 'positive'>('realistic');
  const [activeLeadType, setActiveLeadType] = useState<string>('');
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoDialogStep, setVideoDialogStep] = useState(0);
  const [aiTipsOpen, setAiTipsOpen] = useState(false);
  const [aiTipsText, setAiTipsText] = useState('');
  const [aiTipsLoading, setAiTipsLoading] = useState(false);
  const [aiTipsBranchType, setAiTipsBranchType] = useState<string | undefined>(undefined);
  const [salesProcessed, setSalesProcessed] = useState(false);
  const [salesRecOpen, setSalesRecOpen] = useState(false);
  const [salesRecText, setSalesRecText] = useState('');
  const [salesRecLoading, setSalesRecLoading] = useState(false);
  const [salesRecTitle, setSalesRecTitle] = useState('');
  // Cache for AI-generated content: key → text
  const aiCacheRef = useRef<Record<string, string>>({});
  // AI conclusion for result step
  const [aiConclusionText, setAiConclusionText] = useState('');
  const [aiConclusionLoading, setAiConclusionLoading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // SEO organic state
  const [seoEnabled, setSeoEnabled] = useState(false);
  const [seoLeads, setSeoLeads] = useState('');
  const [seoAvgCheck, setSeoAvgCheck] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();
  const fetchAiRecommendation = useCallback(async () => {
    if (!scenario) return;
    setAiLoading(true);
    setAiRecommendation('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { niche: scenario.niche, channel: scenario.channel, leadTypes: scenario.leadTypes || [] },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'AI помилка', description: data.error, variant: 'destructive' });
      } else {
        setAiRecommendation(data?.recommendation || '');
      }
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати рекомендації', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  }, [scenario?.niche, scenario?.channel, scenario?.leadTypes, toast]);

  const fetchCampaignTips = useCallback(async (branchLeadType?: string) => {
    if (!scenario) return;
    const cacheKey = `campaign-tips:${branchLeadType || 'main'}`;
    setAiTipsBranchType(branchLeadType);
    setAiTipsOpen(true);

    // Return cached result if available
    if (aiCacheRef.current[cacheKey]) {
      setAiTipsText(aiCacheRef.current[cacheKey]);
      setAiTipsLoading(false);
      return;
    }

    setAiTipsLoading(true);
    setAiTipsText('');

    const isBr = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && branchLeadType;
    const branch = isBr ? scenario.branchData?.[branchLeadType!] : null;
    const decompSet = branch ? branch.decomposition : scenario.decomposition;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          niche: scenario.niche,
          channel: scenario.channel,
          leadType: branchLeadType || (scenario.leadTypes?.[0] || ''),
          decomposition: decompSet,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Помилка' }));
        toast({ title: 'AI помилка', description: err.error || 'Не вдалося отримати рекомендації', variant: 'destructive' });
        setAiTipsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiTipsText(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      if (fullText) aiCacheRef.current[cacheKey] = fullText;
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати рекомендації', variant: 'destructive' });
    } finally {
      setAiTipsLoading(false);
    }
  }, [scenario, toast]);

  const fetchSalesRecommendation = useCallback(async (recType: string, title: string) => {
    if (!scenario) return;
    const cacheKey = `sales:${recType}:${activeLeadType || 'main'}`;
    setSalesRecTitle(title);
    setSalesRecOpen(true);

    // Return cached result if available
    if (aiCacheRef.current[cacheKey]) {
      setSalesRecText(aiCacheRef.current[cacheKey]);
      setSalesRecLoading(false);
      return;
    }

    setSalesRecLoading(true);
    setSalesRecText('');

    const isBr = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && activeLeadType;
    const branch = isBr ? scenario.branchData?.[activeLeadType] : null;
    const decompSet = branch ? branch.decomposition : scenario.decomposition;
    const dests = branch ? branch.leadDestinations : scenario.leadDestinations;
    const intMethod = branch ? branch.integrationMethod : scenario.integrationMethod;
    const compDesc = branch ? branch.companyDescription : scenario.companyDescription;
    const ret = branch ? branch.retention : scenario.retention;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: recType,
          niche: scenario.niche,
          channel: scenario.channel,
          leadType: activeLeadType || (scenario.leadTypes?.[0] || ''),
          companyDescription: compDesc,
          decomposition: decompSet,
          leadDestinations: dests,
          integrationMethod: intMethod,
          retention: ret,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Помилка' }));
        toast({ title: 'AI помилка', description: err.error || 'Не вдалося отримати рекомендації', variant: 'destructive' });
        setSalesRecLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setSalesRecText(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      if (fullText) aiCacheRef.current[cacheKey] = fullText;
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати рекомендації', variant: 'destructive' });
    } finally {
      setSalesRecLoading(false);
    }
  }, [scenario, activeLeadType, toast]);

  const fetchAiConclusion = useCallback(async () => {
    if (!scenario) return;
    const cacheKey = `conclusion:${activeLeadType || 'main'}`;
    if (aiCacheRef.current[cacheKey]) {
      setAiConclusionText(aiCacheRef.current[cacheKey]);
      return;
    }

    setAiConclusionLoading(true);
    setAiConclusionText('');

    const isBr = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && activeLeadType;
    const branch = isBr ? scenario.branchData?.[activeLeadType] : null;
    const decompSet = branch ? branch.decomposition : scenario.decomposition;
    const dests = branch ? branch.leadDestinations : scenario.leadDestinations;
    const intMethod = branch ? branch.integrationMethod : scenario.integrationMethod;
    const compDesc = branch ? branch.companyDescription : scenario.companyDescription;
    const ret = branch ? branch.retention : scenario.retention;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'conclusion',
          niche: scenario.niche,
          channel: scenario.channel,
          leadType: activeLeadType || (scenario.leadTypes?.[0] || ''),
          companyDescription: compDesc,
          decomposition: decompSet,
          leadDestinations: dests,
          integrationMethod: intMethod,
          retention: ret,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Помилка' }));
        toast({ title: 'AI помилка', description: err.error || 'Не вдалося отримати висновок', variant: 'destructive' });
        setAiConclusionLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiConclusionText(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      if (fullText) aiCacheRef.current[cacheKey] = fullText;
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати висновок', variant: 'destructive' });
    } finally {
      setAiConclusionLoading(false);
    }
  }, [scenario, activeLeadType, toast]);

  // savedSteps tracks global steps + per-branch steps (key format: "step" or "step:branchType")
  const [savedSteps, setSavedSteps] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (scenario) {
      for (let i = 0; i < STEPS.length; i++) {
        if (isStepCompletedStatic(scenario, i)) set.add(String(i));
        // Also check per-branch completion
        if (scenario.channel === 'leads' && scenario.leadTypes?.length > 1 && i >= 3) {
          scenario.leadTypes.forEach(lt => {
            if (isStepCompletedForBranch(scenario, i, lt)) set.add(`${i}:${lt}`);
          });
        }
      }
    }
    return set;
  });

  // Drag-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 1.5;
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
    // Reset shortly after, so the onClick of the underlying element fires first
    setTimeout(() => { wasDragged.current = false; }, 0);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setTimeout(() => { wasDragged.current = false; }, 0);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Initialize activeLeadType when entering decomposition
  useEffect(() => {
    if (activeStep === 3 && scenario?.channel === 'leads' && (scenario.leadTypes?.length || 0) > 0 && !scenario.leadTypes?.includes(activeLeadType)) {
      setActiveLeadType(scenario.leadTypes[0]);
    }
  }, [activeStep, scenario?.channel, scenario?.leadTypes, activeLeadType]);

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

  if (!scenario.clientBrief) {
    return (
      <SimulationIntro
        scenarioName={scenario.name}
        onAccept={(difficulty, brief) => {
          updateScenario(id!, { difficulty, clientBrief: brief });
          toast({
            title: 'Ads School',
            description: `Вітаю з новим проектом — ${brief.name}!`,
          });
        }}
      />
    );
  }

  const ClientInfoCard: React.FC<{ compact?: boolean }> = ({ compact }) => {
    const b = scenario.clientBrief!;
    return (
      <div
        className={`flex-shrink-0 rounded-2xl bg-card border border-border shadow-sm overflow-hidden ${compact ? 'w-[260px]' : 'w-[280px]'}`}
        style={{ boxShadow: '0 10px 30px -15px hsl(var(--foreground) / 0.18)' }}
        data-flow-node
      >
        <div className="relative aspect-[4/3] bg-secondary">
          <img
            src={b.photo}
            alt={b.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`;
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/65 via-black/15 to-transparent">
            <p className="text-white font-bold text-base leading-tight">{b.name}</p>
            {b.niche && <p className="text-white/85 text-xs mt-0.5">{b.niche}</p>}
          </div>
          {b.source && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-foreground text-[9px] font-semibold uppercase tracking-wide shadow-sm">
              {b.source}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider mb-1">
            Клієнт
          </p>
          <p className="text-xs text-foreground leading-relaxed line-clamp-5">{b.task}</p>
        </div>
      </div>
    );
  };

  const update = (u: Partial<Scenario>) => updateScenario(id!, u);

  const hasMultipleLeadTypes = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1;
  const isBranching = hasMultipleLeadTypes && savedSteps.has('2');

  // Helper: get branch data for active lead type
  const getBranch = (lt?: string): BranchData => {
    const key = lt || activeLeadType;
    return scenario.branchData?.[key] || createDefaultBranchData();
  };

  const updateBranch = (fields: Partial<BranchData>) => {
    if (!activeLeadType) return;
    const current = getBranch();
    update({
      branchData: {
        ...scenario.branchData,
        [activeLeadType]: { ...current, ...fields },
      },
    });
  };

  const getActiveDecompSet = (): DecompositionSet => {
    if (isBranching && activeLeadType) {
      return getBranch().decomposition;
    }
    return scenario.decomposition;
  };

  const updateDecomp = (type: 'bad' | 'realistic' | 'positive', field: keyof DecompositionScenario, value: number) => {
    if (isBranching && activeLeadType) {
      const branch = getBranch();
      updateBranch({
        decomposition: {
          ...branch.decomposition,
          [type]: { ...branch.decomposition[type], [field]: value },
        },
      });
    } else {
      update({
        decomposition: {
          ...scenario.decomposition,
          [type]: { ...scenario.decomposition[type], [field]: value },
        },
      });
    }
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
        landingConversion: bench.landingConversion || 50,
        conversionRate: (bench.conversionRate || 5) * mult.conv,
        averageCheck: bench.averageCheck || 3000,
        marginality: bench.marginality || 30,
        budget,
      };
      d.cpc = d.cpm / ((d.ctr || 1) / 100) / 1000;
      return d;
    };
    
    const makeSet = (baseBudget: number): DecompositionSet => ({
      bad: make({ cpm: 1.3, ctr: 0.7, cpl: 1.5, conv: 0.65 }, baseBudget),
      realistic: make({ cpm: 1, ctr: 1, cpl: 1, conv: 1 }, baseBudget),
      positive: make({ cpm: 0.7, ctr: 1.5, cpl: 0.6, conv: 1.6 }, baseBudget),
    });

    if (isBranching && activeLeadType) {
      const branch = getBranch();
      updateBranch({ decomposition: makeSet(branch.decomposition.realistic.budget || 10000) });
    } else {
      update({
        decomposition: makeSet(scenario.decomposition.realistic.budget || 10000),
      });
    }
  };

  const toggleLeadType = (lt: string) => {
    const current = scenario.leadTypes || [];
    const newTypes = current.includes(lt) ? current.filter(t => t !== lt) : [...current, lt];
    const newBranchData = { ...(scenario.branchData || {}) };
    // Add default branch data for new types
    newTypes.forEach(t => {
      if (!newBranchData[t]) newBranchData[t] = createDefaultBranchData();
    });
    // Remove data for removed types
    Object.keys(newBranchData).forEach(k => {
      if (!newTypes.includes(k)) delete newBranchData[k];
    });
    update({ leadTypes: newTypes, branchData: newBranchData });
    if (newTypes.length > 0 && !newTypes.includes(activeLeadType)) {
      setActiveLeadType(newTypes[0]);
    }
  };

  const toggleLeadDest = (dest: string) => {
    if (isBranching && activeLeadType) {
      const branch = getBranch();
      const current = branch.leadDestinations;
      updateBranch({ leadDestinations: current.includes(dest) ? current.filter(d => d !== dest) : [...current, dest] });
    } else {
      const current = scenario.leadDestinations;
      update({ leadDestinations: current.includes(dest) ? current.filter(d => d !== dest) : [...current, dest] });
    }
  };

  // Get the right lead destinations for current context
  const currentLeadDestinations = isBranching && activeLeadType ? getBranch().leadDestinations : scenario.leadDestinations;
  const currentIntegrationMethod = isBranching && activeLeadType ? getBranch().integrationMethod : scenario.integrationMethod;
  const currentCompanyDescription = isBranching && activeLeadType ? getBranch().companyDescription : scenario.companyDescription;
  const currentRetention = isBranching && activeLeadType ? getBranch().retention : scenario.retention;

  const activeDecompSet = getActiveDecompSet();
  const currentDecomp = activeDecompSet[decompTab];
  const metrics = calcMetrics(currentDecomp);

  const retentionCalc = (rate: number) => {
    const r = currentRetention;
    const total = r.emailCount;
    const opens = Math.round(total * rate);
    const clicks = Math.round(opens * 0.15);
    const conversions = Math.round(clicks * 0.05);
    const decompSet = isBranching && activeLeadType ? getBranch().decomposition : scenario.decomposition;
    const revenue = conversions * (decompSet.realistic.averageCheck || 2000);
    return { total, opens, clicks, conversions, revenue };
  };

  // Check if a specific step is filled for a specific branch
  function isStepCompletedForBranch(s: Scenario, i: number, lt: string): boolean {
    const branch = s.branchData?.[lt];
    if (!branch) return false;
    switch (i) {
      case 3: return branch.decomposition.realistic.cpl > 0;
      case 4: return (branch.leadDestinations?.length || 0) > 0;
      case 5: return !!branch.integrationMethod;
      case 6: return !!branch.companyDescription;
      case 7: return (branch.retention?.emailCount || 0) > 0;
      default: return false;
    }
  }

  function isStepCompletedStatic(s: Scenario, i: number): boolean {
    switch (i) {
      case 0: return !!s.niche;
      case 1: return !!s.leadSource;
      case 2: return !!s.channel && (s.channel !== 'leads' || (s.leadTypes && s.leadTypes.length > 0));
      case 3: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 3, lt));
        }
        return s.decomposition.realistic.cpl > 0;
      }
      case 4: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 4, lt));
        }
        return s.leadDestinations.length > 0;
      }
      case 5: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 5, lt));
        }
        return !!s.integrationMethod;
      }
      case 6: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 6, lt));
        }
        return !!s.companyDescription;
      }
      case 7: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 7, lt));
        }
        return s.retention.emailCount > 0;
      }
      case 8: return s.status === 'completed';
      default: return false;
    }
  }

  // For shared steps (0-2) use global key, for branch steps (3+) use branch-specific key
  const isStepCompleted = (i: number, branchLeadType?: string): boolean => {
    if (i < 3 || !isBranching) {
      return isStepCompletedStatic(scenario, i) && savedSteps.has(String(i));
    }
    // Branch-specific: check this specific branch
    const lt = branchLeadType || activeLeadType;
    if (!lt) return false;
    return isStepCompletedForBranch(scenario, i, lt) && savedSteps.has(`${i}:${lt}`);
  };

  const isStepUnlocked = (i: number, branchLeadType?: string): boolean => {
    if (i === 0) return true;
    if (i <= 2) return isStepCompleted(i - 1);
    // For branch steps (3+), check previous step in the same branch
    if (i === 3) return isStepCompleted(2); // step 2 is shared
    return isStepCompleted(i - 1, branchLeadType);
  };

  const canSaveStep = (i: number, branchLeadType?: string): boolean => {
    if (i < 3 || !isBranching) {
      return isStepCompletedStatic(scenario, i);
    }
    const lt = branchLeadType || activeLeadType;
    if (!lt) return false;
    return isStepCompletedForBranch(scenario, i, lt);
  };

  const handleSaveStep = (step: number) => {
    setSavedSteps(prev => {
      const next = new Set(prev);
      if (step < 3 || !isBranching) {
        next.add(String(step));
      } else {
        // Save for current active lead type
        if (activeLeadType) next.add(`${step}:${activeLeadType}`);
      }
      return next;
    });
    // Auto-open next step
    if (step < STEPS.length - 1) {
      setActiveStep(step + 1);
    } else {
      setActiveStep(null);
    }
  };

  const RetentionArrow: React.FC = () => {
    const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    useEffect(() => {
      const container = document.getElementById('flow-container');
      if (!container) return;
      const salesNode = container.querySelector('[data-step-index="6"] button') as HTMLElement;
      const retentionNode = container.querySelector('[data-step-index="7"] button') as HTMLElement;
      if (!salesNode || !retentionNode) return;

      const containerRect = container.getBoundingClientRect();
      const salesRect = salesNode.getBoundingClientRect();
      const retentionRect = retentionNode.getBoundingClientRect();

      setCoords({
        x1: salesRect.right - containerRect.left,
        y1: salesRect.top + salesRect.height / 2 - containerRect.top,
        x2: retentionRect.left - containerRect.left,
        y2: retentionRect.top + retentionRect.height / 2 - containerRect.top,
      });
    }, [activeStep]);

    if (!coords) return null;

    const y = (coords.y1 + coords.y2) / 2 + 12;

    return (
      <svg
        className="absolute pointer-events-none"
        style={{
          left: `${coords.x1}px`,
          top: `${y}px`,
          width: `${coords.x2 - coords.x1}px`,
          height: '16px',
        }}
        viewBox={`0 0 ${coords.x2 - coords.x1} 16`}
      >
        <line
          x1={coords.x2 - coords.x1}
          y1="8"
          x2="28"
          y2="8"
          stroke="hsl(36, 100%, 50%)"
          strokeWidth="2.5"
          strokeDasharray="8 4"
        />
        <polygon
          points="12,8 28,2 28,14"
          fill="hsl(36, 100%, 50%)"
        />
      </svg>
    );
  };

  const AdschoolVideoButton: React.FC<{ step: number }> = ({ step }) => (
    <button
      onClick={() => { setVideoDialogStep(step); setVideoDialogOpen(true); }}
      className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30 hover:scale-110 transition-transform flex-shrink-0"
      title="Відео від AdsSchool"
    >
      <img src={adsSchoolLogo} alt="Ads School" className="w-full h-full object-cover" />
    </button>
  );

  const SaveButton: React.FC<{ step: number; sticky?: boolean; disabled?: boolean }> = ({ step, sticky, disabled }) => (
    <div className={sticky ? 'sticky bottom-0 bg-card pt-3 pb-1 -mx-4 px-4 border-t border-border mt-4 z-10' : 'mt-4'}>
      <Button
        onClick={() => handleSaveStep(step)}
        disabled={disabled !== undefined ? disabled : !canSaveStep(step, activeLeadType)}
        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
      >
        <Save className="w-4 h-4" /> Зберегти та продовжити
      </Button>
    </div>
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
              <h3 className="text-base font-bold text-foreground">Оберіть джерело лідгену</h3>
              <p className="text-xs text-muted-foreground">Оберіть рекламну платформу:</p>
              <div className="grid gap-2">
                {LEAD_SOURCES.map(src => {
                  const LogoIcon = src.LogoComponent === 'meta' ? MetaIcon : src.LogoComponent === 'tiktok' ? TikTokIcon : GoogleIcon;
                  return (
                    <button key={src.value} disabled={src.soon} onClick={() => update({ leadSource: src.value })}
                      className={`p-3 rounded-lg border text-left text-sm transition-all flex items-center gap-3 ${
                        scenario.leadSource === src.value
                          ? 'border-primary bg-accent text-accent-foreground font-semibold'
                          : 'border-border bg-card text-foreground hover:border-primary/40'
                      } ${src.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <LogoIcon className="w-5 h-5" />
                      </div>
                      <span>{src.label}</span>
                      {src.soon && <Badge className="ml-auto bg-warning text-warning-foreground text-xs">Скоро</Badge>}
                    </button>
                  );
                })}
              </div>
              <SaveButton step={1} />
            </div>
          );

        case 2:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Оберіть ціль оптимізації</h3>
              <p className="text-xs text-muted-foreground">Виберіть ціль кампанії:</p>
              <div className="grid gap-2">
                {CAMPAIGN_GOALS.map(goal => (
                  <button key={goal.value} onClick={() => update({ channel: goal.value })}
                    className={`p-4 rounded-lg border text-left text-sm transition-all flex items-center gap-4 ${
                      scenario.channel === goal.value
                        ? 'border-primary bg-accent text-accent-foreground font-semibold'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    } cursor-pointer`}>
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <goal.Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="font-medium">{goal.label}</span>
                  </button>
                ))}
              </div>

              {/* Lead types sub-selection when "leads" is chosen */}
              {scenario.channel === 'leads' && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Уточніть тип лідгену (можна обрати декілька):</p>
                  <div className="grid gap-2">
                    {LEAD_TYPES.map(lt => (
                      <button key={lt.value} onClick={() => toggleLeadType(lt.value)}
                        className={`p-3 rounded-lg border text-left text-sm transition-all flex items-center gap-3 ${
                          (scenario.leadTypes || []).includes(lt.value)
                            ? 'border-primary bg-accent text-accent-foreground font-semibold'
                            : 'border-border bg-card text-foreground hover:border-primary/40'
                        } cursor-pointer`}>
                        <span className="text-lg">{lt.icon}</span>
                        <span>{lt.label}</span>
                        {(scenario.leadTypes || []).includes(lt.value) && <Check className="w-4 h-4 ml-auto text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              {/* AI Recommendations */}
              {scenario.channel && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-foreground">🤖 AI-рекомендації</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={fetchAiRecommendation}
                      disabled={aiLoading}
                      className="gap-1 text-xs"
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {aiLoading ? 'Генерація...' : 'Згенерувати'}
                    </Button>
                  </div>
                  {aiRecommendation && (
                    <div className="bg-secondary rounded-lg p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {aiRecommendation}
                    </div>
                  )}
                </div>
              )}

              <SaveButton step={2} />
            </div>
          );

        case 3: {
          const inputFields: { key: keyof DecompositionScenario; label: string; suffix: string }[] = [
            { key: 'budget', label: 'FB Ad Бюджет', suffix: '₴' },
            { key: 'cpm', label: 'CPM', suffix: '₴' },
            { key: 'ctr', label: 'Ad CTR', suffix: '%' },
            { key: 'landingConversion', label: 'Конверсія перегляду → заявка', suffix: '%' },
            { key: 'conversionRate', label: 'Конверсія заявки → покупка', suffix: '%' },
            { key: 'averageCheck', label: 'Середній чек', suffix: '₴' },
            { key: 'marginality', label: 'Маржинальність', suffix: '%' },
          ];
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  META AD CALCULATOR
                </h3>
                <Button variant="secondary" size="sm" onClick={fillBenchmarks} className="gap-1 text-xs">
                  <Sparkles className="w-3 h-3" /> Авто
                </Button>
              </div>
              <div className="flex gap-1">
                {([
                  { key: 'bad' as const, label: '😟 Гірший', bg: 'bg-warning text-warning-foreground', inactive: 'bg-secondary text-secondary-foreground' },
                  { key: 'realistic' as const, label: '🔵 Оптимальний', bg: 'bg-primary text-primary-foreground', inactive: 'bg-secondary text-secondary-foreground' },
                  { key: 'positive' as const, label: '🟢 Кращий', bg: 'bg-success text-success-foreground', inactive: 'bg-secondary text-secondary-foreground' },
                ]).map(tab => (
                  <button key={tab.key} onClick={() => setDecompTab(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      decompTab === tab.key ? tab.bg : tab.inactive
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Input fields */}
              <div className="space-y-2">
                {inputFields.map(f => (
                  <div key={f.key} className="flex items-center justify-between gap-3">
                    <label className="text-xs text-muted-foreground font-semibold whitespace-nowrap">{f.label} ({f.suffix})</label>
                    <Input type="number" value={currentDecomp[f.key] || ''}
                      onChange={e => updateDecomp(decompTab, f.key, parseFloat(e.target.value) || 0)}
                      className="bg-secondary border-border text-foreground h-8 text-sm w-28 text-right" />
                  </div>
                ))}
              </div>

              {/* Calculated metrics table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-primary/10 px-3 py-1.5">
                  <span className="text-xs font-bold text-primary">Розраховані метрики</span>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { label: 'Покази', value: metrics.impressions.toLocaleString() },
                    { label: 'Кліки', value: metrics.clicks.toLocaleString() },
                    { label: 'CPC', value: `${metrics.cpc.toFixed(2)} ₴` },
                    { label: 'Всі заявки (ліди)', value: metrics.leads.toLocaleString() },
                    { label: 'Всі продажі', value: metrics.sales.toString() },
                    { label: 'CPA', value: `${metrics.cpa.toFixed(2)} ₴` },
                    { label: 'Чистий прибуток з 1 продажу', value: `${metrics.profitPerSale.toLocaleString()} ₴` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results highlight */}
              <div className="bg-accent rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase">Підсумок</h4>
                {[
                  { label: 'Прибуток', value: `${metrics.totalProfit.toLocaleString()} ₴`, color: metrics.totalProfit > 0 ? 'text-success' : 'text-destructive' },
                  { label: 'ROAS', value: `${metrics.roas.toFixed(2)}%`, color: metrics.roas > 100 ? 'text-success' : 'text-destructive' },
                  { label: 'Чистий дохід', value: `${metrics.netIncome.toLocaleString()} ₴`, color: metrics.netIncome > 0 ? 'text-success' : 'text-destructive' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-foreground">{row.label}</span>
                    <span className={`font-extrabold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <SaveButton step={3} />
            </div>
          );
        }

        case 4:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Куди надходять ліди?</h3>
              {isBranching && activeLeadType && (
                <Badge variant="secondary" className="text-xs">{LEAD_TYPES.find(l => l.value === activeLeadType)?.icon} {LEAD_TYPES.find(l => l.value === activeLeadType)?.label}</Badge>
              )}
              <div className="grid gap-2">
                {LEAD_DESTINATIONS.map(d => (
                  <button key={d} onClick={() => toggleLeadDest(d)}
                    className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
                      currentLeadDestinations.includes(d)
                        ? 'border-primary bg-accent text-accent-foreground font-semibold'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
              <SaveButton step={4} />
            </div>
          );

        case 5:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Спосіб інтеграції</h3>
              {isBranching && activeLeadType && (
                <Badge variant="secondary" className="text-xs">{LEAD_TYPES.find(l => l.value === activeLeadType)?.icon} {LEAD_TYPES.find(l => l.value === activeLeadType)?.label}</Badge>
              )}
              <div className="grid gap-2">
                {INTEGRATIONS.map(i => (
                  <button key={i} onClick={() => {
                    if (isBranching && activeLeadType) {
                      updateBranch({ integrationMethod: i });
                    } else {
                      update({ integrationMethod: i });
                    }
                  }}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      currentIntegrationMethod === i
                        ? 'border-primary bg-accent text-accent-foreground font-semibold'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    }`}>
                    {i}
                  </button>
                ))}
              </div>
              <SaveButton step={5} />
            </div>
          );

        case 6: {
          const charCount = (currentCompanyDescription || '').length;
          const canProcess = charCount >= 50;
          const salesItems = [
            { icon: '📞', title: 'Скрипт дзвінка', type: 'call-script' },
            { icon: '💬', title: 'Скрипт переписки', type: 'chat-script' },
            { icon: '🔄', title: 'Фоллоу-ап (Follow-up)', type: 'follow-up' },
          ];
          return (
            <div className="space-y-4 pb-16 relative">
              <h3 className="text-base font-bold text-foreground">Продажі</h3>
              {isBranching && activeLeadType && (
                <Badge variant="secondary" className="text-xs">{LEAD_TYPES.find(l => l.value === activeLeadType)?.icon} {LEAD_TYPES.find(l => l.value === activeLeadType)?.label}</Badge>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Про компанію</label>
                <Textarea value={currentCompanyDescription}
                  onChange={e => {
                    if (isBranching && activeLeadType) {
                      updateBranch({ companyDescription: e.target.value });
                    } else {
                      update({ companyDescription: e.target.value });
                    }
                    setSalesProcessed(false);
                  }}
                  placeholder="Опишіть компанію, продукт, ЦА... (мінімум 50 символів)"
                  rows={4} className="bg-secondary border-border text-foreground text-sm placeholder:text-muted-foreground resize-none" />
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${charCount >= 50 ? 'text-success' : 'text-muted-foreground'}`}>
                    {charCount}/50 символів
                  </span>
                  {canProcess && !salesProcessed && (
                    <Button size="sm" onClick={() => setSalesProcessed(true)} className="gap-1.5 text-xs bg-primary text-primary-foreground">
                      <Sparkles className="w-3 h-3" /> Обробити
                    </Button>
                  )}
                </div>
              </div>
              {salesProcessed && (
                <div className="space-y-3">
                  {salesItems.map(s => (
                    <div key={s.type} className="bg-secondary rounded-lg p-3 flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm">{s.icon} {s.title}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => fetchSalesRecommendation(s.type, `${s.icon} ${s.title}`)}
                      >
                        <Sparkles className="w-3 h-3" /> Рекомендації
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <SaveButton step={6} sticky disabled={!canProcess || !salesProcessed} />
            </div>
          );
        }

        case 7: {
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Retention — база</h3>
              {isBranching && activeLeadType && (
                <Badge variant="secondary" className="text-xs">{LEAD_TYPES.find(l => l.value === activeLeadType)?.icon} {LEAD_TYPES.find(l => l.value === activeLeadType)?.label}</Badge>
              )}
              
              {/* Email - active */}
              <div>
                <label className="text-xs text-muted-foreground mb-0.5 block">📧 Email-база</label>
                <Input type="number" value={currentRetention.emailCount || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    if (isBranching && activeLeadType) {
                      updateBranch({ retention: { ...currentRetention, emailCount: val } });
                    } else {
                      update({ retention: { ...scenario.retention, emailCount: val } });
                    }
                  }}
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

              {currentRetention.emailCount > 0 && (
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
              <SaveButton step={7} />
            </div>
          );
        }

        case 8: {
          const decompSet = isBranching && activeLeadType ? getBranch().decomposition : scenario.decomposition;
          const real = calcMetrics(decompSet.realistic);
          const bad = calcMetrics(decompSet.bad);
          const pos = calcMetrics(decompSet.positive);
          const channelLabel = CAMPAIGN_GOALS.find(c => c.value === scenario.channel)?.label || scenario.channel || '—';
          const sourceLabel = LEAD_SOURCES.find(s => s.value === scenario.leadSource)?.label || scenario.leadSource || '—';
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
                    <span className="text-muted-foreground">Джерело:</span>
                    <p className="font-semibold text-foreground">{sourceLabel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ціль:</span>
                    <p className="font-semibold text-foreground">{channelLabel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Бюджет:</span>
                    <p className="font-semibold text-foreground">{decompSet.realistic.budget.toLocaleString()} ₴</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ліди йдуть у:</span>
                    <p className="font-semibold text-foreground">{currentLeadDestinations.join(', ') || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Інтеграція:</span>
                    <p className="font-semibold text-foreground">{currentIntegrationMethod || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email-база:</span>
                    <p className="font-semibold text-foreground">{currentRetention.emailCount || 0} контактів</p>
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
                        <span className="text-muted-foreground">Чистий дохід: </span>
                        <b className={s.m.netIncome >= 0 ? 'text-success' : 'text-destructive'}>{s.m.netIncome.toLocaleString()} ₴</b>
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
                  {currentRetention.emailCount > 0 && <li>📬 Запустіть welcome-серію з 3-5 листів для нових контактів</li>}
                  {real.leads > 50 && <li>🤖 Автоматизуйте обробку лідів через {currentIntegrationMethod || 'CRM-інтеграцію'}</li>}
                  <li>📊 Аналізуйте результати щотижня та коригуйте бюджет</li>
                </ul>
              </div>

              {/* AI Conclusion */}
              <div className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-foreground text-sm">🤖 AI Висновок</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchAiConclusion}
                    disabled={aiConclusionLoading}
                    className="gap-1 text-xs"
                  >
                    {aiConclusionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {aiConclusionText ? 'Показати' : 'Згенерувати'}
                  </Button>
                </div>
                {aiConclusionLoading && !aiConclusionText && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs py-4 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Генерую висновок...</span>
                  </div>
                )}
                {aiConclusionText && (
                  <div className="prose prose-sm max-w-none text-foreground text-xs leading-relaxed max-h-80 overflow-y-auto">
                    <ReactMarkdown>{aiConclusionText}</ReactMarkdown>
                  </div>
                )}
                {aiConclusionLoading && aiConclusionText && (
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Друкую...</span>
                  </div>
                )}
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
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const delta = -e.deltaY * 0.0015;
              setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(3))));
            }
          }}
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, hsl(0 0% 80%) 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${canvasOffset.x % (24 * zoom)}px ${canvasOffset.y % (24 * zoom)}px`,
          }} />

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 bg-card border border-border rounded-xl shadow-lg p-1">
            <button
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.1).toFixed(2)))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Збільшити"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setZoom(1); setCanvasOffset({ x: 0, y: 0 }); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-[10px] font-mono font-semibold"
              title="Скинути масштаб"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.1).toFixed(2)))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Зменшити"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={canvasRef}
            className="relative min-h-full flex items-center justify-center select-none"
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <div className="relative" id="flow-container">
              {/* Check if we need branching */}
              {(() => {
                const leadTypes = scenario.leadTypes || [];
                const shouldBranch = scenario.channel === 'leads' && leadTypes.length > 1 && savedSteps.has('2');
                const BRANCH_STEPS = STEPS.slice(3); // steps 3-8

                const getSubtitleForStep = (i: number, branchLeadType?: string) => {
                  switch (i) {
                    case 0: return scenario.niche || '';
                    case 1: return LEAD_SOURCES.find(s => s.value === scenario.leadSource)?.label || '';
                    case 2: {
                      const label = CAMPAIGN_GOALS.find(c => c.value === scenario.channel)?.label || '';
                      const ltLabels = leadTypes.map(lt => LEAD_TYPES.find(l => l.value === lt)?.label).filter(Boolean).join(', ');
                      const base = seoEnabled ? (label ? `${label} + SEO` : 'SEO') : label;
                      return ltLabels ? `${base}\n${ltLabels}` : base;
                    }
                    case 3: {
                      const branch = branchLeadType && shouldBranch ? scenario.branchData?.[branchLeadType] : null;
                      const decompSet = branch ? branch.decomposition : scenario.decomposition;
                      const bad = calcMetrics(decompSet.bad);
                      const real = calcMetrics(decompSet.realistic);
                      const pos = calcMetrics(decompSet.positive);
                      if (real.revenue <= 0 && bad.revenue <= 0 && pos.revenue <= 0) return '';
                      return [
                        `🟡 ${bad.leads} лідів → ${bad.revenue.toLocaleString()}₴ → ${bad.romi}%`,
                        `🔵 ${real.leads} лідів → ${real.revenue.toLocaleString()}₴ → ${real.romi}%`,
                        `🟢 ${pos.leads} лідів → ${pos.revenue.toLocaleString()}₴ → ${pos.romi}%`,
                      ].join('\n');
                    }
                    case 4: {
                      const branch = branchLeadType && shouldBranch ? scenario.branchData?.[branchLeadType] : null;
                      const dests = branch ? branch.leadDestinations : scenario.leadDestinations;
                      return dests.length > 0 ? dests.join('\n') : '';
                    }
                    case 5: {
                      const branch = branchLeadType && shouldBranch ? scenario.branchData?.[branchLeadType] : null;
                      return (branch ? branch.integrationMethod : scenario.integrationMethod) || '';
                    }
                    default: return '';
                  }
                };

                const renderNode = (stepIdx: number, branchLeadType?: string, isLastInRow = false) => {
                  const s = STEPS[stepIdx];
                  const subtitle = (isStepCompleted(stepIdx, branchLeadType) || (branchLeadType ? isStepCompletedForBranch(scenario, stepIdx, branchLeadType) : isStepCompletedStatic(scenario, stepIdx))) 
                    ? getSubtitleForStep(stepIdx, branchLeadType) : '';
                  
                  // Check if decomposition is completed for this branch to show AI hint
                  const showAiHint = stepIdx === 3 && (branchLeadType ? isStepCompletedForBranch(scenario, 3, branchLeadType) : isStepCompletedStatic(scenario, 3));

                  return (
                    <div key={`${stepIdx}-${branchLeadType || 'main'}`} className="flex items-start" data-flow-node data-step-index={stepIdx}>
                      <div className="relative">
                        <FlowNode
                          icon={s.icon}
                          title={branchLeadType && stepIdx === 3
                            ? `${s.title}\n${LEAD_TYPES.find(l => l.value === branchLeadType)?.icon || ''} ${LEAD_TYPES.find(l => l.value === branchLeadType)?.label || ''}`
                            : s.title}
                          index={stepIdx}
                          isActive={activeStep === stepIdx && (!shouldBranch || stepIdx < 3 || activeLeadType === branchLeadType)}
                          isCompleted={isStepCompleted(stepIdx, branchLeadType)}
                          isLast={isLastInRow}
                          isLocked={!isStepUnlocked(stepIdx, branchLeadType)}
                          subtitle={subtitle}
                          onClick={() => {
                            if (!wasDragged.current && isStepUnlocked(stepIdx, branchLeadType)) {
                              if (branchLeadType) setActiveLeadType(branchLeadType);
                              setActiveStep(activeStep === stepIdx && activeLeadType === branchLeadType ? null : stepIdx);
                            }
                          }}
                        />
                        {showAiHint && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchCampaignTips(branchLeadType);
                            }}
                            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm shadow-lg hover:scale-110 transition-transform z-10 border-2 border-white"
                            title="AI підказка по кампаніях"
                            style={{ animation: 'pulse 2s ease-in-out infinite' }}
                          >
                            💡
                          </button>
                        )}
                      </div>
                    </div>
                  );
                };

                if (!shouldBranch) {
                  // Single row — original behavior
                  return (
                    <>
                      <div className="flex items-center gap-0 px-12 py-8">
                        <div className="flex items-center pr-6">
                          <ClientInfoCard />
                          <div className="w-10 h-px border-t-2 border-dashed border-border ml-2" />
                        </div>
                        {(() => {
                          const visible = STEPS.map((_, i) => i).filter(i => isStepUnlocked(i));
                          return visible.map((i, idx) => renderNode(i, undefined, idx === visible.length - 1));
                        })()}
                      </div>
                      {scenario.retention.emailCount > 0 && savedSteps.has('7') && <RetentionArrow />}
                    </>
                  );
                }

                // Make.com-style branching layout
                const branchRowHeight = 340; // height per branch row (room for info card + subtitle pills)
                const nodeCenterOffset = 110; // approx vertical center of info card

                return (
                  <div className="px-12 py-8 flex items-start">
                    {/* Client info card — vertically centered with shared steps */}
                    <div className="flex items-center flex-shrink-0 pr-6" style={{ marginTop: `${((leadTypes.length - 1) * branchRowHeight) / 2}px` }}>
                      <ClientInfoCard />
                      <div className="w-10 h-px border-t-2 border-dashed border-border ml-2" />
                    </div>
                    {/* Shared steps (0, 1, 2) — vertically centered, last node without connector */}
                    <div className="flex items-start gap-0 flex-shrink-0" style={{ marginTop: `${((leadTypes.length - 1) * branchRowHeight) / 2}px` }}>
                      {(() => {
                        const visible = [0, 1, 2].filter(i => isStepUnlocked(i));
                        return visible.map((i, idx) => renderNode(i, undefined, idx === visible.length - 1));
                      })()}
                    </div>

                    {/* Branch lines + branch rows */}
                    <div className="relative flex-shrink-0">
                      {/* SVG connector lines from router to each branch */}
                      <svg 
                        className="absolute left-0 top-0 pointer-events-none overflow-visible" 
                        width="80" 
                        height={leadTypes.length * branchRowHeight}
                        viewBox={`0 0 80 ${leadTypes.length * branchRowHeight}`}
                      >
                        {leadTypes.map((_, brIdx) => {
                          const centerY = ((leadTypes.length - 1) * branchRowHeight) / 2 + nodeCenterOffset;
                          const branchY = brIdx * branchRowHeight + nodeCenterOffset;
                          return (
                            <g key={brIdx}>
                              <path
                                d={`M 0,${centerY} C 30,${centerY} 30,${branchY} 60,${branchY}`}
                                stroke="hsl(var(--primary))"
                                strokeWidth="2"
                                strokeDasharray="6 3"
                                fill="none"
                              />
                              <polygon
                                points={`60,${branchY - 4} 72,${branchY} 60,${branchY + 4}`}
                                fill="hsl(var(--primary))"
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Branch rows */}
                      <div className="flex flex-col" style={{ marginLeft: '80px' }}>
                        {leadTypes.map((lt, brIdx) => (
                          <div key={lt} className="flex items-start gap-0" style={{ height: `${branchRowHeight}px` }}>
                            {(() => {
                              const visible = BRANCH_STEPS.map((_, bi) => bi).filter(bi => isStepUnlocked(bi + 3, lt));
                              return visible.map((bi, idx) => renderNode(bi + 3, lt, idx === visible.length - 1));
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
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
              <img src={adsSchoolLogo} alt="Ads School" className="w-8 h-8 rounded-full object-cover" />
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

      {/* AI Campaign Tips dialog */}
      <Dialog open={aiTipsOpen} onOpenChange={setAiTipsOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm">💡</div>
              AI рекомендації по кампаніях
              {aiTipsBranchType && (
                <Badge variant="secondary" className="text-xs ml-2">
                  {LEAD_TYPES.find(l => l.value === aiTipsBranchType)?.icon} {LEAD_TYPES.find(l => l.value === aiTipsBranchType)?.label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pt-2">
            {aiTipsLoading && !aiTipsText && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Генерую рекомендації...</span>
              </div>
            )}
            {aiTipsText && (
              <div className="prose prose-sm max-w-none text-foreground">
                <ReactMarkdown>{aiTipsText}</ReactMarkdown>
              </div>
            )}
            {aiTipsLoading && aiTipsText && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Друкую...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Recommendations dialog */}
      <Dialog open={salesRecOpen} onOpenChange={setSalesRecOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {salesRecTitle || 'Рекомендації'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pt-2">
            {salesRecLoading && !salesRecText && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Генерую рекомендації...</span>
              </div>
            )}
            {salesRecText && (
              <div className="prose prose-sm max-w-none text-foreground">
                <ReactMarkdown>{salesRecText}</ReactMarkdown>
              </div>
            )}
            {salesRecLoading && salesRecText && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Друкую...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScenarioBuilder;
