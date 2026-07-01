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
  funnelFormat?: string;
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
  photoKey?: string;
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
  clientActions?: string[];
  niche: string;
  leadSource: string;
  channel: string;
  awarenessType?: string;
  trafficType?: string;
  engagementType?: string;
  salesType?: string;
  leadTypes: string[];
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt?: string;
  currentStep: number;
  launchMethod: string;
  funnelFormat?: string;
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
  funnelFormat: '',
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
  updatedAt: new Date().toISOString(),
  currentStep: 0,
  launchMethod: '',
  funnelFormat: '',
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
const LEGACY_STORAGE_KEY = 'scenarios';
const DELETED_STORAGE_SUFFIX = ':deleted';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isEmptyValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isRecord(value)) return Object.keys(value).length === 0;
  return false;
};

const normalizeDecompScenario = (value: unknown): DecompositionScenario => {
  const raw = isRecord(value) ? value : {};
  return {
    cpm: Number(raw.cpm) || 0,
    ctr: Number(raw.ctr) || 0,
    cpc: Number(raw.cpc) || 0,
    cpl: Number(raw.cpl) || 0,
    landingConversion: Number(raw.landingConversion) || 0,
    conversionRate: Number(raw.conversionRate) || 0,
    averageCheck: Number(raw.averageCheck) || 0,
    marginality: Number(raw.marginality) || 0,
    budget: Number(raw.budget) || 10000,
  };
};

const normalizeDecompSet = (value: unknown): DecompositionSet => {
  const raw = isRecord(value) ? value : {};
  return {
    bad: normalizeDecompScenario(raw.bad),
    realistic: normalizeDecompScenario(raw.realistic),
    positive: normalizeDecompScenario(raw.positive),
  };
};

const normalizeRetention = (value: unknown): RetentionData => {
  const raw = isRecord(value) ? value : {};
  return {
    emailCount: Number(raw.emailCount) || 0,
    telegramCount: Number(raw.telegramCount) || 0,
    smsCount: Number(raw.smsCount) || 0,
    pushCount: Number(raw.pushCount) || 0,
  };
};

const normalizeBranchData = (value: unknown): BranchData => {
  const raw = isRecord(value) ? value : {};
  return {
    funnelFormat: typeof raw.funnelFormat === 'string' ? raw.funnelFormat : '',
    decomposition: normalizeDecompSet(raw.decomposition),
    leadDestinations: Array.isArray(raw.leadDestinations) ? raw.leadDestinations.filter(Boolean).map(String) : [],
    integrationMethod: typeof raw.integrationMethod === 'string' ? raw.integrationMethod : '',
    companyDescription: typeof raw.companyDescription === 'string' ? raw.companyDescription : '',
    salesChannel: typeof raw.salesChannel === 'string' ? raw.salesChannel : '',
    salesChannelOther: typeof raw.salesChannelOther === 'string' ? raw.salesChannelOther : '',
    retention: normalizeRetention(raw.retention),
  };
};


