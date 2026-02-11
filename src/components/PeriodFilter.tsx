import { usePeriod } from '@/contexts/PeriodContext';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ANOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export function PeriodFilter() {
  const { periodoAno, periodoMes, setPeriodo } = usePeriod();

  return (
    <div className="flex items-center gap-2">
      <select
        value={periodoMes}
        onChange={(e) => setPeriodo(periodoAno, Number(e.target.value))}
        className="bg-secondary border border-border text-foreground rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {MESES.map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={periodoAno}
        onChange={(e) => setPeriodo(Number(e.target.value), periodoMes)}
        className="bg-secondary border border-border text-foreground rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {ANOS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}
