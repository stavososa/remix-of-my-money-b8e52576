import { AppShell } from '@/components/AppShell';
import { Trophy } from 'lucide-react';

export default function Ranking() {
  return (
    <AppShell title="Ranking">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Trophy className="h-16 w-16 text-primary/30" />
        <h2 className="text-xl font-bold text-foreground">Ranking</h2>
        <p className="text-muted-foreground">Em construção — Ranking</p>
      </div>
    </AppShell>
  );
}
