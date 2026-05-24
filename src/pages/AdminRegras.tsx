import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { AppShell } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { usePeriod } from '@/contexts/PeriodContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Search, Copy, AlertTriangle, History, Wand2, Sparkles, Upload, FileSpreadsheet, MessageSquare } from 'lucide-react';
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
  const [genericaToggle, setGenericaToggle] = useState(false);

  // Sincroniza toggle ao abrir/editar regra
  useEffect(() => {
    if (modal) {
      setGenericaToggle(!modal.familia_produto && !modal.marca && !modal.produto);
    }
  }, [modal?.id]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [dupTarget, setDupTarget] = useState({ ano: periodoAno, mes: periodoMes });
  const [iaPrompt, setIaPrompt] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  // Importação em lote via IA
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [lotePrompt, setLotePrompt] = useState('');
  const [loteLoading, setLoteLoading] = useState(false);
  const [loteRegras, setLoteRegras] = useState<RegraForm[] | null>(null);
  const [loteSaving, setLoteSaving] = useState(false);
  // Estados para upload de planilha
  const [loteTab, setLoteTab] = useState<'texto' | 'planilha'>('texto');
  const [planilhaFile, setPlanilhaFile] = useState<File | null>(null);
  const [planilhaRows, setPlanilhaRows] = useState<Record<string, string>[]>([]);
  const [planilhaHeaders, setPlanilhaHeaders] = useState<string[]>([]);
  const [isParsingPlanilha, setIsParsingPlanilha] = useState(false);

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

  // Fetch and build global mappings (combinations of Família, Marca, Produto) for advanced autocompletes
  const { data: autocompleteData } = useQuery({
    queryKey: ['regras-autocomplete-combos-completo-v4'],
    queryFn: async () => {
      const rawData: any[] = [];
      const pageSize = 1000;

      // 🚀 Estratégia de Varredura Paralela Bidirecional de Alto Desempenho:
      // Para dar cobertura de 100% das famílias sem travar a tela com 200k linhas,
      // executamos requisições em paralelo no banco buscando as duas pontas da linha do tempo:
      // 1. As 40.000 vendas MAIS RECENTES (para capturar produtos e linhas ativas como VESTUARIO)
      // 2. As 20.000 vendas MAIS ANTIGAS (para cobrir produtos históricos de legado)
      const promises = [];

      // 40 Chunks Recentes (Decrescente)
      for (let i = 0; i < 40; i++) {
        promises.push(
          (supabase as any)
            .from('vendas')
            .select('descricao_produto, familia_produto, marca')
            .order('id', { ascending: false })
            .range(i * pageSize, (i + 1) * pageSize - 1)
            .then((r: any) => r.data || [])
            .catch(() => [])
        );
      }

      // 20 Chunks Históricos (Crescente)
      for (let i = 0; i < 20; i++) {
        promises.push(
          (supabase as any)
            .from('vendas')
            .select('descricao_produto, familia_produto, marca')
            .order('id', { ascending: true })
            .range(i * pageSize, (i + 1) * pageSize - 1)
            .then((r: any) => r.data || [])
            .catch(() => [])
        );
      }

      // O browser orquestra as chamadas em paralelo e recebe tudo em ~2 segundos!
      const results = await Promise.all(promises);
      results.forEach(dataArr => {
        rawData.push(...dataArr);
      });

      const familias = new Set<string>();
      const marcas = new Set<string>();
      const produtos = new Set<string>();

      // Dicionários de Frequência estatística para filtrar erros de digitação pontuais no banco de dados
      const prodComboFreq = new Map<string, Map<string, number>>(); // produto -> "familia||marca" -> frequencia
      const brandFamFreq = new Map<string, Map<string, number>>();  // marca -> familia -> frequencia

      const familiaToMarcas = new Map<string, Set<string>>();
      const marcaToFamilias = new Map<string, Set<string>>();
      const marcaToProdutos = new Map<string, Set<string>>();

      rawData.forEach((r: any) => {
        const p = r.descricao_produto || '';
        const f = r.familia_produto || '';
        const m = r.marca || '';

        if (f) familias.add(f);
        if (m) marcas.add(m);
        if (p) produtos.add(p);

        // Associação simples para filtros em cascata do dropdown
        if (f && m) {
          if (!familiaToMarcas.has(f)) familiaToMarcas.set(f, new Set());
          familiaToMarcas.get(f)!.add(m);
          if (!marcaToFamilias.has(m)) marcaToFamilias.set(m, new Set());
          marcaToFamilias.get(m)!.add(f);
        }
        if (m && p) {
          if (!marcaToProdutos.has(m)) marcaToProdutos.set(m, new Set());
          marcaToProdutos.get(m)!.add(p);
        }

        // Cálculo de frequências cruzadas para inteligência de associação estatística
        if (p && (f || m)) {
          if (!prodComboFreq.has(p)) prodComboFreq.set(p, new Map());
          const key = `${f}||${m}`;
          const subMap = prodComboFreq.get(p)!;
          subMap.set(key, (subMap.get(key) || 0) + 1);
        }
        if (m && f) {
          if (!brandFamFreq.has(m)) brandFamFreq.set(m, new Map());
          const subMap = brandFamFreq.get(m)!;
          subMap.set(f, (subMap.get(f) || 0) + 1);
        }
      });

      // 1. Resolve a Família/Marca dominante para cada Produto (ignora variações pontuais com erros)
      const produtoToMeta = new Map<string, { familia: string | null; marca: string | null }>();
      prodComboFreq.forEach((subMap, p) => {
        let bestKey = '';
        let maxCount = -1;
        subMap.forEach((cnt, key) => {
          if (cnt > maxCount) {
            maxCount = cnt;
            bestKey = key;
          }
        });
        const [f, m] = bestKey.split('||');
        produtoToMeta.set(p, { familia: f || null, marca: m || null });
      });

      // 2. Resolve a Família dominante para cada Marca (puxa a família exata livre de ruído do banco)
      const marcaToFamDominante = new Map<string, string>();
      brandFamFreq.forEach((subMap, m) => {
        let bestFam = '';
        let maxCount = -1;
        subMap.forEach((cnt, f) => {
          if (cnt > maxCount) {
            maxCount = cnt;
            bestFam = f;
          }
        });
        if (bestFam) marcaToFamDominante.set(m, bestFam);
      });

      return {
        familias: [...familias].sort(),
        marcas: [...marcas].sort(),
        produtos: [...produtos].sort(),
        familiaToMarcas,
        marcaToFamilias,
        marcaToProdutos,
        produtoToMeta,
        marcaToFamDominante,
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  const allProdutosOptions = useMemo(() => autocompleteData?.produtos ?? [], [autocompleteData]);

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

  // Produtos filtrados instantaneamente via memória para o modal individual
  const familiaAtual = modal?.familia_produto || null;
  const marcaAtual = modal?.marca || null;
  const produtosOptions = useMemo(() => {
    if (!autocompleteData) return [];
    if (marcaAtual && autocompleteData.marcaToProdutos?.has(marcaAtual)) {
      return [...autocompleteData.marcaToProdutos.get(marcaAtual)!].sort();
    }
    if (familiaAtual && autocompleteData.familiaToMarcas?.has(familiaAtual)) {
      const marcasPertencentes = autocompleteData.familiaToMarcas.get(familiaAtual)!;
      const prodUnicos = new Set<string>();
      marcasPertencentes.forEach(m => {
        if (autocompleteData.marcaToProdutos?.has(m)) {
          autocompleteData.marcaToProdutos.get(m)!.forEach(p => prodUnicos.add(p));
        }
      });
      return [...prodUnicos].sort();
    }
    return autocompleteData.produtos;
  }, [autocompleteData, familiaAtual, marcaAtual]);

  // Opções filtradas de família/marca baseadas no que já foi selecionado
  const familiasFiltered = useMemo(() => {
    if (!autocompleteData) return [];
    // O dropdown de Famílias deve sempre exibir TODAS as famílias existentes do banco
    return autocompleteData.familias;
  }, [autocompleteData]);

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
      render: (v: number) => <span className="text-primary font-bold text-lg">{Number(v).toFixed(2)}%</span>,
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

  const gerarComIA = async () => {
    if (!modal) return;
    const prompt = iaPrompt.trim();
    if (!prompt) {
      toast.error('Descreva a regra antes de usar a IA');
      return;
    }
    setIaLoading(true);
    try {
      const contexto = {
        familias: autocompleteData?.familias ?? [],
        marcas: autocompleteData?.marcas ?? [],
        produtos: (produtosOptions as string[]).slice(0, 200),
        unidades: unidades.map(u => u.nome),
      };
      
      const { data: res, error } = await supabase.functions.invoke('gerar-regra-ia', {
        body: { prompt, contexto }
      });

      if (error) throw error;
      if (!res?.ok) throw new Error(res?.error || 'Erro ao gerar com IA');

      const sug = res.data;

      setModal(prev => prev ? {
        ...prev,
        nome: sug.nome ?? prev.nome,
        regime: sug.regime ?? prev.regime,
        tipo_unidade: sug.tipo_unidade ?? null,
        familia_produto: sug.familia_produto ?? null,
        marca: sug.marca ?? null,
        produto: sug.produto ?? null,
        percentual: typeof sug.percentual === 'number' ? sug.percentual : prev.percentual,
        min_faturamento: sug.min_faturamento ?? null,
        ativo: sug.ativo ?? prev.ativo,
        periodo_ano: prev.periodo_ano,
        periodo_mes: prev.periodo_mes,
      } : prev);
      toast.success('Campos preenchidos pela IA. Revise antes de salvar.');
    } catch (e: any) {
      console.error('IA erro', e);
      toast.error(e?.message || 'Erro ao gerar com IA');
    } finally {
      setIaLoading(false);
    }
  };


  const analisarLoteIA = async () => {
    const prompt = lotePrompt.trim();
    if (!prompt) {
      toast.error('Cole o texto com as regras antes de analisar');
      return;
    }
    setLoteLoading(true);
    try {
      const contexto = {
        familias: autocompleteData?.familias ?? [],
        marcas: autocompleteData?.marcas ?? [],
        produtos: (allProdutosOptions as string[]).slice(0, 1000),
        unidades: unidades.map(u => u.nome),
      };

      const { data: res, error } = await supabase.functions.invoke('gerar-regras-lote', {
        body: { prompt, contexto }
      });

      if (error) throw error;
      if (!res?.ok) throw new Error(res?.error || 'Erro ao analisar lote com IA');

      const regrasArr = res.regras || [];
      
      if (regrasArr.length === 0) {
        toast.warning('A IA não conseguiu extrair nenhuma regra do texto');
        return;
      }
      const formatadas: RegraForm[] = regrasArr.map((r: any) => {
        let fam = r.familia_produto ?? null;
        let mar = r.marca ?? null;
        const prod = r.produto ?? null;

        // Auto-resolução inteligente contra o Banco de Dados em tempo real:
        if (prod && autocompleteData?.produtoToMeta?.has(prod)) {
          const meta = autocompleteData.produtoToMeta.get(prod)!;
          if (meta.familia) fam = meta.familia;
          if (meta.marca) mar = meta.marca;
        } else if (mar && !fam && autocompleteData?.marcaToFamDominante?.has(mar)) {
          fam = autocompleteData.marcaToFamDominante.get(mar)!;
        }

        return {
          nome: (r.nome ?? 'Regra IA').toString(),
          regime: r.regime === 'CLT' ? 'CLT' : 'PJ',
          tipo_unidade: r.tipo_unidade ?? null,
          familia_produto: fam,
          marca: mar,
          produto: prod,
          percentual: typeof r.percentual === 'number' ? r.percentual : parseFloat(r.percentual) || 0,
          min_faturamento: r.min_faturamento ?? null,
          periodo_ano: periodoAno,
          periodo_mes: periodoMes,
          ativo: true,
        };
      });
      setLoteRegras(formatadas);
      toast.success(`${formatadas.length} regras extraídas. Revise e salve.`);
    } catch (e: any) {
      console.error('IA lote erro', e);
      toast.error(e?.message || 'Erro ao analisar com IA');
    } finally {
      setLoteLoading(false);
    }
  };

  const handlePlanilhaUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
      const rawHeaders = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];
      setPlanilhaHeaders(rawHeaders.map(String));
      setPlanilhaRows(rows);
      setPlanilhaFile(file);
    } catch (e: any) {
      toast.error('Erro ao ler o arquivo: ' + (e?.message || 'formato não suportado'));
    }
  };

  const analisarPlanilhaIA = async () => {
    if (planilhaRows.length === 0) {
      toast.error('Selecione uma planilha antes de analisar');
      return;
    }
    setIsParsingPlanilha(true);
    try {
      const contexto = {
        familias: autocompleteData?.familias ?? [],
        marcas: autocompleteData?.marcas ?? [],
        produtos: (allProdutosOptions as string[]).slice(0, 1000),
        unidades: unidades.map(u => u.nome),
      };

      const { data: res, error } = await supabase.functions.invoke('interpretar-planilha-regras', {
        body: { headers: planilhaHeaders, rows: planilhaRows.slice(0, 200), contexto },
      });

      if (error) throw error;
      if (!res?.ok) throw new Error(res?.error || 'Erro ao interpretar planilha com IA');

      const regrasArr = res.regras || [];
      if (regrasArr.length === 0) {
        toast.warning('A IA não conseguiu extrair nenhuma regra da planilha');
        return;
      }

      const formatadas: RegraForm[] = regrasArr.map((r: any) => {
        let fam = r.familia_produto ?? null;
        let mar = r.marca ?? null;
        const prod = r.produto ?? null;

        if (prod && autocompleteData?.produtoToMeta?.has(prod)) {
          const meta = autocompleteData.produtoToMeta.get(prod)!;
          if (meta.familia) fam = meta.familia;
          if (meta.marca) mar = meta.marca;
        } else if (mar && !fam && autocompleteData?.marcaToFamDominante?.has(mar)) {
          fam = autocompleteData.marcaToFamDominante.get(mar)!;
        }

        return {
          nome: (r.nome ?? 'Regra IA').toString(),
          regime: r.regime === 'CLT' ? 'CLT' : 'PJ',
          tipo_unidade: r.tipo_unidade ?? null,
          familia_produto: fam,
          marca: mar,
          produto: prod,
          percentual: typeof r.percentual === 'number' ? r.percentual : parseFloat(r.percentual) || 0,
          min_faturamento: r.min_faturamento ?? null,
          periodo_ano: periodoAno,
          periodo_mes: periodoMes,
          ativo: true,
        };
      });

      setLoteRegras(formatadas);
      toast.success(`${formatadas.length} regras extraídas da planilha. Revise e salve.`);
    } catch (e: any) {
      console.error('IA planilha erro', e);
      toast.error(e?.message || 'Erro ao interpretar planilha com IA');
    } finally {
      setIsParsingPlanilha(false);
    }
  };

  const salvarLote = async () => {
    if (!loteRegras || loteRegras.length === 0) return;
    setLoteSaving(true);
    try {
      const inserts = loteRegras
        .filter(r => r.nome.trim() && r.percentual > 0)
        .map(r => ({
          nome: r.nome.trim(),
          regime: r.regime,
          tipo_unidade: r.tipo_unidade || null,
          familia_produto: r.familia_produto || null,
          marca: r.marca || null,
          produto: r.produto || null,
          percentual: r.percentual,
          min_faturamento: r.min_faturamento || null,
          periodo_ano: periodoAno,
          periodo_mes: periodoMes,
          ativo: r.ativo,
          criado_por: user?.id,
          criado_em: new Date().toISOString(),
        }));
      if (inserts.length === 0) {
        toast.error('Nenhuma regra válida para salvar');
        return;
      }
      const { error } = await (supabase as any).from('comissoes').insert(inserts);
      if (error) throw error;
      await logAudit('criou', null, {
        acao: 'importou_lote_ia',
        periodo: `${MESES[periodoMes]}/${periodoAno}`,
        quantidade: inserts.length,
      });
      toast.success(`${inserts.length} regras importadas com sucesso`);
      qc.invalidateQueries({ queryKey: ['regras'] });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      setShowLoteModal(false);
      setLoteRegras(null);
      setLotePrompt('');
      setLoteTab('texto');
      setPlanilhaFile(null);
      setPlanilhaRows([]);
      setPlanilhaHeaders([]);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar lote');
    } finally {
      setLoteSaving(false);
    }
  };


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
              onClick={() => { setLoteRegras(null); setLotePrompt(''); setLoteTab('texto'); setPlanilhaFile(null); setPlanilhaRows([]); setPlanilhaHeaders([]); setShowLoteModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="h-4 w-4" /> Importar lote (IA)
            </button>
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
                      <span className="text-primary font-bold text-xl">{Number(r.percentual).toFixed(2)}%</span>
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
              {/* Bloco IA: preencher campos automaticamente */}
              <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  Preencher com IA
                </div>
                <textarea
                  value={iaPrompt}
                  onChange={e => setIaPrompt(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder='Ex.: 1,25% para família SUPLEMENTOS marca GROWTH no DELIVERY, regime PJ'
                  disabled={iaLoading}
                />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground">A IA usa apenas valores existentes no banco. Revise antes de salvar.</span>
                  <button
                    type="button"
                    onClick={gerarComIA}
                    disabled={iaLoading || !iaPrompt.trim()}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {iaLoading ? 'Gerando...' : 'Gerar'}
                  </button>
                </div>
              </div>

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
                const isGenerica = genericaToggle;
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
                        const next = !isGenerica;
                        setGenericaToggle(next);
                        if (next) {
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
                  onChange={v => {
                    const next = { ...modal, marca: v };
                    if (v && autocompleteData?.marcaToFamDominante?.has(v)) {
                      next.familia_produto = autocompleteData.marcaToFamDominante.get(v)!;
                    }
                    setModal(next);
                  }}
                  options={marcasFiltered}
                  placeholder="Ex: Nike, Adidas..."
                  disabled={isGenerica}
                />
                <AutocompleteInput
                  label="Produto"
                  value={modal.produto || ''}
                  onChange={v => {
                    const next = { ...modal, produto: v };
                    if (v && autocompleteData?.produtoToMeta?.has(v)) {
                      const meta = autocompleteData.produtoToMeta.get(v)!;
                      if (meta.familia) next.familia_produto = meta.familia;
                      if (meta.marca) next.marca = meta.marca;
                    }
                    setModal(next);
                  }}
                  options={produtosOptions}
                  placeholder="Selecione ou busque um produto..."
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

      {/* Importar lote via IA */}
      {showLoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !loteSaving && setShowLoteModal(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-6xl shadow-card space-y-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">
                  Importar regras em lote (IA) — {MESES[periodoMes]}/{periodoAno}
                </h3>
              </div>
              <button onClick={() => !loteSaving && setShowLoteModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            {!loteRegras ? (
              <>
                {/* Seletor de modo: Texto ou Planilha */}
                <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => setLoteTab('texto')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${loteTab === 'texto' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoteTab('planilha')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${loteTab === 'planilha' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Planilha
                  </button>
                </div>

                {loteTab === 'texto' ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Cole o texto completo (mensagem do WhatsApp, comunicado etc). A IA vai extrair várias regras de uma vez. Você revisa e salva todas.
                    </p>
                    <textarea
                      value={lotePrompt}
                      onChange={e => setLotePrompt(e.target.value)}
                      rows={14}
                      disabled={loteLoading}
                      placeholder="Ex: 5% – Ares, Diuretic, TESTO1000... | 4% – Marcas Próprias DCX, Grow Up... | 1,25% – Outras marcas..."
                      className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y font-mono"
                    />
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowLoteModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary">Cancelar</button>
                      <button
                        onClick={analisarLoteIA}
                        disabled={loteLoading || !lotePrompt.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        {loteLoading ? 'Analisando...' : 'Analisar com IA'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Envie uma planilha (.csv, .xlsx, .xls) com as regras de comissão. A IA interpreta as colunas automaticamente — você revisa e salva.
                    </p>

                    {/* Zona de upload com drag-and-drop */}
                    <label
                      htmlFor="planilha-upload"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f && /\.(csv|xlsx|xls)$/i.test(f.name)) handlePlanilhaUpload(f);
                        else if (f) toast.error('Formato não suportado. Use .csv, .xlsx ou .xls');
                      }}
                      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${planilhaFile ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-secondary/50'}`}
                    >
                      {planilhaFile ? (
                        <>
                          <FileSpreadsheet className="h-8 w-8 text-primary" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">{planilhaFile.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {planilhaRows.length} linha{planilhaRows.length !== 1 ? 's' : ''} encontrada{planilhaRows.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <p className="text-xs text-primary underline">Clique para trocar o arquivo</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">Arraste o arquivo ou clique para selecionar</p>
                            <p className="text-xs text-muted-foreground mt-1">Aceita .csv, .xlsx, .xls</p>
                          </div>
                        </>
                      )}
                      <input
                        id="planilha-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePlanilhaUpload(f); e.target.value = ''; }}
                      />
                    </label>

                    {/* Mini-prévia das primeiras 3 linhas */}
                    {planilhaRows.length > 0 && planilhaHeaders.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-secondary/50 px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Prévia da planilha</span>
                          <span className="text-xs text-muted-foreground">{planilhaHeaders.length} coluna{planilhaHeaders.length !== 1 ? 's' : ''} detectada{planilhaHeaders.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                {planilhaHeaders.map(h => (
                                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground truncate max-w-[140px] whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {planilhaRows.slice(0, 3).map((row, i) => (
                                <tr key={i} className="border-b border-border/50 last:border-0">
                                  {planilhaHeaders.map(h => (
                                    <td key={h} className="px-3 py-1.5 text-foreground truncate max-w-[140px] whitespace-nowrap">{(row as any)[h] ?? ''}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowLoteModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary">Cancelar</button>
                      <button
                        onClick={analisarPlanilhaIA}
                        disabled={isParsingPlanilha || planilhaRows.length === 0}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        {isParsingPlanilha ? 'Interpretando...' : 'Analisar com IA'}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {(() => {
                  const isRowWarning = (r: RegraForm) => 
                    (!r.familia_produto && !r.marca && !r.produto) ||
                    (r.produto && (!r.marca || !r.familia_produto)) ||
                    (r.marca && !r.familia_produto);
                  const warningCount = loteRegras.filter(isRowWarning).length;
                  return (
                    <>
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-secondary-foreground">
                            <strong className="text-primary">{loteRegras.length} regras</strong> extraídas. Edite o que precisar e salve. Use <Trash2 className="inline h-3 w-3" /> para remover linhas indesejadas.
                          </p>
                          <button
                            onClick={() => setLoteRegras(null)}
                            className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                          >
                            ← voltar e re-analisar
                          </button>
                        </div>

                        {warningCount > 0 && (
                          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg p-2.5 text-xs flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong>Aviso de Metadados Pendentes:</strong> {warningCount} {warningCount === 1 ? 'regra possui' : 'regras possuem'} pendência de associação (Marca ou Família não identificadas no banco para a classificação, ou operando como Regra Geral). Verifique e preencha abaixo para garantir associação exata.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="overflow-auto flex-1 border border-border rounded-lg">
                        <table className="w-full text-sm min-w-[1000px]">
                          <thead className="bg-secondary sticky top-0">
                            <tr className="text-left text-xs uppercase text-muted-foreground">
                              <th className="px-2 py-2 pl-3">Nome</th>
                              <th className="px-2 py-2">Reg.</th>
                              <th className="px-2 py-2">Filiais</th>
                              <th className="px-2 py-2">Família</th>
                              <th className="px-2 py-2">Marca</th>
                              <th className="px-2 py-2">Produto</th>
                              <th className="px-2 py-2 text-right">%</th>
                              <th className="px-2 py-2 text-right">Min Fat.</th>
                              <th className="px-2 py-2 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {loteRegras.map((r, idx) => {
                              const isWarning = 
                                (!r.familia_produto && !r.marca && !r.produto) ||
                                (r.produto && (!r.marca || !r.familia_produto)) ||
                                (r.marca && !r.familia_produto);

                              // Opções inteligentes por linha (Cascading Dropdowns):
                              const familiasForRow = autocompleteData?.familias ?? [];

                              let marcasForRow = autocompleteData?.marcas ?? [];
                              if (r.familia_produto && autocompleteData?.familiaToMarcas?.has(r.familia_produto)) {
                                marcasForRow = [...autocompleteData.familiaToMarcas.get(r.familia_produto)!].sort();
                              }

                              let produtosForRow = autocompleteData?.produtos ?? [];
                              if (r.marca && autocompleteData?.marcaToProdutos?.has(r.marca)) {
                                produtosForRow = [...autocompleteData.marcaToProdutos.get(r.marca)!].sort();
                              } else if (r.familia_produto && autocompleteData?.familiaToMarcas?.has(r.familia_produto)) {
                                const marcasNaFam = autocompleteData.familiaToMarcas.get(r.familia_produto)!;
                                const prodMatches = new Set<string>();
                                marcasNaFam.forEach(m => {
                                  if (autocompleteData.marcaToProdutos?.has(m)) {
                                    autocompleteData.marcaToProdutos.get(m)!.forEach(p => prodMatches.add(p));
                                  }
                                });
                                if (prodMatches.size > 0) produtosForRow = [...prodMatches].sort();
                              }

                              return (
                                <tr key={idx} className={`border-t border-border hover:bg-secondary/30 ${isWarning ? 'bg-warning/5' : ''}`}>
                                  {/* DataLists locais renderizados na própria célula */}
                                  <td className="hidden">
                                    <datalist id={`lote-familias-${idx}`}>
                                      {familiasForRow.map(f => <option key={f} value={f} />)}
                                    </datalist>
                                    <datalist id={`lote-marcas-${idx}`}>
                                      {marcasForRow.map(m => <option key={m} value={m} />)}
                                    </datalist>
                                    <datalist id={`lote-produtos-${idx}`}>
                                      {produtosForRow.map(p => <option key={p} value={p} />)}
                                    </datalist>
                                  </td>
                                  <td className="px-2 py-1 pl-3 flex items-center gap-1.5 min-w-[180px]">
                                    {isWarning && (
                                      <span title="Esta regra possui pendência de metadados (Marca/Família não identificados)" className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                    )}
                                    <input
                                      value={r.nome}
                                      onChange={e => setLoteRegras(prev => prev!.map((x, i) => i === idx ? { ...x, nome: e.target.value } : x))}
                                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-xs"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <select
                                      value={r.regime}
                                      onChange={e => setLoteRegras(prev => prev!.map((x, i) => i === idx ? { ...x, regime: e.target.value } : x))}
                                      className="bg-secondary border border-border rounded px-1 py-0.5 text-xs"
                                    >
                                      <option value="PJ">PJ</option>
                                      <option value="CLT">CLT</option>
                                    </select>
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      value={r.tipo_unidade ?? ''}
                                      placeholder="Todas"
                                      onChange={e => setLoteRegras(prev => prev!.map((x, i) => i === idx ? { ...x, tipo_unidade: e.target.value || null } : x))}
                                      className="w-28 bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-xs"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      value={r.familia_produto ?? ''}
                                      placeholder="—"
                                      list={`lote-familias-${idx}`}
                                      onChange={e => {
                                        const val = e.target.value || null;
                                        setLoteRegras(prev => prev!.map((x, i) => i === idx ? { ...x, familia_produto: val } : x));
                                      }}
                                      className="w-44 bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-xs font-medium placeholder-muted-foreground/50"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      value={r.marca ?? ''}
                                      placeholder="—"
                                      list={`lote-marcas-${idx}`}
                                      onChange={e => {
                                        const val = e.target.value || null;
                                        setLoteRegras(prev => prev!.map((x, i) => {
                                          if (i !== idx) return x;
                                          const updated = { ...x, marca: val };
                                          if (val && autocompleteData?.marcaToFamDominante?.has(val)) {
                                            updated.familia_produto = autocompleteData.marcaToFamDominante.get(val)!;
                                          }
                                          return updated;
                                        }));
                                      }}
                                      className="w-44 bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-xs font-medium placeholder-muted-foreground/50"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      value={r.produto ?? ''}
                                      placeholder="—"
                                      list={`lote-produtos-${idx}`}
                                      onChange={e => {
                                        const val = e.target.value || null;
                                        setLoteRegras(prev => prev!.map((x, i) => {
                                          if (i !== idx) return x;
                                          const updated = { ...x, produto: val };
                                          if (val && autocompleteData?.produtoToMeta?.has(val)) {
                                            const meta = autocompleteData.produtoToMeta.get(val)!;
                                            if (meta.familia) updated.familia_produto = meta.familia;
                                            if (meta.marca) updated.marca = meta.marca;
                                          }
                                          return updated;
                                        }));
                                      }}
                                      className="w-64 bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-xs font-medium placeholder-muted-foreground/50"
                                    />
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    <input
                                      type="number"
                                      step="0.05"
                                      value={r.percentual}
                                      onChange={e => setLoteRegras(prev => prev!.map((x, i) => i === idx ? { ...x, percentual: parseFloat(e.target.value) || 0 } : x))}
                                      className="w-20 text-right bg-secondary border border-border rounded px-1 py-0.5 text-xs text-primary font-bold"
                                    />
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    <input
                                      type="number"
                                      step="100"
                                      value={r.min_faturamento ?? ''}
                                      placeholder="—"
                                      onChange={e => setLoteRegras(prev => prev!.map((x, i) => i === idx ? { ...x, min_faturamento: e.target.value ? parseFloat(e.target.value) : null } : x))}
                                      className="w-24 text-right bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-xs"
                                    />
                                  </td>
                                  <td className="px-2 py-1 text-center">
                                    <button
                                      onClick={() => setLoteRegras(prev => prev!.filter((_, i) => i !== idx))}
                                      className="p-1 text-muted-foreground hover:text-destructive"
                                      title="Remover"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}

                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <button onClick={() => setShowLoteModal(false)} disabled={loteSaving} className="px-4 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-secondary disabled:opacity-50">Cancelar</button>
                  <button
                    onClick={salvarLote}
                    disabled={loteSaving || loteRegras.length === 0}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {loteSaving ? 'Salvando...' : `Salvar ${loteRegras.length} regras`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
