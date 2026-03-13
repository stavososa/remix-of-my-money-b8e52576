

## Plano: Garantir que KPIs só mostrem valores finais (sem "piscar")

### Problema
O overlay semi-transparente atual (`bg-background/60`) ainda permite ver os valores antigos por baixo, que depois mudam para os novos — causando o efeito de "piscar". O `isBusy` detecta corretamente o loading, mas a UI continua renderizando os valores stale por trás do spinner.

### Solução
Em vez de overlay sobre os KPIs, **renderizar valores placeholder** ("—" ou skeleton) enquanto `isBusy` for true. Os valores reais só aparecem quando o fetch termina completamente.

**`src/pages/Gerencial.tsx`**

1. Criar valores condicionais para os KPIs:
   ```typescript
   const kpiValues = isBusy
     ? { fat: '—', lucro: '—', margem: '—', vendas: '—', notas: '—' }
     : {
         fat: fmt(kpis.totalFat),
         lucro: fmt(kpis.totalLucro),
         margem: fmtPct(kpis.margemMedia),
         vendas: kpis.count.toLocaleString('pt-BR'),
         notas: totalNotas.toLocaleString('pt-BR'),
       };
   ```

2. Passar `kpiValues.fat`, `.lucro`, etc. para cada `KPICard` em vez dos valores calculados diretamente.

3. Remover o overlay div dos KPIs (o "—" já comunica que está carregando).

4. Manter o overlay/spinner apenas no gráfico (onde faz sentido visual).

### Resultado
Os KPIs exibem "—" durante o carregamento e mudam uma única vez para o valor final — sem piscar, sem valores intermediários.

