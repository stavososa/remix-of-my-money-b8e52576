

## Plano

### 1. Gerencial: Remover filtro de Produto (src/pages/Gerencial.tsx)
- Remover o state `filtroProduto` e seu `FilterSelect`
- Remover referencia a `filtroProduto` em `vendasFiltradas`, `activeFilters` e `clearAllFilters`
- Manter apenas: Unidade, Vendedor, Familia, Marca

### 2. Ranking: Adicionar abas com rankings (src/pages/Ranking.tsx)
- Usar `Tabs` do Radix para criar duas abas: **Vendedores** (conteudo atual) e **Produtos Mais Vendidos**
- Na aba "Produtos", buscar dados da tabela `vendas` agrupando por `descricao_produto`, somando `total_com_desconto` e `quantidade`, ordenando por total vendido
- Exibir tabela com medalhas no top 3, colunas: posicao, produto, familia, marca, total vendido, quantidade
- Mobile: cards com layout similar ao existente

### Arquivos alterados
- `src/pages/Gerencial.tsx` — remover filtro de produto
- `src/pages/Ranking.tsx` — adicionar Tabs com ranking de vendedores (existente) e produtos mais vendidos (novo, baseado em query à tabela `vendas` filtrada por periodo)

