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

// Step-specific icons (9-step funnel)
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

  // Subtle green tint on completed (not fully green)
  const cardStyle: React.CSSProperties =
    state === 'active'
      ? {
          background: 'var(--gradient-primary)',
          boxShadow:
            '0 18px 40px -14px hsl(232 55% 49% / 0.45), 0 4px 10px -4px hsl(0 0% 0% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.25)',
        }
      : state === 'completed'
      ? {
          background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(108 45% 96%) 100%)',
          boxShadow:
            '0 12px 26px -14px hsl(108 40% 35% / 0.25), 0 2px 6px -2px hsl(0 0% 0% / 0.05), inset 0 0 0 1.5px hsl(108 40% 70% / 0.55)',
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
      ? 'text-[hsl(108_45%_35%)]'
      : state === 'locked'
      ? 'text-muted-foreground/50'
      : 'text-foreground/75';

  return (
    <div className="flex items-start flex-shrink-0">
      <div className="flex flex-col items-center" style={{ minWidth: '160px' }}>
        {/* Step number above */}
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

        {/* Taller card */}
        <button
          onClick={onClick}
          disabled={isLocked}
          className={`
            relative w-[104px] h-[128px] rounded-2xl
            flex flex-col items-center justify-center gap-2
            transition-all duration-300 ease-out
            ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:scale-[1.03]'}
          `}
          style={cardStyle}
        >
          {/* Tiny corner dot */}
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background"
            style={{
              background:
                state === 'active'
                  ? 'hsl(0 0% 100%)'
                  : state === 'completed'
                  ? 'hsl(108 45% 45%)'
                  : 'hsl(var(--border))',
            }}
          />

          {/* Main step icon — always visible */}
          {state === 'locked' ? (
            <Lock className={`w-9 h-9 ${iconColor}`} strokeWidth={2} />
          ) : (
            <Icon className={`w-10 h-10 ${iconColor}`} strokeWidth={1.8} />
          )}

          {/* Completed check badge in corner */}
          {state === 'completed' && (
            <span
              className="absolute bottom-2 right-2 flex items-center justify-center w-5 h-5 rounded-full text-white text-[11px] font-bold"
              style={{
                background: 'linear-gradient(135deg, hsl(108 50% 50%), hsl(108 55% 42%))',
                boxShadow: '0 2px 6px -1px hsl(108 50% 35% / 0.5)',
              }}
            >
              ✓
            </span>
          )}

          {/* Active glow ring */}
          {state === 'active' && (
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ boxShadow: '0 0 0 4px hsl(232 80% 65% / 0.18)' }}
            />
          )}

          {/* Step label inside card */}
          <span
            className={`text-[9px] font-mono tracking-widest uppercase mt-1 ${
              state === 'active' ? 'text-white/80' :
              state === 'completed' ? 'text-[hsl(108_30%_40%)]' :
              state === 'locked' ? 'text-muted-foreground/40' :
              'text-muted-foreground'
            }`}
          >
            STEP {String(index + 1).padStart(2, '0')}
          </span>
        </button>

        {/* Title under card */}
        <div className="mt-3 text-center max-w-[160px]">
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
          <div className="flex flex-col items-center gap-1 mt-2 max-w-[170px]">
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

      {/* ---- Connector ---- */}
      {!isLast && (
        <div className="flex items-center" style={{ height: '128px', marginTop: '24px' }}>
          <svg width="48" height="128" viewBox="0 0 48 128" className="overflow-visible">
            <circle
              cx="4" cy="64" r="3"
              fill="hsl(0 0% 100%)"
              stroke={isCompleted ? 'hsl(108 45% 50%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
            />
            <line
              x1="8" y1="64" x2="40" y2="64"
              stroke={isCompleted ? 'hsl(108 45% 50%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
              strokeDasharray={isCompleted ? '0' : '3 3'}
            />
            <circle
              cx="44" cy="64" r="3"
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
