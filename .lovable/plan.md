

## Plano: Simplificar aba Vendedores — só ranking, sem gráficos

A aba Vendedores atualmente tem a tabela de ranking **mais** 4 gráficos Top 10 (Vendedores, Produtos, Marcas, Famílias). O pedido é claro: deixar **somente o ranking de vendedores**, igual às abas Produtos/Marcas/Famílias.

### Alterações em `src/pages/Ranking.tsx`

1. **Remover os 4 gráficos Top 10** da aba Vendedores (linhas 388-394)
2. **Remover os useMemos** dos charts: `chartVendedores`, `chartProdutos`, `chartFamilias`, `chartMarcas` (linhas 214-233)
3. **Remover a função `renderChart`** e o `CustomTooltip` (linhas 61-304) — já não são usados em lugar nenhum
4. **Remover imports do recharts** (`ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`)

A aba Vendedores ficará com: KPIs + tabela ranking + cards mobile — mesma estrutura das outras abas.

