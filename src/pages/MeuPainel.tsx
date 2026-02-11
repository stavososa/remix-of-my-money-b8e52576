import { AppShell } from '@/components/AppShell';
import { User } from 'lucide-react';

export default function MeuPainel() {
  return (
    <AppShell title="Meu Painel">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <User className="h-16 w-16 text-primary/30" />
        <h2 className="text-xl font-bold text-foreground">Meu Painel</h2>
        <p className="text-muted-foreground">Em construção — Meu Painel</p>
      </div>
    </AppShell>
  );
}
