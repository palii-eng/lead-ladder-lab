import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

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
