import React, { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Must match DECLINED_LEADS_PREFIX in Dashboard.tsx.
const DECLINED_LEADS_PREFIX = 'declined_leads_';

const SALES_TELEGRAM_URL = 'https://t.me/sales_adschool';
const PM_TELEGRAM_URL = 'https://t.me/project_adschool';
const ADSCHOOL_PRODUCTS_URL = 'https://ads-school.online/?utm_source=sim';

const DemoExpiredScreen: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="glass-card p-8 max-w-md w-full text-center space-y-5">
      <h2 className="text-xl font-bold">🔒 Демо-доступ завершено</h2>
      <div className="text-sm text-muted-foreground space-y-3 text-left">
        <p>Дякуємо за інтерес до <strong>Симулятора маркетолога</strong></p>
        <p>Маємо надію, що це був корисний та цікавий досвід 🙌</p>
        <p>Подальший доступ до симулятора доступний лише для студентів ADSchool.</p>
        <p>
          Якщо ви вже є нашим студентом, але ще не маєте доступу — напишіть, будь ласка, нашому
          проджект-менеджеру в Telegram:
          <br />
          👉{' '}
          <a href={PM_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 font-medium">
            Написати проджект-менеджеру
          </a>
        </p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Button asChild className="w-full">
          <a href={SALES_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Стати студентом ADSchool</a>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <a href={ADSCHOOL_PRODUCTS_URL} target="_blank" rel="noopener noreferrer">Продукти ADSchool</a>
        </Button>
        <Button variant="ghost" onClick={onSignOut}>Вийти</Button>
      </div>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode; requireApproved?: boolean }> = ({ children, requireApproved = true }) => {
  const { user, profile, loading, signOut, demoExpired } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Ручне скидання онбордингу/демо через URL: ?resetOnboarding=1. Must run
  // here (before the demoExpired gate below) — a Dashboard-local effect
  // never got a chance to fire once demo access already expired, since
  // Dashboard itself never mounted past that gate.
  useEffect(() => {
    if (searchParams.get('resetOnboarding') !== '1' || !user?.id) return;
    (async () => {
      try {
        localStorage.removeItem(`leadoslav_tour_seen_${user.id}`);
        localStorage.removeItem(`leadoslav_funnel_onboard_step_${user.id}`);
        localStorage.removeItem(`${DECLINED_LEADS_PREFIX}${user.id}`);
        // Прибираємо всі взяті в роботу проєкти — щоб кабінет виглядав так,
        // ніби юзер щойно зареєструвався, а не просто скинув онбординг-флаги
        // поверх старої історії. Ключі мусять збігатись з STORAGE_KEY_PREFIX
        // (+ :deleted, :legacyImported) у ScenariosContext.tsx.
        localStorage.removeItem(`scenarios:${user.id}`);
        localStorage.removeItem(`scenarios:${user.id}:deleted`);
        localStorage.removeItem(`scenarios:${user.id}:legacyImported`);
      } catch { /* localStorage unavailable */ }
      try {
        await supabase.from('profiles').update({ created_at: new Date().toISOString() }).eq('id', user.id);
      } catch { /* best-effort */ }
      try {
        await supabase.from('scenario_workspaces').upsert({ id: user.id, user_id: user.id, scenarios: [] }, { onConflict: 'id' });
      } catch { /* best-effort */ }
      navigate('/', { replace: true });
      window.location.reload();
    })();
  }, [searchParams, user?.id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireApproved && profile?.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-card p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">
            {profile?.status === 'rejected' ? 'Доступ відхилено' : 'Очікує підтвердження'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {profile?.status === 'rejected'
              ? 'На жаль, адміністратор відхилив вашу заявку.'
              : 'Ваш акаунт зареєстровано. Доступ відкриється після підтвердження адміністратором.'}
          </p>
          <Button variant="outline" onClick={signOut}>Вийти</Button>
        </div>
      </div>
    );
  }

  if (demoExpired) {
    return <DemoExpiredScreen onSignOut={signOut} />;
  }

  return <>{children}</>;
};
