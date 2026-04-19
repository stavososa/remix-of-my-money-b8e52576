import { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Search, Copy, AlertTriangle, History, Wand2 } from 'lucide-react';
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
  disabled,
}: {
  value: string;
  onChange: (v: string | null) => void;
  options: string[];
  placeholder: string;
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');

  // Mantém input sincronizado quando limpo de fora (ex.: ativar Regra Geral)
  useEffect(() => { setSearch(value || ''); }, [value]);

  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 50);
    const lower = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(lower)).slice(0, 50);
  }, [search, options]);

  return (
    <div className="relative">
      <label className={`text-sm ${disabled ? 'text-muted-foreground/50' : 'text-secondary-foreground'}`}>{label}</label>
      <div className="relative mt-1">
        <input
          value={search}
          disabled={disabled}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value || null); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full px-3 py-2 pr-8 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={disabled ? '— desativado (Regra Geral) —' : placeholder}
        />
        {search && !disabled && (
          <button
            type="button"
            onClick={() => { setSearch(''); onChange(null); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && !disabled && filtered.length > 0 && (
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

/* Multi-select filial component */
function FilialMultiSelect({
  value,
  onChange,
  unidades,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  unidades: { id: string; nome: string; tipo: string }[];
}) {
  const selected = useMemo(() => (value ? value.split(',').map(s => s.trim()) : []), [value]);
  const allSelected = selected.length === 0;
  const [open, setOpen] = useState(false);

  const toggle = (nome: string) => {
    let next: string[];
    if (selected.includes(nome)) {
      next = selected.filter(s => s !== nome);
    } else {
      next = [...selected, nome];
    }
    onChange(next.length === 0 ? null : next.join(','));
  };

  return (
    <div className="relative">
      <label className="text-sm text-secondary-foreground">Filiais</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm text-left focus:outline-none focus:ring-1 focus:ring-ring flex items-center justify-between"
      >
        <span className="truncate">
          {allSelected ? 'Todas as filiais' : selected.length === 1 ? selected[0] : `${selected.length} filiais selecionadas`}
        </span>
        <svg className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md bg-card border border-border shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary ${allSelected ? 'text-primary font-semibold' : 'text-foreground'}`}
          >
            <span className={`h-4 w-4 rounded border flex items-center justify-center ${allSelected ? 'bg-primary border-primary' : 'border-border'}`}>
              {allSelected && <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </span>
            Todas
          </button>
          {unidades.map(u => {
            const checked = selected.includes(u.nome);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.nome)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary ${checked ? 'text-primary font-medium' : 'text-foreground'}`}
              >
                <span className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-border'}`}>
                  {checked && <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </span>
                {u.nome}
                <span className="text-xs text-muted-foreground ml-auto">{u.tipo}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* Atalhos rápidos */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`text-xs px-2 py-1 rounded-md border transition ${allSelected ? 'bg-primary/20 border-primary text-primary font-semibold' : 'bg-secondary border-border text-secondary-foreground hover:border-primary/50'}`}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => onChange('DELIVERY')}
          className={`text-xs px-2 py-1 rounded-md border transition ${selected.length === 1 && selected[0] === 'DELIVERY' ? 'bg-primary/20 border-primary text-primary font-semibold' : 'bg-secondary border-border text-secondary-foreground hover:border-primary/50'}`}
        >
          Só DELIVERY
        </button>
        <button
          type="button"
          onClick={() => {
            const lojas = unidades.filter(u => !/delivery/i.test(u.nome)).map(u => u.nome);
            onChange(lojas.length ? lojas.join(',') : null);
          }}
          className="text-xs px-2 py-1 rounded-md border bg-secondary border-border text-secondary-foreground hover:border-primary/50 transition"
        >
          Só Lojas Físicas
        </button>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
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
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [dupTarget, setDupTarget] = useState({ ano: periodoAno, mes: periodoMes });

  // Fetch unidades for filial multi-select (with fallback when table is empty/missing)
  const UNIDADES_FALLBACK: { id: string; nome: string; tipo: string }[] = [
    { id: 'fb-delivery', nome: 'DELIVERY', tipo: 'Delivery' },
    { id: 'fb-barra', nome: 'BARRA DA TIJUCA', tipo: 'Loja' },
    { id: 'fb-botafogo', nome: 'BOTAFOGO', tipo: 'Loja' },
    { id: 'fb-campogrande', nome: 'CAMPO GRANDE', tipo: 'Loja' },
    { id: 'fb-freguesia', nome: 'FREGUESIA', tipo: 'Loja' },
    { id: 'fb-novaiguacu', nome: 'NOVA IGUAÇU', tipo: 'Loja' },
    { id: 'fb-recreio', nome: 'RECREIO', tipo: 'Loja' },
    { id: 'fb-valqueire', nome: 'VALQUEIRE', tipo: 'Loja' },
    { id: 'fb-vistaalegre', nome: 'VISTA ALEGRE', tipo: 'Loja' },
  ];
  const { data: unidadesRaw = UNIDADES_FALLBACK } = useQuery({
    queryKey: ['unidades-list'],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('unidades')
          .select('id, nome, tipo')
          .eq('ativo', true)
          .order('nome');
        if (error || !data || data.length === 0) return UNIDADES_FALLBACK;
        return data as { id: string; nome: string; tipo: string }[];
      } catch {
        return UNIDADES_FALLBACK;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Garante que DELIVERY sempre apareça no select, independentemente do que vier do banco
  const unidades = useMemo(() => {
    const list = [...unidadesRaw];
    const hasDelivery = list.some(u => /delivery/i.test(u.nome));
    if (!hasDelivery) list.unshift({ id: 'virtual-delivery', nome: 'DELIVERY', tipo: 'Delivery' });
    return list;
  }, [unidadesRaw]);

  const { data: regras = [], isLoading } = useQuery({
    queryKey: ['regras', periodoAno, periodoMes],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('comissoes')
        .select('*')
        .eq('periodo_ano', periodoAno)
        .eq('periodo_mes', periodoMes)
        .order('regime')
        .order('tipo_unidade');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch distinct combos (familia, marca) for cross-filtered autocomplete
  const { data: autocompleteData } = useQuery({
    queryKey: ['regras-autocomplete-combos'],
    queryFn: async () => {
      const combos = new Set<string>(); // "familia||marca"
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from('vendas')
          .select('familia_produto, marca')
          .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        data.forEach((r: any) => {
          const f = r.familia_produto || '';
          const m = r.marca || '';
          if (f || m) combos.add(`${f}||${m}`);
        });
        if (data.length < pageSize) break;
        from += pageSize;
      }
      const familias = new Set<string>();
      const marcas = new Set<string>();
      const familiaToMarcas = new Map<string, Set<string>>();
      const marcaToFamilias = new Map<string, Set<string>>();
      combos.forEach(combo => {
        const [f, m] = combo.split('||');
        if (f) familias.add(f);
        if (m) marcas.add(m);
        if (f && m) {
          if (!familiaToMarcas.has(f)) familiaToMarcas.set(f, new Set());
          familiaToMarcas.get(f)!.add(m);
          if (!marcaToFamilias.has(m)) marcaToFamilias.set(m, new Set());
          marcaToFamilias.get(m)!.add(f);
        }
      });
      return {
        familias: [...familias].sort(),
        marcas: [...marcas].sort(),
        familiaToMarcas,
        marcaToFamilias,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Mapa produto -> { familia, marca } para exibir corretamente quando regra só tem produto
  const produtosUsadosNasRegras = useMemo(() => {
    const set = new Set<string>();
    regras.forEach((r: any) => {
      if (r.produto && (!r.familia_produto || !r.marca)) set.add(r.produto);
    });
    return [...set];
  }, [regras]);

  const { data: produtoMeta = {} } = useQuery({
    queryKey: ['produto-meta', produtosUsadosNasRegras.sort().join('|')],
    queryFn: async () => {
      if (produtosUsadosNasRegras.length === 0) return {};
      const map: Record<string, { familia: string | null; marca: string | null }> = {};
      // Busca em lotes de 100
      const chunks: string[][] = [];
      for (let i = 0; i < produtosUsadosNasRegras.length; i += 100) {
        chunks.push(produtosUsadosNasRegras.slice(i, i + 100));
      }
      for (const chunk of chunks) {
        const { data, error } = await (supabase as any)
          .from('vendas')
          .select('descricao_produto, familia_produto, marca')
          .in('descricao_produto', chunk)
          .not('familia_produto', 'is', null)
          .limit(5000);
        if (error) continue;
        (data ?? []).forEach((r: any) => {
          if (r.descricao_produto && !map[r.descricao_produto]) {
            map[r.descricao_produto] = { familia: r.familia_produto, marca: r.marca };
          }
        });
      }
      return map;
    },
    enabled: produtosUsadosNasRegras.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // Produtos carregam quando família OU marca é selecionada
  const familiaAtual = modal?.familia_produto || null;
  const marcaAtual = modal?.marca || null;
  const { data: produtosOptions = [] } = useQuery({
    queryKey: ['regras-produtos', familiaAtual, marcaAtual],
    queryFn: async () => {
      const allValues = new Set<string>();
      let from = 0;
      const pageSize = 1000;
      while (true) {
        let query = (supabase as any)
          .from('vendas')
          .select('descricao_produto')
          .not('descricao_produto', 'is', null);
        if (familiaAtual) query = query.eq('familia_produto', familiaAtual);
        if (marcaAtual) query = query.eq('marca', marcaAtual);
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        data.forEach((r: any) => { if (r.descricao_produto) allValues.add(r.descricao_produto); });
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return [...allValues].sort();
    },
    enabled: !!(familiaAtual || marcaAtual),
    staleTime: 5 * 60 * 1000,
  });

  // Opções filtradas de família/marca baseadas no que já foi selecionado
  const familiasFiltered = useMemo(() => {
    if (!autocompleteData) return [];
    if (marcaAtual && autocompleteData.marcaToFamilias.has(marcaAtual)) {
      return [...autocompleteData.marcaToFamilias.get(marcaAtual)!].sort();
    }
    return autocompleteData.familias;
  }, [autocompleteData, marcaAtual]);

  const marcasFiltered = useMemo(() => {
    if (!autocompleteData) return [];
    if (familiaAtual && autocompleteData.familiaToMarcas.has(familiaAtual)) {
      return [...autocompleteData.familiaToMarcas.get(familiaAtual)!].sort();
    }
    return autocompleteData.marcas;
  }, [autocompleteData, familiaAtual]);

  // Helper: log audit action
  const logAudit = async (acao: string, comissao_id: string | null, detalhes: any) => {
    try {
      await (supabase as any).from('comissoes_audit').insert({
        comissao_id,
        acao,
        usuario_id: user?.id,
        usuario_email: user?.email,
        detalhes,
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (form: RegraForm) => {
      // Validação obrigatória
      if (!form.nome.trim()) throw new Error('Nome é obrigatório');
      if (!form.percentual || form.percentual <= 0) throw new Error('Percentual deve ser maior que zero');
      // Regra 100% genérica é permitida (atua como fallback geral)

      // Auto-preenche família/marca a partir do produto selecionado, se vazias
      let famAuto = form.familia_produto;
      let marcaAuto = form.marca;
      if (form.produto && (!famAuto || !marcaAuto)) {
        try {
          const { data: vendaRef } = await (supabase as any)
            .from('vendas')
            .select('familia_produto, marca')
            .eq('descricao_produto', form.produto)
            .not('familia_produto', 'is', null)
            .limit(1)
            .maybeSingle();
          if (vendaRef) {
            if (!famAuto && vendaRef.familia_produto) famAuto = vendaRef.familia_produto;
            if (!marcaAuto && vendaRef.marca) marcaAuto = vendaRef.marca;
          }
        } catch (e) {
          console.warn('Auto-fill família/marca falhou', e);
        }
      }

      const payload: any = {
        nome: form.nome.trim(),
        regime: form.regime,
        tipo_unidade: form.tipo_unidade || null,
        familia_produto: famAuto || null,
        marca: marcaAuto || null,
        produto: form.produto || null,
        percentual: form.percentual,
        min_faturamento: form.min_faturamento || null,
        periodo_ano: form.periodo_ano,
        periodo_mes: form.periodo_mes,
        ativo: form.ativo,
      };
      if (form.id) {
        payload.atualizado_por = user?.id;
        payload.atualizado_em = new Date().toISOString();
        const { error } = await (supabase as any).from('comissoes').update(payload).eq('id', form.id);
        if (error) throw error;
        await logAudit('editou', form.id, { nome: form.nome, percentual: form.percentual });
      } else {
        payload.criado_por = user?.id;
        payload.criado_em = new Date().toISOString();
        const { data, error } = await (supabase as any).from('comissoes').insert(payload).select('id').single();
        if (error) throw error;
        await logAudit('criou', data?.id, { nome: form.nome, percentual: form.percentual });
      }
    },
    onSuccess: () => {
      toast.success('Regra salva com sucesso');
      qc.invalidateQueries({ queryKey: ['regras'] });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      setModal(null);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get rule info before deleting
      const { data: rule } = await (supabase as any).from('comissoes').select('nome, percentual').eq('id', id).single();
      const { error } = await (supabase as any).from('comissoes').delete().eq('id', id);
      if (error) throw error;
      await logAudit('excluiu', id, { nome: rule?.nome, percentual: rule?.percentual });
    },
    onSuccess: () => {
      toast.success('Regra excluída');
      qc.invalidateQueries({ queryKey: ['regras'] });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const count = regras.length;
      const { error } = await (supabase as any)
        .from('comissoes')
        .delete()
        .eq('periodo_ano', periodoAno)
        .eq('periodo_mes', periodoMes);
      if (error) throw error;
      await logAudit('excluiu_lote', null, {
        periodo: `${MESES[periodoMes]}/${periodoAno}`,
        quantidade: count,
      });
    },
    onSuccess: () => {
      toast.success(`Todas as ${regras.length} regras de ${MESES[periodoMes]}/${periodoAno} foram excluídas`);
      qc.invalidateQueries({ queryKey: ['regras'] });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      setConfirmDeleteAll(false);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await (supabase as any).from('comissoes').update({ ativo, atualizado_por: user?.id, atualizado_em: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      logAudit('editou', id, { acao: ativo ? 'ativou' : 'desativou' });
    },
    onMutate: async ({ id, ativo }) => {
      await qc.cancelQueries({ queryKey: ['regras', periodoAno, periodoMes] });
      const prev = qc.getQueryData<any[]>(['regras', periodoAno, periodoMes]);
      if (prev) {
        qc.setQueryData(['regras', periodoAno, periodoMes], prev.map((r: any) => r.id === id ? { ...r, ativo } : r));
      }
      return { prev };
    },
    onError: (e: Error, _vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['regras', periodoAno, periodoMes], ctx.prev);
      toast.error(`Erro: ${e.message}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['regras'] });
    },
  });

  const sincronizarMutation = useMutation({
    mutationFn: async () => {
      const pendentes = regras.filter((r: any) => r.produto && (!r.familia_produto || !r.marca));
      if (pendentes.length === 0) return { atualizadas: 0, semDados: 0, total: 0 };

      const produtos = [...new Set(pendentes.map((r: any) => r.produto as string))];
      const map: Record<string, { familia: string | null; marca: string | null }> = {};

      // Busca em lotes de 100 produtos
      for (let i = 0; i < produtos.length; i += 100) {
        const chunk = produtos.slice(i, i + 100);
        const { data } = await (supabase as any)
          .from('vendas')
          .select('descricao_produto, familia_produto, marca')
          .in('descricao_produto', chunk)
          .not('familia_produto', 'is', null)
          .limit(5000);
        (data ?? []).forEach((v: any) => {
          if (v.descricao_produto && !map[v.descricao_produto]) {
            map[v.descricao_produto] = { familia: v.familia_produto, marca: v.marca };
          }
        });
      }

      let atualizadas = 0;
      let semDados = 0;
      for (const r of pendentes) {
        const meta = map[r.produto];
        if (!meta || (!meta.familia && !meta.marca)) { semDados++; continue; }
        const update: any = { atualizado_por: user?.id, atualizado_em: new Date().toISOString() };
        if (!r.familia_produto && meta.familia) update.familia_produto = meta.familia;
        if (!r.marca && meta.marca) update.marca = meta.marca;
        if (Object.keys(update).length <= 2) { semDados++; continue; }
        const { error } = await (supabase as any).from('comissoes').update(update).eq('id', r.id);
        if (!error) atualizadas++;
      }
      return { atualizadas, semDados, total: pendentes.length };
    },
    onSuccess: (res) => {
      if (res.total === 0) toast.info('Nenhuma regra precisa de sincronização');
      else toast.success(`${res.atualizadas} de ${res.total} regras sincronizadas${res.semDados ? ` (${res.semDados} sem dados nas vendas)` : ''}`);
      qc.invalidateQueries({ queryKey: ['regras'] });
      qc.invalidateQueries({ queryKey: ['produto-meta'] });
    },
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
        criado_em: new Date().toISOString(),
      }));
      const { error } = await (supabase as any).from('comissoes').insert(inserts);
      if (error) throw error;
      await logAudit('criou', null, {
        acao: 'duplicou_lote',
        de: `${MESES[periodoMes]}/${periodoAno}`,
        para: `${MESES[targetMes]}/${targetAno}`,
        quantidade: inserts.length,
      });
    },
    onSuccess: (_, { targetAno, targetMes }) => {
      toast.success(`Regras duplicadas para ${MESES[targetMes]}/${targetAno}`);
      qc.invalidateQueries({ queryKey: ['regras'] });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      setShowDuplicateModal(false);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  // Fetch audit log
  const { data: auditLog = [] } = useQuery({
    queryKey: ['audit-log', periodoAno, periodoMes],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('comissoes_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.warn('Audit table not available:', error.message); return []; }
      return data ?? [];
    },
    enabled: showAuditLog,
  });
  type RegraRow = typeof regras[0];


  const columns = [
    { key: 'nome' as const, label: 'Nome' },
    {
      key: 'regime' as const, label: 'Regime',
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: 'tipo_unidade' as const, label: 'Filiais',
      render: (v: string | null) => v ? (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {v.split(',').map(f => (
            <span key={f} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{f.trim()}</span>
          ))}
        </div>
      ) : <span className="text-muted-foreground text-xs">Todas</span>,
    },
    {
      key: 'familia_produto' as const, label: 'Família',
      render: (v: string | null, row: RegraRow) => {
        if (v) return <span className="text-xs text-foreground">{v}</span>;
        const prod = (row as any).produto;
        const meta = prod ? (produtoMeta as any)[prod] : null;
        if (meta?.familia) return <span className="text-xs text-foreground/80">{meta.familia}</span>;
        if (prod) return <span className="text-xs text-muted-foreground italic">—</span>;
        return <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      key: 'marca' as const, label: 'Marca',
      render: (v: string | null, row: RegraRow) => {
        if (v) return <span className="text-xs text-foreground">{v}</span>;
        const prod = (row as any).produto;
        const meta = prod ? (produtoMeta as any)[prod] : null;
        if (meta?.marca) return <span className="text-xs text-foreground/80">{meta.marca}</span>;
        if (prod) return <span className="text-xs text-muted-foreground italic">—</span>;
        return <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      key: 'produto' as const, label: 'Produto',
      render: (v: string | null) => v ? <span className="text-xs text-foreground max-w-[150px] truncate block" title={v}>{v}</span> : <span className="text-muted-foreground text-xs">—</span>,
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
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleAtivo.mutate({ id: row.id, ativo: !v }); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${v ? 'bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]' : 'bg-secondary'}`}
            aria-label={v ? 'Desativar regra' : 'Ativar regra'}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-foreground transition-transform ${v ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
            {v ? 'Ativo' : 'Inativo'}
          </span>
        </div>
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAuditLog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-secondary-foreground font-semibold text-sm hover:bg-secondary transition-colors"
            >
              <History className="h-4 w-4" /> Auditoria
            </button>
            {regras.length > 0 && (
              <>
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/50 text-destructive font-semibold text-sm hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" /> Excluir Mês
                </button>
                <button
                  onClick={() => { setDupTarget({ ano: periodoAno, mes: periodoMes === 12 ? 1 : periodoMes + 1 }); setShowDuplicateModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-secondary-foreground font-semibold text-sm hover:bg-secondary transition-colors"
                >
                  <Copy className="h-4 w-4" /> Duplicar p/ outro mês
                </button>
              </>
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
              <DataTable
                columns={columns as any}
                data={regras}
                rowClassName={(row: any) => `${row.ativo ? '' : 'opacity-50'} ${row.ativo ? 'bg-transparent' : 'bg-muted/20'}`}
              />
            </div>
            <div className="md:hidden space-y-3">
              {regras.map((r: any) => {
                const prio = PRIORIDADE_LABELS[r.prioridade ?? 0] ?? PRIORIDADE_LABELS[0];
                return (
                  <div key={r.id} className={`bg-card border border-border rounded-lg p-4 shadow-card transition-opacity ${r.ativo ? '' : 'opacity-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-foreground">{r.nome}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <StatusBadge status={r.regime} />
                          {r.tipo_unidade ? r.tipo_unidade.split(',').map((f: string) => <span key={f} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{f.trim()}</span>) : <span className="text-xs text-muted-foreground">Todas</span>}
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

              <div className="space-y-3">
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
                <FilialMultiSelect
                  value={modal.tipo_unidade}
                  onChange={v => setModal({ ...modal, tipo_unidade: v })}
                  unidades={unidades}
                />
              </div>

              {/* Product classification fields */}
              {(() => {
                const isGenerica = !modal.familia_produto && !modal.marca && !modal.produto;
                return (
              <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" /> Classificação do Produto
                  </p>
                  <div
                    className="flex items-center gap-2 select-none"
                    title="Quando ativo, a regra vale para TODAS as vendas que não tenham regra mais específica"
                  >
                    <span className={`text-xs font-semibold uppercase tracking-wide ${isGenerica ? 'text-primary' : 'text-muted-foreground'}`}>
                      ⭐ Regra Geral
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isGenerica}
                      onClick={() => {
                        if (!isGenerica) {
                          setModal({ ...modal, familia_produto: null, marca: null, produto: null });
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        isGenerica ? 'bg-primary' : 'bg-secondary border border-border'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-card shadow-md transition-transform ${
                          isGenerica ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <AutocompleteInput
                  label="Família"
                  value={modal.familia_produto || ''}
                  onChange={v => setModal({ ...modal, familia_produto: v })}
                  options={familiasFiltered}
                  placeholder="Ex: Camisetas, Calças..."
                  disabled={isGenerica}
                />
                <AutocompleteInput
                  label="Marca"
                  value={modal.marca || ''}
                  onChange={v => setModal({ ...modal, marca: v })}
                  options={marcasFiltered}
                  placeholder="Ex: Nike, Adidas..."
                  disabled={isGenerica}
                />
                <AutocompleteInput
                  label="Produto"
                  value={modal.produto || ''}
                  onChange={v => setModal({ ...modal, produto: v })}
                  options={produtosOptions}
                  placeholder={(familiaAtual || marcaAtual) ? "Selecione um produto..." : "Selecione uma família ou marca primeiro..."}
                  disabled={isGenerica}
                />
              </div>
                );
              })()}

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
                disabled={
                  !modal.nome.trim() ||
                  !modal.percentual ||
                  modal.percentual <= 0 ||
                  saveMutation.isPending
                }
                title={
                  !modal.nome.trim() ? 'Informe o nome' :
                  !modal.percentual || modal.percentual <= 0 ? 'Percentual deve ser maior que zero' :
                  'Salvar'
                }
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDuplicateModal(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-card space-y-4">
            <h3 className="text-lg font-bold text-foreground">Duplicar Regras</h3>
            <p className="text-sm text-secondary-foreground">
              Copiar <strong>{regras.length} regras</strong> de {MESES[periodoMes]}/{periodoAno} para:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-secondary-foreground">Mês</label>
                <select
                  value={dupTarget.mes}
                  onChange={e => setDupTarget({ ...dupTarget, mes: parseInt(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-secondary-foreground">Ano</label>
                <input
                  type="number"
                  value={dupTarget.ano}
                  onChange={e => setDupTarget({ ...dupTarget, ano: parseInt(e.target.value) || periodoAno })}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDuplicateModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button
                onClick={() => duplicateMutation.mutate({ targetAno: dupTarget.ano, targetMes: dupTarget.mes })}
                disabled={duplicateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {duplicateMutation.isPending ? 'Duplicando...' : 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Month Confirmation */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDeleteAll(false)} />
          <div className="relative bg-card border border-destructive/30 rounded-xl p-6 w-full max-w-md shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Excluir Todas as Regras</h3>
            </div>
            <p className="text-sm text-secondary-foreground">
              Você está prestes a excluir <strong className="text-destructive">{regras.length} regras</strong> de <strong>{MESES[periodoMes]}/{periodoAno}</strong>. Esta ação será registrada na auditoria e <strong>não pode ser desfeita</strong>.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setConfirmDeleteAll(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleteAllMutation.isPending ? 'Excluindo...' : `Excluir ${regras.length} regras`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAuditLog(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-2xl shadow-card space-y-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Auditoria de Comissões</h3>
              </div>
              <button onClick={() => setShowAuditLog(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de auditoria encontrado. Execute o SQL de migração para habilitar a auditoria.</p>
              ) : (
                auditLog.map((log: any) => {
                  const acaoColors: Record<string, string> = {
                    criou: 'bg-success/20 text-success',
                    editou: 'bg-primary/20 text-primary',
                    excluiu: 'bg-destructive/20 text-destructive',
                    excluiu_lote: 'bg-destructive/20 text-destructive',
                  };
                  const acaoLabels: Record<string, string> = {
                    criou: 'Criou',
                    editou: 'Editou',
                    excluiu: 'Excluiu',
                    excluiu_lote: 'Excluiu em Lote',
                  };
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${acaoColors[log.acao] ?? 'bg-secondary text-muted-foreground'}`}>
                        {acaoLabels[log.acao] ?? log.acao}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{log.usuario_email ?? 'Desconhecido'}</span>
                        </p>
                        {log.detalhes && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.detalhes.nome && `Regra: ${log.detalhes.nome}`}
                            {log.detalhes.percentual != null && ` (${log.detalhes.percentual}%)`}
                            {log.detalhes.acao && log.detalhes.acao}
                            {log.detalhes.periodo && `Período: ${log.detalhes.periodo}`}
                            {log.detalhes.quantidade && ` — ${log.detalhes.quantidade} regras`}
                            {log.detalhes.de && ` De: ${log.detalhes.de} → ${log.detalhes.para}`}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
