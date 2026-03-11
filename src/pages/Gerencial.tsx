import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { DataTable } from '@/components/DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Users, Percent, TrendingUp, Package, X, Calendar, Filter } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));
const fmtPct = (v: number | null | undefined) =>
  v != null ? `${Number(v).toFixed(1)}%` : '—';

function parseBRL(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parsePct(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace('%', '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface ProcessedVenda {
  id: number;
  data_emissao: string;
  mesAno: string; // "YYYY-MM"
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
  const [filtroMesAno, setFiltroMesAno] = useState<string>('');
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroDia, setFiltroDia] = useState<string>('all');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('all');
  const [filtroProduto, setFiltroProduto] = useState<string>('all');
  const [filtroFamilia, setFiltroFamilia] = useState<string>('all');
  const [filtroMarca, setFiltroMarca] = useState<string>('all');

  // Fetch ALL vendas (no date filter)
  const { data: vendasRaw = [], isLoading: loadV } = useQuery({
    queryKey: ['vendas-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas').select('*')
        .order('data_emissao', { ascending: false })
        .limit(5000);
      return data ?? [];
    },
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  // Fetch controle_pj for vendor->unit mapping
  const { data: controlePj = [], isLoading: loadC } = useQuery({
    queryKey: ['controle_pj'],
    queryFn: async () => {
      const { data } = await supabase.from('controle_pj').select('*');
      return data ?? [];
    },
    staleTime: 0,
  });

  const isLoading = loadV || loadC;

  // Known unit names for fallback extraction from vendedor_nome
  const unidadesConhecidas = useMemo(() => {
    return [...new Set(controlePj.map(cp => cp.unidade).filter(Boolean))] as string[];
  }, [controlePj]);

  // Build vendor -> unit map from controle_pj (case-insensitive, multiple strategies)
  const vendedorUnidadeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cp of controlePj) {
      const unidade = cp.unidade ?? 'Sem Unidade';
      // Strategy 1: exact nome_vendas match
      if ((cp as any).nome_vendas) map.set(((cp as any).nome_vendas as string).toUpperCase().trim(), unidade);
      // Strategy 2: exact nome match
      if (cp.nome) map.set(cp.nome.toUpperCase().trim(), unidade);
    }
    return map;
  }, [controlePj]);

  // Enhanced vendor->unit lookup with partial matching and fallback
  const resolveUnidade = (vendedorNome: string): string => {
    const upper = vendedorNome.toUpperCase().trim();
    // 1. Exact match
    if (vendedorUnidadeMap.has(upper)) return vendedorUnidadeMap.get(upper)!;
    // 2. Normalize accents and try again
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const normalizedInput = normalize(vendedorNome);
    for (const [key, val] of vendedorUnidadeMap.entries()) {
      if (normalize(key) === normalizedInput) return val;
    }
    // 3. Partial match: check if vendor name contains a known controle_pj name
    for (const [key, val] of vendedorUnidadeMap.entries()) {
      const normKey = normalize(key);
      if (normalizedInput.includes(normKey) || normKey.includes(normalizedInput)) return val;
    }
    // 4. Fallback: extract known unit name from vendedor_nome (e.g., "CHECKOUT FREGUESIA" -> FREGUESIA)
    for (const unidade of unidadesConhecidas) {
      if (normalizedInput.includes(normalize(unidade))) return unidade;
    }
    return 'Sem Unidade';
  };

  // Process vendas
  const vendasProcessadas: ProcessedVenda[] = useMemo(() => {
    return vendasRaw.map(v => {
      const vendNome = (v.vendedor_nome ?? '').toUpperCase();
      const unidade = vendedorUnidadeMap.get(vendNome) ?? 'Sem Unidade';
      const dataStr = v.data_emissao ?? '';
      let dia = 0;
      let mesAno = '';
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
        vendedor_nome: v.vendedor_nome ?? '',
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
  }, [vendasRaw, vendedorUnidadeMap]);

  // Available months
  const mesesDisponiveis = useMemo(() => {
    const set = new Set(vendasProcessadas.map(v => v.mesAno).filter(Boolean));
    return [...set].sort().reverse();
  }, [vendasProcessadas]);

  // Auto-select first available month
  const mesAnoSelecionado = filtroMesAno && mesesDisponiveis.includes(filtroMesAno) ? filtroMesAno : mesesDisponiveis[0] ?? '';

  // Vendas filtered by month first
  const vendasDoMes = useMemo(() => {
    if (!mesAnoSelecionado) return vendasProcessadas;
    return vendasProcessadas.filter(v => v.mesAno === mesAnoSelecionado);
  }, [vendasProcessadas, mesAnoSelecionado]);

  // Unique filter values (based on selected month)
  const filterOptions = useMemo(() => {
    const dias = [...new Set(vendasDoMes.map(v => v.dia))].filter(d => d > 0).sort((a, b) => a - b);
    const vendedores = [...new Set(vendasDoMes.map(v => v.vendedor_nome))].filter(Boolean).sort();
    const unidades = [...new Set(vendasDoMes.map(v => v.unidade_nome))].filter(n => n !== 'Sem Unidade').sort();
    const familias = [...new Set(vendasDoMes.map(v => v.familia_produto))].filter(f => f !== 'Outros').sort();
    const marcas = [...new Set(vendasDoMes.map(v => v.marca))].filter(m => m !== 'Sem Marca').sort();
    const produtos = [...new Set(vendasDoMes.map(v => v.descricao_produto))].filter(Boolean).sort();
    return { dias, vendedores, unidades, familias, marcas, produtos };
  }, [vendasDoMes]);

  // Apply all filters (on top of month-filtered data)
  const vendasFiltradas = useMemo(() => {
    return vendasDoMes.filter(v => {
      if (filtroUnidade !== 'all' && v.unidade_nome !== filtroUnidade) return false;
      if (filtroDia !== 'all' && v.dia !== Number(filtroDia)) return false;
      if (filtroVendedor !== 'all' && v.vendedor_nome !== filtroVendedor) return false;
      if (filtroProduto !== 'all' && v.descricao_produto !== filtroProduto) return false;
      if (filtroFamilia !== 'all' && v.familia_produto !== filtroFamilia) return false;
      if (filtroMarca !== 'all' && v.marca !== filtroMarca) return false;
      return true;
    });
  }, [vendasDoMes, filtroUnidade, filtroDia, filtroVendedor, filtroProduto, filtroFamilia, filtroMarca]);

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

  // Aggregate by unidade
  const dadosPorUnidade = useMemo(() => {
    const map = new Map<string, { total: number; lucro: number; margemPeso: number; peso: number; qtd: number }>();
    for (const v of vendasFiltradas) {
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
      .map(([name, d]) => ({ name, total: d.total, lucro: d.lucro, margem: d.peso > 0 ? d.margemPeso / d.peso : 0, qtd: d.qtd }))
      .sort((a, b) => b.total - a.total);
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
    ...(filtroDia !== 'all' ? [{ label: `Dia: ${filtroDia}`, clear: () => setFiltroDia('all') }] : []),
    ...(filtroUnidade !== 'all' ? [{ label: `Unidade: ${filtroUnidade}`, clear: () => setFiltroUnidade('all') }] : []),
    ...(filtroVendedor !== 'all' ? [{ label: `Vendedor: ${filtroVendedor}`, clear: () => setFiltroVendedor('all') }] : []),
    ...(filtroFamilia !== 'all' ? [{ label: `Família: ${filtroFamilia}`, clear: () => setFiltroFamilia('all') }] : []),
    ...(filtroMarca !== 'all' ? [{ label: `Marca: ${filtroMarca}`, clear: () => setFiltroMarca('all') }] : []),
    ...(filtroProduto !== 'all' ? [{ label: `Produto: ${filtroProduto.substring(0, 30)}...`, clear: () => setFiltroProduto('all') }] : []),
  ];

  const clearAllFilters = () => {
    setFiltroUnidade('all');
    setFiltroDia('all');
    setFiltroVendedor('all');
    setFiltroProduto('all');
    setFiltroFamilia('all');
    setFiltroMarca('all');
  };

  const handleMesChange = (v: string) => {
    setFiltroMesAno(v);
    clearAllFilters();
  };

  const formatMesAno = (mesAno: string) => {
    const [year, month] = mesAno.split('-');
    const idx = parseInt(month, 10) - 1;
    return `${MONTH_NAMES[idx] ?? month}/${year}`;
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

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-secondary-foreground">Filtros</span>
            {activeFilters.length > 0 && (
              <button onClick={clearAllFilters} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                Limpar todos
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Mês" value={mesAnoSelecionado} onChange={handleMesChange} options={mesesDisponiveis.map(m => ({ value: m, label: formatMesAno(m) }))} allLabel="" hideAll />
            <FilterSelect label="Dia" value={filtroDia} onChange={setFiltroDia} options={filterOptions.dias.map(d => ({ value: String(d), label: String(d) }))} allLabel="Todos os Dias" />
            <FilterSelect label="Unidade" value={filtroUnidade} onChange={setFiltroUnidade} options={filterOptions.unidades.map(u => ({ value: u, label: u }))} allLabel="Todas as Unidades" />
            <FilterSelect label="Vendedor" value={filtroVendedor} onChange={setFiltroVendedor} options={filterOptions.vendedores.map(v => ({ value: v, label: v }))} allLabel="Todos os Vendedores" />
            <FilterSelect label="Família" value={filtroFamilia} onChange={setFiltroFamilia} options={filterOptions.familias.map(f => ({ value: f, label: f }))} allLabel="Todas as Famílias" />
            <FilterSelect label="Marca" value={filtroMarca} onChange={setFiltroMarca} options={filterOptions.marcas.map(m => ({ value: m, label: m }))} allLabel="Todas as Marcas" />
            <FilterSelect label="Produto" value={filtroProduto} onChange={setFiltroProduto} options={filterOptions.produtos.map(p => ({ value: p, label: p.length > 40 ? p.substring(0, 40) + '…' : p }))} allLabel="Todos os Produtos" />
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeFilters.map(f => (
                <button key={f.label} onClick={f.clear} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                  {f.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Unidades que Mais Venderam */}
        {dadosPorUnidade.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-secondary-foreground">Unidades que Mais Venderam</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {dadosPorUnidade.map((u, i) => {
                const pos = i + 1;
                const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
                const borderColor = pos === 1 ? 'border-yellow-500' : pos === 2 ? 'border-gray-400' : pos === 3 ? 'border-amber-700' : 'border-border';
                const bgHighlight = pos <= 3 ? 'bg-primary/5' : '';
                return (
                  <div key={u.name} className={`bg-card border-2 ${borderColor} ${bgHighlight} rounded-lg p-4 shadow-card transition-transform hover:scale-[1.02]`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">{medalha ?? `${pos}º`}</span>
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
          {dadosPorUnidade.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Faturamento por Unidade</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, dadosPorUnidade.length * 50)}>
                <BarChart data={dadosPorUnidade} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={120} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(v: number) => [fmt(v), 'Faturamento']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {dadosPorUnidade.map((_, i) => <Cell key={i} fill="hsl(var(--primary))" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Margem Média por Unidade */}
          {dadosPorUnidade.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-card">
              <h3 className="text-sm font-semibold text-secondary-foreground mb-4">Margem Média por Unidade</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, dadosPorUnidade.length * 50)}>
                <BarChart data={dadosPorUnidade.map(d => ({ name: d.name, margem: d.margem })).sort((a, b) => b.margem - a.margem)} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={120} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(v: number) => [fmtPct(v), 'Margem']} />
                  <Bar dataKey="margem" radius={[0, 4, 4, 0]}>
                    {dadosPorUnidade.map((_, i) => <Cell key={i} fill="hsl(142 70% 45%)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

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
          <DataTable columns={detailColumns} data={vendasFiltradas} />
        </div>
      </div>
    </AppShell>
  );
}

// --- Filter Select Sub-component ---
function FilterSelect({ label, value, onChange, options, allLabel, hideAll }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  hideAll?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-[140px] max-w-[220px]"
      title={label}
    >
      {!hideAll && <option value="all">{allLabel}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
