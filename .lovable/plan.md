

## Mudança no gráfico "Faturamento por Dia"

### Comportamento atual
O gráfico mostra apenas os dias que têm vendas (vindo do `GROUP BY data_emissao` no RPC `rpc_gerencial_resumo` em `sql/rpc_gerencial.sql`). Dias sem venda simplesmente não aparecem no eixo X.

### Comportamento desejado
Mostrar **todos os dias** do dia 1 do mês até o **último dia com informação disponível** no período filtrado. Dias sem venda aparecem com faturamento = 0 (e o acumulado se mantém constante nesses dias).

### Como vou implementar

Ajuste **client-side** em `src/pages/Gerencial.tsx`, no ponto onde o `chart_diario` retornado pelo RPC é consumido para alimentar o gráfico:

1. Identificar `minDate` = dia 1 do mês do período (`periodoAno`/`periodoMes`).
2. Identificar `maxDate` = **maior `data_emissao`** presente no `chart_diario` retornado (último dia com dado real). Se não houver nenhuma venda, não renderiza nada (mantém estado vazio atual).
3. Gerar a sequência completa de datas entre `minDate` e `maxDate` (inclusive).
4. Fazer merge: para cada dia da sequência, usar o registro do RPC se existir; senão, criar `{ data, faturamento_dia: 0, lucro_dia: 0 }`.
5. Recalcular o `acumulado` em ordem cronológica para que dias sem venda mantenham o acumulado anterior (em vez de "zerar" no gráfico).

### Por que client-side e não no SQL
- Não precisa migração de banco.
- Mantém o RPC enxuto.
- O cálculo de `maxDate` depende do dataset filtrado e é trivial em JS.
- Reaproveita o `chart_diario` que já vem.

### Arquivos alterados
- `src/pages/Gerencial.tsx` — função/`useMemo` que prepara os dados do gráfico de faturamento por dia.

### Fora de escopo
- Não mexo no RPC SQL.
- Não mexo nos KPIs, top famílias/marcas ou tabela de vendas.
- Não mexo na lógica de canais externos / CHECK OUT (ficou pendente da decisão sua).

