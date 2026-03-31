import { useState, useCallback, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { DataTable } from '@/components/DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { usePeriod } from '@/contexts/PeriodContext';
import { X, Search, DollarSign, TrendingUp, Percent, ShoppingCart, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const parseMoneyBR = (str: unknown): number => {
  if (str == null) return 0;
  if (typeof str === 'number') return str;
  const s = String(str);
  const cleaned = s.replace(/[R$\s.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

const parsePctBR = (str: unknown): number => {
  if (str == null) return 0;
  if (typeof str === 'number') return str * 100;
  const s = String(str);
  const cleaned = s.replace('%', '').replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val * 100;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

const TABLE_PAGE_SIZE = 30;

interface TooltipEntry {
  color: string;
  name: string;
  value: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-semibold">{typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.name === 'Margem' ? fmtPct(p.value as number) : fmt(p.value as number)}</span>
        </p>
      ))}
    </div>
  );
};

export default function Gerencial() {
  const isMobile = useIsMobile();
  const { periodoAno, periodoMes, dataInicio, dataFim } = usePeriod();
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('all');
  const [filtroFamilia, setFiltroFamilia] = useState<string>('all');
  const [filtroMarca, setFiltroMarca] = useState<string>('all');
  const [buscaTabela, setBuscaTabela] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [tabelaPagina, setTabelaPagina] = useState(1);

  useEffect(() => {
    setFiltroUnidade('all');
    setFiltroVendedor('all');
    setFiltroFamilia('all');
    setFiltroMarca('all');
    setBuscaTabela('');
    setSearchDebounced('');
    setTabelaPagina(1);
  }, [periodoAno, periodoMes]);

  const searchTimer = useCallback((val: string) => {
    setBuscaTabela(val);
    const id = setTimeout(() => {
      setSearchDebounced(val);
      setTabelaPagina(1);
    }, 400);
    return () => clearTimeout(id);
  }, []);

  const startDate = dataInicio;
  const endDate = dataFim;

  // ===== controle_pj (vendedor_nome → unidade) for filial mapping =====
  const { data: controlePjFilial, isLoading: loadPj } = useQuery({
    queryKey: ['controle-pj-filial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controle_pj')
        .select('nome_vendas, unidade');
      if (error) throw error;
      return (data ?? []) as { nome_vendas: string | null; unidade: string | null }[];
    },
    staleTime: Infinity,
  });

  const vendedorFilialMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!controlePjFilial) return map;
    for (const row of controlePjFilial) {
      if (row.nome_vendas && row.unidade) map.set(row.nome_vendas.trim().toUpperCase(), row.unidade);
    }
    return map;
  }, [controlePjFilial]);

  const getFilial = useCallback((vendedorNome: string | null | undefined): string => {
    if (!vendedorNome) return 'Sem Filial';
    return vendedorFilialMap.get(vendedorNome.trim().toUpperCase()) ?? 'Sem Filial';
  }, [vendedorFilialMap]);

  // ===== FULL PERIOD DATA (for KPIs & charts) =====
  const { data: allVendas, isLoading: loadAll, isFetching: fetchingAll } = useQuery({
    queryKey: ['gerencial-all-vendas', startDate, endDate],
    queryFn: async () => {
      type VendaRow = {
        data_emissao: string | null;
        vendedor_nome: string | null;
        total_com_desconto: unknown;
        lucros_reais: unknown;
        margem_percentual: unknown;
        familia_produto: string | null;
        marca: string | null;
        nota_fiscal: string | null;
        cnpj_empresa: string | null;
      };
      const { count, error: countErr } = await supabase
        .from('vendas')
        .select('*', { count: 'exact', head: true })
        .gte('data_emissao', startDate)
        .lte('data_emissao', endDate);

      if (countErr) throw countErr;
      if (!count || count === 0) return [];

      const step = 1000;
      const totalPages = Math.ceil(count / step);
      const promises = [];

      for (let i = 0; i < totalPages; i++) {
        const from = i * step;
        promises.push(
          supabase
            .from('vendas')
            .select('data_emissao, vendedor_nome, total_com_desconto, lucros_reais, margem_percentual, familia_produto, marca, nota_fiscal, cnpj_empresa')
            .gte('data_emissao', startDate)
            .lte('data_emissao', endDate)
            .range(from, from + step - 1)
        );
      }

      const results = await Promise.all(promises);
      let allData: VendaRow[] = [];
      for (const res of results) {
        if (res.error) throw res.error;
        if (res.data) allData = allData.concat(res.data as VendaRow[]);
      }
      return allData;
    },
    staleTime: Infinity,
  });

  // Apply client-side filters
  const filteredAll = useMemo(() => {
    if (!allVendas) return [];
    return allVendas.filter(row => {
      if (filtroUnidade !== 'all' && getFilial(row.vendedor_nome) !== filtroUnidade) return false;
      if (filtroVendedor !== 'all' && row.vendedor_nome !== filtroVendedor) return false;
      if (filtroFamilia !== 'all' && row.familia_produto !== filtroFamilia) return false;
      if (filtroMarca !== 'all' && row.marca !== filtroMarca) return false;
      return true;
    });
  }, [allVendas, filtroUnidade, filtroVendedor, filtroFamilia, filtroMarca, getFilial]);

  // ===== KPIs =====
  const kpis = useMemo(() => {
    let totalFat = 0, totalLucro = 0, somaMargemPond = 0, count = 0;
    for (const row of filteredAll) {
      const fat = parseMoneyBR(row.total_com_desconto);
      const lucro = parseMoneyBR(row.lucros_reais);
      const margem = parsePctBR(row.margem_percentual);
      totalFat += fat;
      totalLucro += lucro;
      somaMargemPond += margem * fat;
      count++;
    }
    const margemMedia = totalFat > 0 ? somaMargemPond / totalFat : 0;
    return { totalFat, totalLucro, margemMedia, count };
  }, [filteredAll]);

  // ===== KPI: Notas Fiscais (distinct nota_fiscal) =====
  const totalNotas = useMemo(() => {
    const set = new Set<string>();
    for (const row of filteredAll) {
      if (row.nota_fiscal && row.nota_fiscal.trim() !== '') {
        set.add(row.nota_fiscal.trim());
      }
    }
    return set.size;
  }, [filteredAll]);

  const isBusy = loadAll || fetchingAll || loadPj;

  // ===== Chart: Faturamento por Dia =====
  const chartDiario = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const row of filteredAll) {
      const day = row.data_emissao ?? '';
      dayMap.set(day, (dayMap.get(day) ?? 0) + parseMoneyBR(row.total_com_desconto));
    }
    const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let acum = 0;
    return sorted.map(([day, val]) => {
      acum += val;
      return { dia: day.substring(8), faturamento: val, acumulado: acum };
    });
  }, [filteredAll]);

  // Filter options from allVendas
  const filterOptions = useMemo(() => {
    if (!allVendas) return { vendedores: [], unidades: [], familias: [], marcas: [] };
    const vendedores = new Set<string>();
    const familias = new Set<string>();
    const marcas = new Set<string>();
    const unidades = new Set<string>();
    for (const row of allVendas) {
      if (row.vendedor_nome) vendedores.add(row.vendedor_nome);
      if (row.familia_produto && row.familia_produto !== 'Outros') familias.add(row.familia_produto);
      if (row.marca && row.marca !== 'Sem Marca') marcas.add(row.marca);
      const uni = getFilial(row.vendedor_nome);
      if (uni !== 'Sem Filial') unidades.add(uni);
    }
    return {
      vendedores: [...vendedores].sort(),
      familias: [...familias].sort(),
      marcas: [...marcas].sort(),
      unidades: [...unidades].sort(),
    };
  }, [allVendas, getFilial]);

  // Get vendedor names for a given filial (for server-side filtering)
  const getVendedoresByFilial = useCallback((filial: string): string[] => {
    if (!allVendas) return [];
    const names = new Set<string>();
    for (const row of allVendas) {
      if (row.vendedor_nome && getFilial(row.vendedor_nome) === filial) {
        names.add(row.vendedor_nome);
      }
    }
    return [...names];
  }, [allVendas, getFilial]);

  // Fetch paginated vendas for table
  const { data: vendasResult, isLoading: loadVendas } = useQuery({
    queryKey: ['gerencial-vendas', startDate, endDate, filtroUnidade, filtroVendedor, filtroFamilia, filtroMarca, searchDebounced, tabelaPagina],
    queryFn: async () => {
      const offset = (tabelaPagina - 1) * TABLE_PAGE_SIZE;
      let query = supabase
        .from('vendas')
        .select('id, data_emissao, vendedor_nome, descricao_produto, familia_produto, marca, nota_fiscal, total_com_desconto, lucros_reais, margem_percentual, cnpj_empresa', { count: 'exact' })
        .gte('data_emissao', startDate)
        .lte('data_emissao', endDate)
        .order('data_emissao', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + TABLE_PAGE_SIZE - 1);

      if (filtroUnidade !== 'all') {
        const nomes = getVendedoresByFilial(filtroUnidade);
        if (nomes.length > 0) {
          query = query.in('vendedor_nome', nomes);
        } else {
          return { rows: [], totalCount: 0 };
        }
      }
      if (filtroVendedor !== 'all') query = query.eq('vendedor_nome', filtroVendedor);
      if (filtroFamilia !== 'all') query = query.eq('familia_produto', filtroFamilia);
      if (filtroMarca !== 'all') query = query.eq('marca', filtroMarca);

      if (searchDebounced) {
        const term = `%${searchDebounced}%`;
        query = query.or(
          `vendedor_nome.ilike.${term},descricao_produto.ilike.${term},familia_produto.ilike.${term},marca.ilike.${term},nota_fiscal.ilike.${term}`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], totalCount: count ?? 0 };
    },
    staleTime: Infinity,
  });

  const vendasRows = vendasResult?.rows ?? [];
  const vendasTotalCount = vendasResult?.totalCount ?? 0;

  const mappedRows = useMemo(() => {
    return vendasRows.map(row => ({
      ...row,
      unidade_nome: getFilial(row.vendedor_nome),
      total_parsed: parseMoneyBR(row.total_com_desconto),
      lucro_parsed: parseMoneyBR(row.lucros_reais),
      margem_parsed: parsePctBR(row.margem_percentual),
    }));
  }, [vendasRows, getFilial]);

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setTabelaPagina(1);
  };

  const activeFilters = [
    ...(filtroUnidade !== 'all' ? [{ label: `Filial: ${filtroUnidade}`, clear: () => { setFiltroUnidade('all'); setTabelaPagina(1); } }] : []),
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

  const [selectedVenda, setSelectedVenda] = useState<any>(null);

  const detailColumns = [
    { key: 'data_emissao' as const, label: 'Data', render: (v: string) => v ? v.split('-').reverse().join('/') : '—' },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'unidade_nome' as const, label: 'Filial' },
    { key: 'descricao_produto' as const, label: 'Produto' },
    { key: 'familia_produto' as const, label: 'Família' },
    { key: 'marca' as const, label: 'Marca' },
    { key: 'nota_fiscal' as const, label: 'NF' },
    { key: 'total_parsed' as const, label: 'Valor', align: 'right' as const, render: (v: number) => fmt(v) },
    { key: 'lucro_parsed' as const, label: 'Lucro', align: 'right' as const, render: (v: number) => fmt(v) },
    { key: 'margem_parsed' as const, label: 'Margem', align: 'right' as const, render: (v: number) => fmtPct(v) },
  ];

  const detailColumnsMobile = [
    { key: 'data_emissao' as const, label: 'Data', render: (v: string) => v ? v.split('-').reverse().join('/') : '—' },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'descricao_produto' as const, label: 'Produto' },
  ];
  const filtros = filterOptions;

  return (
    <AppShell title="Gerencial">
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Painel Gerencial</h1>
          <p className="text-sm text-muted-foreground mt-1">Filtre resultados específicos por loja, vendedor e identifique tendências reais.</p>
        </div>
        {/* Filters */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-3">
          <FilterSelect label="Filial" value={filtroUnidade} onChange={handleFilterChange(setFiltroUnidade)} options={filtros.unidades.map(u => ({ value: u, label: u }))} allLabel="Todas as Filiais" />
          <FilterSelect label="Vendedor" value={filtroVendedor} onChange={handleFilterChange(setFiltroVendedor)} options={filtros.vendedores.map(v => ({ value: v, label: v }))} allLabel="Todos os Vendedores" />
          <FilterSelect label="Família" value={filtroFamilia} onChange={handleFilterChange(setFiltroFamilia)} options={filtros.familias.map(f => ({ value: f, label: f }))} allLabel="Todas as Famílias" />
          <FilterSelect label="Marca" value={filtroMarca} onChange={handleFilterChange(setFiltroMarca)} options={filtros.marcas.map(m => ({ value: m, label: m }))} allLabel="Todas as Marcas" />
          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
              Limpar filtros
            </button>
          )}
        </div>

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

        {/* KPIs */}
        <div className={isMobile ? "flex items-center justify-center gap-3" : "grid grid-cols-5 gap-4"}>
          <KPICard compact={isMobile} icon={DollarSign} label="Faturamento" value={isBusy ? '—' : fmt(kpis.totalFat)} accentColor="hsl(38 90% 55%)" />
          <KPICard compact={isMobile} icon={TrendingUp} label="Lucro" value={isBusy ? '—' : fmt(kpis.totalLucro)} accentColor="hsl(142 71% 45%)" />
          <KPICard compact={isMobile} icon={Percent} label="Margem Média" value={isBusy ? '—' : fmtPct(kpis.margemMedia)} accentColor="hsl(200 80% 50%)" />
          <KPICard compact={isMobile} icon={ShoppingCart} label="Vendas" value={isBusy ? '—' : kpis.count.toLocaleString('pt-BR')} accentColor="hsl(280 60% 55%)" />
          <KPICard compact={isMobile} icon={FileText} label="Notas Fiscais" value={isBusy ? '—' : totalNotas.toLocaleString('pt-BR')} accentColor="hsl(350 75% 55%)" />
        </div>

        {/* Chart: Faturamento por Dia (full width) */}
        <Card className="border-border relative">
          {isBusy && (
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Faturamento por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDiario}>
                  <defs>
                    <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38 90% 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38 90% 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(200 80% 50%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(200 80% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 20%)" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'hsl(215 15% 55%)' }} />
                  <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="faturamento" name="Diário" stroke="hsl(38 90% 55%)" fill="url(#gradFat)" strokeWidth={2} />
                  <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="hsl(200 80% 50%)" fill="url(#gradAcum)" strokeWidth={2} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2 sm:gap-3">
            <h3 className="text-sm font-semibold text-secondary-foreground whitespace-nowrap">
              Vendas Detalhadas ({vendasTotalCount} registros)
              {(loadVendas || loadAll) && <span className="ml-2 text-xs text-muted-foreground">(carregando...)</span>}
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
            columns={isMobile ? detailColumnsMobile : detailColumns}
            data={mappedRows}
            pageSize={TABLE_PAGE_SIZE}
            maxHeight="500px"
            onRowClick={isMobile ? (row) => setSelectedVenda(row) : undefined}
            serverPagination={{
              totalCount: vendasTotalCount,
              currentPage: tabelaPagina,
              onPageChange: setTabelaPagina,
            }}
          />
        </div>

        {/* Mobile detail dialog */}
        <Dialog open={!!selectedVenda} onOpenChange={(open) => !open && setSelectedVenda(null)}>
          <DialogContent className="max-w-[340px] rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">Detalhes da Venda</DialogTitle>
            </DialogHeader>
            {selectedVenda && (
              <div className="space-y-2 text-xs">
                {detailColumns.map(col => (
                  <div key={String(col.key)} className="flex justify-between gap-2 py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground font-medium">{col.label}</span>
                    <span className="text-foreground text-right font-semibold">
                      {col.render ? (col.render as any)(selectedVenda[col.key], selectedVenda) : String(selectedVenda[col.key] ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

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
      className="bg-secondary border border-border rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-auto sm:min-w-[140px] sm:max-w-[220px]"
      title={label}
    >
      <option value="all">{allLabel}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
