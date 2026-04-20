// Detecta "vendedores" que na verdade representam canais externos / marketplaces
// (iFood, Mercado Livre, Shopee, Magazine Luiza, Loja Integrada, TikTok Shop, sites próprios).
// Usado em filtros de visualização — não altera dados no banco.

const PADROES_CANAIS_EXTERNOS = [
  /\bIFOOD\b/i,
  /MERCADO\s*LIVRE/i,
  /\bSHOPEE\b/i,
  /MAGAZINE\s*LUIZA|\bMAGALU\b/i,
  /LOJA\s*INTEGRADA/i,
  /TIK\s*TOK|TIKTOK/i,
  /^\s*SITE\b/i, // SITE ATACADÃO, SITE MAROMBA STORE, etc.
];

export const PADROES_CANAIS_EXTERNOS_LABEL = [
  'iFood',
  'Mercado Livre',
  'Shopee',
  'Magazine Luiza',
  'Loja Integrada',
  'TikTok Shop',
  'SITE ...',
];

export function isCanalExterno(vendedorNome: string | null | undefined): boolean {
  if (!vendedorNome) return false;
  const nome = vendedorNome.trim();
  if (!nome) return false;
  return PADROES_CANAIS_EXTERNOS.some((re) => re.test(nome));
}