const normalizeScenario = (value: unknown): Scenario => {
  const raw = isRecord(value) ? value : {};
  const branchData: Record<string, BranchData> = {};
  if (isRecord(raw.branchData)) {
    Object.entries(raw.branchData).forEach(([key, branch]) => {
      branchData[key] = normalizeBranchData(branch);
    });
  }

  const decompositionsByType: Record<string, DecompositionSet> = {};
  if (isRecord(raw.decompositionsByType)) {
    Object.entries(raw.decompositionsByType).forEach(([key, decomp]) => {
      decompositionsByType[key] = normalizeDecompSet(decomp);
    });
  }

  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Сценарій',
    description: typeof raw.description === 'string' ? raw.description : '',
    difficulty: raw.difficulty === 'lucky' || raw.difficulty === 'suffer' ? raw.difficulty : undefined,
    clientBrief: isRecord(raw.clientBrief) ? raw.clientBrief as unknown as ClientBrief : undefined,
    clientActions: Array.isArray(raw.clientActions) ? raw.clientActions.filter(Boolean).map(String) : undefined,
    niche: typeof raw.niche === 'string' ? raw.niche : '',
    leadSource: typeof raw.leadSource === 'string' ? raw.leadSource : '',
    channel: typeof raw.channel === 'string' ? raw.channel : '',
    leadTypes: Array.isArray(raw.leadTypes) ? raw.leadTypes.filter(Boolean).map(String) : [],
    status: raw.status === 'completed' ? 'completed' : 'draft',
    createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt,
    currentStep: Number(raw.currentStep) || 0,
    launchMethod: typeof raw.launchMethod === 'string' ? raw.launchMethod : '',
    funnelFormat: typeof raw.funnelFormat === 'string' ? raw.funnelFormat : '',
    decomposition: normalizeDecompSet(raw.decomposition),
    decompositionsByType,
    leadDestinations: Array.isArray(raw.leadDestinations) ? raw.leadDestinations.filter(Boolean).map(String) : [],
    crmSystem: typeof raw.crmSystem === 'string' ? raw.crmSystem : '',
    integrationMethod: typeof raw.integrationMethod === 'string' ? raw.integrationMethod : '',
    companyDescription: typeof raw.companyDescription === 'string' ? raw.companyDescription : '',
    salesChannel: typeof raw.salesChannel === 'string' ? raw.salesChannel : '',
    salesChannelOther: typeof raw.salesChannelOther === 'string' ? raw.salesChannelOther : '',
    retention: normalizeRetention(raw.retention),
    branchData,
    aiCache: isRecord(raw.aiCache) ? raw.aiCache as Record<string, string> : undefined,
    ...(isRecord(raw.audienceSettings) ? { audienceSettings: raw.audienceSettings } : {}),
    ...(isRecord(raw.creoSettings) ? { creoSettings: raw.creoSettings } : {}),
    ...(isRecord(raw.creoBriefs) ? { creoBriefs: raw.creoBriefs } : {}),
  } as Scenario;

};

const decompScore = (set?: DecompositionSet) => {
  if (!set) return 0;
  return (['bad', 'realistic', 'positive'] as const).reduce((score, key) => {
    const d = set[key];
    return score + [d.cpm, d.ctr, d.cpc, d.cpl, d.landingConversion, d.conversionRate, d.averageCheck, d.marginality, d.budget]
      .filter(v => Number(v) > 0).length;
  }, 0);
};

const scenarioCompleteness = (raw: Scenario | undefined | null): number => {
  if (!raw) return -1;
  const s = normalizeScenario(raw);
  let score = 0;
  if (s.clientBrief && (s.clientBrief.name || s.clientBrief.task)) score += 20;
  score += (s.clientActions?.length || 0) * 8;
  if (s.difficulty) score += 2;
  if (s.status === 'completed') score += 120;
  if (typeof s.currentStep === 'number') score += s.currentStep * 8;
  if (s.niche) score += 25;
  if (s.leadSource) score += 20;
  if (s.channel) score += 20;
  score += (s.leadTypes?.length || 0) * 12;
  if (s.launchMethod) score += 8;
  score += decompScore(s.decomposition) * 3;
  score += Object.values(s.decompositionsByType || {}).reduce((sum, set) => sum + decompScore(set), 0);
  score += (s.leadDestinations?.length || 0) * 8;
  if (s.integrationMethod) score += 12;
  if (s.companyDescription) score += 10;
  if (s.salesChannel) score += 15;
  score += Object.keys(s.branchData || {}).length * 35;
  Object.values(s.branchData || {}).forEach(branch => {
    score += decompScore(branch.decomposition) * 3;
    score += (branch.leadDestinations?.length || 0) * 8;
    if (branch.integrationMethod) score += 12;
    if (branch.companyDescription) score += 10;
    if (branch.salesChannel) score += 15;
  });
  score += Object.keys(s.aiCache || {}).length * 4;
  return score;
};

