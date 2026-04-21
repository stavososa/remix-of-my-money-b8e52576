

## Alinhar KPIs do Gerencial ao resultado do SQL puro

### Diagnóstico
Sua query SQL retornou **R$ 30.278,08 / R$ 10.991,28** — exatamente o que está na planilha. O painel mostra **R$ 30.268,28 / R$ 11.126,00**. A diferença vem do **sanity filter** em `src/pages/Gerencial.tsx:292`:

```ts
if (Math.abs(margem) > 1000 || (fat > 0 && Math.abs(lucro) > fat * 100)) continue;
```

Esse filtro descarta linhas com margem "absurda", mas no caso do CHECKOUT BOTAFOGO ele está derrubando linhas válidas (provavelmente devoluções/estornos com margem alta) e somando outras que o SQL puro não considera da mesma forma. Resultado: faturamento ligeiramente menor e lucro inflado.

### Mudança

**`src/pages/Gerencial.tsx`** — bloco `kpis` (linhas ~285-300):

Remover o sanity filter e fazer a soma direta, espelhando o SQL:

```ts
const kpis = useMemo(() => {
  let totalFat = 0, totalLucro = 0, somaMargemPond = 0, count = 0;
  for (const row of filteredAll) {
    const fat = parseMoneyBR(row.total_com_desconto);
    const lucro = parseMoneyBR(row.lucros_reais);
    const margem = parsePctBR(row.margem_percentual);
    totalFat += fat;
    totalLucro += lucro;
    somaMargemPond += margem * fat;
    count++;
  }
  const margemMedia = totalFat > 0 ? somaMargemPond / totalFat : 0;
  return { totalFat, totalLucro, margemMedia, count };
}, [filteredAll]);
```

### O que continua igual
- **Toggle "Ocultar canais externos"** (`hideCanais`) — preservado, segue aplicando `isCanalExterno` (vendedor + família ATACADO total + família OUTROS com `%`).
- Filtros de unidade/vendedor/família/marca — preservados.
- KPI de Notas Fiscais (distinct), gráfico diário, tabela detalhada — preservados.
- Outras páginas (Ranking, MeuPainel, RankingComissoes) — não tocadas.

### Risco / observação
A regra "sanity filter" foi adicionada para ignorar linhas corrompidas (margem > 1000%). Removendo, se houver dado realmente quebrado no banco, ele entra no total. Como você quer espelhar exatamente o SQL/planilha, esse é o trade-off aceito. Se aparecer outlier no futuro, refinamos com filtro mais cirúrgico (ex.: só ignorar `margem > 100000%`).

### Arquivo
- `src/pages/Gerencial.tsx` (apenas o bloco do `useMemo` de `kpis`)

