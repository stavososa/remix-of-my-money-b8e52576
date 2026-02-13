

## Adicionar Ranking de Unidades que Mais Venderam

### O que sera feito

Adicionar uma secao visual de **ranking das unidades que mais venderam**, posicionada logo apos os cards PJ vs CLT e antes da tabela "Performance por Unidade". Sera um destaque visual com as unidades ordenadas por total vendido.

### Posicionamento

```text
1. KPIs
2. Filtros
3. PJ vs CLT
4. **Unidades que Mais Venderam (NOVO)** -- ranking visual
5. Performance por Unidade (tabela)
6. Ranking Completo
7. Grafico de barras
```

### Detalhes Tecnicos

**Arquivo**: `src/pages/Gerencial.tsx`

1. **Dados**: Reutilizar `resumoUnidade` (ja carregado), ordenando por `total_vendido` decrescente. Aplicar o filtro de unidade existente (`filtroUnidade`).

2. **Componente**: Criar uma secao com cards em grid mostrando cada unidade ranqueada:
   - Posicao (medalha para top 3)
   - Nome da unidade
   - Total vendido (destaque)
   - Quantidade de vendedores
   - Margem media

3. **Visual**: Cards compactos em grid responsivo (2 colunas mobile, 3-4 desktop), com destaque visual para os 3 primeiros (borda dourada/prata/bronze ou cor primaria).

4. **Logica**:
   ```typescript
   const unidadesRanked = useMemo(() => {
     const src = filtroUnidade !== 'all'
       ? resumoUnidade.filter(u => u.unidade_nome === filtroUnidade)
       : resumoUnidade;
     return [...src].sort((a, b) => Number(b.total_vendido ?? 0) - Number(a.total_vendido ?? 0));
   }, [resumoUnidade, filtroUnidade]);
   ```

5. **Titulo da secao**: "Unidades que Mais Venderam" com icone `TrendingUp` (ja importado).

