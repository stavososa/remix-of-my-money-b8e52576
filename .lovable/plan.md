

# Reformular "Voce vs Media Geral" com Logica Baseada na Mediana

## Problema Atual

A secao "Voce vs Media Geral" compara o ticket medio do Lucas (R$ 25,04) contra a **media aritmetica** da empresa (R$ 46,62). Isso gera a mensagem "Falta R$ 21,58 por item para a media" -- um valor irreal porque a media e inflada por outliers (top 25% vende acima de R$ 59,90).

A **mediana** (R$ 36,00) e o valor que divide a empresa ao meio: 234 vendas abaixo, 234 acima. Esse e o benchmark justo.

## Dados Estatisticos Reais

```text
Empresa (468 vendas):
  Media:   R$ 46,62  (inflada por outliers)
  Mediana: R$ 36,00  (valor central real)
  P25:     R$ 19,90
  P75:     R$ 59,90

Lucas (13 vendas):
  Media:   R$ 25,04
  vs Media empresa:   53,7%  --> vermelho/dourado
  vs Mediana empresa:  69,6%  --> mais realista
```

## Mudancas no arquivo `src/pages/MeuPainel.tsx`

### 1. Calcular a mediana no frontend (linhas 138-145)

Adicionar calculo da mediana no bloco `vendasGeraisAgg`:

```typescript
const vendasGeraisAgg = (() => {
  const rows = vendasGeraisRaw ?? [];
  const valores = rows.map(r => parseMoneyBR(r.total_mercadoria)).filter(v => v > 0).sort((a, b) => a - b);
  const totalGeral = valores.reduce((s, v) => s + v, 0);
  const qtdItens = valores.length;
  const ticketMedio = qtdItens > 0 ? totalGeral / qtdItens : 0;
  const mediana = qtdItens > 0
    ? qtdItens % 2 === 0
      ? (valores[qtdItens / 2 - 1] + valores[qtdItens / 2]) / 2
      : valores[Math.floor(qtdItens / 2)]
    : 0;
  return { totalGeral, qtdItens, ticketMedio, mediana };
})();
```

### 2. Mudar baseline de comparacao para mediana (linhas 206-209)

Trocar todas as referencias de `vendasGeraisAgg.ticketMedio` por `vendasGeraisAgg.mediana` nos calculos comparativos:

```typescript
const barMaxTicket = Math.max(ticketMedioIndividual, vendasGeraisAgg.mediana, 1);
const meuTicketPct = (ticketMedioIndividual / barMaxTicket) * 100;
const geralTicketPct = (vendasGeraisAgg.mediana / barMaxTicket) * 100;
const diffTicket = ticketMedioIndividual - vendasGeraisAgg.mediana;
```

### 3. Atualizar secao "Voce vs Media Geral" (linhas 392-458)

- Renomear para **"Voce vs Mediana da Empresa"**
- Subtitulo: "Comparativo contra o valor central de vendas"
- Barra "Media Geral" passa a mostrar a **mediana** (R$ 36,00)
- Mensagem de diferenca: "Falta R$ 10,96 por item para a mediana" (em vez de R$ 21,58)
- Adicionar nota informativa pequena: "Mediana: R$ 36,00 | Media: R$ 46,62"

### 4. Atualizar o Gauge (linhas 461-486)

- Comparar contra a **mediana** em vez da media:
  - `(ticketMedioIndividual / vendasGeraisAgg.mediana) * 100` = 69,6%
- Novos limiares realistas baseados na mediana como 100%:
  - **Verde (>=90%)**: Ticket proximo ou acima da mediana. O vendedor esta na metade superior.
  - **Dourado (>=65%)**: Dentro da faixa normal (entre P25 e mediana).
  - **Vermelho (<65%)**: Significativamente abaixo do padrao central.
- Lucas com 69,6% ficaria **dourado** -- refletindo que esta abaixo da mediana mas dentro do padrao.
- Atualizar label para "vs Mediana"
- Legendas: >=90%, >=65%, <65%
- Texto inferior: "Seu ticket: R$ 25,04 | Mediana: R$ 36,00"

### 5. KPI "Ticket Medio Geral" (linha 315)

- Manter o KPI card mostrando a **media** (R$ 46,62) para informacao
- Adicionar subtitle mostrando a mediana tambem: "Mediana: R$ 36,00 | Seu: R$ 25,04"

### 6. Linha de referencia no grafico "Vendas da Empresa" (linha 513)

- Adicionar uma segunda `ReferenceLine` para a mediana (linha tracejada verde)
- Manter a ReferenceLine da media (dourada) para contexto
- O usuario consegue ver visualmente a diferenca entre media e mediana

## Resultado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Baseline | Media (R$ 46,62) | Mediana (R$ 36,00) |
| Lucas % | 53,7% | 69,6% |
| Cor do gauge | Dourado (>=50%) | Dourado (>=65%) |
| "Falta por item" | R$ 21,58 | R$ 10,96 |
| Contexto | Penaliza por outliers | Reflete posicao real |

A mediana e o benchmark correto porque nao e distorcida pelos 10% de vendas acima de R$ 100. O vendedor ve uma meta alcancavel e realista.

