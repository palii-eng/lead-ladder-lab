import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import { useScenarios, Scenario, DecompositionScenario, DecompositionSet, createDefaultDecompSet, createDefaultBranchData, BranchData, ClientBrief } from '@/context/ScenariosContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import FlowNode from '@/components/FlowNode';
import SimulationIntro from '@/components/SimulationIntro';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Download, Info, Loader2, Megaphone, MousePointerClick, MessageCircle, Filter, Users, ShoppingBag, Play, Save, Sparkles, X, Zap, Plus, Minus, Maximize2, Briefcase, Heart, Store, Home, GraduationCap, Instagram, Stethoscope, Dumbbell, BookOpen, UtensilsCrossed, Scale, Scissors, Sparkle, Cloud, Wrench, HeartPulse, Plane, HardHat, FileText, DollarSign, SkipForward, AlertTriangle, Database, User, Send, Copy, Bitcoin, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { MetaIcon, TikTokIcon, GoogleIcon } from '@/components/BrandIcons';
import { VideoBadge } from '@/components/VideoBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import adsSchoolLogo from '@/assets/ads-school-logo.png';
import { getBriefForClient, BriefField } from '@/data/clientBriefs';
import { resolveClientPhoto } from '@/data/clientPhotos';
import { useAuth } from '@/context/AuthContext';

// Extracts the client's realistic starting ad budget (in USD) straight from
// their task text, instead of always defaulting to a fixed placeholder.
// Handles UAH figures like "7к/міс" or "12-15к/міс" (converted at an
// approximate rate), and explicit USD figures like "$50-70k/міс". Falls
// back to $2000 for a typical small client, or $5000 when the text signals
// a larger business (chain/network/big turnover) with no explicit figure.
const UAH_TO_USD_RATE = 41;
const estimateClientBudgetUsd = (task: string): number => {
  if (!task) return 2000;

  // Explicit USD: "$50-70k/міс", "$5000", "$2 000"
  const usdRange = task.match(/\$\s*(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*k/i);
  if (usdRange) {
    const lo = parseInt(usdRange[1].replace(/\s/g, ''), 10) * 1000;
    const hi = parseInt(usdRange[2].replace(/\s/g, ''), 10) * 1000;
    return Math.round((lo + hi) / 2);
  }
  const usdK = task.match(/\$\s*(\d[\d\s]*)\s*k\b/i);
  if (usdK) return parseInt(usdK[1].replace(/\s/g, ''), 10) * 1000;
  const usdPlain = task.match(/\$\s*(\d[\d\s]{2,7})(?!\s*k)/i);
  if (usdPlain) {
    const val = parseInt(usdPlain[1].replace(/\s/g, ''), 10);
    if (val > 0) return val;
  }

  // UAH thousands-per-month: "7к/міс", "12-15к/міс", "10-12к"
  const uahRange = task.match(/(\d+)\s*-\s*(\d+)\s*к(?:\/міс)?/i);
  if (uahRange) {
    const lo = parseInt(uahRange[1], 10) * 1000;
    const hi = parseInt(uahRange[2], 10) * 1000;
    return Math.max(200, Math.round(((lo + hi) / 2) / UAH_TO_USD_RATE));
  }
  const uahSingle = task.match(/(\d+)\s*к(?:\/міс)?/i);
  if (uahSingle) {
    const uah = parseInt(uahSingle[1], 10) * 1000;
    return Math.max(200, Math.round(uah / UAH_TO_USD_RATE));
  }

  // Plain "грн" figures: "бюджет 1500 грн", "2000 грн/міс"
  const grnMatch = task.match(/бюджет[^.]{0,20}?(\d[\d\s]{2,7})\s*грн/i) || task.match(/(\d[\d\s]{2,7})\s*грн\/міс/i);
  if (grnMatch) {
    const uah = parseInt(grnMatch[1].replace(/\s/g, ''), 10);
    if (uah > 0) return Math.max(50, Math.round(uah / UAH_TO_USD_RATE));
  }

  // No explicit figure mentioned — look for signals of a bigger business.
  const bigBusinessSignals = /мереж[аиі]|філі[ай]|\d+\s*точ(ок|ки)|мільйон|\$\d+\s*[MM]|оборот|франшиз/i;
  return bigBusinessSignals.test(task) ? 5000 : 2000;
};

// "Launching" the project is an interactive weekly simulation, not a single
// dice roll: each week presents a metrics snapshot (sometimes with a
// problem, sometimes calm), the marketer picks an action, and the outcome
// depends on whether the action actually fixes the underlying issue.
type LaunchProblemType = 'cpm_high' | 'ctr_low' | 'freq_high';
type LaunchActionKey = 'continue' | 'change_creo' | 'new_audience' | 'restart_objective';

interface LaunchProblem {
  type: LaunchProblemType;
  cpl: 'high' | 'normal';
  ctr: 'low' | 'normal';
  cpm: 'high' | 'normal';
  freq: 'high' | 'normal';
  cplPct?: number;
  cpmPct?: number;
}

const LAUNCH_PROBLEM_TEMPLATES: Omit<LaunchProblem, 'cplPct' | 'cpmPct'>[] = [
  { type: 'cpm_high', cpl: 'high', ctr: 'normal', cpm: 'high', freq: 'normal' },
  { type: 'ctr_low', cpl: 'high', ctr: 'low', cpm: 'normal', freq: 'normal' },
  { type: 'freq_high', cpl: 'high', ctr: 'normal', cpm: 'normal', freq: 'high' },
];

const randomInRange = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));

// Builds a fresh problem instance with newly-rolled percentages each time —
// the same problem type never shows the exact same numbers twice.
const buildLaunchProblem = (type: LaunchProblemType): LaunchProblem => {
  const template = LAUNCH_PROBLEM_TEMPLATES.find(p => p.type === type)!;
  return {
    ...template,
    cplPct: template.cpl === 'high' ? randomInRange(12, 40) : undefined,
    cpmPct: template.cpm === 'high' ? randomInRange(15, 45) : undefined,
  };
};

const LAUNCH_PROBLEM_TYPES: LaunchProblemType[] = ['cpm_high', 'ctr_low', 'freq_high'];

const LAUNCH_ACTIONS: { key: LaunchActionKey; label: string }[] = [
  { key: 'continue', label: 'Продовжити без змін' },
  { key: 'change_creo', label: 'Змінити крео' },
  { key: 'new_audience', label: 'Створити нову аудиторію' },
  { key: 'restart_objective', label: 'Перезапустити на нову ціль' },
];

// Which action(s) actually address each problem type.
const LAUNCH_CORRECT_FIX: Record<LaunchProblemType, LaunchActionKey[]> = {
  cpm_high: ['new_audience'],
  ctr_low: ['change_creo'],
  freq_high: ['change_creo', 'new_audience'],
};

const LAUNCH_ACTION_SUCCESS_TEXT: Record<LaunchActionKey, string> = {
  continue: 'Ви вирішили не втручатися — на щастя, ситуація сама вирівнялась.',
  change_creo: 'Ви оновили крео — CTR почав зростати, метрики вирівнялись.',
  new_audience: 'Ви створили нову аудиторію — CPM пішов униз, покази стали дешевшими.',
  restart_objective: 'Перезапуск кампанії на нову ціль допоміг — алгоритм знайшов кращу аудиторію.',
};

// What the client actually notices/reports (they only see their own lead
// cost going up, not the ad account's internal metrics).
const launchClientLine = (p: LaunchProblem): string =>
  p.cpl === 'high' ? `Ліди дорожчі ніж очікується, приблизно на ${p.cplPct}%.` : 'Ліди йдуть за прогнозом.';

// What the marketer sees in their own ad account dashboard — the technical
// signals that actually explain why leads got pricier.
const launchSystemMetricLines = (p: LaunchProblem): string[] => [
  p.ctr === 'low' ? 'CTR низький' : 'CTR в нормі',
  p.cpm === 'high' ? `CPM почав дорожчати, приблизно на ${p.cpmPct}%` : 'CPM в нормі',
  p.freq === 'high' ? 'Висока частотність показів' : 'Частота показів в нормі',
];

const STEPS = [
  { title: 'Вибір ніші', icon: '🎯' },
  { title: 'Джерело трафіку', icon: '📡' },
  { title: 'Ціль оптимізації', icon: '🚀' },
  { title: 'Деталізація', icon: '🧩' },
  { title: 'Декомпозиція', icon: '📊' },
  { title: 'Куди йдуть ліди', icon: '📥' },
  { title: 'Інтеграція', icon: '🔗' },
  { title: 'Продажі', icon: '💰' },
  { title: 'Retention', icon: '🔄' },
  { title: 'Результат', icon: '🏆' },
];

// Red/grey flag metadata for client-brief risk hints. Red = serious structural
// gaps or outright scam signals; grey = borderline/gray-zone niches that need
// extra caution but aren't disqualifying on their own.
const RED_FLAG_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  no_sales_team: { label: 'Немає відділу продажів', Icon: Users },
  no_crm: { label: 'Немає CRM-системи', Icon: Database },
  solo_owner: { label: 'Власник — єдина людина в бізнесі (ремісник)', Icon: User },
  scam: { label: 'Схоже на шахрайство / скам', Icon: AlertTriangle },
};
const GREY_FLAG_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  telegram_ads: { label: 'Реклама веде в Telegram, не нативно для Meta/TikTok', Icon: Send },
  counterfeit: { label: 'Товар — репліка/копія бренду, не оригінал', Icon: Copy },
  crypto: { label: 'Крипто-тематика', Icon: Bitcoin },
  questionable_infobiz: { label: 'Сумнівний інфобізнес / нереалістичні обіцянки', Icon: TrendingUp },
  low_margin: { label: 'Низькомаржинальна ніша — складно окупити рекламу', Icon: TrendingDown },
};

