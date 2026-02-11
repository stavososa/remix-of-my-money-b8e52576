import { AppShell } from '@/components/AppShell';
import { Download } from 'lucide-react';

export default function AdminImportar() {
  return (
    <AppShell title="Importar Dados">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Download className="h-16 w-16 text-primary/30" />
        <h2 className="text-xl font-bold text-foreground">Importar Dados</h2>
        <p className="text-muted-foreground">Em construção — Importar Dados</p>
      </div>
    </AppShell>
  );
}
