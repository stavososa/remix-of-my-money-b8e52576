

## Plano: Filtros multi-select para Vendedor, Família e Marca no Ranking Comissões

### O que muda em `src/pages/RankingComissoes.tsx`

1. **Converter `filtroVendedor` de `string` para `string[]`**
   - `useState('all')` vira `useState<string[]>([])`
   - Filtro: `filtroVendedor.length > 0 && !filtroVendedor.includes(c.vendedor)`

2. **Adicionar novos estados `filtroFamilia` e `filtroMarca` como `string[]`**
   - `useState<string[]>([])`
   - Filtro: mesma lógica de inclusão por array

3. **Adicionar listas de opções** (useMemo):
   - `familias`: extraídas de `comissoesCalculadas` (após filtro de filial/vendedor)
   - `marcas`: extraídas de `comissoesCalculadas` (após filtro de filial/vendedor)

4. **Adicionar UI de filtro** para Família e Marca usando Popover + Checkbox (mesmo padrão do filtro de Filial existente)

5. **Converter UI do Vendedor** de single-select (botões) para multi-select (checkboxes), mesmo padrão de Filial

6. **Atualizar "Limpar filtros"**: considerar todos os 4 filtros na condição e no reset

7. **Atualizar `useEffect` de reset por período**: limpar também família e marca

### Arquivo alterado
- `src/pages/RankingComissoes.tsx`

