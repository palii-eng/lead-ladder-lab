import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import adschoolLogo from '@/assets/adschool-logo.png';

function getSafeNextUrl(searchParams: URLSearchParams): string | null {
  const next = searchParams.get('next');
  if (!next) return null;
  // Accept only same-origin relative paths to avoid open redirects.
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
}
const PasswordInput: React.FC<PasswordInputProps> = ({ id, value, onChange, minLength }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Сховати пароль' : 'Показати пароль'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const Auth: React.FC = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNextUrl(searchParams);
  const isTesterLink = searchParams.get('ref') === 'tester';
  const [tab, setTab] = useState<'signin' | 'signup'>(isTesterLink ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(next ?? '/', { replace: true });
  }, [user, loading, navigate, next]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Помилка входу', description: error.message, variant: 'destructive' });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Пароль занадто короткий', description: 'Мінімум 6 символів', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, isTesterLink ? 'tester_link' : undefined);
    if (error) {
      setSubmitting(false);
      toast({ title: 'Помилка реєстрації', description: error.message, variant: 'destructive' });
      return;
    }
    // Одразу авторизуємо тим самим email/паролем — без цього signUp сам по
    // собі не завжди відкриває сесію (залежить від налаштувань підтвердження
    // email), і людину нізвідки б повертало на форму входу.
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      // Найімовірніша причина — потрібне підтвердження email за посиланням.
      toast({
        title: 'Реєстрація успішна',
        description: 'Перевірте пошту, щоб підтвердити email, а потім увійдіть.',
      });
      setTab('signin');
      return;
    }
    toast(
      isTesterLink
        ? { title: 'Ласкаво просимо!', description: 'Акаунт створено, ви одразу в системі.' }
        : { title: 'Ласкаво просимо!', description: 'Акаунт створено. Доступ до сценаріїв відкриється після підтвердження адміністратора.' }
    );
    navigate(next ?? '/', { replace: true });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #1414e0 0%, #1a1aff 55%, #2323ff 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <img src={adschoolLogo} alt="ADS School" className="h-20 w-auto" />
          <h1 className="text-xl sm:text-2xl font-black uppercase text-white leading-tight">
            Кабінет студента
          </h1>
          <p className="text-sm text-white/70 max-w-xs">
            Простір для навчання
          </p>
        </div>

        <div className="glass-card p-6 bg-white shadow-2xl" style={{ borderRadius: 20 }}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Вхід</TabsTrigger>
              <TabsTrigger value="signup">Реєстрація</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="si-password">Пароль</Label>
                  <PasswordInput id="si-password" value={password} onChange={setPassword} />

                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Вхід…' : 'Увійти'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Ім'я та прізвище</Label>
                  <Input id="su-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="su-password">Пароль</Label>
                  <PasswordInput id="su-password" value={password} onChange={setPassword} minLength={6} />

                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Відправка…' : 'Зареєструватися'}
                </Button>
                {!isTesterLink && (
                  <p className="text-xs text-muted-foreground text-center">
                    Після реєстрації потрібен апрув адміністратора.
                  </p>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
