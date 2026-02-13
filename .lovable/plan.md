

# Consolidar Dados Essenciais na Parte Superior do Painel

## Objetivo
Mover os dados mais importantes das "Vendas Diretas" (que hoje ficam na parte inferior) para a area superior do dashboard, criando uma visao unificada e imediata dos KPIs essenciais logo apos o header.

## Mudancas

### Arquivo: `src/pages/MeuPainel.tsx`

**1. Unificar os KPI Cards (linhas 234-243 e 463-468)**
- Substituir os dois blocos separados de KPI Cards por um unico bloco consolidado com 4 cards usando os dados reais da tabela `vendas` (vendasAgg):
  - Total Vendido (vendasAgg.totalVendido)
  - Total Lucro (vendasAgg.totalLucro)
  - Margem Media (vendasAgg.margemMedia)
  - Notas Fiscais (vendasAgg.qtdNotas)
- Os KPIs antigos do `v_ranking` (comissao, % comissao) serao integrados como informacoes secundarias dentro do header ou removidos se redundantes.

**2. Reorganizar o Header (linhas 202-232)**
- Adicionar ao header as informacoes essenciais em mini-stats inline:
  - Total Vendido, Lucro, Margem e Qtd Notas como valores compactos ao lado da saudacao
  - Manter o badge de posicao no canto direito

**3. Reposicionar a Margem Gauge (linhas 379-406)**
- Mover o CircularGauge para dentro da area de "Posicao + Comparacao" (grid de 2 colunas), transformando em um grid de 3 colunas no desktop (Posicao | Voce vs Media | Margem Gauge) para aproveitar melhor o espaco superior.

**4. Remover secao duplicada "Vendas Diretas" (linhas 455-468)**
- Remover o titulo "Vendas Diretas" e os KPI cards duplicados que ficavam na parte inferior, ja que os dados foram movidos para cima.

### Layout Final (de cima para baixo)

```text
+--------------------------------------------------+
| HEADER: Saudacao + Mini KPIs inline + Badge Rank  |
+--------------------------------------------------+
| KPI Cards: Vendido | Lucro | Margem | Notas       |
+--------------------------------------------------+
| Posicao  |  Voce vs Media  |  Gauge Margem        |
+--------------------------------------------------+
| Evolucao de Vendas (AreaChart)                     |
+--------------------------------------------------+
| Detalhamento de Vendas (DataTable)                 |
+--------------------------------------------------+
| Vendas por Dia (BarChart)                          |
+--------------------------------------------------+
```

### Detalhes Tecnicos

- Os KPI Cards superiores usarao os dados de `vendasAgg` (tabela `vendas`) como fonte primaria
- Se houver dados do `v_ranking` (comissao), serao exibidos como valores secundarios nos cards ou como subtitulo
- O grid de 3 colunas no meio usara `lg:grid-cols-3` em vez de `lg:grid-cols-2`
- A secao de margem perde o card proprio e vira a terceira coluna do grid existente
- Nenhuma dependencia nova necessaria

