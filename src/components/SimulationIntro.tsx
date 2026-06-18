import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClientBrief } from '@/context/ScenariosContext';
import { Sparkles, Flame, X, Check, ArrowLeft, Loader2 } from 'lucide-react';

type Gender = 'male' | 'female';
type ClientTemplate = Omit<ClientBrief, 'photo'> & { gender: Gender; role: string };

const LUCKY_CLIENTS: ClientTemplate[] = [
  { name: 'Катя Сергієнко', gender: 'female', role: 'Власниця інстамагазину', niche: 'Жіночий одяг',
    source: 'Контакт від знайомої',
    task: 'Привіт! Я Катя, ваш контакт дала знайома. У мене є інстамагазин жіночого одягу — хочу стабільно отримувати 30+ замовлень на тиждень з Meta. Бюджет — до 25 000 грн/міс, готова чути експерта.' },
  { name: 'Андрій Коваленко', gender: 'male', role: 'Власник стоматології', niche: 'Стоматологія, Львів',
    source: 'Прийшов з рекомендації',
    task: 'Доброго дня, я Андрій — власник приватної стоматології у Львові. Шукаю маркетолога на постійну основу. Потрібні ліди на імплантацію, готовий платити чесну ставку + бонус за результат.' },
  { name: 'Юлія Бондар', gender: 'female', role: 'Засновниця онлайн-школи', niche: 'Курс англійської',
    source: 'LinkedIn',
    task: 'Привіт! Я Юлія, у мене авторський курс англійської. Уже є відгуки та кейси — треба масштабувати набір з Meta. Маю готові креативи й посадкову, бюджет 60 000 грн/місяць.' },
  { name: 'Дмитро Шевчук', gender: 'male', role: 'CEO B2B SaaS', niche: 'SaaS для HR-команд',
    source: 'Партнерська мережа',
    task: 'Hi, я Дмитро, CEO SaaS-сервісу для HR. LTV високий, можемо платити за лід дорого. Цікавить Meta + Google, бюджет починаємо з $3k/міс.' },
  { name: 'Анна Коваль', gender: 'female', role: 'Підприємиця', niche: 'Психологічні консультації',
    source: 'Інтро від колеги',
    task: 'Потрібно збільшити кількість заявок на консультації через Instagram та Facebook. Цільова аудиторія — жінки 25–40 років, бюджет — до 15 000 грн/міс.' },
];

const HARD_CLIENTS: ClientTemplate[] = [
  { name: 'Сергій Петренко', gender: 'male', role: 'Власник дроп-магазину', niche: 'Чохли для телефонів',
    source: 'Холодний контакт',
    task: 'Алло, це Сергій. Мені друг сказав, що ти "робиш рекламу". Бюджет — 50 баксів на тиждень, треба продавати чохли по 200 грн. Хочу ROMI 500%, інакше це не цікаво.' },
  { name: 'Олена Романюк', gender: 'female', role: 'Таро-практик', niche: 'Езотерика',
    source: 'Direct в Instagram',
    task: 'Привіт, сонечко ✨ Мені таролог сказав, що ти моя людина. Треба реклама, але я не хочу платити Meta — це ж шахраї. Можна якось без бюджету, на енергії?' },
  { name: 'Богдан Лисенко', gender: 'male', role: 'Власник ресторану', niche: 'Сімейний ресторан',
    source: 'Через дружину',
    task: 'Здоров. Дружина сказала тобі написати. Реклама в інтернеті — це фігня, але вона наполягає. Зроби щось, тільки щоб дешево і без цих ваших "креативів".' },
  { name: 'Ірина Гончар', gender: 'female', role: 'Інфо-коуч', niche: 'Жіночий марафон',
    source: 'Чат у Telegram',
    task: 'Доброго! Запускаю марафон "Жіноча сила" через 3 дні. Треба 500 реєстрацій. Бюджету немає, але дам % з продажів. Креативи зробиш сам, контент-план теж.' },
  { name: 'Макс Tokenov', gender: 'male', role: 'Анонімний фаундер', niche: 'Крипто-проект',
    source: 'Анонімний контакт',
    task: 'Йо, треба залити трафік на лендос. Що це за проект — не питай. Платимо в USDT, але тільки за результат. KPI скажу пізніше.' },
];

const photoFor = (gender: Gender, seed: number) => {
  const id = ((seed * 17) % 90) + 1; // 1..90
  return `https://randomuser.me/api/portraits/${gender === 'female' ? 'women' : 'men'}/${id}.jpg`;
};

interface Props {
  scenarioName: string;
  onAccept: (difficulty: 'lucky' | 'suffer', brief: ClientBrief) => void;
}

const REVEAL_MS = 1600;

