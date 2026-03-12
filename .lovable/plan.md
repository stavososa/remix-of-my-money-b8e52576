

## Plano: Adicionar colunas Faturamento e Lucro Real em todas as abas do Ranking

### Contexto
- A tabela `vendas` tem os campos `total_com_desconto` e `lucros_reais` (ambos strings BRL)
- A view `v_ranking` já tem `total_vendido` e `lucro_total` para vendedores
- Todas as abas precisam de colunas com valores arredondados estrategicamente

### Alterações em `src/pages/Ranking.tsx`

**1. Query `vendasRaw`**: adicionar `lucros_reais` ao select

**2. Vendedores tab** — Transformar em lista ranking igual às outras abas:
- Já usa `v_ranking` que tem `total_vendido` e `lucro_total` — adicionar coluna "Lucro Real" usando `lucro_total`
- Valores formatados com `fmtCompact` para arredondamento estratégico (ex: R$ 1,2 mi, R$ 45,3 mil)

**3. Produtos, Marcas, Famílias** — Incluir `lucros_reais` na agregação:
- Nos `useMemo` de agrupamento, somar também `parseBRL(v.lucros_reais)` como `lucro`
- Atualizar interfaces `RankedItem` e `ProductRank` para incluir campo `lucro`
- Adicionar colunas "Faturamento" (`total_com_desconto` → `total_vendido`) e "Lucro Real" nas tabelas
- Usar `fmtCompact` para valores grandes (arredondamento inteligente)

**4. Atualizar `RankingTable`** (componente compartilhado por Marcas e Famílias):
- Adicionar coluna "Lucro Real" com `fmtCompact`
- Atualizar cards mobile para exibir lucro

**5. Formatação estratégica**: usar `fmtCompact` (já existente) que formata como "R$ 1,2 mi", "R$ 45,3 mil" para manter a tabela limpa

### Arquivo alterado
- `src/pages/Ranking.tsx`

