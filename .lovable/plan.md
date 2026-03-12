

## Plano: Reestruturar Gerencial e Ranking + Corrigir erro `local_estoque`

### Problema principal
A coluna `local_estoque` **não existe** na tabela `vendas` do banco de dados (apesar de constar no types.ts). Todas as queries estão falhando com erro 400. Isso quebrou o filtro de mês e todo o dashboard.

### Alterações

**1. Gerencial (`src/pages/Gerencial.tsx`)**
- Remover `local_estoque` de todas as queries (causa do erro)
- Remover gráficos: Faturamento por Unidade (Pie), Margem Média por Unidade (Donut)
- Remover gráficos: Top 10 Vendedores, Top 10 Famílias, Top 10 Marcas (vão para Ranking)
- Remover useMemos desses gráficos (`chartFatUnidade`, `chartMargemUnidade`, `chartVendedores`, `chartFamilias`, `chartMarcas`)
- Manter apenas: gráfico "Faturamento por Dia" (largura total)
- Adicionar KPI "Notas Fiscais": contar valores distintos de `nota_fiscal` no `filteredAll`
- Filtro de Unidade: voltar ao mapeamento via `controle_pj` (query separada) ou remover temporariamente. Como o usuário quer filtro de unidade mas a coluna não existe, usaremos `controle_pj` para mapear vendedor→unidade
- Na query paginada da tabela, remover `.eq('local_estoque', ...)` e usar `.in('vendedor_nome', [...])` para filtrar por unidade

**2. Ranking (`src/pages/Ranking.tsx`)**
- Adicionar nova aba "Top Famílias / Marcas / Vendedores" com os 3 gráficos BarChart (movidos do Gerencial)
- Reutilizar a query de vendas já existente (`vendasRaw`) para gerar os dados dos gráficos
- Importar recharts (BarChart, Bar, etc.)

### Arquivos alterados
- `src/pages/Gerencial.tsx`
- `src/pages/Ranking.tsx`

