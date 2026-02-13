import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable } from '@/components/DataTable';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Users, Percent, TrendingUp, PieChart, X } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));
const fmtPct = (v: number | null | undefined) =>
  v != null ? `${Number(v).toFixed(1)}%` : '—';
const medalha = (pos: number | null) => {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return String(pos ?? '—');
};

export default function Gerencial() {
  const { periodoAno, periodoMes } = usePeriod();
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroRegime, setFiltroRegime] = useState<string>('all');

  // --- Data fetching ---
  const { data: ranking = [], isLoading: loadR } = useQuery({
    queryKey: ['ranking', periodoAno, periodoMes],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_ranking').select('*')
        .eq('periodo_ano', periodoAno).eq('periodo_mes', periodoMes)
        .order('posicao', { ascending: true });
      return data ?? [];
    },
  });

  const { data: resumoUnidade = [], isLoading: loadU } = useQuery({
    queryKey: ['resumo_unidade', periodoAno, periodoMes],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_resumo_unidade').select('*')
        .eq('periodo_ano', periodoAno).eq('periodo_mes', periodoMes);
      return data ?? [];
    },
  });

  const { data: resumoRegime = [], isLoading: loadRg } = useQuery({
    queryKey: ['resumo_regime', periodoAno, periodoMes],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_resumo_regime').select('*')
        .eq('periodo_ano', periodoAno).eq('periodo_mes', periodoMes);
      return data ?? [];
    },
  });

  const isLoading = loadR || loadU || loadRg;

  // --- Ranked units by total sold ---
  const unidadesRanked = useMemo(() => {
    const src = filtroUnidade !== 'all'
      ? resumoUnidade.filter(u => u.unidade_nome === filtroUnidade)
      : resumoUnidade;
    return [...src].sort((a, b) => Number(b.total_vendido ?? 0) - Number(a.total_vendido ?? 0));
  }, [resumoUnidade, filtroUnidade]);

  // --- Unique filter values ---
  const unidades = useMemo(() => {
    const names = [...new Set(ranking.map(r => r.unidade_nome).filter(Boolean))] as string[];
    return names.sort();
  }, [ranking]);

  // --- Client-side filtering ---
  const filteredRanking = useMemo(() => {
    return ranking.filter(r => {
      if (filtroUnidade !== 'all' && r.unidade_nome !== filtroUnidade) return false;
      if (filtroRegime !== 'all' && r.regime !== filtroRegime) return false;
      return true;
    });
  }, [ranking, filtroUnidade, filtroRegime]);

  const filteredUnidade = useMemo(() => {
    return resumoUnidade.filter(u => {
      if (filtroUnidade !== 'all' && u.unidade_nome !== filtroUnidade) return false;
      if (filtroRegime !== 'all' && u.unidade_tipo !== filtroRegime) return false; // regime doesn't apply directly to unidade, keep all unless filtered by name
      return true;
    });
  }, [resumoUnidade, filtroUnidade, filtroRegime]);

  // --- KPIs (from filtered ranking) ---
  const kpis = useMemo(() => {
    const faturamento = filteredRanking.reduce((s, r) => s + Number(r.total_vendido ?? 0), 0);
    const custoComissao = filteredRanking.reduce((s, r) => s + Number(r.total_comissao ?? 0), 0);
    const pctComissao = faturamento > 0 ? (custoComissao / faturamento) * 100 : 0;
    const vendedores = filteredRanking.length;
    const totalMargem = filteredRanking.reduce((s, r) => s + Number(r.margem_media ?? 0) * Number(r.total_vendido ?? 0), 0);
    const totalPeso = filteredRanking.reduce((s, r) => s + Number(r.total_vendido ?? 0), 0);
    const margemMedia = totalPeso > 0 ? totalMargem / totalPeso : 0;
    return { faturamento, custoComissao, pctComissao, vendedores, margemMedia };
  }, [filteredRanking]);

  // --- Regime data ---
  const pjData = resumoRegime.find(r => r.regime === 'PJ');
  const cltData = resumoRegime.find(r => r.regime === 'CLT');

  // --- Chart data (unidade) ---
  const chartData = useMemo(() => {
    const filtered = filtroUnidade !== 'all'
      ? resumoUnidade.filter(u => u.unidade_nome === filtroUnidade)
      : resumoUnidade;
    return [...filtered]
      .sort((a, b) => Number(b.total_vendido ?? 0) - Number(a.total_vendido ?? 0))
      .map(u => ({ name: u.unidade_nome ?? '', total: Number(u.total_vendido ?? 0) }));
  }, [resumoUnidade, filtroUnidade]);

  // --- Unidade table columns ---
  const unidadeColumns = [
    { key: 'unidade_nome' as const, label: 'Unidade' },
    {
      key: 'unidade_tipo' as const, label: 'Tipo',
      render: (v: string | null) => v ? <StatusBadge status={v} /> : '—',
    },
    { key: 'qtd_vendedores' as const, label: 'Vendedores', align: 'right' as const },
    { key: 'total_vendido' as const, label: 'Total Vendido', align: 'right' as const, render: (v: number | null) => fmt(v) },
    { key: 'custo_comissao' as const, label: 'Custo Comissão', align: 'right' as const, render: (v: number | null) => fmt(v) },
    { key: 'percentual_medio' as const, label: '% Comissão', align: 'right' as const, render: (v: number | null) => fmtPct(v) },
    { key: 'margem_media' as const, label: 'Margem Média', align: 'right' as const, render: (v: number | null) => fmtPct(v) },
    { key: 'media_por_vendedor' as const, label: 'Média/Vendedor', align: 'right' as const, render: (v: number | null) => fmt(v) },
  ];

  // Totals row for unidade table
  const unidadeTotals = useMemo(() => {
    const src = filtroUnidade !== 'all' ? resumoUnidade.filter(u => u.unidade_nome === filtroUnidade) : resumoUnidade;
    const totalVendido = src.reduce((s, u) => s + Number(u.total_vendido ?? 0), 0);
    const custoComissao = src.reduce((s, u) => s + Number(u.custo_comissao ?? 0), 0);
    const qtdVendedores = src.reduce((s, u) => s + Number(u.qtd_vendedores ?? 0), 0);
    return {
      unidade_nome: 'TOTAL',
      unidade_tipo: null,
      qtd_vendedores: qtdVendedores,
      total_vendido: totalVendido,
      custo_comissao: custoComissao,
      percentual_medio: totalVendido > 0 ? (custoComissao / totalVendido) * 100 : 0,
      margem_media: null,
      media_por_vendedor: qtdVendedores > 0 ? totalVendido / qtdVendedores : 0,
    };
  }, [resumoUnidade, filtroUnidade]);

  const unidadeDataWithTotal = useMemo(() => {
    const src = filtroUnidade !== 'all' ? resumoUnidade.filter(u => u.unidade_nome === filtroUnidade) : resumoUnidade;
    return [...src, unidadeTotals as any];
  }, [resumoUnidade, filtroUnidade, unidadeTotals]);

  // --- Ranking table columns (extended) ---
  const rankingColumns = [
    {
      key: 'posicao' as const, label: '#',
      render: (v: number | null) => <span className={v != null && v <= 3 ? 'text-lg' : ''}>{medalha(v)}</span>,
    },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'unidade_nome' as const, label: 'Unidade' },
    {
      key: 'regime' as const, label: 'Regime',
      render: (v: string | null) => v ? <StatusBadge status={v} /> : '—',
    },
    { key: 'total_vendido' as const, label: 'Total Vendido', align: 'right' as const, render: (v: number | null) => fmt(v) },
    { key: 'total_comissao' as const, label: 'Comissão', align: 'right' as const, render: (v: number | null) => fmt(v) },
    { key: 'percentual_aplicado' as const, label: '% Comissão', align: 'right' as const, render: (v: number | null) => fmtPct(v) },
    { key: 'margem_media' as const, label: 'Margem', align: 'right' as const, render: (v: number | null) => fmtPct(v) },
    { key: 'lucro_total' as const, label: 'Lucro', align: 'right' as const, render: (v: number | null) => fmt(v) },
    { key: 'qtd_notas' as const, label: 'Notas', align: 'right' as const },
  ];

  const activeFilters = [
    ...(filtroUnidade !== 'all' ? [{ label: filtroUnidade, clear: () => setFiltroUnidade('all') }] : []),
    ...(filtroRegime !== 'all' ? [{ label: filtroRegime, clear: () => setFiltroRegime('all') }] : []),
  ];

  if (isLoading) {
    return (
      <AppShell title="Gerencial">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Gerencial">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard icon={DollarSign} label="Faturamento Total" value={fmt(kpis.faturamento)} />
          <KPICard icon={TrendingUp} label="Custo Comissão" value={fmt(kpis.custoComissao)} />
          <KPICard icon={Percent} label="% Comissão / Faturamento" value={fmtPct(kpis.pctComissao)} />
          <KPICard icon={Users} label="Vendedores Ativos" value={String(kpis.vendedores)} />
          <KPICard icon={PieChart} label="Margem Média" value={fmtPct(kpis.margemMedia)} />
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-card flex flex-wrap items-center gap-3">
          <select
            value={filtroUnidade}
            onChange={e => setFiltroUnidade(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Todas as Unidades</option>
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <select
            value={filtroRegime}
            onChange={e => setFiltroRegime(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Todos os Regimes</option>
            <option value="PJ">PJ</option>
            <option value="CLT">CLT</option>
          </select>

          {activeFilters.length > 0 && (
            <div className="flex gap-2 ml-2">
              {activeFilters.map(f => (
                <button
                  key={f.label}
                  onClick={f.clear}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
                >
                  {f.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PJ vs CLT */}
        {(pjData || cltData) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RegimeCard data={pjData} regime="PJ" borderClass="border-primary" />
            <RegimeCard data={cltData} regime="CLT" borderClass="border-blue-500" />
          </div>
        )}

        {/* Unidades que Mais Venderam */}
        {unidadesRanked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-secondary-foreground">Unidades que Mais Venderam</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {unidadesRanked.map((u, i) => {
                const pos = i + 1;
                const borderColor = pos === 1 ? 'border-yellow-500' : pos === 2 ? 'border-gray-400' : pos === 3 ? 'border-amber-700' : 'border-border';
                const bgHighlight = pos <= 3 ? 'bg-primary/5' : '';
                return (
                  <div
                    key={u.unidade_id ?? i}
                    className={`bg-card border-2 ${borderColor} ${bgHighlight} rounded-lg p-4 shadow-card transition-transform hover:scale-[1.02]`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">{medalha(pos <= 3 ? pos : null) !== '—' ? medalha(pos) : `${pos}º`}</span>
                      {u.unidade_tipo && <StatusBadge status={u.unidade_tipo} />}
                    </div>
                    <p className="font-semibold text-foreground text-sm truncate mb-2">{u.unidade_nome}</p>
                    <p className="text-lg font-bold text-primary mb-1">{fmt(u.total_vendido)}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>{u.qtd_vendedores ?? 0} vendedores</span>
                      <span>Margem {fmtPct(u.margem_media)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unidade Table */}
        <div>
          <h3 className="text-sm font-semibold text-secondary-foreground mb-3">Performance por Unidade</h3>
          <div className="hidden md:block">
            <DataTable
              columns={unidadeColumns}
              data={unidadeDataWithTotal}
              rowClassName={(row: any) => row.unidade_nome === 'TOTAL' ? 'font-bold bg-secondary/50' : ''}
            />
          </div>
          <div className="md:hidden space-y-3">
            {unidadeDataWithTotal.map((u: any, i: number) => (
              <div key={i} className={`bg-card border border-border rounded-lg p-4 shadow-card ${u.unidade_nome === 'TOTAL' ? 'border-primary/40 bg-secondary/30' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-foreground">{u.unidade_nome}</span>
                  {u.unidade_tipo && <StatusBadge status={u.unidade_tipo} />}
                </div>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-muted-foreground">Vendedores:</span><span className="text-foreground">{u.qtd_vendedores}</span>
                  <span className="text-muted-foreground">Vendido:</span><span className="text-foreground">{fmt(u.total_vendido)}</span>
                  <span className="text-muted-foreground">Comissão:</span><span className="text-foreground">{fmt(u.custo_comissao)}</span>
                  <span className="text-muted-foreground">Média/Vend.:</span><span className="text-foreground">{fmt(u.media_por_vendedor)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Completo */}
        <div>
          <h3 className="text-sm font-semibold text-secondary-foreground mb-3">Ranking Completo</h3>
          <div className="hidden md:block">
            <DataTable
              columns={rankingColumns}
              data={filteredRanking}
              rowClassName={(row: any) => row.posicao != null && row.posicao <= 3 ? 'bg-primary/5' : ''}
            />
          </div>
          <div className="md:hidden space-y-3">
            {filteredRanking.map(r => (
              <div key={r.vendedor_id} className={`bg-card border border-border rounded-lg p-4 shadow-card ${r.posicao != null && r.posicao <= 3 ? 'border-primary/40' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{medalha(r.posicao)}</span>
                    <span className="font-bold text-foreground">{r.vendedor_nome}</span>
                  </div>
                  {r.regime && <StatusBadge status={r.regime} />}
                </div>
                <p className="text-xs text-secondary-foreground mb-2">{r.unidade_nome}</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-muted-foreground">Vendido:</span><span className="text-foreground font-semibold">{fmt(r.total_vendido)}</span>
                  <span className="text-muted-foreground">Comissão:</span><span className="text-foreground">{fmt(r.total_comissao)}</span>
                  <span className="text-muted-foreground">Margem:</span><span className="text-foreground">{fmtPct(r.margem_media)}</span>
                  <span className="text-muted-foreground">Lucro:</span><span className="text-foreground">{fmt(r.lucro_total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-card">
            <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Total Vendido por Unidade</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(v: number) => [fmt(v), 'Total Vendido']}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="hsl(38 90% 55%)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// --- Sub-component: Regime Card ---
function RegimeCard({ data, regime, borderClass }: {
  data: any;
  regime: string;
  borderClass: string;
}) {
  if (!data) {
    return (
      <div className={`bg-card border-2 ${borderClass} rounded-lg p-5 shadow-card opacity-50`}>
        <h4 className="font-bold text-foreground mb-3">{regime}</h4>
        <p className="text-sm text-muted-foreground">Sem dados para este período</p>
      </div>
    );
  }

  return (
    <div className={`bg-card border-2 ${borderClass} rounded-lg p-5 shadow-card`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-foreground text-lg">{regime}</h4>
        <StatusBadge status={regime} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Total Vendido</p>
          <p className="text-foreground font-semibold">{fmt(data.total_vendido)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Comissão</p>
          <p className="text-foreground font-semibold">{fmt(data.custo_comissao)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Vendedores</p>
          <p className="text-foreground font-semibold">{data.qtd_vendedores ?? 0}</p>
        </div>
        <div>
          <p className="text-muted-foreground">% Médio</p>
          <p className="text-foreground font-semibold">{fmtPct(data.percentual_medio)}</p>
        </div>
      </div>
    </div>
  );
}
