

## Plano: Corrigir contagem de Notas Fiscais e prevenir dados parciais nos KPIs

### Problemas Identificados

1. **KPIs "piscam" ao carregar**: React Query mostra dados em cache (stale) imediatamente e depois atualiza com dados frescos, causando a mudança de valores visível ao usuário.

2. **Contagem de Notas Fiscais potencialmente incorreta**: O código atual conta `nota_fiscal` como `Set<string>`, mas o mesmo número de NF pode existir em lojas diferentes (`cnpj_empresa` diferente). Ex: NF "000013699" na loja `/0011-75` e NF "000013699" na loja `/0013-37` são notas diferentes, mas seriam contadas como uma só.

### Alterações

**`src/pages/Gerencial.tsx`**

1. **Bloquear exibição até dados completos**: Mostrar skeleton/loading nos KPIs e gráfico enquanto `loadAll` for `true` ou `isFetching` estiver ativo (dados stale sendo atualizados). Isso impede que os números "pulem".

2. **Corrigir contagem de NF**: Mudar o `Set` para usar a chave composta `nota_fiscal + cnpj_empresa` em vez de apenas `nota_fiscal`:
   ```typescript
   const totalNotas = useMemo(() => {
     const set = new Set<string>();
     for (const row of filteredAll) {
       if (row.nota_fiscal) set.add(`${row.nota_fiscal}_${row.cnpj_empresa ?? ''}`);
     }
     return set.size;
   }, [filteredAll]);
   ```

3. **Adicionar `isFetching` da query**: Extrair `isFetching` além de `isLoading` para detectar refetches em background:
   ```typescript
   const { data: allVendas, isLoading: loadAll, isFetching: fetchingAll } = useQuery({...});
   ```

4. **Overlay de loading**: Quando `loadAll || fetchingAll`, exibir um indicador sutil (spinner ou skeleton) sobre os KPIs e gráfico, garantindo que o usuário só veja valores finais.

### Resultado
Os KPIs (incluindo Notas Fiscais) só serão exibidos com valores definitivos após o carregamento completo de todos os dados do período.

