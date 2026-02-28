import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable } from '@/components/DataTable';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Users, Percent, TrendingUp, PieChart, X, Package } from 'lucide-react';
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

// Parse BR currency string like "R$ 15,40" or "15,40" to number
function parseBRL(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Parse BR percentage string like "49,30%" to number
function parsePct(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace('%', '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

interface ProcessedVenda {
  id: number;
  vendedor_nome: string;
  unidade_nome: string;
  regime: string;
  familia_produto: string;
  total_com_desconto: number;
  lucros_reais: number;
  margem_percentual: number;
  quantidade: number;
  descricao_produto: string;
}

export default function Gerencial() {
  const { periodoAno, periodoMes } = usePeriod();
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroRegime, setFiltroRegime] = useState<string>('all');

  // --- Existing queries for commission data ---
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

  // --- NEW: Fetch vendas filtered by period ---
  const { data: vendasRaw = [], isLoading: loadV } = useQuery({
    queryKey: ['vendas', periodoAno, periodoMes],
    queryFn: async () => {
      const startDate = `${periodoAno}-${String(periodoMes).padStart(2, '0')}-01`;
      const endMonth = periodoMes === 12 ? 1 : periodoMes + 1;
      const endYear = periodoMes === 12 ? periodoAno + 1 : periodoAno;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      const { data } = await supabase
        .from('vendas').select('*')
        .gte('data_emissao', startDate)
        .lt('data_emissao', endDate);
      return data ?? [];
    },
  });

  // --- NEW: Fetch vendedores with unidade info ---
  const { data: vendedoresData = [], isLoading: loadVe } = useQuery({
    queryKey: ['vendedores_unidades'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendedores').select('nome_omie, regime, unidade_id, unidades(nome)');
      return data ?? [];
    },
  });

  const isLoading = loadR || loadU || loadV || loadVe;

  // --- Build vendedor map: nome_omie -> { unidade_nome, regime } ---
  const vendedorMap = useMemo(() => {
    const map = new Map<string, { unidade_nome: string; regime: string }>();
    for (const v of vendedoresData) {
      const unidadeNome = (v.unidades as any)?.nome ?? 'Sem Unidade';
      map.set(v.nome_omie, { unidade_nome: unidadeNome, regime: v.regime });
    }
    return map;
  }, [vendedoresData]);

  // --- Process vendas: parse values and map to units ---
  const vendasProcessadas: ProcessedVenda[] = useMemo(() => {
    return vendasRaw.map(v => {
      const info = vendedorMap.get(v.vendedor_nome ?? '') ?? { unidade_nome: 'Sem Unidade', regime: 'PJ' };
      return {
        id: v.id,
        vendedor_nome: v.vendedor_nome ?? '',
        unidade_nome: info.unidade_nome,
        regime: info.regime,
        familia_produto: v.familia_produto ?? 'Outros',
        total_com_desconto: parseBRL(v.total_com_desconto),
        lucros_reais: parseBRL(v.lucros_reais),
        margem_percentual: parsePct(v.margem_percentual),
        quantidade: parseBRL(v.quantidade),
        descricao_produto: v.descricao_produto ?? '',
      };
    });
  }, [vendasRaw, vendedorMap]);

  // --- Filter vendas by unidade and regime ---
  const vendasFiltradas = useMemo(() => {
    return vendasProcessadas.filter(v => {
      if (filtroUnidade !== 'all' && v.unidade_nome !== filtroUnidade) return false;
      if (filtroRegime !== 'all' && v.regime !== filtroRegime) return false;
      return true;
    });
  }, [vendasProcessadas, filtroUnidade, filtroRegime]);

  // --- Unique filter values from vendas ---
  const unidades = useMemo(() => {
    const names = [...new Set(vendasProcessadas.map(v => v.unidade_nome))].filter(n => n !== 'Sem Unidade');
    return names.sort();
  }, [vendasProcessadas]);

  // --- KPIs from vendas ---
  const kpis = useMemo(() => {
    const faturamento = vendasFiltradas.reduce((s, v) => s + v.total_com_desconto, 0);
    const lucroTotal = vendasFiltradas.reduce((s, v) => s + v.lucros_reais, 0);
    const qtdVendas = vendasFiltradas.length;
    const totalPeso = vendasFiltradas.reduce((s, v) => s + v.total_com_desconto, 0);
    const totalMargemPonderada = vendasFiltradas.reduce((s, v) => s + v.margem_percentual * v.total_com_desconto, 0);
    const margemMedia = totalPeso > 0 ? totalMargemPonderada / totalPeso : 0;
    const vendedoresUnicos = new Set(vendasFiltradas.map(v => v.vendedor_nome)).size;
    return { faturamento, lucroTotal, qtdVendas, margemMedia, vendedoresUnicos };
  }, [vendasFiltradas]);

  // --- Aggregate by unidade ---
  const dadosPorUnidade = useMemo(() => {
    const map = new Map<string, { total: number; lucro: number; margemPeso: number; peso: number; qtd: number }>();
    for (const v of vendasProcessadas) {
      if (v.unidade_nome === 'Sem Unidade') continue;
      const cur = map.get(v.unidade_nome) ?? { total: 0, lucro: 0, margemPeso: 0, peso: 0, qtd: 0 };
      cur.total += v.total_com_desconto;
      cur.lucro += v.lucros_reais;
      cur.margemPeso += v.margem_percentual * v.total_com_desconto;
      cur.peso += v.total_com_desconto;
      cur.qtd += 1;
      map.set(v.unidade_nome, cur);
    }
    return [...map.entries()]
      .map(([name, d]) => ({
        name,
        total: d.total,
        lucro: d.lucro,
        margem: d.peso > 0 ? d.margemPeso / d.peso : 0,
        qtd: d.qtd,
      }))
      .sort((a, b) => b.total - a.total);
  }, [vendasProcessadas]);

  // --- Chart: Faturamento por Unidade ---
  const chartFaturamento = useMemo(() => {
    if (filtroUnidade !== 'all') return dadosPorUnidade.filter(d => d.name === filtroUnidade);
    return dadosPorUnidade;
  }, [dadosPorUnidade, filtroUnidade]);

  // --- Chart: Margem por Unidade ---
  const chartMargem = useMemo(() => {
    const src = filtroUnidade !== 'all' ? dadosPorUnidade.filter(d => d.name === filtroUnidade) : dadosPorUnidade;
    return src.map(d => ({ name: d.name, margem: d.margem })).sort((a, b) => b.margem - a.margem);
  }, [dadosPorUnidade, filtroUnidade]);

  // --- Chart: Top Famílias de Produto ---
  const chartFamilias = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vendasFiltradas) {
      if (!v.familia_produto || v.familia_produto === 'Outros') continue;
      map.set(v.familia_produto, (map.get(v.familia_produto) ?? 0) + v.total_com_desconto);
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [vendasFiltradas]);

  // --- PJ vs CLT from vendas ---
  const regimeData = useMemo(() => {
    const map = new Map<string, { total: number; lucro: number; vendedores: Set<string>; qtd: number }>();
    for (const v of vendasFiltradas) {
      const cur = map.get(v.regime) ?? { total: 0, lucro: 0, vendedores: new Set<string>(), qtd: 0 };
      cur.total += v.total_com_desconto;
      cur.lucro += v.lucros_reais;
      cur.vendedores.add(v.vendedor_nome);
      cur.qtd += 1;
      map.set(v.regime, cur);
    }
    return map;
  }, [vendasFiltradas]);

  // --- Ranked units (from vendas) ---
  const unidadesRanked = useMemo(() => {
    if (filtroUnidade !== 'all') return dadosPorUnidade.filter(d => d.name === filtroUnidade);
    return dadosPorUnidade;
  }, [dadosPorUnidade, filtroUnidade]);

  // --- Client-side filtered ranking (for table) ---
  const filteredRanking = useMemo(() => {
    return ranking.filter(r => {
      if (filtroUnidade !== 'all' && r.unidade_nome !== filtroUnidade) return false;
      if (filtroRegime !== 'all' && r.regime !== filtroRegime) return false;
      return true;
    });
  }, [ranking, filtroUnidade, filtroRegime]);

  // --- Unidade table (from resumoUnidade for commission data) ---
  const unidadeColumns = [
    { key: 'unidade_nome' as const, label: 'Unidade' },
    { key: 'unidade_tipo' as const, label: 'Tipo', render: (v: string | null) => v ? <StatusBadge status={v} /> : '—' },
    { key: 'qtd_vendedores' as const, label: 'Vendedores', align: 'right' as const },
    { key: 'total_vendido' as const, label: 'Total Vendido', align: 'right' as const, render: (v: number | null) => fmt(v) },
    { key: 'custo_comissao' as const, label: 'Custo Comissão', align: 'right' as const, render: (v: number | null) => fmt(v) },
    { key: 'percentual_medio' as const, label: '% Comissão', align: 'right' as const, render: (v: number | null) => fmtPct(v) },
    { key: 'margem_media' as const, label: 'Margem Média', align: 'right' as const, render: (v: number | null) => fmtPct(v) },
    { key: 'media_por_vendedor' as const, label: 'Média/Vendedor', align: 'right' as const, render: (v: number | null) => fmt(v) },
  ];

  const unidadeTotals = useMemo(() => {
    const src = filtroUnidade !== 'all' ? resumoUnidade.filter(u => u.unidade_nome === filtroUnidade) : resumoUnidade;
    const totalVendido = src.reduce((s, u) => s + Number(u.total_vendido ?? 0), 0);
    const custoComissao = src.reduce((s, u) => s + Number(u.custo_comissao ?? 0), 0);
    const qtdVendedores = src.reduce((s, u) => s + Number(u.qtd_vendedores ?? 0), 0);
    return {
      unidade_nome: 'TOTAL', unidade_tipo: null, qtd_vendedores: qtdVendedores,
      total_vendido: totalVendido, custo_comissao: custoComissao,
      percentual_medio: totalVendido > 0 ? (custoComissao / totalVendido) * 100 : 0,
      margem_media: null, media_por_vendedor: qtdVendedores > 0 ? totalVendido / qtdVendedores : 0,
    };
  }, [resumoUnidade, filtroUnidade]);

  const unidadeDataWithTotal = useMemo(() => {
    const src = filtroUnidade !== 'all' ? resumoUnidade.filter(u => u.unidade_nome === filtroUnidade) : resumoUnidade;
    return [...src, unidadeTotals as any];
  }, [resumoUnidade, filtroUnidade, unidadeTotals]);

  const rankingColumns = [
    { key: 'posicao' as const, label: '#', render: (v: number | null) => <span className={v != null && v <= 3 ? 'text-lg' : ''}>{medalha(v)}</span> },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'unidade_nome' as const, label: 'Unidade' },
    { key: 'regime' as const, label: 'Regime', render: (v: string | null) => v ? <StatusBadge status={v} /> : '—' },
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

  const pjInfo = regimeData.get('PJ');
  const cltInfo = regimeData.get('CLT');

  return (
    <AppShell title="Gerencial">
      <div className="space-y-6">
        {/* KPIs from vendas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard icon={DollarSign} label="Faturamento" value={fmt(kpis.faturamento)} />
          <KPICard icon={TrendingUp} label="Lucro Total" value={fmt(kpis.lucroTotal)} />
          <KPICard icon={Percent} label="Margem Média" value={fmtPct(kpis.margemMedia)} />
          <KPICard icon={Users} label="Vendedores" value={String(kpis.vendedoresUnicos)} />
          <KPICard icon={Package} label="Qtd Vendas" value={String(kpis.qtdVendas)} />
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
                <button key={f.label} onClick={f.clear} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                  {f.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PJ vs CLT from vendas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RegimeCardVendas data={pjInfo} regime="PJ" borderClass="border-primary" />
          <RegimeCardVendas data={cltInfo} regime="CLT" borderClass="border-blue-500" />
        </div>

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
                  <div key={u.name} className={`bg-card border-2 ${borderColor} ${bgHighlight} rounded-lg p-4 shadow-card transition-transform hover:scale-[1.02]`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">{pos <= 3 ? medalha(pos) : `${pos}º`}</span>
                    </div>
                    <p className="font-semibold text-foreground text-sm truncate mb-2">{u.name}</p>
                    <p className="text-lg font-bold text-primary mb-1">{fmt(u.total)}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Lucro {fmt(u.lucro)}</span>
                      <span>Margem {fmtPct(u.margem)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Faturamento por Unidade */}
          {chartFaturamento.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Faturamento por Unidade</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, chartFaturamento.length * 50)}>
                <BarChart data={chartFaturamento} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} width={120} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(v: number) => [fmt(v), 'Faturamento']}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chartFaturamento.map((_, i) => <Cell key={i} fill="hsl(38 90% 55%)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Margem Média por Unidade */}
          {chartMargem.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Margem Média por Unidade</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, chartMargem.length * 50)}>
                <BarChart data={chartMargem} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} width={120} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(v: number) => [fmtPct(v), 'Margem']}
                  />
                  <Bar dataKey="margem" radius={[0, 4, 4, 0]}>
                    {chartMargem.map((_, i) => <Cell key={i} fill="hsl(142 70% 45%)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Famílias de Produto */}
        {chartFamilias.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-card">
            <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Top Famílias de Produto</h3>
            <ResponsiveContainer width="100%" height={Math.max(250, chartFamilias.length * 40)}>
              <BarChart data={chartFamilias} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 11 }} width={150} />
                <Tooltip
                  contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(v: number) => [fmt(v), 'Total']}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {chartFamilias.map((_, i) => <Cell key={i} fill="hsl(210 80% 55%)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Performance por Unidade (commission data) */}
        <div>
          <h3 className="text-sm font-semibold text-secondary-foreground mb-3">Performance por Unidade (Comissão)</h3>
          <div className="hidden md:block">
            <DataTable columns={unidadeColumns} data={unidadeDataWithTotal} rowClassName={(row: any) => row.unidade_nome === 'TOTAL' ? 'font-bold bg-secondary/50' : ''} />
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
            <DataTable columns={rankingColumns} data={filteredRanking} rowClassName={(row: any) => row.posicao != null && row.posicao <= 3 ? 'bg-primary/5' : ''} />
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
      </div>
    </AppShell>
  );
}

// --- Sub-component: Regime Card from vendas ---
function RegimeCardVendas({ data, regime, borderClass }: {
  data: { total: number; lucro: number; vendedores: Set<string>; qtd: number } | undefined;
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
          <p className="text-foreground font-semibold">{fmt(data.total)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Lucro</p>
          <p className="text-foreground font-semibold">{fmt(data.lucro)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Vendedores</p>
          <p className="text-foreground font-semibold">{data.vendedores.size}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Qtd Vendas</p>
          <p className="text-foreground font-semibold">{data.qtd}</p>
        </div>
      </div>
    </div>
  );
}
