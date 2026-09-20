import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { daysSinceRegistration } from '@/lib/daysSinceRegistration';

export const DEMO_ACCESS_DAYS = 3;

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Продакшн-домен, на який реально налаштований Redirect URL у Supabase
// Auth. Лінк підтвердження email мусить вести саме сюди незалежно від
// того, з якого origin (прев'ю-домен, localhost і т.д.) людина
// реєструється — інакше Supabase відхиляє редірект і email лишається
// непідтвердженим назавжди, хоч лист і надійшов.
const PRODUCTION_ORIGIN = 'https://sim.ads-school.online';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  status: ApprovalStatus;
  created_at: string;
  is_graduate: boolean;
  graduated_at: string | null;
  avatar_url: string | null;
}

// Три рівні доступу поверх ролі (tester/user/admin/moderator):
//  - 'demo'     — щойно зареєстрований (роль tester), доступ лише 3 дні
//  - 'student'  — підвищений адміном/модератором до "Студент ADSchool"
//  - 'graduate' — позначений як такий, що пройшов симулятор (is_graduate)
// Staff (admin/moderator) не мають рівня — у них повний доступ завжди.
export type AccessTier = 'demo' | 'student' | 'graduate';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  isTester: boolean;
  isApproved: boolean;
  accessTier: AccessTier;
  /** Коли роль user (студент) було призначено — точка відліку для щоденної квоти лідів. */
  studentSince: string | null;
  /** true, якщо це демо (tester) і минуло більше 3 днів з реєстрації — доступ заблоковано. */
  demoExpired: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, signupSource?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isTester, setIsTester] = useState(false);
  const [studentSince, setStudentSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRole = async (userId: string) => {
    try {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role, created_at').eq('user_id', userId),
      ]);
      setProfile(prof as Profile | null);
      setIsAdmin(!!roles?.some(r => r.role === 'admin'));
      setIsModerator(!!roles?.some(r => r.role === 'moderator'));
      setIsTester(!!roles?.some(r => r.role === 'tester'));
      setStudentSince(roles?.find(r => r.role === 'user')?.created_at ?? null);
    } catch (e) {
      console.error('Failed to load profile/role', e);
    }
  };

  useEffect(() => {
    // Register listener FIRST, then check current session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid deadlocks with auth client.
        setTimeout(() => loadProfileAndRole(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsModerator(false);
        setIsTester(false);
        setStudentSince(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadProfileAndRole(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp: AuthContextType['signUp'] = async (email, password, fullName, signupSource) => {
    const redirectUrl = `${window.location.hostname === 'localhost' ? window.location.origin : PRODUCTION_ORIGIN}/confirmed`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName, ...(signupSource ? { signup_source: signupSource } : {}) } },
    });
    return { error };
  };

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  const isGraduate = !!profile?.is_graduate;
  const accessTier: AccessTier = isGraduate ? 'graduate' : isTester ? 'demo' : 'student';
  const demoExpired = accessTier === 'demo' && !isAdmin && !isModerator
    && daysSinceRegistration(profile?.created_at) > DEMO_ACCESS_DAYS;

  return (
    <AuthContext.Provider value={{
      user, session, profile, isAdmin, isModerator, isStaff: isAdmin || isModerator, isTester,
      isApproved: profile?.status === 'approved',
      accessTier, studentSince, demoExpired,
      loading, signUp, signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
