

## Plano: Corrigir mapeamento case-insensitive de Filial no Gerencial

### Problema
O `vendedorFilialMap` em `Gerencial.tsx` usa `Map.get()` com match exato (case-sensitive). Se o `vendedor_nome` na tabela `vendas` tiver capitalização diferente do `nome_vendas` na `controle_pj`, o filtro por filial (ex: RECREIO) não encontra correspondência e mostra "Sem Filial".

### Solução
Normalizar as chaves do mapa para uppercase/trimmed, e fazer o lookup também normalizado. Mesma lógica já existe na função `normalize()` do arquivo.

### Alterações

**`src/pages/Gerencial.tsx`**

1. **`vendedorFilialMap` (linha ~120-127)** — Normalizar a chave com `.toUpperCase().trim()`:
```ts
for (const row of controlePjFilial) {
  if (row.nome_vendas && row.unidade)
    map.set(row.nome_vendas.trim().toUpperCase(), row.unidade);
}
```

2. **`getFilial` (linha ~129-132)** — Normalizar o lookup:
```ts
return vendedorFilialMap.get(vendedorNome.trim().toUpperCase()) ?? 'Sem Filial';
```

3. **`getVendedoresByFilial` (linha ~264-269)** — Retornar os nomes originais (já funciona, pois o `.in()` do Supabase é case-sensitive, mas os nomes em `vendas` precisam corresponder). Ajustar para buscar os nomes reais da tabela `vendas` usando o mapa normalizado:
   - Na verdade, o filtro server-side da tabela usa `.in('vendedor_nome', nomes)` — precisamos garantir que os nomes retornados correspondam exatamente aos da tabela `vendas`. Para isso, construir um mapa reverso: ao processar `allVendas`, mapear `vendedor_nome` original → filial normalizada, e usar os nomes originais no filtro `.in()`.

4. **Melhor abordagem para `getVendedoresByFilial`**: Em vez de buscar nomes do `controle_pj`, filtrar os `vendedor_nome` originais do `allVendas` que mapeiam para a filial selecionada:
```ts
const getVendedoresByFilial = useCallback((filial: string): string[] => {
  if (!allVendas) return [];
  const names = new Set<string>();
  for (const row of allVendas) {
    if (row.vendedor_nome && getFilial(row.vendedor_nome) === filial) {
      names.add(row.vendedor_nome);
    }
  }
  return [...names];
}, [allVendas, getFilial]);
```

Isso garante que os nomes usados no `.in()` são exatamente os mesmos que existem na tabela `vendas`.

### Resultado
- Filtro "RECREIO" vai encontrar todos os 6 vendedores inseridos
- KPIs, gráficos e tabela serão recalculados corretamente ao filtrar por Recreio
- Nenhuma alteração no banco de dados necessária

