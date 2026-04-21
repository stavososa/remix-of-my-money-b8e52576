

## Adicionar "Filtro Negativo" (excluir vendedor / família / marca) no Gerencial

### Objetivo
Painel passa a ter, ao lado dos filtros positivos atuais, um bloco de **filtros negativos multisseletivos** (exclusão) para Vendedor, Família e Marca. Toggle "Ocultar canais externos" sai da linha superior e vai **abaixo** dos dois grupos.

### Layout

```text
┌───────────────────────────── linha 1 ─────────────────────────────┐
│ [Filial] [Vendedor] [Família] [Marca]   │   [Excluir Vendedor]   │
│  ← positivos (esquerda)                 │  [Excluir Família]      │
│                                         │  [Excluir Marca]        │
│                                         │  ← negativos (direita)  │
├───────────────────────────── linha 2 ─────────────────────────────┤
│ [⨯ Limpar filtros]      [◐ Ocultar canais externos] (ⓘ)           │
└────────────────────────────────────────────────────────────────────┘
```

- Em desktop: positivos à esquerda, negativos agrupados à direita (`ml-auto`).
- Em mobile: empilha naturalmente (cada bloco em sua linha), toggle por último.
- Cada filtro negativo usa o mesmo padrão visual do `MultiFilterSelect` já existente (Popover + Checkbox), com label `Excluir Vendedor`, etc., e placeholder `Nenhum excluído` / `N excluídos`.

### Mudanças em `src/pages/Gerencial.tsx`

1. **Estado novo:**
   ```ts
   const [excludeVendedores, setExcludeVendedores] = useState<string[]>([]);
   const [excludeFamilias,  setExcludeFamilias]  = useState<string[]>([]);
   const [excludeMarcas,    setExcludeMarcas]    = useState<string[]>([]);
   ```
   Reset junto com os demais filtros nos `useEffect` de período e em `clearAllFilters`.

2. **`filteredAll` (linha ~272):** após os filtros positivos atuais, adicionar:
   ```ts
   if (excludeVendedores.length && row.vendedor_nome && excludeVendedores.includes(row.vendedor_nome)) return false;
   if (excludeFamilias.length   && row.familia_produto && excludeFamilias.includes(row.familia_produto)) return false;
   if (excludeMarcas.length     && row.marca && excludeMarcas.includes(row.marca)) return false;
   ```
   Atualizar deps do `useMemo`.

3. **Query da tabela paginada (`gerencial-vendas`):** aplicar exclusão via `.not('vendedor_nome','in',`(...)`)` etc., **ou** (mais simples e consistente com hideCanais já feito client-side em outros pontos) aplicar a exclusão como pós-filtro client-side no `mappedRows`. → Vou usar `.not(col, 'in', '("a","b")')` no Supabase para manter a paginação correta. Adicionar as 3 listas à `queryKey`.

4. **Reutilizar `MultiFilterSelect`** já existente — sem precisar de novo componente. As opções vêm de `filterOptions.vendedores / familias / marcas`.

5. **Reorganizar JSX dos filtros** (linhas ~499-538):
   - Linha 1: dois grupos lado a lado.
   - Linha 2 (nova): "Limpar filtros" + bloco do toggle "Ocultar canais externos" (movido pra cá).

6. **Chips de filtros ativos** (`activeFilters`, linha ~453): adicionar chips para cada item excluído, ex.: `Excluir Vendedor: FULANO` (ícone X remove só aquele item da lista de exclusão). Mantém o chip âmbar de "Canais externos ocultos".

### O que NÃO muda
- Lógica de KPIs, gráfico, motor de comissão, outras páginas.
- Toggle `hideCanais` continua funcionando exatamente como hoje (apenas muda de posição).
- Filtros positivos atuais (Filial / Vendedor / Família / Marca) intocados.

### Arquivo
- `src/pages/Gerencial.tsx` (única alteração)

