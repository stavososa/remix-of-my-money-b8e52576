import { useState, useMemo, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { KPICard } from '@/components/KPICard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { usePeriod } from '@/contexts/PeriodContext';
import { resolverRegra, RegraComissao, VendaParaRegra } from '@/lib/resolverRegra';
import { DollarSign, Users, Building2, Package, Layers, Tag, Crown, Trophy, ChevronDown, X, AlertTriangle, Eye, FileSpreadsheet, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const parseMoneyBR = (str: unknown): number => {
  if (str == null) return 0;
  if (typeof str === 'number') return str;
  const s = String(str);
  const cleaned = s.replace(/[R$\s.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);

const normalizeCnpj = (cnpj: string) => cnpj.replace(/[.\-\/\s]/g, '');

const MedalhaIcone = ({ pos }: { pos: number }) => {
  if (pos === 1) return <Crown className="h-5 w-5 text-[#FFD700]" />;
  if (pos === 2) return <Trophy className="h-5 w-5 text-[#C0C0C0]" />;
  if (pos === 3) return <Trophy className="h-5 w-5 text-[#CD7F32]" />;
  return <span className="text-muted-foreground font-mono text-sm">{pos}</span>;
};

interface VendaRow {
  descricao_produto: string | null;
  familia_produto: string | null;
  marca: string | null;
  total_com_desconto: unknown;
  quantidade: unknown;
  vendedor_nome: string | null;
  cnpj_empresa: string | null;
  data_emissao: string | null;
  nota_fiscal: string | null;
}

interface ComissaoCalculada {
  data_emissao: string;
  nota_fiscal: string;
  descricao_produto: string;
  familia_produto: string;
  marca: string;
  vendedor: string;
  filial: string;
  valor_venda: number;
  percentual: number;
  valor_comissao: number;
  quantidade: number;
  regra_nome: string;
}

interface VendaSemRegra {
  data_emissao: string;
  nota_fiscal: string;
  vendedor: string;
  filial: string;
  descricao_produto: string;
  familia_produto: string;
  marca: string;
  valor_venda: number;
  quantidade: number;
}

interface AggRow {
  posicao: number;
  name: string;
  valor_comissao: number;
  valor_vendas: number;
  quantidade: number;
  percentual_medio: number;
}

function aggregate(items: ComissaoCalculada[], keyFn: (item: ComissaoCalculada) => string): AggRow[] {
  const map = new Map<string, { comissao: number; vendas: number; qtd: number; pctSum: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.comissao += item.valor_comissao;
      existing.vendas += item.valor_venda;
      existing.qtd += item.quantidade;
      existing.pctSum += item.percentual;
      existing.count++;
    } else {
      map.set(key, { comissao: item.valor_comissao, vendas: item.valor_venda, qtd: item.quantidade, pctSum: item.percentual, count: 1 });
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1].comissao - a[1].comissao)
    .map(([name, v], i) => ({
      posicao: i + 1,
      name,
      valor_comissao: v.comissao,
      valor_vendas: v.vendas,
      quantidade: v.qtd,
      percentual_medio: v.count > 0 ? v.pctSum / v.count : 0,
    }));
}

function RankingSection({ data, title, nameLabel, limit, icon: Icon, hideFinancials, visibleFinancialName, onRowClick }: {
  data: AggRow[];
  title: string;
  nameLabel: string;
  limit?: number;
  icon: React.ElementType;
  hideFinancials?: boolean;
  visibleFinancialName?: string;
  onRowClick?: (row: AggRow) => void;
}) {
  const display = limit ? data.slice(0, limit) : data;

  const shouldHideRow = (row: AggRow) => {
    if (hideFinancials) return true;
    if (visibleFinancialName && row.name !== visibleFinancialName) return true;
    return false;
  };

  const columns = [
    { key: 'posicao' as const, label: '#', render: (v: number) => <div className="flex justify-center">{v <= 3 ? <MedalhaIcone pos={v} /> : v}</div> },
    { key: 'name' as const, label: nameLabel },
    { key: 'valor_comissao' as const, label: 'Comissão', align: 'right' as const, render: (v: number, row: AggRow) => shouldHideRow(row) ? <span className="text-muted-foreground">—</span> : <span className="font-semibold text-primary">{fmt(v)}</span> },
    { key: 'valor_vendas' as const, label: 'Faturamento', align: 'right' as const, render: (v: number, row: AggRow) => shouldHideRow(row) ? <span className="text-muted-foreground">—</span> : fmtCompact(v) },
    { key: 'percentual_medio' as const, label: '% Médio', align: 'right' as const, render: (v: number) => `${v.toFixed(2)}%` },
    { key: 'quantidade' as const, label: 'Qtd Vendas', align: 'right' as const, render: (v: number) => Math.round(v).toLocaleString('pt-BR') },
    ...(onRowClick ? [{
      key: 'name' as const,
      label: 'Ações',
      align: 'center' as const,
      render: (_: any, row: AggRow) => (
        <button
          onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Detalhar vendas e regras aplicadas"
        >
          <Search className="h-3 w-3" /> Detalhar
        </button>
      ),
    }] : []),
  ];

  // If fully hidden, remove financial columns entirely
  const finalColumns = hideFinancials
    ? columns.filter(c => c.key !== 'valor_comissao' && c.key !== 'valor_vendas')
    : columns;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
          {limit && data.length > limit && <span className="text-xs text-muted-foreground font-normal ml-auto">{data.length} total</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {display.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado encontrado</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <DataTable
                columns={finalColumns}
                data={display}
                rowClassName={(row: AggRow) => row.posicao <= 3 ? 'bg-primary/5' : ''}
                pageSize={limit ? undefined : 20}
                onRowClick={onRowClick}
              />
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {display.map((item) => {
                const hidden = shouldHideRow(item);
                return (
                  <div
                    key={item.name}
                    onClick={() => onRowClick?.(item)}
                    className={`border border-border rounded-lg p-3 ${item.posicao <= 3 ? 'border-primary/20 bg-primary/[0.02]' : ''} ${onRowClick ? 'cursor-pointer hover:bg-secondary/30' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <MedalhaIcone pos={item.posicao} />
                      <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {!hideFinancials && (
                        <>
                          <div><span className="text-muted-foreground">Comissão: </span><span className="font-semibold text-primary">{hidden ? '—' : fmtCompact(item.valor_comissao)}</span></div>
                          <div><span className="text-muted-foreground">Faturamento: </span><span className="font-semibold">{hidden ? '—' : fmtCompact(item.valor_vendas)}</span></div>
                        </>
                      )}
                      <div><span className="text-muted-foreground">% Médio: </span><span>{item.percentual_medio.toFixed(2)}%</span></div>
                      <div><span className="text-muted-foreground">Qtd: </span><span>{Math.round(item.quantidade).toLocaleString('pt-BR')}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function RankingComissoes() {
  const { role, filial_gerente } = useAuth();
  const isGerente = role === 'gerente';
  const { periodoAno, periodoMes, dataInicio, dataFim, loading: loadingPeriodo } = usePeriod();
  const [filtroFilial, setFiltroFilial] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroFamilia, setFiltroFamilia] = useState<string[]>([]);
  const [filtroMarca, setFiltroMarca] = useState<string[]>([]);
  const [showSemRegra, setShowSemRegra] = useState(false);
  const [auditarVendedor, setAuditarVendedor] = useState<string | null>(null);

  // Force filial filter for gerente
  useEffect(() => {
    if (isGerente && filial_gerente) {
      setFiltroFilial([filial_gerente]);
    }
  }, [isGerente, filial_gerente]);

  useEffect(() => {
    if (!isGerente) {
      setFiltroFilial([]);
    }
    setFiltroVendedor([]);
    setFiltroFamilia([]);
    setFiltroMarca([]);
  }, [periodoAno, periodoMes]);

  // Fetch unidades for CNPJ -> Filial mapping
  const { data: unidadesList = [] } = useQuery({
    queryKey: ['unidades-nomes-cnpj'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('unidades')
        .select('nome, cnpj');
      if (error) throw error;
      return (data ?? []) as { nome: string; cnpj: string | null }[];
    },
    staleTime: Infinity,
  });

  const cnpjFilialMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of unidadesList) {
      if (row.cnpj && row.nome) map.set(normalizeCnpj(row.cnpj.trim()), row.nome);
    }
    return map;
  }, [unidadesList]);

  const getFilial = useCallback((cnpj: string | null | undefined): string => {
    if (!cnpj) return 'Sem Filial';
    return cnpjFilialMap.get(normalizeCnpj(cnpj.trim())) ?? 'Sem Filial';
  }, [cnpjFilialMap]);

  // Fetch all vendas for the period
  const { data: vendasRaw = [], isLoading: loadVendas } = useQuery({
    queryKey: ['comissoes-vendas', dataInicio, dataFim],
    enabled: !loadingPeriodo,
    queryFn: async () => {
      const { count, error: countErr } = await (supabase as any)
        .from('vendas')
        .select('*', { count: 'exact', head: true })
        .gte('data_emissao', dataInicio)
        .lte('data_emissao', dataFim);
      if (countErr) throw countErr;
      if (!count || count === 0) return [];

      const PAGE = 1000;
      const totalPages = Math.ceil(count / PAGE);
      const promises = [];
      for (let i = 0; i < totalPages; i++) {
        const from = i * PAGE;
        promises.push(
          (supabase as any)
            .from('vendas')
            .select('descricao_produto, familia_produto, marca, total_com_desconto, quantidade, vendedor_nome, cnpj_empresa, data_emissao, nota_fiscal')
            .gte('data_emissao', dataInicio)
            .lte('data_emissao', dataFim)
            .order('id', { ascending: true })
            .range(from, from + PAGE - 1)
        );
      }
      const results = await Promise.all(promises);
      let all: VendaRow[] = [];
      for (const res of results as any[]) {
        if (res.error) throw res.error;
        if (res.data) all = all.concat(res.data);
      }
      return all;
    },
    staleTime: Infinity,
  });

  // Fetch comissoes rules for the period
  const { data: regras = [], isLoading: loadRegras } = useQuery({
    queryKey: ['comissoes-regras', periodoAno, periodoMes],
    enabled: !loadingPeriodo,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('comissoes')
        .select('*')
        .eq('periodo_ano', periodoAno)
        .eq('periodo_mes', periodoMes)
        .eq('ativo', true);
      if (error) throw error;
      return (data ?? []) as RegraComissao[];
    },
    staleTime: Infinity,
  });

  // Calculate commissions
  // Non-commissionable vendors/channels
  const EXCLUIR_VENDEDORES = new Set([
    'LUCIANE ATHANASIO SITE', 'JULIO CESAR EDRONE', 'AVARIA', 'AVARIA CG', 'AVARIA DE VALIDADE',
    'BONIFICAÇÃO LOJA', 'COMPRA VENDEDOR', 'COMPRA VENDEDOR BOTAFOGO', 'COMPRA VENDEDOR CG', 'COMPRA VENDEDOR RECREIO',
    'DESENHO LOJA', 'VENDA OPERADOR LOGISTICA', 'N/D',
    'IFOOD BARRA', 'IFOOD BOTAFOGO', 'IFOOD CAMPO GRANDE', 'IFOOD FREGUESIA', 'IFOOD RECREIO', 'IFOOD VALQUEIRE', 'IFOOD VISTA ALEGRE',
    'Shopee', 'Mercado Livre', 'MERCADO LIVRE 2', 'Magazine Luiza', 'Loja Integrada', 'TIKTOK SHOP', 'SITE ATACADÃO',
    'BRINDES/AÇÕES BARRA DA TIJUCA', 'BRINDES/AÇÕES CAMPO GRANDE', 'BRINDES/AÇÕES VALQUEIRE',
    'PARCERIA/COLLAB BARRA DA TIJUCA', 'PARCERIA/COLLAB BOTAFOGO', 'PARCERIA/COLLAB RECREIO', 'PARCERIA/COLLAB VALQUEIRE',
    'PARCERIA/INFLUENCER', 'PROMOTOR/DEGUSTAÇÃO VALQUEIRE',
    'DEGUSTAÇÃO LOJA BOTAFOGO', 'DEGUSTAÇÃO LOJA CAMPO GRANDE', 'DEGUSTAÇÃO LOJA VALQUEIRE', 'DEGUSTAÇÃO NOVA IGUAÇU',
    'RESGATE BARRA DA TIJUCA',
    'CHECK OUT', 'CHECK OUT CG', 'CHECK OUT RECREIO', 'CHECK OUT VISTA ALEGRE', 'CHECKOUT BOTAFOGO', 'CHECKOUT DELIVERY', 'CHECKOUT FREGUESIA', 'CHECKOUT NOVA IGUAÇU',
    'OmieApp_01', 'Devi PDV_01', 'Devi PDV_02', 'Devi PDV_03', 'Devi PDV_04', 'Devi PDV_06',
  ]);

  const { comissoesCalculadas, vendasSemRegra } = useMemo<{ comissoesCalculadas: ComissaoCalculada[]; vendasSemRegra: VendaSemRegra[] }>(() => {
    if (!vendasRaw.length || !regras.length) return { comissoesCalculadas: [], vendasSemRegra: [] };

    // Pre-compute vendor revenue for min_faturamento rules (only commissionable vendors)
    const vendorRevenue = new Map<string, number>();
    for (const v of vendasRaw) {
      const vendedor = v.vendedor_nome ?? 'Sem Vendedor';
      if (EXCLUIR_VENDEDORES.has(vendedor)) continue;
      vendorRevenue.set(vendedor, (vendorRevenue.get(vendedor) ?? 0) + parseMoneyBR(v.total_com_desconto));
    }

    const results: ComissaoCalculada[] = [];
    const semRegra: VendaSemRegra[] = [];
    for (const v of vendasRaw) {
      const valorVenda = parseMoneyBR(v.total_com_desconto);
      if (valorVenda <= 0) continue;

      const vendedor = v.vendedor_nome ?? 'Sem Vendedor';
      if (EXCLUIR_VENDEDORES.has(vendedor)) continue;
      const isDelivery = /DELIVERY/i.test(vendedor);
      const filial = isDelivery ? 'DELIVERY' : getFilial(v.cnpj_empresa);
      const vendaParaRegra: VendaParaRegra = {
        tipo_unidade: isDelivery ? 'DELIVERY' : undefined,
        familia_produto: v.familia_produto ?? undefined,
        marca: v.marca ?? undefined,
        descricao_produto: v.descricao_produto ?? undefined,
        faturamento_vendedor: vendorRevenue.get(vendedor) ?? 0,
      };

      const regra = resolverRegra(vendaParaRegra, regras);
      const qtd = parseMoneyBR(v.quantidade) || 1;
      const dataEmissao = v.data_emissao ?? '';
      const notaFiscal = v.nota_fiscal ?? '';
      if (!regra) {
        semRegra.push({
          data_emissao: dataEmissao,
          nota_fiscal: notaFiscal,
          vendedor,
          filial,
          descricao_produto: v.descricao_produto ?? 'Sem Produto',
          familia_produto: v.familia_produto ?? 'Sem Família',
          marca: v.marca ?? 'Sem Marca',
          valor_venda: valorVenda,
          quantidade: qtd,
        });
        continue;
      }

      results.push({
        data_emissao: dataEmissao,
        nota_fiscal: notaFiscal,
        descricao_produto: v.descricao_produto ?? 'Sem Produto',
        familia_produto: v.familia_produto ?? 'Sem Família',
        marca: v.marca ?? 'Sem Marca',
        vendedor,
        filial,
        valor_venda: valorVenda,
        percentual: regra.percentual,
        valor_comissao: valorVenda * regra.percentual / 100,
        quantidade: qtd,
        regra_nome: regra.nome,
      });
    }
    return { comissoesCalculadas: results, vendasSemRegra: semRegra };
  }, [vendasRaw, regras, getFilial]);

  // Apply filters
  const filtered = useMemo(() => {
    return comissoesCalculadas.filter(c => {
      if (filtroFilial.length > 0 && !filtroFilial.includes(c.filial)) return false;
      if (filtroVendedor.length > 0 && !filtroVendedor.includes(c.vendedor)) return false;
      if (filtroFamilia.length > 0 && !filtroFamilia.includes(c.familia_produto)) return false;
      if (filtroMarca.length > 0 && !filtroMarca.includes(c.marca)) return false;
      return true;
    });
  }, [comissoesCalculadas, filtroFilial, filtroVendedor, filtroFamilia, filtroMarca]);

  // Aggregations
  const totalComissao = useMemo(() => filtered.reduce((s, c) => s + c.valor_comissao, 0), [filtered]);
  const totalVendas = useMemo(() => filtered.reduce((s, c) => s + c.valor_venda, 0), [filtered]);
  const totalQtd = useMemo(() => filtered.length, [filtered]);

  const byVendedor = useMemo(() => aggregate(filtered, c => c.vendedor), [filtered]);
  const byFilial = useMemo(() => aggregate(filtered, c => c.filial), [filtered]);
  const byProduto = useMemo(() => aggregate(filtered, c => c.descricao_produto), [filtered]);
  const byFamilia = useMemo(() => aggregate(filtered, c => c.familia_produto), [filtered]);
  const byMarca = useMemo(() => aggregate(filtered, c => c.marca), [filtered]);

  // Filter options
  const filiais = useMemo(() => [...new Set(comissoesCalculadas.map(c => c.filial))].sort(), [comissoesCalculadas]);
  const vendedores = useMemo(() => {
    const source = filtroFilial.length > 0
      ? comissoesCalculadas.filter(c => filtroFilial.includes(c.filial))
      : comissoesCalculadas;
    return [...new Set(source.map(c => c.vendedor))].sort();
  }, [comissoesCalculadas, filtroFilial]);

  const familias = useMemo(() => {
    return [...new Set(comissoesCalculadas.map(c => c.familia_produto))].sort();
  }, [comissoesCalculadas]);

  const marcas = useMemo(() => {
    return [...new Set(comissoesCalculadas.map(c => c.marca))].sort();
  }, [comissoesCalculadas]);

  const isLoading = loadingPeriodo || loadVendas || loadRegras;

  // Vendas sem regra também filtradas (mesma lógica dos filtros)
  const filteredSemRegra = useMemo(() => {
    return vendasSemRegra.filter(c => {
      if (filtroFilial.length > 0 && !filtroFilial.includes(c.filial)) return false;
      if (filtroVendedor.length > 0 && !filtroVendedor.includes(c.vendedor)) return false;
      if (filtroFamilia.length > 0 && !filtroFamilia.includes(c.familia_produto)) return false;
      if (filtroMarca.length > 0 && !filtroMarca.includes(c.marca)) return false;
      return true;
    });
  }, [vendasSemRegra, filtroFilial, filtroVendedor, filtroFamilia, filtroMarca]);

  const sufixoArquivo = useMemo(() => {
    const partes: string[] = [];
    if (filtroFilial.length > 0) partes.push(filtroFilial.join('-'));
    partes.push(`${MESES[periodoMes]}_${periodoAno}`);
    return partes.join('_').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80);
  }, [filtroFilial, periodoMes, periodoAno]);

  const fmtDataBR = (d: string) => {
    if (!d) return '';
    const [y, m, dd] = d.split('T')[0].split('-');
    return `${dd}/${m}/${y}`;
  };

  // Exportação GERAL - Detalhada (todas as vendas)
  const exportarGeralDetalhado = useCallback(() => {
    const rows = [
      ...filtered.map(v => ({
        Data: fmtDataBR(v.data_emissao),
        'Nota Fiscal': v.nota_fiscal,
        Filial: v.filial,
        Vendedor: v.vendedor,
        Produto: v.descricao_produto,
        Família: v.familia_produto,
        Marca: v.marca,
        Quantidade: v.quantidade,
        'Faturamento (R$)': Number(v.valor_venda.toFixed(2)),
        '% Aplicado': Number(v.percentual.toFixed(2)),
        'Comissão (R$)': Number(v.valor_comissao.toFixed(2)),
        'Regra Aplicada': v.regra_nome,
      })),
      ...filteredSemRegra.map(v => ({
        Data: fmtDataBR(v.data_emissao),
        'Nota Fiscal': v.nota_fiscal,
        Filial: v.filial,
        Vendedor: v.vendedor,
        Produto: v.descricao_produto,
        Família: v.familia_produto,
        Marca: v.marca,
        Quantidade: v.quantidade,
        'Faturamento (R$)': Number(v.valor_venda.toFixed(2)),
        '% Aplicado': 0,
        'Comissão (R$)': 0,
        'Regra Aplicada': 'SEM REGRA',
      })),
    ];
    if (rows.length === 0) return;
    const totalFat = rows.reduce((s, r) => s + (r['Faturamento (R$)'] as number), 0);
    const totalCom = rows.reduce((s, r) => s + (r['Comissão (R$)'] as number), 0);
    const totalQtd = rows.reduce((s, r) => s + (r.Quantidade as number), 0);
    rows.push({
      Data: '', 'Nota Fiscal': '', Filial: '', Vendedor: 'TOTAL', Produto: '', Família: '', Marca: '',
      Quantidade: totalQtd,
      'Faturamento (R$)': Number(totalFat.toFixed(2)),
      '% Aplicado': totalFat > 0 ? Number(((totalCom / totalFat) * 100).toFixed(2)) : 0,
      'Comissão (R$)': Number(totalCom.toFixed(2)),
      'Regra Aplicada': '',
    } as any);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 40 }, { wch: 22 }, { wch: 18 },
      { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 30 },
    ];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 1; R <= range.e.r; R++) {
      const fatCell = ws[XLSX.utils.encode_cell({ r: R, c: 8 })];
      const pctCell = ws[XLSX.utils.encode_cell({ r: R, c: 9 })];
      const comCell = ws[XLSX.utils.encode_cell({ r: R, c: 10 })];
      if (fatCell) fatCell.z = 'R$ #,##0.00';
      if (pctCell) pctCell.z = '0.00"%"';
      if (comCell) comCell.z = 'R$ #,##0.00';
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhado');
    XLSX.writeFile(wb, `comissoes_detalhado_${sufixoArquivo}.xlsx`);
  }, [filtered, filteredSemRegra, sufixoArquivo]);

  // Exportação GERAL - Resumo por Vendedor
  const exportarGeralResumo = useCallback(() => {
    if (byVendedor.length === 0) return;
    const rows = byVendedor.map(v => ({
      Posição: v.posicao,
      Vendedor: v.name,
      'Qtd Vendas': v.quantidade,
      'Faturamento (R$)': Number(v.valor_vendas.toFixed(2)),
      '% Médio': Number(v.percentual_medio.toFixed(2)),
      'Comissão (R$)': Number(v.valor_comissao.toFixed(2)),
    }));
    const totalFat = rows.reduce((s, r) => s + (r['Faturamento (R$)'] as number), 0);
    const totalCom = rows.reduce((s, r) => s + (r['Comissão (R$)'] as number), 0);
    const totalQtd = rows.reduce((s, r) => s + (r['Qtd Vendas'] as number), 0);
    rows.push({
      Posição: 0, Vendedor: 'TOTAL',
      'Qtd Vendas': totalQtd,
      'Faturamento (R$)': Number(totalFat.toFixed(2)),
      '% Médio': totalFat > 0 ? Number(((totalCom / totalFat) * 100).toFixed(2)) : 0,
      'Comissão (R$)': Number(totalCom.toFixed(2)),
    } as any);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 18 }];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 1; R <= range.e.r; R++) {
      const fatCell = ws[XLSX.utils.encode_cell({ r: R, c: 3 })];
      const pctCell = ws[XLSX.utils.encode_cell({ r: R, c: 4 })];
      const comCell = ws[XLSX.utils.encode_cell({ r: R, c: 5 })];
      if (fatCell) fatCell.z = 'R$ #,##0.00';
      if (pctCell) pctCell.z = '0.00"%"';
      if (comCell) comCell.z = 'R$ #,##0.00';
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo Vendedores');
    XLSX.writeFile(wb, `comissoes_resumo_${sufixoArquivo}.xlsx`);
  }, [byVendedor, sufixoArquivo]);

  return (
    <AppShell title="Ranking de Comissões">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : regras.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-foreground">Nenhuma regra de comissão encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Não existem regras configuradas para {MESES[periodoMes]}/{periodoAno}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-foreground">Nenhuma comissão calculada</p>
          <p className="text-sm text-muted-foreground mt-1">Não há vendas correspondentes às regras para este período</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="text-sm font-medium text-foreground">
                  {MESES[periodoMes]}/{periodoAno}
                </div>
                {/* Filial filter */}
                {isGerente ? null : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary text-sm hover:bg-secondary/80 transition-colors">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {filtroFilial.length === 0 ? 'Todas as Filiais' : `${filtroFilial.length} filial(is)`}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <button onClick={() => setFiltroFilial([])} className={`w-full text-left px-2 py-1.5 rounded text-sm ${filtroFilial.length === 0 ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>
                      Todas
                    </button>
                    {filiais.map(f => (
                      <label key={f} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm">
                        <Checkbox
                          checked={filtroFilial.includes(f)}
                          onCheckedChange={(checked) => {
                            setFiltroFilial(prev => checked ? [...prev, f] : prev.filter(x => x !== f));
                          }}
                        />
                        {f}
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
                )}

                {/* Vendedor filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary text-sm hover:bg-secondary/80 transition-colors">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {filtroVendedor.length === 0 ? 'Todos os Vendedores' : `${filtroVendedor.length} vendedor(es)`}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 max-h-64 overflow-auto" align="start">
                    <button onClick={() => setFiltroVendedor([])} className={`w-full text-left px-2 py-1.5 rounded text-sm ${filtroVendedor.length === 0 ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>
                      Todos
                    </button>
                    {vendedores.map(v => (
                      <label key={v} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm">
                        <Checkbox
                          checked={filtroVendedor.includes(v)}
                          onCheckedChange={(checked) => {
                            setFiltroVendedor(prev => checked ? [...prev, v] : prev.filter(x => x !== v));
                          }}
                        />
                        <span className="truncate">{v}</span>
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Família filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary text-sm hover:bg-secondary/80 transition-colors">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      {filtroFamilia.length === 0 ? 'Todas as Famílias' : `${filtroFamilia.length} família(s)`}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 max-h-64 overflow-auto" align="start">
                    <button onClick={() => setFiltroFamilia([])} className={`w-full text-left px-2 py-1.5 rounded text-sm ${filtroFamilia.length === 0 ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>
                      Todas
                    </button>
                    {familias.map(f => (
                      <label key={f} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm">
                        <Checkbox
                          checked={filtroFamilia.includes(f)}
                          onCheckedChange={(checked) => {
                            setFiltroFamilia(prev => checked ? [...prev, f] : prev.filter(x => x !== f));
                          }}
                        />
                        <span className="truncate">{f}</span>
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Marca filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary text-sm hover:bg-secondary/80 transition-colors">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {filtroMarca.length === 0 ? 'Todas as Marcas' : `${filtroMarca.length} marca(s)`}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 max-h-64 overflow-auto" align="start">
                    <button onClick={() => setFiltroMarca([])} className={`w-full text-left px-2 py-1.5 rounded text-sm ${filtroMarca.length === 0 ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary'}`}>
                      Todas
                    </button>
                    {marcas.map(m => (
                      <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm">
                        <Checkbox
                          checked={filtroMarca.includes(m)}
                          onCheckedChange={(checked) => {
                            setFiltroMarca(prev => checked ? [...prev, m] : prev.filter(x => x !== m));
                          }}
                        />
                        <span className="truncate">{m}</span>
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Active filter badges */}
                {(isGerente
                  ? (filtroVendedor.length > 0 || filtroFamilia.length > 0 || filtroMarca.length > 0)
                  : (filtroFilial.length > 0 || filtroVendedor.length > 0 || filtroFamilia.length > 0 || filtroMarca.length > 0)
                ) && (
                  <button onClick={() => { if (!isGerente) setFiltroFilial([]); setFiltroVendedor([]); setFiltroFamilia([]); setFiltroMarca([]); }} className="text-xs text-destructive hover:underline flex items-center gap-1">
                    <X className="h-3 w-3" /> Limpar filtros
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className={`grid grid-cols-1 ${isGerente ? 'sm:grid-cols-1' : 'sm:grid-cols-3'} gap-4`}>
            {!isGerente && <KPICard label="Total Comissão" value={fmt(totalComissao)} icon={DollarSign} />}
            {!isGerente && <KPICard label="Total Faturamento" value={fmtCompact(totalVendas)} icon={Package} />}
            <KPICard label="Vendas com Comissão" value={totalQtd.toLocaleString('pt-BR')} icon={Tag} />
          </div>

          {/* Alerta de vendas sem regra */}
          {!isGerente && vendasSemRegra.length > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {vendasSemRegra.length.toLocaleString('pt-BR')} vendas sem regra de comissão aplicável
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total ignorado: {fmt(vendasSemRegra.reduce((s, v) => s + v.valor_venda, 0))} — nenhuma regra ativa cobriu o produto/marca/família dessas vendas. Cadastre uma regra genérica para garantir cobertura.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSemRegra(true)}
                  className="text-xs px-3 py-1.5 rounded-md border border-warning/50 text-warning hover:bg-warning/10 transition-colors flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" /> Ver detalhes
                </button>
              </CardContent>
            </Card>
          )}

          {/* Resumo por Filial e Vendedor */}
          {!isGerente && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RankingSection data={byFilial} title="Comissão por Filial" nameLabel="Filial" icon={Building2} />
              <RankingSection data={byVendedor} title="Comissão por Vendedor" nameLabel="Vendedor" icon={Users} onRowClick={(r) => setAuditarVendedor(r.name)} />
            </div>
          )}

          {/* Top 10 Rankings */}
          {!isGerente && (
            <Tabs defaultValue="produtos" className="space-y-4">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="produtos" className="text-xs sm:text-sm">Top 10 Produtos</TabsTrigger>
                <TabsTrigger value="familias" className="text-xs sm:text-sm">Top 10 Famílias</TabsTrigger>
                <TabsTrigger value="marcas" className="text-xs sm:text-sm">Top 10 Marcas</TabsTrigger>
                <TabsTrigger value="vendedores" className="text-xs sm:text-sm">Top 10 Vendedores</TabsTrigger>
                <TabsTrigger value="filiais" className="text-xs sm:text-sm">Top 10 Filiais</TabsTrigger>
              </TabsList>

              <TabsContent value="produtos">
                <RankingSection data={byProduto} title="Top 10 Produtos por Comissão" nameLabel="Produto" limit={10} icon={Package} />
              </TabsContent>
              <TabsContent value="familias">
                <RankingSection data={byFamilia} title="Top 10 Famílias por Comissão" nameLabel="Família" limit={10} icon={Layers} />
              </TabsContent>
              <TabsContent value="marcas">
                <RankingSection data={byMarca} title="Top 10 Marcas por Comissão" nameLabel="Marca" limit={10} icon={Tag} />
              </TabsContent>
              <TabsContent value="vendedores">
                <RankingSection data={byVendedor} title="Top 10 Vendedores por Comissão" nameLabel="Vendedor" limit={10} icon={Users} onRowClick={(r) => setAuditarVendedor(r.name)} />
              </TabsContent>
              <TabsContent value="filiais">
                <RankingSection data={byFilial} title="Top 10 Filiais por Comissão" nameLabel="Filial" limit={10} icon={Building2} />
              </TabsContent>
            </Tabs>
          )}

          {/* Rankings Completos */}
          <Tabs defaultValue="produtos-full" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="produtos-full" className="text-xs sm:text-sm">Todos Produtos</TabsTrigger>
              <TabsTrigger value="familias-full" className="text-xs sm:text-sm">Todas Famílias</TabsTrigger>
              <TabsTrigger value="marcas-full" className="text-xs sm:text-sm">Todas Marcas</TabsTrigger>
            </TabsList>

            <TabsContent value="produtos-full">
              <RankingSection data={byProduto} title="Ranking Completo — Produtos" nameLabel="Produto" icon={Package} hideFinancials={isGerente} />
            </TabsContent>
            <TabsContent value="familias-full">
              <RankingSection data={byFamilia} title="Ranking Completo — Famílias" nameLabel="Família" icon={Layers} hideFinancials={isGerente} />
            </TabsContent>
            <TabsContent value="marcas-full">
              <RankingSection data={byMarca} title="Ranking Completo — Marcas" nameLabel="Marca" icon={Tag} hideFinancials={isGerente} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Modal: Vendas sem regra */}
      {showSemRegra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSemRegra(false)} />
          <div className="relative bg-card border border-border rounded-xl p-5 w-full max-w-4xl shadow-card max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Vendas sem regra de comissão ({vendasSemRegra.length.toLocaleString('pt-BR')})
              </h3>
              <button onClick={() => setShowSemRegra(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Agrupado por vendedor. Total ignorado: {fmt(vendasSemRegra.reduce((s, v) => s + v.valor_venda, 0))}
            </p>
            <div className="overflow-auto flex-1 border border-border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="text-left p-2">Vendedor</th>
                    <th className="text-left p-2">Filial</th>
                    <th className="text-right p-2">Vendas</th>
                    <th className="text-right p-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    vendasSemRegra.reduce<Record<string, { filial: string; count: number; total: number }>>((acc, v) => {
                      const k = `${v.vendedor}|${v.filial}`;
                      if (!acc[k]) acc[k] = { filial: v.filial, count: 0, total: 0 };
                      acc[k].count++;
                      acc[k].total += v.valor_venda;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([key, v]) => {
                      const vendedor = key.split('|')[0];
                      return (
                        <tr key={key} className="border-t border-border hover:bg-secondary/50">
                          <td className="p-2 text-foreground">{vendedor}</td>
                          <td className="p-2 text-muted-foreground">{v.filial}</td>
                          <td className="p-2 text-right">{v.count.toLocaleString('pt-BR')}</td>
                          <td className="p-2 text-right font-semibold text-warning">{fmt(v.total)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Auditar vendedor (mostra cada venda + regra aplicada) */}
      {auditarVendedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAuditarVendedor(null)} />
          <div className="relative bg-card border border-border rounded-xl p-5 w-full max-w-5xl shadow-card max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3 gap-3">
              <h3 className="text-lg font-bold text-foreground truncate">Auditoria: {auditarVendedor}</h3>
              <div className="flex items-center gap-2 shrink-0">
                {(() => {
                  const vendas = comissoesCalculadas.filter(c => c.vendedor === auditarVendedor);
                  const semRegra = vendasSemRegra.filter(v => v.vendedor === auditarVendedor);
                  const handleExport = () => {
                    const rows = [
                      ...vendas.map(v => ({
                        Data: v.data_emissao,
                        'Nota Fiscal': v.nota_fiscal,
                        Filial: v.filial,
                        Produto: v.descricao_produto,
                        Família: v.familia_produto,
                        Marca: v.marca,
                        Quantidade: v.quantidade,
                        'Faturamento (R$)': Number(v.valor_venda.toFixed(2)),
                        '% Aplicado': Number(v.percentual.toFixed(2)),
                        'Comissão (R$)': Number(v.valor_comissao.toFixed(2)),
                        'Regra Aplicada': v.regra_nome,
                      })),
                      ...semRegra.map(v => ({
                        Data: v.data_emissao,
                        'Nota Fiscal': v.nota_fiscal,
                        Filial: v.filial,
                        Produto: v.descricao_produto,
                        Família: v.familia_produto,
                        Marca: v.marca,
                        Quantidade: v.quantidade,
                        'Faturamento (R$)': Number(v.valor_venda.toFixed(2)),
                        '% Aplicado': 0,
                        'Comissão (R$)': 0,
                        'Regra Aplicada': 'SEM REGRA',
                      })),
                    ];
                    const totalFat = rows.reduce((s, r) => s + (r['Faturamento (R$)'] as number), 0);
                    const totalCom = rows.reduce((s, r) => s + (r['Comissão (R$)'] as number), 0);
                    rows.push({
                      Data: '', 'Nota Fiscal': '', Filial: '', Produto: 'TOTAL', Família: '', Marca: '',
                      Quantidade: rows.reduce((s, r) => s + (r.Quantidade as number), 0),
                      'Faturamento (R$)': Number(totalFat.toFixed(2)),
                      '% Aplicado': totalFat > 0 ? Number(((totalCom / totalFat) * 100).toFixed(2)) : 0,
                      'Comissão (R$)': Number(totalCom.toFixed(2)),
                      'Regra Aplicada': '',
                    } as any);
                    const ws = XLSX.utils.json_to_sheet(rows);
                    // Column widths
                    ws['!cols'] = [
                      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 22 }, { wch: 18 },
                      { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 30 },
                    ];
                    // Currency / percent formatting on data rows (skip header at row 1)
                    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                    for (let R = 1; R <= range.e.r; R++) {
                      const fatCell = ws[XLSX.utils.encode_cell({ r: R, c: 7 })];
                      const pctCell = ws[XLSX.utils.encode_cell({ r: R, c: 8 })];
                      const comCell = ws[XLSX.utils.encode_cell({ r: R, c: 9 })];
                      if (fatCell) fatCell.z = 'R$ #,##0.00';
                      if (pctCell) pctCell.z = '0.00"%"';
                      if (comCell) comCell.z = 'R$ #,##0.00';
                    }
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Comissões');
                    const safeName = auditarVendedor.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
                    XLSX.writeFile(wb, `comissoes_${safeName}_${MESES[periodoMes]}_${periodoAno}.xlsx`);
                  };
                  return (
                    <button
                      onClick={handleExport}
                      disabled={vendas.length === 0 && semRegra.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-40"
                      title="Exportar todas as vendas detalhadas para Excel"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Exportar XLSX
                    </button>
                  );
                })()}
                <button onClick={() => setAuditarVendedor(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {(() => {
              const vendas = comissoesCalculadas.filter(c => c.vendedor === auditarVendedor);
              const semRegra = vendasSemRegra.filter(v => v.vendedor === auditarVendedor);
              const totalCom = vendas.reduce((s, v) => s + v.valor_comissao, 0);
              const totalFat = vendas.reduce((s, v) => s + v.valor_venda, 0);
              const totalIgnorado = semRegra.reduce((s, v) => s + v.valor_venda, 0);
              const fmtData = (d: string) => {
                if (!d) return '—';
                const [y, m, dd] = d.split('T')[0].split('-');
                return `${dd}/${m}/${y}`;
              };
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                    <div className="p-2 rounded bg-secondary"><div className="text-muted-foreground">Vendas</div><div className="font-bold text-foreground">{(vendas.length + semRegra.length).toLocaleString('pt-BR')}</div></div>
                    <div className="p-2 rounded bg-secondary"><div className="text-muted-foreground">Faturamento</div><div className="font-bold text-foreground">{fmt(totalFat + totalIgnorado)}</div></div>
                    <div className="p-2 rounded bg-primary/10"><div className="text-muted-foreground">Comissão</div><div className="font-bold text-primary">{fmt(totalCom)}</div></div>
                    <div className="p-2 rounded bg-warning/10"><div className="text-muted-foreground">Ignorado (s/ regra)</div><div className="font-bold text-warning">{fmt(totalIgnorado)}</div></div>
                  </div>
                  <div className="overflow-auto flex-1 border border-border rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary sticky top-0 z-10">
                        <tr>
                          <th className="text-left p-2 whitespace-nowrap">Data</th>
                          <th className="text-left p-2 whitespace-nowrap">NF</th>
                          <th className="text-left p-2">Filial</th>
                          <th className="text-left p-2">Produto</th>
                          <th className="text-left p-2">Família</th>
                          <th className="text-left p-2">Marca</th>
                          <th className="text-right p-2">Qtd</th>
                          <th className="text-right p-2">Venda</th>
                          <th className="text-right p-2">%</th>
                          <th className="text-right p-2">Comissão</th>
                          <th className="text-left p-2">Regra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendas.map((v, i) => (
                          <tr key={i} className="border-t border-border hover:bg-secondary/50">
                            <td className="p-2 text-muted-foreground whitespace-nowrap">{fmtData(v.data_emissao)}</td>
                            <td className="p-2 text-muted-foreground whitespace-nowrap">{v.nota_fiscal || '—'}</td>
                            <td className="p-2 text-muted-foreground">{v.filial}</td>
                            <td className="p-2 text-foreground max-w-[220px] truncate" title={v.descricao_produto}>{v.descricao_produto}</td>
                            <td className="p-2 text-muted-foreground">{v.familia_produto}</td>
                            <td className="p-2 text-muted-foreground">{v.marca}</td>
                            <td className="p-2 text-right">{v.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right">{fmt(v.valor_venda)}</td>
                            <td className="p-2 text-right">{v.percentual.toFixed(2)}%</td>
                            <td className="p-2 text-right font-semibold text-primary">{fmt(v.valor_comissao)}</td>
                            <td className="p-2 text-foreground">{v.regra_nome}</td>
                          </tr>
                        ))}
                        {semRegra.map((v, i) => (
                          <tr key={`sr-${i}`} className="border-t border-border bg-warning/5">
                            <td className="p-2 text-muted-foreground whitespace-nowrap">{fmtData(v.data_emissao)}</td>
                            <td className="p-2 text-muted-foreground whitespace-nowrap">{v.nota_fiscal || '—'}</td>
                            <td className="p-2 text-muted-foreground">{v.filial}</td>
                            <td className="p-2 text-foreground max-w-[220px] truncate" title={v.descricao_produto}>{v.descricao_produto}</td>
                            <td className="p-2 text-muted-foreground">{v.familia_produto}</td>
                            <td className="p-2 text-muted-foreground">{v.marca}</td>
                            <td className="p-2 text-right">{v.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right">{fmt(v.valor_venda)}</td>
                            <td className="p-2 text-right text-warning">—</td>
                            <td className="p-2 text-right text-warning">—</td>
                            <td className="p-2 italic text-warning">SEM REGRA</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Exibindo todas as {(vendas.length + semRegra.length).toLocaleString('pt-BR')} vendas. Use o botão "Exportar XLSX" para baixar a planilha completa com totais.
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </AppShell>
  );
}
