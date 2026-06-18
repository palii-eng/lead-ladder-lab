import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ClientBrief } from '@/context/ScenariosContext';
import { Sparkles, Flame, X, Check, ArrowLeft, Quote } from 'lucide-react';

type ClientTemplate = Omit<ClientBrief, 'photo'>;

const LUCKY_CLIENTS: ClientTemplate[] = [
  { name: 'Катя', niche: 'Інстамагазин одягу', source: 'Контакт від знайомої',
    task: 'Привіт! Я Катя, ваш контакт дала знайома. У мене є інстамагазин жіночого одягу — хочу запустити рекламу, щоб стабільно отримувати 30+ замовлень на тиждень. Бюджет адекватний, готова чути експерта.' },
  { name: 'Андрій', niche: 'Стоматологія', source: 'Прийшов з рекомендації',
    task: 'Доброго дня, я Андрій — власник приватної стоматології у Львові. Шукаю маркетолога на постійну основу. Потрібні ліди на імплантацію, готовий платити чесну ставку + бонус за результат.' },
  { name: 'Юлія', niche: 'Онлайн-курс англійської', source: 'LinkedIn',
    task: 'Привіт! Я Юлія, у мене авторський курс англійської. Уже є відгуки та кейси — треба масштабувати набір з Meta. Маю готові креативи й посадкову.' },
  { name: 'Дмитро', niche: 'B2B SaaS для HR', source: 'Партнерська мережа',
    task: 'Hi, я Дмитро, CEO SaaS-сервісу для HR-команд. Шукаємо performance-маркетолога. LTV високий, можемо платити за лід дорого. Цікавить Meta + Google.' },
];

const HARD_CLIENTS: ClientTemplate[] = [
  { name: 'Сергій', niche: 'Дешеві чохли для телефонів', source: 'Холодний контакт',
    task: 'Алло, це Сергій. Мені друг сказав, що ти "робиш рекламу". Бюджет — 50 баксів на тиждень, треба продавати чохли по 200 грн. Хочу ROMI 500%, інакше це не цікаво.' },
  { name: 'Олена', niche: 'Езотерика / Таро', source: 'Direct в Instagram',
    task: 'Привіт, сонечко ✨ Мені таролог сказав, що ти моя людина. Треба реклама, але я не хочу платити Meta — це ж шахраї. Можна якось без бюджету, на енергії?' },
  { name: 'Богдан', niche: 'Сімейний ресторан', source: 'Через дружину',
    task: 'Здоров. Дружина сказала тобі написати. Реклама в інтернеті — це фігня, але вона наполягає. Зроби щось, тільки щоб дешево і без цих ваших "креативів".' },
  { name: 'Ірина', niche: 'Інфобізнес / марафон',  source: 'Чат у Telegram',
    task: 'Доброго! Запускаю марафон "Жіноча сила" через 3 дні. Треба 500 реєстрацій. Бюджету немає, але дам % з продажів. Креативи зробиш сам, контент-план теж.' },
  { name: 'Макс', niche: 'Крипто-проект', source: 'Анонімний контакт',
    task: 'Йо, треба залити трафік на лендос. Що це за проект — не питай. Платимо в USDT, але тільки за результат. KPI скажу пізніше.' },
];

const randomPhoto = (seed: number) => {
  // Pravatar — stable random avatars
  const id = ((seed * 31) % 70) + 1;
  return `https://i.pravatar.cc/400?img=${id}`;
};

interface Props {
  scenarioName: string;
  onAccept: (difficulty: 'lucky' | 'suffer', brief: ClientBrief) => void;
}

const SimulationIntro: React.FC<Props> = ({ scenarioName, onAccept }) => {
  const [difficulty, setDifficulty] = useState<'lucky' | 'suffer' | null>(null);
  const [index, setIndex] = useState(0);

  const pool = useMemo(() => {
    if (!difficulty) return [] as ClientBrief[];
    const base = difficulty === 'lucky' ? LUCKY_CLIENTS : HARD_CLIENTS;
    // shuffle deterministically per session
    return [...base]
      .map((b, i) => ({ b, k: Math.random() + i }))
      .sort((a, z) => a.k - z.k)
      .map(x => x.b)
      .map((b, i) => ({ ...b, photo: randomPhoto(i + Date.now() % 50) }));
  }, [difficulty]);

  const current = pool[index % pool.length];

  if (!difficulty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 animate-fade-in">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Симуляція маркетолога
            </div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">
              {scenarioName}
            </h1>
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10 animate-fade-in">
      <div className="max-w-md w-full">
        <button
          onClick={() => setDifficulty(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Інша складність
        </button>

        <div className="glass-card overflow-hidden shadow-xl">
          <div className="relative">
            <img
              src={current.photo}
              alt={current.name}
              className="w-full h-72 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${current.name}`; }}
            />
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight">{current.name}</h3>
                  <p className="text-white/80 text-sm">{current.niche}</p>
                </div>
                {current.source && (
                  <span className="px-2.5 py-1 rounded-full bg-white/90 text-foreground text-[10px] font-semibold uppercase tracking-wide">
                    {current.source}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex gap-2 mb-3">
              <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground leading-relaxed">{current.task}</p>
            </div>
          </div>

          <div className="p-4 border-t border-border flex gap-2 bg-secondary/40">
            <Button
              variant="secondary"
              className="flex-1 gap-1.5"
              onClick={() => setIndex(i => i + 1)}
            >
              <X className="w-4 h-4" /> Відмовити
            </Button>
            <Button
              className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              onClick={() => onAccept(difficulty, current)}
            >
              <Check className="w-4 h-4" /> Прийняти
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Клієнт #{(index % pool.length) + 1} • Натисніть «Відмовити», щоб побачити наступного
        </p>
      </div>
    </div>
  );
};

export default SimulationIntro;
