import React from 'react';
import {
  Target,
  Megaphone,
  Users,
  FileText,
  Calculator,
  Send,
  Plug,
  PhoneCall,
  Repeat,
  Sparkles,
  Lock,
  Check,
  Clock,
  SkipForward,
} from 'lucide-react';


interface FlowNodeProps {
  icon: string;
  title: string;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isSkipped?: boolean;
  isLast: boolean;
  isLocked: boolean;
  subtitle?: string;
  onClick: () => void;
}


const ICONS = [Target, Megaphone, Users, FileText, Calculator, Send, Plug, PhoneCall, Repeat];

// Default descriptive copy per step
const DESCRIPTIONS = [
  'Оберіть нішу та сформулюйте позиціонування бізнесу.',
  'Визначте ціль рекламної кампанії та канал просування.',
  'Опишіть цільову аудиторію та її ключові болі.',
  'Розрахуйте бюджет, ліди та очікуваний прибуток.',
  'Налаштуйте, куди потрапляють заявки після кліку.',
  'Оберіть інтеграцію та автоматизацію передачі лідів.',
  'Підключіть CRM або сервіс для обробки контактів.',
  'Підготуйте скрипти продажів та роботу з запереченнями.',
  'Запустіть утримання клієнтів та повторні продажі.',
];

