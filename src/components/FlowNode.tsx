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

const FlowNode: React.FC<FlowNodeProps> = ({
  icon,
  title,
  index,
  isActive,
  isCompleted,
  isLast,
  isLocked,
  subtitle,
  onClick,
}) => {
  const state: 'active' | 'completed' | 'locked' | 'idle' = isActive
    ? 'active'
    : isCompleted
    ? 'completed'
    : isLocked
    ? 'locked'
    : 'idle';

  // Outer card sizing
  const cardSize = isActive ? 'w-[168px]' : 'w-[148px]';
  const padding = isActive ? 'p-4' : 'p-3.5';

  return (
    <div className="flex items-stretch flex-shrink-0">
      {/* ---- Node card ---- */}
      <div className="flex flex-col items-center" style={{ minWidth: isActive ? '180px' : '160px' }}>
        <div className="relative group">
          {/* Animated gradient border for active */}
          {isActive && (
            <span
              aria-hidden
              className="absolute -inset-[2px] rounded-[20px] opacity-90"
              style={{
                background:
                  'conic-gradient(from 0deg, hsl(232 80% 65%), hsl(260 70% 60%), hsl(200 80% 60%), hsl(232 80% 65%))',
                animation: 'spin 6s linear infinite',
                filter: 'blur(0.5px)',
              }}
            />
          )}

          {/* Soft glow halo */}
          {isActive && (
            <span
              aria-hidden
              className="absolute -inset-6 rounded-[28px] bg-primary/20 blur-3xl pointer-events-none"
              style={{ animation: 'breathe 4s ease-in-out infinite' }}
            />
          )}

          <button
            onClick={onClick}
            disabled={isLocked}
            className={`
              relative ${cardSize} ${padding}
              rounded-[18px] flex flex-col items-start gap-2.5
              transition-all duration-300 ease-out text-left
              ${state === 'active'
                ? 'bg-card border border-white/40 shadow-[0_20px_50px_-15px_hsl(232_55%_49%/0.45)]'
                : state === 'completed'
                ? 'bg-card border border-success/30 shadow-[0_8px_24px_-12px_hsl(108_42%_52%/0.4)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_hsl(108_42%_52%/0.5)]'
                : state === 'locked'
                ? 'bg-muted/40 border border-dashed border-border/60 opacity-55'
                : 'bg-card border border-border/70 shadow-[0_4px_14px_-8px_hsl(0_0%_0%/0.12)] hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_28px_-12px_hsl(232_55%_49%/0.3)]'
              }
              ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Top row: step number + icon */}
            <div className="flex items-center justify-between w-full">
              <span
                className={`text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-md ${
                  state === 'active'
                    ? 'bg-primary text-primary-foreground'
                    : state === 'completed'
                    ? 'bg-success/15 text-success'
                    : state === 'locked'
                    ? 'bg-muted text-muted-foreground/60'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <div
                className={`relative flex items-center justify-center rounded-xl text-xl transition-transform ${
                  isActive ? 'w-10 h-10 scale-110' : 'w-9 h-9'
                }`}
                style={
                  state === 'active'
                    ? { background: 'var(--gradient-primary)' }
                    : state === 'completed'
                    ? { background: 'linear-gradient(135deg, hsl(108 42% 52%), hsl(108 50% 60%))' }
                    : state === 'locked'
                    ? { background: 'hsl(var(--muted))' }
                    : { background: 'hsl(var(--accent))' }
                }
              >
                <span
                  className={`drop-shadow-sm ${
                    state === 'active' || state === 'completed' ? 'text-white' : ''
                  }`}
                >
                  {icon}
                </span>
                {isCompleted && !isActive && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-success border-2 border-card flex items-center justify-center text-[8px] font-bold text-white">
                    ✓
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="w-full">
              {title.split('\n').map((line, idx) => (
                <div
                  key={idx}
                  className={
                    idx === 0
                      ? `text-[12px] font-semibold leading-snug ${
                          state === 'locked' ? 'text-muted-foreground/50' : 'text-foreground'
                        }`
                      : 'text-[10px] text-primary font-medium mt-0.5 leading-tight'
                  }
                >
                  {line}
                </div>
              ))}
            </div>

            {/* Active indicator dot */}
            {isActive && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                <span className="text-[9px] font-medium text-primary uppercase tracking-wider">
                  Активний крок
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Subtitle pills below card */}
        {subtitle && (
          <div className="flex flex-col items-center gap-1 mt-3 max-w-[200px]">
            {subtitle.split('\n').map((line, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium text-foreground/80 bg-card border border-border/70 px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap"
              >
                {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---- Animated connector ---- */}
      {!isLast && (
        <div className="flex items-center self-start" style={{ height: isActive ? '96px' : '88px' }}>
          <svg width="64" height="24" viewBox="0 0 64 24" className="overflow-visible">
            <defs>
              <linearGradient id={`flow-${isCompleted ? 'done' : 'idle'}`} x1="0" x2="1">
                {isCompleted ? (
                  <>
                    <stop offset="0%" stopColor="hsl(108 42% 52%)" />
                    <stop offset="100%" stopColor="hsl(108 50% 60%)" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="hsl(var(--border))" />
                    <stop offset="100%" stopColor="hsl(var(--border))" />
                  </>
                )}
              </linearGradient>
            </defs>
            {/* base dashed line */}
            <line
              x1="0"
              y1="12"
              x2="52"
              y2="12"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4 4"
              stroke={`url(#flow-${isCompleted ? 'done' : 'idle'})`}
              opacity={isCompleted ? 1 : 0.5}
            >
              {isCompleted && (
                <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.2s" repeatCount="indefinite" />
              )}
            </line>
            {/* arrowhead */}
            <path
              d="M 50 6 L 60 12 L 50 18 Z"
              className={isCompleted ? 'fill-success' : 'fill-border'}
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FlowNode;
