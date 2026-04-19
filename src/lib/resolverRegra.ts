/**
 * Resolves the most specific commission rule for a given sale.
 * Priority: Product(4) > Family+Brand(3) > Brand(2) > Family(1) > Generic(0)
 * Supports min_faturamento: rule only applies if vendor revenue >= threshold
 */

export interface RegraComissao {
  id: string;
  nome: string;
  regime: string;
  tipo_unidade: string | null;
  familia_produto: string | null;
  marca: string | null;
  produto: string | null;
  percentual: number;
  min_faturamento: number | null;
  prioridade: number;
  ativo: boolean;
}

export interface VendaParaRegra {
  regime?: string;
  tipo_unidade?: string;
  familia_produto?: string;
  marca?: string;
  descricao_produto?: string;
  faturamento_vendedor?: number; // total revenue of the vendor for the period
}

export function calcularPrioridade(regra: { produto?: string | null; familia_produto?: string | null; marca?: string | null }): number {
  if (regra.produto) return 4;
  if (regra.familia_produto && regra.marca) return 3;
  if (regra.marca) return 2;
  if (regra.familia_produto) return 1;
  return 0;
}

export function resolverRegra(
  venda: VendaParaRegra,
  regrasAtivas: RegraComissao[]
): RegraComissao | null {
  const compativeis = regrasAtivas.filter((regra) => {
    if (!regra.ativo) return false;
    if (venda.regime && regra.regime !== venda.regime) return false;
    if (regra.tipo_unidade && venda.tipo_unidade && regra.tipo_unidade !== venda.tipo_unidade) return false;
    if (regra.produto && regra.produto !== venda.descricao_produto) return false;
    if (regra.familia_produto && regra.familia_produto !== venda.familia_produto) return false;
    if (regra.marca && regra.marca !== venda.marca) return false;
    // Check min_faturamento threshold
    if (regra.min_faturamento && regra.min_faturamento > 0) {
      if (!venda.faturamento_vendedor || venda.faturamento_vendedor < regra.min_faturamento) return false;
    }
    return true;
  });

  if (compativeis.length === 0) return null;

  compativeis.sort((a, b) => {
    const prioA = a.prioridade ?? calcularPrioridade(a);
    const prioB = b.prioridade ?? calcularPrioridade(b);
    if (prioB !== prioA) return prioB - prioA;
    // Prefer rules with specific tipo_unidade over generic ones
    const specA = a.tipo_unidade ? 1 : 0;
    const specB = b.tipo_unidade ? 1 : 0;
    if (specB !== specA) return specB - specA;
    // Prefer rules with higher min_faturamento (more specific)
    const minA = a.min_faturamento ?? 0;
    const minB = b.min_faturamento ?? 0;
    return minB - minA;
  });
  return compativeis[0];
}
