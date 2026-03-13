import { useState } from 'react';
import { usePeriod } from '@/contexts/PeriodContext';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ANOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

type PresetKey = 'mes' | '3d' | '7d' | '15d' | 'custom';

const PRESETS: { key: PresetKey; label: string; days?: number }[] = [
  { key: 'mes', label: 'Mês' },
  { key: '3d', label: '3 dias', days: 3 },
  { key: '7d', label: '7 dias', days: 7 },
  { key: '15d', label: '15 dias', days: 15 },
];

export function PeriodFilter() {
  const { periodoAno, periodoMes, dataInicio, dataFim, setPeriodo, setCustomRange, resetRange } = usePeriod();
  const [activePreset, setActivePreset] = useState<PresetKey>('mes');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>();
  const [tempTo, setTempTo] = useState<Date | undefined>();

  // Last day of the selected month
  const lastDayOfMonth = new Date(periodoAno, periodoMes, 0);
  const firstDayOfMonth = new Date(periodoAno, periodoMes - 1, 1);

  const handlePreset = (preset: PresetKey, days?: number) => {
    setActivePreset(preset);
    if (preset === 'mes') {
      resetRange();
    } else if (days) {
      const end = lastDayOfMonth;
      const start = subDays(end, days - 1);
      // Clamp start to first day of month
      const clampedStart = start < firstDayOfMonth ? firstDayOfMonth : start;
      setCustomRange(
        format(clampedStart, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd'),
      );
    }
  };

  const handleCustomApply = () => {
    if (tempFrom && tempTo) {
      setCustomRange(
        format(tempFrom, 'yyyy-MM-dd'),
        format(tempTo, 'yyyy-MM-dd'),
      );
      setActivePreset('custom');
      setPopoverOpen(false);
    }
  };

  const openCustom = () => {
    setTempFrom(parseISO(dataInicio));
    setTempTo(parseISO(dataFim));
    setPopoverOpen(true);
  };

  const handleMonthChange = (mes: number) => {
    setPeriodo(periodoAno, mes);
    setActivePreset('mes');
  };

  const handleYearChange = (ano: number) => {
    setPeriodo(ano, periodoMes);
    setActivePreset('mes');
  };

  const rangeLabel = activePreset === 'custom'
    ? `${format(parseISO(dataInicio), 'dd/MM')} - ${format(parseISO(dataFim), 'dd/MM')}`
    : null;

  return (
    <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
      {/* Month / Year selects */}
      <select
        value={periodoMes}
        onChange={(e) => handleMonthChange(Number(e.target.value))}
        className="bg-secondary border border-border text-foreground rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
      >
        {MESES.map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={periodoAno}
        onChange={(e) => handleYearChange(Number(e.target.value))}
        className="bg-secondary border border-border text-foreground rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
      >
        {ANOS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {/* Divider */}
      <div className="h-5 w-px bg-border hidden sm:block shrink-0" />

      {/* Preset buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {PRESETS.map(({ key, label, days }) => (
          <Button
            key={key}
            variant={activePreset === key ? 'default' : 'outline'}
            size="sm"
            className={cn('h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs', activePreset === key && 'shadow-sm')}
            onClick={() => handlePreset(key, days)}
          >
            {label}
          </Button>
        ))}

        {/* Custom date range button */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={activePreset === 'custom' ? 'default' : 'outline'}
              size="sm"
              className={cn('h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs gap-1', activePreset === 'custom' && 'shadow-sm')}
              onClick={openCustom}
            >
              <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {rangeLabel ?? 'Custom'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 sm:p-4" align="start" side="bottom">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Selecione o período</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data Início</p>
                  <Calendar
                    mode="single"
                    selected={tempFrom}
                    onSelect={setTempFrom}
                    defaultMonth={firstDayOfMonth}
                    className={cn('p-3 pointer-events-auto')}
                    locale={ptBR}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data Fim</p>
                  <Calendar
                    mode="single"
                    selected={tempTo}
                    onSelect={setTempTo}
                    defaultMonth={firstDayOfMonth}
                    className={cn('p-3 pointer-events-auto')}
                    locale={ptBR}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPopoverOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleCustomApply} disabled={!tempFrom || !tempTo}>
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
