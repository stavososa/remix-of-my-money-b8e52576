import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, DollarSign, Users, Receipt, Crown, Package, ShoppingCart, Tag, Layers } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatBRL = (v: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const fmtCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);

const formatPct = (v: number | null) =>
  v != null ? `${v.toFixed(1)}%` : '—';

const medalha = (pos: number | null) => {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return String(pos ?? '—');
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
    { key: 'posicao' as const, label: '#', render: (v: number) => <span className={v <= 3 ? 'text-lg' : ''}>{medalha(v)}</span> },
    { key: 'name' as const, label: nameLabel },
    { key: 'total_vendido' as const, label: 'Faturamento', align: 'right' as const, render: (v: number) => fmtCompact(v) },
    { key: 'lucro' as const, label: 'Lucro Real', align: 'right' as const, render: (v: number) => fmtCompact(v) },
    { key: 'quantidade' as const, label: 'Quantidade', align: 'right' as const, render: (v: number) => Math.round(v).toLocaleString('pt-BR') },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable columns={columns} data={data.slice(0, 50)} rowClassName={(row: any) => row.posicao <= 3 ? 'bg-primary/5' : ''} />
      </div>
      <div className="md:hidden space-y-3">
        {data.slice(0, 50).map((item) => (
          <div key={item.name} className={`bg-card border border-border rounded-lg p-4 shadow-card ${item.posicao <= 3 ? 'border-primary/40' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{medalha(item.posicao)}</span>
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
  const { periodoAno, periodoMes } = usePeriod();

  const { data: ranking = [], isLoading: loadRanking } = useQuery({
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

  const mesStr = String(periodoMes).padStart(2, '0');
  const inicioMes = `${periodoAno}-${mesStr}-01`;
  const fimMes = `${periodoAno}-${mesStr}-31`;

  const { data: vendasRaw = [], isLoading: loadProd } = useQuery({
    queryKey: ['vendas-ranking-prod', periodoAno, periodoMes],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from('vendas')
          .select('descricao_produto, familia_produto, marca, total_com_desconto, quantidade, vendedor_nome, lucros_reais')
          .gte('data_emissao', inicioMes)
          .lte('data_emissao', fimMes)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return allData;
    },
  });

  const isLoading = loadRanking || loadProd;

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

  // Top 10 charts for Vendedores tab
  const chartVendedores = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of vendasRaw) {
      const vend = row.vendedor_nome ?? 'Desconhecido';
      map.set(vend, (map.get(vend) ?? 0) + parseBRL(row.total_com_desconto));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [vendasRaw]);

  const chartProdutos = useMemo(() => {
    return productRanking.slice(0, 10).map(p => ({ name: p.descricao_produto, value: p.total_vendido }));
  }, [productRanking]);

  const chartFamilias = useMemo(() => {
    return familiaRanking.slice(0, 10).map(f => ({ name: f.name, value: f.total_vendido }));
  }, [familiaRanking]);

  const chartMarcas = useMemo(() => {
    return marcaRanking.slice(0, 10).map(m => ({ name: m.name, value: m.total_vendido }));
  }, [marcaRanking]);

  const top1 = ranking[0] ?? null;

  const kpis = useMemo(() => {
    const totalVendido = ranking.reduce((s, r) => s + (r.total_vendido ?? 0), 0);
    const totalComissao = ranking.reduce((s, r) => s + (r.total_comissao ?? 0), 0);
    const totalNotas = ranking.reduce((s, r) => s + (r.qtd_notas ?? 0), 0);
    const ticketMedio = totalNotas > 0 ? totalVendido / totalNotas : 0;
    return { totalVendido, totalComissao, vendedores: ranking.length, ticketMedio };
  }, [ranking]);

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

  const renderChart = (data: { name: string; value: number }[], title: string, color: string, fullWidth?: boolean) => (
    <Card className={`border-border ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 20%)" />
              <XAxis type="number" tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Faturamento" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

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
                <DataTable columns={vendedorColumns} data={ranking} rowClassName={(row: any) => row.posicao != null && row.posicao <= 3 ? 'bg-primary/5' : ''} />
              </div>

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
                      <div><span className="text-muted-foreground">Faturamento: </span><span className="font-semibold text-foreground">{fmtCompact(r.total_vendido ?? 0)}</span></div>
                      <div><span className="text-muted-foreground">Lucro: </span><span className="font-semibold text-foreground">{fmtCompact(r.lucro_total ?? 0)}</span></div>
                      <div><span className="text-muted-foreground">Comissão: </span><span className="font-semibold text-foreground">{fmtCompact(r.total_comissao ?? 0)}</span></div>
                      <div><span className="text-muted-foreground">Notas: </span><span className="text-foreground">{r.qtd_notas ?? 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top 10 Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderChart(chartVendedores, 'Top 10 Vendedores por Faturamento', 'hsl(38 90% 55%)', true)}
                {renderChart(chartProdutos, 'Top 10 Produtos por Faturamento', 'hsl(150 60% 45%)')}
                {renderChart(chartFamilias, 'Top 10 Famílias por Faturamento', 'hsl(200 80% 50%)')}
                {renderChart(chartMarcas, 'Top 10 Marcas por Faturamento', 'hsl(280 60% 55%)')}
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
                <DataTable columns={produtoColumns} data={productRanking.slice(0, 50)} rowClassName={(row: any) => row.posicao <= 3 ? 'bg-primary/5' : ''} />
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
