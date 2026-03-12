import { useState, useCallback } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { DataTable } from '@/components/DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { usePeriod } from '@/contexts/PeriodContext';
import { DollarSign, Users, Percent, TrendingUp, Package, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  AreaChart, Area, Line,
} from 'recharts';

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));
const fmtPct = (v: number | null | undefined) =>
  v != null ? `${Number(v).toFixed(1)}%` : '—';

const TABLE_PAGE_SIZE = 30;

export default function Gerencial() {
  const { periodoAno, periodoMes } = usePeriod();
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('all');
  const [filtroFamilia, setFiltroFamilia] = useState<string>('all');
  const [filtroMarca, setFiltroMarca] = useState<string>('all');
  const [buscaTabela, setBuscaTabela] = useState('');
  const [tabelaPagina, setTabelaPagina] = useState(1);

  // Debounced search state
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchTimer = useCallback((val: string) => {
    setBuscaTabela(val);
    // Simple debounce via setTimeout
    const id = setTimeout(() => {
      setSearchDebounced(val);
      setTabelaPagina(1);
    }, 400);
    return () => clearTimeout(id);
  }, []);

  const rpcFilters = {
    p_ano: periodoAno,
    p_mes: periodoMes,
    p_unidade: filtroUnidade !== 'all' ? filtroUnidade : null,
    p_vendedor: filtroVendedor !== 'all' ? filtroVendedor : null,
    p_familia: filtroFamilia !== 'all' ? filtroFamilia : null,
    p_marca: filtroMarca !== 'all' ? filtroMarca : null,
  };

  // RPC: Summary (KPIs, charts, filter options)
  const { data: resumo, isLoading: loadResumo } = useQuery({
    queryKey: ['gerencial-resumo', rpcFilters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_gerencial_resumo', rpcFilters as any);
      if (error) throw error;
      return data as any;
    },
    staleTime: 2 * 60 * 1000,
  });

  // RPC: Paginated table
  const { data: vendasData, isLoading: loadVendas } = useQuery({
    queryKey: ['gerencial-vendas', rpcFilters, tabelaPagina, searchDebounced],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_gerencial_vendas', {
        ...rpcFilters,
        p_search: searchDebounced || null,
        p_offset: (tabelaPagina - 1) * TABLE_PAGE_SIZE,
        p_limit: TABLE_PAGE_SIZE,
      } as any);
      if (error) throw error;
      return data as any;
    },
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = loadResumo;

  // Extract data from RPC responses
  const kpis = resumo?.kpis ?? { faturamento: 0, lucro_total: 0, qtd_vendas: 0, qtd_vendedores: 0, margem_media: 0 };
  const chartDiario = (resumo?.chart_diario ?? []).map((d: any) => {
    const parts = d.data?.split('-');
    const label = parts?.length >= 3 ? `${parts[2]}/${parts[1]}` : d.data;
    return {
      data: label,
      faturamentoDia: Number(d.faturamento_dia),
      lucroDia: Number(d.lucro_dia),
      acumulado: Number(d.acumulado),
    };
  });
  const chartFamilias = (resumo?.top_familias ?? []).map((f: any) => ({ name: f.name, total: Number(f.total) }));
  const chartMarcas = (resumo?.top_marcas ?? []).map((m: any) => ({ name: m.name, total: Number(m.total) }));
  const filtros = resumo?.filtros ?? { vendedores: [], unidades: [], familias: [], marcas: [] };
  const totalPeriodo = resumo?.total_periodo ?? 0;

  const vendasRows = vendasData?.rows ?? [];
  const vendasTotalCount = vendasData?.total_count ?? 0;

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setTabelaPagina(1);
  };

  // Active filters for chips
  const activeFilters = [
    ...(filtroUnidade !== 'all' ? [{ label: `Unidade: ${filtroUnidade}`, clear: () => { setFiltroUnidade('all'); setTabelaPagina(1); } }] : []),
    ...(filtroVendedor !== 'all' ? [{ label: `Vendedor: ${filtroVendedor}`, clear: () => { setFiltroVendedor('all'); setTabelaPagina(1); } }] : []),
    ...(filtroFamilia !== 'all' ? [{ label: `Família: ${filtroFamilia}`, clear: () => { setFiltroFamilia('all'); setTabelaPagina(1); } }] : []),
    ...(filtroMarca !== 'all' ? [{ label: `Marca: ${filtroMarca}`, clear: () => { setFiltroMarca('all'); setTabelaPagina(1); } }] : []),
  ];

  const clearAllFilters = () => {
    setFiltroUnidade('all');
    setFiltroVendedor('all');
    setFiltroFamilia('all');
    setFiltroMarca('all');
    setTabelaPagina(1);
  };

  // Detail table columns
  const detailColumns = [
    { key: 'data_emissao' as const, label: 'Data', render: (v: string) => v ? v.split('-').reverse().join('/') : '—' },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'unidade_nome' as const, label: 'Unidade' },
    { key: 'descricao_produto' as const, label: 'Produto' },
    { key: 'familia_produto' as const, label: 'Família' },
    { key: 'marca' as const, label: 'Marca' },
    { key: 'total_com_desconto' as const, label: 'Valor', align: 'right' as const, render: (v: number) => fmt(v) },
    { key: 'lucros_reais' as const, label: 'Lucro', align: 'right' as const, render: (v: number) => fmt(v) },
    { key: 'margem_percentual' as const, label: 'Margem', align: 'right' as const, render: (v: number) => fmtPct(v) },
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
          <KPICard icon={DollarSign} label="Faturamento" value={fmt(kpis.faturamento)} />
          <KPICard icon={TrendingUp} label="Lucro Total" value={fmt(kpis.lucro_total)} />
          <KPICard icon={Percent} label="Margem Média" value={fmtPct(kpis.margem_media)} />
          <KPICard icon={Users} label="Vendedores" value={String(kpis.qtd_vendedores)} />
          <KPICard icon={Package} label="Qtd Vendas" value={String(kpis.qtd_vendas)} />
        </div>

        {/* Filters inline */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Unidade" value={filtroUnidade} onChange={handleFilterChange(setFiltroUnidade)} options={(filtros.unidades ?? []).map((u: string) => ({ value: u, label: u }))} allLabel="Todas as Unidades" />
          <FilterSelect label="Vendedor" value={filtroVendedor} onChange={handleFilterChange(setFiltroVendedor)} options={(filtros.vendedores ?? []).map((v: string) => ({ value: v, label: v }))} allLabel="Todos os Vendedores" />
          <FilterSelect label="Família" value={filtroFamilia} onChange={handleFilterChange(setFiltroFamilia)} options={(filtros.familias ?? []).map((f: string) => ({ value: f, label: f }))} allLabel="Todas as Famílias" />
          <FilterSelect label="Marca" value={filtroMarca} onChange={handleFilterChange(setFiltroMarca)} options={(filtros.marcas ?? []).map((m: string) => ({ value: m, label: m }))} allLabel="Todas as Marcas" />
          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map(f => (
              <button key={f.label} onClick={f.clear} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                {f.label}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {/* Area Chart - Progresso Diário + Acumulado */}
        {chartDiario.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-secondary-foreground">Progresso de Faturamento</h3>
              <span className="text-xs text-muted-foreground">{kpis.qtd_vendas} vendas filtradas de {totalPeriodo} no período</span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartDiario} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis yAxisId="dia" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="acum" orientation="right" tick={{ fill: 'hsl(142 71% 45%)', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  formatter={(v: number, name: string) => [
                    fmt(v),
                    name === 'faturamentoDia' ? 'Fat. Dia' : name === 'acumulado' ? 'Acumulado' : 'Lucro Dia',
                  ]}
                />
                <Area yAxisId="dia" type="monotone" dataKey="faturamentoDia" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradFat)" dot={false} activeDot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                <Line yAxisId="acum" type="monotone" dataKey="acumulado" stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Famílias & Top Marcas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {chartFamilias.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Top 10 Famílias de Produto</h3>
              <ResponsiveContainer width="100%" height={Math.max(250, chartFamilias.length * 40)}>
                <BarChart data={chartFamilias} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={150} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(v: number) => [fmt(v), 'Total']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chartFamilias.map((_: any, i: number) => <Cell key={i} fill="hsl(210 80% 55%)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartMarcas.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Top 10 Marcas</h3>
              <ResponsiveContainer width="100%" height={Math.max(250, chartMarcas.length * 40)}>
                <BarChart data={chartMarcas} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={150} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(v: number) => [fmt(v), 'Total']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chartMarcas.map((_: any, i: number) => <Cell key={i} fill="hsl(280 70% 55%)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Sales Table */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h3 className="text-sm font-semibold text-secondary-foreground whitespace-nowrap">
              Vendas Detalhadas ({vendasTotalCount} registros)
              {loadVendas && <span className="ml-2 text-xs text-muted-foreground">(carregando...)</span>}
            </h3>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar vendedor, produto, marca..."
                value={buscaTabela}
                onChange={e => searchTimer(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <DataTable
            columns={detailColumns}
            data={vendasRows}
            pageSize={TABLE_PAGE_SIZE}
            serverPagination={{
              totalCount: vendasTotalCount,
              currentPage: tabelaPagina,
              onPageChange: setTabelaPagina,
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}

// --- Filter Select Sub-component ---
function FilterSelect({ label, value, onChange, options, allLabel }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-[140px] max-w-[220px]"
      title={label}
    >
      <option value="all">{allLabel}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
