

## Plano: Substituir gráficos "por Unidade" + corrigir filtros

### 1. Remover gráficos "por Unidade" e substituir por gráficos úteis

**Remover:**
- "Faturamento por Unidade" (BarChart, linhas 431-449)
- "Margem Média por Unidade" (BarChart, linhas 471-489)
- Seus respectivos `useMemo` (`chartUnidade`, `chartMargemUnidade`)

**Adicionar no lugar:**
- **Top 10 Vendedores** (BarChart horizontal): ranking dos vendedores que mais faturaram no período, usando `vendedor_nome` agrupado
- **Top 10 Marcas** (BarChart horizontal): ranking das marcas com maior faturamento, usando campo `marca`

Esses gráficos são mais informativos e acionáveis que "por unidade" (que já está nos KPIs e filtros).

### 2. Corrigir filtro de mês/período

O `PeriodFilter` no header já funciona e atualiza o `PeriodContext`. No entanto, quando o período muda, as queries do Gerencial usam `startDate`/`endDate` derivados de `periodoAno`/`periodoMes` — isso já está correto. O problema é que **ao mudar o período, a página da tabela não reseta para 1** e os filtros ativos podem não ter dados no novo período.

**Correção:**
- Adicionar `useEffect` que reseta `tabelaPagina` para 1 e limpa todos os filtros quando `periodoAno` ou `periodoMes` mudam
- Garantir que a query de `filterOptions` dependa corretamente do período (já depende, mas os filtros selecionados podem ficar "órfãos")

### 3. Corrigir multifiltros

O filtro de **Unidade** na tabela paginada tem um bug: ele usa `controlePj?.filter(...)` para buscar nomes, mas o filtro `vendedoresUnidade` (já calculado) não é utilizado diretamente na query. Além disso, quando a unidade é selecionada mas não tem vendedores mapeados, a query não filtra nada.

**Correção:**
- Usar `vendedoresUnidade` diretamente na query da tabela (já calculado no `useMemo`)
- Quando `vendedoresUnidade` é um array vazio (unidade sem vendedores), forçar resultado vazio
- Garantir que todos os filtros combinam corretamente (AND entre eles)

### Arquivos alterados
- `src/pages/Gerencial.tsx` — substituir 2 gráficos, corrigir reset de período, corrigir filtro de unidade na tabela

