

## Plano: Controle de acesso por filial via email (role "gerente")

### Contexto
Hoje existem dois roles: `admin` (vê tudo) e `vendedor` (vê só o próprio). O pedido é criar um nível intermediário — **gerente de filial** — mapeado por email, onde:
- `matrizatacadao@proton.me` → gerente da filial **Matriz**
- `recreioatacadao@proton.me` → gerente da filial **Recreio**

### Regras de acesso do gerente
1. **Dados completos** da sua filial (faturamento, lucro, comissões, vendedores)
2. **Rankings censurados** para outras filiais: vê posições (#1, #2...) mas **sem valores financeiros** (faturamento, lucro, comissão aparecem como "—")
3. Acesso às páginas: Ranking, Ranking Comissões, e um painel gerencial **filtrado** para sua filial
4. **Sem acesso** às páginas de admin (Regras, Importar, Bonificação)

### Implementação

#### 1. Criar perfis no banco para os gerentes
- Inserir registros na tabela `perfis` com um novo role `gerente` para cada email
- Associar cada perfil a uma `unidade_id` (filial) — adicionar coluna `unidade_id` na tabela `perfis` se não existir

#### 2. Atualizar AuthContext
- Expandir o type de `role` para incluir `'gerente'`
- Carregar `unidade_id` e `unidade_nome` do perfil do gerente (sem precisar de `vendedor_id`)
- Expor `filial_id` no contexto para uso nos filtros

#### 3. Atualizar RouteGuards
- `RequireAdmin` → continua bloqueando gerentes (só admin)
- Criar `RequireAdminOrGerente` para páginas que ambos acessam (Gerencial com filtro)
- `RedirectByRole` → gerente redireciona para `/gerencial` (filtrado)

#### 4. Atualizar AppShell (navegação)
- Gerente vê: Ranking, Gerencial (filtrado), Ranking Comissões
- Gerente **não vê**: Regras, Importar, Bonificação

#### 5. Página Ranking — censura de valores
- Se `role === 'gerente'`:
  - Na aba Vendedores: mostrar nome/posição de todos, mas colunas de Faturamento/Lucro/Comissão exibem "—" para vendedores de **outras filiais**
  - Nas abas Produtos/Marcas/Famílias: mostrar dados completos **apenas da filial do gerente**, censurar valores de itens agregados de outras filiais

#### 6. Página RankingComissoes — mesma lógica de censura
- KPIs mostram apenas dados da filial do gerente
- Rankings: posições visíveis, valores censurados para itens de outras filiais

#### 7. Página Gerencial — filtro forçado
- Se `role === 'gerente'`: forçar filtro de filial para a unidade do gerente, sem permitir trocar

#### 8. Criar contas de autenticação
- Criar os usuários `matrizatacadao@proton.me` e `recreioatacadao@proton.me` no auth do Supabase externo
- Inserir os perfis com role `gerente` e `unidade_id` correspondente

### Arquivos modificados
- `src/contexts/AuthContext.tsx` — novo role + filial_id
- `src/components/auth/RouteGuards.tsx` — novo guard
- `src/components/AppShell.tsx` — navegação condicional
- `src/pages/Ranking.tsx` — censura de valores por filial
- `src/pages/RankingComissoes.tsx` — censura de valores por filial  
- `src/pages/Gerencial.tsx` — filtro forçado por filial
- `src/App.tsx` — rotas com novo guard
- Migração SQL: coluna `unidade_id` em `perfis` + inserção dos perfis

