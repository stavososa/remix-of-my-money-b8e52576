

## Situacao Atual

O novo Supabase (`tdbuhbppxztuloncplqj`) tem apenas 2 tabelas funcionando:
- **`vendas`** - existe mas esta vazia (0 registros)
- **`controle_pj`** - 44 registros com nome, unidade e setor

Tabelas/views **ausentes** (retornando 404): `perfis`, `vendedores`, `unidades`, `v_ranking`, `v_resumo_unidade`, `vendas_gerais`.

Isso significa que o login funciona mas o perfil nao carrega (role fica null), e toda a pagina Gerencial mostra dados vazios.

## Plano

### 1. Gerar script SQL para recriar tabelas essenciais no novo Supabase

Criar as tabelas que faltam: `perfis`, `vendedores`, `unidades`, `vendas_gerais`, e as views `v_ranking`, `v_resumo_unidade`, `v_resumo_regime` com RLS policies. Sem isso, nenhuma pagina funciona.

### 2. Refatorar a pagina Gerencial com filtros avancados

Substituir o Gerencial atual por uma versao focada na tabela `vendas` com os seguintes filtros:

- **Mes** (ja existe via PeriodContext)
- **Dia do mes** (select com dias 1-31, filtrado pela data_emissao)
- **Vendedor** (select populado dinamicamente dos vendedores unicos na tabela vendas)
- **Produto** (select com descricao_produto)
- **Familia** (select com familia_produto)
- **Marca** (select com marca)

Manter KPIs no topo (Faturamento, Lucro, Margem, Qtd Vendas) recalculados com cada filtro.

Manter graficos existentes (Faturamento por Unidade, Margem por Unidade, Top Familias) reagindo aos filtros.

Adicionar tabela detalhada das vendas filtradas com colunas: Data, Vendedor, Produto, Familia, Marca, Valor, Lucro, Margem.

### 3. Mapear vendedor a unidade via `controle_pj`

Como `vendedores` e `unidades` nao existem no novo banco, usar `controle_pj` (que tem `nome` e `unidade`) para associar vendedores a unidades. O campo `vendedor_nome` da tabela `vendas` sera cruzado com `controle_pj.nome` ou `controle_pj.nome_vendas`.

### Arquivos alterados

- **`src/pages/Gerencial.tsx`** - Refatorar completamente: novos filtros (dia, vendedor, produto, familia, marca), logica de cruzamento com `controle_pj`, tabela detalhada de vendas
- **Novo script SQL** - Fornecido no chat para o usuario executar no Supabase SQL Editor

### Nota importante

A tabela `vendas` esta vazia no novo banco. Os dados precisam ser importados (via pagina AdminImportar ou manualmente). Ate la, a pagina mostrara "Nenhum dado encontrado" mas toda a estrutura de filtros e graficos estara pronta.

