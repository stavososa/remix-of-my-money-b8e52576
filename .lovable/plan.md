

## Plano: Adicionar filtro por Filial no MeuPainel (Dashboard)

### O que muda

Adicionar um select de Filial no topo do painel administrativo, filtrando todos os KPIs, gráficos, tabelas e ranking pelo CNPJ da venda.

### Alterações em `src/pages/MeuPainel.tsx`

1. **Novo estado**: `filtroFilial` (default `'all'`)

2. **Nova query**: Buscar `unidades` com `cnpj, nome` (mesma do Gerencial)

3. **Mapa + helper**: `cnpjFilialMap` e `getFilial(cnpj_empresa)` (copiados do Gerencial)

4. **Atualizar query `allVendas`**: Incluir `cnpj_empresa` no select (atualmente não é buscado)

5. **Filtrar `vendasSource`**: Quando `filtroFilial !== 'all'`, filtrar as vendas antes de calcular `vendasAgg`, `vendasPorDia`, `vendasTableData`, `topProdutos` e `rankingPj`

6. **UI do filtro**: Renderizar um `Select` de Filial no header do admin (abaixo do título ou ao lado), com opções extraídas dos CNPJs únicos das vendas mapeados para nomes de filial. Visível apenas para admin.

7. **Reset**: Limpar `filtroFilial` ao trocar período

### Escopo

- Apenas para admin (`isAdmin = true`). Vendedores individuais não precisam deste filtro.
- Reutiliza a mesma lógica de mapeamento CNPJ→Filial já implementada no Gerencial.

