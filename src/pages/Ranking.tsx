import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, DollarSign, Users, Receipt, Crown, Package, ShoppingCart, Tag, Layers, Gift } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatBRL = (v: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const fmtCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);

const formatPct = (v: number | null) =>
  v != null ? `${v.toFixed(1)}%` : '—';

const MedalhaIcone = ({ pos }: { pos: number }) => {
  if (pos === 1) return <Crown className="h-5 w-5 text-[#FFD700]" />; // Gold
  if (pos === 2) return <Trophy className="h-5 w-5 text-[#C0C0C0]" />; // Silver
  if (pos === 3) return <Trophy className="h-5 w-5 text-[#CD7F32]" />; // Bronze
  return <span className="text-muted-foreground font-mono text-sm">{pos}</span>;
};

const medalha = (pos: number | null) => {
  if (pos == null) return '—';
  return <MedalhaIcone pos={pos} />;
};

function parseBRL(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const s = String(val);
  const cleaned = s.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

interface RankedItem {
  posicao: number;
  name: string;
  total_vendido: number;
  quantidade: number;
  lucro: number;
}

interface ProductRank {
  posicao: number;
  descricao_produto: string;
  familia_produto: string;
  marca: string;
  total_vendido: number;
  quantidade: number;
  lucro: number;
}


function RankingTable({ data, nameLabel }: { data: RankedItem[]; nameLabel: string }) {
  const columns = [
    { key: 'posicao' as const, label: '#', render: (v: number) => <div className="flex justify-center">{medalha(v)}</div> },
    { key: 'name' as const, label: nameLabel },
    { key: 'total_vendido' as const, label: 'Faturamento', align: 'right' as const, render: (v: number) => fmtCompact(v) },
    { key: 'lucro' as const, label: 'Lucro Real', align: 'right' as const, render: (v: number) => fmtCompact(v) },
    { key: 'quantidade' as const, label: 'Quantidade', align: 'right' as const, render: (v: number) => Math.round(v).toLocaleString('pt-BR') },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable columns={columns} data={data.slice(0, 50)} rowClassName={(row: RankedItem) => row.posicao <= 3 ? 'bg-primary/5' : ''} />
      </div>
      <div className="md:hidden space-y-3">
        {data.slice(0, 50).map((item) => (
          <div key={item.name} className={`bg-card border border-border rounded-lg p-4 shadow-card cursor-pointer hover:border-primary/40 transition-all duration-200 ${item.posicao <= 3 ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <MedalhaIcone pos={item.posicao} />
              <span className="font-bold text-foreground text-sm">{item.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><span className="text-muted-foreground">Faturamento: </span><span className="font-semibold text-foreground">{fmtCompact(item.total_vendido)}</span></div>
              <div><span className="text-muted-foreground">Lucro: </span><span className="font-semibold text-foreground">{fmtCompact(item.lucro)}</span></div>
              <div><span className="text-muted-foreground">Qtd: </span><span className="text-foreground">{Math.round(item.quantidade).toLocaleString('pt-BR')}</span></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Ranking() {
  const [selectedBonificacao, setSelectedBonificacao] = useState<Bonificacao | null>(null);
  const { periodoAno, periodoMes, dataInicio, dataFim, loading: loadingPeriodo } = usePeriod();

  const { data: ranking = [], isLoading: loadRanking } = useQuery({
    queryKey: ['ranking', periodoAno, periodoMes],
    enabled: !loadingPeriodo,
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

  const inicioMes = dataInicio;
  const fimMes = dataFim;

  const { data: vendasRaw = [], isLoading: loadProd } = useQuery({
    queryKey: ['vendas-ranking-prod', dataInicio, dataFim],
    enabled: !loadingPeriodo,
    queryFn: async () => {
      type VRow = { descricao_produto: string | null; familia_produto: string | null; marca: string | null; total_com_desconto: unknown; quantidade: unknown; vendedor_nome: string | null; lucros_reais: unknown };
      
      const { count, error: countErr } = await supabase
        .from('vendas')
        .select('*', { count: 'exact', head: true })
        .gte('data_emissao', inicioMes)
        .lte('data_emissao', fimMes);
        
      if (countErr) throw countErr;
      if (!count || count === 0) return [];

      const PAGE = 1000;
      const totalPages = Math.ceil(count / PAGE);
      const promises = [];

      for (let i = 0; i < totalPages; i++) {
        const from = i * PAGE;
        promises.push(
          supabase
            .from('vendas')
            .select('descricao_produto, familia_produto, marca, total_com_desconto, quantidade, vendedor_nome, lucros_reais')
            .gte('data_emissao', inicioMes)
            .lte('data_emissao', fimMes)
            .range(from, from + PAGE - 1)
        );
      }

      const results = await Promise.all(promises);
      let allData: VRow[] = [];
      for (const res of results) {
        if (res.error) throw res.error;
        if (res.data) allData = allData.concat(res.data as VRow[]);
      }
      return allData;
    },
  });

  interface Bonificacao {
    id: string;
    titulo: string;
    descricao: string | null;
    imagem_url: string | null;
    qtd_premiados: number;
    ativo: boolean;
  }

  const { data: bonificacoes = [] } = useQuery<Bonificacao[]>({
    queryKey: ['bonificacoes-ativas'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bonificacoes')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Bonificações não disponíveis:', error.message);
        return [];
      }
      return data ?? [];
    },
  });

  const isLoading = loadingPeriodo || loadRanking || loadProd;

  // Agrupar produtos
  const productRanking: ProductRank[] = useMemo(() => {
    const map = new Map<string, { total: number; qtd: number; lucro: number; familia: string; marca: string }>();
    for (const v of vendasRaw) {
      const nome = v.descricao_produto ?? 'Sem Nome';
      const existing = map.get(nome);
      const total = parseBRL(v.total_com_desconto);
      const qtd = parseBRL(v.quantidade);
      const lucro = parseBRL(v.lucros_reais);
      if (existing) {
        existing.total += total;
        existing.qtd += qtd;
        existing.lucro += lucro;
      } else {
        map.set(nome, { total, qtd, lucro, familia: v.familia_produto ?? 'Outros', marca: v.marca ?? 'Sem Marca' });
      }
    }
    return [...map.entries()]
      .map(([nome, d]) => ({ descricao_produto: nome, familia_produto: d.familia, marca: d.marca, total_vendido: d.total, quantidade: d.qtd, lucro: d.lucro, posicao: 0 }))
      .sort((a, b) => b.total_vendido - a.total_vendido)
      .map((item, i) => ({ ...item, posicao: i + 1 }));
  }, [vendasRaw]);

  // Agrupar marcas
  const marcaRanking: RankedItem[] = useMemo(() => {
    const map = new Map<string, { total: number; qtd: number; lucro: number }>();
    for (const v of vendasRaw) {
      const marca = v.marca ?? 'Sem Marca';
      const existing = map.get(marca);
      const total = parseBRL(v.total_com_desconto);
      const qtd = parseBRL(v.quantidade);
      const lucro = parseBRL(v.lucros_reais);
      if (existing) { existing.total += total; existing.qtd += qtd; existing.lucro += lucro; }
      else map.set(marca, { total, qtd, lucro });
    }
    return [...map.entries()]
      .map(([name, d]) => ({ name, total_vendido: d.total, quantidade: d.qtd, lucro: d.lucro, posicao: 0 }))
      .sort((a, b) => b.total_vendido - a.total_vendido)
      .map((item, i) => ({ ...item, posicao: i + 1 }));
  }, [vendasRaw]);

  // Agrupar famílias
  const familiaRanking: RankedItem[] = useMemo(() => {
    const map = new Map<string, { total: number; qtd: number; lucro: number }>();
    for (const v of vendasRaw) {
      const fam = v.familia_produto ?? 'Outros';
      const existing = map.get(fam);
      const total = parseBRL(v.total_com_desconto);
      const qtd = parseBRL(v.quantidade);
      const lucro = parseBRL(v.lucros_reais);
      if (existing) { existing.total += total; existing.qtd += qtd; existing.lucro += lucro; }
      else map.set(fam, { total, qtd, lucro });
    }
    return [...map.entries()]
      .map(([name, d]) => ({ name, total_vendido: d.total, quantidade: d.qtd, lucro: d.lucro, posicao: 0 }))
      .sort((a, b) => b.total_vendido - a.total_vendido)
      .map((item, i) => ({ ...item, posicao: i + 1 }));
  }, [vendasRaw]);

  const rankingData = useMemo(() => {
    if (ranking.length > 0) return ranking;

    const map = new Map<string, { total: number; lucro: number; notas: number }>();
    for (const v of vendasRaw) {
      const vendedor = String(v.vendedor_nome ?? 'Sem vendedor').trim() || 'Sem vendedor';
      const existing = map.get(vendedor);
      const total = parseBRL(v.total_com_desconto);
      const lucro = parseBRL(v.lucros_reais);

      if (existing) {
        existing.total += total;
        existing.lucro += lucro;
        existing.notas += 1;
      } else {
        map.set(vendedor, { total, lucro, notas: 1 });
      }
    }

    return [...map.entries()]
      .map(([vendedor_nome, d]) => ({
        posicao: 0,
        vendedor_id: null,
        vendedor_nome,
        unidade_nome: '—',
        regime: null,
        total_vendido: d.total,
        lucro_total: d.lucro,
        total_comissao: 0,
        percentual_aplicado: null,
        qtd_notas: d.notas,
      }))
      .sort((a, b) => (b.total_vendido ?? 0) - (a.total_vendido ?? 0))
      .map((item, i) => ({ ...item, posicao: i + 1 }));
  }, [ranking, vendasRaw]);

  const top1 = rankingData[0] ?? null;

  const kpis = useMemo(() => {
    const totalVendido = rankingData.reduce((s, r) => s + (r.total_vendido ?? 0), 0);
    const totalComissao = rankingData.reduce((s, r) => s + (r.total_comissao ?? 0), 0);
    const totalNotas = rankingData.reduce((s, r) => s + (r.qtd_notas ?? 0), 0);
    const ticketMedio = totalNotas > 0 ? totalVendido / totalNotas : 0;
    return { totalVendido, totalComissao, vendedores: rankingData.length, ticketMedio };
  }, [rankingData]);

  const prodKpis = useMemo(() => {
    const totalVendido = productRanking.reduce((s, p) => s + p.total_vendido, 0);
    const totalQtd = productRanking.reduce((s, p) => s + p.quantidade, 0);
    return { totalVendido, totalQtd, totalProdutos: productRanking.length };
  }, [productRanking]);

  const marcaKpis = useMemo(() => {
    const totalVendido = marcaRanking.reduce((s, m) => s + m.total_vendido, 0);
    const totalQtd = marcaRanking.reduce((s, m) => s + m.quantidade, 0);
    return { totalVendido, totalQtd, totalMarcas: marcaRanking.length };
  }, [marcaRanking]);

  const familiaKpis = useMemo(() => {
    const totalVendido = familiaRanking.reduce((s, f) => s + f.total_vendido, 0);
    const totalQtd = familiaRanking.reduce((s, f) => s + f.quantidade, 0);
    return { totalVendido, totalQtd, totalFamilias: familiaRanking.length };
  }, [familiaRanking]);

  const vendedorColumns = [
    { key: 'posicao' as const, label: '#', render: (v: number | null) => <span className={v != null && v <= 3 ? 'text-lg' : ''}>{medalha(v)}</span> },
    { key: 'vendedor_nome' as const, label: 'Vendedor' },
    { key: 'unidade_nome' as const, label: 'Unidade' },
    { key: 'regime' as const, label: 'Regime', render: (v: string | null) => v ? <StatusBadge status={v} /> : '—' },
    { key: 'total_vendido' as const, label: 'Faturamento', align: 'right' as const, render: (v: number | null) => fmtCompact(v ?? 0) },
    { key: 'lucro_total' as const, label: 'Lucro Real', align: 'right' as const, render: (v: number | null) => fmtCompact(v ?? 0) },
    { key: 'total_comissao' as const, label: 'Comissão', align: 'right' as const, render: (v: number | null) => fmtCompact(v ?? 0) },
    { key: 'percentual_aplicado' as const, label: '% Comissão', align: 'right' as const, render: (v: number | null) => formatPct(v) },
    { key: 'qtd_notas' as const, label: 'Notas', align: 'right' as const },
  ];

  const produtoColumns = [
    { key: 'posicao' as const, label: '#', render: (v: number) => <span className={v <= 3 ? 'text-lg' : ''}>{medalha(v)}</span> },
    { key: 'descricao_produto' as const, label: 'Produto' },
    { key: 'familia_produto' as const, label: 'Família' },
    { key: 'marca' as const, label: 'Marca' },
    { key: 'total_vendido' as const, label: 'Faturamento', align: 'right' as const, render: (v: number) => fmtCompact(v) },
    { key: 'lucro' as const, label: 'Lucro Real', align: 'right' as const, render: (v: number) => fmtCompact(v) },
    { key: 'quantidade' as const, label: 'Quantidade', align: 'right' as const, render: (v: number) => Math.round(v).toLocaleString('pt-BR') },
  ];


  return (
    <AppShell title="Ranking">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Ranking de Vendas</h1>
            <p className="text-sm text-muted-foreground mt-1">Acompanhe a performance de vendedores, marcas e produtos no mês selecionado.</p>
          </div>
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

          {/* Bonificações Ativas */}
          {bonificacoes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Premiações</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bonificacoes.map((b) => (
                  <Card
                    key={b.id}
                    className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-card cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedBonificacao(b)}
                  >
                    {b.imagem_url && (
                      <div className="h-40 w-full overflow-hidden">
                        <img src={b.imagem_url} alt={b.titulo} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-bold text-foreground">{b.titulo}</h3>
                      {b.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{b.descricao}</p>}
                      <div className="flex items-center gap-2 text-sm">
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-primary">Top {b.qtd_premiados}</span>
                        <span className="text-muted-foreground">do ranking serão premiados</span>
                      </div>
                      <p className="text-xs text-primary/70 mt-1">Clique para ver detalhes →</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Dialog de detalhes da bonificação */}
              <Dialog open={!!selectedBonificacao} onOpenChange={(open) => !open && setSelectedBonificacao(null)}>
                <DialogContent className="sm:max-w-lg">
                  {selectedBonificacao && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-primary" />
                          {selectedBonificacao.titulo}
                        </DialogTitle>
                      </DialogHeader>
                      {selectedBonificacao.imagem_url && (
                        <div className="w-full max-h-64 overflow-hidden rounded-lg">
                          <img
                            src={selectedBonificacao.imagem_url}
                            alt={selectedBonificacao.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {selectedBonificacao.descricao && (
                        <DialogDescription className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedBonificacao.descricao}
                        </DialogDescription>
                      )}
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <Crown className="h-6 w-6 text-primary" />
                        <div>
                          <p className="font-bold text-foreground">Top {selectedBonificacao.qtd_premiados} premiados</p>
                          <p className="text-sm text-muted-foreground">Os {selectedBonificacao.qtd_premiados} primeiros do ranking serão contemplados com esta premiação.</p>
                        </div>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="vendedores" className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="vendedores" className="flex-1 sm:flex-none gap-2">
                <Users className="h-4 w-4" />
                Vendedores
              </TabsTrigger>
              <TabsTrigger value="produtos" className="flex-1 sm:flex-none gap-2">
                <Package className="h-4 w-4" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="marcas" className="flex-1 sm:flex-none gap-2">
                <Tag className="h-4 w-4" />
                Marcas
              </TabsTrigger>
              <TabsTrigger value="familias" className="flex-1 sm:flex-none gap-2">
                <Layers className="h-4 w-4" />
                Famílias
              </TabsTrigger>
            </TabsList>

            {/* Tab Vendedores */}
            <TabsContent value="vendedores" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard icon={DollarSign} label="Total Vendido (Time)" value={formatBRL(kpis.totalVendido)} />
                <KPICard icon={Trophy} label="Comissão Total" value={formatBRL(kpis.totalComissao)} />
                <KPICard icon={Users} label="Vendedores Ativos" value={String(kpis.vendedores)} />
                <KPICard icon={Receipt} label="Ticket Médio" value={formatBRL(kpis.ticketMedio)} />
              </div>

              <div className="hidden md:block">
                <DataTable columns={vendedorColumns} data={rankingData} rowClassName={(row: typeof rankingData[0]) => row.posicao != null && row.posicao <= 3 ? 'bg-primary/5' : ''} />
              </div>

              <div className="md:hidden space-y-3">
                {rankingData.map((r) => (
                  <div key={`${r.vendedor_id ?? r.vendedor_nome ?? 'vendedor'}-${r.posicao ?? 0}`} className={`bg-card border border-border rounded-lg p-4 shadow-card ${r.posicao != null && r.posicao <= 3 ? 'border-primary/40' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{medalha(r.posicao)}</span>
                        <span className="font-bold text-foreground">{r.vendedor_nome}</span>
                      </div>
                      {r.regime && <StatusBadge status={r.regime} />}
                    </div>
                    <p className="text-xs text-secondary-foreground mb-2">{r.unidade_nome}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Faturamento: </span><span className="font-semibold text-foreground">{fmtCompact(r.total_vendido ?? 0)}</span></div>
                      <div><span className="text-muted-foreground">Lucro: </span><span className="font-semibold text-foreground">{fmtCompact(r.lucro_total ?? 0)}</span></div>
                      <div><span className="text-muted-foreground">Comissão: </span><span className="font-semibold text-foreground">{fmtCompact(r.total_comissao ?? 0)}</span></div>
                      <div><span className="text-muted-foreground">Notas: </span><span className="text-foreground">{r.qtd_notas ?? 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>

            </TabsContent>

            {/* Tab Produtos */}
            <TabsContent value="produtos" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard icon={DollarSign} label="Total Vendido" value={formatBRL(prodKpis.totalVendido)} />
                <KPICard icon={ShoppingCart} label="Qtd Total Vendida" value={Math.round(prodKpis.totalQtd).toLocaleString('pt-BR')} />
                <KPICard icon={Package} label="Produtos Únicos" value={String(prodKpis.totalProdutos)} />
              </div>

              <div className="hidden md:block">
                <DataTable columns={produtoColumns} data={productRanking.slice(0, 50)} rowClassName={(row: ProductRank) => row.posicao <= 3 ? 'bg-primary/5' : ''} />
              </div>

              <div className="md:hidden space-y-3">
                {productRanking.slice(0, 50).map((p) => (
                  <div key={p.descricao_produto} className={`bg-card border border-border rounded-lg p-4 shadow-card ${p.posicao <= 3 ? 'border-primary/40' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{medalha(p.posicao)}</span>
                      <span className="font-bold text-foreground text-sm">{p.descricao_produto}</span>
                    </div>
                    <p className="text-xs text-secondary-foreground mb-2">{p.familia_produto} · {p.marca}</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Faturamento: </span><span className="font-semibold text-foreground">{fmtCompact(p.total_vendido)}</span></div>
                      <div><span className="text-muted-foreground">Lucro: </span><span className="font-semibold text-foreground">{fmtCompact(p.lucro)}</span></div>
                      <div><span className="text-muted-foreground">Qtd: </span><span className="text-foreground">{Math.round(p.quantidade).toLocaleString('pt-BR')}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab Marcas */}
            <TabsContent value="marcas" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard icon={DollarSign} label="Total Vendido" value={formatBRL(marcaKpis.totalVendido)} />
                <KPICard icon={ShoppingCart} label="Qtd Total Vendida" value={Math.round(marcaKpis.totalQtd).toLocaleString('pt-BR')} />
                <KPICard icon={Tag} label="Marcas Únicas" value={String(marcaKpis.totalMarcas)} />
              </div>
              <RankingTable data={marcaRanking} nameLabel="Marca" />
            </TabsContent>

            {/* Tab Famílias */}
            <TabsContent value="familias" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard icon={DollarSign} label="Total Vendido" value={formatBRL(familiaKpis.totalVendido)} />
                <KPICard icon={ShoppingCart} label="Qtd Total Vendida" value={Math.round(familiaKpis.totalQtd).toLocaleString('pt-BR')} />
                <KPICard icon={Layers} label="Famílias Únicas" value={String(familiaKpis.totalFamilias)} />
              </div>
              <RankingTable data={familiaRanking} nameLabel="Família" />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AppShell>
  );
}
