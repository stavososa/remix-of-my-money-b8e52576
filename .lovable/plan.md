

## Sincronizar toggles "Ocultar canais externos" e "Remover Daniel/Loja" com filtros de exclusão

### Objetivo
Quando o usuário ativar os toggles **"Ocultar canais externos"** ou **"Remover Daniel Cohen, Daniel Loja e Desenho Loja"**, os itens correspondentes devem aparecer **automaticamente marcados (checados)** nos respectivos dropdowns de filtros de exclusão (Excluir Vendedor / Excluir Família / Excluir Marca), refletindo visualmente que estão sendo excluídos. Ao desativar o toggle, os itens são desmarcados.

### Comportamento

**"Ocultar canais externos"** ativado:
- Marca em **Excluir Vendedor**: todos os `vendedor_nome` de `filterOptions.vendedores` que satisfaçam `isCanalExterno(nome, null, null)`.
- Marca em **Excluir Família**: famílias `ATACADO` (sempre) e `OUTROS` se houver linha com descrição contendo `%`. Para simplificar e garantir consistência: marca todas as famílias presentes em `filterOptions.familias` que estejam em `FAMILIAS_CANAL_EXTERNO_TOTAL` (`ATACADO`) ou `FAMILIAS_CANAL_EXTERNO_COM_PCT` (`OUTROS`) — assim o usuário vê claramente o que está sendo afetado.
- Não toca em Marca (canais externos não atuam por marca).

**"Remover Daniel..."** ativado:
- Marca em **Excluir Vendedor**: `DANIEL COHEN`, `DANIEL LOJA`, `DESENHO LOJA` (apenas os que existirem em `filterOptions.vendedores`, comparação case-insensitive devolvendo o valor original do option).

**Ao desativar o toggle**:
- Remove dos arrays de exclusão exatamente os itens que esse toggle havia adicionado (calculado pelo mesmo predicado), preservando o que o usuário marcou manualmente.

**Importante**:
- A exclusão funcional já acontece via filtros de exclusão. Os toggles continuam existindo como atalhos visuais e mantêm a flag `hideCanais`/`hideDanielLoja` (usada pelos chips vermelhos e pela detecção em `motivosExclusaoVendedor` etc.).
- Para evitar dupla exclusão sem efeito (já filtrado por nome + ainda por flag), nada muda — o filtro `excludeVendedores.includes(nome)` apenas evita que o item passe; ter o toggle simultaneamente é redundante mas não quebra.
- Os chips individuais `Excluir Vendedor: X` continuam aparecendo na linha de "Filtros ativos" (comportamento esperado: o usuário vê tudo que está excluído).

### Implementação em `src/pages/Gerencial.tsx`
1. Helper `getCanaisExternosFromOptions()` → retorna `{ vendedores: string[], familias: string[] }` com base em `filterOptions`.
2. Helper `getDanielLojaFromOptions()` → retorna `string[]` (os 3 nomes que existirem em `filterOptions.vendedores`).
3. Substituir `setHideCanais`/`setHideDanielLoja` diretos por **handlers** `handleToggleHideCanais(checked)` e `handleToggleHideDanielLoja(checked)` que:
   - Atualizam o estado do toggle (e o localStorage segue via `useEffect` existente).
   - Se `checked=true`: união dos itens nos arrays `excludeVendedores`/`excludeFamilias`.
   - Se `checked=false`: remove desses arrays os itens calculados pelo predicado.
4. Aplicar `handleToggleHideCanais(false)` no clique dos chips vermelhos (`X`) e no `Switch` `onCheckedChange`. Idem para o outro toggle.
5. **Não** disparar o efeito quando `filterOptions` ainda não estiver pronto: os handlers usam o snapshot atual; basta o usuário clicar com a página carregada (já é o caso do botão visível).
6. Ajustar `clearAllFilters` para também desligar os dois toggles? **Não** — o usuário não pediu isso e mantém comportamento atual.

### O que NÃO muda
- KPIs, gráfico, tabela, motor de comissão.
- Lógica dos modais e chips visuais.
- Lógica de `filteredAll` / `mappedRows` (continuam aplicando ambos: toggles e exclusões).

### Arquivo
- `src/pages/Gerencial.tsx`