const ClientFlagsPanel: React.FC<{ redFlags?: string[]; greyFlags?: string[] }> = ({ redFlags, greyFlags }) => {
  const reds = (redFlags || []).map(k => RED_FLAG_META[k]).filter(Boolean);
  const greys = (greyFlags || []).map(k => GREY_FLAG_META[k]).filter(Boolean);
  if (reds.length === 0 && greys.length === 0) return null;
  return (
    <div className="space-y-3 mt-3">
      {reds.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(0 65% 45%)' }}>
            🚩 Ред флаги
          </p>
          {reds.map(({ label, Icon }, i) => (
            <div
              key={`red-${i}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 border"
              style={{ background: 'hsl(0 75% 96%)', borderColor: 'hsl(0 75% 85%)' }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: 'hsl(0 75% 45%)' }} />
              <span className="text-xs font-semibold" style={{ color: 'hsl(0 65% 35%)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
      {greys.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(220 10% 45%)' }}>
            🏳️ Сірі флаги
          </p>
          {greys.map(({ label, Icon }, i) => (
            <div
              key={`grey-${i}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 border"
              style={{ background: 'hsl(220 10% 95%)', borderColor: 'hsl(220 10% 82%)' }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: 'hsl(220 10% 40%)' }} />
              <span className="text-xs font-semibold" style={{ color: 'hsl(220 10% 30%)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
    { title: 'Деталізація формату воронки', url: 'https://ads-school.online/' },
  ],
  4: [
    { title: 'Як рахувати декомпозицію', url: 'https://ads-school.online/' },
    { title: 'Бенчмарки по нішах', url: 'https://ads-school.online/' },
  ],
  5: [
    { title: 'Куди направляти ліди', url: 'https://www.youtube.com/watch?v=d0B14sPmr8k' },
  ],
  7: [
    { title: 'Скрипти продажів', url: 'https://ads-school.online/' },
    { title: 'Follow-up стратегії', url: 'https://ads-school.online/' },
  ],
  8: [
    { title: 'Email-маркетинг для retention', url: 'https://ads-school.online/' },
  ],
  9: [
    { title: 'Аналіз результатів', url: 'https://ads-school.online/' },
  ],
};

const INFOBIZ_DECOMP_VIDEO = { title: 'Декомпозиція в інфобізі — мануал', url: 'https://youtu.be/HehGc_UQq_U' };

const REQUIRED_MATERIALS: { title: string; url: string }[] = [
  { title: 'Підготовка, цілі, методи — як бути хорошим маркетологом', url: 'https://youtu.be/atDbG51Z75o' },
  { title: 'Система маркетингу та маркетинговий відділ', url: 'https://youtu.be/40s2fjtXlIM' },
  { title: 'Шлях клієнта', url: 'https://youtu.be/XjflWtggD0w' },
  { title: 'Типова маркетингова воронка', url: 'https://youtu.be/9KPgRWEJm4Y' },
  { title: 'Складові маркетингової воронки', url: 'https://youtu.be/_PTpQY22XuQ' },
];

const TRAFFIC_STRATEGY_MATERIALS: { title: string; url: string }[] = [
  { title: 'Від чого залежить вибір воронки для бізнес-проекту', url: 'https://youtu.be/I_8hZTgb1Is' },
  { title: 'Типи трафіка: TOF, MOF, BOF', url: 'https://youtu.be/7AAmpv9ibnc' },
  { title: 'Підготовка до створення трафік-стратегії', url: 'https://youtu.be/qW3AaW-Pwx4' },
  { title: 'Створення стратегії', url: 'https://youtu.be/7DqzeEAiYoU' },
  { title: 'Комунікаційна стратегія', url: 'https://youtu.be/8QQ6t-4nc1A' },
];

const FORMAT_VIDEOS: Record<string, { title: string; url: string }[]> = {
  'Міні-курс': [
    { title: 'Міні-курс — розбір воронки', url: 'https://youtu.be/MEI0sIJ0No8' },
  ],
  'Вебінарна воронка': [
    { title: 'Вебінарна воронка — стратегія', url: 'https://youtu.be/Uq34CUskaGo' },
    { title: 'Вебінарна воронка — технічка', url: 'https://youtu.be/koF-yfdJyYU' },
  ],
  'Особистий бренд (прогрів та продаж через Instagram)': [
    { title: 'Особистий бренд в Instagram — воронка', url: 'https://www.youtube.com/watch?v=97EaUJmeehk' },
  ],
  'Продаж та прогрів через Telegram-бот': [
    { title: 'Воронка через Telegram-бот', url: 'https://youtu.be/NnjSjpG3N4Y' },
  ],
};
const LEAD_SOURCES: { value: string; label: string; LogoComponent: 'meta' | 'tiktok'; soon?: boolean }[] = [
  { value: 'meta', label: 'Meta реклама', LogoComponent: 'meta' as const },
  { value: 'tiktok', label: 'TikTok реклама', LogoComponent: 'tiktok' as const },
];

const CAMPAIGN_GOALS_META = [
  { value: 'awareness', label: 'Упізнаваність', desc: 'Покажіть рекламу максимальній кількості людей із вашої аудиторії', Icon: Megaphone },
  { value: 'traffic', label: 'Трафік', desc: 'Спрямуйте людей на сайт, у застосунок, Messenger, WhatsApp або Instagram-профіль', Icon: MousePointerClick },
  { value: 'engagement', label: 'Взаємодія', desc: 'Більше повідомлень, перегляди відео, реакції, коментарі та підписки', Icon: MessageCircle },
  { value: 'leads', label: 'Ліди', desc: 'Збирайте контакти через лід-форми, дзвінки або повідомлення', Icon: Filter },

  { value: 'sales', label: 'Продажі', desc: 'Знаходьте людей, які з найбільшою ймовірністю куплять ваш продукт', Icon: ShoppingBag },
];

// Real TikTok Ads Manager objective categories (2026): Awareness (Reach only),
// Consideration (Traffic, Video Views, Community Interaction, Lead Generation, App Promotion),
// Conversion (Website Conversions / Product Sales). Mapped onto the same top-level
// value keys as Meta so downstream scenario.channel logic stays compatible —
// only the labels/descriptions/sub-goals differ per platform.
const CAMPAIGN_GOALS_TIKTOK = [
  { value: 'awareness', label: 'Охоплення', desc: 'Покажіть рекламу максимальній кількості людей із вашої аудиторії (об’єднана ціль Reach)', Icon: Megaphone },
  { value: 'traffic', label: 'Трафік', desc: 'Спрямуйте людей на сайт, у застосунок або на TikTok Instant Page', Icon: MousePointerClick },
  { value: 'engagement', label: 'Взаємодія', desc: 'Підписники, відвідування профілю, перегляди відео та повідомлення в директ', Icon: MessageCircle },
  { value: 'leads', label: 'Ліди', desc: 'Збирайте контакти через миттєву форму, форму на сайті або директ', Icon: Filter },

  { value: 'sales', label: 'Продажі', desc: 'Конверсії на сайті або продажі товарів через TikTok Shop і каталог', Icon: ShoppingBag },
];

const LEAD_TYPES_META = [
  { value: 'leadform', label: 'Лідформи', icon: '📋' },
  { value: 'quiz', label: 'Квізи', icon: '❓' },
  { value: 'landing', label: 'Лендінг', icon: '🌐' },
];

// TikTok lead-gen sub-types: Instant Form (native on-platform form),
// a form hosted on your own website, or collecting leads via Direct Message.
const LEAD_TYPES_TIKTOK = [
  { value: 'leadform', label: 'Миттєва форма (Instant Form)', icon: '📋' },
  { value: 'landing', label: 'Форма на сайті', icon: '🌐' },
  { value: 'dm', label: 'Повідомлення в директ', icon: '💬' },
];

const AWARENESS_TYPES_META = [
  { value: 'reach', label: 'Максимізувати охоплення реклами', icon: '📡' },
  { value: 'impressions', label: 'Максимізувати кількість показів', icon: '👁️' },
  { value: 'ad_recall', label: 'Максимізувати запам’ятовуваність реклами', icon: '🧠' },
  { value: 'thruplay', label: 'Максимізувати перегляди ThruPlay', icon: '▶️' },
  { value: 'continuous_2s', label: 'Максимізувати безперервні перегляди тривалістю 2 секунди', icon: '⏱️' },
];

// TikTok's Awareness category has just one real objective — Reach — with a
// frequency-cap buying option (Reach & Frequency) rather than Meta-style
// sub-optimization events.
const AWARENESS_TYPES_TIKTOK = [
  { value: 'reach', label: 'Максимізувати охоплення (Reach)', icon: '📡' },
  { value: 'reach_frequency', label: 'Reach & Frequency (контроль частоти показів)', icon: '🔁' },
];

const TRAFFIC_TYPES_META = [
  { value: 'website', label: 'Вебсайт', desc: 'Спрямувати трафік на ваш сайт.', icon: '🌐' },
  { value: 'app', label: 'Застосунок', desc: 'Спрямувати трафік у ваш застосунок.', icon: '📱' },
  { value: 'messages', label: 'Повідомлення', desc: 'Спрямувати трафік у Messenger, Instagram та WhatsApp.', icon: '💬' },
  { value: 'ig_fb', label: 'Instagram або Facebook', desc: 'Спрямувати трафік у профіль Instagram, на Facebook-сторінку або обидва.', icon: '📸' },
  { value: 'calls', label: 'Дзвінки', desc: 'Залучити людей до дзвінків на ваш номер, у Messenger або WhatsApp.', icon: '📞' },
  { value: 'website_calls', label: 'Вебсайт і дзвінки', desc: 'Спрямувати трафік на ваш сайт і отримати дзвінки від клієнтів.', icon: '🔗' },
];

// TikTok Traffic supports website/app clicks and Landing Page View (LPV)
// optimization on TikTok's own Instant Page — there's no Messenger/WhatsApp
// equivalent since TikTok doesn't own cross-app messaging destinations.
const TRAFFIC_TYPES_TIKTOK = [
  { value: 'website', label: 'Вебсайт', desc: 'Спрямувати трафік на ваш сайт.', icon: '🌐' },
  { value: 'app', label: 'Застосунок', desc: 'Спрямувати трафік у ваш застосунок.', icon: '📱' },
  { value: 'ig_fb', label: 'TikTok Instant Page', desc: 'Швидка вбудована сторінка на TikTok замість зовнішнього сайту.', icon: '📸' },
];

const ENGAGEMENT_TYPES_META = [
  { value: 'messages', label: 'Messenger, Instagram та WhatsApp', desc: 'Більше повідомлень у месенджерах.', icon: '💬' },
  { value: 'video_views', label: 'Перегляди відео', desc: 'Максимум переглядів вашого відео.', icon: '🎬' },
  { value: 'interactions', label: 'Взаємодії', desc: 'Реакції, коментарі, поширення та збереження.', icon: '❤️' },
  { value: 'conversions', label: 'Конверсії', desc: 'Цільові дії на сайті чи в застосунку.', icon: '🎯' },
  { value: 'calls', label: 'Дзвінки', desc: 'Дзвінки на ваш номер.', icon: '📞' },
];

// TikTok's Community Interaction objective: grow followers/profile visits,
// video views, and Direct Messages — there's no calls or cross-app messaging.
const ENGAGEMENT_TYPES_TIKTOK = [
  { value: 'messages', label: 'Повідомлення в директ', desc: 'Більше повідомлень у Direct Message.', icon: '💬' },
  { value: 'video_views', label: 'Перегляди відео', desc: 'Максимум переглядів вашого відео.', icon: '🎬' },
  { value: 'interactions', label: 'Підписники та відвідування профілю', desc: 'Більше підписок, лайків, коментарів і візитів у профіль.', icon: '❤️' },
  { value: 'conversions', label: 'Конверсії', desc: 'Цільові дії на сайті чи в застосунку.', icon: '🎯' },
];

const SALES_TYPES_META = [
  { value: 'conversions', label: 'Конверсії', desc: 'Цільові дії на сайті, у застосунку чи в месенджерах.', icon: '🎯' },
  { value: 'catalog_sales', label: 'Продажі за каталогом', desc: 'Реклама товарів із вашого каталогу цільовій аудиторії.', icon: '🛍️' },
];

// TikTok merged Website Conversions + Catalog Sales into a unified
// "Product Sales" objective in 2026.
const SALES_TYPES_TIKTOK = [
  { value: 'conversions', label: 'Конверсії на сайті', desc: 'Цільові дії на вашому сайті чи в застосунку.', icon: '🎯' },
  { value: 'catalog_sales', label: 'Продажі (TikTok Shop і каталог)', desc: 'Об’єднана ціль Product Sales — каталог, TikTok Shop і сайт.', icon: '🛍️' },
];


const LEAD_DESTINATIONS = [
  { name: 'HubSpot', url: 'https://www.hubspot.com/', flag: '🇺🇸', flagTitle: 'Розробник з США' },
  { name: 'SalesDrive', url: 'https://salesdrive.ua/', flag: '🇺🇦', flagTitle: 'Український розробник' },
  { name: 'Pipedrive', url: 'https://www.pipedrive.com/', flag: '🇪🇪', flagTitle: 'Розробник з Естонії' },
  { name: 'KeyCRM', url: 'https://keycrm.app/', flag: '🇺🇦', flagTitle: 'Український розробник' },
  { name: 'NetHunt CRM', url: 'https://nethunt.com/', flag: '🇺🇦', flagTitle: 'Український розробник' },
  { name: 'KeepinCRM', url: 'https://keepincrm.com/', flag: '🇺🇦', flagTitle: 'Український розробник' },
  { name: 'SendPulse CRM', url: 'https://sendpulse.com/features/crm', flag: '🇺🇦', flagTitle: 'Український розробник' },
  { name: 'Trello', url: 'https://trello.com/', flag: '🇺🇸', flagTitle: 'Розробник з США' },
  { name: 'Kommo', url: 'https://www.kommo.com/', flag: '🇺🇸', flagTitle: 'Штаб-квартира в Сан-Франциско, США' },
  { name: 'Google Таблиця', url: null, flag: null, flagTitle: null },
  { name: 'Telegram-чат з менеджером', url: null, flag: null, flagTitle: null },
  { name: 'amoCRM', url: 'https://www.amocrm.ru/', flag: null, flagTitle: null, ruProduct: true },
  { name: 'Бітрікс24', url: 'https://www.bitrix24.ua/', flag: null, flagTitle: null, ruProduct: true },
  { name: 'Інша', url: null, flag: null, flagTitle: null },
];
const INTEGRATIONS = ['Пряма інтеграція', 'Webhook', 'Make', 'ApiX-Drive'];

const SALES_CHANNELS = [
  { value: 'direct_social', icon: '💬', label: 'В діректі соцмереж', desc: 'Instagram, Facebook, TikTok' },
  { value: 'sales_dept', icon: '📞', label: 'Через відділ продажів', desc: 'Дзвінки, менеджери' },
  { value: 'auto_site', icon: '🌐', label: 'Автоматично через сайт або лендинг', desc: '' },
  { value: 'combined', icon: '🔀', label: 'Комбіновано', desc: 'Автоматизація + менеджер' },
  { value: 'messengers', icon: '📱', label: 'Через месенджери', desc: 'Telegram, Viber, WhatsApp' },
  { value: 'marketplaces', icon: '🛒', label: 'Через маркетплейси', desc: 'Rozetka, Prom тощо' },
  { value: 'other', icon: '✏️', label: 'Інше', desc: 'Опишіть свій варіант' },
];

const BENCHMARKS: Record<string, Partial<DecompositionScenario>> = {
  awareness: { cpm: 3, ctr: 1.5, cpc: 2.0, cpl: 1.2, landingConversion: 50, conversionRate: 3, averageCheck: 60, marginality: 30 },
  traffic: { cpm: 3.5, ctr: 2.0, cpc: 1.75, cpl: 0.9, landingConversion: 50, conversionRate: 4, averageCheck: 50, marginality: 30 },
  engagement: { cpm: 4, ctr: 1.8, cpc: 2.2, cpl: 1.1, landingConversion: 50, conversionRate: 5, averageCheck: 60, marginality: 30 },
  leads: { cpm: 4.5, ctr: 1.2, cpc: 3.75, cpl: 1.5, landingConversion: 50, conversionRate: 5, averageCheck: 75, marginality: 32 },
  app_promotion: { cpm: 3.5, ctr: 2.5, cpc: 1.4, cpl: 0.8, landingConversion: 50, conversionRate: 8, averageCheck: 40, marginality: 30 },
  sales: { cpm: 5, ctr: 1.0, cpc: 5.0, cpl: 1.7, landingConversion: 50, conversionRate: 6, averageCheck: 100, marginality: 32 },
  other: { cpm: 4, ctr: 1.5, cpc: 2.67, cpl: 1.2, landingConversion: 50, conversionRate: 5, averageCheck: 75, marginality: 30 },
};

const calcMetrics = (d: DecompositionScenario) => {
  const impressions = d.cpm > 0 ? (d.budget / d.cpm) * 1000 : 0;
  const clicks = impressions * ((d.ctr || 0) / 100);
  const cpc = clicks > 0 ? d.budget / clicks : 0;
  const leads = clicks * ((d.landingConversion || 0) / 100);
  const sales = leads * ((d.conversionRate || 0) / 100);
  const revenue = sales * (d.averageCheck || 0);
  const cpa = sales > 0 ? d.budget / sales : 0;
  const grossPerSale = (d.averageCheck || 0) * ((d.marginality || 0) / 100);
  const profitPerSale = grossPerSale - cpa;
  const totalProfit = sales * grossPerSale;
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
  const { getScenario, updateScenario, loading: scenariosLoading } = useScenarios();
  const scenario = getScenario(id!);

  // Which set of campaign goals / sub-goals to show depends on the chosen ad
  // platform — TikTok's objective taxonomy differs from Meta's (see the
  // _META / _TIKTOK constant definitions above). Shadowing the original
  // names here means every render branch and nested closure below
  // automatically uses the right platform's list without threading a prop.
  const isTikTokSource = scenario?.leadSource === 'tiktok';
  const CAMPAIGN_GOALS = isTikTokSource ? CAMPAIGN_GOALS_TIKTOK : CAMPAIGN_GOALS_META;
  const LEAD_TYPES = isTikTokSource ? LEAD_TYPES_TIKTOK : LEAD_TYPES_META;
  const AWARENESS_TYPES = isTikTokSource ? AWARENESS_TYPES_TIKTOK : AWARENESS_TYPES_META;
  const TRAFFIC_TYPES = isTikTokSource ? TRAFFIC_TYPES_TIKTOK : TRAFFIC_TYPES_META;
  const ENGAGEMENT_TYPES = isTikTokSource ? ENGAGEMENT_TYPES_TIKTOK : ENGAGEMENT_TYPES_META;
  const SALES_TYPES = isTikTokSource ? SALES_TYPES_TIKTOK : SALES_TYPES_META;

  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [clientBriefOpen, setClientBriefOpen] = useState(false);
  const [filledBriefOpen, setFilledBriefOpen] = useState(false);
  const [clientActions, setClientActions] = useState<Set<string>>(() => {
    const saved = scenario?.clientActions;
    if (Array.isArray(saved) && saved.length) return new Set(saved);
    if (scenario?.niche || scenario?.leadSource || scenario?.channel || (scenario?.leadTypes && scenario.leadTypes.length > 0) || (scenario?.branchData && Object.keys(scenario.branchData).length > 0)) {
      return new Set(['brief', 'payment']);
    }
    try {
      const raw = localStorage.getItem(`clientActions:${id}`);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });
  useEffect(() => {
    if (!id) return;
    try { localStorage.setItem(`clientActions:${id}`, JSON.stringify(Array.from(clientActions))); } catch {}
    if (scenario && JSON.stringify(scenario.clientActions || []) !== JSON.stringify(Array.from(clientActions))) {
      updateScenario(id, { clientActions: Array.from(clientActions) });
    }
  }, [clientActions, id, scenario?.clientActions, updateScenario]);
  useEffect(() => {
    if (Array.isArray(scenario?.clientActions) && scenario.clientActions.length > 0) {
      setClientActions(new Set(scenario.clientActions));
    }
  }, [id, scenario?.clientActions]);
  const [decompTab, setDecompTab] = useState<'bad' | 'realistic' | 'positive'>('realistic');
  const [activeLeadType, setActiveLeadType] = useState<string>('');
  const [pendingRemoveLeadType, setPendingRemoveLeadType] = useState<string | null>(null);
  const [pendingLeadSourceSwitch, setPendingLeadSourceSwitch] = useState<string | null>(null);
  const [launchResultOpen, setLaunchResultOpen] = useState(false);
  const [launchPhase, setLaunchPhase] = useState<'launching' | 'week' | 'resolved' | 'month_success'>('launching');
  const [launchWeek, setLaunchWeek] = useState(1);
  const [launchProblem, setLaunchProblem] = useState<LaunchProblem | null>(null);
  const [launchFeedback, setLaunchFeedback] = useState<string | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoDialogStep, setVideoDialogStep] = useState(0);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [formatConfirmed, setFormatConfirmed] = useState(false);
  const [aiTipsOpen, setAiTipsOpen] = useState(false);
  const [aiTipsText, setAiTipsText] = useState('');
  const [aiTipsLoading, setAiTipsLoading] = useState(false);
  const [aiTipsBranchType, setAiTipsBranchType] = useState<string | undefined>(undefined);
  const [salesProcessed, setSalesProcessedRaw] = useState(false);
  const [salesRecOpen, setSalesRecOpen] = useState(false);
  const [salesRecText, setSalesRecText] = useState('');
  const [salesRecLoading, setSalesRecLoading] = useState(false);
  const [salesRecTitle, setSalesRecTitle] = useState('');
  // Audience prep
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [audienceChecks, setAudienceChecks] = useState<Record<string, boolean>>({});
  const [audienceTipsText, setAudienceTipsText] = useState('');
  const [audienceTipsLoading, setAudienceTipsLoading] = useState(false);
  // 'list' | 'choose' | 'manual' | 'ai' | 'view'
  const [audienceView, setAudienceView] = useState<'list' | 'choose' | 'manual' | 'ai' | 'view'>('list');
  const [audienceName, setAudienceName] = useState('');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [viewAudienceIdx, setViewAudienceIdx] = useState<number | null>(null);
  // Creo brief
  const [creoOpen, setCreoOpen] = useState(false);
  const [creoFormat, setCreoFormat] = useState<'static' | 'carousel' | 'video' | null>(null);
  const [creoFields, setCreoFields] = useState<Record<string, string>>({});
  const [creoVideoFormat, setCreoVideoFormat] = useState<string>('');
  const [creoAiLoading, setCreoAiLoading] = useState(false);
  const [viewCreoIdx, setViewCreoIdx] = useState<number | null>(null);
  const [preselectedAudienceId, setPreselectedAudienceId] = useState<string | null>(null);
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [fillBenchLoading, setFillBenchLoading] = useState(false);
  // Cache for AI-generated content: key → text. Persisted on the scenario so
  // recommendations survive reload and aren't regenerated every time.
  const aiCacheRef = useRef<Record<string, string>>(scenario?.aiCache ? { ...scenario.aiCache } : {});
  // Re-hydrate when navigating between scenarios.
  useEffect(() => {
    aiCacheRef.current = scenario?.aiCache ? { ...scenario.aiCache } : {};
  }, [id]);
  const setAiCache = useCallback((key: string, text: string) => {
    if (!text || !id) return;
    aiCacheRef.current[key] = text;
    updateScenario(id, { aiCache: { ...aiCacheRef.current } });
  }, [id, updateScenario]);
  // Persist "sales processed" flag through the AI cache so reload doesn't reset it.
  const salesProcessedKey = `sales:processed:${activeLeadType || 'main'}`;
  const setSalesProcessed = useCallback((val: boolean) => {
    setSalesProcessedRaw(val);
    if (!id) return;
    aiCacheRef.current[salesProcessedKey] = val ? '1' : '';
    updateScenario(id, { aiCache: { ...aiCacheRef.current } });
  }, [id, salesProcessedKey, updateScenario]);
  // Hydrate when switching scenario/branch.
  useEffect(() => {
    setSalesProcessedRaw(aiCacheRef.current[salesProcessedKey] === '1');
  }, [id, salesProcessedKey]);
  // AI conclusion for result step
  const [aiConclusionText, setAiConclusionText] = useState('');
  const [aiConclusionLoading, setAiConclusionLoading] = useState(false);
  // Email strategy AI
  const [emailStrategyText, setEmailStrategyText] = useState('');
  const [emailStrategyLoading, setEmailStrategyLoading] = useState(false);
  type EmailScen = { openRate: number; clicks: number; conversions: number; revenue: number };
  type EmailSummary = { emailsSent: number; touchesPerContact: number; conclusion: string };
  const [emailScenarios, setEmailScenarios] = useState<{ bad: EmailScen; real: EmailScen; opt: EmailScen } | null>(null);
  const [emailSummary, setEmailSummary] = useState<EmailSummary | null>(null);
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
  const { user, profile } = useAuth();
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
      if (fullText) setAiCache(cacheKey, fullText);
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати рекомендації', variant: 'destructive' });
    } finally {
      setAiTipsLoading(false);
    }
  }, [scenario, toast]);

  const fetchAudienceTips = useCallback(async (opts?: { force?: boolean; previousAudiences?: any[]; audienceName?: string }) => {
    if (!scenario) return;
    const cacheKey = `audience-tips:${activeLeadType || 'main'}:${opts?.audienceName || ''}`;
    if (!opts?.force && aiCacheRef.current[cacheKey]) {
      setAudienceTipsText(aiCacheRef.current[cacheKey]);
      return;
    }
    setAudienceTipsLoading(true);
    setAudienceTipsText('');

    const isBr = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && activeLeadType;
    const branch = isBr ? scenario.branchData?.[activeLeadType] : null;
    const decompSet = branch ? branch.decomposition : scenario.decomposition;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audience-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          niche: scenario.niche,
          channel: scenario.channel,
          leadType: activeLeadType || (scenario.leadTypes?.[0] || ''),
          decomposition: decompSet,
          clientBrief: scenario.clientBrief,
          previousAudiences: opts?.previousAudiences || [],
          audienceName: opts?.audienceName || '',
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Помилка' }));
        toast({ title: 'AI помилка', description: err.error || 'Не вдалося отримати поради', variant: 'destructive' });
        setAudienceTipsLoading(false);
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
              setAudienceTipsText(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      if (fullText) setAiCache(cacheKey, fullText);
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати поради', variant: 'destructive' });
    } finally {
      setAudienceTipsLoading(false);
    }
  }, [scenario, activeLeadType, toast]);



  const fetchSalesRecommendation = useCallback(async (recType: string, title: string) => {
    if (!scenario) return;
    const isBrCache = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && activeLeadType;
    const branchCache = isBrCache ? scenario.branchData?.[activeLeadType] : null;
    const channelCacheKey = (branchCache ? (branchCache as any).salesChannel : (scenario as any).salesChannel) || 'none';
    const cacheKey = `sales:${recType}:${activeLeadType || 'main'}:${channelCacheKey}`;
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
    const salesChannelVal: string = (branch ? (branch as any).salesChannel : (scenario as any).salesChannel) || '';
    const salesChannelOtherVal: string = (branch ? (branch as any).salesChannelOther : (scenario as any).salesChannelOther) || '';
    const channelMeta = SALES_CHANNELS.find(c => c.value === salesChannelVal);
    const salesChannelLabel = salesChannelVal === 'other'
      ? (salesChannelOtherVal || 'Інше')
      : (channelMeta ? `${channelMeta.label}${channelMeta.desc ? ` (${channelMeta.desc})` : ''}` : '');

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
          salesChannel: salesChannelLabel,
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
      if (fullText) setAiCache(cacheKey, fullText);
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
      if (fullText) setAiCache(cacheKey, fullText);
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати висновок', variant: 'destructive' });
    } finally {
      setAiConclusionLoading(false);
    }
  }, [scenario, activeLeadType, toast]);

  const parseEmailScenarios = useCallback((text: string) => {
    try {
      const m = text.match(/```json\s*([\s\S]*?)```/);
      const raw = m ? m[1] : (text.match(/\{[\s\S]*"scenarios"[\s\S]*\}/)?.[0] ?? '');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const s = parsed.scenarios;
      if (!s?.bad || !s?.real || !s?.opt) return null;
      const norm = (x: any): EmailScen => ({
        openRate: Number(x.openRate) || 0,
        clicks: Number(x.clicks) || 0,
        conversions: Number(x.conversions) || 0,
        revenue: Number(x.revenue) || 0,
      });
      const sum = parsed.summary
        ? {
            emailsSent: Number(parsed.summary.emailsSent) || 0,
            touchesPerContact: Number(parsed.summary.touchesPerContact) || 0,
            conclusion: String(parsed.summary.conclusion || ''),
          }
        : null;
      return { scenarios: { bad: norm(s.bad), real: norm(s.real), opt: norm(s.opt) }, summary: sum };
    } catch { return null; }
  }, []);
  const stripJsonBlock = (text: string) => text.replace(/```json[\s\S]*?```\s*/, '').trim();
  const applyEmailParsed = useCallback((text: string) => {
    const p = parseEmailScenarios(text);
    if (p) {
      setEmailScenarios(p.scenarios);
      setEmailSummary(p.summary);
    } else {
      setEmailScenarios(null); setEmailSummary(null);
      setEmailSummary(null);
    }
  }, [parseEmailScenarios]);

  const fetchEmailStrategy = useCallback(async (opts?: { force?: boolean }) => {
    if (!scenario) return;
    const isBr = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && activeLeadType;
    const branch = isBr ? scenario.branchData?.[activeLeadType] : null;
    const ret = branch ? branch.retention : scenario.retention;
    const base = ret?.emailCount || 0;
    const cacheKey = `email-strategy:${activeLeadType || 'main'}:${base}`;
    if (!opts?.force && aiCacheRef.current[cacheKey]) {
      const cached = aiCacheRef.current[cacheKey];
      setEmailStrategyText(cached);
      applyEmailParsed(cached);
      return;
    }
    setEmailStrategyLoading(true);
    setEmailStrategyText('');
    setEmailScenarios(null); setEmailSummary(null);
    const decompSet = branch ? branch.decomposition : scenario.decomposition;
    const compDesc = branch ? branch.companyDescription : scenario.companyDescription;
    const salesCh = branch ? (branch as any).salesChannel : (scenario as any).salesChannel;
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          niche: scenario.niche,
          companyDescription: compDesc,
          clientBrief: scenario.clientBrief,
          decomposition: decompSet,
          emailCount: base,
          channel: scenario.channel,
          leadType: activeLeadType || (scenario.leadTypes?.[0] || ''),
          salesChannel: salesCh,
        }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Помилка' }));
        toast({ title: 'AI помилка', description: err.error || 'Не вдалося отримати стратегію', variant: 'destructive' });
        setEmailStrategyLoading(false);
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
              setEmailStrategyText(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      if (fullText) {
        setAiCache(cacheKey, fullText);
        applyEmailParsed(fullText);
      }
    } catch (e: any) {
      toast({ title: 'Помилка', description: e.message || 'Не вдалося отримати стратегію', variant: 'destructive' });
    } finally {
      setEmailStrategyLoading(false);
    }
  }, [scenario, activeLeadType, toast, setAiCache, parseEmailScenarios]);

  // Hydrate scenarios from cache when switching branches / entering step
  useEffect(() => {
    if (!scenario) return;
    const isBr = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && activeLeadType;
    const branch = isBr ? scenario.branchData?.[activeLeadType] : null;
    const base = (branch ? branch.retention?.emailCount : scenario.retention?.emailCount) || 0;
    const cacheKey = `email-strategy:${activeLeadType || 'main'}:${base}`;
    const cached = aiCacheRef.current[cacheKey];
    if (cached) {
      setEmailStrategyText(cached);
      applyEmailParsed(cached);
    } else {
      setEmailStrategyText('');
      setEmailScenarios(null); setEmailSummary(null);
    }
  }, [scenario?.id, activeLeadType, scenario?.retention?.emailCount, parseEmailScenarios]);



  // Hydrate cached conclusion + auto-generate when entering Результат step
  useEffect(() => {
    if (!scenario) return;
    const cacheKey = `conclusion:${activeLeadType || 'main'}`;
    const cached = aiCacheRef.current[cacheKey];
    if (cached) {
      setAiConclusionText(cached);
    } else {
      setAiConclusionText('');
    }
    if (activeStep === 9 && !cached && !aiConclusionLoading) {
      fetchAiConclusion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, activeLeadType, id]);


  const sendToCurator = useCallback(async () => {
    if (!scenario) return;
    const decompSet = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 1 && activeLeadType
      ? (scenario.branchData?.[activeLeadType]?.decomposition || scenario.decomposition)
      : scenario.decomposition;
    const real = calcMetrics(decompSet.realistic);
    const channelLabel = CAMPAIGN_GOALS.find(c => c.value === scenario.channel)?.label || scenario.channel || '—';
    const sourceLabel = LEAD_SOURCES.find(s => s.value === scenario.leadSource)?.label || scenario.leadSource || '—';
    const dests = (scenario.channel === 'leads' && activeLeadType && scenario.branchData?.[activeLeadType]?.leadDestinations) || scenario.leadDestinations || [];
    const intMethod = (scenario.channel === 'leads' && activeLeadType && scenario.branchData?.[activeLeadType]?.integrationMethod) || scenario.integrationMethod || '';
    const compDesc = (scenario.channel === 'leads' && activeLeadType && scenario.branchData?.[activeLeadType]?.companyDescription) || scenario.companyDescription || '';

    // Create a public, view-only share link for this funnel snapshot.
    let shareUrl = '';
    try {
      const { data, error } = await supabase
        .from('shared_scenarios')
        .insert({
          scenario: scenario as any,
          ai_conclusion: aiConclusionText || null,
          active_lead_type: activeLeadType || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      shareUrl = `${window.location.origin}/share/${data.id}`;
    } catch (e: any) {
      console.error('Failed to create share link', e);
      toast({ title: 'Не вдалося створити посилання', description: e.message || 'Спробуйте ще раз', variant: 'destructive' });
      return;
    }

    const lines = [
      `Воронка: ${scenario.name}`,
      `Публічне посилання (тільки перегляд): ${shareUrl}`,
      ``,
      `Ніша: ${scenario.niche || '—'}`,
      `Джерело: ${sourceLabel}`,
      `Ціль: ${channelLabel}`,
      `Типи лідгену: ${(scenario.leadTypes || []).join(', ') || '—'}`,
      `Бюджет: ${decompSet.realistic.budget.toLocaleString()} $`,
      `Ліди йдуть у: ${dests.join(', ') || '—'}`,
      `Інтеграція: ${intMethod || '—'}`,
      `Опис компанії: ${compDesc || '—'}`,
      ``,
      `Реалістичний сценарій:`,
      `- Ліди: ${real.leads}, Продажі: ${real.sales}`,
      `- Дохід: ${real.revenue.toLocaleString()} $, Чистий: ${real.netIncome.toLocaleString()} $`,
      `- ROMI: ${real.romi}%`,
      ``,
      `AI Висновок:`,
      aiConclusionText || '(ще не згенеровано)',
    ];
    const summary = lines.join('\n');
    const subject = `SmartFunnel: ${scenario.name}`;

    try {
      const { error: reviewErr } = await supabase.from('scenario_reviews').insert({
        user_id: user?.id as string,
        user_email: user?.email || profile?.email || '',
        user_name: profile?.full_name || null,
        scenario_name: scenario.name,
        shared_id: shareUrl ? shareUrl.split('/share/')[1] : null,
        summary,
        status: 'pending',
      });
      if (reviewErr) throw reviewErr;
      try { await navigator.clipboard?.writeText(shareUrl); } catch {}
      toast({ title: 'Відправлено куратору', description: 'Воронка з\'явиться в адмін-панелі на перевірку. Посилання скопійовано.' });
    } catch (e: any) {
      console.error('Failed to submit review', e);
      toast({ title: 'Не вдалося відправити', description: e.message || 'Спробуйте ще раз', variant: 'destructive' });
    }
  }, [scenario, activeLeadType, aiConclusionText, toast, user, profile]);

  // savedSteps tracks global steps + per-branch steps (key format: "step" or "step:branchType")
  const [savedSteps, setSavedSteps] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (scenario) {
      for (let i = 0; i < STEPS.length; i++) {
        if (isStepCompletedStatic(scenario, i)) set.add(String(i));
        // Also check per-branch completion
        if (scenario.channel === 'leads' && scenario.leadTypes?.length > 1 && i >= 4) {
          scenario.leadTypes.forEach(lt => {
            if (isStepCompletedForBranch(scenario, i, lt)) set.add(`${i}:${lt}`);
          });
        }
      }
    }
    return set;
  });

  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());


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
    if (activeStep === 4 && scenario?.channel === 'leads' && (scenario.leadTypes?.length || 0) > 0 && !scenario.leadTypes?.includes(activeLeadType)) {
      setActiveLeadType(scenario.leadTypes[0]);
    }
  }, [activeStep, scenario?.channel, scenario?.leadTypes, activeLeadType]);

  // Restore audience checklist when opening dialog
  useEffect(() => {
    if (!audienceOpen) return;
    const key = activeLeadType || 'main';
    const settings = (scenario as any)?.audienceSettings || {};
    const savedChecks = settings[`${key}__checks`] || (settings[key] && !Array.isArray(settings[key]) ? settings[key].checks : null);
    if (savedChecks && typeof savedChecks === 'object') {
      setAudienceChecks(savedChecks);
    }
  }, [audienceOpen, activeLeadType, scenario]);

  // Auto-prefill sales "Про компанію" from client brief + filled brief answers
  useEffect(() => {
    if (activeStep !== 6) return;
    if (!scenario) return;
    const cb = scenario.clientBrief;
    if (!cb?.name) return;
    const existing = scenario.companyDescription || '';
    if (existing.trim().length > 0) return;
    const brief = getBriefForClient(cb);
    const findA = (kw: string) =>
      brief?.find(f => f.q.toLowerCase().includes(kw.toLowerCase()))?.a || '';
    const audience = findA('опис клієнта');
    const services = findA('послуги з найбільшим попитом');
    const utp = findA('УТП');
    const check = findA('середній чек');
    const promos = findA('акції');
    const parts = [
      `Клієнт: ${cb.name}${(cb as any).role ? ` — ${(cb as any).role}` : ''}.`,
      cb.niche ? `Ніша: ${cb.niche}.` : '',
      cb.task ? `Запит клієнта: ${cb.task}` : '',
      audience ? `Цільова аудиторія: ${audience}` : '',
      services ? `Топ послуги/продукти: ${services}` : '',
      utp ? `УТП / переваги: ${utp}` : '',
      check ? `Середній чек: ${check}.` : '',
      promos ? `Акції / лояльність: ${promos}` : '',
    ].filter(Boolean);
    const text = parts.join('\n\n');
    if (!text.trim()) return;
    updateScenario(id!, { companyDescription: text });
    setSalesProcessed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, scenario?.clientBrief?.name]);

  const scenarioHasExistingProgress = !!(scenario && (
    (scenario.clientActions && scenario.clientActions.length >= 2) ||
    scenario.niche ||
    scenario.leadSource ||
    scenario.channel ||
    (scenario.leadTypes && scenario.leadTypes.length > 0) ||
    (scenario.currentStep && scenario.currentStep > 0) ||
    (scenario.branchData && Object.keys(scenario.branchData).length > 0)
  ));

  useEffect(() => {
    if (!scenarioHasExistingProgress) return;
    if (clientActions.has('brief') && clientActions.has('payment')) return;
    setClientActions(new Set(['brief', 'payment']));
  }, [scenarioHasExistingProgress, clientActions]);

  // Auto-mark step 3 (Деталізація) saved when niche is not Інфобізнес (shared + each branch)
  useEffect(() => {
    if (scenario?.niche && scenario.niche !== 'Інфобізнес') {
      setSavedSteps(prev => {
        const next = new Set(prev);
        let changed = false;
        if (!next.has('3')) { next.add('3'); changed = true; }
        (scenario.leadTypes || []).forEach(lt => {
          const key = `3:${lt}`;
          if (!next.has(key)) { next.add(key); changed = true; }
        });
        return changed ? next : prev;
      });
    }
  }, [scenario?.niche, scenario?.leadTypes]);

  // Auto-mark step 2 (Ціль оптимізації) saved as soon as the goal + subtype
  // are fully picked — this step no longer has its own node in the flow, it's
  // driven from the Meta Ads prep block via "+ Додати ціль".
  useEffect(() => {
    if (!scenario) return;
    const ch = scenario.channel;
    const step2Ok = !!ch && (
      (ch === 'leads' && (scenario.leadTypes?.length || 0) > 0) ||
      (ch === 'awareness' && !!(scenario as any).awarenessType) ||
      (ch === 'traffic' && !!(scenario as any).trafficType) ||
      (ch === 'engagement' && !!(scenario as any).engagementType) ||
      (ch === 'sales' && !!(scenario as any).salesType)
    );
    if (step2Ok) {
      setSavedSteps(prev => {
        if (prev.has('2')) return prev;
        const next = new Set(prev);
        next.add('2');
        return next;
      });
    }
  }, [scenario?.channel, scenario?.leadTypes, (scenario as any)?.awarenessType, (scenario as any)?.trafficType, (scenario as any)?.engagementType, (scenario as any)?.salesType]);

  // Auto-mark step 3 (Деталізація) saved for infobiz when the funnel format
  // is set — the flow no longer has a dedicated node, format is picked inline
  // inside each campaign card of the Meta Ads prep block.
  useEffect(() => {
    if (!scenario || scenario.niche !== 'Інфобізнес') return;
    setSavedSteps(prev => {
      const next = new Set(prev);
      let changed = false;
      if (scenario.funnelFormat && !next.has('3')) { next.add('3'); changed = true; }
      (scenario.leadTypes || []).forEach(lt => {
        if (scenario.branchData?.[lt]?.funnelFormat) {
          const key = `3:${lt}`;
          if (!next.has(key)) { next.add(key); changed = true; }
        }
      });
      return changed ? next : prev;
    });
  }, [scenario?.niche, scenario?.funnelFormat, scenario?.leadTypes, scenario?.branchData]);



  if (!scenario) {
    if (scenariosLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground">Завантаження сценарію…</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Сценарій не знайдено</h2>
          <Button onClick={() => navigate('/')} variant="secondary">На головну</Button>
        </div>
      </div>
    );
  }

  const hasExistingProgress = scenarioHasExistingProgress;

  // If the scenario looks "thin" (only a brief, no progress) but cloud sync is still
  // running, wait for cloud — otherwise we might briefly show the intro for a
  // scenario that actually has full progress stored remotely.
  if (scenariosLoading && scenario.clientBrief && !hasExistingProgress && scenario.status !== 'completed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Синхронізація з хмарою…</p>
        </div>
      </div>
    );
  }

  if (!scenario.clientBrief && !hasExistingProgress) {
    if (scenariosLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground">Синхронізація з хмарою…</p>
          </div>
        </div>
      );
    }
    return (
      <SimulationIntro
        scenarioName={scenario.name}
        onAccept={(difficulty, brief) => {
          const isDefaultName = /^Сценарій #\d+$/.test(scenario.name);
          const shortTitle = brief.name && brief.niche ? `${brief.name} — ${brief.niche}` : (brief.niche || brief.name);
          const clientBudget = estimateClientBudgetUsd(brief.task);
          const seededDecomp = createDefaultDecompSet();
          seededDecomp.bad.budget = clientBudget;
          seededDecomp.realistic.budget = clientBudget;
          seededDecomp.positive.budget = clientBudget;
          updateScenario(id!, {
            ...(isDefaultName && shortTitle ? { name: shortTitle } : {}),
            difficulty,
            clientBrief: brief,
            decomposition: seededDecomp,
          });
          setActiveStep(null);
          toast({
            title: 'Ads School',
            description: `Вітаю з новим проектом — ${brief.name}!`,
          });
        }}
      />
    );
  }


  // Legacy scenarios created before client brief — synthesize a minimal brief so the saved flow opens.
  if (!scenario.clientBrief && hasExistingProgress) {
    const fallbackBrief: ClientBrief = {
      name: 'Клієнт',
      photo: '',
      task: '',
      niche: scenario.niche || '',
      source: scenario.leadSource || '',
    };
    scenario.clientBrief = fallbackBrief;
  }

  const hasCompletedClientGate = clientActions.has('brief') && clientActions.has('payment');

  const ClientInfoCard: React.FC<{ compact?: boolean }> = ({ compact }) => {
    const b = scenario.clientBrief!;
    return (
      <button
        type="button"
        onClick={() => { if (!wasDragged.current) setClientBriefOpen(true); }}
        className={`flex-shrink-0 flex items-end gap-3 text-left group ${compact ? 'w-[300px]' : 'w-[320px]'}`}
        data-flow-node
        title="Натисніть, щоб прочитати запит клієнта"
      >
        {/* Round Telegram-style avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-card shadow-md bg-secondary">
            <img
              src={resolveClientPhoto(b)}
              alt={b.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`;
              }}
            />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-card" />
        </div>

        {/* Telegram-style message bubble */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className="text-sm font-semibold text-foreground truncate">{b.name}</span>
            {b.source && (
              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                · {b.source}
              </span>
            )}
          </div>
          <div
            className="relative rounded-2xl rounded-bl-md bg-card border border-border px-3.5 py-2.5 shadow-sm group-hover:-translate-y-0.5 group-hover:shadow-md transition-all"
            style={{ boxShadow: '0 8px 24px -12px hsl(var(--foreground) / 0.18)' }}
          >
            {/* Bubble tail */}
            <span
              className="absolute -left-1.5 bottom-2 w-3 h-3 bg-card border-l border-b border-border"
              style={{ transform: 'rotate(45deg)' }}
            />
            {b.niche && (
              <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider mb-1">
                {b.niche}
              </p>
            )}
            <p className="text-xs text-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {b.task}
            </p>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/60">
              <span className="text-[10px] text-primary font-semibold">Читати повністю →</span>
              <span className="text-[9px] text-muted-foreground">щойно</span>
            </div>
          </div>
          {((b.redFlags?.length || 0) > 0 || (b.greyFlags?.length || 0) > 0) && (
            <div className="flex items-center gap-1 mt-1.5 px-1">
              {(b.redFlags || []).map((k, i) => {
                const meta = RED_FLAG_META[k];
                if (!meta) return null;
                const { Icon } = meta;
                return (
                  <span
                    key={`rf-${i}`}
                    title={meta.label}
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'hsl(0 75% 94%)' }}
                  >
                    <Icon className="w-3 h-3" style={{ color: 'hsl(0 75% 45%)' }} />
                  </span>
                );
              })}
              {(b.greyFlags || []).map((k, i) => {
                const meta = GREY_FLAG_META[k];
                if (!meta) return null;
                const { Icon } = meta;
                return (
                  <span
                    key={`gf-${i}`}
                    title={meta.label}
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'hsl(220 10% 92%)' }}
                  >
                    <Icon className="w-3 h-3" style={{ color: 'hsl(220 10% 40%)' }} />
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </button>
    );
  };

  const CLIENT_ACTIONS: { key: string; label: string; doneIcon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'brief', label: 'Провести міт та зібрати бриф', doneIcon: FileText },
    { key: 'payment', label: 'Взяти оплату', doneIcon: DollarSign },
  ];

  const handleClientAction = (key: string, label: string) => {
    setClientActions(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    if (key === 'brief') {
      setFilledBriefOpen(true);
    }
  };

  const ClientActionsColumn: React.FC = () => (
    <div className="flex flex-col items-center mt-3 select-none gap-2">
      <div className="w-px h-4 bg-border" />
      {CLIENT_ACTIONS.map(({ key, label, doneIcon: DoneIcon }) => {
        const done = clientActions.has(key);
        const onClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (done && key === 'brief') {
            setFilledBriefOpen(true);
            return;
          }
          if (done) return;
          handleClientAction(key, label);
        };
        return done ? (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="px-3 py-2 rounded-full bg-accent border border-primary/30 text-primary text-xs font-semibold shadow-sm flex items-center gap-1.5 hover:bg-primary/10 transition-all"
          >
            <DoneIcon className="w-3.5 h-3.5" /> {label}
          </button>
        ) : (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="px-3 py-2 rounded-full bg-card border-2 border-primary text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm hover:shadow-md"
            title={label}
            aria-label={label}
          >
            <Plus className="w-3.5 h-3.5" /> {label}
          </button>
        );
      })}
    </div>
  );

  const toggleAdSet = (id: string) => setExpandedAdSets(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const PrepWorksNode: React.FC<{ branchKey?: string; campaignKeys?: string[] }> = ({ branchKey, campaignKeys }) => {
    const formatMeta: Record<string, { icon: string; label: string }> = {
      static: { icon: '🖼️', label: 'Статика' },
      carousel: { icon: '🎠', label: 'Карусель' },
      video: { icon: '🎬', label: 'Відео' },
    };

    // Platform brand color/icon/label, driven by the chosen ad source.
    const META = 'hsl(214 89% 52%)';
    const TIKTOK_COLOR = 'hsl(340 82% 52%)';
    const isTikTok = scenario.leadSource === 'tiktok';
    const PLATFORM_COLOR = isTikTok ? TIKTOK_COLOR : META;
    const PLATFORM_COLOR_SOFT = isTikTok ? 'hsl(340 82% 52% / 0.12)' : 'hsl(214 89% 52% / 0.12)';
    const PLATFORM_COLOR_SHADOW = isTikTok ? 'hsl(340 82% 52% / 0.25)' : 'hsl(214 89% 52% / 0.25)';
    const PlatformIcon = isTikTok ? TikTokIcon : MetaIcon;
    const platformManagerName = isTikTok ? 'TikTok Ads Manager' : 'Ads Manager';
    const platformPrepLabel = isTikTok ? 'ПІДГОТОВКА · TIKTOK ADS MANAGER' : 'ПІДГОТОВКА · META ADS MANAGER';

    const isMulti = !!campaignKeys && campaignKeys.length > 0;
    const keys: string[] = isMulti ? campaignKeys! : [branchKey || activeLeadType || 'main'];

    // Build per-campaign data
    type CampaignData = {
      key: string;
      audiences: any[];
      creoList: any[];
      goalLabel: string;
      subgoalLabel: string;
      GoalIcon: any;
    };
    const campaigns: CampaignData[] = keys.map(key => {
      const raw = (scenario as any)?.creoBriefs?.[key];
      const creoList: any[] = Array.isArray(raw) ? raw : (raw?.format ? [raw] : []);
      const rawAud = (scenario as any)?.audienceSettings?.[key];
      const audiences: any[] = Array.isArray(rawAud)
        ? rawAud
        : (rawAud && (rawAud.tips || rawAud.checks)
            ? [{ id: 'legacy', name: 'Гіпотеза 1', mode: 'ai' }]
            : []);

      // For multi (leads branching), each campaign is a "leads" goal with subgoal = leadType
      let goalObj = CAMPAIGN_GOALS.find(g => g.value === scenario.channel);
      let subgoalLabel = '';
      if (isMulti || (scenario.channel === 'leads' && key !== 'main')) {
        goalObj = CAMPAIGN_GOALS.find(g => g.value === 'leads') || goalObj;
        subgoalLabel = LEAD_TYPES.find(x => x.value === key)?.label || key;
      } else {
        if (scenario.channel === 'awareness') subgoalLabel = AWARENESS_TYPES.find(x => x.value === scenario.awarenessType)?.label || '';
        else if (scenario.channel === 'traffic') subgoalLabel = TRAFFIC_TYPES.find(x => x.value === scenario.trafficType)?.label || '';
        else if (scenario.channel === 'engagement') subgoalLabel = ENGAGEMENT_TYPES.find(x => x.value === scenario.engagementType)?.label || '';
        else if (scenario.channel === 'sales') subgoalLabel = SALES_TYPES.find(x => x.value === scenario.salesType)?.label || '';
        else if (scenario.channel === 'leads' && branchKey) subgoalLabel = LEAD_TYPES.find(x => x.value === branchKey)?.label || '';
      }

      return { key, audiences, creoList, goalLabel: goalObj?.label || 'Ціль', subgoalLabel, GoalIcon: goalObj?.Icon };
    });

    const totalAudiences = campaigns.reduce((s, c) => s + c.audiences.length, 0);
    const totalCreo = campaigns.reduce((s, c) => s + c.creoList.length, 0);

    const openAudienceDialog = (key: string, view: 'list' | 'choose' = 'choose') => {
      setActiveLeadType(key === 'main' ? '' : key);
      setAudienceView(view);
      setAudienceOpen(true);
    };
    const openAudienceView = (key: string, idx: number) => {
      setActiveLeadType(key === 'main' ? '' : key);
      setViewAudienceIdx(idx);
      setAudienceView('view');
      setAudienceOpen(true);
    };
    const openCreoCreate = (key: string, audId: string | null) => {
      setActiveLeadType(key === 'main' ? '' : key);
      setPreselectedAudienceId(audId);
      setViewCreoIdx(null);
      setCreoFormat(null);
      setCreoOpen(true);
    };
    const openCreoView = (key: string, idx: number) => {
      setActiveLeadType(key === 'main' ? '' : key);
      setViewCreoIdx(idx);
      setCreoFormat(null);
      setCreoOpen(true);
    };

    const TabBtn: React.FC<{ label: string; icon: React.ReactNode; count?: number; active?: boolean }> = ({ label, icon, count, active }) => (
      <div
        className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border-b-2 transition-colors"
        style={{
          color: active ? PLATFORM_COLOR : 'hsl(220 10% 45%)',
          borderColor: active ? PLATFORM_COLOR : 'transparent',
        }}
      >
        {icon}
        <span>{label}</span>
        {typeof count === 'number' && (
          <span
            className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: active ? PLATFORM_COLOR_SOFT : 'hsl(220 14% 94%)', color: active ? PLATFORM_COLOR : 'hsl(220 10% 40%)' }}
          >
            {count}
          </span>
        )}
      </div>
    );

    const AddBtn: React.FC<{ label: string; onClick: () => void; subtle?: boolean }> = ({ label, onClick, subtle }) => (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
        style={
          subtle
            ? { color: PLATFORM_COLOR, background: 'transparent', border: `1px dashed ${PLATFORM_COLOR}` }
            : { color: 'white', background: PLATFORM_COLOR, boxShadow: `0 2px 4px ${PLATFORM_COLOR_SHADOW}` }
        }
      >
        <Plus className="w-3 h-3" strokeWidth={2.5} />
        {label}
      </button>
    );

    return (
      <div className="flex items-start flex-shrink-0 mx-10" data-flow-node>
        <div className="flex flex-col" style={{ width: isMulti ? '820px' : '720px' }}>
          <div className="flex items-center gap-2 mb-2 px-1 h-4">
            <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/70">{platformPrepLabel}</span>
          </div>

          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              background: 'hsl(0 0% 100%)',
              boxShadow: '0 12px 26px -16px hsl(0 0% 0% / 0.18), 0 2px 6px -2px hsl(0 0% 0% / 0.05), inset 0 0 0 1px hsl(var(--border) / 0.7)',
            }}
          >
            {/* Platform-style header bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-border/60" style={{ background: 'hsl(220 20% 98%)' }}>
              <div className="flex items-center gap-3">
                <PlatformIcon className="w-5 h-5" />
                <span className="text-[12px] font-bold text-foreground">{platformManagerName}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {scenario.niche || 'акаунт'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[10px] text-muted-foreground font-medium">чернетка</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-3 border-b border-border/60" style={{ background: 'hsl(220 20% 98%)' }}>
              <TabBtn label="Кампанії" icon={<Filter className="w-3.5 h-3.5" />} count={campaigns.length} active />
              <TabBtn label="Групи оголошень" icon={<Users className="w-3.5 h-3.5" />} count={totalAudiences} active />
              <TabBtn label="Оголошення" icon={<Megaphone className="w-3.5 h-3.5" />} count={totalCreo} active />
              <div className="ml-auto py-1.5">
                <AddBtn label="Додати ціль" onClick={() => setActiveStep(2)} />
              </div>
            </div>

            {/* Tree — one section per campaign */}
            <div className="p-3 space-y-4" style={{ background: 'hsl(220 20% 99%)' }}>
              {campaigns.map((c, cIdx) => {
                const GoalIcon = c.GoalIcon;
                const isInfobiz = scenario.niche === 'Інфобізнес';
                const campaignFunnelFormat = c.key === 'main'
                  ? (scenario.funnelFormat || '')
                  : (scenario.branchData?.[c.key]?.funnelFormat || '');
                return (
                  <div key={c.key} className="space-y-2">
                    {/* Campaign row */}
                    <div
                      className="rounded-lg border p-2.5 flex items-center gap-2.5"
                      style={{ background: 'white', borderColor: PLATFORM_COLOR_SOFT.replace('0.12', '0.35'), boxShadow: '0 1px 2px hsl(0 0% 0% / 0.04)' }}
                    >
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: PLATFORM_COLOR_SOFT.replace('0.12', '0.1') }}
                      >
                        {GoalIcon ? <GoalIcon className="w-4 h-4" style={{ color: PLATFORM_COLOR }} /> : <Filter className="w-4 h-4" style={{ color: PLATFORM_COLOR }} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Кампанія #{cIdx + 1}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: 'hsl(120 50% 92%)', color: 'hsl(120 55% 28%)' }}>активна</span>
                        </div>
                        <div className="text-[13px] font-bold text-foreground truncate">{c.goalLabel}</div>
                        {c.subgoalLabel && <div className="text-[11px] text-muted-foreground truncate">{c.subgoalLabel}</div>}
                      </div>
                      {isInfobiz && (
                        <button
                          type="button"
                          onClick={() => {
                            if (c.key !== 'main') setActiveLeadType(c.key);
                            setActiveStep(3);
                          }}
                          className="text-[10px] font-semibold px-2 py-1 rounded border transition-colors shrink-0"
                          style={
                            campaignFunnelFormat
                              ? { color: 'hsl(220 10% 30%)', background: 'hsl(220 14% 96%)', borderColor: 'hsl(var(--border))' }
                              : { color: PLATFORM_COLOR, background: 'transparent', borderColor: PLATFORM_COLOR, borderStyle: 'dashed' }
                          }
                          title="Формат воронки"
                        >
                          {campaignFunnelFormat ? `🧩 ${campaignFunnelFormat}` : '+ Формат воронки'}
                        </button>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: 'hsl(220 14% 94%)', color: 'hsl(220 10% 40%)' }}>
                        {c.audiences.length} груп · {c.creoList.length} крео
                      </span>
                    </div>


                    {/* Audiences (Ad Sets) */}
                    <div className="pl-4 space-y-1.5 border-l-2 border-dashed" style={{ borderColor: 'hsl(214 89% 52% / 0.25)' }}>
                      {c.audiences.map((a, idx) => {
                        const setId = `${c.key}::${a.id || idx}`;
                        const isOpen = expandedAdSets.has(setId);
                        const linkedCreo = c.creoList.filter(x => x.audienceId === a.id);
                        return (
                          <div key={a.id || idx} className="space-y-1">
                            <div
                              className="group rounded-lg border p-2 flex items-center gap-2 hover:border-primary/50 transition-colors"
                              style={{ background: 'white', borderColor: isOpen ? 'hsl(214 89% 52% / 0.5)' : 'hsl(var(--border))' }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleAdSet(setId)}
                                className="flex-1 flex items-center gap-2 min-w-0 text-left"
                                title="Показати оголошення / ТЗ"
                              >
                                <ChevronRight
                                  className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform"
                                  style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
                                />
                                <span
                                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                  style={{ background: 'hsl(280 60% 96%)' }}
                                >
                                  <Users className="w-3.5 h-3.5" style={{ color: 'hsl(280 55% 45%)' }} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Група оголошень #{idx + 1}</span>
                                    <span className="text-[9px]">{a.mode === 'ai' ? '✨ AI' : '✍️'}</span>
                                  </div>
                                  <div className="text-[12px] font-semibold text-foreground truncate">{a.name || 'Без назви'}</div>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: 'hsl(220 14% 94%)', color: 'hsl(220 10% 40%)' }}>
                                  {linkedCreo.length} крео
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openAudienceView(c.key, idx)}
                                className="text-[10px] font-semibold px-2 py-1 rounded hover:bg-muted transition-colors"
                                style={{ color: 'hsl(220 10% 40%)' }}
                                title="Переглянути аудиторію"
                              >
                                Деталі
                              </button>
                              <AddBtn label="Крео" onClick={() => openCreoCreate(c.key, a.id)} />
                            </div>

                            {isOpen && (
                              <div className="pl-6 space-y-1 border-l-2 border-dashed ml-3 py-1" style={{ borderColor: 'hsl(280 55% 60% / 0.25)' }}>
                                {linkedCreo.length === 0 ? (
                                  <div className="text-[11px] text-muted-foreground italic px-2 py-1.5">
                                    Ще немає оголошень. Натисніть <span className="font-semibold">+ Крео</span>, щоб додати ТЗ.
                                  </div>
                                ) : linkedCreo.map((cr) => {
                                  const globalIdx = c.creoList.indexOf(cr);
                                  const fmt = formatMeta[cr.format] || { icon: '📝', label: 'Крео' };
                                  const title = cr.fields?.h1 || cr.fields?.script?.slice(0, 40) || fmt.label;
                                  return (
                                    <button
                                      key={globalIdx}
                                      type="button"
                                      onClick={() => openCreoView(c.key, globalIdx)}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border bg-white hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                      style={{ borderColor: 'hsl(var(--border))' }}
                                    >
                                      <span className="w-6 h-6 rounded flex items-center justify-center text-[12px] shrink-0" style={{ background: 'hsl(35 80% 94%)' }}>
                                        {fmt.icon}
                                      </span>
                                      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">ТЗ #{globalIdx + 1}</span>
                                      <span className="text-[11px] font-semibold text-foreground flex-1 truncate">{title}</span>
                                      <span className="text-[9px] font-medium text-muted-foreground shrink-0">{fmt.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="pt-0.5">
                        <AddBtn subtle label="Створити групу оголошень" onClick={() => openAudienceDialog(c.key, 'choose')} />
                      </div>

                      {/* Orphan creo for this campaign */}
                      {(() => {
                        const orphans = c.creoList.filter(x => !x.audienceId || !c.audiences.some(a => a.id === x.audienceId));
                        if (orphans.length === 0) return null;
                        return (
                          <div className="pt-2 space-y-1">
                            <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Оголошення без групи</div>
                            {orphans.map((cr) => {
                              const globalIdx = c.creoList.indexOf(cr);
                              const fmt = formatMeta[cr.format] || { icon: '📝', label: 'Крео' };
                              const title = cr.fields?.h1 || cr.fields?.script?.slice(0, 40) || fmt.label;
                              return (
                                <button
                                  key={globalIdx}
                                  type="button"
                                  onClick={() => openCreoView(c.key, globalIdx)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border bg-white hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                  style={{ borderColor: 'hsl(var(--border))' }}
                                >
                                  <span className="w-6 h-6 rounded flex items-center justify-center text-[12px] shrink-0" style={{ background: 'hsl(35 80% 94%)' }}>
                                    {fmt.icon}
                                  </span>
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">#{globalIdx + 1}</span>
                                  <span className="text-[11px] font-semibold text-foreground flex-1 truncate">{title}</span>
                                  <span className="text-[9px] font-medium text-muted-foreground shrink-0">{fmt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 text-[10px] text-muted-foreground" style={{ background: 'hsl(220 20% 98%)' }}>
              <span>Структура акаунту: {campaigns.length} {campaigns.length === 1 ? 'кампанія' : 'кампаній'} · {totalAudiences} груп · {totalCreo} оголошень</span>
              <button
                type="button"
                onClick={() => openAudienceDialog(campaigns[0]?.key || 'main', 'list')}
                className="text-[10px] font-semibold hover:underline"
                style={{ color: PLATFORM_COLOR }}
              >
                Відкрити менеджер аудиторій →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };









  const update = (u: Partial<Scenario>) => updateScenario(id!, u);

  // Every campaign needs at least one audience and three creatives ready
  // before the marketer is allowed to actually launch the project — an
  // empty ad account isn't something a real launch could happen from.
  const getUnreadyCampaigns = (): string[] => {
    const keys: string[] = scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 0
      ? scenario.leadTypes!
      : [activeLeadType || 'main'];
    return keys.filter(key => {
      const rawCreo = (scenario as any)?.creoBriefs?.[key];
      const creoList = Array.isArray(rawCreo) ? rawCreo : (rawCreo?.format ? [rawCreo] : []);
      const rawAud = (scenario as any)?.audienceSettings?.[key];
      const audiences = Array.isArray(rawAud) ? rawAud : (rawAud && (rawAud.tips || rawAud.checks) ? [{ id: 'legacy' }] : []);
      return audiences.length < 1 || creoList.length < 3;
    }).map(key => (key === 'main' ? '' : (LEAD_TYPES.find(l => l.value === key)?.label || key)));
  };

  const startLaunch = () => {
    const unready = getUnreadyCampaigns();
    if (unready.length > 0) {
      toast({
        title: 'Рекламний кабінет ще не готовий',
        description: `Перед запуском потрібно мінімум 1 аудиторія і 3 крео на кожну кампанію${unready.some(Boolean) ? ` (бракує: ${unready.filter(Boolean).join(', ')})` : ''}.`,
        variant: 'destructive',
      });
      return;
    }
    setLaunchWeek(1);
    setLaunchProblem(buildLaunchProblem('ctr_low'));
    setLaunchFeedback(null);
    setLaunchPhase('launching');
    setLaunchResultOpen(true);
    setTimeout(() => setLaunchPhase('week'), 1800);
  };

  const advanceLaunchWeek = () => {
    const nextWeek = launchWeek + 1;
    if (nextWeek > 4) {
      setLaunchPhase('month_success');
      return;
    }
    setLaunchWeek(nextWeek);
    setLaunchFeedback(null);
    const calm = Math.random() < 0.25;
    if (calm) {
      setLaunchProblem(null);
      setLaunchPhase('week');
      // Спокійний тиждень без проблем — рухаємось далі автоматично
      setTimeout(() => advanceLaunchWeekRef.current(), 2500);
      return;
    }
    const previousType = launchProblem?.type;
    const candidates = LAUNCH_PROBLEM_TYPES.filter(t => t !== previousType);
    const pool = candidates.length > 0 ? candidates : LAUNCH_PROBLEM_TYPES;
    setLaunchProblem(buildLaunchProblem(pool[Math.floor(Math.random() * pool.length)]));
    setLaunchPhase('week');
  };
  const advanceLaunchWeekRef = useRef(advanceLaunchWeek);
  advanceLaunchWeekRef.current = advanceLaunchWeek;

  const handleLaunchAction = (actionKey: LaunchActionKey) => {
    if (!launchProblem) {
      advanceLaunchWeek();
      return;
    }
    if (actionKey === 'continue') {
      const improved = Math.random() < 0.3;
      if (improved) {
        setLaunchFeedback(LAUNCH_ACTION_SUCCESS_TEXT.continue);
        setLaunchPhase('resolved');
        setTimeout(advanceLaunchWeek, 1800);
      } else {
        setLaunchFeedback('Ви не втручались — ситуація погіршилась, потрібна реакція.');
      }
      return;
    }
    const isCorrect = LAUNCH_CORRECT_FIX[launchProblem.type].includes(actionKey);
    const luckyFix = !isCorrect && Math.random() < 0.4;
    if (isCorrect || luckyFix) {
      setLaunchFeedback(isCorrect ? LAUNCH_ACTION_SUCCESS_TEXT[actionKey] : 'Дія була не зовсім очікуваною, але ситуація все ж вирівнялась.');
      setLaunchPhase('resolved');
      setTimeout(advanceLaunchWeek, 1800);
    } else {
      setLaunchFeedback('Дія не дала бажаного ефекту — проблема лишається, треба щось інше.');
    }
  };

  const finishLaunchedProject = () => {
    update({ status: 'completed', monthSurvived: launchPhase === 'month_success' });
    setLaunchResultOpen(false);
    navigate('/');
  };

  // Whether any progress exists downstream of the traffic-source step (2..8)
  // that would be invalidated by switching platforms.
  const hasDownstreamProgress = (): boolean => {
    if (scenario.channel) return true;
    for (const key of savedSteps) {
      const stepNum = parseInt(key.split(':')[0], 10);
      if (stepNum >= 2) return true;
    }
    return false;
  };

  const handleLeadSourceSelect = (value: string) => {
    if (scenario.leadSource === value) return;
    if (scenario.leadSource && hasDownstreamProgress()) {
      setPendingLeadSourceSwitch(value);
      return;
    }
    update({ leadSource: value });
  };

  const confirmLeadSourceSwitch = () => {
    if (!pendingLeadSourceSwitch) return;
    update({
      leadSource: pendingLeadSourceSwitch,
      channel: '',
      awarenessType: '',
      trafficType: '',
      engagementType: '',
      salesType: '',
      leadTypes: [],
      funnelFormat: '',
      decomposition: createDefaultDecompSet(),
      decompositionsByType: {},
      leadDestinations: [],
      crmSystem: '',
      integrationMethod: '',
      companyDescription: '',
      salesChannel: '',
      salesChannelOther: '',
      retention: { emailCount: 0, telegramCount: 0, smsCount: 0, pushCount: 0 },
      branchData: {},
      aiCache: {},
      audienceSettings: {},
      creoBriefs: {},
    } as Partial<Scenario>);
    aiCacheRef.current = {};
    setAudienceChecks({});
    setSavedSteps(prev => {
      const next = new Set<string>();
      prev.forEach(key => {
        const stepNum = parseInt(key.split(':')[0], 10);
        if (stepNum < 2) next.add(key);
      });
      return next;
    });
    setSkippedSteps(new Set());
    setActiveLeadType('');
    setPendingLeadSourceSwitch(null);
  };

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

  const updateDecomp = (type: 'bad' | 'realistic' | 'positive', field: keyof DecompositionScenario, rawValue: number) => {
    const value = Math.max(0, Number.isFinite(rawValue) ? rawValue : 0);

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

  

  const buildScenarioFromAi = (s: any, budget: number): DecompositionScenario => {
    const cpm = Number(s?.cpm) || 0;
    const ctr = Number(s?.ctr) || 0;
    const cpc = cpm > 0 && ctr > 0 ? cpm / (ctr / 100) / 1000 : 0;
    const landingConversion = Number(s?.landingConversion) || 0;
    const conversionRate = Number(s?.conversionRate) || 0;
    const averageCheck = Number(s?.averageCheck) || 0;
    const marginality = Number(s?.marginality) || 0;
    // Derive CPL: leads = impressions * ctr * landingConv
    const impressions = cpm > 0 ? (budget / cpm) * 1000 : 0;
    const leads = impressions * (ctr / 100) * (landingConversion / 100);
    const cpl = leads > 0 ? budget / leads : 0;
    return { cpm, ctr, cpc, cpl, landingConversion, conversionRate, averageCheck, marginality, budget };
  };

  const fillBenchmarksStatic = (): DecompositionSet => {
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
        averageCheck: bench.averageCheck || 75,
        marginality: bench.marginality || 30,
        budget,
      };
      d.cpc = d.cpm / ((d.ctr || 1) / 100) / 1000;
      return d;
    };
    const baseBudget = (isBranching && activeLeadType
      ? getBranch().decomposition.realistic.budget
      : scenario.decomposition.realistic.budget) || 10000;
    return {
      bad: make({ cpm: 1.3, ctr: 0.7, cpl: 1.5, conv: 0.65 }, baseBudget),
      realistic: make({ cpm: 1, ctr: 1, cpl: 1, conv: 1 }, baseBudget),
      positive: make({ cpm: 0.7, ctr: 1.5, cpl: 0.6, conv: 1.6 }, baseBudget),
    };
  };

  const fillBenchmarks = async () => {
    if (fillBenchLoading) return;
    const baseBudget = (isBranching && activeLeadType
      ? getBranch().decomposition.realistic.budget
      : scenario.decomposition.realistic.budget) || 10000;
    const cacheKey = `decomp:ai:${scenario.niche || ''}:${scenario.channel || ''}:${activeLeadType || (scenario.leadTypes?.[0] || '')}:${baseBudget}`;
    const applySet = (set: DecompositionSet) => {
      if (isBranching && activeLeadType) updateBranch({ decomposition: set });
      else update({ decomposition: set });
    };

    // Try cache
    const cached = aiCacheRef.current[cacheKey];
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        applySet({
          bad: buildScenarioFromAi(parsed.bad, baseBudget),
          realistic: buildScenarioFromAi(parsed.realistic, baseBudget),
          positive: buildScenarioFromAi(parsed.positive, baseBudget),
        });
        toast({ title: 'Заповнено AI', description: 'Дані з ринку (кеш). Перевірте та коригуйте.' });
        return;
      } catch {}
    }

    setFillBenchLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decomposition-fill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          niche: scenario.niche,
          channel: scenario.channel,
          leadType: activeLeadType || (scenario.leadTypes?.[0] || ''),
          budget: baseBudget,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI помилка' }));
        toast({ title: 'AI недоступний', description: (err.error || 'Заповнюю середні бенчмарки'), variant: 'destructive' });
        applySet(fillBenchmarksStatic());
        return;
      }
      const data = await resp.json();
      const sc = data.scenarios;
      if (!sc?.realistic) {
        applySet(fillBenchmarksStatic());
        return;
      }
      setAiCache(cacheKey, JSON.stringify(sc));
      applySet({
        bad: buildScenarioFromAi(sc.bad, baseBudget),
        realistic: buildScenarioFromAi(sc.realistic, baseBudget),
        positive: buildScenarioFromAi(sc.positive, baseBudget),
      });
      toast({ title: 'Заповнено AI', description: 'Реалістичні дані з ринку. Перевірте та коригуйте.' });
    } catch (e: any) {
      toast({ title: 'Помилка', description: e?.message || 'Збій', variant: 'destructive' });
      applySet(fillBenchmarksStatic());
    } finally {
      setFillBenchLoading(false);
    }
  };

  const cloneDecompSet = (set: DecompositionSet): DecompositionSet => ({
    bad: { ...set.bad },
    realistic: { ...set.realistic },
    positive: { ...set.positive },
  });

  const hasDecompProgress = (set?: DecompositionSet) => {
    if (!set) return false;
    return (['bad', 'realistic', 'positive'] as const).some(key => {
      const d = set[key];
      return [d.cpm, d.ctr, d.cpc, d.cpl, d.landingConversion, d.conversionRate, d.averageCheck, d.marginality]
        .some(v => Number(v) > 0);
    });
  };

  const hasRetentionProgress = (ret?: BranchData['retention']) => !!ret &&
    [ret.emailCount, ret.telegramCount, ret.smsCount, ret.pushCount].some(v => Number(v) > 0);

  const hasScopedValue = (value: unknown) => {
    if (Array.isArray(value)) return value.length > 0;
    return !!value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0;
  };

  const cloneScopedValue = <T,>(value: T): T => {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  };

  const performLeadTypeToggle = (lt: string) => {
    const current = scenario.leadTypes || [];
    const newTypes = current.includes(lt) ? current.filter(t => t !== lt) : [...current, lt];
    const newBranchData = { ...(scenario.branchData || {}) };
    const newAudienceSettings: Record<string, unknown> = { ...((scenario as any).audienceSettings || {}) };
    const newCreoBriefs: Record<string, unknown> = { ...((scenario as any).creoBriefs || {}) };

    // When transitioning from single-branch mode (≤1 leadType) to multi-branch (>1),
    // seed the pre-existing branch(es) with the top-level scenario setup + prep history
    // so previously configured decomposition / audiences / creatives aren't lost.
    const wasSingle = current.length <= 1;
    const willBeMulti = newTypes.length > 1;
    if (wasSingle && willBeMulti) {
      current.forEach(existingLt => {
        const existing = newBranchData[existingLt];
        const seeded: BranchData = { ...createDefaultBranchData(), ...(existing || {}) };
        if (!seeded.funnelFormat && scenario.funnelFormat) seeded.funnelFormat = scenario.funnelFormat;
        if (!hasDecompProgress(seeded.decomposition) && hasDecompProgress(scenario.decomposition)) {
          seeded.decomposition = cloneDecompSet(scenario.decomposition);
        }
        if ((!seeded.leadDestinations || seeded.leadDestinations.length === 0) && scenario.leadDestinations?.length) {
          seeded.leadDestinations = [...scenario.leadDestinations];
        }
        if (!seeded.integrationMethod && scenario.integrationMethod) seeded.integrationMethod = scenario.integrationMethod;
        if (!seeded.companyDescription && scenario.companyDescription) seeded.companyDescription = scenario.companyDescription;
        if (!seeded.salesChannel && scenario.salesChannel) seeded.salesChannel = scenario.salesChannel;
        if (!seeded.salesChannelOther && scenario.salesChannelOther) seeded.salesChannelOther = scenario.salesChannelOther;
        if (!hasRetentionProgress(seeded.retention) && hasRetentionProgress(scenario.retention)) {
          seeded.retention = { ...scenario.retention };
        }
        newBranchData[existingLt] = seeded;

        const scopedSourceKeys = [existingLt, activeLeadType, 'main'].filter(Boolean);
        const audienceSource = scopedSourceKeys.find(key => hasScopedValue(newAudienceSettings[key]));
        if (!hasScopedValue(newAudienceSettings[existingLt]) && audienceSource) {
          newAudienceSettings[existingLt] = cloneScopedValue(newAudienceSettings[audienceSource]);
        }
        const checksKey = `${existingLt}__checks`;
        const checksSource = [`${existingLt}__checks`, activeLeadType ? `${activeLeadType}__checks` : '', 'main__checks']
          .filter(Boolean)
          .find(key => hasScopedValue(newAudienceSettings[key]));
        if (!hasScopedValue(newAudienceSettings[checksKey]) && checksSource) {
          newAudienceSettings[checksKey] = cloneScopedValue(newAudienceSettings[checksSource]);
        }
        const creoSource = scopedSourceKeys.find(key => hasScopedValue(newCreoBriefs[key]));
        if (!hasScopedValue(newCreoBriefs[existingLt]) && creoSource) {
          newCreoBriefs[existingLt] = cloneScopedValue(newCreoBriefs[creoSource]);
        }
      });
    }

    newTypes.forEach(t => {
      if (!newBranchData[t]) newBranchData[t] = createDefaultBranchData();
    });
    Object.keys(newBranchData).forEach(k => {
      if (!newTypes.includes(k)) delete newBranchData[k];
    });
    const nextScenarioForCompletion = {
      ...(scenario as any),
      leadTypes: newTypes,
      branchData: newBranchData,
      audienceSettings: newAudienceSettings,
      creoBriefs: newCreoBriefs,
    } as Scenario;
    update({
      leadTypes: newTypes,
      branchData: newBranchData,
      audienceSettings: newAudienceSettings,
      creoBriefs: newCreoBriefs,
    } as any);
    if (wasSingle && willBeMulti) {
      setSavedSteps(prev => {
        const next = new Set(prev);
        current.forEach(existingLt => {
          [3, 4, 5, 6, 7, 8].forEach(step => {
            if ((step === 3 && scenario.niche !== 'Інфобізнес') || prev.has(String(step)) || isStepCompletedForBranch(nextScenarioForCompletion, step, existingLt)) {
              next.add(`${step}:${existingLt}`);
            }
          });
        });
        return next;
      });
    }
    if (newTypes.length > 0 && !newTypes.includes(activeLeadType)) {
      setActiveLeadType(newTypes[0]);
    }
  };

  const toggleLeadType = (lt: string) => {
    const current = scenario.leadTypes || [];
    if (current.includes(lt)) {
      setPendingRemoveLeadType(lt);
      return;
    }
    performLeadTypeToggle(lt);
  };


  const toggleLeadDest = (dest: string) => {
    if (isBranching && activeLeadType) {
      const branch = getBranch();
      const current = branch.leadDestinations;
      updateBranch({ leadDestinations: current.includes(dest) ? [] : [dest] });
    } else {
      const current = scenario.leadDestinations;
      update({ leadDestinations: current.includes(dest) ? [] : [dest] });
    }
  };

  // Get the right lead destinations for current context
  const currentLeadDestinations = isBranching && activeLeadType ? getBranch().leadDestinations : scenario.leadDestinations;
  const currentIntegrationMethod = isBranching && activeLeadType ? getBranch().integrationMethod : scenario.integrationMethod;
  const currentCompanyDescription = isBranching && activeLeadType ? getBranch().companyDescription : scenario.companyDescription;
  const currentRetention = isBranching && activeLeadType ? getBranch().retention : scenario.retention;
  const currentSalesChannel: string = (isBranching && activeLeadType ? (getBranch() as any).salesChannel : (scenario as any).salesChannel) || '';
  const currentSalesChannelOther: string = (isBranching && activeLeadType ? (getBranch() as any).salesChannelOther : (scenario as any).salesChannelOther) || '';
  const setSalesChannelVal = (val: string) => {
    if (isBranching && activeLeadType) updateBranch({ salesChannel: val } as any);
    else update({ salesChannel: val } as any);
    setSalesProcessed(false);
  };
  const setSalesChannelOtherVal = (val: string) => {
    if (isBranching && activeLeadType) updateBranch({ salesChannelOther: val } as any);
    else update({ salesChannelOther: val } as any);
    setSalesProcessed(false);
  };
  const hasSalesChannel = !!currentSalesChannel && (currentSalesChannel !== 'other' || currentSalesChannelOther.trim().length > 0);

  function isSalesCompletedFor(s: Scenario, lt?: string): boolean {
    const branch = lt ? s.branchData?.[lt] : null;
    const salesChannel = (branch ? branch.salesChannel : s.salesChannel) || s.salesChannel || '';
    const salesChannelOther = (branch ? branch.salesChannelOther : s.salesChannelOther) || s.salesChannelOther || '';
    // Look for the processed flag under the explicit lead-type key, the implicit
    // single-leadType key, and the legacy 'main' key — saving paths differ
    // depending on whether the user was in a branching context at click time.
    const candidates = new Set<string>();
    candidates.add(`sales:processed:${lt || 'main'}`);
    candidates.add('sales:processed:main');
    (s.leadTypes || []).forEach(t => candidates.add(`sales:processed:${t}`));
    const cache = { ...(s.aiCache || {}), ...aiCacheRef.current };
    const salesProcessedSaved = Array.from(candidates).some(k => cache[k] === '1');
    const channelsWithoutItems = new Set(['auto_site', 'marketplaces']);
    const needsProcessing = !channelsWithoutItems.has(salesChannel);
    return !!salesChannel && (salesChannel !== 'other' || salesChannelOther.trim().length > 0) && (!needsProcessing || salesProcessedSaved);
  }




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
    const revenue = conversions * (decompSet.realistic.averageCheck || 50);
    return { total, opens, clicks, conversions, revenue };
  };

  // Check if a specific step is filled for a specific branch
  function isStepCompletedForBranch(s: Scenario, i: number, lt: string): boolean {
    const branch = s.branchData?.[lt];
    if (!branch) return false;
    switch (i) {
      case 3: return s.niche !== 'Інфобізнес' || !!branch.funnelFormat;
      case 4: return branch.decomposition.realistic.cpl > 0;
      case 5: return (branch.leadDestinations?.length || 0) > 0;
      case 6: return !!branch.integrationMethod;
      case 7: return isSalesCompletedFor(s, lt);
      case 8: return (branch.retention?.emailCount || 0) > 0;
      default: return false;
    }
  }

  function isStepCompletedStatic(s: Scenario, i: number): boolean {
    switch (i) {
      case 0: return !!s.niche;
      case 1: return !!s.leadSource;
      case 2: return !!s.channel && (s.channel !== 'leads' || (s.leadTypes && s.leadTypes.length > 0));
      case 3: {
        if (s.niche !== 'Інфобізнес') return true;
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => !!s.branchData?.[lt]?.funnelFormat);
        }
        return !!s.funnelFormat;
      }
      case 4: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 4, lt));
        }
        return s.decomposition.realistic.cpl > 0;
      }
      case 5: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 5, lt));
        }
        return s.leadDestinations.length > 0;
      }
      case 6: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 6, lt));
        }
        return !!s.integrationMethod;
      }
      case 7: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 7, lt));
        }
        return isSalesCompletedFor(s);
      }
      case 8: {
        if (s.channel === 'leads' && s.leadTypes && s.leadTypes.length > 1) {
          return s.leadTypes.every(lt => isStepCompletedForBranch(s, 8, lt));
        }
        return s.retention.emailCount > 0;
      }
      case 9: return s.status === 'completed';
      default: return false;
    }
  }

  // For shared steps (0-2) use global key, for branch steps (3+) branch-aware when branching
  const isStepCompleted = (i: number, branchLeadType?: string): boolean => {
    if (i < 3 || !isBranching) {
      const key = String(i);
      return (isStepCompletedStatic(scenario, i) || skippedSteps.has(key)) && savedSteps.has(key);
    }
    // Non-Інфобіз: step 3 auto-completed per branch — checked before we need a
    // concrete lt, since this shortcut doesn't depend on which branch is active.
    if (i === 3 && scenario.niche !== 'Інфобізнес') return true;
    // Branch-specific: check this specific branch
    const lt = branchLeadType || activeLeadType;
    if (!lt) return false;
    const key = `${i}:${lt}`;
    return (isStepCompletedForBranch(scenario, i, lt) || skippedSteps.has(key)) && savedSteps.has(key);
  };

  const isStepUnlocked = (i: number, branchLeadType?: string): boolean => {
    if (i === 0) return hasCompletedClientGate;
    if (i <= 2) return isStepCompleted(i - 1);
    if (i === 3) return isStepCompleted(2);
    // Висновок (Результат) розблоковується одразу після Продажів — Retention опціональний
    if (i === 9) return isStepCompleted(7, branchLeadType);
    return isStepCompleted(i - 1, branchLeadType);
  };

  const canSaveStep = (i: number, branchLeadType?: string): boolean => {
    if (i === 3 && scenario.niche === 'Інфобізнес') {
      if (isBranching) {
        const lt = branchLeadType || activeLeadType;
        if (!lt) return false;
        return !!scenario.branchData?.[lt]?.funnelFormat;
      }
      return !!scenario.funnelFormat;
    }
    if (i < 3 || !isBranching) {
      return isStepCompletedStatic(scenario, i);
    }
    const lt = branchLeadType || activeLeadType;
    if (!lt) return false;
    return isStepCompletedForBranch(scenario, i, lt);
  };

  const handleSaveStep = (step: number, opts?: { skipped?: boolean }) => {
    const branchSuffix = (step < 3 || !isBranching) ? '' : (activeLeadType ? `:${activeLeadType}` : '');
    const key = branchSuffix ? `${step}${branchSuffix}` : String(step);
    setSavedSteps(prev => {
      const next = new Set(prev);
      if (step < 3 || !isBranching) next.add(String(step));
      else if (activeLeadType) next.add(`${step}:${activeLeadType}`);
      return next;
    });
    setSkippedSteps(prev => {
      const next = new Set(prev);
      if (opts?.skipped) next.add(key); else next.delete(key);
      return next;
    });
    // Just close the panel after saving; don't auto-advance
    setActiveStep(null);
  };



  const RetentionArrow: React.FC = () => {
    const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    useEffect(() => {
      const container = document.getElementById('flow-container');
      if (!container) return;
      const salesNode = container.querySelector('[data-step-index="7"] button') as HTMLElement;
      const retentionNode = container.querySelector('[data-step-index="8"] button') as HTMLElement;
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
      className="flex flex-col items-center gap-1 flex-shrink-0 group"
      title="Урок від AdsSchool"
    >
      <span className="relative">
        <span className="block w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30 group-hover:scale-110 transition-transform">
          <img src={adsSchoolLogo} alt="Ads School" className="w-full h-full object-cover" />
        </span>
        <span
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-card"
          style={{ background: 'hsl(232 80% 60%)' }}
        >
          <Play className="w-2.5 h-2.5 text-white fill-white" />
        </span>
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide text-primary">Урок</span>
    </button>
  );

  const SaveButton: React.FC<{ step: number; sticky?: boolean; disabled?: boolean; label?: string }> = ({ step, disabled, label }) => (
    <div className="sticky bottom-0 bg-card pt-3 pb-2 -mx-4 px-4 border-t border-border mt-4 z-10">
      <Button
        onClick={() => handleSaveStep(step)}
        disabled={disabled !== undefined ? disabled : !canSaveStep(step, activeLeadType)}
        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
      >
        <Save className="w-4 h-4" /> {label || 'Зберегти та продовжити'}
      </Button>
    </div>
  );

  const renderPanel = () => {
    if (activeStep === null) return null;

    const stepContent = () => {
      switch (activeStep) {
        case 0:
          return (() => {
            const NICHE_CARDS = [
              { label: 'Послуги B2B', Icon: Briefcase },
              { label: 'Послуги B2C', Icon: Heart },
              { label: 'E-commerce', Icon: ShoppingBag },
              { label: 'Нерухомість', Icon: Home },
              { label: 'Інфобізнес', Icon: GraduationCap },
              { label: 'Інстаграм-крамниця', Icon: Instagram },
              { label: 'Стоматологія', Icon: Stethoscope },
              { label: 'Фітнес-студія', Icon: Dumbbell },
              
              { label: 'Бʼюті', Icon: Sparkle },
              { label: 'Автосервіс', Icon: Wrench },
              { label: 'Туризм', Icon: Plane },
              { label: 'Будівництво', Icon: HardHat },
            ];
            const selected = scenario.niche;
            const isCustom = selected && !NICHE_CARDS.some(c => c.label === selected);
            return (
              <div className="space-y-5">
                <h3 className="text-base font-bold text-foreground">Оберіть нішу або тип бізнесу</h3>
                <div className="grid grid-cols-2 gap-2">
                  {NICHE_CARDS.map(({ label, Icon }) => {
                    const active = selected === label;
                    return (
                      <button
                        key={label}
                        onClick={() => update({ niche: label })}
                        className={`h-28 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${active ? 'border-primary bg-primary/5' : 'border-border bg-secondary hover:border-primary/40'}`}
                      >
                        <Icon className={`w-6 h-6 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-semibold text-center ${active ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Свій варіант:</p>
                  <Input
                    value={isCustom ? selected : ''}
                    onChange={e => update({ niche: e.target.value })}
                    placeholder="Введіть свою нішу..."
                    className="bg-secondary border-border text-foreground text-base py-5 placeholder:text-muted-foreground"
                  />
                </div>



                <SaveButton step={0} />
              </div>
            );
          })();

        case 1:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Оберіть джерело трафіку</h3>
              <p className="text-xs text-muted-foreground">Оберіть рекламну платформу:</p>
              <div className="grid gap-2">
                {LEAD_SOURCES.map(src => {
                  const LogoIcon = src.LogoComponent === 'meta' ? MetaIcon : src.LogoComponent === 'tiktok' ? TikTokIcon : GoogleIcon;
                  return (
                    <button key={src.value} disabled={src.soon} onClick={() => handleLeadSourceSelect(src.value)}
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

              <div className="grid grid-cols-2 gap-4">
                {/* Left: main goals */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Основна ціль</p>
                  <div className="grid gap-2">
                    {CAMPAIGN_GOALS.map(goal => (
                      <button key={goal.value} onClick={() => update({ channel: goal.value })}
                        className={`p-3 rounded-lg border text-left text-sm transition-all flex items-center gap-3 ${
                          scenario.channel === goal.value
                            ? 'border-primary bg-accent text-accent-foreground font-semibold'
                            : 'border-border bg-card text-foreground hover:border-primary/40'
                        } cursor-pointer`}>
                        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                          <goal.Icon className="w-4 h-4 text-foreground" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-medium">{goal.label}</span>
                          <span className="text-[11px] text-muted-foreground font-normal leading-snug">{goal.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: optimization sub-goals */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Ціль для оптимізації</p>

                  {!scenario.channel && (
                    <div className="p-4 rounded-lg border border-dashed border-border text-xs text-muted-foreground text-center">
                      Спочатку оберіть основну ціль зліва
                    </div>
                  )}

                  {scenario.channel === 'awareness' && (
                    <div className="grid gap-2">
                      {AWARENESS_TYPES.map(at => (
                        <button key={at.value} onClick={() => update({ awarenessType: at.value } as any)}
                          className={`p-3 rounded-lg border text-left text-sm transition-all flex items-center gap-3 ${
                            (scenario as any).awarenessType === at.value
                              ? 'border-primary bg-accent text-accent-foreground font-semibold'
                              : 'border-border bg-card text-foreground hover:border-primary/40'
                          } cursor-pointer`}>
                          <span className="text-lg">{at.icon}</span>
                          <span className="leading-snug">{at.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {scenario.channel === 'traffic' && (
                    <div className="grid gap-2">
                      {TRAFFIC_TYPES.map(tt => (
                        <button key={tt.value} onClick={() => update({ trafficType: tt.value } as any)}
                          className={`p-3 rounded-lg border text-left text-sm transition-all flex items-start gap-3 ${
                            (scenario as any).trafficType === tt.value
                              ? 'border-primary bg-accent text-accent-foreground font-semibold'
                              : 'border-border bg-card text-foreground hover:border-primary/40'
                          } cursor-pointer`}>
                          <span className="text-lg leading-none mt-0.5">{tt.icon}</span>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium">{tt.label}</span>
                            <span className="text-[11px] text-muted-foreground font-normal leading-snug">{tt.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {scenario.channel === 'engagement' && (
                    <div className="grid gap-2">
                      {ENGAGEMENT_TYPES.map(et => (
                        <button key={et.value} onClick={() => update({ engagementType: et.value } as any)}
                          className={`p-3 rounded-lg border text-left text-sm transition-all flex items-start gap-3 ${
                            (scenario as any).engagementType === et.value
                              ? 'border-primary bg-accent text-accent-foreground font-semibold'
                              : 'border-border bg-card text-foreground hover:border-primary/40'
                          } cursor-pointer`}>
                          <span className="text-lg leading-none mt-0.5">{et.icon}</span>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium">{et.label}</span>
                            <span className="text-[11px] text-muted-foreground font-normal leading-snug">{et.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {scenario.channel === 'sales' && (
                    <div className="grid gap-2">
                      {SALES_TYPES.map(st => (
                        <button key={st.value} onClick={() => update({ salesType: st.value } as any)}
                          className={`p-3 rounded-lg border text-left text-sm transition-all flex items-start gap-3 ${
                            (scenario as any).salesType === st.value
                              ? 'border-primary bg-accent text-accent-foreground font-semibold'
                              : 'border-border bg-card text-foreground hover:border-primary/40'
                          } cursor-pointer`}>
                          <span className="text-lg leading-none mt-0.5">{st.icon}</span>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium">{st.label}</span>
                            <span className="text-[11px] text-muted-foreground font-normal leading-snug">{st.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {scenario.channel === 'leads' && (
                    <div className="grid gap-2">
                      <p className="text-[11px] text-muted-foreground">Можна обрати декілька типів лідгену:</p>
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
                  )}
                </div>
              </div>

              <SaveButton step={2} />
            </div>
          );


        case 3: {
          const isInfobiz = scenario.niche === 'Інфобізнес';
          const FUNNEL_FORMATS = [
            'Міні-курс',
            'Продаж в холодну "в лоб"',
            'Вебінарна воронка',
            'Особистий бренд (прогрів та продаж через Instagram)',
            'Через марафон',
            'Продаж та прогрів через Telegram-бот',
            'Квіз воронка (з балами / оферами)',
          ];
          const funnelFormat = (isBranching && activeLeadType
            ? (scenario.branchData?.[activeLeadType]?.funnelFormat || '')
            : (scenario.funnelFormat || ''));
          const formatVideos = funnelFormat ? (FORMAT_VIDEOS[funnelFormat] || []) : [];
          const setFunnelFormat = (f: string) => {
            if (isBranching && activeLeadType) updateBranch({ funnelFormat: f } as any);
            else update({ funnelFormat: f });
          };
          if (!isInfobiz) {
            return (
              <div className="space-y-4">
                <div className="space-y-2 border-2 border-dashed border-border rounded-lg p-4 bg-secondary/40">
                  <h3 className="text-base font-bold text-foreground">Деталізація формату</h3>
                  <p className="text-xs text-muted-foreground">
                    Цей модуль доступний лише для ніші <span className="font-semibold">Інфобізнес</span>. Натисніть «Зберегти та продовжити», щоб перейти до декомпозиції.
                  </p>
                </div>
                <SaveButton step={3} />
              </div>
            );
          }
          return (
            <div className="space-y-4">
              <div className="space-y-2 border-2 border-primary/30 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">Додатковий модуль</span>
                  <h3 className="text-base font-bold text-foreground">Деталізація · Формат воронки</h3>
                </div>
                <p className="text-xs text-muted-foreground">Оберіть формат воронки, з яким буде працювати інфобіз — від цього залежать туторіали та декомпозиція.</p>
                <div className="flex flex-col gap-2 w-full">
                  {FUNNEL_FORMATS.map(f => {
                    const vids = FORMAT_VIDEOS[f] || [];
                    const firstVid = vids[0];
                    return (
                      <div key={f} className="relative w-full">
                        <button
                          onClick={() => setFunnelFormat(f)}
                          className={`w-full block p-2.5 ${firstVid ? 'pr-12' : ''} rounded-lg border text-left text-sm transition-all ${
                            funnelFormat === f
                              ? 'border-primary bg-accent text-accent-foreground font-semibold'
                              : 'border-border bg-card text-foreground hover:border-primary/40'
                          }`}
                        >
                          {f}
                        </button>
                        {firstVid && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <VideoBadge url={firstVid.url} title={firstVid.title} size="sm" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="mt-1 p-2.5 rounded-lg border border-dashed border-border bg-card/60">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">Свій варіант</label>
                    <input
                      type="text"
                      value={FUNNEL_FORMATS.includes(funnelFormat) ? '' : funnelFormat}
                      onChange={(e) => setFunnelFormat(e.target.value)}
                      placeholder="Опишіть свій формат воронки..."
                      className="mt-1 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                {formatVideos.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">Туторіали по цьому формату</p>
                    {formatVideos.map((v, i) => (
                      <div key={i}
                        className="flex items-center gap-2 p-2 pr-2 rounded-lg border border-border bg-card hover:border-primary/40 transition-all">
                        <span className="text-xs font-medium text-foreground flex-1">{v.title}</span>
                        <VideoBadge url={v.url} title={v.title} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <SaveButton step={3} />
            </div>
          );
        }

        case 4: {
          const inputFields: { key: keyof DecompositionScenario; label: string; suffix: string }[] = [
            { key: 'budget', label: isTikTokSource ? 'TikTok Ad Бюджет' : 'FB Ad Бюджет', suffix: '$' },
            { key: 'cpm', label: 'CPM', suffix: '$' },
            { key: 'ctr', label: 'Ad CTR', suffix: '%' },
            { key: 'landingConversion', label: 'Конверсія перегляду → заявка', suffix: '%' },
            { key: 'conversionRate', label: 'Конверсія заявки → покупка', suffix: '%' },
            { key: 'averageCheck', label: 'Середній чек', suffix: '$' },
            { key: 'marginality', label: 'Маржинальність', suffix: '%' },
          ];
          const isInfobiz = scenario.niche === 'Інфобізнес';
          return (
            <div className="space-y-4">
              {isInfobiz && (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary hover:border-primary/40 transition-all">
                  <span className="text-xs font-medium text-foreground flex-1">{INFOBIZ_DECOMP_VIDEO.title}</span>
                  <VideoBadge url={INFOBIZ_DECOMP_VIDEO.url} title={INFOBIZ_DECOMP_VIDEO.title} size="sm" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  {isTikTokSource ? 'TIKTOK AD CALCULATOR' : 'META AD CALCULATOR'}
                </h3>
                <Button variant="secondary" size="sm" onClick={fillBenchmarks} disabled={fillBenchLoading} className="gap-1 text-xs">
                  {fillBenchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {fillBenchLoading ? 'Аналіз ринку…' : 'Авто (AI)'}
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
                    <Input type="number" min={0} value={currentDecomp[f.key] || ''}
                      onChange={e => updateDecomp(decompTab, f.key, Math.max(0, parseFloat(e.target.value) || 0))}
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
                    { label: 'CPC', value: `${metrics.cpc.toFixed(2)} $` },
                    { label: 'Всі заявки (ліди)', value: metrics.leads.toLocaleString() },
                    { label: 'Всі продажі', value: metrics.sales.toString() },
                    { label: 'CPA', value: `${metrics.cpa.toFixed(2)} $` },
                    { label: 'Чистий прибуток з 1 продажу', value: `${metrics.profitPerSale.toLocaleString()} $` },
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
                  { label: 'Прибуток', value: `${metrics.totalProfit.toLocaleString()} $`, color: metrics.totalProfit > 0 ? 'text-success' : 'text-destructive' },
                  { label: 'ROAS', value: `${metrics.roas.toFixed(2)}%`, color: metrics.roas > 100 ? 'text-success' : 'text-destructive' },
                  { label: 'Чистий дохід', value: `${metrics.netIncome.toLocaleString()} $`, color: metrics.netIncome > 0 ? 'text-success' : 'text-destructive' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-foreground">{row.label}</span>
                    <span className={`font-extrabold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <SaveButton step={4} />
            </div>
          );
        }


        case 5:
          return (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Куди надходять ліди?</h3>
              {isBranching && activeLeadType && (
                <Badge variant="secondary" className="text-xs">{LEAD_TYPES.find(l => l.value === activeLeadType)?.icon} {LEAD_TYPES.find(l => l.value === activeLeadType)?.label}</Badge>
              )}
              <p className="text-xs text-muted-foreground">Оберіть одну систему</p>
              <div className="grid gap-2">
                {LEAD_DESTINATIONS.map(d => {
                  const selected = currentLeadDestinations.includes(d.name);
                  const isRu = 'ruProduct' in d && d.ruProduct;
                  return (
                    <button key={d.name} onClick={() => toggleLeadDest(d.name)}
                      className={`p-2.5 rounded-lg border text-left text-sm transition-all flex items-center gap-2.5 ${
                        isRu
                          ? (selected ? 'border-2' : 'border')
                          : (selected
                              ? 'border-primary bg-accent text-accent-foreground font-semibold'
                              : 'border-border bg-card text-foreground hover:border-primary/40')
                      }`}
                      style={isRu ? {
                        borderColor: 'hsl(28 90% 55%)',
                        background: selected ? 'hsl(28 90% 95%)' : 'hsl(28 90% 98%)',
                      } : undefined}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected ? (isRu ? '' : 'border-primary') : 'border-muted-foreground/40'
                        }`}
                        style={selected && isRu ? { borderColor: 'hsl(28 90% 50%)' } : undefined}
                      >
                        {selected && <span className="w-2 h-2 rounded-full" style={{ background: isRu ? 'hsl(28 90% 50%)' : undefined }} />}
                      </span>
                      <span className={`flex-1 ${isRu ? 'font-medium' : ''}`} style={isRu ? { color: 'hsl(20 70% 30%)' } : undefined}>{d.name}</span>
                      {isRu && (
                        <span
                          title="Продукт розробника з РФ"
                          className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: 'hsl(28 90% 55%)', color: 'white' }}
                        >
                          рос. продукт
                        </span>
                      )}
                      {d.flag && <span title={d.flagTitle || undefined}>{d.flag}</span>}
                      {d.url && (
                        <span
                          role="link"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); window.open(d.url!, '_blank', 'noopener,noreferrer'); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); window.open(d.url!, '_blank', 'noopener,noreferrer'); } }}
                          title={`Відкрити сайт ${d.name}`}
                          className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <SaveButton step={5} />
            </div>
          );

        case 6:
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
              <SaveButton step={6} />
            </div>
          );

        case 7: {
          const charCount = (currentCompanyDescription || '').length;
          const canProcess = true;
          const ITEMS_BY_CHANNEL: Record<string, Array<{ icon: string; title: string; type: string }>> = {
            direct_social: [{ icon: '💬', title: 'Скрипт переписки', type: 'chat-script' }],
            sales_dept: [
              { icon: '📞', title: 'Скрипт дзвінка', type: 'call-script' },
              { icon: '💬', title: 'Скрипт переписки', type: 'chat-script' },
            ],
            combined: [
              { icon: '📞', title: 'Скрипт дзвінка', type: 'call-script' },
              { icon: '💬', title: 'Скрипт переписки', type: 'chat-script' },
            ],
            messengers: [{ icon: '💬', title: 'Скрипт переписки', type: 'chat-script' }],
            other: [
              { icon: '📞', title: 'Скрипт дзвінка', type: 'call-script' },
              { icon: '💬', title: 'Скрипт переписки', type: 'chat-script' },
            ],
            auto_site: [],
            marketplaces: [],
          };
          const salesItems = ITEMS_BY_CHANNEL[currentSalesChannel] || [];
          const channelCacheKey = currentSalesChannel || 'none';
          const isSalesItemDone = (type: string) => {
            const aiKey = `sales:${type}:${activeLeadType || 'main'}:${channelCacheKey}`;
            const manualKey = `sales:manual:${type}:${activeLeadType || 'main'}:${channelCacheKey}`;
            return !!aiCacheRef.current[aiKey] || aiCacheRef.current[manualKey] === '1';
          };
          const toggleSalesItemManual = (type: string) => {
            const manualKey = `sales:manual:${type}:${activeLeadType || 'main'}:${channelCacheKey}`;
            const isChecked = aiCacheRef.current[manualKey] === '1';
            aiCacheRef.current[manualKey] = isChecked ? '' : '1';
            if (id) updateScenario(id, { aiCache: { ...aiCacheRef.current } });
          };
          const allItemsFilled = salesItems.length === 0
            ? true
            : salesItems.every(s => isSalesItemDone(s.type));
          const noItemsChannel = hasSalesChannel && salesItems.length === 0;
          return (
            <div className="space-y-4 pb-16 relative">
              <h3 className="text-base font-bold text-foreground">Продажі</h3>
              {isBranching && activeLeadType && (
                <Badge variant="secondary" className="text-xs">{LEAD_TYPES.find(l => l.value === activeLeadType)?.icon} {LEAD_TYPES.find(l => l.value === activeLeadType)?.label}</Badge>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Як бізнес продає?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SALES_CHANNELS.map(c => {
                    const active = currentSalesChannel === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSalesChannelVal(c.value)}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-secondary text-foreground hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base leading-none">{c.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{c.label}</div>
                            {c.desc && <div className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</div>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {currentSalesChannel === 'other' && (
                  <Input
                    value={currentSalesChannelOther}
                    onChange={e => setSalesChannelOtherVal(e.target.value)}
                    placeholder="Опишіть свій канал продажів..."
                    className="bg-secondary border-border text-foreground h-9 text-sm mt-2"
                  />
                )}
              </div>

              {hasSalesChannel && salesItems.length > 0 && !salesProcessed && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setSalesProcessed(true)} className="gap-1.5 text-xs bg-primary text-primary-foreground">
                    <Sparkles className="w-3 h-3" /> Обробити
                  </Button>
                </div>
              )}
              {salesProcessed && salesItems.length > 0 && (
                <div className="space-y-3">
                  {salesItems.map(s => {
                    const hasCached = !!aiCacheRef.current[`sales:${s.type}:${activeLeadType || 'main'}:${channelCacheKey}`];
                    const manualKey = `sales:manual:${s.type}:${activeLeadType || 'main'}:${channelCacheKey}`;
                    const isManualChecked = aiCacheRef.current[manualKey] === '1';
                    const isDone = hasCached || isManualChecked;
                    return (
                      <div key={s.type} className="bg-secondary rounded-lg p-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 cursor-pointer shrink-0" title="Позначити вручну без AI">
                          <input
                            type="checkbox"
                            checked={isManualChecked}
                            disabled={hasCached}
                            onChange={() => toggleSalesItemManual(s.type)}
                            className="w-4 h-4 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </label>
                        <span className="font-semibold text-foreground text-sm flex items-center gap-2 flex-1 min-w-0">
                          {s.icon} {s.title}
                          {isDone && (
                            <span className="text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-full shrink-0">
                              ✓ {hasCached ? 'збережено' : 'вручну'}
                            </span>
                          )}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-xs shrink-0"
                          disabled={!hasSalesChannel}
                          onClick={() => fetchSalesRecommendation(s.type, `${s.icon} ${s.title}`)}
                        >
                          <Sparkles className="w-3 h-3" /> {hasCached ? 'Переглянути' : 'AI-поради'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <SaveButton
                step={7}
                sticky
                label={salesItems.length > 0 ? 'Відправити рекомендації клієнту' : 'Зберегти та продовжити'}
                disabled={
                  !hasSalesChannel ||
                  (salesItems.length > 0 && (!salesProcessed || !allItemsFilled))
                }
              />
            </div>
          );
        }

        case 8: {
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
                <Popover onOpenChange={(open) => { if (open) fetchEmailStrategy(); }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2 h-8 text-xs gap-1.5"
                      disabled={!currentRetention.emailCount}>
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Стратегія
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-[420px] max-h-[70vh] overflow-y-auto p-4 bg-card border-border">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm text-foreground">Email-стратегія{scenario.niche ? ` для «${scenario.niche}»` : ''}</h4>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
                          onClick={() => fetchEmailStrategy({ force: true })}
                          disabled={emailStrategyLoading}>
                          ↻
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        База: <span className="font-semibold text-foreground">{currentRetention.emailCount || 0}</span> контактів. Аналіз від AI email-маркетолога під ваш бриф.
                      </p>
                      {emailStrategyLoading && !emailStrategyText && (
                        <div className="text-xs text-muted-foreground py-6 text-center">
                          <Sparkles className="w-4 h-4 text-primary inline-block animate-pulse mr-2" />
                          Готую персональну стратегію…
                        </div>
                      )}
                      {emailStrategyText && (
                        <div className="prose prose-sm max-w-none text-xs text-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_p]:my-1 [&_strong]:text-foreground">
                          <ReactMarkdown>{stripJsonBlock(emailStrategyText)}</ReactMarkdown>
                        </div>
                      )}
                      {emailSummary && !emailStrategyLoading && (
                        <div className="mt-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wide">
                            <Sparkles className="w-3.5 h-3.5" /> Висновок AI
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-background border border-border p-2">
                              <div className="text-[10px] text-muted-foreground uppercase">Відправлено листів / міс</div>
                              <div className="text-lg font-bold text-foreground">{emailSummary.emailsSent.toLocaleString('uk-UA')}</div>
                            </div>
                            <div className="rounded-md bg-background border border-border p-2">
                              <div className="text-[10px] text-muted-foreground uppercase">Торкань / контакт</div>
                              <div className="text-lg font-bold text-foreground">{emailSummary.touchesPerContact}</div>
                            </div>
                          </div>
                          {emailSummary.conclusion && (
                            <p className="text-xs text-foreground leading-relaxed">{emailSummary.conclusion}</p>
                          )}
                        </div>
                      )}
                      {!emailStrategyLoading && !emailStrategyText && (
                        <p className="text-xs text-muted-foreground">Введіть кількість контактів і натисніть «Стратегія».</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

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

              {currentRetention.emailCount > 0 && emailScenarios && (
                <div className="space-y-2">
                  <div className="text-[11px] text-primary flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Заповнено AI email-маркетологом
                  </div>
                  {[
                    { key: 'bad' as const, label: '😟 Поганий' },
                    { key: 'real' as const, label: '📊 Реалістичний' },
                    { key: 'opt' as const, label: '🚀 Оптимістичний' },
                  ].map(s => {
                    const ai = emailScenarios[s.key];
                    return (
                      <div key={s.label} className="bg-secondary rounded-lg p-3">
                        <h4 className="font-semibold text-foreground text-sm">{s.label}</h4>
                        <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-1">
                          <span>Open: {ai.openRate}%</span>
                          <span>Кліки: {ai.clicks.toLocaleString()}</span>
                          <span>Конверсії: {ai.conversions.toLocaleString()}</span>
                          <span className="font-bold text-foreground">Дохід: {ai.revenue.toLocaleString()} $</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {currentRetention.emailCount > 0 && !emailScenarios && (
                <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 border border-dashed border-border">
                  Натисніть «Стратегія», щоб AI email-маркетолог прорахував сценарії під вашу базу та бриф.
                </div>
              )}
              <div className="sticky bottom-0 bg-card pt-3 pb-2 -mx-4 px-4 border-t border-border mt-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSaveStep(8, { skipped: true })}
                  className="flex-1 gap-2"
                >
                  <SkipForward className="w-4 h-4" /> Пропустити
                </Button>
                <Button
                  onClick={() => handleSaveStep(8)}
                  disabled={!canSaveStep(8, activeLeadType)}
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  <Save className="w-4 h-4" /> Зберегти та продовжити
                </Button>
              </div>

            </div>
          );
        }

        case 9: {
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
                    <p className="font-semibold text-foreground">{decompSet.realistic.budget.toLocaleString()} $</p>
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
                        <b className={s.m.netIncome >= 0 ? 'text-success' : 'text-destructive'}>{s.m.netIncome.toLocaleString()} $</b>
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

              <div className="sticky bottom-0 bg-card pt-3 pb-2 -mx-4 px-4 border-t border-border mt-4 z-10 space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-primary text-primary hover:bg-primary/5 font-bold"
                  onClick={sendToCurator}
                >
                  📤 Відправити куратору
                </Button>
                <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                  onClick={startLaunch}>
                  🚀 Запустити проект
                </Button>
                {getUnreadyCampaigns().length > 0 && (
                  <p className="text-xs text-warning text-center">
                    ⚠️ Потрібно мінімум 1 аудиторія і 3 крео на кожну кампанію
                  </p>
                )}
              </div>
            </div>
          );
        }

        default: return null;
      }
    };

    return (
      <div ref={panelRef} className={`bg-card border-l border-y border-border rounded-l-2xl shadow-2xl ${activeStep === 2 ? 'w-[760px]' : 'w-[460px]'} h-full overflow-y-auto`}>
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between rounded-tl-2xl z-10">
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
            {(STEP_VIDEOS[activeStep] || []).length > 0 && <AdschoolVideoButton step={activeStep} />}
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

          {/* Top-left plates */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
            {clientActions.has('brief') && scenario.clientBrief && (
              <button
                type="button"
                onClick={() => setFilledBriefOpen(true)}
                className="flex items-center gap-2 px-3 h-10 rounded-full bg-card border border-border shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-primary"
                title="Бриф заповнено — натисніть, щоб переглянути"
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs font-semibold">Бриф</span>
              </button>
            )}

            {clientActions.has('brief') && clientActions.has('payment') && (() => {
              const materials = [
                ...REQUIRED_MATERIALS,
                ...(scenario.niche ? TRAFFIC_STRATEGY_MATERIALS : []),
              ];
              return (
                <button
                  type="button"
                  onClick={() => setMaterialsOpen(true)}
                  className="flex items-center gap-2 px-3 h-10 rounded-full bg-card border border-border shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-primary"
                  title="Матеріали, які треба переглянути перед стартом роботи"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-semibold">Матеріали для перегляду</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">{materials.length}</span>
                </button>
              );
            })()}

            {(() => {
              const skills: { title: string; url: string }[] = [];
              const seen = new Set<string>();
              const push = (v: { title: string; url: string }) => {
                if (v && v.url && !seen.has(v.url) && !v.url.startsWith('https://ads-school.online')) {
                  seen.add(v.url);
                  skills.push(v);
                }
              };
              if (scenario.niche === 'Інфобізнес') push(INFOBIZ_DECOMP_VIDEO);
              if (scenario.funnelFormat) (FORMAT_VIDEOS[scenario.funnelFormat] || []).forEach(push);
              if (skills.length === 0) return null;
              return (
                <button
                  type="button"
                  onClick={() => setSkillsOpen(true)}
                  className="flex items-center gap-2 px-3 h-10 rounded-full bg-card border border-border shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-primary"
                  title="Відео, які треба переглянути, щоб запустити цю воронку"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span className="text-xs font-semibold">Потрібні навички</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">{skills.length}</span>
                </button>
              );
            })()}
          </div>


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
                const BRANCH_STEPS = STEPS.slice(4); // branch-specific steps 4-8

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
                      if (scenario.niche !== 'Інфобізнес') return '';
                      const branch = branchLeadType && shouldBranch ? scenario.branchData?.[branchLeadType] : null;
                      return (branch ? branch.funnelFormat : scenario.funnelFormat) || '';
                    }
                    case 4: {
                      const branch = branchLeadType && shouldBranch ? scenario.branchData?.[branchLeadType] : null;
                      const decompSet = branch ? branch.decomposition : scenario.decomposition;
                      const bad = calcMetrics(decompSet.bad);
                      const real = calcMetrics(decompSet.realistic);
                      const pos = calcMetrics(decompSet.positive);
                      if (real.revenue <= 0 && bad.revenue <= 0 && pos.revenue <= 0) return '';
                      return [
                        `🟡 ${bad.leads} лідів → ${bad.revenue.toLocaleString()}$ → ${bad.romi}%`,
                        `🔵 ${real.leads} лідів → ${real.revenue.toLocaleString()}$ → ${real.romi}%`,
                        `🟢 ${pos.leads} лідів → ${pos.revenue.toLocaleString()}$ → ${pos.romi}%`,
                      ].join('\n');
                    }
                    case 5: {
                      const branch = branchLeadType && shouldBranch ? scenario.branchData?.[branchLeadType] : null;
                      const dests = branch ? branch.leadDestinations : scenario.leadDestinations;
                      return dests.length > 0 ? dests.join('\n') : '';
                    }
                    case 6: {
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
                  const showAiHint = stepIdx === 4 && (branchLeadType ? isStepCompletedForBranch(scenario, 4, branchLeadType) : isStepCompletedStatic(scenario, 4));

                  return (
                    <div key={`${stepIdx}-${branchLeadType || 'main'}`} className="flex items-start" data-flow-node data-step-index={stepIdx}>
                      <div className="relative">
                        <FlowNode
                          icon={s.icon}
                          title={branchLeadType && (stepIdx === 3 || stepIdx === 4)
                            ? `${s.title}\n${LEAD_TYPES.find(l => l.value === branchLeadType)?.icon || ''} ${LEAD_TYPES.find(l => l.value === branchLeadType)?.label || ''}`
                            : s.title}
                          index={stepIdx}
                          isActive={activeStep === stepIdx && (!shouldBranch || stepIdx < 3 || activeLeadType === branchLeadType)}
                           isCompleted={isStepCompleted(stepIdx, branchLeadType)}
                           isSkipped={skippedSteps.has(branchLeadType ? `${stepIdx}:${branchLeadType}` : String(stepIdx))}

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
                        {stepIdx === 9 && isStepUnlocked(stepIdx, branchLeadType) && (
                          <Button
                            className="w-full mt-2 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                            onClick={(e) => { e.stopPropagation(); startLaunch(); }}
                          >
                            🚀 Запустити проект
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                };

                const flowGated = !!scenario.clientBrief && !hasCompletedClientGate;

                if (!shouldBranch) {
                  // Single row — original behavior
                  return (
                    <>
                      <div className="flex items-center gap-0 px-12 py-8">
                        <div className="flex items-center pr-6">
                          <div className="flex flex-col items-center">
                            <ClientInfoCard />
                            <ClientActionsColumn />
                          </div>
                          {!flowGated && <div className="w-10 h-px border-t-2 border-dashed border-border ml-2" />}
                        </div>
                        {!flowGated && (() => {
                          // New order: Ніша → Джерело → Meta Ads prep block (goal + format live inside it)
                          // → Декомпозиція → Куди йдуть ліди → Інтеграція → Продажі → Retention → Результат.
                          const nodes: React.ReactNode[] = [];
                          const preSteps: number[] = [0];
                          if (isStepUnlocked(1)) preSteps.push(1);
                          preSteps.forEach((i) => {
                            nodes.push(
                              <React.Fragment key={`pre-${i}`}>
                                {renderNode(i, undefined, false)}
                              </React.Fragment>
                            );
                          });
                          // Prep block appears right after "Джерело".
                          if (isStepCompleted(1)) {
                            nodes.push(
                              <PrepWorksNode
                                key="prep-single"
                                campaignKeys={
                                  scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 0
                                    ? scenario.leadTypes
                                    : undefined
                                }
                              />
                            );
                          }
                          // Post-prep chain only after goal + format are set (auto-saved via useEffects).
                          if (isStepCompleted(1) && isStepCompleted(2) && isStepCompleted(3)) {
                            const postSteps: number[] = [];
                            for (let i = 4; i < STEPS.length; i++) {
                              if (isStepUnlocked(i)) {
                                postSteps.push(i);
                                if (!isStepCompleted(i)) break;
                              } else {
                                break;
                              }
                            }
                            postSteps.forEach((i, idx) => {
                              nodes.push(
                                <React.Fragment key={`post-${i}`}>
                                  {renderNode(i, undefined, idx === postSteps.length - 1)}
                                </React.Fragment>
                              );
                            });
                          }
                          return nodes;
                        })()}

                      </div>
                      {scenario.retention.emailCount > 0 && savedSteps.has('8') && <RetentionArrow />}
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
                      <div className="flex flex-col items-center">
                        <ClientInfoCard />
                        <ClientActionsColumn />
                      </div>
                      {!flowGated && <div className="w-10 h-px border-t-2 border-dashed border-border ml-2" />}
                    </div>
                    {!flowGated && <>
                    {/* Shared steps (Ніша, Джерело) + unified Meta Ads prep block on the same row. */}
                    <div className="flex items-start gap-0 flex-shrink-0" style={{ marginTop: `${((leadTypes.length - 1) * branchRowHeight) / 2}px` }}>
                      {(() => {
                        const visible: number[] = [];
                        for (const i of [0, 1]) {
                          if (isStepUnlocked(i)) {
                            visible.push(i);
                            if (!isStepCompleted(i)) break;
                          } else break;
                        }
                        return visible.map((i) => renderNode(i, undefined, false));
                      })()}
                      {isStepCompleted(1) && <PrepWorksNode campaignKeys={leadTypes} />}
                    </div>


                    {/* Branch lines + branch rows — start from Декомпозиція (step 4). */}
                    {isStepCompleted(2) && isStepCompleted(3) && (
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
                              const branchStepIdxs: number[] = [];
                              const tryPush = (i: number): boolean => {
                                if (!isStepUnlocked(i, lt)) return false;
                                branchStepIdxs.push(i);
                                return isStepCompleted(i, lt);
                              };
                              for (let bi = 0; bi < BRANCH_STEPS.length; bi++) {
                                if (!tryPush(bi + 4)) break;
                              }
                              return branchStepIdxs.map((stepIdx, idx) => (
                                <React.Fragment key={stepIdx}>
                                  {renderNode(stepIdx, lt, idx === branchStepIdxs.length - 1)}
                                </React.Fragment>
                              ));
                            })()}

                          </div>

                        ))}
                      </div>
                    </div>
                    )}
                    </>}
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
            <div className="fixed right-0 top-0 bottom-0 z-40 animate-slide-in-right">
              {renderPanel()}
            </div>
          </>
        )}
      </div>

      {/* Client brief sheet */}
      <Sheet open={clientBriefOpen} onOpenChange={setClientBriefOpen}>
        <SheetContent side="left" className="bg-card border-border w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground font-bold flex items-center gap-3">
              <img
                src={resolveClientPhoto(scenario.clientBrief)}
                alt={scenario.clientBrief?.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex flex-col items-start">
                <span>{scenario.clientBrief?.name}</span>
                {scenario.clientBrief?.niche && (
                  <span className="text-xs text-muted-foreground font-normal">{scenario.clientBrief.niche}</span>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>
          {scenario.clientBrief?.source && (
            <span className="inline-block mt-3 self-start px-2.5 py-1 rounded-full bg-secondary text-foreground text-[10px] font-semibold uppercase tracking-wide">
              {scenario.clientBrief.source}
            </span>
          )}
          <div
            className="rounded-2xl p-4 mt-3"
            style={{ background: 'linear-gradient(135deg, hsl(48 80% 96%), hsl(0 0% 100%))' }}
          >
            <p className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
              Задача для маркетолога
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {scenario.clientBrief?.task}
            </p>
          </div>
          <ClientFlagsPanel redFlags={scenario.clientBrief?.redFlags} greyFlags={scenario.clientBrief?.greyFlags} />
        </SheetContent>
      </Sheet>

      {/* Filled brief sheet */}
      <Sheet open={filledBriefOpen} onOpenChange={setFilledBriefOpen}>
        <SheetContent side="left" className="bg-card border-border w-full sm:max-w-[680px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground font-bold flex items-center gap-3 pr-32">
              {(scenario.clientBrief?.photoKey || scenario.clientBrief?.photo) && (
                <img
                  src={resolveClientPhoto(scenario.clientBrief)}
                  alt={scenario.clientBrief?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div className="flex flex-col items-start">
                <span>Бриф Meta Ads — Лідогенерація</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Заповнив(ла): {scenario.clientBrief?.name || 'Клієнт'} · ~90% готовності
                </span>
              </div>
            </SheetTitle>
            <a
              href="https://docs.google.com/document/d/17ntAv44e63d3A1EhitEhoJLTgnaYSj7LU7aBt2E-puY/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-12 top-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs font-medium text-foreground transition-colors"
              title="Завантажити пустий шаблон брифа"
            >
              <Download className="w-3.5 h-3.5" />
              Шаблон брифа
            </a>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {(() => {
              const brief = getBriefForClient(scenario.clientBrief);
              if (!brief || brief.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Бриф для цього клієнта ще не підготовлений.
                  </p>
                );
              }
              return brief.map((f: BriefField, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-border p-3 bg-secondary/40"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1">
                    {i + 1}. {f.q}
                  </p>
                  {f.a ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {f.a}
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">— не вказано —</p>
                  )}
                </div>
              ));
            })()}
          </div>
          <ClientFlagsPanel redFlags={scenario.clientBrief?.redFlags} greyFlags={scenario.clientBrief?.greyFlags} />
        </SheetContent>
      </Sheet>

      {/* Required skills sheet */}
      <Sheet open={skillsOpen} onOpenChange={setSkillsOpen}>
        <SheetContent side="left" className="bg-card border-border w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Потрібні навички для запуску
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mt-2">Перегляньте ці відео, щоб впевнено запустити обрану воронку.</p>
          <div className="space-y-2 pt-3">
            {(() => {
              const skills: { title: string; url: string }[] = [];
              const seen = new Set<string>();
              const push = (v: { title: string; url: string }) => {
                if (v && v.url && !seen.has(v.url)) { seen.add(v.url); skills.push(v); }
              };
              if (scenario.niche === 'Інфобізнес') push(INFOBIZ_DECOMP_VIDEO);
              if (scenario.funnelFormat) (FORMAT_VIDEOS[scenario.funnelFormat] || []).forEach(push);
              return skills.map((v, i) => (
                <div key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary hover:border-primary/40 transition-all">
                  <span className="text-sm font-medium text-foreground flex-1">{v.title}</span>
                  <VideoBadge url={v.url} title={v.title} size="md" />
                </div>
              ));
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Required materials sheet */}
      <Sheet open={materialsOpen} onOpenChange={setMaterialsOpen}>
        <SheetContent side="left" className="bg-card border-border w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Матеріали для перегляду
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mt-2">
            Оплату отримано та бриф зібрано — перегляньте ці відео, щоб зайти в проєкт з рівнем сильного маркетолога.
          </p>
          <div className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">База маркетолога</div>
              {REQUIRED_MATERIALS.map((v, i) => (
                <div key={`base-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary hover:border-primary/40 transition-all">
                  <span className="text-sm font-medium text-foreground flex-1">{v.title}</span>
                  <VideoBadge url={v.url} title={v.title} size="md" />
                </div>
              ))}
            </div>
            {scenario.niche && (
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Трафік-стратегія</div>
                {TRAFFIC_STRATEGY_MATERIALS.map((v, i) => (
                  <div key={`traffic-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary hover:border-primary/40 transition-all">
                    <span className="text-sm font-medium text-foreground flex-1">{v.title}</span>
                    <VideoBadge url={v.url} title={v.title} size="md" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>



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
                <ReactMarkdown>{salesRecText.replace(/(\*\*Варіант\s*\d+[^*]*\*\*)/g, '\n\n$1\n\n').replace(/\n{3,}/g, '\n\n')}</ReactMarkdown>
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

      {/* Audience prep dialog */}
      <Dialog open={audienceOpen} onOpenChange={(o) => {
        setAudienceOpen(o);
        if (!o) {
          setAudienceView('list');
          setAudienceName('');
          setAudienceDescription('');
          setAudienceTipsText('');
          setViewAudienceIdx(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base">👥</div>
              Налаштування аудиторій
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const key = activeLeadType || 'main';
            const rawSaved = (scenario as any)?.audienceSettings?.[key];
            const savedAudiences: any[] = Array.isArray(rawSaved)
              ? rawSaved
              : (rawSaved && (rawSaved.tips || rawSaved.checks)
                  ? [{ id: 'legacy', name: 'Гіпотеза 1', mode: 'ai', tips: rawSaved.tips, description: '', createdAt: rawSaved.approvedAt }]
                  : []);

            const saveAudiencesList = (next: any[]) => {
              const current = (scenario as any)?.audienceSettings || {};
              update({
                audienceSettings: {
                  ...current,
                  [key]: next,
                  // keep checklist separately
                  [`${key}__checks`]: audienceChecks,
                },
              } as any);
            };

            return (
              <>
                <div className="flex-1 overflow-y-auto pt-2 space-y-4">
                  {/* Collapsible checklist "Перевір себе" */}
                  {(() => {
                    const items = [
                      { key: 'goal', label: 'Ціль / піксель' },
                      { key: 'geo', label: 'Гео' },
                      { key: 'gender', label: 'Стать і вік' },
                      { key: 'lang', label: 'Мова акаунту' },
                      { key: 'interests', label: 'Інтереси' },
                      { key: 'placement', label: 'Плейсменти' },
                    ];
                    const checkedCount = items.filter(i => audienceChecks[i.key]).length;
                    return (
                      <details className="group rounded-lg border border-border bg-muted/20 open:bg-muted/30">
                        <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer list-none select-none">
                          <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            <span>✅</span> Перевір себе
                            <span className="text-[10px] font-normal text-muted-foreground">({checkedCount}/{items.length})</span>
                          </span>
                          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
                        </summary>
                        <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5">
                          {items.map(item => {
                            const checked = !!audienceChecks[item.key];
                            return (
                              <label
                                key={item.key}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/60 bg-background hover:bg-muted/40 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => setAudienceChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                  className="w-3.5 h-3.5 rounded accent-primary"
                                />
                                <span className={`text-[11px] ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                  {item.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })()}

                  {/* LIST view */}
                  {audienceView === 'list' && (
                    <div className="space-y-3">
                      {savedAudiences.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Збережені гіпотези ({savedAudiences.length})</p>
                          <div className="space-y-2">
                            {savedAudiences.map((a, idx) => (
                              <div key={a.id || idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                                <button
                                  type="button"
                                  onClick={() => { setViewAudienceIdx(idx); setAudienceView('view'); }}
                                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                                >
                                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-base shrink-0">
                                    {a.mode === 'ai' ? '✨' : '✍️'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-primary">Гіпотеза №{idx + 1}</div>
                                    <div className="text-sm text-foreground truncate">{a.name || 'Без назви'}</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    const next = savedAudiences.filter((_, i) => i !== idx);
                                    saveAudiencesList(next);
                                    toast({ title: 'Видалено', description: `Гіпотеза №${idx + 1}` });
                                  }}
                                  className="w-8 h-8 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center shrink-0"
                                  aria-label="Видалити"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => { setAudienceView('choose'); setAudienceName(''); setAudienceDescription(''); setAudienceTipsText(''); }}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">➕</div>
                        <div>
                          <div className="font-semibold text-foreground">Створити нову гіпотезу</div>
                          <div className="text-xs text-muted-foreground">Опишіть самі або отримайте AI-поради</div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* CHOOSE mode */}
                  {audienceView === 'choose' && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Як хочете створити гіпотезу?</p>
                      <div className="grid gap-3">
                        <button
                          onClick={() => setAudienceView('manual')}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">✍️</div>
                          <div>
                            <div className="font-semibold text-foreground">Прописати гіпотезу самому</div>
                            <div className="text-xs text-muted-foreground">Я знаю, кого таргетувати — опишу сам</div>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            const autoName = `Гіпотеза ${savedAudiences.length + 1}`;
                            setAudienceName(autoName);
                            setAudienceView('ai');
                            setAudienceTipsText('');
                            fetchAudienceTips({ force: true, previousAudiences: savedAudiences, audienceName: autoName });
                          }}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">✨</div>
                          <div>
                            <div className="font-semibold text-foreground">Попросити AI-поради</div>
                            <div className="text-xs text-muted-foreground">Згенерую на основі брифу та попередніх аудиторій</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MANUAL mode */}
                  {audienceView === 'manual' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">Назва гіпотези *</label>
                        <Input
                          value={audienceName}
                          onChange={(e) => setAudienceName(e.target.value)}
                          placeholder="Напр. Молоді мами 25-34, Київ"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">Опис гіпотези *</label>
                        <Textarea
                          value={audienceDescription}
                          onChange={(e) => setAudienceDescription(e.target.value)}
                          placeholder="Гео, стать, вік, інтереси, поведінка, болі, тригери..."
                          rows={8}
                        />
                      </div>
                    </div>
                  )}

                  {/* AI mode */}
                  {audienceView === 'ai' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">Назва гіпотези</label>
                        <Input
                          value={audienceName}
                          onChange={(e) => setAudienceName(e.target.value)}
                          placeholder="Напр. Холодна аудиторія №1"
                        />
                      </div>
                      <Button
                        onClick={() => fetchAudienceTips({ force: true, previousAudiences: savedAudiences, audienceName })}
                        disabled={audienceTipsLoading}
                        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold shadow-md"
                      >
                        {audienceTipsLoading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерую...</>
                        ) : audienceTipsText ? (
                          <><Sparkles className="w-4 h-4 mr-2" /> Перегенерувати</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" /> Згенерувати поради</>
                        )}
                      </Button>
                      {audienceTipsText && (
                        <div className="rounded-xl border border-border bg-muted/30 p-4 max-h-[40vh] overflow-y-auto">
                          <div className="prose prose-sm max-w-none text-foreground">
                            <ReactMarkdown>{audienceTipsText}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW mode */}
                  {audienceView === 'view' && viewAudienceIdx !== null && savedAudiences[viewAudienceIdx] && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">Гіпотеза №{viewAudienceIdx + 1}</span>
                        <span className="text-xs text-muted-foreground">· {savedAudiences[viewAudienceIdx].mode === 'ai' ? 'AI-поради' : 'Власний опис'}</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Назва</div>
                        <div className="text-sm text-foreground font-medium">{savedAudiences[viewAudienceIdx].name}</div>
                      </div>
                      {savedAudiences[viewAudienceIdx].description && (
                        <div>
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Опис</div>
                          <div className="text-sm text-foreground whitespace-pre-wrap">{savedAudiences[viewAudienceIdx].description}</div>
                        </div>
                      )}
                      {savedAudiences[viewAudienceIdx].tips && (
                        <div className="rounded-xl border border-border bg-muted/30 p-4 max-h-[45vh] overflow-y-auto">
                          <div className="prose prose-sm max-w-none text-foreground">
                            <ReactMarkdown>{savedAudiences[viewAudienceIdx].tips}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 mt-2 flex items-center justify-between gap-2">
                  {audienceView !== 'list' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAudienceView('list');
                        setAudienceName('');
                        setAudienceDescription('');
                        setAudienceTipsText('');
                        setViewAudienceIdx(null);
                      }}
                    >
                      ← Назад
                    </Button>
                  ) : <span />}
                  <div className="flex gap-2">
                    {audienceView === 'list' && (
                      <Button variant="outline" onClick={() => setAudienceOpen(false)}>Закрити</Button>
                    )}
                    {audienceView === 'view' && (
                      <Button variant="outline" onClick={() => setAudienceOpen(false)}>Закрити</Button>
                    )}
                    {audienceView === 'manual' && (
                      <Button
                        disabled={!audienceName.trim() || !audienceDescription.trim()}
                        onClick={() => {
                          const next = [
                            ...savedAudiences,
                            {
                              id: crypto.randomUUID(),
                              name: audienceName.trim(),
                              mode: 'manual',
                              description: audienceDescription.trim(),
                              tips: '',
                              createdAt: new Date().toISOString(),
                            },
                          ];
                          saveAudiencesList(next);
                          toast({ title: 'Збережено', description: audienceName });
                          setAudienceView('list');
                          setAudienceName('');
                          setAudienceDescription('');
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      >
                        <Check className="w-4 h-4 mr-2" /> Зберегти
                      </Button>
                    )}
                    {audienceView === 'ai' && (
                      <Button
                        disabled={!audienceName.trim() || !audienceTipsText.trim()}
                        onClick={() => {
                          const next = [
                            ...savedAudiences,
                            {
                              id: crypto.randomUUID(),
                              name: audienceName.trim(),
                              mode: 'ai',
                              description: '',
                              tips: audienceTipsText,
                              createdAt: new Date().toISOString(),
                            },
                          ];
                          saveAudiencesList(next);
                          toast({ title: 'Збережено', description: audienceName });
                          setAudienceView('list');
                          setAudienceName('');
                          setAudienceTipsText('');
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      >
                        <Check className="w-4 h-4 mr-2" /> Зберегти
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>



      {/* Creo brief dialog */}
      <Dialog open={creoOpen} onOpenChange={(o) => { setCreoOpen(o); if (!o) { setCreoFormat(null); setCreoFields({}); setCreoVideoFormat(''); setViewCreoIdx(null); setPreselectedAudienceId(null); } }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base">📝</div>
              ТЗ по крео {creoFormat && '— заповніть поля'}{viewCreoIdx !== null && ` — Крео ${viewCreoIdx + 1}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pt-2 space-y-4">
            {viewCreoIdx !== null && !creoFormat && (() => {
              const key = activeLeadType || 'main';
              const rawSaved = (scenario as any)?.creoBriefs?.[key];
              const savedList: any[] = Array.isArray(rawSaved)
                ? rawSaved
                : (rawSaved?.format ? [rawSaved] : []);
              const item = savedList[viewCreoIdx];
              if (!item) return null;
              const labels: Record<string, string> = { static: 'Статика', carousel: 'Карусель', video: 'Відео' };
              const f = item.fields || {};
              return (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">
                    {labels[item.format] || item.format}{item.format === 'video' && item.videoFormat ? ` · ${item.videoFormat}` : ''}
                  </div>
                  {f.h1 && (<div><div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">H1</div><div className="text-sm text-foreground whitespace-pre-wrap">{f.h1}</div></div>)}
                  {f.subtitle && (<div><div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Підзаголовок</div><div className="text-sm text-foreground whitespace-pre-wrap">{f.subtitle}</div></div>)}
                  {f.cards && (<div><div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Кількість карток</div><div className="text-sm text-foreground">{f.cards}</div></div>)}
                  {f.imageDesc && (<div><div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Опис зображення</div><div className="text-sm text-foreground whitespace-pre-wrap">{f.imageDesc}</div></div>)}
                  {f.logic && (<div><div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Логіка карток</div><div className="text-sm text-foreground whitespace-pre-wrap">{f.logic}</div></div>)}
                  {f.script && (<div><div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Сценарій</div><div className="text-sm text-foreground whitespace-pre-wrap">{f.script}</div></div>)}
                  {f.timing && (<div><div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Таймінг</div><div className="text-sm text-foreground">{f.timing} сек</div></div>)}
                  <div className="pt-2">
                    <Button variant="outline" onClick={() => setViewCreoIdx(null)}>← До списку</Button>
                  </div>
                </div>
              );
            })()}
            {!creoFormat && viewCreoIdx === null && (() => {
              const key = activeLeadType || 'main';
              const rawSaved = (scenario as any)?.creoBriefs?.[key];
              const savedList: any[] = Array.isArray(rawSaved)
                ? rawSaved
                : (rawSaved?.format ? [rawSaved] : []);
              const labels: Record<string, { icon: string; label: string }> = {
                static: { icon: '🖼️', label: 'Статика' },
                carousel: { icon: '🎠', label: 'Карусель' },
                video: { icon: '🎬', label: 'Відео' },
              };
              return (
                <div className="space-y-4">
                  {savedList.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Збережені адсети ({savedList.length})</p>
                      <div className="space-y-2">
                        {savedList.map((item, idx) => {
                          const info = labels[item.format] || { icon: '📝', label: item.format };
                          const title = item.fields?.h1 || item.fields?.script?.slice(0, 60) || 'Без назви';
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">{info.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-primary">Адсет №{idx + 1} · {info.label}{item.format === 'video' && item.videoFormat ? ` (${item.videoFormat})` : ''}</div>
                                <div className="text-sm text-foreground truncate">{title}</div>
                              </div>
                              <button
                                onClick={() => {
                                  const next = savedList.filter((_, i) => i !== idx);
                                  const current = (scenario as any)?.creoBriefs || {};
                                  update({ creoBriefs: { ...current, [key]: next } } as any);
                                  toast({ title: 'Видалено', description: `Адсет №${idx + 1}` });
                                }}
                                className="w-8 h-8 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center shrink-0"
                                aria-label="Видалити"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {savedList.length > 0 ? 'Додати новий адсет — оберіть формат:' : 'Оберіть формат крео:'}
                    </p>
                    <div className="grid gap-3">
                      {(isTikTokSource
                        ? [
                            { key: 'video', icon: '🎬', title: 'Відео', desc: 'Вертикальне 9:16, основний формат TikTok', recommended: true },
                            { key: 'carousel', icon: '🎠', title: 'Кільцева галерея', desc: 'Кілька вертикальних карток, обов’язково з музикою' },
                            { key: 'static', icon: '🖼️', title: 'Статика', desc: 'Одне вертикальне зображення (9:16) з текстом' },
                          ]
                        : [
                            { key: 'static', icon: '🖼️', title: 'Статика (банер)', desc: 'Одне зображення з текстом' },
                            { key: 'carousel', icon: '🎠', title: 'Кільцева галерея', desc: 'Кілька карток з єдиною логікою' },
                            { key: 'video', icon: '🎬', title: 'Відео', desc: 'Динамічний відеоконтент' },
                          ]
                      ).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => { setCreoFormat(opt.key as any); setCreoFields({}); setCreoVideoFormat(''); }}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                            <span>{opt.icon}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              + {opt.title}
                              {'recommended' in opt && opt.recommended && (
                                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-success/15 text-success">рекомендовано</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{opt.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {creoFormat === 'static' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Основний текст / заголовок (H1) *</label>
                  <Textarea
                    value={creoFields.h1 || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, h1: e.target.value }))}
                    placeholder="Наприклад: Знижка 50% тільки сьогодні"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Підзаголовок <span className="text-muted-foreground font-normal">(не обов'язково)</span></label>
                  <Input
                    value={creoFields.subtitle || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Додатковий текст під заголовком"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Опис основного зображення *
                    {isTikTokSource && <span className="text-muted-foreground font-normal"> (вертикальне, 9:16)</span>}
                  </label>
                  <Textarea
                    value={creoFields.imageDesc || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, imageDesc: e.target.value }))}
                    placeholder="Що зображено, стиль, колірна гамма, обʼєкти..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {creoFormat === 'carousel' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Основний текст / заголовок (H1) *</label>
                  <Textarea
                    value={creoFields.h1 || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, h1: e.target.value }))}
                    placeholder="Наприклад: 5 причин обрати нас"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Підзаголовок <span className="text-muted-foreground font-normal">(не обов'язково)</span></label>
                  <Input
                    value={creoFields.subtitle || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, subtitle: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Кількість карток (крео) *</label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={creoFields.cards || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, cards: e.target.value }))}
                    placeholder="3–10"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Опис основного зображення *
                    {isTikTokSource && <span className="text-muted-foreground font-normal"> (вертикальне, 9:16)</span>}
                  </label>
                  <Textarea
                    value={creoFields.imageDesc || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, imageDesc: e.target.value }))}
                    placeholder="Стиль, колір, обʼєкти..."
                    rows={3}
                  />
                </div>
                {isTikTokSource && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Музика *</label>
                    <Input
                      value={creoFields.music || ''}
                      onChange={(e) => setCreoFields(prev => ({ ...prev, music: e.target.value }))}
                      placeholder="Трек із CML (Commercial Music Library) або власний — обов'язково для каруселі в TikTok"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Єдина логіка карток *</label>
                  <Textarea
                    value={creoFields.logic || ''}
                    onChange={(e) => setCreoFields(prev => ({ ...prev, logic: e.target.value }))}
                    placeholder="Наприклад: кожна картка — окрема перевага продукту, або кроки сценарію"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {creoFormat === 'video' && (() => {
              const VIDEO_FORMATS: Record<string, { label: string; example: string }> = {
                ugc: { label: 'UGC', example: 'Людина тримає продукт перед камерою смартфона, ділиться враженнями простими словами, як рекомендація другу.' },
                unboxing: { label: 'Распаковка', example: 'Крупним планом руки розпаковують упаковку, показують комплектацію, реакція "вау".' },
                product: { label: 'Демонстрація продукту', example: 'Покрокова демонстрація як працює продукт: проблема → застосування → результат.' },
                review: { label: 'Відгук', example: 'Реальний клієнт говорить на камеру: що було до, як купив, який результат отримав через X днів.' },
                ba: { label: 'До-Після', example: '"До": проблемна ситуація. "Після": той самий обʼєкт/людина після використання продукту. Контрастний монтаж.' },
                story: { label: 'Сторітелінг', example: 'Зачіпка (0-3 сек) → проблема героя → знайомство з продуктом → трансформація → CTA.' },
              };
              return (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Формат відео *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(VIDEO_FORMATS).map(([key, v]) => (
                        <button
                          key={key}
                          onClick={() => setCreoVideoFormat(key)}
                          className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${creoVideoFormat === key ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {creoVideoFormat && (
                    <div className="rounded-lg bg-muted/40 border border-border p-3">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Приклад сценарію</div>
                      <div className="text-sm text-foreground">{VIDEO_FORMATS[creoVideoFormat].example}</div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Основний сценарій *</label>
                    <Textarea
                      value={creoFields.script || ''}
                      onChange={(e) => setCreoFields(prev => ({ ...prev, script: e.target.value }))}
                      placeholder="Опишіть сюжет сцена за сценою..."
                      rows={5}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Таймінг (сек) * <span className="text-muted-foreground font-normal">— рекомендуємо до 30 сек</span>
                    </label>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={creoFields.timing || ''}
                      onChange={(e) => setCreoFields(prev => ({ ...prev, timing: e.target.value }))}
                      placeholder="до 30"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="border-t border-border pt-4 mt-2 flex items-center justify-between gap-2">
            {creoFormat ? (
              <Button variant="outline" onClick={() => { setCreoFormat(null); setCreoFields({}); setCreoVideoFormat(''); }}>
                ← Назад
              </Button>
            ) : <span />}
            <div className="flex gap-2 flex-wrap justify-end">
              {creoFormat && (creoFormat !== 'video' || creoVideoFormat) && (
                <Button
                  variant="outline"
                  disabled={creoAiLoading}
                  onClick={async () => {
                    if (!scenario) return;
                    setCreoAiLoading(true);
                    try {
                      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creo-brief`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                        },
                        body: JSON.stringify({
                          format: creoFormat,
                          videoFormat: creoVideoFormat,
                          niche: scenario.niche,
                          channel: scenario.channel,
                          clientBrief: scenario.clientBrief,
                          decomposition: scenario.decomposition,
                        }),
                      });
                      if (!resp.ok) {
                        const err = await resp.json().catch(() => ({ error: 'Помилка' }));
                        toast({ title: 'AI помилка', description: err.error || 'Не вдалося згенерувати', variant: 'destructive' });
                      } else {
                        const data = await resp.json();
                        setCreoFields(prev => ({ ...prev, ...(data.fields || {}) }));
                        toast({ title: 'Заповнено AI', description: 'Перевірте та відредагуйте за потреби' });
                      }
                    } catch (e: any) {
                      toast({ title: 'Помилка', description: e.message || 'Збій', variant: 'destructive' });
                    } finally {
                      setCreoAiLoading(false);
                    }
                  }}
                  className="border-amber-400/50 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30 font-semibold"
                >
                  {creoAiLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерую...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Заповнити за допомогою AI</>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={() => setCreoOpen(false)}>Закрити</Button>
              {creoFormat && (
                <Button
                  onClick={() => {
                    const key = activeLeadType || 'main';
                    const current = (scenario as any)?.creoBriefs || {};
                    const rawExisting = current[key];
                    const existingList: any[] = Array.isArray(rawExisting)
                      ? rawExisting
                      : (rawExisting?.format ? [rawExisting] : []);
                    const next = [
                      ...existingList,
                      {
                        format: creoFormat,
                        videoFormat: creoFormat === 'video' ? creoVideoFormat : undefined,
                        fields: creoFields,
                        audienceId: preselectedAudienceId || null,
                        savedAt: new Date().toISOString(),
                      },
                    ];
                    update({ creoBriefs: { ...current, [key]: next } } as any);
                    toast({ title: 'Адсет збережено', description: `Збережено адсет №${next.length}` });
                    setCreoFormat(null);
                    setCreoFields({});
                    setCreoVideoFormat('');
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" /> Зберегти адсет
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingRemoveLeadType} onOpenChange={(o) => !o && setPendingRemoveLeadType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вимкнути канал?</AlertDialogTitle>
            <AlertDialogDescription>
              Якщо вимкнути «{LEAD_TYPES.find(l => l.value === pendingRemoveLeadType)?.label}», усі дані по цій гілці воронки (декомпозиція, інтеграції, продажі тощо) будуть видалені.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoveLeadType) performLeadTypeToggle(pendingRemoveLeadType);
                setPendingRemoveLeadType(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Так, вимкнути
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingLeadSourceSwitch} onOpenChange={(o) => !o && setPendingLeadSourceSwitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Змінити джерело трафіку?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете поміняти канал на «{LEAD_SOURCES.find(s => s.value === pendingLeadSourceSwitch)?.label}»? Усі попередні налаштування (ціль, деталізація, декомпозиція, куди йдуть ліди, інтеграція, продажі, retention, аудиторії та крео) будуть видалені — все доведеться наповнювати заново.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeadSourceSwitch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Так, поміняти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={launchResultOpen} onOpenChange={(o) => { if (!o) setLaunchResultOpen(false); }}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          {/* Прогрес утримання клієнта — 4 тижні */}
          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3, 4].map(w => {
              const done = w < launchWeek || launchPhase === 'month_success';
              const active = w === launchWeek && launchPhase !== 'month_success';
              return (
                <div key={w} className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div
                    className={`flex flex-col items-center gap-0.5 flex-1 rounded-lg px-1 py-1.5 border transition-colors ${
                      done
                        ? 'bg-success/10 border-success/40'
                        : active
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      done ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {done ? <Check className="w-3 h-3" strokeWidth={3} /> : w}
                    </span>
                    <span className={`text-[9px] font-semibold leading-none ${
                      done ? 'text-success' : active ? 'text-primary' : 'text-muted-foreground/60'
                    }`}>
                      {done ? 'Втримано ✓' : `Тиждень ${w}`}
                    </span>
                  </div>
                  {w < 4 && <div className={`h-px w-1.5 flex-shrink-0 ${w < launchWeek ? 'bg-success' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>

          {launchPhase === 'launching' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="relative w-16 h-16">
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </span>
              </div>
              <p className="text-base font-semibold text-foreground">Ви запускаєте проект...</p>
            </div>
          )}

          {launchPhase === 'week' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="sr-only">
                  {launchProblem ? `Тиждень ${launchWeek}: перші результати` : `Тиждень ${launchWeek}`}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    {/* Client message (Telegram-style) — only what the client themself would notice/say */}
                    <div className="flex items-start gap-3">
                      <img
                        src={resolveClientPhoto(scenario.clientBrief)}
                        alt={scenario.clientBrief?.name || 'Клієнт'}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-border flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-foreground">{scenario.clientBrief?.name || 'Клієнт'}</span>
                          <span className="text-[10px] text-muted-foreground">Тиждень {launchWeek}</span>
                        </div>
                        <div className="relative mt-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                          {launchProblem ? (
                            <>
                              <p className="text-sm font-semibold text-foreground">📊 Перші результати:</p>
                              <p className="text-sm text-foreground mt-1">{launchClientLine(launchProblem)}</p>
                              <p className="text-sm text-foreground font-medium mt-3">Що будемо з цим робити? 🤔</p>
                            </>
                          ) : (
                            <p className="text-sm text-foreground">Все супер, результати відповідають прогнозу! 🎉</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {launchFeedback && (
                      <p className="text-sm font-medium text-warning pl-14">{launchFeedback}</p>
                    )}

                    {/* System/ad-account metrics — not something the client would say themselves */}
                    {launchProblem && (
                      <div className="rounded-lg border border-border p-3 ml-14">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                          📈 Дані рекламного кабінету
                        </p>
                        <ul className="space-y-1.5 text-sm text-foreground list-none">
                          {launchSystemMetricLines(launchProblem).map((line, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* The marketer's actual configured campaign — same live mockup as in Підготовка, scaled down to fit the dialog */}
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                        🖥️ Ваш рекламний кабінет
                      </p>
                      <div className="rounded-lg border border-border overflow-hidden" style={{ maxHeight: 260, overflowY: 'auto' }}>
                        <div style={{ zoom: 0.4 }}>
                          <PrepWorksNode
                            campaignKeys={
                              scenario.channel === 'leads' && (scenario.leadTypes?.length || 0) > 0
                                ? scenario.leadTypes
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {launchProblem && <p className="text-sm font-semibold text-foreground pt-1">Ваші дії?</p>}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-col sm:justify-start sm:space-x-0 gap-2">
                {launchProblem ? (
                  LAUNCH_ACTIONS.map(a => (
                    <Button
                      key={a.key}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleLaunchAction(a.key)}
                    >
                      {a.label}
                    </Button>
                  ))
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground w-full py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Тиждень втримано — переходимо до наступного...</span>
                  </div>
                )}
              </AlertDialogFooter>
            </>
          )}

          {launchPhase === 'resolved' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>✅ Тиждень {launchWeek} завершено</AlertDialogTitle>
                <AlertDialogDescription>{launchFeedback}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Переходимо до наступного тижня...</span>
              </div>
            </>
          )}

          {launchPhase === 'month_success' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>🏆 Проєкт успішно пройшов перший місяць!</AlertDialogTitle>
                <AlertDialogDescription>
                  Клієнт задоволений, метрики дотримані — ви переходите на другий місяць співпраці.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={finishLaunchedProject}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="w-4 h-4 mr-1" /> Завершити проект
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>


  );
};

export default ScenarioBuilder;
