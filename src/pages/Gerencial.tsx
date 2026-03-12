import { useState, useCallback, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { usePeriod } from '@/contexts/PeriodContext';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  if (typeof str === 'number') return str;
  const s = String(str);
  const cleaned = s.replace('%', '').replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const TABLE_PAGE_SIZE = 30;

export default function Gerencial() {
  const { periodoAno, periodoMes } = usePeriod();
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('all');
  const [filtroFamilia, setFiltroFamilia] = useState<string>('all');
  const [filtroMarca, setFiltroMarca] = useState<string>('all');
  const [buscaTabela, setBuscaTabela] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [tabelaPagina, setTabelaPagina] = useState(1);

  const searchTimer = useCallback((val: string) => {
    setBuscaTabela(val);
    const id = setTimeout(() => {
      setSearchDebounced(val);
      setTabelaPagina(1);
    }, 400);
    return () => clearTimeout(id);
  }, []);

  // Date range for the period
  const startDate = `${periodoAno}-${String(periodoMes).padStart(2, '0')}-01`;
  const endDay = new Date(periodoAno, periodoMes, 0).getDate();
  const endDate = `${periodoAno}-${String(periodoMes).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  // Fetch controle_pj for unidade mapping
  const { data: controlePj } = useQuery({
    queryKey: ['controle-pj'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controle_pj')
        .select('nome, nome_vendas, unidade');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build vendedor→unidade map
  const vendedorUnidadeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!controlePj) return map;
    for (const cp of controlePj) {
      const key = (cp.nome_vendas ?? cp.nome).toUpperCase().trim();
      if (cp.unidade) map.set(key, cp.unidade);
    }
    return map;
  }, [controlePj]);

  // Get vendedores for selected unidade
  const vendedoresUnidade = useMemo(() => {
    if (filtroUnidade === 'all') return null;
    const names: string[] = [];
    if (!controlePj) return names;
    for (const cp of controlePj) {
      if (cp.unidade === filtroUnidade) {
        names.push((cp.nome_vendas ?? cp.nome).toUpperCase().trim());
      }
    }
    return names;
  }, [filtroUnidade, controlePj]);

  // Fetch filter options (distinct values for the period)
  const { data: filterOptions } = useQuery({
    queryKey: ['gerencial-filters', periodoAno, periodoMes],
    queryFn: async () => {
      // Fetch all vendedor_nome, familia_produto, marca for the period
      let query = supabase
        .from('vendas')
        .select('vendedor_nome, familia_produto, marca')
        .gte('data_emissao', startDate)
        .lte('data_emissao', endDate);

      // Fetch up to 10000 rows for distinct values
      const { data, error } = await query.limit(10000);
      if (error) throw error;

      const vendedores = new Set<string>();
      const familias = new Set<string>();
      const marcas = new Set<string>();

      for (const row of data ?? []) {
        if (row.vendedor_nome) vendedores.add(row.vendedor_nome);
        if (row.familia_produto && row.familia_produto !== 'Outros') familias.add(row.familia_produto);
        if (row.marca && row.marca !== 'Sem Marca') marcas.add(row.marca);
      }

      const unidades = new Set<string>();
      if (controlePj) {
        for (const cp of controlePj) {
          if (cp.unidade) unidades.add(cp.unidade);
        }
      }

      return {
        vendedores: [...vendedores].sort(),
        familias: [...familias].sort(),
        marcas: [...marcas].sort(),
        unidades: [...unidades].sort(),
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!controlePj,
  });

  // Fetch paginated vendas
  const { data: vendasResult, isLoading: loadVendas } = useQuery({
    queryKey: ['gerencial-vendas', periodoAno, periodoMes, filtroUnidade, filtroVendedor, filtroFamilia, filtroMarca, searchDebounced, tabelaPagina],
    queryFn: async () => {
      const offset = (tabelaPagina - 1) * TABLE_PAGE_SIZE;

      let query = supabase
        .from('vendas')
        .select('id, data_emissao, vendedor_nome, descricao_produto, familia_produto, marca, nota_fiscal, total_com_desconto, lucros_reais, margem_percentual', { count: 'exact' })
        .gte('data_emissao', startDate)
        .lte('data_emissao', endDate)
        .order('data_emissao', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + TABLE_PAGE_SIZE - 1);

      // Apply filters
      if (filtroVendedor !== 'all') {
        query = query.eq('vendedor_nome', filtroVendedor);
      }
      if (filtroFamilia !== 'all') {
        query = query.eq('familia_produto', filtroFamilia);
      }
      if (filtroMarca !== 'all') {
        query = query.eq('marca', filtroMarca);
      }

      // Unidade filter: filter by vendedor names that belong to that unidade
      if (vendedoresUnidade && vendedoresUnidade.length > 0) {
        // We need to match case-insensitively. Since vendedor_nome in vendas may differ in case,
        // we'll use the original names from controle_pj
        const namesForFilter = controlePj
          ?.filter(cp => cp.unidade === filtroUnidade)
          .map(cp => cp.nome_vendas ?? cp.nome) ?? [];
        if (namesForFilter.length > 0) {
          query = query.in('vendedor_nome', namesForFilter);
        }
      }

      // Text search
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
    staleTime: 60 * 1000,
    enabled: !!controlePj,
  });

  const vendasRows = vendasResult?.rows ?? [];
  const vendasTotalCount = vendasResult?.totalCount ?? 0;

  // Map rows to include unidade and parsed values
  const mappedRows = useMemo(() => {
    return vendasRows.map(row => {
      const vendedorKey = (row.vendedor_nome ?? '').toUpperCase().trim();
      return {
        ...row,
        unidade_nome: vendedorUnidadeMap.get(vendedorKey) ?? 'Sem Unidade',
        total_parsed: parseMoneyBR(row.total_com_desconto),
        lucro_parsed: parseMoneyBR(row.lucros_reais),
        margem_parsed: parsePctBR(row.margem_percentual),
      };
    });
  }, [vendasRows, vendedorUnidadeMap]);

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setTabelaPagina(1);
  };

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

  const detailColumns = [
    { key: 'data_emissao' as const, label: 'Data', render: (v: string) => v ? v.split('-').reverse().join('/') : '—' },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'unidade_nome' as const, label: 'Unidade' },
    { key: 'descricao_produto' as const, label: 'Produto' },
    { key: 'familia_produto' as const, label: 'Família' },
    { key: 'marca' as const, label: 'Marca' },
    { key: 'total_parsed' as const, label: 'Valor', align: 'right' as const, render: (v: number) => fmt(v) },
    { key: 'lucro_parsed' as const, label: 'Lucro', align: 'right' as const, render: (v: number) => fmt(v) },
    { key: 'margem_parsed' as const, label: 'Margem', align: 'right' as const, render: (v: number) => fmtPct(v) },
  ];

  const filtros = filterOptions ?? { vendedores: [], unidades: [], familias: [], marcas: [] };

  return (
    <AppShell title="Gerencial">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Unidade" value={filtroUnidade} onChange={handleFilterChange(setFiltroUnidade)} options={filtros.unidades.map(u => ({ value: u, label: u }))} allLabel="Todas as Unidades" />
          <FilterSelect label="Vendedor" value={filtroVendedor} onChange={handleFilterChange(setFiltroVendedor)} options={filtros.vendedores.map(v => ({ value: v, label: v }))} allLabel="Todos os Vendedores" />
          <FilterSelect label="Família" value={filtroFamilia} onChange={handleFilterChange(setFiltroFamilia)} options={filtros.familias.map(f => ({ value: f, label: f }))} allLabel="Todas as Famílias" />
          <FilterSelect label="Marca" value={filtroMarca} onChange={handleFilterChange(setFiltroMarca)} options={filtros.marcas.map(m => ({ value: m, label: m }))} allLabel="Todas as Marcas" />
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

        {/* Sales Table */}
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
            data={mappedRows}
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
