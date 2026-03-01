import React, { useState } from 'react';
import { useScenarios } from '@/context/ScenariosContext';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Copy, Trash2, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const Dashboard: React.FC = () => {
  const { scenarios, addScenario, deleteScenario, duplicateScenario } = useScenarios();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    const s = addScenario(name.trim(), desc.trim());
    setName('');
    setDesc('');
    setOpen(false);
    navigate(`/scenario/${s.id}`);
  };

  const calcRomi = (s: typeof scenarios[0]) => {
    const d = s.decomposition.realistic;
    if (!d.budget || !d.averageCheck || !d.conversionRate || !d.cpl) return null;
    const leads = d.budget / (d.cpl || 1);
    const sales = leads * (d.conversionRate / 100);
    const revenue = sales * d.averageCheck;
    const romi = ((revenue - d.budget) / d.budget) * 100;
    return isFinite(romi) ? Math.round(romi) : null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Маркетинговий Тренажер</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" style={{ background: 'var(--gradient-primary)' }}>
                <Plus className="w-4 h-4" />
                Створити сценарій
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Новий сценарій</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Назва сценарію *</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Наприклад: Запуск реклами для кав'ярні"
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Короткий опис</label>
                  <Textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Необов'язково"
                    rows={3}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" style={{ background: 'var(--gradient-primary)' }}>
                  Створити
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-muted">
              <LayoutDashboard className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Немає сценаріїв</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">
              Створіть свій перший маркетинговий сценарій та побудуйте повну воронку продажів
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2" style={{ background: 'var(--gradient-primary)' }}>
              <Plus className="w-4 h-4" />
              Створити перший сценарій
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((s, i) => {
              const romi = calcRomi(s);
              return (
                <div
                  key={s.id}
                  className="glass-card p-5 flex flex-col gap-4 animate-slide-up hover:border-primary/30 transition-colors"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{s.name}</h3>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                    <Badge
                      variant={s.status === 'completed' ? 'default' : 'secondary'}
                      className={s.status === 'completed' ? 'bg-success text-success-foreground' : ''}
                    >
                      {s.status === 'completed' ? 'Завершено' : 'Чернетка'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ніша</span>
                      <p className="text-foreground font-medium truncate">{s.niche || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Канал</span>
                      <p className="text-foreground font-medium truncate">{s.channel || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ROMI</span>
                      <p className={`font-bold ${romi !== null && romi > 0 ? 'text-success' : romi !== null && romi < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {romi !== null ? `${romi}%` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Створено</span>
                      <p className="text-foreground font-medium">
                        {new Date(s.createdAt).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      style={{ background: 'var(--gradient-primary)' }}
                      onClick={() => navigate(`/scenario/${s.id}`)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Відкрити
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => duplicateScenario(s.id)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => deleteScenario(s.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
