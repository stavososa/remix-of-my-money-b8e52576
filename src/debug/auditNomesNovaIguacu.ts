// DEBUG: Lista vendedor_nome em fev/2026 (Nova Iguaçu) que não estão na lista
// oficial e nem são canais externos.
//
// Uso no navegador (em qualquer página do app, devtools console):
//   import('/src/debug/auditNomesNovaIguacu.ts').then(m => m.auditNomesNovaIguacu())
//
// Ou cole o conteúdo da função direto no console se preferir.

import { supabase } from '@/integrations/supabase/client';
import { isCanalExterno } from '@/lib/canaisExternos';

const LISTA_OFICIAL = new Set(
  [
    'BEATRIZ AGUIAR',
    'CARLS HENRIQUE',
    'CAROLINE LACERDA',
    'CHECK OUT VISTA ALEGRE',
    'CHECKOUT NOVA IGUAÇU',
    'DEVI PDV_01',
    'DEVI PDV_02',
    'DEVI PDV_03',
    'DEVI PDV_04',
    'KELLY ANNE',
    'LUCAS VILLAR',
    'LUIS FELIPE',
    'ORLANDO MARINHO',
    'WALLACE OLIVEIRA',
  ].map((n) => n.trim().toUpperCase())
);

export async function auditNomesNovaIguacu() {
  console.log('🔍 Buscando CNPJ(s) da filial Nova Iguaçu...');
  const { data: unidades, error: errU } = await supabase
    .from('unidades')
    .select('nome, cnpj_empresa')
    .ilike('nome', '%NOVA%IGUA%');

  if (errU) {
    console.error('Erro ao buscar unidades:', errU);
    return;
  }
  if (!unidades?.length) {
    console.warn('Nenhuma unidade Nova Iguaçu encontrada.');
    return;
  }
  const cnpjs = unidades.map((u: any) => u.cnpj_empresa).filter(Boolean);
  console.log('CNPJs Nova Iguaçu:', cnpjs);

  console.log('📥 Carregando vendas de fev/2026...');
  const PAGE = 1000;
  let from = 0;
  const all: Array<{
    vendedor_nome: string | null;
    total_com_desconto: number | null;
    lucros_reais: number | null;
    nota_fiscal: string | null;
    descricao_produto: string | null;
    familia_produto: string | null;
  }> = [];

  while (true) {
    const { data, error } = await supabase
      .from('vendas')
      .select('vendedor_nome,total_com_desconto,lucros_reais,nota_fiscal,descricao_produto,familia_produto')
      .gte('data_emissao', '2026-02-01')
      .lte('data_emissao', '2026-02-28')
      .in('cnpj_empresa', cnpjs)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Erro ao buscar vendas:', error);
      return;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as any));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Total de linhas Nova Iguaçu fev/2026: ${all.length}`);

  // Agrupa por vendedor
  const map = new Map<
    string,
    { qtd_linhas: number; faturamento: number; lucro: number; nfs: Set<string>; tem_linha_canal_ext: boolean }
  >();

  for (const r of all) {
    const nome = (r.vendedor_nome ?? '(sem nome)').trim();
    if (!map.has(nome)) {
      map.set(nome, { qtd_linhas: 0, faturamento: 0, lucro: 0, nfs: new Set(), tem_linha_canal_ext: false });
    }
    const agg = map.get(nome)!;
    agg.qtd_linhas += 1;
    agg.faturamento += Number(r.total_com_desconto) || 0;
    agg.lucro += Number(r.lucros_reais) || 0;
    if (r.nota_fiscal) agg.nfs.add(r.nota_fiscal);
    if (isCanalExterno(r.vendedor_nome, r.descricao_produto, r.familia_produto)) {
      agg.tem_linha_canal_ext = true;
    }
  }

  type Row = {
    vendedor: string;
    qtd_linhas: number;
    qtd_nfs: number;
    faturamento: string;
    lucro: string;
    classificacao: 'OFICIAL' | 'CANAL_EXTERNO' | 'ESTRANHO';
  };

  const rows: Row[] = [];
  for (const [nome, agg] of map.entries()) {
    const upper = nome.toUpperCase();
    let classificacao: Row['classificacao'] = 'ESTRANHO';
    if (LISTA_OFICIAL.has(upper)) classificacao = 'OFICIAL';
    else if (isCanalExterno(nome) || agg.tem_linha_canal_ext) classificacao = 'CANAL_EXTERNO';

    rows.push({
      vendedor: nome,
      qtd_linhas: agg.qtd_linhas,
      qtd_nfs: agg.nfs.size,
      faturamento: agg.faturamento.toFixed(2),
      lucro: agg.lucro.toFixed(2),
      classificacao,
    });
  }

  rows.sort((a, b) => Number(b.faturamento) - Number(a.faturamento));

  const estranhos = rows.filter((r) => r.classificacao === 'ESTRANHO');

  console.log('===== TODOS os vendedores (Nova Iguaçu / fev/2026) =====');
  console.table(rows);

  console.log(`===== ⚠️ ESTRANHOS (não-oficial e não-canal-externo): ${estranhos.length} =====`);
  console.table(estranhos);

  const totalEstranho = estranhos.reduce((s, r) => s + Number(r.faturamento), 0);
  const lucroEstranho = estranhos.reduce((s, r) => s + Number(r.lucro), 0);
  console.log(
    `Total faturamento "estranhos": R$ ${totalEstranho.toFixed(2)} | Lucro: R$ ${lucroEstranho.toFixed(2)}`
  );

  return { rows, estranhos };
}

// Auto-expõe global pra facilitar:
// @ts-ignore
(window as any).auditNomesNovaIguacu = auditNomesNovaIguacu;
