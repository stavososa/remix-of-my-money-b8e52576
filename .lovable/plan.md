

## Plano: Filtros de vendedor/familia/marca independentes de data para gerentes

### Problema
Atualmente, as opções dos dropdowns "Todos os Vendedores", "Todas as Famílias" e "Todas as Marcas" vêm do dataset `allVendas`, que é filtrado pelo período selecionado (mês/ano). Quando o gerente troca de mês, as opções mudam conforme os dados daquele mês. O usuário quer que essas opções mostrem **todos** os vendedores/famílias/marcas que já venderam na Matriz, independente da data.

### Solução

#### Arquivo: `src/pages/Gerencial.tsx`

1. **Nova query dedicada para opções de filtro do gerente**: Criar uma query separada (`gerente-filter-options`) que busca vendedores, famílias e marcas **sem filtro de data**, apenas filtrando por `cnpj_empresa` da Matriz. Essa query terá `staleTime: Infinity` e será executada apenas para gerentes.

2. **Consulta eficiente**: Em vez de baixar todas as vendas históricas, a query fará 3 `SELECT DISTINCT` separados:
   - `SELECT DISTINCT vendedor_nome FROM vendas WHERE cnpj_empresa IN (...)`
   - `SELECT DISTINCT familia_produto FROM vendas WHERE cnpj_empresa IN (...)`
   - `SELECT DISTINCT marca FROM vendas WHERE cnpj_empresa IN (...)`

3. **Usar as opções fixas no `filterOptions`**: Quando `isGerente`, o `filterOptions` usará os dados dessa nova query em vez de derivar de `allVendas`.

### Detalhes Tecnico

- A nova query só executa quando `isGerente && gerenteCnpjs.length > 0`
- As 3 consultas `DISTINCT` rodam em paralelo via `Promise.all`
- O `filterOptions` memo condiciona: se gerente, usa dados da nova query; se admin, mantém lógica atual derivada de `allVendas`
- Sem alterações em banco de dados ou outros arquivos

