import { useState, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Search, Copy } from 'lucide-react';
import { toast } from 'sonner';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const PRIORIDADE_LABELS: Record<number, { label: string; color: string }> = {
  4: { label: 'Produto', color: 'bg-destructive/20 text-destructive' },
  3: { label: 'Família+Marca', color: 'bg-primary/20 text-primary' },
  2: { label: 'Marca', color: 'bg-warning/20 text-warning' },
  1: { label: 'Família', color: 'bg-success/20 text-success' },
  0: { label: 'Genérica', color: 'bg-secondary text-muted-foreground' },
};

function calcPrioridade(form: RegraForm): number {
  if (form.produto) return 4;
  if (form.familia_produto && form.marca) return 3;
  if (form.marca) return 2;
  if (form.familia_produto) return 1;
  return 0;
}

interface RegraForm {
  id?: string;
  nome: string;
  regime: string;
  tipo_unidade: string | null;
  familia_produto: string | null;
  marca: string | null;
  produto: string | null;
  percentual: number;
  min_faturamento: number | null;
  periodo_ano: number;
  periodo_mes: number;
  ativo: boolean;
}

const empty = (ano: number, mes: number): RegraForm => ({
  nome: '', regime: 'PJ', tipo_unidade: null,
  familia_produto: null, marca: null, produto: null,
  percentual: 0, min_faturamento: null, periodo_ano: ano, periodo_mes: mes, ativo: true,
});

