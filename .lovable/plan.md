

## Plano: Restaurar KPIs e Gráficos no Gerencial

O Gerencial atual tem apenas filtros + tabela. Vamos adicionar de volta KPIs e gráficos, alimentados pelos dados da tabela `vendas` com parsing no frontend (sem RPCs).

### Abordagem

Buscar **todos** os registros de `vendas` do período (com busca paginada recursiva para superar o limite de 1000 do Supabase), aplicar filtros client-side para KPIs e gráficos, e manter a tabela paginada server-side como está.

### Alterações em `src/pages/Gerencial.tsx`

**1. Nova query: buscar todas as vendas do período (para KPIs/gráficos)**
- Busca recursiva (1000 em 1000) para garantir 100% dos registros
- Campos: `data_emissao`, `vendedor_nome`, `total_com_desconto`, `lucros_reais`, `margem_percentual`, `familia_produto`, `marca`
- Filtros de período server-side; filtros de unidade/vendedor/família/marca aplicados client-side sobre esse dataset completo

**2. KPIs (4 cards acima dos gráficos)**
- Faturamento Total (soma `total_com_desconto`)
- Lucro Total (soma `lucros_reais`)
- Margem Média (média ponderada `margem_percentual`)
- Qtd Vendas (contagem de registros)
- Usando o componente `KPICard` já existente
- Reagindo aos filtros ativos

**3. Gráficos (grid 2 colunas no desktop)**

- **Faturamento por Dia** (AreaChart): soma de `total_com_desconto` agrupada por `data_emissao`, com linha de acumulado
- **Faturamento por Unidade** (BarChart horizontal): soma agrupada pela unidade mapeada via `controle_pj`
- **Top 10 Famílias** (BarChart): famílias com maior faturamento
- **Margem Média por Unidade** (BarChart horizontal): média de margem por unidade

Todos os gráficos usam `recharts` (ResponsiveContainer, AreaChart, BarChart) com o mesmo estilo visual do MeuPainel (cores, tooltips, grid).

**4. Manter tudo que já existe**
- Filtros (Unidade, Vendedor, Família, Marca) + busca textual + chips de filtro ativo
- Tabela paginada server-side com DataTable
- Parsing de valores BR no frontend

### Arquivos alterados
- `src/pages/Gerencial.tsx` — adicionar KPIs, gráficos e query completa