const mergeValue = (preferred: unknown, fallback: unknown): unknown => {
  if (Array.isArray(preferred) || Array.isArray(fallback)) {
    const preferredArray = Array.isArray(preferred) ? preferred : [];
    const fallbackArray = Array.isArray(fallback) ? fallback : [];
    return preferredArray.length ? preferredArray : fallbackArray;
  }
  if (isRecord(preferred) || isRecord(fallback)) {
    const p = isRecord(preferred) ? preferred : {};
    const f = isRecord(fallback) ? fallback : {};
    return Array.from(new Set([...Object.keys(f), ...Object.keys(p)])).reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = mergeValue(p[key], f[key]);
      return acc;
    }, {});
  }
  return isEmptyValue(preferred) ? fallback : preferred;
};

const mergeScenarioPair = (local?: Scenario, cloud?: Scenario): Scenario => {
  const l = local ? normalizeScenario(local) : undefined;
  const c = cloud ? normalizeScenario(cloud) : undefined;
  if (!l && !c) return normalizeScenario({});
  if (!l) return c!;
  if (!c) return l;

  const localScore = scenarioCompleteness(l);
  const cloudScore = scenarioCompleteness(c);
  const localTime = new Date(l.updatedAt || l.createdAt || 0).getTime();
  const cloudTime = new Date(c.updatedAt || c.createdAt || 0).getTime();
  // Prefer the most recently updated version — user edits (including deletions) must always win.
  const preferred = cloudTime === localTime
    ? (cloudScore >= localScore ? c : l)
    : (cloudTime > localTime ? c : l);
  const fallback = preferred === c ? l : c;
  const merged = normalizeScenario(mergeValue(preferred, fallback));
  // Authoritative deletions: leadTypes and branchData come strictly from the preferred (latest) version,
  // so removing a branch can't be undone by a stale copy on the other side.
  merged.leadTypes = preferred.leadTypes || [];
  const allowed = new Set(merged.leadTypes);
  merged.branchData = Object.fromEntries(
    Object.entries(preferred.branchData || {}).filter(([k]) => allowed.has(k))
  );
  return merged;
};

const mergeScenarios = (local: Scenario[], cloud: Scenario[]): Scenario[] => {
  const ids = new Set<string>();
  [...local, ...cloud].forEach(s => s?.id && ids.add(s.id));
  const out: Scenario[] = [];
  ids.forEach(id => {
    const l = local.find(x => x.id === id);
    const c = cloud.find(x => x.id === id);
    out.push(mergeScenarioPair(l, c));
  });
  return out.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
};

const readDeletedScenarioIds = (userId: string): Record<string, string> => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}${DELETED_STORAGE_SUFFIX}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return isRecord(parsed)
      ? Object.fromEntries(Object.entries(parsed).filter(([id, ts]) => typeof id === 'string' && typeof ts === 'string')) as Record<string, string>
      : {};
  } catch {
    return {};
  }
};

const writeDeletedScenarioIds = (userId: string, deleted: Record<string, string>) => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}${DELETED_STORAGE_SUFFIX}`, JSON.stringify(deleted));
  } catch (e) {
    console.error('Failed to save deleted scenario markers', e);
  }
};

const markScenarioDeleted = (userId: string, id: string) => {
  writeDeletedScenarioIds(userId, { ...readDeletedScenarioIds(userId), [id]: new Date().toISOString() });
};

const filterDeletedScenarios = (userId: string, list: Scenario[]): Scenario[] => {
  const deleted = readDeletedScenarioIds(userId);
  const deletedIds = new Set(Object.keys(deleted));
  return deletedIds.size ? list.filter(s => !deletedIds.has(s.id)) : list;
};

const persistLocal = (userId: string, next: Scenario[]) => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(filterDeletedScenarios(userId, next.map(normalizeScenario))));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}:legacyImported`, '1');
  } catch (e) {
    console.error('Failed to save scenarios locally', e);
  }
};