/* Autocomplete input component */
function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string | null) => void;
  options: string[];
  placeholder: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');

  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 50);
    const lower = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(lower)).slice(0, 50);
  }, [search, options]);

  return (
    <div className="relative">
      <label className="text-sm text-secondary-foreground">{label}</label>
      <div className="relative mt-1">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value || null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full px-3 py-2 pr-8 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={placeholder}
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); onChange(null); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-md bg-card border border-border shadow-lg">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setSearch(opt); onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-secondary truncate"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminRegras() {
  const { periodoAno, periodoMes } = usePeriod();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState<RegraForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [dupTarget, setDupTarget] = useState({ ano: periodoAno, mes: periodoMes });

  const { data: regras = [], isLoading } = useQuery({
    queryKey: ['regras', periodoAno, periodoMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_comissao')
        .select('*')
        .eq('periodo_ano', periodoAno)
        .eq('periodo_mes', periodoMes)
        .order('regime')
        .order('tipo_unidade');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch distinct values for autocomplete
  const { data: autocompleteData } = useQuery({
    queryKey: ['regras-autocomplete-base'],
    queryFn: async () => {
      const fetchAll = async (column: string) => {
        const allValues = new Set<string>();
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await (supabase as any)
            .from('vendas')
            .select(column)
            .not(column, 'is', null)
            .range(from, from + pageSize - 1);
          if (error || !data || data.length === 0) break;
          data.forEach((r: any) => { if (r[column]) allValues.add(r[column]); });
          if (data.length < pageSize) break;
          from += pageSize;
        }
        return [...allValues].sort();
      };

      const [familias, marcas] = await Promise.all([
        fetchAll('familia_produto'),
        fetchAll('marca'),
      ]);
      return { familias, marcas };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Produtos carregam apenas quando uma família é selecionada
  const familiaAtual = modal?.familia_produto || null;
  const { data: produtosOptions = [] } = useQuery({
    queryKey: ['regras-produtos', familiaAtual],
    queryFn: async () => {
      const allValues = new Set<string>();
      let from = 0;
      const pageSize = 1000;
      while (true) {
        let query = (supabase as any)
          .from('vendas')
          .select('descricao_produto')
          .not('descricao_produto', 'is', null);
        if (familiaAtual) {
          query = query.eq('familia_produto', familiaAtual);
        }
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        data.forEach((r: any) => { if (r.descricao_produto) allValues.add(r.descricao_produto); });
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return [...allValues].sort();
    },
    enabled: !!familiaAtual,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (form: RegraForm) => {
      const payload: any = {
        nome: form.nome,
        regime: form.regime,
        tipo_unidade: form.tipo_unidade || null,
        familia_produto: form.familia_produto || null,
        marca: form.marca || null,
        produto: form.produto || null,
        percentual: form.percentual,
        min_faturamento: form.min_faturamento || null,
        periodo_ano: form.periodo_ano,
        periodo_mes: form.periodo_mes,
        ativo: form.ativo,
        criado_por: user?.id,
      };
      if (form.id) {
        const { error } = await supabase.from('regras_comissao').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('regras_comissao').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Regra salva com sucesso');
      qc.invalidateQueries({ queryKey: ['regras'] });
      setModal(null);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('regras_comissao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Regra excluída');
      qc.invalidateQueries({ queryKey: ['regras'] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('regras_comissao').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regras'] }),
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ targetAno, targetMes }: { targetAno: number; targetMes: number }) => {
      const inserts = regras.map((r: any) => ({
        nome: r.nome,
        regime: r.regime,
        tipo_unidade: r.tipo_unidade,
        familia_produto: r.familia_produto,
        marca: r.marca,
        produto: r.produto,
        percentual: r.percentual,
        min_faturamento: r.min_faturamento ?? null,
        periodo_ano: targetAno,
        periodo_mes: targetMes,
        ativo: r.ativo,
        criado_por: user?.id,
      }));
      const { error } = await supabase.from('regras_comissao').insert(inserts);
      if (error) throw error;
    },
    onSuccess: (_, { targetAno, targetMes }) => {
      toast.success(`Regras duplicadas para ${MESES[targetMes]}/${targetAno}`);
      qc.invalidateQueries({ queryKey: ['regras'] });
      setShowDuplicateModal(false);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
  type RegraRow = typeof regras[0];


  const columns = [
    { key: 'nome' as const, label: 'Nome' },
    {
      key: 'regime' as const, label: 'Regime',
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: 'tipo_unidade' as const, label: 'Unidade',
      render: (v: string | null) => v ? <StatusBadge status={v} /> : <span className="text-muted-foreground text-xs">Todos</span>,
    },
    {
      key: 'familia_produto' as const, label: 'Família',
      render: (v: string | null) => v ? <span className="text-xs text-foreground">{v}</span> : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'marca' as const, label: 'Marca',
      render: (v: string | null) => v ? <span className="text-xs text-foreground">{v}</span> : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'produto' as const, label: 'Produto',
      render: (v: string | null) => v ? <span className="text-xs text-foreground max-w-[150px] truncate block">{v}</span> : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'min_faturamento' as const, label: 'Min. Fat.',
      render: (v: number | null) => v ? <span className="text-xs text-warning font-medium">R$ {Number(v).toLocaleString('pt-BR')}</span> : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'percentual' as const, label: '%', align: 'right' as const,
      render: (v: number) => <span className="text-primary font-bold text-lg">{Number(v).toFixed(1)}%</span>,
    },
    {
      key: 'prioridade' as const, label: 'Prioridade',
      render: (v: number) => {
        const p = PRIORIDADE_LABELS[v] ?? PRIORIDADE_LABELS[0];
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>{p.label}</span>;
      },
    },
    {
      key: 'ativo' as const, label: 'Status',
      render: (v: boolean, row: RegraRow) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleAtivo.mutate({ id: row.id, ativo: !v }); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${v ? 'bg-success' : 'bg-secondary'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-foreground transition-transform ${v ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      ),
    },
    {
      key: 'id' as const, label: 'Ações',
      render: (_: string, row: RegraRow) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModal({
                id: row.id, nome: row.nome, regime: row.regime,
                tipo_unidade: row.tipo_unidade, percentual: row.percentual,
                familia_produto: (row as any).familia_produto ?? null,
                marca: (row as any).marca ?? null,
                produto: (row as any).produto ?? null,
                min_faturamento: (row as any).min_faturamento ?? null,
                periodo_ano: row.periodo_ano, periodo_mes: row.periodo_mes, ativo: row.ativo,
              });
            }}
            className="p-1.5 rounded hover:bg-secondary text-secondary-foreground hover:text-primary transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(row.id); }}
            className="p-1.5 rounded hover:bg-secondary text-secondary-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const prioridadePreview = modal ? calcPrioridade(modal) : 0;
  const prioLabel = PRIORIDADE_LABELS[prioridadePreview] ?? PRIORIDADE_LABELS[0];

  return (
    <AppShell title="Regras de Comissão">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">
            Regras de Comissão — {MESES[periodoMes]}/{periodoAno}
          </h2>
          <div className="flex gap-2">
            {regras.length > 0 && (
              <button
                onClick={() => { setDupTarget({ ano: periodoAno, mes: periodoMes === 12 ? 1 : periodoMes + 1 }); setShowDuplicateModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-secondary-foreground font-semibold text-sm hover:bg-secondary transition-colors"
              >
                <Copy className="h-4 w-4" /> Duplicar p/ outro mês
              </button>
            )}
            <button
              onClick={() => setModal(empty(periodoAno, periodoMes))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Nova Regra
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : regras.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
            <p className="text-muted-foreground">Nenhuma regra cadastrada para este período</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable columns={columns as any} data={regras} />
            </div>
            <div className="md:hidden space-y-3">
              {regras.map((r: any) => {
                const prio = PRIORIDADE_LABELS[r.prioridade ?? 0] ?? PRIORIDADE_LABELS[0];
                return (
                  <div key={r.id} className="bg-card border border-border rounded-lg p-4 shadow-card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-foreground">{r.nome}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <StatusBadge status={r.regime} />
                          {r.tipo_unidade ? <StatusBadge status={r.tipo_unidade} /> : <span className="text-xs text-muted-foreground">Todos</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prio.color}`}>{prio.label}</span>
                        </div>
                        {(r.familia_produto || r.marca || r.produto) && (
                          <div className="flex flex-wrap gap-1 mt-1.5 text-xs text-muted-foreground">
                            {r.familia_produto && <span>Fam: {r.familia_produto}</span>}
                            {r.marca && <span>• Marca: {r.marca}</span>}
                            {r.produto && <span>• Prod: {r.produto}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-primary font-bold text-xl">{Number(r.percentual).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <button
                        onClick={() => toggleAtivo.mutate({ id: r.id, ativo: !r.ativo })}
                        className={`text-xs px-2 py-1 rounded ${r.ativo ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'}`}
                      >
                        {r.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => setModal({ id: r.id, nome: r.nome, regime: r.regime, tipo_unidade: r.tipo_unidade, familia_produto: r.familia_produto ?? null, marca: r.marca ?? null, produto: r.produto ?? null, min_faturamento: r.min_faturamento ?? null, percentual: r.percentual, periodo_ano: r.periodo_ano, periodo_mes: r.periodo_mes, ativo: r.ativo })} className="p-1.5 text-secondary-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmDelete(r.id)} className="p-1.5 text-secondary-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-card space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-foreground">{modal.id ? 'Editar Regra' : 'Nova Regra'}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioLabel.color}`}>
                  P{prioridadePreview}: {prioLabel.label}
                </span>
              </div>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-secondary-foreground">Nome</label>
                <input
                  value={modal.nome}
                  onChange={e => setModal({ ...modal, nome: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Ex: Comissão PJ Filial Nike"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-secondary-foreground">Regime</label>
                  <select
                    value={modal.regime}
                    onChange={e => setModal({ ...modal, regime: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="PJ">PJ</option>
                    <option value="CLT">CLT</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-secondary-foreground">Tipo Unidade</label>
                  <select
                    value={modal.tipo_unidade ?? ''}
                    onChange={e => setModal({ ...modal, tipo_unidade: e.target.value || null })}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Todos</option>
                    <option value="Matriz">Matriz</option>
                    <option value="Filial">Filial</option>
                    <option value="Franquia">Franquia</option>
                  </select>
                </div>
              </div>

              {/* Product classification fields */}
              <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" /> Classificação do Produto
                </p>
                <AutocompleteInput
                  label="Família"
                  value={modal.familia_produto || ''}
                  onChange={v => setModal({ ...modal, familia_produto: v })}
                  options={autocompleteData?.familias ?? []}
                  placeholder="Ex: Camisetas, Calças..."
                />
                <AutocompleteInput
                  label="Marca"
                  value={modal.marca || ''}
                  onChange={v => setModal({ ...modal, marca: v })}
                  options={autocompleteData?.marcas ?? []}
                  placeholder="Ex: Nike, Adidas..."
                />
                <AutocompleteInput
                  label="Produto"
                  value={modal.produto || ''}
                  onChange={v => setModal({ ...modal, produto: v })}
                  options={produtosOptions}
                  placeholder={familiaAtual ? "Selecione um produto..." : "Selecione uma família primeiro..."}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-secondary-foreground">Percentual (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={modal.percentual}
                    onChange={e => setModal({ ...modal, percentual: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm text-secondary-foreground">Fat. Mínimo (R$)</label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={modal.min_faturamento ?? ''}
                    onChange={e => setModal({ ...modal, min_faturamento: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-secondary-foreground">Ano</label>
                  <input
                    type="number"
                    value={modal.periodo_ano}
                    onChange={e => setModal({ ...modal, periodo_ano: parseInt(e.target.value) || periodoAno })}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm text-secondary-foreground">Mês</label>
                  <select
                    value={modal.periodo_mes}
                    onChange={e => setModal({ ...modal, periodo_mes: parseInt(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveMutation.mutate(modal)}
                disabled={!modal.nome || saveMutation.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-card space-y-4">
            <h3 className="text-lg font-bold text-foreground">Excluir Regra</h3>
            <p className="text-sm text-secondary-foreground">Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
