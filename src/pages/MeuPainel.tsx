import { useState, useMemo, useCallback, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { DataTable } from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Target, Percent, FileText, TrendingUp, Trophy, Flame, BarChart3, ShoppingCart, TrendingDown, Store, Medal, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar, LineChart, Line, ReferenceLine,
} from 'recharts';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';

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

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));

const fmtPct = (v: number | null | undefined) => `${Number(v ?? 0).toFixed(1)}%`;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const mesNome = (m: number) =>
  ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1] ?? '';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

function CircularGauge({ value, size = 140, strokeWidth = 12, label = 'Margem' }: { value: number; size?: number; strokeWidth?: number; label?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 150);
  const displayPct = Math.min(clamped, 100);
  const offset = circumference - (displayPct / 100) * circumference;
  const color = value >= 80 ? 'hsl(160 100% 42%)' : value >= 50 ? 'hsl(38 90% 55%)' : 'hsl(348 100% 62%)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(215 40% 24%)" strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-foreground">{fmtPct(value)}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function MeuPainel() {
  const { vendedor_id, nome_completo, unidade_nome, regime, role } = useAuth();
  const { periodoAno, periodoMes } = usePeriod();
  const isAdmin = role === 'admin';
  const [showAllVendas, setShowAllVendas] = useState(false);
  const [showAllProdutos, setShowAllProdutos] = useState(false);
  const [filtroFilial, setFiltroFilial] = useState('all');

  // Reset filtro ao trocar período
  useEffect(() => {
    setFiltroFilial('all');
  }, [periodoAno, periodoMes]);

  // ── controle_pj (vendedor_nome → unidade) for filial mapping ──
  const { data: controlePjFilial } = useQuery({
    queryKey: ['controle-pj-filial'],
    queryFn: async () => {
      const { data } = await supabase.from('controle_pj').select('nome_vendas, unidade');
      return (data ?? []) as { nome_vendas: string | null; unidade: string | null }[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const vendedorFilialMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of controlePjFilial ?? []) {
      if (row.nome_vendas && row.unidade) map.set(row.nome_vendas.trim(), row.unidade);
    }
    return map;
  }, [controlePjFilial]);

  const getFilial = useCallback((vendedorNome: string | null | undefined): string => {
    if (!vendedorNome) return 'Sem Filial';
    return vendedorFilialMap.get(vendedorNome.trim()) ?? 'Sem Filial';
  }, [vendedorFilialMap]);

  // ── Shared queries ──

  const { data: ranking, isLoading } = useQuery({
    queryKey: ['ranking', periodoAno, periodoMes],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_ranking')
        .select('*')
        .eq('periodo_ano', periodoAno)
        .eq('periodo_mes', periodoMes)
        .order('posicao', { ascending: true });
      return data ?? [];
    },
    staleTime: 0,
  });

  const { data: controlePj } = useQuery({
    queryKey: ['controle-pj'],
    queryFn: async () => {
      const { data } = await supabase.from('controle_pj').select('*');
      return data ?? [];
    },
    staleTime: 0,
  });

  // Build nome lookup: use both nome_vendas and nome (case-insensitive)
  const nomeVendasList = useMemo(() => {
    const pjList = controlePj ?? [];
    const names: string[] = [];
    for (const c of pjList) {
      if ((c as any).nome_vendas) names.push((c as any).nome_vendas);
      if (c.nome) names.push(c.nome);
    }
    return [...new Set(names.filter(Boolean))];
  }, [controlePj]);

  const { data: vendasCountRaw } = useQuery({
    queryKey: ['vendas-count-pj', nomeVendasList.sort().join(',')],
    enabled: nomeVendasList.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas')
        .select('vendedor_nome, total_com_desconto');
      return data ?? [];
    },
    staleTime: 0,
  });

  // Vendas com data (para gráfico cronológico)
  const { data: vendasComDataRaw } = useQuery({
    queryKey: ['vendas-com-data'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas')
        .select('data_emissao, total_mercadoria, vendedor_nome')
        .order('data_emissao', { ascending: true });
      return (data ?? []).filter(r => r.data_emissao);
    },
    staleTime: 0,
  });

  const { data: vendasGeraisRaw } = useQuery({
    queryKey: ['vendas-gerais'],
    queryFn: async () => {
      const { data } = await supabase.from('vendas_gerais').select('total_mercadoria');
      return data ?? [];
    },
    staleTime: 0,
  });

  // ── Admin: all sales ──
  const { data: allVendas } = useQuery({
    queryKey: ['vendas-all-admin'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas')
        .select('data_emissao, total_com_desconto, lucros_reais, margem_percentual, nota_fiscal, vendedor_nome, descricao_produto, marca, quantidade, cnpj_empresa')
        .order('data_emissao', { ascending: false })
        .limit(5000);
      return data ?? [];
    },
    staleTime: 0,
  });

  // ── Vendedor: individual sales ──
  const vendedorNomeOmie = useQuery({
    queryKey: ['vendedor-logado', vendedor_id],
    enabled: !!vendedor_id && !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendedores')
        .select('nome_omie')
        .eq('id', vendedor_id!)
        .maybeSingle();
      return data;
    },
  });

  // Find the nome_vendas that matches logged-in vendedor
  const myNomeVendas = (() => {
    if (isAdmin) return null;
    const pjList = controlePj ?? [];
    // Match by nome_completo
    const byName = pjList.find(p => nome_completo && p.nome.toLowerCase().trim() === nome_completo.toLowerCase().trim());
    if (byName) return (byName as any).nome_vendas as string | null;
    // Match by nome_omie
    const omie = vendedorNomeOmie.data?.nome_omie;
    if (omie) {
      const byOmie = pjList.find(p => (p as any).nome_vendas && (p as any).nome_vendas.toLowerCase().trim() === omie.toLowerCase().trim());
      if (byOmie) return (byOmie as any).nome_vendas as string | null;
    }
    return null;
  })();

  const { data: vendasIndividuais } = useQuery({
    queryKey: ['vendas-individual', myNomeVendas],
    enabled: !isAdmin && !!myNomeVendas,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas')
        .select('*')
        .eq('vendedor_nome', myNomeVendas!)
        .order('data_emissao', { ascending: false });
      return data ?? [];
    },
  });

  const { data: historico } = useQuery({
    queryKey: ['historico', vendedor_id],
    enabled: !!vendedor_id && !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas_periodo')
        .select('periodo_ano, periodo_mes, total_vendido, total_comissao, percentual_aplicado, qtd_notas, margem_media')
        .eq('vendedor_id', vendedor_id!)
        .order('periodo_ano', { ascending: true })
        .order('periodo_mes', { ascending: true })
        .limit(12);
      return data ?? [];
    },
  });

  // ── Ranking PJ (shared) ──
  const rankingPj = (() => {
    const pjList = controlePj ?? [];
    const vendasRows = vendasCountRaw ?? [];
    // Normalize helper
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    // Build count/revenue maps by normalized vendedor_nome
    const countMap: Record<string, number> = {};
    const revenueMap: Record<string, number> = {};
    vendasRows.forEach(v => {
      const nome = v.vendedor_nome ?? '';
      const key = norm(nome);
      countMap[key] = (countMap[key] ?? 0) + 1;
      revenueMap[key] = (revenueMap[key] ?? 0) + parseMoneyBR(v.total_com_desconto);
    });
    const ranked = pjList.map(pj => {
      const nomeVendas = (pj as any).nome_vendas as string | null;
      // Try nome_vendas first, then nome
      const key1 = nomeVendas ? norm(nomeVendas) : '';
      const key2 = pj.nome ? norm(pj.nome) : '';
      const qtd = (key1 && countMap[key1]) ? countMap[key1] : (key2 && countMap[key2]) ? countMap[key2] : 0;
      const total = (key1 && revenueMap[key1]) ? revenueMap[key1] : (key2 && revenueMap[key2]) ? revenueMap[key2] : 0;
      return {
        nome: pj.nome,
        unidade: pj.unidade ?? '—',
        nome_vendas: nomeVendas,
        qtd_vendas: qtd,
        total_arrecadado: total,
      };
    });
    ranked.sort((a, b) => b.qtd_vendas - a.qtd_vendas);
    return ranked.map((r, i) => ({ ...r, posicao: i + 1 }));
  })();

  // ── Aggregations ──
  const vendasSourceRaw = isAdmin ? (allVendas ?? []) : (vendasIndividuais ?? []);

  // Filial options for admin filter
  const filialOptions = useMemo(() => {
    if (!isAdmin) return [];
    const set = new Set<string>();
    for (const v of vendasSourceRaw) {
      set.add(getFilial(v.vendedor_nome));
    }
    return Array.from(set).sort();
  }, [vendasSourceRaw, isAdmin, getFilial]);

  const vendasSource = useMemo(() => {
    if (filtroFilial === 'all') return vendasSourceRaw;
    return vendasSourceRaw.filter(v => getFilial(v.vendedor_nome) === filtroFilial);
  }, [vendasSourceRaw, filtroFilial, getFilial]);

  const vendasAgg = (() => {
    const rows = vendasSource;
    const totalVendido = rows.reduce((s, r) => s + parseMoneyBR(r.total_com_desconto), 0);
    const totalLucro = rows.reduce((s, r) => s + parseMoneyBR(r.lucros_reais), 0);
    const margens = rows.map(r => parsePctBR(r.margem_percentual)).filter(v => v !== 0);
    const margemMedia = margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : 0;
    const notasSet = new Set(rows.map(r => r.nota_fiscal).filter(Boolean));
    return { totalVendido, totalLucro, margemMedia, qtdNotas: notasSet.size, qtdItens: rows.length };
  })();

  const vendasGeraisAgg = (() => {
    const rows = vendasGeraisRaw ?? [];
    const valores = rows.map(r => parseMoneyBR(r.total_mercadoria)).filter(v => v > 0).sort((a, b) => a - b);
    const totalGeral = valores.reduce((s, v) => s + v, 0);
    const qtdItens = valores.length;
    const ticketMedio = qtdItens > 0 ? totalGeral / qtdItens : 0;
    const mediana = qtdItens > 0
      ? qtdItens % 2 === 0
        ? (valores[qtdItens / 2 - 1] + valores[qtdItens / 2]) / 2
        : valores[Math.floor(qtdItens / 2)]
      : 0;
    return { totalGeral, qtdItens, ticketMedio, mediana };
  })();

  // ── Vendedor-specific derived data ──
  const ticketMedioIndividual = !isAdmin && vendasAgg.qtdItens > 0 ? vendasAgg.totalVendido / vendasAgg.qtdItens : 0;

  const vendasPorDia = (() => {
    const map: Record<string, number> = {};
    vendasSource.forEach(r => {
      const d = r.data_emissao ?? 'Sem data';
      map[d] = (map[d] ?? 0) + parseMoneyBR(r.total_com_desconto);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([dia, total]) => ({ dia, total }));
  })();

  const vendasTableData = vendasSource.map(r => ({
    data_emissao: r.data_emissao ?? '—',
    nota_fiscal: r.nota_fiscal ?? '—',
    produto: r.descricao_produto ?? '—',
    marca: r.marca ?? '—',
    quantidade: r.quantidade ?? '—',
    total: r.total_com_desconto ?? '—',
    margem: r.margem_percentual ?? '—',
    lucro: r.lucros_reais ?? '—',
    ...(isAdmin ? { vendedor: r.vendedor_nome ?? '—' } : {}),
  }));

  const meusDados = ranking?.find(r => r.vendedor_id === vendedor_id);
  const totalVendedores = ranking?.length ?? 0;
  const mediaTime = totalVendedores > 0
    ? ranking!.reduce((s, r) => s + Number(r.total_vendido ?? 0), 0) / totalVendedores
    : 0;

  const primeiroNome = isAdmin ? 'Administrador' : ((nome_completo ?? '').split(' ')[0] || 'Vendedor');
  const posicao = meusDados?.posicao ?? null;
  const meuTotal = meusDados ? Number(meusDados.total_vendido ?? 0) : vendasAgg.totalVendido;

  const minhaPosicaoPj = !isAdmin ? rankingPj.find(r => {
    if (nome_completo && r.nome.toLowerCase().trim() === nome_completo.toLowerCase().trim()) return true;
    if (vendedorNomeOmie.data?.nome_omie && r.nome_vendas && r.nome_vendas.toLowerCase().trim() === vendedorNomeOmie.data.nome_omie.toLowerCase().trim()) return true;
    return false;
  }) : null;

  const acima = posicao && posicao > 1 ? ranking?.find(r => r.posicao === posicao - 1) : null;
  const abaixo = posicao === 1 && ranking && ranking.length > 1 ? ranking.find(r => r.posicao === 2) : null;
  const diffAcima = acima ? Number(acima.total_vendido ?? 0) - meuTotal : 0;
  const diffAbaixo = abaixo ? meuTotal - Number(abaixo.total_vendido ?? 0) : 0;

  // For admin, use global ticket medio for comparisons
  const displayTicket = isAdmin ? vendasGeraisAgg.ticketMedio : ticketMedioIndividual;
  const barMaxTicket = Math.max(displayTicket, vendasGeraisAgg.ticketMedio, 1);
  const meuTicketPct = (displayTicket / barMaxTicket) * 100;
  const geralTicketPct = (vendasGeraisAgg.ticketMedio / barMaxTicket) * 100;
  const diffTicket = displayTicket - vendasGeraisAgg.ticketMedio;

  const margemAdmin = vendasAgg.totalVendido > 0
    ? (vendasAgg.totalLucro / vendasAgg.totalVendido) * 100
    : 0;
  const margem = isAdmin ? margemAdmin : (meusDados?.margem_media ? Number(meusDados.margem_media) : vendasAgg.margemMedia);

  const displayedVendas = showAllVendas ? vendasTableData : vendasTableData.slice(0, 10);
  const remainingVendas = vendasTableData.length - 10;

  // ── Produtos mais vendidos (agregação) ──
  const topProdutos = (() => {
    const map = new Map<string, { count: number; qty: number; total: number; marca: string }>();
    vendasSource.forEach(v => {
      const nome = v.descricao_produto ?? '';
      if (!nome) return;
      const current = map.get(nome) ?? { count: 0, qty: 0, total: 0, marca: v.marca ?? '—' };
      map.set(nome, {
        count: current.count + 1,
        qty: current.qty + parseFloat(String(v.quantidade ?? '0').replace(',', '.') || '0'),
        total: current.total + parseMoneyBR(v.total_com_desconto),
        marca: current.marca,
      });
    });
    return Array.from(map.entries())
      .map(([nome, d], _i) => ({ nome, ...d }))
      .sort((a, b) => b.count - a.count);
  })();
  const displayedProdutos = showAllProdutos ? topProdutos : topProdutos.slice(0, 10);
  const remainingProdutos = topProdutos.length - 10;

  if (isLoading) {
    return (
      <AppShell title="Meu Painel">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={isAdmin ? 'Painel Administrativo' : 'Meu Painel'}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* HEADER */}
        <motion.div
          variants={item}
          className="relative overflow-hidden rounded-xl border border-border shadow-card"
          style={{ background: 'linear-gradient(135deg, hsl(38 90% 55% / 0.05), hsl(216 40% 14%) 40%, hsl(216 40% 14%))' }}
        >
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {isAdmin ? (
                    <>Painel Administrativo <span className="inline-block">📊</span></>
                  ) : (
                    <>Olá, {primeiroNome}! <span className="inline-block">💪</span></>
                  )}
                </h2>
                {!isAdmin && (
                  <p className="text-sm text-secondary-foreground">{unidade_nome} • {regime}</p>
                )}
                <p className="text-xs text-muted-foreground">{mesNome(periodoMes)} / {periodoAno}</p>
              </div>
              {isAdmin && filialOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Select value={filtroFilial} onValueChange={setFiltroFilial}>
                    <SelectTrigger className="w-[200px] bg-background/50 border-border">
                      <SelectValue placeholder="Todas as Filiais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Filiais</SelectItem>
                      {filialOptions.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isAdmin && (
                <div className="flex flex-col items-center">
                  <div
                    className={`h-20 w-20 rounded-full flex items-center justify-center border-2 text-3xl font-black transition-all ${
                      posicao && posicao <= 3
                        ? 'text-primary border-primary bg-primary/10 glow-gold'
                        : posicao && posicao <= 10
                          ? 'text-secondary-foreground border-border bg-secondary'
                          : 'text-foreground border-border bg-secondary'
                    }`}
                  >
                    {posicao ? `#${posicao}` : '—'}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-2">de {totalVendedores} vendedores</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* KPI CARDS */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={DollarSign} label="Total Vendido" value={fmt(vendasAgg.totalVendido)} subtitle={!isAdmin && meusDados ? `Comissão: ${fmt(meusDados.total_comissao)}` : isAdmin ? 'Todas as vendas' : undefined} accentColor="hsl(38 90% 55%)" />
          <KPICard icon={TrendingUp} label="Total Lucro" value={fmt(vendasAgg.totalLucro)} accentColor="hsl(160 100% 42%)" />
          <KPICard icon={Percent} label="Margem Média" value={fmtPct(vendasAgg.margemMedia)} subtitle={!isAdmin && meusDados ? `% Comissão: ${fmtPct(meusDados.percentual_aplicado)}` : undefined} accentColor="hsl(210 80% 55%)" />
          <KPICard icon={FileText} label="Notas Fiscais" value={String(vendasAgg.qtdNotas)} subtitle={`${vendasAgg.qtdItens} itens`} accentColor="hsl(215 30% 50%)" />
        </motion.div>

        {/* MÉDIA GERAL DE VENDAS */}
        <motion.div variants={item}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3 flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            {isAdmin ? 'Média Geral de Vendas (Empresa)' : 'Média Geral de Vendas (Empresa)'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard icon={ShoppingCart} label="Ticket Médio Geral" value={fmt(vendasGeraisAgg.ticketMedio)} subtitle={isAdmin ? `Mediana: ${fmt(vendasGeraisAgg.mediana)}` : `Mediana: ${fmt(vendasGeraisAgg.mediana)} | Seu: ${fmt(ticketMedioIndividual)}`} accentColor="hsl(200 80% 50%)" />
            <KPICard icon={FileText} label="Qtd Total de Itens" value={String(vendasGeraisAgg.qtdItens)} subtitle={isAdmin ? 'Total de itens vendidos' : `Seus itens: ${vendasAgg.qtdItens}`} accentColor="hsl(330 70% 55%)" />
          </div>
        </motion.div>

        {/* COMPARATIVO + GAUGE (+ Posição PJ para vendedor) */}
        <motion.div variants={item} className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
          {/* Posição PJ - only for vendedor */}
          {!isAdmin && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-card flex flex-col items-center text-center relative overflow-hidden">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Sua Posição PJ</p>
              <div className="relative">
                {minhaPosicaoPj && minhaPosicaoPj.posicao <= 3 && (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="55" fill="none" stroke="hsl(38 90% 55%)" strokeWidth="1" opacity="0.15" />
                    <circle cx="60" cy="60" r="48" fill="none" stroke="hsl(38 90% 55%)" strokeWidth="0.5" opacity="0.1" />
                  </svg>
                )}
                <span
                  className={`font-black leading-none ${minhaPosicaoPj && minhaPosicaoPj.posicao <= 3 ? 'text-gradient-gold' : 'text-foreground'}`}
                  style={{ fontSize: '5.5rem' }}
                >
                  {minhaPosicaoPj ? minhaPosicaoPj.posicao : '—'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">de {rankingPj.length} vendedores PJ</p>
              {minhaPosicaoPj && minhaPosicaoPj.posicao === 1 && (
                <div className="mt-5 space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <p className="text-primary font-bold">Top Performer PJ!</p>
                  </div>
                  {rankingPj[1] && (
                    <p className="text-xs text-secondary-foreground">
                      {minhaPosicaoPj.qtd_vendas - rankingPj[1].qtd_vendas} vendas à frente de #{2}
                    </p>
                  )}
                </div>
              )}
              {minhaPosicaoPj && minhaPosicaoPj.posicao > 1 && (
                <div className="mt-5 w-full space-y-3">
                  <p className="text-sm text-secondary-foreground">
                    Falta <span className="text-primary font-bold">{rankingPj[minhaPosicaoPj.posicao - 2].qtd_vendas - minhaPosicaoPj.qtd_vendas}</span> vendas para alcançar
                  </p>
                  <p className="text-xs text-muted-foreground">#{minhaPosicaoPj.posicao - 1} posição</p>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, hsl(38 90% 55%), hsl(40 95% 65%))' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${rankingPj[minhaPosicaoPj.posicao - 2].qtd_vendas > 0 ? (minhaPosicaoPj.qtd_vendas / rankingPj[minhaPosicaoPj.posicao - 2].qtd_vendas) * 100 : 0}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Suas vendas: {minhaPosicaoPj.qtd_vendas} | Acima: {rankingPj[minhaPosicaoPj.posicao - 2].qtd_vendas}</p>
                </div>
              )}
              {!minhaPosicaoPj && (
                <p className="text-sm text-muted-foreground mt-4">Vendedor não encontrado no controle PJ</p>
              )}
            </div>
          )}

          {/* Comparativo Ticket Médio */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-card">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
              {isAdmin ? 'Ticket Médio vs Mediana' : 'Você vs Média da Empresa'}
            </p>
            <p className="text-[10px] text-muted-foreground mb-4">
              {isAdmin ? 'Comparativo do ticket médio geral contra a mediana' : 'Comparativo contra a média geral de vendas'}
            </p>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-semibold">{isAdmin ? 'Ticket Médio' : 'Seu Ticket'}</span>
                  <span className="text-foreground font-bold">{fmt(displayTicket)}</span>
                </div>
                <div className="h-5 rounded-full bg-secondary overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: isAdmin ? 'linear-gradient(90deg, hsl(270 60% 55%), hsl(280 70% 65%))' : (diffTicket >= 0 ? 'linear-gradient(90deg, hsl(38 90% 55%), hsl(40 95% 65%))' : 'hsl(215 30% 40%)') }}
                    initial={{ width: 0 }}
                    animate={{ width: `${meuTicketPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-secondary-foreground">{isAdmin ? 'Mediana' : 'Média Geral'}</span>
                  <span className="text-secondary-foreground">{isAdmin ? fmt(vendasGeraisAgg.mediana) : fmt(vendasGeraisAgg.ticketMedio)}</span>
                </div>
                <div className="h-5 rounded-full bg-secondary overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full bg-secondary-foreground/30"
                    initial={{ width: 0 }}
                    animate={{ width: `${isAdmin ? (vendasGeraisAgg.mediana / barMaxTicket) * 100 : geralTicketPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
            {!isAdmin && (
              <div className="mt-6 flex items-center gap-2">
                {diffTicket > 0 ? (
                  <>
                    <Flame className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-success font-bold text-sm">Acima da média!</p>
                      <p className="text-xs text-muted-foreground">{fmt(diffTicket)} acima por item</p>
                    </div>
                  </>
                ) : diffTicket < 0 ? (
                  <>
                    <Target className="h-5 w-5 text-primary" />
                    <p className="text-primary font-semibold text-sm">Falta {fmt(Math.abs(diffTicket))} por item para a média</p>
                  </>
                ) : (
                  <p className="text-secondary-foreground text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Na média
                  </p>
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-3">Média: {fmt(vendasGeraisAgg.ticketMedio)} | Mediana: {fmt(vendasGeraisAgg.mediana)}</p>
          </div>

          {/* Gauge */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-card flex flex-col items-center text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
              {isAdmin ? 'Margem Média Geral' : 'Seu Ticket vs Média'}
            </p>
            {isAdmin ? (
              <div className="flex flex-col items-center gap-4">
                {(() => {
                  const val = margemAdmin;
                  const clamped = Math.min(Math.max(val, 0), 150);
                  const displayPct = Math.min(clamped, 100);
                  const sizeG = 140, swG = 12;
                  const radiusG = (sizeG - swG) / 2;
                  const circG = 2 * Math.PI * radiusG;
                  const offsetG = circG - (displayPct / 100) * circG;
                  const colorG = val >= 55 ? 'hsl(160 100% 42%)' : val >= 45 ? 'hsl(38 90% 55%)' : 'hsl(348 100% 62%)';
                  return (
                    <div className="relative" style={{ width: sizeG, height: sizeG }}>
                      <svg width={sizeG} height={sizeG} className="-rotate-90">
                        <circle cx={sizeG/2} cy={sizeG/2} r={radiusG} fill="none" stroke="hsl(215 40% 24%)" strokeWidth={swG} />
                        <motion.circle cx={sizeG/2} cy={sizeG/2} r={radiusG} fill="none" stroke={colorG} strokeWidth={swG} strokeLinecap="round" strokeDasharray={circG} initial={{ strokeDashoffset: circG }} animate={{ strokeDashoffset: offsetG }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold text-foreground">{fmtPct(val)}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Margem</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'hsl(160 100% 42%)' }} />≥55%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'hsl(38 90% 55%)' }} />≥45%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'hsl(348 100% 62%)' }} />&lt;45%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Margem ponderada por receita</p>
              </div>
            ) : vendasGeraisAgg.ticketMedio > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <CircularGauge value={vendasGeraisAgg.ticketMedio > 0 ? (ticketMedioIndividual / vendasGeraisAgg.ticketMedio) * 100 : 0} label="vs Média" />
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'hsl(160 100% 42%)' }} />≥80%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'hsl(38 90% 55%)' }} />≥50%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'hsl(348 100% 62%)' }} />&lt;60%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Seu ticket: {fmt(ticketMedioIndividual)} | Média: {fmt(vendasGeraisAgg.ticketMedio)}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </div>
        </motion.div>

        {/* VENDAS DA EMPRESA - LineChart por Data */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Vendas da Empresa</p>
          </div>
          {(() => {
            const rows = vendasComDataRaw ?? [];
            const mapEmpresa: Record<string, number> = {};
            rows.forEach(r => {
              const dateStr = r.data_emissao ?? '';
              if (!dateStr) return;
              const val = parseMoneyBR(r.total_mercadoria);
              if (val <= 0) return;
              mapEmpresa[dateStr] = (mapEmpresa[dateStr] ?? 0) + val;
            });

            const mapVendedor: Record<string, number> = {};
            if (!isAdmin) {
              (vendasIndividuais ?? []).forEach(r => {
                const dateStr = r.data_emissao ?? '';
                if (!dateStr) return;
                const val = parseMoneyBR(r.total_com_desconto);
                if (val <= 0) return;
                mapVendedor[dateStr] = (mapVendedor[dateStr] ?? 0) + val;
              });
            }

            const allDates = new Set([...Object.keys(mapEmpresa), ...Object.keys(mapVendedor)]);
            const chartDataEmpresa = Array.from(allDates)
              .sort((a, b) => a.localeCompare(b))
              .map(dateStr => {
                const parts = dateStr.split('-');
                const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
                return { label, empresa: mapEmpresa[dateStr] ?? 0, vendedor: mapVendedor[dateStr] ?? 0 };
              });

            if (chartDataEmpresa.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Dados de vendas gerais indisponíveis</p>
                </div>
              );
            }

            return (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartDataEmpresa}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" />
                  <XAxis dataKey="label" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} tickFormatter={v => fmt(v)} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 10 }}
                    labelStyle={{ color: '#fff', fontWeight: 600 }}
                    formatter={(v: number, name: string) => [fmt(v), name === 'empresa' ? 'Empresa' : 'Suas Vendas']}
                  />
                  <Legend formatter={(value) => value === 'empresa' ? 'Empresa' : 'Suas Vendas'} />
                  <ReferenceLine y={vendasGeraisAgg.mediana} stroke="hsl(160 100% 42%)" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Mediana: ${fmt(vendasGeraisAgg.mediana)}`, position: 'insideTopRight', fill: 'hsl(160 100% 42%)', fontSize: 11 }} />
                  <ReferenceLine y={vendasGeraisAgg.ticketMedio} stroke="hsl(38 90% 55%)" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: `Média: ${fmt(vendasGeraisAgg.ticketMedio)}`, position: 'insideBottomRight', fill: 'hsl(38 90% 55%)', fontSize: 10 }} />
                  <Line type="monotone" dataKey="empresa" stroke="hsl(270 60% 55%)" strokeWidth={2} dot={false} />
                  {!isAdmin && <Line type="monotone" dataKey="vendedor" stroke="hsl(38 90% 55%)" strokeWidth={2} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            );
          })()}
        </motion.div>

        {/* GRÁFICO VENDAS POR DIA */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Vendas por Dia</p>
          </div>
          {vendasPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" />
                <XAxis dataKey="dia" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} tickFormatter={v => `R$${v.toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 10 }}
                  labelStyle={{ color: '#fff', fontWeight: 600 }}
                  formatter={(v: number) => [fmt(v), 'Total Vendido']}
                />
                <Bar dataKey="total" fill="hsl(38 90% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Sem dados de vendas</p>
          )}
        </motion.div>

        {/* PRODUTOS MAIS VENDIDOS */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Produtos Mais Vendidos</p>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Qtd Vendida</TableHead>
                  <TableHead className="text-right">Total Arrecadado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedProdutos.map((p, i) => (
                  <TableRow key={p.nome} className="border-border">
                    <TableCell className="font-bold">{i + 1}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{p.marca}</TableCell>
                    <TableCell className="text-right font-bold">{p.qty % 1 === 0 ? p.qty : p.qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(p.total)}</TableCell>
                  </TableRow>
                ))}
                {topProdutos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {topProdutos.length > 10 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAllProdutos(!showAllProdutos)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                {showAllProdutos ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Ver mais ({remainingProdutos} restantes)
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* TABELA DETALHADA - limitada a 10 com "Ver mais" */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 shadow-card">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Detalhamento de Vendas</p>
          <DataTable
            columns={[
              { key: 'data_emissao', label: 'Data Emissão' },
              { key: 'nota_fiscal', label: 'NF' },
              ...(isAdmin ? [{ key: 'vendedor' as const, label: 'Vendedor' }] : []),
              { key: 'produto', label: 'Produto' },
              { key: 'marca', label: 'Marca' },
              { key: 'quantidade', label: 'Qtd', align: 'right' as const },
              { key: 'total', label: 'Total c/ Desc.', align: 'right' as const },
              { key: 'margem', label: 'Margem %', align: 'right' as const },
              { key: 'lucro', label: 'Lucro', align: 'right' as const },
            ]}
            data={displayedVendas}
          />
          {vendasTableData.length > 10 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAllVendas(!showAllVendas)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                {showAllVendas ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Ver mais ({remainingVendas} restantes)
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* RANKING GERAL DE VENDAS PJ - movido para o final */}
        {isAdmin && (
          <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium">Ranking Geral de Vendas (PJ)</p>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Total Arrecadado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingPj.map((r) => (
                    <TableRow key={r.nome} className={`border-border ${r.posicao <= 3 ? 'bg-primary/5' : ''}`}>
                      <TableCell className="font-bold text-lg">
                        {r.posicao <= 3 ? MEDAL[r.posicao - 1] : r.posicao}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className={`font-semibold ${r.posicao <= 3 ? 'text-primary' : 'text-foreground'}`}>{r.nome}</span>
                          <span className="block text-xs text-muted-foreground">{r.unidade}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{r.qtd_vendas}</TableCell>
                      <TableCell className="text-right font-bold">{fmt(r.total_arrecadado)}</TableCell>
                    </TableRow>
                  ))}
                  {rankingPj.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem dados de ranking</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
