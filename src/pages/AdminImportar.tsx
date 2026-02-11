import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Upload, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const LOADING_MESSAGES = [
  'Conectando ao servidor...',
  'Lendo planilha...',
  'Filtrando dados...',
  'Calculando comissões...',
  'Gravando resultados...',
];

const fmt = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AdminImportar() {
  const { periodoAno, periodoMes } = usePeriod();
  const [ano, setAno] = useState(periodoAno);
  const [mes, setMes] = useState(periodoMes);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Pasta1');
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Cycle loading messages every 4s
  useEffect(() => {
    if (!importing) { setLoadingMsgIdx(0); return; }
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [importing]);

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['log_importacoes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('log_importacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const doImport = async () => {
    setShowConfirm(false);
    setImporting(true);
    setResultado(null);
    setErro(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout

    try {
      const response = await fetch(
        'https://webhook.atacadaomaromba.com/webhook/importar-vendas',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodo_ano: parseInt(String(ano)),
            periodo_mes: parseInt(String(mes)),
            spreadsheet_id: spreadsheetId.trim(),
            sheet_name: sheetName.trim() || 'Pasta1'
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      setResultado(data);
      toast.success('Importação concluída');
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        setErro('Timeout: a importação demorou mais de 3 minutos. Verifique o log.');
      } else {
        setErro(`Erro na importação: ${error.message}`);
      }
    } finally {
      setImporting(false);
      refetchLogs();
    }
  };

  const limparErro = () => {
    setErro(null);
    setResultado(null);
  };

  const logColumns = [
    {
      key: 'periodo_mes' as const, label: 'Período',
      render: (_: number, row: any) => `${MESES[row.periodo_mes]}/${row.periodo_ano}`,
    },
    {
      key: 'created_at' as const, label: 'Data/Hora',
      render: (v: string | null) => fmtDate(v),
    },
    { key: 'qtd_vendedores' as const, label: 'Vendedores', align: 'right' as const },
    {
      key: 'total_geral_vendido' as const, label: 'Total Vendido', align: 'right' as const,
      render: (v: number | null) => fmt(v),
    },
    {
      key: 'total_comissoes' as const, label: 'Comissões', align: 'right' as const,
      render: (v: number | null) => fmt(v),
    },
    {
      key: 'status' as const, label: 'Status',
      render: (v: string | null) => (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${v === 'sucesso' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
          {v === 'sucesso' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {v ?? '—'}
        </span>
      ),
    },
    {
      key: 'nomes_nao_encontrados' as const, label: 'Alertas',
      render: (v: any, row: any) => {
        const nomes = Array.isArray(v) ? v : [];
        if (nomes.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setExpandedLog(expandedLog === row.id ? null : row.id); }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <AlertTriangle className="h-3 w-3" />
            {nomes.length} nome(s)
            {expandedLog === row.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        );
      },
    },
  ];

  const nomesNaoEncontrados = resultado?.nomes_nao_encontrados && Array.isArray(resultado.nomes_nao_encontrados)
    ? resultado.nomes_nao_encontrados
    : [];

  return (
    <AppShell title="Importar Dados">
      <div className="space-y-6">
        {/* Header */}
        <h2 className="text-lg font-bold text-foreground">Importar Dados de Vendas</h2>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-secondary-foreground">Período Mês</label>
              <select
                value={mes}
                onChange={e => setMes(parseInt(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-secondary-foreground">Período Ano</label>
              <input
                type="number"
                value={ano}
                onChange={e => setAno(parseInt(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-secondary-foreground">ID da Planilha Google</label>
            <input
              value={spreadsheetId}
              onChange={e => setSpreadsheetId(e.target.value)}
              placeholder="Cole o ID do Google Sheets aqui"
              className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Encontre na URL: docs.google.com/spreadsheets/d/<span className="text-primary">{'{'}</span>ESTE_ID<span className="text-primary">{'}'}</span>/edit</p>
          </div>

          <div>
            <label className="text-sm text-secondary-foreground">Nome da Aba</label>
            <input
              value={sheetName}
              onChange={e => setSheetName(e.target.value)}
              placeholder="Pasta1"
              className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Nome exato da aba na planilha</p>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!spreadsheetId.trim() || importing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {importing ? '⏳ Importando... Aguarde' : 'Importar'}
          </button>
        </div>

        {/* Import spinner with animated messages */}
        {importing && (
          <div className="bg-card border border-border rounded-lg p-8 shadow-card flex flex-col items-center gap-4">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-secondary-foreground animate-pulse transition-all">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
          </div>
        )}

        {/* Success Result */}
        {resultado && !erro && !importing && (
          <div className="bg-card border-l-4 border-l-success border border-border rounded-lg p-5 shadow-card space-y-4">
            <h4 className="font-semibold text-foreground text-lg">✅ Importação concluída!</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Período:</span>
              <span className="text-foreground font-medium">{resultado.periodo ?? `${MESES[mes]}/${ano}`}</span>
              <span className="text-muted-foreground">Vendedores:</span>
              <span className="text-foreground font-medium">{resultado.vendedores_processados ?? '—'}</span>
              <span className="text-muted-foreground">Total Vendido:</span>
              <span className="text-foreground font-medium">{fmt(resultado.total_vendido ?? resultado.total_geral_vendido)}</span>
              <span className="text-muted-foreground">Total Comissões:</span>
              <span className="text-foreground font-medium">{fmt(resultado.total_comissoes)}</span>
              <span className="text-muted-foreground">Linhas processadas:</span>
              <span className="text-foreground font-medium">{resultado.linhas_processadas ?? '—'}</span>
              <span className="text-muted-foreground">Linhas ignoradas:</span>
              <span className="text-foreground font-medium">{resultado.linhas_ignoradas ?? '—'}</span>
            </div>

            {nomesNaoEncontrados.length > 0 && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">⚠️ Vendedores não encontrados:</span>
                </div>
                <ul className="list-disc list-inside text-sm text-secondary-foreground space-y-0.5">
                  {nomesNaoEncontrados.map((n: string, i: number) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Cadastre esses vendedores para incluir suas vendas.</p>
              </div>
            )}
          </div>
        )}

        {/* Error Result */}
        {erro && !importing && (
          <div className="bg-card border-l-4 border-l-destructive border border-border rounded-lg p-5 shadow-card space-y-3">
            <h4 className="font-semibold text-foreground text-lg">❌ Erro na importação</h4>
            <p className="text-sm text-destructive">{erro}</p>
            <button
              onClick={limparErro}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Logs */}
        <div>
          <h3 className="text-sm font-semibold text-secondary-foreground mb-3">Histórico de Importações</h3>
          {logs.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center shadow-card">
              <p className="text-muted-foreground">Nenhuma importação registrada</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable columns={logColumns} data={logs} />
              </div>

              {/* Expanded names (desktop) */}
              {expandedLog && (() => {
                const log = logs.find((l: any) => l.id === expandedLog);
                const nomes = Array.isArray(log?.nomes_nao_encontrados) ? log.nomes_nao_encontrados : [];
                if (nomes.length === 0) return null;
                return (
                  <div className="hidden md:block mt-2 bg-card border border-primary/30 rounded-lg p-4 shadow-card">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Nomes não encontrados</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {nomes.map((n: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded bg-secondary text-xs text-secondary-foreground">{n}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {logs.map((log: any) => {
                  const nomes = Array.isArray(log.nomes_nao_encontrados) ? log.nomes_nao_encontrados : [];
                  return (
                    <div key={log.id} className="bg-card border border-border rounded-lg p-4 shadow-card space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">{MESES[log.periodo_mes]}/{log.periodo_ano}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${log.status === 'sucesso' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{fmtDate(log.created_at)}</p>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-muted-foreground">Vendedores:</span><span className="text-foreground">{log.qtd_vendedores}</span>
                        <span className="text-muted-foreground">Vendido:</span><span className="text-foreground">{fmt(log.total_geral_vendido)}</span>
                        <span className="text-muted-foreground">Comissões:</span><span className="text-foreground">{fmt(log.total_comissoes)}</span>
                      </div>
                      {nomes.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <button
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className="flex items-center gap-1 text-xs text-primary"
                          >
                            <AlertTriangle className="h-3 w-3" /> {nomes.length} nome(s) não encontrado(s)
                            {expandedLog === log.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          {expandedLog === log.id && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {nomes.map((n: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-secondary text-xs text-secondary-foreground">{n}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-card space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-bold text-foreground">Confirmar Importação</h3>
            </div>
            <p className="text-sm text-secondary-foreground">
              Isso vai substituir os dados de <span className="font-semibold text-foreground">{MESES[mes]}/{ano}</span>. Continuar?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button
                onClick={doImport}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Sim, Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
