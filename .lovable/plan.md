

## Plano: Simplificar Gerencial para Multifiltro

### Problema
As funções RPC (`parse_brl`, `rpc_gerencial_resumo`, `rpc_gerencial_vendas`) estão retornando números absurdos porque o parsing de valores BR no PostgreSQL está incorreto. O usuário quer apenas pesquisa com multifiltro, sem KPIs nem gráficos.

### Abordagem
Remover as RPCs completamente e consultar a tabela `vendas` diretamente via Supabase client com filtros server-side. Parsing de valores BR fica no frontend (já funciona em MeuPainel).

---

### 1. SQL para limpar (executar no Supabase SQL Editor)

```sql
DROP FUNCTION IF EXISTS rpc_gerencial_resumo(int, int, text, text, text, text);
DROP FUNCTION IF EXISTS rpc_gerencial_vendas(int, int, text, text, text, text, text, int, int);
DROP FUNCTION IF EXISTS parse_brl(text);
```

### 2. Reescrever `src/pages/Gerencial.tsx`

- Remover KPIs, gráficos (AreaChart, BarChart), imports de recharts
- Manter apenas: filtros (Unidade, Vendedor, Família, Marca) + busca textual + tabela paginada
- Consultar `vendas` direto com `supabase.from('vendas').select(...)`:
  - Filtros `.eq('vendedor_nome', ...)`, `.eq('familia_produto', ...)`, `.eq('marca', ...)` aplicados no servidor
  - Período via `.gte('data_emissao', startDate).lte('data_emissao', endDate)`
  - Busca textual via `.or(...)` com `ilike`
  - Paginação server-side via `.range(offset, offset + limit)`
  - `.order('data_emissao', { ascending: false })`
- Para filtro de **Unidade**: buscar `controle_pj` separadamente, montar mapa vendedor→unidade, e quando unidade selecionada, filtrar por `vendedor_nome.in(vendedores_da_unidade)` no servidor
- Para listas de filtros: buscar valores distintos de `vendedor_nome`, `familia_produto`, `marca` do período, e unidades do `controle_pj`
- Parsing de valores (total_com_desconto, lucros_reais, margem_percentual) feito no frontend com `parseMoneyBR` / `parsePctBR` (mesmo padrão do MeuPainel)

### 3. Manter `src/components/DataTable.tsx` como está
O suporte a `serverPagination` já existe e será reutilizado.

### Arquivos alterados
- `src/pages/Gerencial.tsx` — reescrita (sem KPIs/gráficos, consulta direta)
- SQL de limpeza — executar manualmente

### Resultado
- Números corretos (parsing no JS, já testado no MeuPainel)
- Filtros server-side performáticos
- Tabela paginada com busca
- Sem dependência de funções RPC

