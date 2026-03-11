

## Problemas Identificados

1. **Tabela `perfis` com erro de RLS** - Retorna erro 500 "infinite recursion detected in policy for relation perfis". Isso impede o app de detectar o role do usuario (admin/vendedor), bloqueando acesso as paginas.

2. **Tabela `vendas` vazia** - A query retorna `[]` para Marco/2026. Os dados precisam ser importados.

3. **Pagina Gerencial ja foi refatorada** - O codigo atual ja tem os 6 filtros (Dia, Unidade, Vendedor, Familia, Marca, Produto), KPIs, graficos e tabela detalhada. So falta dados e corrigir o RLS.

## Plano

### 1. Corrigir RLS da tabela `perfis` no Supabase

Voce precisa executar este SQL no **Supabase SQL Editor** para corrigir a recursao infinita:

```sql
-- Remover policies com recursao
DROP POLICY IF EXISTS "Users can view own profile" ON perfis;
DROP POLICY IF EXISTS "Users can update own profile" ON perfis;
DROP POLICY IF EXISTS "Admins can view all profiles" ON perfis;

-- Recriar sem recursao
CREATE POLICY "Users can view own profile" ON perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON perfis
  FOR UPDATE TO authenticated
  USING (id = auth.uid());
```

### 2. Inserir perfil admin para o usuario logado

```sql
INSERT INTO perfis (id, role, nome)
VALUES ('141cfd5d-bd84-4a4e-9ee0-ae13a21d6998', 'admin', 'SST Comissoes')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### 3. Importar dados na tabela `vendas`

A tabela `vendas` existe com a estrutura correta (data_emissao, vendedor_nome, total_com_desconto, lucros_reais, margem_percentual, familia_produto, marca, etc). Basta importar os dados via:
- Pagina **Admin > Importar** (se funcionar apos corrigir o perfil)
- Ou upload CSV direto no Supabase Dashboard

### 4. Ajustar o frontend para ser resiliente ao perfis vazio

Modificar o `AuthContext.tsx` para tratar o erro de RLS graciosamente e permitir acesso mesmo quando o perfil falha, evitando tela branca.

### Arquivos alterados
- **`src/contexts/AuthContext.tsx`** - Tratar erro 500 do perfis para nao bloquear o app

### Acoes do usuario no Supabase
- Executar SQL para corrigir RLS do `perfis`
- Inserir perfil admin
- Importar dados na tabela `vendas`

