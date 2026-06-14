import React from 'react';

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

const FlowNode: React.FC<FlowNodeProps> = ({ icon, title, isActive, isCompleted, isLast, isLocked, subtitle, onClick }) => {
  const state = isActive ? 'active' : isCompleted ? 'completed' : isLocked ? 'locked' : 'idle';

  return (
    <div className="flex items-start flex-shrink-0">
      {/* Node column */}
      <div className="flex flex-col items-center" style={{ minWidth: isActive ? '96px' : '76px' }}>
        <div className="relative">
          {/* Glow halo for active */}
          {isActive && (
            <span
              aria-hidden
              className="absolute inset-0 -m-3 rounded-full bg-primary/25 blur-2xl"
              style={{ animation: 'breathe 3s ease-in-out infinite' }}
            />
          )}

          <button
            onClick={onClick}
            disabled={isLocked}
            className={`
              relative flex-shrink-0 rounded-2xl flex items-center justify-center
              transition-all duration-500 ease-out backdrop-blur-sm
              ${state === 'active'
                ? 'w-[88px] h-[88px] text-3xl text-primary-foreground border border-white/20 shadow-[0_20px_50px_-12px_hsl(232_55%_49%/0.55)] scale-100'
                : state === 'completed'
                ? 'w-[68px] h-[68px] text-2xl text-success-foreground border border-white/30 shadow-[0_10px_25px_-10px_hsl(108_42%_52%/0.5)] hover:scale-105'
                : state === 'locked'
                ? 'w-[68px] h-[68px] text-2xl bg-muted/60 text-muted-foreground/50 border border-dashed border-border/60 opacity-60'
                : 'w-[68px] h-[68px] text-2xl bg-card text-foreground border border-border/80 shadow-[0_4px_12px_-6px_hsl(0_0%_0%/0.12)] hover:border-primary/50 hover:shadow-[0_10px_25px_-10px_hsl(232_55%_49%/0.35)] hover:scale-105 cursor-pointer'
              }
              ${isLocked ? 'cursor-not-allowed' : ''}
            `}
            style={
              state === 'active'
                ? { background: 'var(--gradient-primary)' }
                : state === 'completed'
                ? { background: 'linear-gradient(135deg, hsl(108 42% 52%), hsl(108 50% 60%))' }
                : undefined
            }
          >
            <span className="drop-shadow-sm">{icon}</span>

            {/* Completed check badge */}
            {isCompleted && !isActive && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background flex items-center justify-center text-[10px] font-bold text-success-foreground shadow-sm">
                ✓
              </span>
            )}
          </button>
        </div>

        <button
          onClick={onClick}
          disabled={isLocked}
          className={`mt-3 text-[11px] font-semibold max-w-[110px] text-center leading-tight tracking-tight transition-colors ${
            isActive
              ? 'text-primary'
              : isCompleted
              ? 'text-foreground'
              : isLocked
              ? 'text-muted-foreground/40'
              : 'text-muted-foreground hover:text-foreground'
          } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {title.split('\n').map((line, idx) => (
            <span key={idx} className={idx > 0 ? 'block text-[9px] text-primary/80 font-medium mt-0.5' : 'block'}>
              {line}
            </span>
          ))}
        </button>

        {subtitle && (
          <div className="flex flex-col items-center gap-1 mt-2">
            {subtitle.split('\n').map((line, idx) => (
              <span
                key={idx}
                className="text-[9px] font-medium text-primary max-w-[220px] text-center leading-tight whitespace-nowrap bg-primary/10 border border-primary/15 px-2 py-0.5 rounded-full backdrop-blur-sm"
              >
                {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Modern connector */}
      {!isLast && (
        <div className="flex items-center" style={{ height: isActive ? '88px' : '68px' }}>
          <svg width="84" height="20" viewBox="0 0 84 20" className="flex-shrink-0 mx-1.5 overflow-visible">
            <defs>
              <linearGradient id={`conn-${isCompleted ? 'done' : 'idle'}`} x1="0" x2="1" y1="0" y2="0">
                {isCompleted ? (
                  <>
                    <stop offset="0%" stopColor="hsl(108 42% 52%)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="hsl(108 50% 60%)" stopOpacity="1" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0.9" />
                  </>
                )}
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1="10"
              x2="70"
              y2="10"
              strokeWidth="2"
              strokeLinecap="round"
              stroke={`url(#conn-${isCompleted ? 'done' : 'idle'})`}
            />
            <polygon
              points="68,4 80,10 68,16"
              className={`transition-colors duration-300 ${isCompleted ? 'fill-success' : 'fill-border'}`}
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FlowNode;
