

# Corrigir Evolucao de Vendas para Refletir Dados Gerais

## Problema
O grafico "Evolucao de Vendas" esta duplicando os mesmos dados de "Vendas por Dia" (ambos usam dados individuais agrupados por data). O usuario quer que "Evolucao de Vendas" mostre os dados da empresa inteira (tabela `vendas_gerais`).

## Limitacao
A tabela `vendas_gerais` possui apenas a coluna `total_mercadoria` (sem data, sem vendedor). Portanto, nao e possivel criar um grafico de evolucao temporal com esses dados. 

## Solucao Proposta

### Opcao: Transformar "Evolucao de Vendas" em comparativo visual Individual vs Geral

Em vez de um AreaChart temporal (que nao tem dados suficientes), criar um grafico de barras comparativo mostrando:
- **Barra 1**: Total Vendido Individual vs Total Vendido Geral
- **Barra 2**: Ticket Medio Individual vs Ticket Medio Geral
- **Barra 3**: Qtd Itens Individual vs Qtd Itens Geral

### Mudancas no arquivo `src/pages/MeuPainel.tsx`

**1. Substituir o bloco "Evolucao de Vendas" (linhas 488-556)**
- Remover o AreaChart de evolucao diaria (que duplicava "Vendas por Dia")
- Substituir por um BarChart comparativo com dados side-by-side (Individual vs Geral)
- Dados do grafico:
  ```
  [
    { metrica: 'Total Vendido', individual: vendasAgg.totalVendido, geral: vendasGeraisAgg.totalGeral },
    { metrica: 'Ticket Medio', individual: ticketMedioIndividual, geral: vendasGeraisAgg.ticketMedio },
  ]
  ```
- Usar barras lado a lado (dourado para individual, roxo para geral)
- Renomear a secao para "Seu Desempenho vs Empresa"

**2. Manter "Vendas por Dia" intacto (linhas 576-599)**
- Este grafico continua mostrando a evolucao diaria individual sem alteracao

### Layout resultante

```text
+--------------------------------------------------+
| HEADER + Mini KPIs                                |
+--------------------------------------------------+
| KPI Cards individuais                             |
+--------------------------------------------------+
| Media Geral de Vendas (3 KPIs)                    |
+--------------------------------------------------+
| Posicao  |  Voce vs Media Geral  |  Gauge Margem  |
+--------------------------------------------------+
| Seu Desempenho vs Empresa (BarChart comparativo)   |
+--------------------------------------------------+
| Detalhamento de Vendas (DataTable)                 |
+--------------------------------------------------+
| Vendas por Dia (BarChart diario)                   |
+--------------------------------------------------+
```

### Detalhes Tecnicos
- O BarChart usara duas barras (`<Bar>`) lado a lado com `barGap` e cores distintas
- Tooltip formatado com `fmt()` para valores monetarios
- Nenhuma dependencia nova necessaria
- Os dados ja estao disponiveis em `vendasAgg` e `vendasGeraisAgg`

