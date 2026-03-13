import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: string;
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

export function KPICard({ icon: Icon, label, value, subtitle, trend, trendValue, accentColor }: KPICardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-lg p-4 sm:p-5 shadow-card relative overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor || 'hsl(215 40% 24%)' }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && trendValue && TrendIcon && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColors[trend]}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center"
          style={{
            background: accentColor
              ? `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`
              : 'linear-gradient(135deg, hsl(38 90% 55% / 0.15), hsl(38 90% 55% / 0.05))',
          }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor || 'hsl(38 90% 55%)' }} />
        </div>
      </div>
    </motion.div>
  );
}
