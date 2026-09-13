import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/context/AuthContext';

export interface CrmCard {
  id: string;
  title: string;
  phone: string;
  email: string;
  source: string;
  note: string;
  createdAt: string;
}

export interface CrmStage {
  id: string;
  name: string;
  color: string;
  cards: CrmCard[];
}

export interface CrmFunnel {
  id: string;
  name: string;
  color: string;
  stages: CrmStage[];
}

export interface CrmBoard {
  funnels: CrmFunnel[];
}

// Cycled through for new funnels/stages so each gets a distinct dot color,
// matching the colored-dot convention of real CRM tools.
export const CRM_PALETTE = [
  'hsl(232 80% 60%)',
  'hsl(142 60% 45%)',
  'hsl(266 65% 60%)',
  'hsl(28 90% 55%)',
  'hsl(330 70% 60%)',
  'hsl(190 70% 45%)',
  'hsl(0 70% 58%)',
  'hsl(48 90% 50%)',
];
const colorAt = (i: number) => CRM_PALETTE[i % CRM_PALETTE.length];

const DEFAULT_STAGES = ['Новий лід', 'В роботі', 'Переговори', 'Успішно', 'Відмова'];

const createDefaultFunnel = (name: string, colorIdx = 0): CrmFunnel => ({
  id: crypto.randomUUID(),
  name,
  color: colorAt(colorIdx),
  stages: DEFAULT_STAGES.map((stageName, i) => ({ id: crypto.randomUUID(), name: stageName, color: colorAt(i), cards: [] })),
});

const createDefaultBoard = (): CrmBoard => ({ funnels: [createDefaultFunnel('Воронка 1')] });

const STORAGE_PREFIX = 'crm_board:';

const readLocal = (userId: string): CrmBoard | null => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.funnels) ? parsed : null;
  } catch {
    return null;
  }
};

const persistLocal = (userId: string, board: CrmBoard) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(board));
  } catch {}
};

// Older saved boards may predate the phone/email/source/color fields, or
// still carry a since-removed score — backfill/strip so the UI never has to
// null-check every card.
const normalizeBoard = (board: CrmBoard): CrmBoard => ({
  funnels: board.funnels.map((f, fi) => ({
    ...f,
    color: f.color || colorAt(fi),
    stages: f.stages.map((s, si) => ({
      ...s,
      color: s.color || colorAt(si),
      cards: s.cards.map(({ score: _score, ...c }: any) => ({
        phone: '', email: '', source: '', note: '',
        ...c,
      })),
    })),
  })),
});

const readCloud = async (userId: string): Promise<CrmBoard | null> => {
  const { data, error } = await supabase
    .from('crm_boards')
    .select('board')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  const board = data?.board as unknown as CrmBoard | undefined;
  return board && Array.isArray(board.funnels) ? normalizeBoard(board) : null;
};

const persistCloud = async (userId: string, board: CrmBoard) => {
  const { error } = await supabase
    .from('crm_boards')
    .upsert({ id: userId, user_id: userId, board: board as unknown as Json }, { onConflict: 'id' });
  if (error) throw error;
};

export type NewCardInput = { title: string; phone?: string; email?: string; source?: string; note?: string };
export type CardUpdate = Partial<Pick<CrmCard, 'title' | 'phone' | 'email' | 'source' | 'note'>>;

interface CrmContextValue {
  board: CrmBoard;
  loading: boolean;
  addFunnel: (name: string) => void;
  renameFunnel: (funnelId: string, name: string) => void;
  deleteFunnel: (funnelId: string) => void;
  addStage: (funnelId: string, name: string) => void;
  renameStage: (funnelId: string, stageId: string, name: string) => void;
  deleteStage: (funnelId: string, stageId: string) => void;
  addCard: (funnelId: string, stageId: string, data: NewCardInput) => void;
  updateCard: (funnelId: string, stageId: string, cardId: string, updates: CardUpdate) => void;
  deleteCard: (funnelId: string, stageId: string, cardId: string) => void;
  moveCard: (funnelId: string, fromStageId: string, toStageId: string, cardId: string) => void;
}

