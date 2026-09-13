import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Trello } from 'lucide-react';

interface ModeSwitchProps {
  active: 'sim' | 'crm';
}

// Segmented toggle for jumping between the marketer simulator and the CRM —
// lives in both pages' headers so switching feels like flipping a tab, not
// following a one-way link.
export const ModeSwitch: React.FC<ModeSwitchProps> = ({ active }) => {
  const navigate = useNavigate();
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-secondary/50 p-0.5">
      <button
        type="button"
        onClick={() => navigate('/')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
          active === 'sim' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Rocket className="w-3.5 h-3.5" /> Симулятор
      </button>
      <button
        type="button"
        onClick={() => navigate('/crm')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
          active === 'crm' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Trello className="w-3.5 h-3.5" /> CRM
      </button>
    </div>
  );
};
