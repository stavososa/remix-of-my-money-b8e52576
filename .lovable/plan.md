
Objetivo: corrigir o filtro de Unidade (que hoje falha em vários casos), manter a tabela com no máximo 30 registros por página com scroll interno, e trocar os gráficos por Unidade para formatos circulares mais legíveis.

Plano de implementação

1) Corrigir filtro de Unidade (principal problema atual)
- Em `Gerencial.tsx`, criar uma função única de normalização de nomes (uppercase + trim + remoção de acentos).
- Rebuild do mapeamento `vendedor -> unidade` usando `controle_pj` com chave normalizada para cobrir diferenças de escrita.
- Separar dois usos:
  - mapeamento para exibição/KPIs/gráficos (normalizado),
  - lista exata de `vendedor_nome` (texto original vindo de `vendas`) para filtro SQL `.in(...)`.
- Ajustar `vendedoresUnidade` para usar nomes reais de `vendas` (não uppercased), evitando falha por case-sensitive no Postgres.
- Manter regra de segurança atual: se unidade selecionada não tiver vendedores válidos no período, retornar vazio propositalmente.
- Garantir multifiltro com AND entre Unidade + Vendedor + Família + Marca + Busca.

2) Melhorar usabilidade dos filtros (incluindo mês)
- Manter reset de paginação ao trocar período/filtros (já existe, preservar).
- Ajustar opções de Unidade para mostrar apenas unidades com vendedores presentes no período selecionado (evita seleção “sem efeito”).
- Preservar compatibilidade com filtro de mês/ano global (`PeriodFilter` + `usePeriod`) sem regressão.

3) Tabela com scroll interno e limite de 30
- `TABLE_PAGE_SIZE` permanece em 30.
- Em `DataTable.tsx`, adicionar prop opcional de altura máxima (ex.: `maxHeight`).
- Aplicar `overflow-y-auto` no container da tabela quando `maxHeight` for informado.
- Em `Gerencial.tsx`, passar `maxHeight` para a tabela de “Vendas Detalhadas” (ex.: ~500–560px), mantendo paginação fora da área rolável.

4) Trocar gráficos “por Unidade” para formatos circulares mais entendíveis
- Substituir os dois gráficos por unidade para não ficarem com o mesmo formato:
  - Faturamento por Unidade -> Pizza/Rosca (participação no faturamento).
  - Margem Média por Unidade -> Circular (Radial/Donut por unidade, com tooltip em %).
- Manter agregação pelos dados já filtrados (`filteredAll`), respeitando todos os filtros ativos.
- Melhorias de leitura:
  - limitar a top N unidades + “Outras” quando necessário,
  - legenda clara,
  - tooltip com moeda/% formatado.

Detalhes técnicos (resumo)
```text
Fonte de verdade:
- Período (mês/ano): usePeriod
- Dataset completo para KPIs/gráficos: allVendas -> filteredAll
- Dataset paginado da tabela: query server-side com mesmos filtros

Correção-chave:
- Nunca usar vendedor uppercased diretamente no .in('vendedor_nome', ...)
- Usar normalização só para casar nomes
- Usar valor original de vendas para filtro SQL
```

Critérios de aceite
- Filtro de Unidade altera KPIs, gráficos e tabela corretamente.
- Multifiltro (Unidade + Família + Marca + Vendedor + busca) funciona em conjunto.
- Troca de mês/ano atualiza tudo sem “filtro fantasma”.
- Tabela não cresce verticalmente além da altura definida e mantém 30 registros por página.
- Gráficos por Unidade estão em formato circular e mais legíveis.

Arquivos impactados
- `src/pages/Gerencial.tsx`
- `src/components/DataTable.tsx`
