

# Integrar Dados de `vendas_gerais` como Media Geral e Comparativo Individual

## Objetivo
Buscar todos os registros da tabela `vendas_gerais`, calcular agregados (total geral, ticket medio, quantidade) e usar como baseline de "Media Geral de Vendas" para comparar com o desempenho individual do vendedor (LUCAS VILAR).

## Dados Disponíveis

- **vendas_gerais**: 468 registros, coluna unica `total_mercadoria` (texto BR, ex: `" 15,40 "`)
- Total geral: ~R$ 21.818,81
- Ticket medio: ~R$ 46,62
- **Vendedor individual** (LUCAS VILAR): 13 itens, ~R$ 325 vendido, margem media ~49.8%

## Mudancas no arquivo `src/pages/MeuPainel.tsx`

### 1. Nova query para `vendas_gerais`
- Adicionar `useQuery` com queryKey `['vendas-gerais']` buscando todos os registros da tabela `vendas_gerais`
- Usar `parseMoneyBR` (ja existente) para converter `total_mercadoria` para numerico
- Calcular agregados: total geral vendido, quantidade de itens e ticket medio

### 2. Atualizar a secao "Voce vs Media do Time"
- Renomear para "Voce vs Media Geral" 
- A barra "Voce" continua mostrando `vendasAgg.totalVendido` (dados individuais do LUCAS VILAR)
- A barra "Media" passara a usar o ticket medio calculado de `vendas_gerais` multiplicado pela quantidade de itens do vendedor (ou comparacao direta de totais)
- Alternativa mais justa: comparar **ticket medio individual** vs **ticket medio geral**

### 3. Atualizar a secao "Margem Media" (Gauge)
- Usar `vendasAgg.margemMedia` (ja calculada dos dados individuais) em vez de depender de `meusDados` do `v_ranking`
- O gauge passara a sempre renderizar quando houver dados na tabela `vendas`, removendo o fallback "---"
- Adicionar indicador textual abaixo mostrando a comparacao: "Sua margem: X% | Media geral: indisponivel" (vendas_gerais nao tem margem, apenas total_mercadoria)

### 4. Atualizar "Sua Posicao"
- Quando `meusDados` do `v_ranking` estiver vazio mas `vendasAgg` tiver dados, mostrar o total vendido individual como destaque em vez de "---"
- Exibir mensagem "Ranking sera calculado quando o periodo for processado"

### 5. Atualizar "Evolucao de Vendas"
- Quando `chartData` (de `vendas_periodo`) estiver vazio, usar `vendasPorDia` (ja calculado) como fonte do grafico de area
- Adaptar o AreaChart para mostrar evolucao diaria em vez de mensal

### 6. Novo bloco de KPI: "Media Geral de Vendas"
- Adicionar uma nova secao com 3 mini-KPIs mostrando dados agregados de `vendas_gerais`:
  - Total Geral Vendido (soma de todas as vendas da empresa)
  - Ticket Medio Geral
  - Qtd Total de Itens
- Posicionar logo abaixo dos KPI Cards individuais, antes do grid de 3 colunas

## Layout Final

```text
+--------------------------------------------------+
| HEADER: Saudacao + Mini KPIs inline + Badge Rank  |
+--------------------------------------------------+
| KPI Cards: Vendido | Lucro | Margem | Notas       |
+--------------------------------------------------+
| Media Geral: Total Geral | Ticket Medio | Qtd     |
+--------------------------------------------------+
| Posicao  |  Voce vs Media Geral  |  Gauge Margem  |
+--------------------------------------------------+
| Evolucao de Vendas (AreaChart diario)              |
+--------------------------------------------------+
| Detalhamento de Vendas (DataTable)                 |
+--------------------------------------------------+
| Vendas por Dia (BarChart)                          |
+--------------------------------------------------+
```

## Detalhes Tecnicos

- A query `vendas_gerais` buscara todos os 468 registros (tabela pequena)
- Parsing: `parseMoneyBR(row.total_mercadoria)` -- funcao ja existente
- Comparativo de barras: ticket medio individual (`vendasAgg.totalVendido / vendasAgg.qtdItens`) vs ticket medio geral (`totalGeral / qtdItens`)
- `vendas_gerais` so tem `total_mercadoria`, entao margem e lucro nao estarao disponiveis no comparativo geral
- O gauge de margem usara `vendasAgg.margemMedia` como fallback quando `meusDados` for null
- Nenhuma dependencia nova necessaria