const SimulationIntro: React.FC<Props> = ({ scenarioName, onAccept }) => {
  const [difficulty, setDifficulty] = useState<'lucky' | 'suffer' | null>(null);
  const [index, setIndex] = useState(0);
  const [revealing, setRevealing] = useState(true);

  const pool = useMemo<ClientBrief[]>(() => {
    if (!difficulty) return [];
    const base = difficulty === 'lucky' ? LUCKY_CLIENTS : HARD_CLIENTS;
    const seedBase = Math.floor(Math.random() * 1000);
    return [...base]
      .map((b, i) => ({ b, k: Math.random() + i }))
      .sort((a, z) => a.k - z.k)
      .map((x, i) => ({
        name: x.b.name,
        niche: x.b.niche,
        source: x.b.source,
        task: x.b.task,
        photo: photoFor(x.b.gender, seedBase + i * 7),
        role: x.b.role,
      } as ClientBrief & { role: string }));
  }, [difficulty]);

  // Trigger reveal animation on each new card
  useEffect(() => {
    if (!difficulty) return;
    setRevealing(true);
    const t = setTimeout(() => setRevealing(false), REVEAL_MS);
    return () => clearTimeout(t);
  }, [difficulty, index]);

  const current = pool[index % (pool.length || 1)] as (ClientBrief & { role?: string }) | undefined;

  const handleNext = () => {
    setRevealing(true);
    setTimeout(() => setIndex(i => i + 1), 350);
  };

  if (!difficulty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 animate-fade-in">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Симуляція маркетолога
            </div>
            <p className="text-muted-foreground">Оберіть рівень складності — від цього залежать клієнти, які до вас прийдуть.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setDifficulty('lucky')}
              className="group glass-card p-8 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-success/15 text-success flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">Мені щастить на клієнтів</h3>
              <p className="text-sm text-muted-foreground">
                Адекватні брифи, нормальні бюджети, чіткі цілі. Ідеально для першого прогону.
              </p>
            </button>

            <button
              onClick={() => setDifficulty('suffer')}
              className="group glass-card p-8 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center mb-4">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">Готовий страждати</h3>
              <p className="text-sm text-muted-foreground">
                "Зроби красиво, бюджету немає, треба вчора". Реальне життя баєра.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10 animate-fade-in"
      style={{
        background:
          'radial-gradient(1200px 600px at 20% 10%, hsl(var(--accent) / 0.6), transparent 60%), radial-gradient(900px 500px at 80% 90%, hsl(var(--primary) / 0.12), transparent 60%), hsl(var(--background))',
      }}
    >
      <div className="max-w-sm w-full">
        <button
          onClick={() => setDifficulty(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Інша складність
        </button>

        {/* CARD STAGE */}
        <div className="relative" style={{ perspective: '1200px' }}>
          {/* Reveal overlay */}
          {revealing && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--accent) / 0.9), hsl(var(--card)))',
                  boxShadow: '0 20px 60px -20px hsl(var(--primary) / 0.4)',
                  animation: 'card-shuffle 1.6s ease-out forwards',
                }}
              />
              <div className="relative flex flex-col items-center gap-3 text-foreground/90">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full flex items-center justify-center bg-primary/10">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-sm font-semibold tracking-wide">Шукаємо клієнта…</p>
              </div>
            </div>
          )}

          {/* The actual card */}
          <div
            key={`${difficulty}-${index}`}
            className={`relative rounded-3xl overflow-hidden bg-card ${revealing ? 'opacity-0' : 'animate-card-in'}`}
            style={{
              boxShadow: '0 30px 60px -30px hsl(var(--foreground) / 0.25), 0 0 0 1px hsl(var(--border))',
            }}
          >
            {/* Photo block */}
            <div className="p-3">
              <div className="relative rounded-2xl overflow-hidden bg-secondary aspect-[4/5]">
                <img
                  src={current.photo}
                  alt={current.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${current.name}`;
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/65 via-black/15 to-transparent">
                  <h3 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                    {current.name}
                  </h3>
                  <p className="text-white/85 text-sm mt-0.5">{current.role || current.niche}</p>
                </div>
                {current.source && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-foreground text-[10px] font-semibold uppercase tracking-wide shadow-sm">
                    {current.source}
                  </span>
                )}
              </div>
            </div>

            {/* Task block */}
            <div className="px-5 pb-5">
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(135deg, hsl(48 80% 96%), hsl(0 0% 100%))',
                }}
              >
                <p className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                  Задача для маркетолога
                </p>
                <p className="text-sm text-foreground leading-relaxed">{current.task}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              <Button
                onClick={() => onAccept(difficulty, current)}
                className="h-12 rounded-xl font-semibold text-white"
                style={{ background: 'hsl(108 25% 50%)' }}
              >
                <Check className="w-4 h-4 mr-1.5" /> Взяти в роботу
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                className="h-12 rounded-xl font-semibold border-border"
                style={{ color: 'hsl(0 75% 55%)' }}
              >
                <X className="w-4 h-4 mr-1.5" /> Відмовити
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Клієнт #{(index % pool.length) + 1} з {pool.length}
        </p>
      </div>

      <style>{`
        @keyframes card-shuffle {
          0%   { opacity: 1; transform: scale(1) rotate(-2deg); }
          60%  { opacity: 1; transform: scale(1.02) rotate(2deg); }
          100% { opacity: 0; transform: scale(0.96) rotate(0deg); }
        }
        @keyframes card-in {
          0%   { opacity: 0; transform: translateY(20px) scale(0.92) rotateX(8deg); filter: blur(8px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); }
        }
        .animate-card-in { animation: card-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SimulationIntro;
