

## Plano: Garantir filtro de vendedores/famílias/marcas somente da filial do gerente

### Problema provável
A comparação `u.nome === filial_gerente` na linha 270 é case-sensitive. Se `unidades.nome` no banco for "Matriz" e `filial_gerente` for "MATRIZ", o filtro falha silenciosamente e mostra vendedores de todas as filiais.

### Correção

#### Arquivo: `src/pages/Gerencial.tsx`

1. **Tornar a comparação case-insensitive** no `filterOptions` (linha 270):
   - Trocar `u.nome === filial_gerente` por `u.nome.toUpperCase() === filial_gerente?.toUpperCase()`

2. **Mesma correção no `filteredAll`** — o `getFilial()` já normaliza via `cnpjFilialMap`, mas o `filtroUnidade` usa o nome exato. Garantir que o `useEffect` que seta `filtroUnidade` para gerente (linha 93-97) use o nome correto da tabela `unidades` em vez do valor hardcoded do mapa.

3. **Adicionar fallback**: se `gerenteCnpjs` ficar vazio (nenhum CNPJ encontrado para a filial), logar um warning no console para facilitar debug futuro.

São ajustes pontuais de robustez no mesmo arquivo.

