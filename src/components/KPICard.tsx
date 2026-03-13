import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: string;
  compact?: boolean;
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

export function KPICard({ icon: Icon, label, value, subtitle, trend, trendValue, accentColor, compact }: KPICardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  const iconBg = accentColor
    ? `${accentColor.replace('hsl', 'hsla').replace(')', ' / 0.15)')}`
    : 'hsl(38 90% 55% / 0.15)';
  const iconColor = accentColor || 'hsl(38 90% 55%)';

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center mx-auto"
            aria-label={label}
          >
            <div
              className="h-11 w-11 rounded-full flex items-center justify-center shadow-card border border-border"
              style={{ backgroundColor: iconBg }}
            >
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
            </div>
          </motion.button>
        </PopoverTrigger>
        <PopoverContent side="bottom" className="w-auto min-w-[140px] p-3" align="center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {trend && trendValue && TrendIcon && (
            <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${trendColors[trend]}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-lg p-4 sm:p-5 shadow-card relative overflow-hidden cursor-pointer flex flex-col justify-center"
      title={subtitle ? `${label}: ${subtitle}` : label}
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
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
      </div>
    </motion.div>
  );
}
