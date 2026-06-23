import React, { useState } from 'react';
import { useScenarios } from '@/context/ScenariosContext';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Copy, Trash2, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const Dashboard: React.FC = () => {
  const { scenarios, addScenario, deleteScenario, duplicateScenario } = useScenarios();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const scenarioToDelete = deleteId ? scenarios.find(s => s.id === deleteId) : null;

  // Detect corrupt backups saved by ScenariosContext on a parse failure.
  const [corruptKeys, setCorruptKeys] = useState<string[]>(() => {
    try {
      return Object.keys(localStorage).filter(k => k.startsWith('scenarios__corrupt_'));
    } catch { return []; }
  });

  const handleRecover = () => {
    try {
      // Try each corrupt backup, newest first, and restore the first one that parses.
      const sorted = [...corruptKeys].sort().reverse();
      for (const k of sorted) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            localStorage.setItem('scenarios', raw);
            sorted.forEach(x => localStorage.removeItem(x));
            window.location.reload();
            return;
          }
        } catch {}
      }
      alert('Не вдалося відновити — резервні копії пошкоджені.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = () => {
    const defaultName = `Сценарій #${scenarios.length + 1}`;
    const s = addScenario(defaultName, '');
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
      <header className="border-b border-border sticky top-0 z-50 bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              SmartFunnel AI
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              ⚡ Заряджено в{' '}
              <a href="https://ads-school.online/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                Ads School
              </a>
            </span>
            <span className="text-border">|</span>
            <span>
              🛠 Створено в{' '}
              <a href="https://ai.ads-wind.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                ADS WindAI Lab
              </a>
            </span>
          </div>
          <Button onClick={handleCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            <Plus className="w-4 h-4" />
            Створити сценарій
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-accent">
              <LayoutDashboard className="w-10 h-10 text-accent-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Немає сценаріїв</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">
              Створіть свій перший маркетинговий сценарій та побудуйте повну воронку продажів
            </p>
            <Button onClick={handleCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
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
                  className="glass-card p-5 flex flex-col gap-4 animate-slide-up transition-shadow cursor-pointer hover:shadow-md"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => navigate(`/scenario/${s.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{s.name}</h3>
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
                      <span className="text-muted-foreground text-xs">Ніша</span>
                      <p className="text-foreground font-medium truncate">{s.niche || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Канал</span>
                      <p className="text-foreground font-medium truncate">{s.channel || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">ROMI</span>
                      <p className={`font-bold ${romi !== null && romi > 0 ? 'text-success' : romi !== null && romi < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {romi !== null ? `${romi}%` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Створено</span>
                      <p className="text-foreground font-medium">
                        {new Date(s.createdAt).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      onClick={(e) => { e.stopPropagation(); navigate(`/scenario/${s.id}`); }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Відкрити
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); duplicateScenario(s.id); }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити сценарій?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити сценарій{scenarioToDelete ? ` «${scenarioToDelete.name}»` : ''}? Цю дію не можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteScenario(deleteId); setDeleteId(null); }}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
