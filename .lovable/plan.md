

## Botões "Famílias" e "Marcas" da filial + indicação visual de exclusões

### Objetivo
Estender o padrão do botão "Vendedores da filial" para também listar **Famílias** e **Marcas** presentes nas filiais selecionadas, e fazer com que cada item dos três modais (Vendedores, Famílias, Marcas) sinalize visualmente, em **vermelho com tag "Excluído via filtro"**, quando estiver sendo removido por algum filtro de exclusão ativo (filtro negativo, "Ocultar canais externos" ou "Remover Daniel Cohen / Daniel Loja / Desenho Loja").

### Comportamento

**Novos botões na linha 2 dos filtros (ao lado de "Vendedores da filial"):**
- **Famílias da filial** (ícone `Package`) — abre modal com `familia_produto` distintos.
- **Marcas da filial** (ícone `Tag`) — abre modal com `marca_produto` distintos.
- Mesma regra de habilitação/tooltip do botão de vendedores (precisa ter filial selecionada; gerente sempre habilitado).

**Modais (mesmo layout dos Vendedores):**
- Título: `Famílias — {filiais}` / `Marcas — {filiais}`.
- Subtítulo com contagem total.
- `Input` de busca local.
- Lista ordenada por nº de ocorrências desc, depois alfabética.
- Cada linha: nome + `Badge` com nº de vendas.

**Sinalização visual de exclusão (nos 3 modais):**
Para cada item da lista, avalia se ele seria removido pelos filtros de exclusão ativos:
- Filtro negativo (`exclVendedores` / `exclFamilias` / `exclMarcas`).
- `hideCanais` → marca itens detectados por `isCanalExterno` (aplicável principalmente em Vendedores; Famílias `ATACADO` e `OUTROS` com % também).
- `hideDanielLoja` → marca `DANIEL COHEN`, `DANIEL LOJA`, `DESENHO LOJA` no modal de Vendedores.

Quando excluído:
- Nome em **vermelho** (`text-destructive`).
- `Badge` extra `variant="destructive"` ao lado do nome com texto curto indicando o motivo: `Excluído (filtro negativo)`, `Excluído (canais externos)` ou `Excluído (Daniel/Loja)`. Se mais de um motivo, concatena (ex.: `Excluído (canais externos, filtro negativo)`).
- Linha levemente esmaecida (`opacity-70`).

**Refletir toggles nos filtros positivos:**
Logo abaixo dos chips de status atuais (linha de "Filtros ativos"), quando `hideCanais` ou `hideDanielLoja` estiverem ativos, exibir chips em **vermelho** (`bg-destructive/15 text-destructive border-destructive/40`) com:
- `Canais externos ocultos` (X remove → desativa toggle).
- `Daniel Cohen / Daniel Loja / Desenho Loja ocultos` (X remove → desativa toggle).

Hoje esses chips são âmbar; passam a vermelho para reforçar que são exclusões.

### Fonte de dados
Reutiliza `allVendas` filtrado **somente** por filial (sem aplicar exclusões), igual à lógica atual de `vendedoresPorFilial`. Cria dois novos `useMemo`:
- `familiasPorFilial`: agrega `familia_produto` (ignora vazios).
- `marcasPorFilial`: agrega `marca_produto` (ignora vazios).

A flag de "está excluído" é calculada por linha do modal usando os mesmos predicados já existentes (`matchesNegativos`, `isCanalExterno`, `matchesDanielLoja`).

### Mudanças em `src/pages/Gerencial.tsx` (único arquivo)
1. Estados: `familiasFilialOpen`, `marcasFilialOpen`, `buscaFamiliasFilial`, `buscaMarcasFilial`.
2. `useMemo` `familiasPorFilial` e `marcasPorFilial` (mesmo padrão de `vendedoresPorFilial`).
3. Helper `motivosExclusaoVendedor(nome)`, `motivosExclusaoFamilia(familia)`, `motivosExclusaoMarca(marca)` retornando array de strings de motivo.
4. Refatorar a lista do modal de Vendedores para também usar os motivos (já que hoje não marca exclusão).
5. Dois novos botões na linha de filtros + dois novos `<Dialog>` no final do JSX.
6. Trocar variante visual dos chips de "Canais externos ocultos" e "Daniel..." de âmbar para vermelho/destructive.

### O que NÃO muda
- KPIs, gráfico, tabela, motor de comissão, filtros positivos e demais páginas.
- Lógica dos toggles em si — apenas a aparência dos chips muda.

### Arquivo
- `src/pages/Gerencial.tsx`

