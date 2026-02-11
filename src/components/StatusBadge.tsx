import { cn } from '@/lib/utils';

interface CustomBadgeProps {
  text: string;
  variant?: 'gold' | 'silver' | 'default';
  className?: string;
}

export function CustomBadge({ text, variant = 'default', className }: CustomBadgeProps) {
  const styles = {
    gold: 'bg-primary text-primary-foreground',
    silver: 'bg-secondary-foreground text-primary-foreground',
    default: 'bg-secondary text-foreground',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', styles[variant], className)}>
      {text}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    PJ: { label: 'PJ', className: 'bg-primary text-primary-foreground' },
    CLT: { label: 'CLT', className: 'bg-blue-500 text-foreground' },
    calculada: { label: 'Calculada', className: 'bg-secondary text-secondary-foreground' },
    aprovada: { label: 'Aprovada', className: 'bg-success text-success-foreground' },
    paga: { label: 'Paga', className: 'bg-emerald-700 text-foreground' },
    Matriz: { label: 'Matriz', className: 'bg-primary/20 text-primary' },
    Filial: { label: 'Filial', className: 'bg-blue-500/20 text-blue-400' },
    Franquia: { label: 'Franquia', className: 'bg-purple-500/20 text-purple-400' },
    filial: { label: 'Filial', className: 'bg-blue-500/20 text-blue-400' },
    matriz: { label: 'Matriz', className: 'bg-primary/20 text-primary' },
    franquia: { label: 'Franquia', className: 'bg-purple-500/20 text-purple-400' },
  };

  const c = config[status] ?? { label: status, className: 'bg-secondary text-secondary-foreground' };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  );
}
