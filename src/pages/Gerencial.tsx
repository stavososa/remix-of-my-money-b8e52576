import { AppShell } from '@/components/AppShell';
import { BarChart3 } from 'lucide-react';

export default function Gerencial() {
  return (
    <AppShell title="Gerencial">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <BarChart3 className="h-16 w-16 text-primary/30" />
        <h2 className="text-xl font-bold text-foreground">Gerencial</h2>
        <p className="text-muted-foreground">Em construção — Gerencial</p>
      </div>
    </AppShell>
  );
}
