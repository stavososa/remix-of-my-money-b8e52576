

## Plano: Unificar Top Rankings na aba Vendedores + Criar abas Marcas e Famílias

### O que muda

1. **Aba Vendedores** — Adicionar os 4 gráficos Top 10 (Vendedores, Produtos, Marcas, Famílias) abaixo da tabela de vendedores, usando a mesma identidade visual.

2. **Nova aba Marcas** — Mesma estrutura da aba Produtos: KPIs (Total Vendido, Qtd Marcas) + tabela ranking de marcas com medalhas no Top 3, cards mobile.

3. **Nova aba Famílias** — Mesma estrutura: KPIs + tabela ranking de famílias com medalhas no Top 3, cards mobile.

4. **Remover aba "Top Rankings"** — O conteúdo dos gráficos foi movido para dentro da aba Vendedores, tornando a aba separada desnecessária.

5. **Adicionar Top Produtos** ao `useMemo` de charts (agrupar por `descricao_produto`, top 10 por faturamento).

### Estrutura final das abas
```text
Rankings
├── Vendedores  (KPIs + tabela + 4 gráficos Top 10)
├── Produtos    (KPIs + tabela — já existe)
├── Marcas      (KPIs + tabela ranking)
└── Famílias    (KPIs + tabela ranking)
```

### Arquivo alterado
- `src/pages/Ranking.tsx`

