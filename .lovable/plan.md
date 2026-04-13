

## Plano: Desativar RLS e restaurar acesso aos dados

### Problema
O erro "infinite recursion detected in policy for relation perfis" bloqueia **todas** as consultas (vendas, perfis, etc.) porque as políticas RLS da tabela `perfis` referenciam a própria tabela, criando um loop infinito.

### Solução

Como o banco de dados está no seu projeto Supabase externo (`tdbuhbppxztuloncplqj`), você precisa executar o SQL abaixo no **SQL Editor** do Supabase:

```sql
-- 1. Remover todas as políticas problemáticas da tabela perfis
DROP POLICY IF EXISTS "perfis_select" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update" ON public.perfis;
DROP POLICY IF EXISTS "Permitir leitura do próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "Permitir leitura admin" ON public.perfis;
DROP POLICY IF EXISTS "Permitir update próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "Admin pode ver todos" ON public.perfis;
DROP POLICY IF EXISTS "Users can view own profile" ON public.perfis;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.perfis;

-- 2. Desativar RLS nas tabelas afetadas
ALTER TABLE public.perfis DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;

-- 3. Manter RLS desativado em controle_pj também (se aplicável)
ALTER TABLE public.controle_pj DISABLE ROW LEVEL SECURITY;
```

### O que muda
- **Todas as tabelas** voltarão a funcionar imediatamente para qualquer usuário autenticado
- O Gerencial, Ranking e Meu Painel carregarão os dados normalmente
- A segurança de acesso (admin vs vendedor) continuará sendo feita **no frontend** via `AuthContext` e `RouteGuards`

### Próximo passo (futuro)
Depois de restaurar o acesso, podemos implementar controle de visibilidade de dados via **views filtradas** ou **funções SECURITY DEFINER** no lugar de RLS direto, evitando recursão.

### Ação necessária
Execute o SQL acima no SQL Editor do seu Supabase: https://supabase.com/dashboard/project/tdbuhbppxztuloncplqj/sql e depois recarregue o app.

