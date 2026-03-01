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

const FlowNode: React.FC<FlowNodeProps> = ({ icon, title, index, isActive, isCompleted, isLast, isLocked, subtitle, onClick }) => {
  return (
    <div className="flex items-center flex-shrink-0">
      {/* Node */}
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`relative flex flex-col items-center gap-2 group transition-all duration-200 ${isLocked ? 'cursor-not-allowed' : ''}`}
      >
        <div
          className={`rounded-full flex items-center justify-center border-2 transition-all duration-300
            ${isActive
              ? 'w-[84px] h-[84px] text-3xl border-primary bg-primary/10 shadow-[0_0_24px_hsl(232_55%_49%/0.25)]'
              : isCompleted
              ? 'w-16 h-16 text-2xl border-success bg-success/10'
              : isLocked
              ? 'w-16 h-16 text-2xl border-border/50 bg-muted opacity-40'
              : 'w-16 h-16 text-2xl border-border bg-card hover:border-primary/40 hover:scale-105 cursor-pointer'
            }`}
          style={isActive ? { animation: 'breathe 3s ease-in-out infinite' } : undefined}
        >
          {icon}
        </div>
        <span className={`text-xs font-semibold max-w-[80px] text-center leading-tight transition-colors ${
          isActive ? 'text-primary font-bold' : isCompleted ? 'text-foreground' : isLocked ? 'text-muted-foreground/40' : 'text-muted-foreground'
        }`}>
          {title}
        </span>
        {/* Subtitle showing selected value */}
        {subtitle && (
          <div className="flex flex-col items-center gap-0.5 mt-0.5">
            {subtitle.split('\n').map((line, idx) => (
              <span key={idx} className="text-[9px] text-primary font-medium max-w-[180px] text-center leading-tight whitespace-nowrap bg-primary/10 px-2 py-0.5 rounded-full">
                {line}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Connector line */}
      {!isLast && (
        <div className="flex items-center mx-1 -mt-5">
          <svg width="80" height="12" viewBox="0 0 80 12" className="flex-shrink-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <circle
                key={i}
                cx={5 + i * 10}
                cy={6}
                r={3}
                className={`transition-colors duration-300 ${
                  isCompleted ? 'fill-success' : 'fill-border'
                }`}
              />
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};

export default FlowNode;
