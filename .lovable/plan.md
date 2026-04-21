

## Botão "Ver Vendedores da Filial" no Gerencial

### Objetivo
Adicionar um botão ao lado dos filtros que abre um modal listando todos os `vendedor_nome` distintos que tiveram venda nas filiais atualmente selecionadas (no período vigente). Não lista as vendas — apenas a relação única de vendedores, com a contagem de vendas de cada um.

### Comportamento
- Botão **"Vendedores da filial"** (ícone Users) ao lado do botão "Limpar filtros" (linha 2 dos filtros).
- Habilitado quando houver **pelo menos uma filial selecionada** (ou quando for `gerente`, que já tem filial fixa). Desabilitado caso contrário, com tooltip "Selecione uma filial".
- Ao clicar abre um `Dialog` com:
  - Título: `Vendedores — {filiais selecionadas}` (ex.: "Vendedores — BOTAFOGO" ou "Vendedores — BOTAFOGO, NOVA IGUAÇU").
  - Subtítulo com contagem total: `N vendedores no período`.
  - Campo de busca local (filtra a lista por nome).
  - Lista (scroll) com cada linha mostrando: **Nome do vendedor** + badge com **nº de vendas** (linhas em `vendas`).
  - Ordenação: por nº de vendas desc, depois alfabética.

### Fonte de dados
Reutiliza o `allVendas` já carregado e o `filteredAll` parcialmente — mas **ignora** os filtros de Vendedor/Família/Marca/Exclusões para responder estritamente "quem vendeu nesta filial". Aplica:
- Filtro de filial atual (`filtroUnidade` ou `filial_gerente`).
- Toggle `hideCanais` se ativo (respeita preferência atual).
- Período já vem implícito de `allVendas`.

Agrega via `useMemo` em `Map<vendedor_nome, count>`.

### Mudanças em `src/pages/Gerencial.tsx` (único arquivo)
1. Novo estado `const [vendedoresFilialOpen, setVendedoresFilialOpen] = useState(false)` e `const [buscaVendedoresFilial, setBuscaVendedoresFilial] = useState('')`.
2. Novo `useMemo` `vendedoresPorFilial` que percorre `allVendas`, filtra por `filtroUnidade`/`filial_gerente` (+ `hideCanais` opcional) e devolve array `{ nome, count }[]` ordenado.
3. Novo botão (`Button` variant outline) na linha 2 dos filtros, ao lado de "Limpar filtros".
4. Novo `<Dialog>` no final do JSX (próximo ao `selectedVenda` dialog) renderizando a lista com `Input` de busca e linhas com nome + `Badge` de contagem.

### O que NÃO muda
- KPIs, gráfico, tabela paginada, motor de comissão, demais filtros e toggles.
- Demais páginas.

### Arquivo
- `src/pages/Gerencial.tsx`

