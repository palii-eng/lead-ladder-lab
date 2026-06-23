import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface DecompositionScenario {
  cpm: number;
  ctr: number;
  cpc: number;
  cpl: number;
  landingConversion: number;
  conversionRate: number;
  averageCheck: number;
  marginality: number;
  budget: number;
}

export interface BranchData {
  decomposition: DecompositionSet;
  leadDestinations: string[];
  integrationMethod: string;
  companyDescription: string;
  retention: RetentionData;
}

export interface RetentionData {
  emailCount: number;
  telegramCount: number;
  smsCount: number;
  pushCount: number;
}

export interface DecompositionSet {
  bad: DecompositionScenario;
  realistic: DecompositionScenario;
  positive: DecompositionScenario;
}

export interface ClientBrief {
  name: string;
  photo: string;
  task: string;
  niche?: string;
  source?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty?: 'lucky' | 'suffer';
  clientBrief?: ClientBrief;
  niche: string;
  leadSource: string;
  channel: string;
  leadTypes: string[];
  status: 'draft' | 'completed';
  createdAt: string;
  currentStep: number;
  launchMethod: string;
  decomposition: DecompositionSet;
  decompositionsByType: Record<string, DecompositionSet>;
  leadDestinations: string[];
  crmSystem: string;
  integrationMethod: string;
  companyDescription: string;
  retention: RetentionData;
  branchData: Record<string, BranchData>;
  aiCache?: Record<string, string>;
}

const defaultDecomp: DecompositionScenario = {
  cpm: 0, ctr: 0, cpc: 0, cpl: 0, landingConversion: 0,
  conversionRate: 0, averageCheck: 0, marginality: 0, budget: 10000,
};

export const createDefaultDecompSet = (): DecompositionSet => ({
  bad: { ...defaultDecomp },
  realistic: { ...defaultDecomp },
  positive: { ...defaultDecomp },
});

export const createDefaultBranchData = (): BranchData => ({
  decomposition: createDefaultDecompSet(),
  leadDestinations: [],
  integrationMethod: '',
  companyDescription: '',
  retention: { emailCount: 0, telegramCount: 0, smsCount: 0, pushCount: 0 },
});

export const createDefaultScenario = (name: string, description: string): Scenario => ({
  id: crypto.randomUUID(),
  name,
  description,
  niche: '',
  leadSource: '',
  channel: '',
  leadTypes: [],
  status: 'draft',
  createdAt: new Date().toISOString(),
  currentStep: 0,
  launchMethod: '',
  decomposition: createDefaultDecompSet(),
  decompositionsByType: {},
  leadDestinations: [],
  crmSystem: '',
  integrationMethod: '',
  companyDescription: '',
  retention: { emailCount: 0, telegramCount: 0, smsCount: 0, pushCount: 0 },
  branchData: {},
});

interface ScenariosContextType {
  scenarios: Scenario[];
  addScenario: (name: string, description: string) => Scenario;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => void;
  getScenario: (id: string) => Scenario | undefined;
}

const ScenariosContext = createContext<ScenariosContextType | null>(null);

export const useScenarios = () => {
  const ctx = useContext(ScenariosContext);
  if (!ctx) throw new Error('useScenarios must be used within ScenariosProvider');
  return ctx;
};

const STORAGE_KEY = 'scenarios';

const readScenariosFromStorage = (): Scenario[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse scenarios from localStorage', e);
    // Preserve corrupted data for recovery instead of overwriting it.
    try {
      const corrupt = localStorage.getItem(STORAGE_KEY);
      if (corrupt) localStorage.setItem(`${STORAGE_KEY}__corrupt_${Date.now()}`, corrupt);
    } catch {}
    return [];
  }
};

export const ScenariosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>(readScenariosFromStorage);
  const hydratedRef = React.useRef(false);

  useEffect(() => {
    // Skip the very first effect run — it would just re-write what we read.
    // This also prevents wiping localStorage if initial read returned [] due to a
    // transient parse error while real data is still on disk.
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    } catch (e) {
      console.error('Failed to save scenarios to localStorage', e);
    }
  }, [scenarios]);

  // Sync across tabs and recover if another tab/process updated storage.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = readScenariosFromStorage();
      setScenarios(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addScenario = useCallback((name: string, description: string) => {
    const s = createDefaultScenario(name, description);
    setScenarios(prev => [s, ...prev]);
    return s;
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  const duplicateScenario = useCallback((id: string) => {
    setScenarios(prev => {
      const original = prev.find(s => s.id === id);
      if (!original) return prev;
      const copy: Scenario = {
        ...JSON.parse(JSON.stringify(original)),
        id: crypto.randomUUID(),
        name: `${original.name} (копія)`,
        createdAt: new Date().toISOString(),
        status: 'draft',
      };
      return [copy, ...prev];
    });
  }, []);

  const getScenario = useCallback((id: string) => scenarios.find(s => s.id === id), [scenarios]);

  return (
    <ScenariosContext.Provider value={{ scenarios, addScenario, updateScenario, deleteScenario, duplicateScenario, getScenario }}>
      {children}
    </ScenariosContext.Provider>
  );
};
