import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

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
  salesChannel?: string;
  salesChannelOther?: string;
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
  salesChannel?: string;
  salesChannelOther?: string;
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
  salesChannel: '',
  salesChannelOther: '',
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
  salesChannel: '',
  salesChannelOther: '',
  retention: { emailCount: 0, telegramCount: 0, smsCount: 0, pushCount: 0 },
  branchData: {},
});

interface ScenariosContextType {
  scenarios: Scenario[];
  loading: boolean;
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
const CLOUD_WORKSPACE_ID = 'default';

const persistScenariosToStorage = (next: Scenario[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save scenarios to localStorage', e);
  }
};

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

// Score how "populated" a scenario is — used to pick a winner when the same
// scenario exists in both local and cloud (e.g. local was a stub created
// before cloud sync, while cloud has the full filled-in version).
const scenarioCompleteness = (s: Scenario | undefined | null): number => {
  if (!s) return -1;
  let score = 0;
  if (s.clientBrief && (s.clientBrief.name || s.clientBrief.task)) score += 100;
  if (s.status === 'completed') score += 50;
  if (typeof s.currentStep === 'number') score += s.currentStep * 5;
  if (s.niche) score += 2;
  if (s.leadSource) score += 2;
  if (s.channel) score += 2;
  if (s.leadTypes && s.leadTypes.length) score += s.leadTypes.length * 2;
  if (s.branchData && Object.keys(s.branchData).length) score += Object.keys(s.branchData).length * 3;
  if (s.companyDescription) score += 2;
  return score;
};

const mergeScenarios = (local: Scenario[], cloud: Scenario[]): Scenario[] => {
  const byId = new Map<string, Scenario>();
  // Seed with whichever side has more data per id.
  const seen = new Set<string>();
  [...local, ...cloud].forEach(s => {
    if (!s?.id || seen.has(s.id)) return;
    seen.add(s.id);
    const localVer = local.find(x => x.id === s.id);
    const cloudVer = cloud.find(x => x.id === s.id);
    const localScore = scenarioCompleteness(localVer);
    const cloudScore = scenarioCompleteness(cloudVer);
    const winner = cloudScore > localScore ? cloudVer! : (localVer || cloudVer!);
    byId.set(s.id, winner);
  });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
};

const readScenariosFromCloud = async (): Promise<Scenario[]> => {
  const { data, error } = await supabase
    .from('scenario_workspaces')
    .select('scenarios')
    .eq('id', CLOUD_WORKSPACE_ID)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.scenarios) ? data.scenarios as unknown as Scenario[] : [];
};

const persistScenariosToCloud = async (next: Scenario[]) => {
  const { error } = await supabase
    .from('scenario_workspaces')
    .upsert({ id: CLOUD_WORKSPACE_ID, scenarios: next as unknown as Json }, { onConflict: 'id' });

  if (error) throw error;
};

export const ScenariosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>(readScenariosFromStorage);
  const [loading, setLoading] = useState<boolean>(true);
  const hydratedRef = React.useRef(false);
  const cloudReadyRef = React.useRef(false);


  useEffect(() => {
    // Skip the very first effect run — it would just re-write what we read.
    // This also prevents wiping localStorage if initial read returned [] due to a
    // transient parse error while real data is still on disk.
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    persistScenariosToStorage(scenarios);
    if (cloudReadyRef.current) {
      persistScenariosToCloud(scenarios).catch(e => console.error('Failed to save scenarios to cloud', e));
    }
  }, [scenarios]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromCloud = async () => {
      try {
        const local = readScenariosFromStorage();
        const cloud = await readScenariosFromCloud();
        if (cancelled) return;

        const merged = mergeScenarios(local, cloud);
        cloudReadyRef.current = true;

        if (merged.length) {
          persistScenariosToStorage(merged);
          setScenarios(prev => (JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged));
          if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
            persistScenariosToCloud(merged).catch(e => console.error('Failed to sync scenarios to cloud', e));
          }
        }
      } catch (e) {
        cloudReadyRef.current = false;
        console.error('Failed to load scenarios from cloud', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrateFromCloud();
    return () => { cancelled = true; };
  }, []);


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
    setScenarios(prev => {
      const next = [s, ...prev];
      persistScenariosToStorage(next);
      if (cloudReadyRef.current) {
        persistScenariosToCloud(next).catch(e => console.error('Failed to save scenarios to cloud', e));
      }
      return next;
    });
    return s;
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => {
      const hasInState = prev.some(s => s.id === id);
      const base = hasInState ? prev : readScenariosFromStorage();
      if (!base.some(s => s.id === id)) return prev;

      const next = base.map(s => s.id === id ? { ...s, ...updates } : s);
      persistScenariosToStorage(next);
      if (cloudReadyRef.current) {
        persistScenariosToCloud(next).catch(e => console.error('Failed to save scenarios to cloud', e));
      }
      return next;
    });
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev => {
      const next = prev.filter(s => s.id !== id);
      persistScenariosToStorage(next);
      if (cloudReadyRef.current) {
        persistScenariosToCloud(next).catch(e => console.error('Failed to save scenarios to cloud', e));
      }
      return next;
    });
  }, []);

  const duplicateScenario = useCallback((id: string) => {
    setScenarios(prev => {
      const base = prev.some(s => s.id === id) ? prev : readScenariosFromStorage();
      const original = base.find(s => s.id === id);
      if (!original) return prev;
      const copy: Scenario = {
        ...JSON.parse(JSON.stringify(original)),
        id: crypto.randomUUID(),
        name: `${original.name} (копія)`,
        createdAt: new Date().toISOString(),
        status: 'draft',
      };
      const next = [copy, ...base];
      persistScenariosToStorage(next);
      if (cloudReadyRef.current) {
        persistScenariosToCloud(next).catch(e => console.error('Failed to save scenarios to cloud', e));
      }
      return next;
    });
  }, []);

  const getScenario = useCallback((id: string) => {
    return scenarios.find(s => s.id === id) || readScenariosFromStorage().find(s => s.id === id);
  }, [scenarios]);

  return (
    <ScenariosContext.Provider value={{ scenarios, loading, addScenario, updateScenario, deleteScenario, duplicateScenario, getScenario }}>
      {children}
    </ScenariosContext.Provider>
  );
};
