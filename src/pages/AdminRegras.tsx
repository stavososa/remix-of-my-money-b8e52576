import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface RegraForm {
  id?: string;
  nome: string;
  regime: string;
  tipo_unidade: string | null;
  percentual: number;
  periodo_ano: number;
  periodo_mes: number;
  ativo: boolean;
}

const empty = (ano: number, mes: number): RegraForm => ({
  nome: '', regime: 'PJ', tipo_unidade: null, percentual: 0,
  periodo_ano: ano, periodo_mes: mes, ativo: true,
});

export default function AdminRegras() {
  const { periodoAno, periodoMes } = usePeriod();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState<RegraForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  const saveMutation = useMutation({
    mutationFn: async (form: RegraForm) => {
      const payload = {
        nome: form.nome,
        regime: form.regime,
        tipo_unidade: form.tipo_unidade || null,
        percentual: form.percentual,
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
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
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
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('regras_comissao').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regras'] }),
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const columns = [
    { key: 'nome' as const, label: 'Nome' },
    {
      key: 'regime' as const, label: 'Regime',
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: 'tipo_unidade' as const, label: 'Tipo Unidade',
      render: (v: string | null) => v ? <StatusBadge status={v} /> : <span className="text-muted-foreground text-xs">Todos</span>,
    },
    {
      key: 'percentual' as const, label: 'Percentual', align: 'right' as const,
      render: (v: number) => <span className="text-primary font-bold text-lg">{Number(v).toFixed(1)}%</span>,
    },
    {
      key: 'ativo' as const, label: 'Status',
      render: (v: boolean, row: any) => (
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
      render: (_: string, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModal({
                id: row.id, nome: row.nome, regime: row.regime,
                tipo_unidade: row.tipo_unidade, percentual: row.percentual,
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

  return (
    <AppShell title="Regras de Comissão">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">
            Regras de Comissão — {MESES[periodoMes]}/{periodoAno}
          </h2>
          <button
            onClick={() => setModal(empty(periodoAno, periodoMes))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova Regra
          </button>
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
              <DataTable columns={columns} data={regras} />
            </div>
            <div className="md:hidden space-y-3">
              {regras.map((r: any) => (
                <div key={r.id} className="bg-card border border-border rounded-lg p-4 shadow-card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-foreground">{r.nome}</p>
                      <div className="flex gap-2 mt-1">
                        <StatusBadge status={r.regime} />
                        {r.tipo_unidade ? <StatusBadge status={r.tipo_unidade} /> : <span className="text-xs text-muted-foreground">Todos</span>}
                      </div>
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
                      <button onClick={() => setModal({ id: r.id, nome: r.nome, regime: r.regime, tipo_unidade: r.tipo_unidade, percentual: r.percentual, periodo_ano: r.periodo_ano, periodo_mes: r.periodo_mes, ativo: r.ativo })} className="p-1.5 text-secondary-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setConfirmDelete(r.id)} className="p-1.5 text-secondary-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-card space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">{modal.id ? 'Editar Regra' : 'Nova Regra'}</h3>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-secondary-foreground">Nome</label>
                <input
                  value={modal.nome}
                  onChange={e => setModal({ ...modal, nome: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Ex: Comissão PJ Filial"
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
