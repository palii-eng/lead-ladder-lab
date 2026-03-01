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
  const circleSize = isActive ? 84 : 64;
  const circleRadius = circleSize / 2;

  return (
    <div className="flex items-start flex-shrink-0">
      <div className="flex flex-col items-center">
        {/* Circle row with connectors */}
        <div className="flex items-center" style={{ height: `${circleSize}px` }}>
          {/* Circle */}
          <button
            onClick={onClick}
            disabled={isLocked}
            className={`flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-300
              ${isActive
                ? 'w-[84px] h-[84px] text-3xl border-primary bg-primary/10 shadow-[0_0_24px_hsl(232_55%_49%/0.25)]'
                : isCompleted
                ? 'w-16 h-16 text-2xl border-success bg-success/10'
                : isLocked
                ? 'w-16 h-16 text-2xl border-border/50 bg-muted opacity-40'
                : 'w-16 h-16 text-2xl border-border bg-card hover:border-primary/40 hover:scale-105 cursor-pointer'
              } ${isLocked ? 'cursor-not-allowed' : ''}`}
            style={isActive ? { animation: 'breathe 3s ease-in-out infinite' } : undefined}
          >
            {icon}
          </button>

          {/* Connector arrow */}
          {!isLast && (
            <svg width="60" height="16" viewBox="0 0 60 16" className="flex-shrink-0">
              <line
                x1="0" y1="8" x2="48" y2="8"
                strokeWidth="2"
                strokeDasharray="6 3"
                className={`transition-colors duration-300 ${
                  isCompleted ? 'stroke-success' : 'stroke-border'
                }`}
              />
              <polygon
                points="46,3 56,8 46,13"
                className={`transition-colors duration-300 ${
                  isCompleted ? 'fill-success' : 'fill-border'
                }`}
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <button
          onClick={onClick}
          disabled={isLocked}
          className={`mt-2 text-xs font-semibold max-w-[80px] text-center leading-tight transition-colors ${
            isActive ? 'text-primary font-bold' : isCompleted ? 'text-foreground' : isLocked ? 'text-muted-foreground/40' : 'text-muted-foreground'
          } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {title}
        </button>

        {/* Subtitle */}
        {subtitle && (
          <div className="flex flex-col items-center gap-0.5 mt-1">
            {subtitle.split('\n').map((line, idx) => (
              <span key={idx} className="text-[9px] text-primary font-medium max-w-[180px] text-center leading-tight whitespace-nowrap bg-primary/10 px-2 py-0.5 rounded-full">
                {line}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowNode;