const FlowNode: React.FC<FlowNodeProps> = ({
  title,
  index,
  isActive,
  isCompleted,
  isSkipped,
  isLast,
  isLocked,
  subtitle,
  onClick,
}) => {
  const Icon = ICONS[index] || Sparkles;


  const state: 'active' | 'completed' | 'locked' | 'idle' = isActive
    ? 'active'
    : isCompleted
    ? 'completed'
    : isLocked
    ? 'locked'
    : 'idle';

  // Card surface — white base, subtle accent for active, soft mint tint when completed
  const cardStyle: React.CSSProperties =
    state === 'active'
      ? {
          background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(232 60% 98%) 100%)',
          boxShadow:
            '0 20px 40px -18px hsl(232 60% 40% / 0.28), 0 4px 10px -4px hsl(0 0% 0% / 0.06), inset 0 0 0 2px hsl(232 80% 65% / 0.7)',
        }
      : state === 'completed'
      ? (isSkipped
          ? {
              background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(36 90% 97%) 100%)',
              boxShadow:
                '0 14px 28px -16px hsl(28 45% 40% / 0.18), 0 2px 6px -2px hsl(0 0% 0% / 0.04), inset 0 0 0 1.5px hsl(36 70% 78% / 0.55)',
            }
          : {
              background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(108 45% 97%) 100%)',
              boxShadow:
                '0 14px 28px -16px hsl(108 35% 35% / 0.22), 0 2px 6px -2px hsl(0 0% 0% / 0.04), inset 0 0 0 1.5px hsl(108 40% 75% / 0.55)',
            })
      : state === 'locked'
      ? {
          background: 'hsl(var(--muted))',
          boxShadow: 'inset 0 0 0 1px hsl(var(--border))',
        }
      : {
          background: 'hsl(0 0% 100%)',
          boxShadow:
            '0 12px 26px -16px hsl(0 0% 0% / 0.18), 0 2px 6px -2px hsl(0 0% 0% / 0.05), inset 0 0 0 1px hsl(var(--border) / 0.7)',
        };


  // Icon badge (top-right) — colored circle like the reference
  const badgeBg =
    state === 'active'
      ? 'linear-gradient(135deg, hsl(232 80% 65%), hsl(232 70% 55%))'
      : state === 'completed'
      ? (isSkipped
          ? 'linear-gradient(135deg, hsl(36 90% 78%), hsl(28 80% 62%))'
          : 'linear-gradient(135deg, hsl(108 55% 80%), hsl(108 50% 65%))')
      : state === 'locked'
      ? 'hsl(var(--muted-foreground) / 0.15)'
      : 'linear-gradient(135deg, hsl(220 14% 96%), hsl(220 14% 90%))';

  const badgeIconColor =
    state === 'active'
      ? 'text-white'
      : state === 'completed'
      ? (isSkipped ? 'text-[hsl(28_70%_25%)]' : 'text-[hsl(108_55%_22%)]')
      : state === 'locked'
      ? 'text-muted-foreground/50'
      : 'text-foreground/70';


  // Status pill
  const statusPill =
    state === 'active'
      ? { label: 'В роботі', bg: 'hsl(232 80% 95%)', text: 'hsl(232 60% 40%)', Icon: Sparkles }
      : state === 'completed'
      ? (isSkipped
          ? { label: 'Пропущено', bg: 'hsl(36 90% 92%)', text: 'hsl(28 70% 35%)', Icon: SkipForward }
          : { label: 'Готово', bg: 'hsl(108 50% 92%)', text: 'hsl(108 55% 28%)', Icon: Check })
      : state === 'locked'
      ? { label: 'Заблоковано', bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))', Icon: Lock }
      : { label: 'Очікує', bg: 'hsl(220 14% 96%)', text: 'hsl(220 10% 40%)', Icon: Clock };
  const StatusIcon = statusPill.Icon;


  const titleLines = title.split('\n');
  const mainTitle = titleLines[0];
  const subTitle = titleLines.slice(1).join(' • ');

  return (
    <div className="flex items-start flex-shrink-0">
      <div className="flex flex-col" style={{ width: '240px' }}>
        {/* Step badge above */}
        <div className="flex items-center gap-2 mb-2 px-1 h-4">
          <span className={`font-mono text-[10px] tracking-widest uppercase ${
            state === 'active' ? 'text-primary font-bold' :
            state === 'completed' ? 'text-success font-semibold' :
            'text-muted-foreground/70'
          }`}>
            КРОК {String(index + 1).padStart(2, '0')}
          </span>
          {isActive && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
          )}
        </div>

        {/* Main info card */}
        <button
          onClick={onClick}
          disabled={isLocked}
          className={`
            relative w-full rounded-2xl p-4 text-left
            transition-all duration-300 ease-out
            ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}
          `}
          style={cardStyle}
        >
          {/* Top-right circular icon badge */}
          <span
            className="absolute -top-2 -right-2 flex items-center justify-center w-10 h-10 rounded-full border-2 border-background"
            style={{ background: badgeBg }}
          >
            <Icon className={`w-5 h-5 ${badgeIconColor}`} strokeWidth={2} />
          </span>

          {/* Title */}
          <h3
            className={`text-[15px] font-bold leading-tight pr-8 ${
              state === 'locked' ? 'text-muted-foreground/60' : 'text-foreground'
            }`}
          >
            {mainTitle}
          </h3>
          {subTitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5 pr-8">{subTitle}</p>
          )}

          {/* Description */}
          <p
            className={`text-[12px] leading-snug mt-2 ${
              state === 'locked' ? 'text-muted-foreground/50' : 'text-muted-foreground'
            }`}
          >
            {DESCRIPTIONS[index] || ''}
          </p>

          {/* Subtitle (dynamic data — metrics / chosen niche / etc.) */}
          {subtitle && (
            <div className="flex flex-col gap-1 mt-3">
              {subtitle.split('\n').map((line, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium text-foreground/80 px-2 py-1 rounded-md bg-foreground/[0.04] border border-border/40 truncate"
                >
                  {line}
                </span>
              ))}
            </div>
          )}

          {/* Footer: status pill */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
              style={{ background: statusPill.bg, color: statusPill.text }}
            >
              <StatusIcon className="w-3 h-3" strokeWidth={2.5} />
              {statusPill.label}
            </span>
            <span
              className={`text-[10px] font-mono ${
                state === 'locked' ? 'text-muted-foreground/40' : 'text-muted-foreground/70'
              }`}
            >
              {String(index + 1).padStart(2, '0')}/{String(9).padStart(2, '0')}
            </span>
          </div>
        </button>
      </div>

      {/* ---- Connector ---- */}
      {!isLast && (
        <div className="flex items-center flex-shrink-0" style={{ alignSelf: 'center', marginTop: '24px' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" className="overflow-visible">
            <circle
              cx="3" cy="10" r="2.5"
              fill="hsl(0 0% 100%)"
              stroke={isCompleted ? 'hsl(108 45% 50%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
            />
            <line
              x1="6" y1="10" x2="14" y2="10"
              stroke={isCompleted ? 'hsl(108 45% 50%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
              strokeDasharray={isCompleted ? '0' : '3 3'}
            />
            <circle
              cx="17" cy="10" r="2.5"
              fill="hsl(0 0% 100%)"
              stroke={isCompleted ? 'hsl(108 45% 50%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FlowNode;
