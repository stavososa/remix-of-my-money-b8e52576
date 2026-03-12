

## Plano: Filtro de Unidade usando `local_estoque` da tabela `vendas`

### Problema
O filtro de Unidade depende da tabela `controle_pj` para mapear vendedores a unidades. Esse mapeamento falha em muitos casos (vendedores não cadastrados, nomes divergentes). O usuário quer usar exclusivamente a tabela `vendas`.

### Solução
A tabela `vendas` possui o campo `local_estoque` que contém o local/unidade de cada venda. Vamos usar esse campo diretamente como filtro de unidade, eliminando a dependência do `controle_pj` para esse propósito.

### Alterações em `src/pages/Gerencial.tsx`

1. **Incluir `local_estoque` em todas as queries de vendas** (allVendas, filterOptions, tabela paginada)

2. **Substituir lógica de mapeamento vendedor→unidade** pelo uso direto de `local_estoque`:
   - Remover `vendedorUnidadeMap`, `getUnidade`, `vendedoresUnidade` (mapeamento via `controle_pj`)
   - O filtro de unidade agora filtra por `local_estoque` diretamente
   - Na query paginada (tabela), usar `.eq('local_estoque', filtroUnidade)` ao invés de `.in('vendedor_nome', ...)`

3. **Gerar opções de unidades** a partir dos valores distintos de `local_estoque` no período

4. **Manter `controle_pj`** apenas se ainda for usado em outro lugar (ex: coluna "Unidade" na tabela de detalhes). Se não, remover a query.

5. **Nos gráficos Pie/Donut "por Unidade"**, agrupar por `local_estoque` ao invés do mapeamento

6. **Filtro client-side (`filteredAll`)**: comparar `row.local_estoque` com `filtroUnidade`

### Resultado esperado
- Select de Unidade aparece com todas as unidades presentes no período
- Filtrar por unidade atualiza KPIs, gráficos e tabela corretamente
- Multifiltro (Unidade + Vendedor + Família + Marca) funciona em conjunto
- Sem dependência de `controle_pj` para o filtro de unidade

### Arquivos alterados
- `src/pages/Gerencial.tsx`

