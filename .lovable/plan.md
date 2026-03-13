

## Plano: Congelar dados após carregamento completo

### Problema
O React Query tem `staleTime: 2 * 60 * 1000` (2 minutos) nas queries de vendas. Após 2 minutos, ao voltar para a aba ou por qualquer trigger interno, o React Query refaz as queries automaticamente. Como os dados são paginados em batches de 1000 (36+ requests paralelos), durante o refetch parcial os KPIs mostram valores intermediários/incorretos até todos os batches completarem.

### Causa raiz
- `staleTime: 2 * 60 * 1000` marca os dados como "stale" após 2 min
- Mesmo com `refetchOnWindowFocus: false` global, o React Query ainda pode refetchar por outros motivos (remount, reconnect)
- Durante o refetch, `isFetching` fica true mas os dados parciais do cache anterior podem ser substituídos

### Solução
Mudar `staleTime` para `Infinity` em todas as queries de dados nas páginas Gerencial, MeuPainel e Ranking. Isso faz com que os dados só sejam buscados novamente quando a queryKey muda (ex: troca de período, filtros). Os dados ficam "congelados" até o usuário explicitamente mudar algo.

### Alterações

**`src/pages/Gerencial.tsx`**
- Query `gerencial-all-vendas`: `staleTime: Infinity`
- Query `gerencial-vendas` (tabela paginada): `staleTime: Infinity`
- Query `controle-pj-filial`: já tem 10min, mudar para `Infinity`

**`src/pages/MeuPainel.tsx`**
- Todas as queries com `staleTime: 2 * 60 * 1000` → `Infinity`
- Queries com `staleTime: 10 * 60 * 1000` → `Infinity`

**`src/pages/Ranking.tsx`** (se houver queries similares)
- Mesmo padrão: `staleTime: Infinity`

**`src/App.tsx`**
- Default global `staleTime`: mudar de `2 * 60 * 1000` para `Infinity`
- Adicionar `refetchOnReconnect: false` e `refetchOnMount: false` para evitar qualquer refetch automático

### Comportamento esperado
1. Usuário abre o painel → dados carregam completamente
2. Enquanto carrega, KPIs mostram "—" (já implementado)
3. Após carregamento, dados ficam congelados
4. Só atualiza ao mudar período, filtro ou navegar para outra página e voltar com queryKey diferente