const CrmContext = createContext<CrmContextValue | undefined>(undefined);

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isApproved } = useAuth();
  const [board, setBoard] = useState<CrmBoard>(createDefaultBoard());
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const cloudReadyRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef<{ userId: string; board: CrmBoard } | null>(null);

  const flushSave = useCallback(() => {
    if (saveInFlightRef.current) return;
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    saveInFlightRef.current = true;
    persistCloud(pending.userId, pending.board)
      .catch(e => console.error('crm cloud save', e))
      .finally(() => {
        saveInFlightRef.current = false;
        if (pendingSaveRef.current) flushSave();
      });
  }, []);

  const queueSave = useCallback((userId: string, next: CrmBoard) => {
    pendingSaveRef.current = { userId, board: next };
    flushSave();
  }, [flushSave]);

  useEffect(() => {
    const uid = user?.id ?? null;
    currentUserIdRef.current = uid;
    cloudReadyRef.current = false;

    if (!uid) {
      setBoard(createDefaultBoard());
      setLoading(false);
      return;
    }

    const local = normalizeBoard(readLocal(uid) || createDefaultBoard());
    setBoard(local);
    setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const cloud = await readCloud(uid);
        if (cancelled || currentUserIdRef.current !== uid) return;
        const merged = cloud || local;
        cloudReadyRef.current = true;
        persistLocal(uid, merged);
        setBoard(merged);
        if (isApproved && !cloud) {
          queueSave(uid, merged);
        }
      } catch (e) {
        console.error('CRM cloud hydrate failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, isApproved, queueSave]);

  const commit = useCallback((updater: (prev: CrmBoard) => CrmBoard) => {
    setBoard(prev => {
      const next = updater(prev);
      const uid = currentUserIdRef.current;
      if (uid) {
        persistLocal(uid, next);
        if (cloudReadyRef.current && isApproved) queueSave(uid, next);
      }
      return next;
    });
  }, [isApproved, queueSave]);

  const addFunnel = useCallback((name: string) => {
    commit(prev => ({ funnels: [...prev.funnels, createDefaultFunnel(name || 'Нова воронка', prev.funnels.length)] }));
  }, [commit]);

  const renameFunnel = useCallback((funnelId: string, name: string) => {
    commit(prev => ({ funnels: prev.funnels.map(f => f.id === funnelId ? { ...f, name } : f) }));
  }, [commit]);

  const deleteFunnel = useCallback((funnelId: string) => {
    commit(prev => ({ funnels: prev.funnels.filter(f => f.id !== funnelId) }));
  }, [commit]);

  const addStage = useCallback((funnelId: string, name: string) => {
    commit(prev => ({
      funnels: prev.funnels.map(f => f.id === funnelId
        ? { ...f, stages: [...f.stages, { id: crypto.randomUUID(), name: name || 'Новий етап', color: colorAt(f.stages.length), cards: [] }] }
        : f),
    }));
  }, [commit]);

  const renameStage = useCallback((funnelId: string, stageId: string, name: string) => {
    commit(prev => ({
      funnels: prev.funnels.map(f => f.id === funnelId
        ? { ...f, stages: f.stages.map(s => s.id === stageId ? { ...s, name } : s) }
        : f),
    }));
  }, [commit]);

  const deleteStage = useCallback((funnelId: string, stageId: string) => {
    commit(prev => ({
      funnels: prev.funnels.map(f => f.id === funnelId
        ? { ...f, stages: f.stages.filter(s => s.id !== stageId) }
        : f),
    }));
  }, [commit]);

  const addCard = useCallback((funnelId: string, stageId: string, data: NewCardInput) => {
    commit(prev => ({
      funnels: prev.funnels.map(f => f.id === funnelId
        ? {
            ...f,
            stages: f.stages.map(s => s.id === stageId
              ? {
                  ...s,
                  cards: [...s.cards, {
                    id: crypto.randomUUID(),
                    title: data.title,
                    phone: data.phone || '',
                    email: data.email || '',
                    source: data.source || '',
                    note: data.note || '',
                    createdAt: new Date().toISOString(),
                  }],
                }
              : s),
          }
        : f),
    }));
  }, [commit]);

  const updateCard = useCallback((funnelId: string, stageId: string, cardId: string, updates: CardUpdate) => {
    commit(prev => ({
      funnels: prev.funnels.map(f => f.id === funnelId
        ? {
            ...f,
            stages: f.stages.map(s => s.id === stageId
              ? { ...s, cards: s.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) }
              : s),
          }
        : f),
    }));
  }, [commit]);

  const deleteCard = useCallback((funnelId: string, stageId: string, cardId: string) => {
    commit(prev => ({
      funnels: prev.funnels.map(f => f.id === funnelId
        ? { ...f, stages: f.stages.map(s => s.id === stageId ? { ...s, cards: s.cards.filter(c => c.id !== cardId) } : s) }
        : f),
    }));
  }, [commit]);

  const moveCard = useCallback((funnelId: string, fromStageId: string, toStageId: string, cardId: string) => {
    if (fromStageId === toStageId) return;
    commit(prev => ({
      funnels: prev.funnels.map(f => {
        if (f.id !== funnelId) return f;
        const fromStage = f.stages.find(s => s.id === fromStageId);
        const card = fromStage?.cards.find(c => c.id === cardId);
        if (!card) return f;
        return {
          ...f,
          stages: f.stages.map(s => {
            if (s.id === fromStageId) return { ...s, cards: s.cards.filter(c => c.id !== cardId) };
            if (s.id === toStageId) return { ...s, cards: [...s.cards, card] };
            return s;
          }),
        };
      }),
    }));
  }, [commit]);

  return (
    <CrmContext.Provider value={{
      board, loading, addFunnel, renameFunnel, deleteFunnel,
      addStage, renameStage, deleteStage, addCard, updateCard, deleteCard, moveCard,
    }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = (): CrmContextValue => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
};
