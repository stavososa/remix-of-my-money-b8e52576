
Objetivo: restaurar o faturamento correto (dados completos), fazer o filtro de mês “lá em cima” funcionar no Gerencial, e melhorar o gráfico linear.

Diagnóstico do que aconteceu:
- No `Gerencial.tsx`, a busca usa `.limit(5000)`, mas o projeto pode estar com limite efetivo por resposta (ex.: 1000 linhas), então parte da tabela `vendas` fica de fora.
- O filtro global do topo (`PeriodFilter` via `PeriodContext`) não é usado no Gerencial; por isso mudar mês/ano no header não altera os dados da página.
- O gráfico linear atual mostra só uma série diária simples, com leitura difícil quando há muitos pontos.

Plano de implementação:
1) Carregar 100% da tabela `vendas` com paginação real
- Substituir fetch único por loop paginado com `.range(from, to)` em blocos de 1000.
- Manter ordenação por `data_emissao` e trazer apenas colunas usadas (reduz payload).
- Resultado: KPIs/tabela passam a refletir a base completa.

2) Conectar o Gerencial ao filtro de mês do topo
- Adicionar `usePeriod()` em `Gerencial.tsx`.
- Aplicar filtro de período (`periodoAno` + `periodoMes`) antes dos demais filtros (Unidade/Vendedor/Família/Marca).
- Resultado: o seletor de mês/ano do header passa a controlar Gerencial como esperado.

3) Melhorar o gráfico linear
- Evoluir o dataset do gráfico para incluir:
  - `faturamentoDia`
  - `faturamentoAcumulado`
  - `lucroDia` (opcional em segunda linha)
- Melhorar visual: área + linha acumulada, tooltip com valores formatados, eixo X com `dd/MM` e menos poluição de labels.
- Resultado: leitura de tendência e progresso mensal muito mais clara.

4) Garantir consistência dos números no painel
- Recalcular KPIs e tabela sempre a partir do mesmo `vendasFiltradas` (já com período + filtros).
- Exibir contagem de registros carregados/filtrados para auditoria rápida (ex.: “X de Y vendas”).

Detalhes técnicos (implementação):
- Arquivo alvo principal: `src/pages/Gerencial.tsx`.
- Query paginada:
  - `PAGE_SIZE = 1000`
  - loop incremental com `.range(offset, offset + PAGE_SIZE - 1)`
  - interrompe quando `data.length < PAGE_SIZE`.
- Filtro de período:
  - comparar `data_emissao` com `periodoAno/periodoMes` (normalizar para `YYYY-MM`).
- Novo `chartProgresso`:
  - agrupar por `data_emissao`, ordenar por data ISO,
  - calcular acumulado em sequência,
  - alimentar `AreaChart`/`LineChart` com 2 séries principais.
- Manter filtros solicitados atualmente: Unidade, Vendedor, Família, Marca (sem Produto).

Critério de aceite:
- Faturamento volta ao patamar esperado com base completa (ex.: ~80k quando aplicável ao período selecionado).
- Alterar mês/ano no topo muda imediatamente KPIs, gráfico e tabela do Gerencial.
- Gráfico linear fica legível e útil para análise de evolução.
