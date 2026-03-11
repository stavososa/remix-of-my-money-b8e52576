import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { DataTable } from '@/components/DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { usePeriod } from '@/contexts/PeriodContext';
import { DollarSign, Users, Percent, TrendingUp, Package, X } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  AreaChart, Area, Line,
} from 'recharts';

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));
const fmtPct = (v: number | null | undefined) =>
  v != null ? `${Number(v).toFixed(1)}%` : '—';

function parseBRL(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const s = String(val);
  const cleaned = s.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parsePct(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const s = String(val);
  const cleaned = s.replace('%', '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

const PAGE_SIZE = 1000;

async function fetchVendasByPeriod(ano: number, mes: number) {
  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const lastDay = new Date(ano, mes, 0).getDate();
  const endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const allRows: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('data_emissao', startDate)
      .lte('data_emissao', endDate)
      .order('data_emissao', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

interface ProcessedVenda {
  id: number;
  data_emissao: string;
  mesAno: string;
  dia: number;
  vendedor_nome: string;
  unidade_nome: string;
  familia_produto: string;
  descricao_produto: string;
  marca: string;
  total_com_desconto: number;
  lucros_reais: number;
  margem_percentual: number;
  quantidade: number;
  nota_fiscal: string;
}

export default function Gerencial() {
  const { periodoAno, periodoMes } = usePeriod();
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('all');
  const [filtroFamilia, setFiltroFamilia] = useState<string>('all');
  const [filtroMarca, setFiltroMarca] = useState<string>('all');

  // Fetch ALL vendas with pagination
  const { data: vendasRaw = [], isLoading: loadV } = useQuery({
    queryKey: ['vendas-all'],
    queryFn: fetchAllVendas,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch controle_pj for vendor->unit mapping
  const { data: controlePj = [], isLoading: loadC } = useQuery({
    queryKey: ['controle_pj'],
    queryFn: async () => {
      const { data } = await supabase.from('controle_pj').select('*');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadV || loadC;

  const unidadesConhecidas = useMemo(() => {
    return [...new Set(controlePj.map(cp => cp.unidade).filter(Boolean))] as string[];
  }, [controlePj]);

  const vendedorUnidadeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cp of controlePj) {
      const unidade = cp.unidade ?? 'Sem Unidade';
      if ((cp as any).nome_vendas) map.set(((cp as any).nome_vendas as string).toUpperCase().trim(), unidade);
      if (cp.nome) map.set(cp.nome.toUpperCase().trim(), unidade);
    }
    return map;
  }, [controlePj]);

  const resolveUnidade = (vendedorNome: string): string => {
    const upper = vendedorNome.toUpperCase().trim();
    if (vendedorUnidadeMap.has(upper)) return vendedorUnidadeMap.get(upper)!;
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const normalizedInput = normalize(vendedorNome);
    for (const [key, val] of vendedorUnidadeMap.entries()) {
      if (normalize(key) === normalizedInput) return val;
    }
    for (const [key, val] of vendedorUnidadeMap.entries()) {
      const normKey = normalize(key);
      if (normalizedInput.includes(normKey) || normKey.includes(normalizedInput)) return val;
    }
    for (const unidade of unidadesConhecidas) {
      if (normalizedInput.includes(normalize(unidade))) return unidade;
    }
    return 'Sem Unidade';
  };

  // Process vendas
  const vendasProcessadas: ProcessedVenda[] = useMemo(() => {
    return vendasRaw.map(v => {
      const vendNome = v.vendedor_nome ?? '';
      const unidade = resolveUnidade(vendNome);
      const dataStr = v.data_emissao ?? '';
      let dia = 0;
      let mesAno = 'sem-data';
      if (dataStr) {
        const parts = dataStr.split('-');
        if (parts.length >= 3) {
          dia = parseInt(parts[2], 10);
          mesAno = `${parts[0]}-${parts[1]}`;
        }
      }
      return {
        id: v.id,
        data_emissao: dataStr,
        mesAno,
        dia,
        vendedor_nome: vendNome,
        unidade_nome: unidade,
        familia_produto: v.familia_produto ?? 'Outros',
        descricao_produto: v.descricao_produto ?? '',
        marca: v.marca ?? 'Sem Marca',
        total_com_desconto: parseBRL(v.total_com_desconto),
        lucros_reais: parseBRL(v.lucros_reais),
        margem_percentual: parsePct(v.margem_percentual),
        quantidade: parseBRL(v.quantidade),
        nota_fiscal: v.nota_fiscal ?? '',
      };
    });
  }, [vendasRaw, vendedorUnidadeMap, unidadesConhecidas]);

  // Filter by period first
  const periodoKey = `${periodoAno}-${String(periodoMes).padStart(2, '0')}`;

  const vendasDoPeriodo = useMemo(() => {
    return vendasProcessadas.filter(v => v.mesAno === periodoKey);
  }, [vendasProcessadas, periodoKey]);

  // Filter options from period data
  const filterOptions = useMemo(() => {
    const vendedores = [...new Set(vendasDoPeriodo.map(v => v.vendedor_nome))].filter(Boolean).sort();
    const unidades = [...new Set(vendasDoPeriodo.map(v => v.unidade_nome))].filter(n => n !== 'Sem Unidade').sort();
    const familias = [...new Set(vendasDoPeriodo.map(v => v.familia_produto))].filter(f => f !== 'Outros').sort();
    const marcas = [...new Set(vendasDoPeriodo.map(v => v.marca))].filter(m => m !== 'Sem Marca').sort();
    return { vendedores, unidades, familias, marcas };
  }, [vendasDoPeriodo]);

  // Apply filters on period-filtered data
  const vendasFiltradas = useMemo(() => {
    return vendasDoPeriodo.filter(v => {
      if (filtroUnidade !== 'all' && v.unidade_nome !== filtroUnidade) return false;
      if (filtroVendedor !== 'all' && v.vendedor_nome !== filtroVendedor) return false;
      if (filtroFamilia !== 'all' && v.familia_produto !== filtroFamilia) return false;
      if (filtroMarca !== 'all' && v.marca !== filtroMarca) return false;
      return true;
    });
  }, [vendasDoPeriodo, filtroUnidade, filtroVendedor, filtroFamilia, filtroMarca]);

  // KPIs
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

  // Chart: daily + cumulative revenue
  const chartProgresso = useMemo(() => {
    const map = new Map<string, { fat: number; lucro: number }>();
    for (const v of vendasFiltradas) {
      if (!v.data_emissao) continue;
      const existing = map.get(v.data_emissao) ?? { fat: 0, lucro: 0 };
      existing.fat += v.total_com_desconto;
      existing.lucro += v.lucros_reais;
      map.set(v.data_emissao, existing);
    }
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let acumulado = 0;
    return sorted.map(([data, vals]) => {
      acumulado += vals.fat;
      const parts = data.split('-');
      const label = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : data;
      return {
        data: label,
        faturamentoDia: vals.fat,
        lucroDia: vals.lucro,
        acumulado,
      };
    });
  }, [vendasFiltradas]);

  // Chart: Top Famílias
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

  // Chart: Top Marcas
  const chartMarcas = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vendasFiltradas) {
      if (!v.marca || v.marca === 'Sem Marca') continue;
      map.set(v.marca, (map.get(v.marca) ?? 0) + v.total_com_desconto);
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [vendasFiltradas]);

  // Active filters for chips
  const activeFilters = [
    ...(filtroUnidade !== 'all' ? [{ label: `Unidade: ${filtroUnidade}`, clear: () => setFiltroUnidade('all') }] : []),
    ...(filtroVendedor !== 'all' ? [{ label: `Vendedor: ${filtroVendedor}`, clear: () => setFiltroVendedor('all') }] : []),
    ...(filtroFamilia !== 'all' ? [{ label: `Família: ${filtroFamilia}`, clear: () => setFiltroFamilia('all') }] : []),
    ...(filtroMarca !== 'all' ? [{ label: `Marca: ${filtroMarca}`, clear: () => setFiltroMarca('all') }] : []),
  ];

  const clearAllFilters = () => {
    setFiltroUnidade('all');
    setFiltroVendedor('all');
    setFiltroFamilia('all');
    setFiltroMarca('all');
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
          <KPICard icon={TrendingUp} label="Lucro Total" value={fmt(kpis.lucroTotal)} />
          <KPICard icon={Percent} label="Margem Média" value={fmtPct(kpis.margemMedia)} />
          <KPICard icon={Users} label="Vendedores" value={String(kpis.vendedoresUnicos)} />
          <KPICard icon={Package} label="Qtd Vendas" value={String(kpis.qtdVendas)} />
        </div>

        {/* Filters inline */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Unidade" value={filtroUnidade} onChange={setFiltroUnidade} options={filterOptions.unidades.map(u => ({ value: u, label: u }))} allLabel="Todas as Unidades" />
          <FilterSelect label="Vendedor" value={filtroVendedor} onChange={setFiltroVendedor} options={filterOptions.vendedores.map(v => ({ value: v, label: v }))} allLabel="Todos os Vendedores" />
          <FilterSelect label="Família" value={filtroFamilia} onChange={setFiltroFamilia} options={filterOptions.familias.map(f => ({ value: f, label: f }))} allLabel="Todas as Famílias" />
          <FilterSelect label="Marca" value={filtroMarca} onChange={setFiltroMarca} options={filterOptions.marcas.map(m => ({ value: m, label: m }))} allLabel="Todas as Marcas" />
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
        {chartProgresso.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-secondary-foreground">Progresso de Faturamento</h3>
              <span className="text-xs text-muted-foreground">{vendasFiltradas.length} de {vendasDoPeriodo.length} vendas</span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartProgresso} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
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
                    {chartFamilias.map((_, i) => <Cell key={i} fill="hsl(210 80% 55%)" />)}
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
                    {chartMarcas.map((_, i) => <Cell key={i} fill="hsl(280 70% 55%)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Sales Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-secondary-foreground">Vendas Detalhadas ({vendasFiltradas.length} registros)</h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border">
            <DataTable columns={detailColumns} data={vendasFiltradas} />
          </div>
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
