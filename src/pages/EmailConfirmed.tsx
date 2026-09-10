import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import adschoolLogo from '@/assets/adschool-logo.png';

// Куди веде лінк підтвердження email із листа (emailRedirectTo в
// AuthContext.signUp). Supabase сам відновлює сесію з токена в URL-хеші —
// тут лише коротка "апрув"-заглушка перед автоматичним переходом у кабінет.
const EmailConfirmed: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 1000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #1414e0 0%, #1a1aff 55%, #2323ff 100%)' }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <img src={adschoolLogo} alt="ADS School" className="h-16 w-auto mb-2" />
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-black uppercase text-white">Email підтверджено</h1>
        <p className="text-sm text-white/70">Переходимо в кабінет…</p>
      </div>
    </div>
  );
};

export default EmailConfirmed;
