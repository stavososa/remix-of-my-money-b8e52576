

## Plano: Mover processamento para Supabase RPC

### Problema
Hoje o Gerencial baixa **20.000+ registros** da tabela `vendas` para o navegador e faz todo o processamento (parsing de valores BR, mapeamento vendedor→unidade, agregação de KPIs, gráficos, filtragem) no cliente. Isso é lento e pesado.

### Solução
Criar **2 funções RPC no Supabase** que fazem toda a agregação no servidor e retornam apenas o necessário. O frontend passará os filtros como parâmetros.

---

### 1. Função auxiliar PostgreSQL: `parse_brl`
Converte strings como `"R$ 15.432,40"` e `"49,30%"` para numeric diretamente no banco:
```sql
CREATE FUNCTION parse_brl(val text) RETURNS numeric AS $$
  SELECT COALESCE(
    NULLIF(regexp_replace(regexp_replace(val, '[R$\s%]', '', 'g'), '\.(?=\d{3})', '', 'g'), '')::numeric,
    0
  );
$$ LANGUAGE sql IMMUTABLE;
```
(Troca pontos de milhar, vírgula decimal → ponto, remove R$, %, espaços)

### 2. Função RPC: `rpc_gerencial_resumo`
**Parâmetros**: `p_ano`, `p_mes`, `p_vendedor` (opcional), `p_familia` (opcional), `p_marca` (opcional), `p_unidade` (opcional)

**Retorna JSON** com:
- **KPIs**: faturamento, lucro, margem média ponderada, qtd vendas, qtd vendedores únicos
- **Dados diários**: array `[{data, faturamento_dia, lucro_dia, acumulado}]` para o AreaChart
- **Top 10 famílias**: `[{name, total}]`
- **Top 10 marcas**: `[{name, total}]`
- **Listas de filtros disponíveis**: vendedores, unidades, famílias, marcas únicos do período

A função faz JOIN com `controle_pj` para resolver vendedor→unidade internamente.

### 3. Função RPC: `rpc_gerencial_vendas`
**Parâmetros**: mesmos filtros + `p_offset`, `p_limit` (30), `p_search` (texto de busca)

**Retorna**: as linhas paginadas (30 por vez) + `total_count` para controle de paginação. A busca textual usa `ILIKE` no servidor.

### 4. Refatorar `src/pages/Gerencial.tsx`
- Remover `fetchVendasByPeriod` (download de 20k+ linhas)
- Remover todo processamento client-side (`vendasProcessadas`, `vendasFiltradas`, `kpis`, `chartProgresso`, `chartFamilias`, `chartMarcas`)
- Substituir por 2 queries:
  - `supabase.rpc('rpc_gerencial_resumo', {filtros...})` → alimenta KPIs + gráficos + listas de filtro
  - `supabase.rpc('rpc_gerencial_vendas', {filtros..., offset, limit, search})` → alimenta tabela paginada
- Filtros passam como parâmetros da RPC (server-side)
- Paginação e busca da tabela são server-side

### 5. Atualizar `src/components/DataTable.tsx`
- Adicionar modo **server-side pagination**: props `totalCount`, `currentPage`, `onPageChange` como alternativa à paginação client-side atual

### Resultado esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Dados transferidos | 20.000+ linhas (~2MB) | 30 linhas + 2KB JSON |
| Requests | 20+ paginadas | 2 RPCs |
| Tempo de carregamento | ~10s | < 1s |
| Mudança de filtro | Reprocessa 20k no JS | Nova RPC ~100ms |

### Arquivos alterados
- **Nova migration SQL**: `parse_brl`, `rpc_gerencial_resumo`, `rpc_gerencial_vendas`
- **`src/pages/Gerencial.tsx`**: refatoração completa do data-fetching
- **`src/components/DataTable.tsx`**: suporte a paginação server-side

