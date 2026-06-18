import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClientBrief } from '@/context/ScenariosContext';
import { Sparkles, Flame, X, Check, ArrowLeft, Loader2 } from 'lucide-react';

type Gender = 'male' | 'female';
type ClientTemplate = Omit<ClientBrief, 'photo'> & { gender: Gender; role: string };

const LUCKY_CLIENTS: ClientTemplate[] = [
  { name: 'Катя Сергієнко', gender: 'female', role: 'Власниця інстамагазину', niche: 'Жіночий одяг',
    source: 'Контакт від знайомої',
    task: 'Привіт) Мене Катя звати, мені Оля ваш контакт скинула, сказала шо ви по таргету шарите. Коротко: маю інстамагаз з жіночим одягом, продажі є, но хочеться стабільніше — десь 25-30 замовлень в тиждень. Бюджет можу витягнути 20-25к на місяць, може трохи більше якщо піде. Візьметесь подивитись?' },
  { name: 'Андрій Коваленко', gender: 'male', role: 'Власник стоматології', niche: 'Стоматологія, Львів',
    source: 'Прийшов з рекомендації',
    task: 'Доброго дня. Я Андрій, у мене стоматологія у Львові, мені вас порадив Сергій (ми разом по бізнес-клубу). Шукаю людину на довго, не на один місяць. Основне — імплантація і вініри, ліди з фб/інста дуже потрібні. По грошах домовимось, якщо буде результат — бонус накину.' },
  { name: 'Юлія Бондар', gender: 'female', role: 'Засновниця онлайн-школи', niche: 'Курс англійської',
    source: 'LinkedIn',
    task: 'Hi! Знайшла вас у LinkedIn, дуже сподобались кейси. У мене авторський курс англійської, вже 3 потоки відкатали, відгуки топ. Хочу масштабувати — зараз самі ллємо, дорого і нестабільно. Бюджет 60к/міс, креативи й лендос є, можу скинути доступи коли скажете.' },
  { name: 'Дмитро', gender: 'male', role: 'CEO B2B SaaS', niche: 'SaaS для HR-команд',
    source: 'Партнерська мережа',
    task: 'Хай. Я Дмитро, у нас SaaS для HR-ів (типу ATS + аналітика). LTV норм, можемо платити за ліда дорого — головне щоб був релевант, не "хочу подивитись". Стартуємо з $3k/міс, далі по перфу. Цікавить мета і гугл, як думаєте за що братись першим?' },
  { name: 'Анна Коваль', gender: 'female', role: 'Психолог', niche: 'Психологічні консультації',
    source: 'Інтро від колеги',
    task: 'Вітаю! Мені вас Маша порадила, ми разом в терапії були)) Я психолог, працюю онлайн, веду в інсті блог. Треба більше заявок на консультації, ЦА — жінки 25-40. Бюджет десь 12-15к в місяць, готова робити креативи з вами разом, не проблема.' },
];

const HARD_CLIENTS: ClientTemplate[] = [
  { name: 'Сергій', gender: 'male', role: 'Дроп-магазин', niche: 'Чохли для телефонів',
    source: 'Холодний контакт',
    task: 'Алло, це Серьога. Мені сказали ти рекламу робиш. Короче, є чохли по 200 грн, треба продавати. Бюджет — ну давай 50 баксів в тиждень для начала, як піде — добавим. Тільки шоб ромі було хоча б 500%, інакше нє смисла. Скільки ти береш?' },
  { name: 'Олена Романюк', gender: 'female', role: 'Таро-практик', niche: 'Езотерика',
    source: 'Direct в Instagram',
    task: 'Здраствуйте сонечко ✨ мені карти вас показали, відразу зрозуміла шо ви моя людина 🙏 хочу рекламу, але в мета платить не буду, вони ж енергію забирають. Можна якось без бюджету? Я вам за це розклад зроблю, дуже сильний, обіцяю.' },
  { name: 'Богдан', gender: 'male', role: 'Власник ресторану', niche: 'Сімейний ресторан',
    source: 'Через дружину',
    task: 'Здоров. Жінка заставила тобі написати. Реклама в інеті це фігня по-моєму, у нас і так люди ходять, но вона каже надо. Зроби шось там, тільки шоб не дорого і без оцих ваших розумних слів типу "вороночка", "креатиф". Скільки візьмеш?' },
  { name: 'Ірина', gender: 'female', role: 'Інфо-коуч', niche: 'Жіночий марафон',
    source: 'Чат у Telegram',
    task: 'Доброго дня!! У мене горить — через 3 дні стартує марафон "Жіноча сила", треба мінімум 500 реєстрацій. Бюджету прям зараз нема, але я дам % з продажів, у нас чек хороший. Креативи і тексти теж на вас, я зараз дуже завантажена. Беретесь?' },
  { name: 'Макс', gender: 'male', role: 'Анонімний фаундер', niche: 'Крипто-проект',
    source: 'Анонімний контакт',
    task: 'Йо. Треба залити траф на лендос, ніша — крипта, деталі не питай поки не підпишем нда. Платимо в USDT кожний тиждень, но тільки за результат (CPA). KPI скину в телезі, тут не хочу. Працюємо?' },
];

// Curated Slavic / Eastern European portraits from Unsplash (free to use).
const FEMALE_PHOTOS = [
  'photo-1531123897727-8f129e1688ce', // light hair, blue eyes
  'photo-1502323777036-f29e3972d82f',
  'photo-1592621385612-4d7129426394',
  'photo-1593104547489-5cfb3839a3b5',
  'photo-1551836022-deb4988cc6c0',
  'photo-1546961342-1e9cd865c8b0',
  'photo-1557555187-23d685287bc3',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1488426862026-3ee34a7d66df',
  'photo-1524638431109-93d95c968f03',
];
const MALE_PHOTOS = [
  'photo-1500648767791-00dcc994a43e',
  'photo-1531427186611-ecfd6d936c79',
  'photo-1463453091185-61582044d556',
  'photo-1492562080023-ab3db95bfbce',
  'photo-1519345182560-3f2917c472ef',
  'photo-1610088441520-4352457e7095',
  'photo-1564564321837-a57b7070ac4f',
  'photo-1545167622-3a6ac756afa4',
  'photo-1564485377539-4af72d1f6a2f',
  'photo-1520975916090-3105956dac38',
];

const photoFor = (gender: Gender, seed: number) => {
  const list = gender === 'female' ? FEMALE_PHOTOS : MALE_PHOTOS;
  const id = list[Math.abs(seed) % list.length];
  return `https://images.unsplash.com/${id}?w=800&h=1000&fit=crop&crop=faces&q=80`;
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
