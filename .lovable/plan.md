

## Plano: Adicionar coluna `cnpj` na tabela `unidades` e corrigir o filtro

### Problema raiz
A API retorna erro **`column unidades.cnpj does not exist`**. A tabela `unidades` no banco tem apenas: `id, nome, tipo, ativo, created_at`. Não existe coluna `cnpj`.

A screenshot que você mostrou anteriormente com a coluna `cnpj` pode ter sido de outra tabela ou do Table Editor com dados que ainda não foram salvos como coluna.

### Solução

**1. Migration: Adicionar coluna `cnpj` na tabela `unidades`**

```sql
ALTER TABLE public.unidades
ADD COLUMN cnpj text;
```

**2. Após a migration**: Você precisará preencher os CNPJs de cada unidade manualmente no Supabase Table Editor (ou me passar os valores para eu inserir via UPDATE).

**3. Atualizar `src/integrations/supabase/types.ts`**: Adicionar `cnpj: string | null` no Row/Insert/Update de `unidades`.

**4. Código em `Gerencial.tsx`**: Já está correto -- busca `nome, cnpj` e monta o mapeamento. Vai funcionar assim que a coluna existir com dados.

### Alternativa
Se a coluna `cnpj` já existe no banco mas não aparece nos tipos gerados, basta regenerar os tipos do Supabase. Me confirme se você tem certeza que a coluna existe no banco.

