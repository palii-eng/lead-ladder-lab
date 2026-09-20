import React, { useState } from 'react';
import { GraduationCap, Newspaper } from 'lucide-react';
import { ModeSwitch } from '@/components/ModeSwitch';
import { UserMenu } from '@/components/UserMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface NewsItem {
  date: string;
  tag: string;
  title: string;
  text: string;
}

// Реальні новини з ринку (апдейти Meta/Google/TikTok Ads, індустрія тощо)
// вписуються сюди вручну, найновіша — першою.
const MARKETING_NEWS: NewsItem[] = [
  {
    date: '20 вер 2026',
    tag: 'TikTok / ByteDance',
    title: 'Засновник TikTok став найбагатшою людиною Азії: його статки перевищили $105 млрд',
    text: 'Засновник китайської технологічної компанії ByteDance, яка володіє TikTok, Чжан Імін уперше очолив рейтинг найбагатших людей Азії, — повідомляє Bloomberg. Його статки перевищили $105 млрд, а стрімке зростання капіталу пов’язують не лише з успіхом TikTok, а й із масштабними інвестиціями компанії у штучний інтелект.',
  },
];

interface AppHeaderProps {
  active: 'sim' | 'crm';
}

// Shared top bar for both the simulator (Dashboard) and the CRM — identical
// on every page so switching between them doesn't feel like leaving into a
// different app.
export const AppHeader: React.FC<AppHeaderProps> = ({ active }) => {
  const [newsOpen, setNewsOpen] = useState(false);

  return (
    <>
      <header className="border-b border-border sticky top-0 z-50 bg-card h-16">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Навчальний простір AdSchool</span>
            <ModeSwitch active={active} />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setNewsOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              title="Новини маркетингу"
            >
              <Newspaper className="w-4 h-4" /> Новини
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <Dialog open={newsOpen} onOpenChange={setNewsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-primary" /> Новини маркетингу
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {MARKETING_NEWS.map((n, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="secondary" className="text-[10px]">{n.tag}</Badge>
                  <span className="text-[10px] text-muted-foreground">{n.date}</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{n.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
