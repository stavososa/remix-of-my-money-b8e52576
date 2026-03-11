

## Diagnóstico: Por que a aplicação está pesada?

A função `fetchAllVendas()` carrega **TODOS os registros da tabela `vendas`** sem nenhum filtro no servidor. Pelos logs de rede, são **59.000+ registros** sendo baixados em 59 requisições sequenciais de 1000 cada. Isso consome muita memória, banda e tempo de carregamento.

## Solução: Filtrar no servidor pelo período selecionado

Em vez de baixar tudo e filtrar no cliente, a query deve usar `.eq()` ou `.gte()/.lte()` no campo `data_emissao` para trazer apenas os dados do mês/ano selecionado no `PeriodFilter`.

### Mudanças em `src/pages/Gerencial.tsx`

1. **Alterar `fetchAllVendas(ano, mes)`** para receber ano/mês e aplicar filtro server-side:
   - Calcular `startDate = "YYYY-MM-01"` e `endDate = último dia do mês`
   - Adicionar `.gte('data_emissao', startDate).lte('data_emissao', endDate)` na query
   - Manter paginação (caso um mês tenha mais de 1000 registros)

2. **Atualizar a `useQuery`** para incluir `periodoAno` e `periodoMes` na queryKey, forçando refetch ao mudar mês

3. **Remover o filtro de período no cliente** (`vendasPeriodo`) já que o servidor já retorna apenas o mês correto

### Resultado esperado
- De ~59 requisições para ~5-10 (apenas dados do mês)
- Carregamento 10x mais rápido
- Filtro de mês no topo funciona instantaneamente (refetch automático)

