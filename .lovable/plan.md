

## Plano: Aba de Bonificação (Admin)

### Conceito
Nova página `/admin/bonificacao` acessível apenas por admins, onde é possível cadastrar prêmios com imagem, descrição e definir quantos vendedores do topo do ranking serão premiados.

### Alterações no Banco (Supabase)

**Migration 1 — Tabela `bonificacoes`**
```sql
create table public.bonificacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  imagem_url text,
  qtd_premiados int not null default 3,
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bonificacoes enable row level security;

-- Apenas admins autenticados podem ler/escrever
create policy "Admins podem gerenciar bonificacoes"
  on public.bonificacoes for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

**Migration 2 — Bucket de imagens**
```sql
insert into storage.buckets (id, name, public) values ('bonificacoes', 'bonificacoes', true);

-- Upload só por admins
create policy "Admin upload bonificacoes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bonificacoes' and public.has_role(auth.uid(), 'admin'));

-- Leitura pública
create policy "Public read bonificacoes"
  on storage.objects for select to public
  using (bucket_id = 'bonificacoes');
```

### Alterações no Frontend

**`src/pages/AdminBonificacao.tsx`** (novo)
- Página com formulário para cadastrar/editar bonificações
- Campos: título, descrição, upload de imagem (para o bucket `bonificacoes`), quantidade de premiados (input numérico)
- Lista de bonificações existentes em cards com imagem, título, descrição e badge com qtd de premiados
- Botão ativar/desativar cada bonificação
- Botão excluir

**`src/App.tsx`**
- Importar lazy `AdminBonificacao`
- Adicionar rota `/admin/bonificacao` com `RequireAuth` + `RequireAdmin`

**`src/components/AppShell.tsx`**
- Adicionar item `{ label: 'Bonificação', to: '/admin/bonificacao', icon: Gift, roles: ['admin'] }` no array `adminItems`
- Importar `Gift` do lucide-react

**`src/integrations/supabase/types.ts`**
- Adicionar tipagem da tabela `bonificacoes` (gerada pela migration)

### Fluxo do Admin
1. Acessa "Bonificação" no menu lateral
2. Clica "Nova Bonificação"
3. Preenche título, descrição, faz upload da imagem do prêmio
4. Define quantas pessoas do topo do ranking serão premiadas
5. Salva — bonificação aparece na lista com card visual

