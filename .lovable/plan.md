

## Plano: Sistema de Regras de Comissão por Produto/Família/Marca

### Contexto atual
A tabela `regras_comissao` atual tem apenas: `nome`, `regime`, `tipo_unidade`, `percentual`, `periodo_ano`, `periodo_mes`, `ativo`. Não suporta classificação por produto, família ou marca.

A tabela `vendas` já possui: `descricao_produto`, `familia_produto`, `marca` — todos os campos necessários para o matching.

### Alterações necessárias

**1. Migration SQL — Adicionar colunas na tabela `regras_comissao`:**
```sql
ALTER TABLE regras_comissao
  ADD COLUMN familia_produto text,
  ADD COLUMN marca text,
  ADD COLUMN produto text,
  ADD COLUMN prioridade int GENERATED ALWAYS AS (
    CASE
      WHEN produto IS NOT NULL THEN 4
      WHEN familia_produto IS NOT NULL AND marca IS NOT NULL THEN 3
      WHEN marca IS NOT NULL THEN 2
      WHEN familia_produto IS NOT NULL THEN 1
      ELSE 0
    END
  ) STORED;
```

A coluna `prioridade` é calculada automaticamente:
```text
Prioridade 4: Produto específico (mais específica)
Prioridade 3: Família + Marca (combinação)
Prioridade 2: Marca isolada
Prioridade 1: Família isolada
Prioridade 0: Regra genérica (regime/unidade apenas)
```

Constraint para evitar duplicatas:
```sql
CREATE UNIQUE INDEX idx_regras_unique_combo ON regras_comissao (
  periodo_ano, periodo_mes, regime,
  COALESCE(tipo_unidade, ''),
  COALESCE(familia_produto, ''),
  COALESCE(marca, ''),
  COALESCE(produto, '')
) WHERE ativo = true;
```

**2. Atualizar `src/integrations/supabase/types.ts`:**
Adicionar `familia_produto`, `marca`, `produto` e `prioridade` nos tipos Row/Insert/Update de `regras_comissao`.

**3. Refatorar `src/pages/AdminRegras.tsx`:**

- **Interface `RegraForm`**: Adicionar campos `familia_produto`, `marca`, `produto` (todos `string | null`)
- **Modal de criação/edição**: Adicionar 3 novos campos:
  - **Família**: input text com autocomplete (valores distintos vindos da tabela `vendas.familia_produto`)
  - **Marca**: input text com autocomplete (valores distintos de `vendas.marca`)
  - **Produto**: input text com autocomplete (valores distintos de `vendas.descricao_produto`)
- **Indicador de prioridade**: Mostrar visualmente o nível de prioridade calculado (badge colorido)
- **Tabela**: Adicionar colunas Família, Marca, Produto; ordenar por prioridade DESC
- **Payload do save**: Incluir os 3 novos campos
- **Query de autocomplete**: Buscar valores distintos de `vendas` para sugestões nos inputs

**4. Colunas da tabela (desktop):**
```text
Nome | Regime | Unidade | Família | Marca | Produto | % | Prioridade | Status | Ações
```

Cards mobile seguem o mesmo padrão com os campos adicionais.

**5. Lógica de resolução de regra (para cálculo de comissão):**
Criar função utilitária `resolverRegra(venda, regrasAtivas)` que:
- Filtra regras compatíveis (regime, unidade, família, marca, produto)
- Ordena por prioridade DESC
- Retorna a regra mais específica

Esta função será usada futuramente no cálculo automático de comissões.

### SQL para executar manualmente no Supabase
Será fornecido o SQL completo após aprovação. As alterações no código React serão feitas automaticamente.

### Resultado
- Admin pode cadastrar regras em qualquer nível (genérica, família, marca, produto, combinações)
- Sistema calcula prioridade automaticamente
- Constraint impede regras duplicadas ativas
- Autocomplete facilita preenchimento correto dos campos
- Estrutura escalável para novos níveis no futuro

