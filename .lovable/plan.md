

## Plano: Ocultar seções de Filial e Vendedor no Ranking Comissões para gerentes

### O que muda
No arquivo `src/pages/RankingComissoes.tsx`, para perfis de gerente (`isGerente`):

1. **Remover o bloco "Resumo por Filial e Vendedor"** (linhas 487-490) — o grid com as seções "Comissão por Filial" e "Comissão por Vendedor" será envolvido em `{!isGerente && ...}`.

2. **Remover as abas "Top 10 Vendedores" e "Top 10 Filiais"** (linhas 498-499 e 511-516) — os `TabsTrigger` e `TabsContent` correspondentes serão condicionalmente ocultados com `{!isGerente && ...}`.

### Resultado
Gerentes verão apenas rankings de Produtos, Famílias e Marcas. As seções de Filial e Vendedor deixam de existir na interface para esse perfil.

### Arquivo alterado
- `src/pages/RankingComissoes.tsx`

