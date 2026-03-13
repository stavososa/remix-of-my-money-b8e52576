

## Plano: Filtro de Período Personalizado com Seleção de Dias

### Conceito

Substituir os selects de mês/ano por um componente mais completo que mantém a seleção por mês/ano mas adiciona:
- Botões rápidos: **3 dias**, **7 dias**, **15 dias**, **Mês inteiro** (default)
- Seleção personalizada de datas (date range picker)
- Os botões de dias contam regressivamente a partir do **último dia com dados** no mês selecionado

### Mudanças no PeriodContext

Expandir a interface para incluir `dataInicio` e `dataFim` (strings `YYYY-MM-DD`):

```typescript
interface PeriodContextType {
  periodoAno: number;
  periodoMes: number;
  dataInicio: string;  // NOVO
  dataFim: string;     // NOVO
  loading: boolean;
  setPeriodo: (ano: number, mes: number) => void;
  setCustomRange: (inicio: string, fim: string) => void; // NOVO
  resetRange: () => void; // NOVO - volta para mês inteiro
}
```

- Quando `periodoAno/periodoMes` mudam, `dataInicio` e `dataFim` resetam para o mês inteiro (dia 1 até último dia do mês).
- Quando um preset ou range custom é selecionado, apenas `dataInicio` e `dataFim` mudam.

### Mudanças no PeriodFilter

Redesenhar o componente:
1. Manter selects de mês/ano
2. Adicionar uma linha de botões de preset: `3d | 7d | 15d | Mês`
3. Adicionar um botão "Personalizado" que abre um Popover com dois Calendar (data início e data fim)
4. Os presets calculam: buscar o `dataFim` como último dia do mês selecionado (ou último dia com dados via query já existente no context), e `dataInicio = dataFim - N dias`
5. Botão ativo destacado visualmente

### Mudanças nas Páginas Consumidoras

Em **Gerencial.tsx**, **MeuPainel.tsx**, **Ranking.tsx**, **AdminRegras.tsx**:
- Substituir o cálculo manual de `startDate`/`endDate` por `dataInicio`/`dataFim` do context
- As queries já filtram por `.gte('data_emissao', startDate).lte('data_emissao', endDate)` — basta trocar as variáveis
- Views (`v_ranking`) que filtram por `periodo_ano`/`periodo_mes` continuam usando esses campos (não afetadas pelo range de dias)

### Arquivos Alterados

| Arquivo | Alteração |
|---|---|
| `src/contexts/PeriodContext.tsx` | Adicionar `dataInicio`, `dataFim`, `setCustomRange`, `resetRange` |
| `src/components/PeriodFilter.tsx` | Redesenhar com presets + date range picker usando Popover + Calendar |
| `src/pages/Gerencial.tsx` | Usar `dataInicio`/`dataFim` do context em vez de calcular |
| `src/pages/MeuPainel.tsx` | Idem |
| `src/pages/Ranking.tsx` | Idem para queries de `vendas` (ranking view mantém mês/ano) |

### UI do Filtro (mobile-friendly)

No desktop: selects de mês/ano + botões de preset + botão personalizado — tudo em uma linha.
No mobile: empilha em duas linhas (mês/ano em cima, presets embaixo) com `flex-wrap`.

