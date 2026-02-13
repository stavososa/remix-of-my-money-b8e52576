

## Reorganizacao do Painel Admin

### Mudancas Solicitadas

1. **Mover o Ranking de Vendedores para o final da pagina**
2. **Limitar a tabela de produtos a 10 itens** com botao "Ver mais" que expande progressivamente
3. **Restaurar os graficos do painel de vendedor** (Media Geral, Comparativo Ticket, Gauge) mas usando dados gerais/agregados da empresa

### Nova Ordem dos Blocos (Admin)

```text
1. Header (Painel Administrativo + mini KPIs)
2. KPI Cards (4 cards principais)
3. Media Geral de Vendas (3 cards: Total Geral, Ticket Medio, Qtd Itens)
4. Comparativo + Gauge (Ticket Medio vs Media, sem "Voce vs" - perspectiva geral)
5. Grafico Vendas da Empresa (LineChart cronologico)
6. Grafico Vendas por Dia (BarChart)
7. Detalhamento de Vendas (tabela limitada a 10 linhas + botao "Ver mais")
8. Ranking Geral de Vendas PJ (movido para o final)
```

### Detalhes Tecnicos

**Arquivo**: `src/pages/MeuPainel.tsx`

#### 1. Tabela com limite de 10 e "Ver mais"
- Adicionar estado `const [showAllVendas, setShowAllVendas] = useState(false)`
- Filtrar `vendasTableData` para mostrar apenas os 10 primeiros quando `showAllVendas === false`
- Renderizar botao "Ver mais (X restantes)" abaixo da tabela que faz `setShowAllVendas(true)`
- Quando expandido, mostrar botao "Ver menos" para recolher

#### 2. Mover Ranking para baixo
- Mover o bloco JSX do ranking (linhas 421-461) para depois da tabela de detalhamento

#### 3. Restaurar graficos com dados gerais
- Para admin, exibir os mesmos 3 cards de "Media Geral de Vendas" (Total Geral Vendido, Ticket Medio Geral, Qtd Total de Itens) que ja existem no modo vendedor
- Remover o condicional `{isAdmin ? ... : ...}` na secao dos cards de comparativo, e mostrar ambos os blocos para admin tambem (removendo referencias pessoais como "Seu Ticket" e ajustando labels para perspectiva geral)
- O Gauge mostrara a margem media geral da empresa
- O comparativo mostrara o ticket medio geral vs mediana como referencia