const readLocal = (userId: string): Scenario[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    const scoped = Array.isArray(parsed) ? parsed.map(normalizeScenario) : [];
    const legacyImported = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}:legacyImported`) === '1';
    if (legacyImported) return filterDeletedScenarios(userId, scoped);

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : [];
    const legacy = Array.isArray(legacyParsed) ? legacyParsed.map(normalizeScenario) : [];
    return filterDeletedScenarios(userId, mergeScenarios(scoped, legacy));
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
  return Array.isArray(data?.scenarios) ? (data!.scenarios as unknown[]).map(normalizeScenario) : [];
};

const persistCloud = async (userId: string, next: Scenario[]) => {
  const { error } = await supabase
    .from('scenario_workspaces')
    .upsert(
      { id: userId, user_id: userId, scenarios: next.map(normalizeScenario) as unknown as Json },
      { onConflict: 'id' }
    );
  if (error) throw error;
};

export const ScenariosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isApproved } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const cloudReadyRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const cloudSaveInFlightRef = useRef(false);
  const pendingCloudSaveRef = useRef<{ userId: string; scenarios: Scenario[] } | null>(null);

  const flushCloudSave = useCallback(() => {
    if (cloudSaveInFlightRef.current) return;
    const pending = pendingCloudSaveRef.current;
    if (!pending) return;
    pendingCloudSaveRef.current = null;
    cloudSaveInFlightRef.current = true;
    persistCloud(pending.userId, pending.scenarios)
      .catch(e => console.error('cloud save', e))
      .finally(() => {
        cloudSaveInFlightRef.current = false;
        if (pendingCloudSaveRef.current) flushCloudSave();
      });
  }, []);

  const queueCloudSave = useCallback((userId: string, next: Scenario[]) => {
    pendingCloudSaveRef.current = { userId, scenarios: filterDeletedScenarios(userId, next.map(normalizeScenario)) };
    flushCloudSave();
  }, [flushCloudSave]);

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
        const cloud = await readCloud(uid);
        if (cancelled || currentUserIdRef.current !== uid) return;
        // Re-read local after the cloud request finishes. A user can open/edit a
        // scenario while hydration is still pending; using the pre-request local
        // snapshot here could overwrite those fresh changes and make progress
        // appear lost on the next visit.
        const latestLocal = readLocal(uid);
        const merged = filterDeletedScenarios(uid, mergeScenarios(latestLocal, cloud));
        cloudReadyRef.current = true;
        persistLocal(uid, merged);
        setScenarios(merged);
        if (isApproved && JSON.stringify(merged) !== JSON.stringify(cloud)) {
          queueCloudSave(uid, merged);
        }
      } catch (e) {
        console.error('Cloud hydrate failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, isApproved, queueCloudSave]);

  const persistAll = useCallback((next: Scenario[], mergeExisting = true) => {
    const uid = currentUserIdRef.current;
    if (!uid) return next.map(normalizeScenario);
    const normalized = next.map(normalizeScenario);
    const safeNext = filterDeletedScenarios(uid, mergeExisting ? mergeScenarios(readLocal(uid), normalized) : normalized);
    persistLocal(uid, safeNext);
    if (cloudReadyRef.current && isApproved) {
      queueCloudSave(uid, safeNext);
    }
    return safeNext;
  }, [isApproved, queueCloudSave]);

  const addScenario = useCallback((name: string, description: string) => {
    const s = createDefaultScenario(name, description);
    setScenarios(prev => {
      const next = [s, ...prev];
      return persistAll(next);
    });
    return s;
  }, [persistAll]);

  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => {
      let base = prev;
      if (!prev.some(s => s.id === id)) {
        // Scenario might exist only in localStorage (cloud hydration still
        // pending, or opened via getScenario fallback). Pull it in so the
        // update doesn't silently no-op.
        const uid = currentUserIdRef.current;
        const fromLocal = uid ? readLocal(uid).find(s => s.id === id) : undefined;
        if (!fromLocal) return prev;
        base = [fromLocal, ...prev];
      }
      const next = base.map(s => s.id === id ? normalizeScenario({ ...s, ...updates, updatedAt: new Date().toISOString() }) : s);
      return persistAll(next);
    });
  }, [persistAll]);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev => {
      const uid = currentUserIdRef.current;
      if (uid) markScenarioDeleted(uid, id);
      const next = prev.filter(s => s.id !== id);
      return persistAll(next, false);
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
        updatedAt: new Date().toISOString(),
        status: 'draft',
      };
      const next = [copy, ...prev];
      return persistAll(next);
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
