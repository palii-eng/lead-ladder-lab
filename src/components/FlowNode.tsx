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

/**
 * Neumorphic pill-style flow node inspired by soft UI mind-map aesthetics.
 * - Soft off-white pill with dual shadows (outer drop + inner highlight)
 * - Status dot + label sits above the pill
 * - Center indicator: gradient ring (active), green check (completed), small dot (idle), muted dot (locked)
 * - Step title sits below the pill
 */
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

  const statusColor =
    state === 'active'
      ? 'bg-primary'
      : state === 'completed'
      ? 'bg-success'
      : state === 'locked'
      ? 'bg-muted-foreground/30'
      : 'bg-muted-foreground/40';

  const statusLabel =
    state === 'active'
      ? 'Активний'
      : state === 'completed'
      ? 'Готово'
      : state === 'locked'
      ? 'Заблоковано'
      : 'Далі';

  // Neumorphic shadow recipes (light theme oriented but works on cards)
  const pillShadow = isActive
    ? '0 12px 28px -10px hsl(232 55% 49% / 0.28), 0 2px 6px -1px hsl(0 0% 0% / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.9)'
    : '0 6px 18px -8px hsl(0 0% 0% / 0.14), 0 1px 3px -1px hsl(0 0% 0% / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.9)';

  return (
    <div className="flex items-center flex-shrink-0">
      {/* ---- Node group ---- */}
      <div className="flex flex-col items-center" style={{ minWidth: '170px' }}>
        {/* Status dot + label above */}
        <div className="flex items-center gap-1.5 mb-2 h-4">
          <span className={`relative flex h-2 w-2`}>
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor}`} />
          </span>
          <span
            className={`font-mono text-[11px] tracking-tight ${
              state === 'active'
                ? 'text-foreground font-semibold'
                : state === 'completed'
                ? 'text-success font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {/* The pill itself */}
        <button
          onClick={onClick}
          disabled={isLocked}
          className={`
            relative w-[160px] h-[56px] rounded-full
            flex items-center justify-center
            transition-all duration-300 ease-out
            ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:-translate-y-0.5'}
          `}
          style={{
            background:
              state === 'locked'
                ? 'linear-gradient(180deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)'
                : 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(220 14% 96%) 100%)',
            boxShadow: pillShadow,
          }}
        >
          {/* Track dots (decorative) */}
          <span className="absolute left-5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-foreground/15" />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-foreground/15" />

          {/* Center indicator */}
          {state === 'active' && (
            <span
              className="relative flex items-center justify-center w-10 h-10 rounded-full"
              style={{
                background: 'var(--gradient-primary)',
                boxShadow:
                  '0 6px 14px -4px hsl(232 55% 49% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.6)',
              }}
            >
              <span className="w-3 h-3 rounded-full bg-white shadow-inner" />
            </span>
          )}
          {state === 'completed' && (
            <span
              className="relative flex items-center justify-center w-10 h-10 rounded-full text-white text-base font-bold"
              style={{
                background: 'linear-gradient(135deg, hsl(108 42% 52%), hsl(108 50% 60%))',
                boxShadow:
                  '0 6px 14px -4px hsl(108 42% 52% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.6)',
              }}
            >
              ✓
            </span>
          )}
          {state === 'idle' && (
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-foreground/[0.06] text-base opacity-70">
              {icon}
            </span>
          )}
          {state === 'locked' && (
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-foreground/[0.04] text-base opacity-40">
              {icon}
            </span>
          )}
        </button>

        {/* Title under pill */}
        <div className="mt-2.5 text-center max-w-[170px]">
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
                        : 'text-foreground/80'
                    }`
                  : 'text-[10px] text-muted-foreground mt-0.5 leading-tight'
              }
            >
              {line}
            </div>
          ))}
        </div>

        {/* Subtitle as soft pills */}
        {subtitle && (
          <div className="flex flex-col items-center gap-1 mt-2 max-w-[180px]">
            {subtitle.split('\n').map((line, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium text-foreground/70 px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{
                  background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(220 14% 96%))',
                  boxShadow:
                    '0 2px 6px -3px hsl(0 0% 0% / 0.1), inset 0 1px 0 hsl(0 0% 100% / 0.9)',
                }}
              >
                {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---- Soft curved connector ---- */}
      {!isLast && (
        <div className="flex items-center" style={{ height: '56px', marginTop: '4px' }}>
          <svg width="56" height="32" viewBox="0 0 56 32" className="overflow-visible">
            <defs>
              <linearGradient id={`conn-${isCompleted ? 'done' : 'idle'}`} x1="0" x2="1">
                {isCompleted ? (
                  <>
                    <stop offset="0%" stopColor="hsl(108 42% 52%)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="hsl(232 80% 65%)" stopOpacity="0.7" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0.4" />
                  </>
                )}
              </linearGradient>
            </defs>
            <path
              d="M 0 16 C 18 16, 38 16, 56 16"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              stroke={`url(#conn-${isCompleted ? 'done' : 'idle'})`}
            />
            {/* tiny node bead in the middle */}
            <circle
              cx="28"
              cy="16"
              r="3"
              fill="hsl(0 0% 100%)"
              stroke={isCompleted ? 'hsl(108 42% 52%)' : 'hsl(var(--border))'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FlowNode;
