import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export const ProtectedRoute: React.FC<{ children: React.ReactNode; requireApproved?: boolean }> = ({ children, requireApproved = true }) => {
  const { user, profile, loading, signOut } = useAuth();

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

  return <>{children}</>;
};
