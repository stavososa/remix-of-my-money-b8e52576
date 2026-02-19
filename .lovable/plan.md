

## Criar Usuario Admin (adm@gmail.com)

### O que sera feito

Criar uma edge function temporaria para registrar o usuario `adm@gmail.com` com senha `adm123` e atribuir o role de **admin** no sistema.

### Passos

1. **Criar edge function `create-admin-user`** que usa o Supabase Admin API (service role key) para:
   - Criar o usuario `adm@gmail.com` / `adm123` via `supabase.auth.admin.createUser`
   - Inserir o registro na tabela `perfis` com `role = 'admin'`

2. **Chamar a edge function** para criar o usuario

3. **Remover a edge function** apos uso (nao precisa ficar no projeto)

### Detalhes Tecnicos

**Arquivo**: `supabase/functions/create-admin-user/index.ts`

A funcao usara o `SUPABASE_SERVICE_ROLE_KEY` (ja configurado) para criar o usuario com privilegios administrativos, inserindo na tabela `perfis` com role `admin`.

Apos a criacao e validacao, a funcao sera removida do projeto.

