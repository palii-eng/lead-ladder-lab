import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/context/AuthContext';

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

const STORAGE_KEY_PREFIX = 'scenarios:';

const persistLocal = (userId: string, next: Scenario[]) => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save scenarios locally', e);
  }
};

const readLocal = (userId: string): Scenario[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readCloud = async (userId: string): Promise<Scenario[]> => {
  const { data, error } = await supabase
    .from('scenario_workspaces')
    .select('scenarios')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.scenarios) ? (data!.scenarios as unknown as Scenario[]) : [];
};

const persistCloud = async (userId: string, next: Scenario[]) => {
  const { error } = await supabase
    .from('scenario_workspaces')
    .upsert(
      { id: userId, user_id: userId, scenarios: next as unknown as Json },
      { onConflict: 'id' }
    );
  if (error) throw error;
};

const scenarioCompleteness = (s: Scenario | undefined | null): number => {
  if (!s) return -1;
  let score = 0;
  if (s.clientBrief && (s.clientBrief.name || s.clientBrief.task)) score += 100;
  if (s.status === 'completed') score += 50;
  if (typeof s.currentStep === 'number') score += s.currentStep * 5;
  if (s.niche) score += 2;
  if (s.branchData && Object.keys(s.branchData).length) score += Object.keys(s.branchData).length * 3;
  return score;
};

const mergeScenarios = (local: Scenario[], cloud: Scenario[]): Scenario[] => {
  const ids = new Set<string>();
  [...local, ...cloud].forEach(s => s?.id && ids.add(s.id));
  const out: Scenario[] = [];
  ids.forEach(id => {
    const l = local.find(x => x.id === id);
    const c = cloud.find(x => x.id === id);
    out.push(scenarioCompleteness(c) > scenarioCompleteness(l) ? c! : (l || c!));
  });
  return out.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
};

export const ScenariosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isApproved } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const cloudReadyRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Reset and load whenever the user changes.
  useEffect(() => {
    const uid = user?.id ?? null;
    currentUserIdRef.current = uid;
    cloudReadyRef.current = false;

    if (!uid) {
      setScenarios([]);
      setLoading(false);
      return;
    }

    // Seed from local immediately, then hydrate from cloud.
    setScenarios(readLocal(uid));
    setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const local = readLocal(uid);
        const cloud = await readCloud(uid);
        if (cancelled || currentUserIdRef.current !== uid) return;
        const merged = mergeScenarios(local, cloud);
        cloudReadyRef.current = true;
        persistLocal(uid, merged);
        setScenarios(merged);
        if (isApproved && JSON.stringify(merged) !== JSON.stringify(cloud)) {
          persistCloud(uid, merged).catch(e => console.error('cloud sync', e));
        }
      } catch (e) {
        console.error('Cloud hydrate failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, isApproved]);

  const persistAll = useCallback((next: Scenario[]) => {
    const uid = currentUserIdRef.current;
    if (!uid) return;
    persistLocal(uid, next);
    if (cloudReadyRef.current && isApproved) {
      persistCloud(uid, next).catch(e => console.error('cloud save', e));
    }
  }, [isApproved]);

  const addScenario = useCallback((name: string, description: string) => {
    const s = createDefaultScenario(name, description);
    setScenarios(prev => {
      const next = [s, ...prev];
      persistAll(next);
      return next;
    });
    return s;
  }, [persistAll]);

  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => {
      if (!prev.some(s => s.id === id)) return prev;
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      persistAll(next);
      return next;
    });
  }, [persistAll]);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev => {
      const next = prev.filter(s => s.id !== id);
      persistAll(next);
      return next;
    });
  }, [persistAll]);

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
      const next = [copy, ...prev];
      persistAll(next);
      return next;
    });
  }, [persistAll]);

  const getScenario = useCallback((id: string) => {
    return scenarios.find(s => s.id === id) ||
      (currentUserIdRef.current ? readLocal(currentUserIdRef.current).find(s => s.id === id) : undefined);
  }, [scenarios]);

  return (
    <ScenariosContext.Provider value={{ scenarios, loading, addScenario, updateScenario, deleteScenario, duplicateScenario, getScenario }}>
      {children}
    </ScenariosContext.Provider>
  );
};
