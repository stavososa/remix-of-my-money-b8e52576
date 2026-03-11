

## Plano: Filtro de Mes Local + Todos os Filtros Funcionando

### Problema
A query atual usa `PeriodContext` (Marco/2026) mas os dados sao de Janeiro/2026. Resultado: dashboard vazio.

### Solucao

Alterar `src/pages/Gerencial.tsx`:

1. **Buscar TODAS as vendas** sem filtro de periodo na query Supabase (remover `.gte`/`.lt` de `data_emissao`)

2. **Adicionar filtro local de Mes/Ano** como primeiro dropdown na barra de filtros:
   - Extrair meses unicos dos dados (`data_emissao` -> `YYYY-MM`)
   - Dropdown com opcoes como "Janeiro/2026", "Fevereiro/2026", etc.
   - Valor default: primeiro mes disponivel nos dados
   - Ao trocar o mes, resetar os demais filtros

3. **Manter todos os 6 filtros existentes** (Dia, Unidade, Vendedor, Familia, Marca, Produto) reagindo ao mes selecionado:
   - As opcoes de cada filtro sao recalculadas com base no mes selecionado
   - Filtros em cascata: selecionar mes -> atualiza opcoes de dia, vendedor, etc.

4. **Remover dependencia do `PeriodContext`** nesta pagina (o filtro de periodo sera local)

### Arquivo alterado
- **`src/pages/Gerencial.tsx`** - Query sem filtro de periodo, novo dropdown de Mes/Ano, filtros em cascata baseados no mes selecionado

