import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
}

export function KPICard({ icon: Icon, label, value, subtitle }: KPICardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-secondary-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-md bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
