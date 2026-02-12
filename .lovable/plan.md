

# Refletir dados da tabela `vendas` no Dashboard (filtro: LUCAS VILAR)

## Objetivo
Adicionar uma nova seção ao dashboard `/meu-painel` que consulta diretamente a tabela `vendas` (filtrada por `vendedor_nome = 'LUCAS VILAR'`) e exibe os dados agregados e detalhados.

## Contexto dos dados
A tabela `vendas` armazena valores monetários como **texto** (ex: `"R$  29,90"`, `"50,17%"`), então será necessário fazer parsing no frontend para converter para números.

Dados disponíveis para LUCAS VILAR: 13 vendas, 9 notas fiscais, ~R$ 325 vendido, margem média ~49.8%.

## Mudanças

### 1. `src/pages/MeuPainel.tsx`

**Nova query com React Query:**
- Buscar da tabela `vendas` filtrando `vendedor_nome = 'LUCAS VILAR'`
- Ordenar por `data_emissao` descendente

**Funções auxiliares de parsing:**
- `parseMoneyBR(str)` -- converte `"R$  29,90"` para `29.90`
- `parsePctBR(str)` -- converte `"50,17%"` para `50.17`

**Dados agregados calculados no frontend:**
- Total vendido (soma de `total_com_desconto`)
- Total lucro (soma de `lucros_reais`)
- Margem média (média de `margem_percentual`)
- Quantidade de notas (distinct `nota_fiscal`)
- Quantidade de itens (count)

**Novas seções visuais (abaixo das existentes):**

1. **KPI Cards das Vendas Diretas** -- 4 cards mostrando Total Vendido, Total Lucro, Margem Média e Qtd Notas dos dados da tabela `vendas`

2. **Tabela de Vendas Detalhadas** -- usando o componente `DataTable` existente com colunas:
   - Data Emissão
   - Nota Fiscal
   - Produto
   - Marca
   - Quantidade
   - Total c/ Desconto
   - Margem %
   - Lucro

3. **Gráfico de vendas por dia** -- agrupando `total_com_desconto` por `data_emissao` em um BarChart (recharts)

### 2. Segurança
- A tabela `vendas` **não possui RLS ativo**, então a query funcionará normalmente para qualquer usuário autenticado.
- O filtro `vendedor_nome = 'LUCAS VILAR'` é hardcoded conforme solicitado.

## Detalhes Técnicos

- O parsing de valores BR será feito com regex: `str.replace(/[R$\s.]/g, '').replace(',', '.')` para dinheiro
- A query buscará todos os registros (tabela parece pequena, ~13 rows para este vendedor)
- Será usada `useQuery` com queryKey `['vendas-lucas']`
- Os componentes `KPICard` e `DataTable` já existentes serão reutilizados
- Animações `framer-motion` consistentes com o restante da página

