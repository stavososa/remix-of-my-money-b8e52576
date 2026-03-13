

## Plano: Garantir Responsividade em Todos os Painéis

### Problemas Identificados

1. **Gerencial.tsx**
   - Filtros `<select>` com `min-w-[140px]` podem estourar em telas pequenas
   - KPIs `grid-cols-2 lg:grid-cols-5` — ok, mas valores monetários longos podem quebrar
   - Gráfico com altura fixa `h-[300px]` — reduzir no mobile
   - Tabela de vendas: header com `flex items-center justify-between` pode empilhar mal no mobile
   - `FilterSelect` não tem versão mobile amigável

2. **MeuPainel.tsx**
   - Cards de comparativo/gauge com `p-8` — padding excessivo no mobile
   - Gráficos com altura fixa `height={300}` — pode ser muito em telas pequenas
   - Tabelas manuais (`<Table>`) sem scroll horizontal explícito em containers pequenos
   - Ranking PJ table sem mobile cards view (usa `<Table>` direto)

3. **Ranking.tsx**
   - Já tem mobile cards (`md:hidden`) — está bom
   - Banner top performer com `p-6` e texto `text-2xl` — ok

4. **DataTable.tsx**
   - Já tem `overflow-x-auto` — ok
   - Sem mobile card view alternativa (usado no Gerencial)

5. **KPICard.tsx**
   - Valor `text-2xl` pode ser longo demais em `grid-cols-2` no mobile
   - Ícone `h-12 w-12` ocupa espaço — pode reduzir no mobile

6. **AppShell.tsx**
   - PeriodFilter no topbar pode empurrar conteúdo — verificar

### Alterações

**1. `src/components/KPICard.tsx`**
- Reduzir tamanho do valor para `text-xl sm:text-2xl`
- Reduzir ícone para `h-10 w-10 sm:h-12 sm:w-12`
- Reduzir padding para `p-4 sm:p-5`

**2. `src/pages/Gerencial.tsx`**
- Filtros: adicionar `overflow-x-auto` no container de filtros e reduzir `min-w` no mobile
- Gráfico: `h-[220px] sm:h-[300px]`
- Header da tabela: empilhar verticalmente no mobile (`flex-col sm:flex-row`)
- KPIs: manter `grid-cols-2` mas adicionar `gap-3` no mobile

**3. `src/pages/MeuPainel.tsx`**
- Reduzir padding de cards de `p-8` para `p-4 sm:p-6 lg:p-8`
- Gráficos: altura responsiva `height` via container `h-[220px] sm:h-[300px]`
- Ranking PJ: adicionar mobile cards view (como no Ranking.tsx) usando `md:hidden`/`hidden md:block`
- Produtos table: já tem `overflow-auto` — ok

**4. `src/components/DataTable.tsx`**
- Pagination controls: empilhar no mobile (`flex-col sm:flex-row`)
- Textos menores no mobile nos headers

**5. `src/components/AppShell.tsx`**
- PeriodFilter: esconder label no mobile, manter apenas o seletor compacto

### Escopo
Ajustes de CSS/Tailwind em 5 arquivos. Sem mudança de lógica ou dados.

