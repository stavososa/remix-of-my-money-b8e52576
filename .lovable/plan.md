

# Reverter Gauge e Comparativo para usar Media (ticketMedio)

## O que muda

Ambas as secoes -- o **Gauge "Seu Ticket vs Mediana"** e o **"Voce vs Mediana da Empresa"** -- voltam a usar a **media aritmetica** (`ticketMedio`) como baseline de comparacao, em vez da mediana.

## Mudancas no arquivo `src/pages/MeuPainel.tsx`

### 1. Calculos comparativos (linhas 210-214)

Reverter de `vendasGeraisAgg.mediana` para `vendasGeraisAgg.ticketMedio`:

```typescript
const barMaxTicket = Math.max(ticketMedioIndividual, vendasGeraisAgg.ticketMedio, 1);
const meuTicketPct = (ticketMedioIndividual / barMaxTicket) * 100;
const geralTicketPct = (vendasGeraisAgg.ticketMedio / barMaxTicket) * 100;
const diffTicket = ticketMedioIndividual - vendasGeraisAgg.ticketMedio;
```

### 2. Secao "Voce vs Mediana da Empresa" (linhas 397-464)

- Renomear para **"Voce vs Media da Empresa"**
- Barra inferior mostra **Media Geral** com valor `vendasGeraisAgg.ticketMedio`
- Mensagens: "Falta R$ X por item para a media" / "Acima da media!"
- Nota inferior: "Media: R$ X | Mediana: R$ Y" (mantém ambos para contexto)

### 3. Gauge (linhas 467-492)

- Renomear para **"Seu Ticket vs Media"**
- Calculo: `(ticketMedioIndividual / vendasGeraisAgg.ticketMedio) * 100`
- Label: "vs Media"
- Texto inferior: "Seu ticket: R$ X | Media: R$ Y"
- Manter os limiares atuais (>=90% verde, >=65% dourado, <65% vermelho)

### Resumo

Todas as referencias a "mediana" nos calculos e labels voltam para "media". O calculo da mediana continua existindo no `vendasGeraisAgg` e aparece como informacao complementar na nota de rodape e na ReferenceLine do grafico.

