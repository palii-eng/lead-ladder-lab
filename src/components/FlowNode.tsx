import React from 'react';

interface FlowNodeProps {
  icon: string;
  title: string;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isLast: boolean;
  onClick: () => void;
}

const FlowNode: React.FC<FlowNodeProps> = ({ icon, title, index, isActive, isCompleted, isLast, onClick }) => {
  return (
    <div className="flex items-center flex-shrink-0">
      {/* Node */}
      <button
        onClick={onClick}
        className={`relative flex flex-col items-center gap-2 group transition-all duration-200`}
      >
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all duration-300 cursor-pointer
            ${isActive
              ? 'border-primary bg-primary/10 shadow-[0_0_20px_hsl(232_55%_49%/0.2)] scale-110'
              : isCompleted
              ? 'border-success bg-success/10'
              : 'border-border bg-card hover:border-primary/40 hover:scale-105'
            }`}
        >
          {icon}
        </div>
        <span className={`text-xs font-semibold max-w-[80px] text-center leading-tight transition-colors ${
          isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {title}
        </span>
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
