import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, DollarSign, Users, Receipt, Crown } from 'lucide-react';
import { DataTable } from '@/components/DataTable';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatBRL = (v: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const formatPct = (v: number | null) =>
  v != null ? `${v.toFixed(1)}%` : '—';

const medalha = (pos: number | null) => {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return String(pos ?? '—');
};

export default function Ranking() {
  const { periodoAno, periodoMes } = usePeriod();

  const { data: ranking = [], isLoading } = useQuery({
    queryKey: ['ranking', periodoAno, periodoMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ranking')
        .select('*')
        .eq('periodo_ano', periodoAno)
        .eq('periodo_mes', periodoMes)
        .order('posicao', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const top1 = ranking[0] ?? null;

  const kpis = useMemo(() => {
    const totalVendido = ranking.reduce((s, r) => s + (r.total_vendido ?? 0), 0);
    const totalComissao = ranking.reduce((s, r) => s + (r.total_comissao ?? 0), 0);
    const totalNotas = ranking.reduce((s, r) => s + (r.qtd_notas ?? 0), 0);
    const ticketMedio = totalNotas > 0 ? totalVendido / totalNotas : 0;
    return { totalVendido, totalComissao, vendedores: ranking.length, ticketMedio };
  }, [ranking]);

  const columns = [
    {
      key: 'posicao' as const,
      label: '#',
      render: (v: number | null) => (
        <span className={v != null && v <= 3 ? 'text-lg' : ''}>{medalha(v)}</span>
      ),
    },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'unidade_nome' as const, label: 'Unidade' },
    {
      key: 'regime' as const,
      label: 'Regime',
      render: (v: string | null) => v ? <StatusBadge status={v} /> : '—',
    },
    {
      key: 'total_vendido' as const,
      label: 'Total Vendido',
      align: 'right' as const,
      render: (v: number | null) => formatBRL(v),
    },
    {
      key: 'total_comissao' as const,
      label: 'Comissão',
      align: 'right' as const,
      render: (v: number | null) => formatBRL(v),
    },
    {
      key: 'percentual_aplicado' as const,
      label: '% Comissão',
      align: 'right' as const,
      render: (v: number | null) => formatPct(v),
    },
    {
      key: 'qtd_notas' as const,
      label: 'Notas',
      align: 'right' as const,
    },
  ];

  return (
    <AppShell title="Ranking">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {/* Banner Top Performer */}
          {top1 && (
            <div className="relative overflow-hidden rounded-xl border-2 border-primary bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-card"
              style={{ boxShadow: '0 0 40px rgba(245,166,35,0.15)' }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-primary">🏆 Top Performer — {MESES[periodoMes]}/{periodoAno}</p>
                  <h3 className="text-2xl font-extrabold text-foreground">{top1.vendedor_nome}</h3>
                  <p className="text-secondary-foreground text-sm">{top1.unidade_nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-secondary-foreground">Total Vendido</p>
                  <p className="text-2xl font-extrabold text-foreground">{formatBRL(top1.total_vendido)}</p>
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={DollarSign} label="Total Vendido (Time)" value={formatBRL(kpis.totalVendido)} />
            <KPICard icon={Trophy} label="Comissão Total" value={formatBRL(kpis.totalComissao)} />
            <KPICard icon={Users} label="Vendedores Ativos" value={String(kpis.vendedores)} />
            <KPICard icon={Receipt} label="Ticket Médio" value={formatBRL(kpis.ticketMedio)} />
          </div>

          {/* Tabela Desktop */}
          <div className="hidden md:block">
            <DataTable columns={columns} data={ranking} rowClassName={(row: any) => row.posicao != null && row.posicao <= 3 ? 'bg-primary/5' : ''} />
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-3">
            {ranking.map((r) => (
              <div key={r.vendedor_id} className={`bg-card border border-border rounded-lg p-4 shadow-card ${r.posicao != null && r.posicao <= 3 ? 'border-primary/40' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{medalha(r.posicao)}</span>
                    <span className="font-bold text-foreground">{r.vendedor_nome}</span>
                  </div>
                  {r.regime && <StatusBadge status={r.regime} />}
                </div>
                <p className="text-xs text-secondary-foreground mb-2">{r.unidade_nome}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Vendido: </span>
                    <span className="font-semibold text-foreground">{formatBRL(r.total_vendido)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Comissão: </span>
                    <span className="font-semibold text-foreground">{formatBRL(r.total_comissao)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">%: </span>
                    <span className="text-foreground">{formatPct(r.percentual_aplicado)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Notas: </span>
                    <span className="text-foreground">{r.qtd_notas ?? 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
