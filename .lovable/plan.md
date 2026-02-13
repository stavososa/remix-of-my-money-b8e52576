

# Ranking PJ - Contagem de Vendas via controle_pj

## Problema

A tabela `controle_pj` tem nomes completos (ex: "Ana Thaynara Ferreira Rocha") mas `vendas.vendedor_nome` usa abreviacoes em maiusculo (ex: "ANA ROCHA"). Alguns casos sao impossiveis de deduzir automaticamente (ex: "Wallace Pereira da Cruz" vira "WALLACE SOL").

## Solucao

### Passo 1 - Migracaco: adicionar coluna `nome_vendas` em `controle_pj`

Adicionar uma coluna `nome_vendas` (text, nullable) na tabela `controle_pj` que armazena o nome exato usado em `vendas.vendedor_nome`.

Pre-popular com os mapeamentos conhecidos usando a tabela `vendedores` como ponte (`controle_pj.nome` ~ `vendedores.nome_completo` -> `vendedores.nome_omie`).

```sql
ALTER TABLE controle_pj ADD COLUMN nome_vendas text;

-- Pre-popular via vendedores (ponte confiavel)
UPDATE controle_pj cp
SET nome_vendas = v.nome_omie
FROM vendedores v
WHERE v.regime = 'PJ'
  AND LOWER(TRIM(cp.nome)) = LOWER(TRIM(v.nome_completo));
```

Isso preenchera a maioria dos 31 registros. Nomes nao encontrados ficam NULL para o admin corrigir manualmente depois.

### Passo 2 - Nova query no MeuPainel.tsx

Adicionar uma query que:
1. Busca todos os 31 registros de `controle_pj` (com `nome_vendas`)
2. Para cada `nome_vendas` nao-nulo, conta quantas vezes aparece em `vendas.vendedor_nome`
3. Ordena por quantidade DESC e atribui posicao

### Passo 3 - Nova secao no UI do MeuPainel

Adicionar uma secao "Ranking PJ - Presenca em Vendas" com:
- Tabela: Posicao | Nome | Unidade | Qtd Vendas
- Linha do vendedor logado destacada com fundo diferente
- Badge no topo mostrando a posicao do usuario (ex: "#5 de 31")

### Passo 4 - Identificar o vendedor logado na lista

Usar o `nome_completo` do `AuthContext` para encontrar o registro correspondente em `controle_pj.nome` e destacar sua posicao.

## Detalhes Tecnicos

```text
Arquivo alterado: src/pages/MeuPainel.tsx

Queries:
  1. supabase.from('controle_pj').select('*')
  2. supabase.from('vendas').select('vendedor_nome')
     -> agrupar client-side por vendedor_nome com count

Join client-side:
  - Para cada controle_pj com nome_vendas, buscar count
  - Ordenar DESC, atribuir posicao
  - Localizar vendedor logado via nome_completo = controle_pj.nome

Migracao SQL:
  - ALTER TABLE controle_pj ADD COLUMN nome_vendas text
  - UPDATE com join em vendedores para pre-popular
```

