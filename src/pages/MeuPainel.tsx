import { AppShell } from '@/components/AppShell';
import { KPICard } from '@/components/KPICard';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Target, Percent, FileText, TrendingUp, Trophy, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));

const fmtPct = (v: number | null | undefined) => `${Number(v ?? 0).toFixed(1)}%`;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const mesNome = (m: number) =>
  ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1] ?? '';

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

  const meusDados = ranking?.find(r => r.vendedor_id === vendedor_id);
  const totalVendedores = ranking?.length ?? 0;
  const mediaTime = totalVendedores > 0
    ? ranking!.reduce((s, r) => s + Number(r.total_vendido ?? 0), 0) / totalVendedores
    : 0;

  const primeiroNome = (nome_completo ?? '').split(' ')[0] || 'Vendedor';
  const posicao = meusDados?.posicao ?? null;
  const meuTotal = Number(meusDados?.total_vendido ?? 0);

  // Ranking neighbours
  const acima = posicao && posicao > 1 ? ranking?.find(r => r.posicao === posicao - 1) : null;
  const abaixo = posicao === 1 && ranking && ranking.length > 1 ? ranking.find(r => r.posicao === 2) : null;

  const diffAcima = acima ? Number(acima.total_vendido ?? 0) - meuTotal : 0;
  const diffAbaixo = abaixo ? meuTotal - Number(abaixo.total_vendido ?? 0) : 0;

  // Chart data
  const chartData = (historico ?? []).map(h => ({
    label: `${MESES[(h.periodo_mes ?? 1) - 1]}/${String(h.periodo_ano).slice(2)}`,
    vendido: Number(h.total_vendido ?? 0),
    comissao: Number(h.total_comissao ?? 0),
  }));

  // Margin color
  const margem = Number(meusDados?.margem_media ?? 0);
  const margemColor = margem >= 60 ? 'text-success' : margem >= 50 ? 'text-primary' : 'text-destructive';

  // Comparison bar
  const barMax = Math.max(meuTotal, mediaTime, 1);
  const meuPct = (meuTotal / barMax) * 100;
  const mediaPct = (mediaTime / barMax) * 100;
  const diffMedia = meuTotal - mediaTime;

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
      <div className="space-y-6">
        {/* SECTION 1: Header */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Olá, {primeiroNome}! 💪</h2>
            <p className="text-sm text-secondary-foreground">{unidade_nome} • {regime}</p>
            <p className="text-xs text-muted-foreground">{mesNome(periodoMes)}/{periodoAno}</p>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`text-3xl font-extrabold rounded-lg px-5 py-2 border ${
                posicao && posicao <= 3
                  ? 'text-primary border-primary bg-primary/10 shadow-[0_0_20px_rgba(245,166,35,0.3)]'
                  : posicao && posicao <= 10
                    ? 'text-secondary-foreground border-secondary-foreground/30 bg-secondary'
                    : 'text-foreground border-border bg-secondary'
              }`}
            >
              {posicao ? `#${posicao}` : '—'}
            </div>
            <span className="text-xs text-muted-foreground mt-1">de {totalVendedores} vendedores</span>
          </div>
        </div>

        {/* SECTION 2: KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={DollarSign} label="Total Vendido" value={meusDados ? fmt(meusDados.total_vendido) : '—'} />
          <KPICard icon={Target} label="Comissão" value={meusDados ? fmt(meusDados.total_comissao) : '—'} />
          <KPICard icon={Percent} label="% Comissão" value={meusDados ? fmtPct(meusDados.percentual_aplicado) : '—'} />
          <KPICard icon={FileText} label="Notas Fiscais" value={meusDados ? String(meusDados.qtd_notas ?? 0) : '—'} />
        </div>
        {!meusDados && (
          <p className="text-sm text-muted-foreground text-center">Sem dados para este período</p>
        )}

        {/* SECTION 3: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Posição no ranking */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-card flex flex-col items-center text-center">
            <p className="text-sm text-secondary-foreground mb-2">Sua Posição</p>
            <span
              className={`font-extrabold leading-none ${
                posicao && posicao <= 3 ? 'text-primary' : 'text-foreground'
              }`}
              style={{ fontSize: '4rem' }}
            >
              {posicao ? `#${posicao}` : '—'}
            </span>
            <p className="text-sm text-muted-foreground mt-1">de {totalVendedores} vendedores</p>

            {meusDados && posicao === 1 && (
              <div className="mt-4 space-y-1">
                <p className="text-primary font-semibold">🏆 Você é o Top Performer!</p>
                {abaixo && (
                  <p className="text-xs text-secondary-foreground">
                    {fmt(diffAbaixo)} à frente de #{2} {abaixo.vendedor_nome}
                  </p>
                )}
              </div>
            )}

            {meusDados && posicao && posicao > 1 && acima && (
              <div className="mt-4 w-full space-y-2">
                <p className="text-sm text-secondary-foreground">
                  Falta <span className="text-primary font-semibold">{fmt(diffAcima)}</span> para alcançar
                </p>
                <p className="text-xs text-muted-foreground">
                  #{posicao - 1} {acima.vendedor_nome}
                </p>
                <Progress
                  value={Number(acima.total_vendido) > 0 ? (meuTotal / Number(acima.total_vendido)) * 100 : 0}
                  className="h-2 bg-secondary"
                />
              </div>
            )}

            {!meusDados && (
              <p className="text-sm text-muted-foreground mt-4">Sem vendas registradas neste período</p>
            )}
          </div>

          {/* Você vs Média */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-card">
            <p className="text-sm text-secondary-foreground mb-4">Você vs Média do Time</p>

            {/* My bar */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">Você</span>
                  <span className="text-foreground font-semibold">{fmt(meuTotal)}</span>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${diffMedia >= 0 ? 'bg-primary' : 'bg-muted-foreground'}`}
                    style={{ width: `${meuPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-secondary-foreground">Média</span>
                  <span className="text-secondary-foreground">{fmt(mediaTime)}</span>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-secondary-foreground/40 transition-all" style={{ width: `${mediaPct}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-4">
              {diffMedia > 0 ? (
                <>
                  <p className="text-success font-semibold text-sm">🔥 Acima da média!</p>
                  <p className="text-xs text-muted-foreground">{fmt(diffMedia)} acima</p>
                </>
              ) : diffMedia < 0 ? (
                <>
                  <p className="text-primary font-semibold text-sm">Falta {fmt(Math.abs(diffMedia))} para a média</p>
                </>
              ) : (
                <p className="text-secondary-foreground text-sm">📊 Na média do time</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: Margem */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-card">
          <p className="text-sm text-secondary-foreground mb-2">Margem Média</p>
          {meusDados ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className={`text-4xl font-extrabold ${margemColor}`}>{fmtPct(margem)}</span>
              <div className="flex-1 w-full">
                <Progress value={margem} className="h-3 bg-secondary" />
                <p className="text-xs text-muted-foreground mt-2">Margem média das suas vendas no período</p>
              </div>
            </div>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">—</p>
          )}
        </div>

        {/* SECTION 5: Evolução */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-card">
          <p className="text-sm text-secondary-foreground mb-4">Evolução de Vendas</p>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradVendido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(38 90% 55%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(38 90% 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradComissao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160 100% 42%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(160 100% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 24%)" />
                <XAxis dataKey="label" tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(210 20% 60%)', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(216 40% 14%)', border: '1px solid hsl(215 40% 24%)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(v: number, name: string) => [fmt(v), name === 'vendido' ? 'Total Vendido' : 'Comissão']}
                />
                <Legend formatter={v => (v === 'vendido' ? 'Total Vendido' : 'Comissão')} />
                <Area type="monotone" dataKey="vendido" stroke="hsl(38 90% 55%)" fill="url(#gradVendido)" strokeWidth={2} />
                <Area type="monotone" dataKey="comissao" stroke="hsl(160 100% 42%)" fill="url(#gradComissao)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <TrendingUp className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Evolução disponível a partir do próximo mês</p>
              <p className="text-xs text-muted-foreground">Os dados serão comparados mês a mês automaticamente</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
