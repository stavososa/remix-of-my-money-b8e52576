

## Plano: Paginação + Busca na Tabela e Índices no Supabase

### Problema atual
1. A tabela "Vendas Detalhadas" renderiza **todas as linhas de uma vez** (potencialmente milhares), causando lentidão no scroll.
2. Não existe campo de busca para localizar vendas específicas.
3. Não há índices no banco para otimizar as queries com filtro por `data_emissao`.

### O que será feito

**1. Paginação de 30 linhas na DataTable** (`src/components/DataTable.tsx`)
- Adicionar prop opcional `pageSize` (default ilimitado, mas Gerencial passará 30).
- Controlar `currentPage` via estado interno.
- Renderizar apenas o slice da página atual (`sorted.slice(start, end)`).
- Adicionar controles de paginação no rodapé: Anterior / Página X de Y / Próximo.

**2. Campo de busca ao lado do título** (`src/pages/Gerencial.tsx`)
- Adicionar um input com ícone de lupa ao lado de "Vendas Detalhadas".
- Filtrar `vendasFiltradas` comparando o termo digitado contra todas as colunas visíveis (vendedor, unidade, produto, família, marca, nota fiscal).
- Busca case-insensitive e sem acentos.

**3. Índices no Supabase** (nova migration)
- Criar índices para acelerar as queries principais:
  - `idx_vendas_data_emissao` em `vendas(data_emissao)` — usado no filtro server-side `.gte/.lte`
  - `idx_vendas_vendedor_nome` em `vendas(vendedor_nome)` — usado nos filtros
  - `idx_vendas_familia_produto` em `vendas(familia_produto)`
  - `idx_vendas_marca` em `vendas(marca)`

### Arquivos alterados
- `src/components/DataTable.tsx` — paginação interna
- `src/pages/Gerencial.tsx` — input de busca + passar `pageSize={30}`
- Nova migration SQL — criação dos índices

