

## Plano: Redesign do Dashboard Gerencial

### Alteracoes em `src/pages/Gerencial.tsx`

**1. Remover cards de unidades**
- Remover toda a secao "Unidades que Mais Venderam" (cards com medalhas, linhas 362-391)
- Remover os graficos "Faturamento por Unidade" e "Margem Media por Unidade" (linhas 394-430)
- Remover o `dadosPorUnidade` useMemo (nao mais necessario)

**2. Remover filtros de Dia e Mes, mover filtros para cima a direita**
- Remover `filtroDia` e o dropdown de "Mes/Ano" da barra de filtros
- Manter filtros: Unidade, Vendedor, Familia, Marca, Produto
- Posicionar os selects ao lado do titulo "Gerencial" no topo, alinhados a direita (inline com o header)
- Remover a caixa de filtros separada, integrar no topo da pagina

**3. Tabela com scroll interno**
- Envolver a `DataTable` em um container com `max-h-[500px] overflow-y-auto` para scroll vertical interno
- Manter header da tabela sticky

**4. Grafico linear de progresso**
- Adicionar `LineChart` (recharts) mostrando faturamento diario ao longo do tempo
- Agregar `vendasFiltradas` por `data_emissao`, somando `total_com_desconto` por dia
- O grafico reage a todos os filtros selecionados
- Eixo X = datas, Eixo Y = faturamento acumulado ou diario

**5. Garantir todos os dados**
- Remover filtro de mes na query (ja feito) -- buscar TODOS os dados sem pre-filtro de mesAno
- Remover a logica de `vendasDoMes` que filtra por mes selecionado
- Os filterOptions sao calculados sobre TODAS as vendas (ou vendas filtradas em cascata)
- Isso garante que todos os meses, dias, familias, produtos e vendedores aparecam

### Arquivo alterado
- `src/pages/Gerencial.tsx` -- redesign completo da UI

