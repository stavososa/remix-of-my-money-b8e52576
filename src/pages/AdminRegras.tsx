import { AppShell } from '@/components/AppShell';
import { FileText } from 'lucide-react';

export default function AdminRegras() {
  return (
    <AppShell title="Regras de Comissão">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <FileText className="h-16 w-16 text-primary/30" />
        <h2 className="text-xl font-bold text-foreground">Regras de Comissão</h2>
        <p className="text-muted-foreground">Em construção — Regras de Comissão</p>
      </div>
    </AppShell>
  );
}
