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
  Check,
  Lock,
} from 'lucide-react';

interface FlowNodeProps {
  icon: string;
  title: string;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isLast: boolean;
  isLocked: boolean;
  subtitle?: string;
  onClick: () => void;
}

// Map step index → meaningful icon (9-step funnel)
const ICONS = [Target, Megaphone, Users, FileText, Calculator, Send, Plug, PhoneCall, Repeat];

const FlowNode: React.FC<FlowNodeProps> = ({
  title,
  index,
  isActive,
  isCompleted,
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

  // Card visuals per state — inspired by the reference (white card / green card / accent card)
  const cardStyle: React.CSSProperties =
    state === 'active'
      ? {
          background: 'var(--gradient-primary)',
          boxShadow:
            '0 18px 40px -14px hsl(232 55% 49% / 0.45), 0 4px 10px -4px hsl(0 0% 0% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.25)',
        }
      : state === 'completed'
      ? {
          background: 'linear-gradient(160deg, hsl(82 70% 78%) 0%, hsl(95 65% 65%) 100%)',
          boxShadow:
            '0 14px 30px -14px hsl(95 50% 40% / 0.4), 0 2px 6px -2px hsl(0 0% 0% / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.5)',
        }
      : state === 'locked'
      ? {
          background: 'hsl(var(--muted))',
          boxShadow: 'inset 0 0 0 1px hsl(var(--border))',
        }
      : {
          background: 'hsl(0 0% 100%)',
          boxShadow:
            '0 10px 24px -14px hsl(0 0% 0% / 0.18), 0 2px 6px -2px hsl(0 0% 0% / 0.05), inset 0 0 0 1px hsl(var(--border) / 0.6)',
        };

  const iconColor =
    state === 'active'
      ? 'text-white'
      : state === 'completed'
      ? 'text-[hsl(95_60%_22%)]'
      : state === 'locked'
      ? 'text-muted-foreground/50'
      : 'text-foreground/75';

  return (
    <div className="flex items-start flex-shrink-0">
      {/* ---- Node group ---- */}
      <div className="flex flex-col items-center" style={{ minWidth: '140px' }}>
        {/* Step number */}
        <div className="flex items-center gap-1.5 mb-2 h-4">
          <span className={`font-mono text-[10px] tracking-widest uppercase ${
            state === 'active' ? 'text-primary font-bold' :
            state === 'completed' ? 'text-success font-semibold' :
            'text-muted-foreground/70'
          }`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          {isActive && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
          )}
        </div>

        {/* Square icon card */}
        <button
          onClick={onClick}
          disabled={isLocked}
          className={`
            relative w-[88px] h-[88px] rounded-2xl
            flex items-center justify-center
            transition-all duration-300 ease-out
            ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:scale-[1.03]'}
          `}
          style={cardStyle}
        >
          {/* Tiny corner dot (like reference cards) */}
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background"
            style={{
              background:
                state === 'active'
                  ? 'hsl(0 0% 100%)'
                  : state === 'completed'
                  ? 'hsl(95 60% 35%)'
                  : 'hsl(var(--border))',
            }}
          />

          {/* Main icon */}
          {state === 'completed' ? (
            <Check className={`w-9 h-9 ${iconColor}`} strokeWidth={2.5} />
          ) : state === 'locked' ? (
            <Lock className={`w-7 h-7 ${iconColor}`} strokeWidth={2} />
          ) : (
            <Icon className={`w-9 h-9 ${iconColor}`} strokeWidth={1.8} />
          )}

          {/* Active glow ring */}
          {state === 'active' && (
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow: '0 0 0 4px hsl(232 80% 65% / 0.18)',
              }}
            />
          )}
        </button>

        {/* Title under card */}
        <div className="mt-3 text-center max-w-[140px]">
          {title.split('\n').map((line, idx) => (
            <div
              key={idx}
              className={
                idx === 0
                  ? `text-[12px] font-semibold leading-tight ${
                      state === 'active'
                        ? 'text-foreground'
                        : state === 'locked'
                        ? 'text-muted-foreground/60'
                        : 'text-foreground/85'
                    }`
                  : 'text-[10px] text-muted-foreground mt-0.5 leading-tight'
              }
            >
              {line}
            </div>
          ))}
        </div>

        {/* Subtitle pills */}
        {subtitle && (
          <div className="flex flex-col items-center gap-1 mt-2 max-w-[160px]">
            {subtitle.split('\n').map((line, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium text-foreground/70 px-2 py-0.5 rounded-full whitespace-nowrap bg-card border border-border/60"
              >
                {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---- Connector with circle endpoints (like reference) ---- */}
      {!isLast && (
        <div className="flex items-center" style={{ height: '88px', marginTop: '24px' }}>
          <svg width="48" height="88" viewBox="0 0 48 88" className="overflow-visible">
            {/* Left endpoint circle */}
            <circle
              cx="4"
              cy="44"
              r="3"
              fill="hsl(0 0% 100%)"
              stroke={isCompleted ? 'hsl(95 55% 45%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
            />
            {/* Line */}
            <line
              x1="8"
              y1="44"
              x2="40"
              y2="44"
              stroke={isCompleted ? 'hsl(95 55% 45%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
              strokeDasharray={isCompleted ? '0' : '3 3'}
            />
            {/* Right endpoint circle */}
            <circle
              cx="44"
              cy="44"
              r="3"
              fill="hsl(0 0% 100%)"
              stroke={isCompleted ? 'hsl(95 55% 45%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FlowNode;
