

# Ajustar Margem Media e Grafico de Desempenho

## Problema Atual
1. **Margem Media (Gauge)**: Esta usando `margem_percentual` (margem de lucro) que nao faz sentido como comparativo. O usuario quer ver **quanto % o ticket medio do Lucas representa em relacao ao ticket medio geral**.
2. **Seu Desempenho vs Empresa**: Esta como BarChart comparativo. O usuario quer **somente um grafico de linha mostrando as vendas da empresa** (cada registro de `vendas_gerais`).

## Mudancas no arquivo `src/pages/MeuPainel.tsx`

### 1. Alterar o Gauge "Margem Media" (linhas 460-485)

- **Renomear** de "Margem Media" para "Seu Ticket vs Media"
- **Novo calculo**: `(ticketMedioIndividual / vendasGeraisAgg.ticketMedio) * 100`
  - Exemplo: (R$ 25,04 / R$ 46,62) * 100 = ~53.7%
  - Isso mostra que o ticket medio do Lucas esta em 53.7% da media geral
- **Faixas de cor** permanecem as mesmas (verde >= 100%, dourado >= 80%, vermelho < 80%) -- ajustar para refletir que 100% = na media
- **Texto interno**: mostrar o percentual e "vs Media" em vez de "Margem"
- **Legenda abaixo**: "Seu ticket: R$ 25,04 | Media: R$ 46,62"

### 2. Alterar "Seu Desempenho vs Empresa" (linhas 488-522)

- **Remover** o BarChart comparativo com barras lado a lado
- **Substituir** por um **LineChart** (grafico de linha) mostrando todas as 468 vendas da empresa (`vendas_gerais`)
- Cada ponto no grafico = um registro de `vendas_gerais`, ordenado por valor
- Eixo X: indice da venda (1 a 468)
- Eixo Y: valor de `total_mercadoria`
- Uma unica linha roxa representando a distribuicao de vendas da empresa
- Adicionar uma linha de referencia horizontal mostrando o ticket medio geral (linha tracejada)
- **Renomear** para "Vendas da Empresa"

### 3. Remover referencia a `margem_percentual` dos KPIs de comparacao

- O KPI Card "Margem Media" nos cards superiores (linha 302) continua mostrando a margem de lucro individual -- isso e informativo e correto como dado individual
- Apenas o **gauge circular** muda para o comparativo de ticket

## Detalhes Tecnicos

- Dados para o LineChart: `vendasGeraisRaw.map(r => parseMoneyBR(r.total_mercadoria)).sort((a,b) => a-b).map((v, i) => ({ idx: i+1, valor: v }))`
- Gauge: `const gaugeValue = vendasGeraisAgg.ticketMedio > 0 ? (ticketMedioIndividual / vendasGeraisAgg.ticketMedio) * 100 : 0`
- Novas faixas do gauge: >= 100% verde (acima da media), >= 80% dourado (proximo), < 80% vermelho (abaixo)
- Usar `ReferenceLine` do recharts para a linha tracejada do ticket medio
- Nenhuma dependencia nova necessaria

