import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { DataTable } from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Target, Percent, FileText, TrendingUp, Trophy, Flame, BarChart3, ShoppingCart, TrendingDown, Store, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar, LineChart, Line, ReferenceLine,
} from 'recharts';

const parseMoneyBR = (str: string | null | undefined): number => {
  if (!str) return 0;
  const cleaned = str.replace(/[R$\s.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

const parsePctBR = (str: string | null | undefined): number => {
  if (!str) return 0;
  const cleaned = str.replace('%', '').replace(/\s/g, '').replace(',', '.');
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

export default function MeuPainel() {
  const { vendedor_id, nome_completo, unidade_nome, regime } = useAuth();
  const { periodoAno, periodoMes } = usePeriod();

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
  });

  const { data: historico } = useQuery({
    queryKey: ['historico', vendedor_id],
    enabled: !!vendedor_id,
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

  const { data: vendasLucas } = useQuery({
    queryKey: ['vendas-lucas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas')
        .select('*')
        .eq('vendedor_nome', 'LUCAS VILAR')
        .order('data_emissao', { ascending: false });
      return data ?? [];
    },
  });

  // Query: controle_pj (ranking PJ)
  const { data: controlePj } = useQuery({
    queryKey: ['controle-pj'],
    queryFn: async () => {
      const { data } = await supabase
        .from('controle_pj')
        .select('*');
      return data ?? [];
    },
  });

  // Query: contagem de vendas por vendedor_nome (para ranking PJ)
  const nomeVendasList = (controlePj ?? []).map(c => (c as any).nome_vendas).filter(Boolean) as string[];
  const { data: vendasCountRaw } = useQuery({
    queryKey: ['vendas-count-pj', nomeVendasList.sort().join(',')],
    enabled: nomeVendasList.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas')
        .select('vendedor_nome')
        .in('vendedor_nome', nomeVendasList);
      return data ?? [];
    },
  });

  // Ranking PJ: contar vendas e ordenar
  const rankingPj = (() => {
    const pjList = controlePj ?? [];
    const vendasRows = vendasCountRaw ?? [];
    
    // Contar vendas por vendedor_nome
    const countMap: Record<string, number> = {};
    vendasRows.forEach(v => {
      const nome = v.vendedor_nome ?? '';
      countMap[nome] = (countMap[nome] ?? 0) + 1;
    });

    // Montar ranking
    const ranked = pjList.map(pj => ({
      nome: pj.nome,
      unidade: pj.unidade ?? '—',
      nome_vendas: (pj as any).nome_vendas as string | null,
      qtd_vendas: (pj as any).nome_vendas ? (countMap[(pj as any).nome_vendas] ?? 0) : 0,
    }));

    // Ordenar por qtd_vendas DESC
    ranked.sort((a, b) => b.qtd_vendas - a.qtd_vendas);

    // Atribuir posição
    return ranked.map((r, i) => ({ ...r, posicao: i + 1 }));
  })();

  // Buscar nome_omie do vendedor logado para match alternativo
  const { data: vendedorLogado } = useQuery({
    queryKey: ['vendedor-logado', vendedor_id],
    enabled: !!vendedor_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendedores')
        .select('nome_omie')
        .eq('id', vendedor_id!)
        .maybeSingle();
      return data;
    },
  });

  const minhaPosicaoPj = rankingPj.find(r => {
    // Match por nome_completo (controle_pj.nome)
    if (nome_completo && r.nome.toLowerCase().trim() === nome_completo.toLowerCase().trim()) return true;
    // Match por nome_omie (controle_pj.nome_vendas)
    if (vendedorLogado?.nome_omie && r.nome_vendas && r.nome_vendas.toLowerCase().trim() === vendedorLogado.nome_omie.toLowerCase().trim()) return true;
    return false;
  });

  // Nova query: vendas_gerais
  const { data: vendasGeraisRaw } = useQuery({
    queryKey: ['vendas-gerais'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendas_gerais')
        .select('total_mercadoria');
      return data ?? [];
    },
  });

  // Nova query: vendas_gerais (original kept)

  // Agregados de vendas_gerais
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

  const vendasAgg = (() => {
    const rows = vendasLucas ?? [];
    const totalVendido = rows.reduce((s, r) => s + parseMoneyBR(r.total_com_desconto), 0);
    const totalLucro = rows.reduce((s, r) => s + parseMoneyBR(r.lucros_reais), 0);
    const margens = rows.map(r => parsePctBR(r.margem_percentual)).filter(v => v !== 0);
    const margemMedia = margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : 0;
    const notasSet = new Set(rows.map(r => r.nota_fiscal).filter(Boolean));
    return { totalVendido, totalLucro, margemMedia, qtdNotas: notasSet.size, qtdItens: rows.length };
  })();

  // Ticket médio individual
  const ticketMedioIndividual = vendasAgg.qtdItens > 0 ? vendasAgg.totalVendido / vendasAgg.qtdItens : 0;

  const vendasPorDia = (() => {
    const map: Record<string, number> = {};
    (vendasLucas ?? []).forEach(r => {
      const d = r.data_emissao ?? 'Sem data';
      map[d] = (map[d] ?? 0) + parseMoneyBR(r.total_com_desconto);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([dia, total]) => ({ dia, total }));
  })();

  const vendasTableData = (vendasLucas ?? []).map(r => ({
    data_emissao: r.data_emissao ?? '—',
    nota_fiscal: r.nota_fiscal ?? '—',
    produto: r.descricao_produto ?? '—',
    marca: r.marca ?? '—',
    quantidade: r.quantidade ?? '—',
    total: r.total_com_desconto ?? '—',
    margem: r.margem_percentual ?? '—',
    lucro: r.lucros_reais ?? '—',
  }));

  const meusDados = ranking?.find(r => r.vendedor_id === vendedor_id);
  const totalVendedores = ranking?.length ?? 0;
  const mediaTime = totalVendedores > 0
    ? ranking!.reduce((s, r) => s + Number(r.total_vendido ?? 0), 0) / totalVendedores
    : 0;

  const primeiroNome = (nome_completo ?? '').split(' ')[0] || 'Vendedor';
  const posicao = meusDados?.posicao ?? null;
  const meuTotal = meusDados ? Number(meusDados.total_vendido ?? 0) : vendasAgg.totalVendido;

  const acima = posicao && posicao > 1 ? ranking?.find(r => r.posicao === posicao - 1) : null;
  const abaixo = posicao === 1 && ranking && ranking.length > 1 ? ranking.find(r => r.posicao === 2) : null;

  const diffAcima = acima ? Number(acima.total_vendido ?? 0) - meuTotal : 0;
  const diffAbaixo = abaixo ? meuTotal - Number(abaixo.total_vendido ?? 0) : 0;

  const chartData = (historico ?? []).map(h => ({
    label: `${MESES[(h.periodo_mes ?? 1) - 1]}/${String(h.periodo_ano).slice(2)}`,
    vendido: Number(h.total_vendido ?? 0),
    comissao: Number(h.total_comissao ?? 0),
  }));

  // Margem: usar vendasAgg como fallback
  const margem = meusDados?.margem_media ? Number(meusDados.margem_media) : vendasAgg.margemMedia;

  // Comparativo: ticket médio individual vs média geral
  const barMaxTicket = Math.max(ticketMedioIndividual, vendasGeraisAgg.ticketMedio, 1);
  const meuTicketPct = (ticketMedioIndividual / barMaxTicket) * 100;
  const geralTicketPct = (vendasGeraisAgg.ticketMedio / barMaxTicket) * 100;
  const diffTicket = ticketMedioIndividual - vendasGeraisAgg.ticketMedio;

  // Evolução diária como fallback
  const evolucaoDiaria = vendasPorDia.map(d => ({
    label: d.dia,
    vendido: d.total,
  }));

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
    <AppShell title="Meu Painel">
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
                  Olá, {primeiroNome}! <span className="inline-block">💪</span>
                </h2>
                <p className="text-sm text-secondary-foreground">{unidade_nome} • {regime}</p>
                <p className="text-xs text-muted-foreground">{mesNome(periodoMes)} / {periodoAno}</p>
              </div>
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
            </div>
            {/* Mini KPIs inline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Vendido</p>
                  <p className="text-sm font-bold text-foreground">{fmt(vendasAgg.totalVendido)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: 'hsl(160 100% 42%)' }} />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Lucro</p>
                  <p className="text-sm font-bold text-foreground">{fmt(vendasAgg.totalLucro)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                <Percent className="h-3.5 w-3.5" style={{ color: 'hsl(210 80% 55%)' }} />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Margem</p>
                  <p className="text-sm font-bold text-foreground">{fmtPct(vendasAgg.margemMedia)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                <FileText className="h-3.5 w-3.5" style={{ color: 'hsl(215 30% 50%)' }} />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Notas</p>
                  <p className="text-sm font-bold text-foreground">{vendasAgg.qtdNotas}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI CARDS - Dados reais da tabela vendas */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={DollarSign} label="Total Vendido" value={fmt(vendasAgg.totalVendido)} subtitle={meusDados ? `Comissão: ${fmt(meusDados.total_comissao)}` : undefined} accentColor="hsl(38 90% 55%)" />
          <KPICard icon={TrendingUp} label="Total Lucro" value={fmt(vendasAgg.totalLucro)} accentColor="hsl(160 100% 42%)" />
          <KPICard icon={Percent} label="Margem Média" value={fmtPct(vendasAgg.margemMedia)} subtitle={meusDados ? `% Comissão: ${fmtPct(meusDados.percentual_aplicado)}` : undefined} accentColor="hsl(210 80% 55%)" />
          <KPICard icon={FileText} label="Notas Fiscais" value={String(vendasAgg.qtdNotas)} subtitle={`${vendasAgg.qtdItens} itens`} accentColor="hsl(215 30% 50%)" />
        </motion.div>

        {/* MÉDIA GERAL DE VENDAS - Dados de vendas_gerais */}
        <motion.div variants={item}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3 flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Média Geral de Vendas (Empresa)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard icon={DollarSign} label="Total Geral Vendido" value={fmt(vendasGeraisAgg.totalGeral)} subtitle="Todas as vendas da empresa" accentColor="hsl(270 60% 55%)" />
            <KPICard icon={ShoppingCart} label="Ticket Médio Geral" value={fmt(vendasGeraisAgg.ticketMedio)} subtitle={`Mediana: ${fmt(vendasGeraisAgg.mediana)} | Seu: ${fmt(ticketMedioIndividual)}`} accentColor="hsl(200 80% 50%)" />
            <KPICard icon={FileText} label="Qtd Total de Itens" value={String(vendasGeraisAgg.qtdItens)} subtitle={`Seus itens: ${vendasAgg.qtdItens}`} accentColor="hsl(330 70% 55%)" />
          </div>
        </motion.div>

        {/* THREE COLUMNS */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Posição */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-card flex flex-col items-center text-center relative overflow-hidden">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Sua Posição PJ</p>

            <div className="relative">
              {minhaPosicaoPj && minhaPosicaoPj.posicao <= 3 && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="55" fill="none" stroke="hsl(38 90% 55%)" strokeWidth="1" opacity="0.15" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke="hsl(38 90% 55%)" strokeWidth="0.5" opacity="0.1" />
                </svg>
              )}
              <span
                className={`font-black leading-none ${
                  minhaPosicaoPj && minhaPosicaoPj.posicao <= 3 ? 'text-gradient-gold' : 'text-foreground'
                }`}
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
                <p className="text-xs text-muted-foreground">
                  #{minhaPosicaoPj.posicao - 1} posição
                </p>
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

          {/* Você vs Média da Empresa (Ticket Médio) */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-card">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">Você vs Média da Empresa</p>
            <p className="text-[10px] text-muted-foreground mb-4">Comparativo contra a média geral de vendas</p>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-semibold">Seu Ticket</span>
                  <span className="text-foreground font-bold">{fmt(ticketMedioIndividual)}</span>
                </div>
                <div className="h-5 rounded-full bg-secondary overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: diffTicket >= 0
                        ? 'linear-gradient(90deg, hsl(38 90% 55%), hsl(40 95% 65%))'
                        : 'hsl(215 30% 40%)',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${meuTicketPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  />
                  {meuTicketPct > 15 && (
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] font-bold text-primary-foreground">
                      {fmt(ticketMedioIndividual)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-secondary-foreground">Média Geral</span>
                  <span className="text-secondary-foreground">{fmt(vendasGeraisAgg.ticketMedio)}</span>
                </div>
                <div className="h-5 rounded-full bg-secondary overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full bg-secondary-foreground/30"
                    initial={{ width: 0 }}
                    animate={{ width: `${geralTicketPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                  />
                </div>
              </div>
            </div>

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
            <p className="text-[10px] text-muted-foreground mt-3">Média: {fmt(vendasGeraisAgg.ticketMedio)} | Mediana: {fmt(vendasGeraisAgg.mediana)}</p>
          </div>

          {/* Ticket vs Média Gauge */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-card flex flex-col items-center text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">Seu Ticket vs Média</p>
            {vendasGeraisAgg.ticketMedio > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <CircularGauge value={vendasGeraisAgg.ticketMedio > 0 ? (ticketMedioIndividual / vendasGeraisAgg.ticketMedio) * 100 : 0} label="vs Média" />
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: 'hsl(160 100% 42%)' }} />
                    ≥80%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: 'hsl(38 90% 55%)' }} />
                    ≥50%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: 'hsl(348 100% 62%)' }} />
                    &lt;60%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Seu ticket: {fmt(ticketMedioIndividual)} | Média: {fmt(vendasGeraisAgg.ticketMedio)}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </div>
        </motion.div>

        {/* VENDAS DA EMPRESA - LineChart */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-8 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Vendas da Empresa</p>
          </div>
          {vendasGeraisAgg.qtdItens > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={(vendasGeraisRaw ?? [])
                  .map(r => parseMoneyBR(r.total_mercadoria))
                  .filter(v => v > 0)
                  .sort((a, b) => a - b)
                  .map((v, i) => ({ idx: i + 1, valor: v }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" />
                <XAxis dataKey="idx" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 11 }} label={{ value: 'Vendas (ordenadas)', position: 'insideBottom', offset: -5, fill: 'hsl(210 20% 60%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 10 }}
                  labelStyle={{ color: '#fff', fontWeight: 600 }}
                  labelFormatter={v => `Venda #${v}`}
                  formatter={(v: number) => [fmt(v), 'Valor']}
                />
                <ReferenceLine y={vendasGeraisAgg.mediana} stroke="hsl(160 100% 42%)" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Mediana: ${fmt(vendasGeraisAgg.mediana)}`, position: 'insideTopRight', fill: 'hsl(160 100% 42%)', fontSize: 11 }} />
                <ReferenceLine y={vendasGeraisAgg.ticketMedio} stroke="hsl(38 90% 55%)" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: `Média: ${fmt(vendasGeraisAgg.ticketMedio)}`, position: 'insideBottomRight', fill: 'hsl(38 90% 55%)', fontSize: 10 }} />
                <Line type="monotone" dataKey="valor" stroke="hsl(270 60% 55%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <BarChart3 className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Dados de vendas gerais indisponíveis</p>
            </div>
          )}
        </motion.div>

        {/* TABELA DETALHADA */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 shadow-card">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Detalhamento de Vendas</p>
          <DataTable
            columns={[
              { key: 'data_emissao', label: 'Data Emissão' },
              { key: 'nota_fiscal', label: 'NF' },
              { key: 'produto', label: 'Produto' },
              { key: 'marca', label: 'Marca' },
              { key: 'quantidade', label: 'Qtd', align: 'right' as const },
              { key: 'total', label: 'Total c/ Desc.', align: 'right' as const },
              { key: 'margem', label: 'Margem %', align: 'right' as const },
              { key: 'lucro', label: 'Lucro', align: 'right' as const },
            ]}
            data={vendasTableData}
          />
        </motion.div>


        {/* GRÁFICO VENDAS POR DIA */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-8 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Vendas por Dia</p>
          </div>
          {vendasPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
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
      </motion.div>
    </AppShell>
  );
}
