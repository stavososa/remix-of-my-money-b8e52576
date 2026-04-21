// Detecta "vendedores" que na verdade representam canais externos / marketplaces
// (iFood, Mercado Livre, Shopee, Magazine Luiza, Loja Integrada, TikTok Shop, sites próprios).
// Usado em filtros de visualização — não altera dados no banco.

const PADROES_CANAIS_EXTERNOS = [
  // Marketplaces / sites
  /\bIFOOD\b/i,
  /MERCADO\s*LIVRE/i,
  /\bSHOPEE\b/i,
  /MAGAZINE\s*LUIZA|\bMAGALU\b/i,
  /LOJA\s*INTEGRADA/i,
  /TIK\s*TOK|TIKTOK/i,
  /^\s*SITE\b/i, // SITE ATACADÃO, SITE MAROMBA STORE, etc.
  // Operacionais / não-vendedores
  /\bAVARIA\b/i,           // AVARIA, AVARIA CG, AVARIA DE VALIDADE
  /BONIFICA[ÇC][ÃA]O/i,    // BONIFICAÇÃO FREGUESIA, BONIFICAÇÃO LOJA
  /\bBRINDES?\b/i,         // BRINDES/AÇÕES BARRA, CG, VALQUEIRE
  /DEGUSTA[ÇC][ÃA]O/i,     // DEGUSTAÇÃO LOJA *, DEGUSTAÇÃO NOVA IGUAÇU
  /PROMOTOR/i,             // PROMOTOR/DEGUSTAÇÃO VALQUEIRE
  /PARCERIA/i,             // PARCERIA/COLLAB, PARCERIA/INFLUENCER
  /\bCOLLAB\b/i,
  /INFLUENCER/i,
  /\bRESGATE\b/i,          // RESGATE BARRA, BOTAFOGO, RECREIO
];

// Regra adicional: linhas das famílias OUTROS/ATACADO cuja descrição contenha
// um percentual (ex.: "TAXA 4%", "REPASSE 7%") são tratadas como canal externo.
export const PADRAO_DESCRICAO_PERCENTUAL = /\d+([.,]\d+)?\s*%/;
export const FAMILIAS_CANAL_EXTERNO_COM_PCT = new Set(['OUTROS', 'ATACADO']);

export const PADROES_CANAIS_EXTERNOS_LABEL = [
  'iFood (todas filiais)',
  'Mercado Livre',
  'Shopee',
  'Magazine Luiza',
  'Loja Integrada',
  'TikTok Shop',
  'SITE ... (sites próprios)',
  'AVARIA / AVARIA CG / AVARIA DE VALIDADE',
  'BONIFICAÇÃO (Freguesia, Loja)',
  'BRINDES / AÇÕES (Barra, CG, Valqueire)',
  'DEGUSTAÇÃO (todas filiais)',
  'PROMOTOR / DEGUSTAÇÃO Valqueire',
  'PARCERIA / COLLAB / INFLUENCER',
  'RESGATE (Barra, Botafogo, Recreio)',
];

export function isCanalExterno(vendedorNome: string | null | undefined): boolean {
  if (!vendedorNome) return false;
  const nome = vendedorNome.trim();
  if (!nome) return false;
  return PADROES_CANAIS_EXTERNOS.some((re) => re.test(nome));
}
