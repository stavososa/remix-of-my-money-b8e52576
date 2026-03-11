

## Gerencial com dados da tabela `vendas` + filtro por Unidade + graficos

A tabela `vendas` tem 468 registros (Jan/2026) com valores em formato string brasileiro (ex: "R$ 15,40", "49,30%"). O campo `vendedor_nome` liga aos vendedores/unidades via `vendedores.nome_omie`. Sera necessario fazer JOIN client-side ou via query para associar unidade a cada venda.

### Abordagem

Buscar dados da tabela `vendas` filtrados por periodo (`data_emissao`), e cruzar com `vendedores` + `unidades` para obter a unidade de cada venda. Parsear valores monetarios/percentuais no frontend (padrão ja existente no projeto).

### Alteracoes em `src/pages/Gerencial.tsx`

1. **Nova query: buscar `vendas`** filtradas pelo periodo atual (mes/ano do `data_emissao`), com limite adequado

2. **Nova query: buscar `vendedores` com `unidades`** para mapear `nome_omie` -> `unidade_nome`

3. **Processar dados client-side**:
   - Parsear `total_com_desconto`, `lucros_reais`, `margem_percentual` de string BR para number
   - Associar cada venda a sua unidade via mapa vendedor->unidade
   - Agregar por unidade: total vendido, lucro, margem media, qtd vendas

4. **Filtro por Unidade**: O select de unidades ja existe. Ao selecionar uma unidade, filtrar as vendas processadas e recalcular todos os KPIs e graficos.

5. **Novos graficos usando dados de `vendas`**:
   - **Faturamento por Unidade** (BarChart horizontal - ja existe, alimentar com dados de vendas)
   - **Margem Media por Unidade** (novo BarChart horizontal, cor verde)
   - **Top Familias de Produto** (BarChart mostrando as familias mais vendidas, reagindo ao filtro de unidade)

6. **Cards PJ vs CLT**: Recalcular a partir do cruzamento vendas + vendedores (que tem campo `regime`), ao inves de depender exclusivamente da view `v_resumo_regime`

7. **Layout**: Organizar graficos em grid 2 colunas no desktop

### Detalhes tecnicos

- Funcoes de parsing ja existem no projeto (regex para "R$ X,XX" e "XX,XX%")
- A tabela `vendas` tem 468 linhas para Jan/2026, dentro do limite de 1000 do Supabase
- Vendedores sem unidade (ex: "CHECK OUT", "COMPRA VENDEDOR") serao agrupados como "Sem Unidade" ou ignorados conforme filtro
- Manter as queries existentes (`v_ranking`, `v_resumo_unidade`, `v_resumo_regime`) para dados de comissao que nao existem na tabela `vendas`

