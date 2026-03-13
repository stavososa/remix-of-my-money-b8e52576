

## Plano: Adaptar layout para smartphone

### Problemas identificados

1. **Header (AppShell)**: O `PeriodFilter` com selects + 5 botões + avatar fica tudo na mesma linha `h-16`, transbordando em telas pequenas. Não há scroll nem quebra de linha no header.

2. **Filtros do Gerencial**: Os 4 `FilterSelect` com `min-w-[110px]` transbordam a tela em mobile. O `overflow-x-auto` existe mas não há indicação visual de scroll.

3. **DataTable**: Tabela com 10 colunas não cabe em mobile. Tem `overflow-x-auto` mas as células usam `px-4` e texto sem truncamento.

4. **PeriodFilter**: Botões de preset (Mês, 3d, 7d, 15d, Personalizado) somados aos selects ultrapassam a largura em telas <400px.

### Alterações

**`src/components/AppShell.tsx`**
- Separar o header em duas linhas no mobile: linha 1 = menu + título + avatar; linha 2 = PeriodFilter com scroll horizontal
- Mudar de `h-16` fixo para `h-auto` com padding vertical
- PeriodFilter em container com `overflow-x-auto` e `-webkit-overflow-scrolling: touch`

**`src/components/PeriodFilter.tsx`**
- Reduzir padding dos botões preset para `px-2` em mobile (`h-7` em vez de `h-8`)
- Selects de mês/ano menores: `text-xs` e `px-2 py-1` em mobile
- Usar `flex-nowrap overflow-x-auto` no container principal para scroll horizontal fluido
- Popover do calendário personalizado: usar `align="start"` e `side="bottom"` para não sair da tela

**`src/pages/Gerencial.tsx`**
- FilterSelects: reduzir `min-w` para `min-w-[90px]` em mobile, usar `text-[11px]`
- Wrap dos filtros: manter `flex-wrap` mas com gap menor `gap-1.5`
- KPI grid: manter `grid-cols-2` no mobile (já está ok)

**`src/components/DataTable.tsx`**
- Reduzir padding das células para `px-2 py-2` em mobile (usar classe responsiva `px-2 sm:px-4`)
- Adicionar `whitespace-nowrap` nas células de cabeçalho para evitar quebra
- Texto menor: `text-xs` base (já é `text-sm`, mudar para `text-[11px] sm:text-sm`)
- Paginação: botões menores em mobile com `text-[11px]` e `px-1.5 py-1`

### Resultado
Todos os elementos ficam acessíveis e clicáveis em telas de smartphone (~375px), com scroll horizontal onde necessário e elementos dimensionados para toque.

