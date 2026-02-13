

## Adicionar Secao "Produtos Mais Vendidos"

### O que sera feito

Criar uma nova secao no painel que exibe os **10 produtos mais vendidos**, com botao "Ver mais" para expandir a lista completa -- seguindo o mesmo padrao ja usado na tabela de detalhamento.

### Posicionamento

A secao ficara entre o grafico "Vendas por Dia" e o "Detalhamento de Vendas":

```text
...
6. Grafico Vendas por Dia (BarChart)
7. **Produtos Mais Vendidos (NOVO)** -- limitado a 10 + "Ver mais"
8. Detalhamento de Vendas (tabela limitada a 10 + "Ver mais")
9. Ranking Geral de Vendas PJ
```

### Detalhes Tecnicos

**Arquivo**: `src/pages/MeuPainel.tsx`

1. **Novo estado**: `const [showAllProdutos, setShowAllProdutos] = useState(false)`

2. **Agregacao de produtos**: A partir de `vendasSource` (que ja contem todas as vendas para admin ou individuais para vendedor), agrupar por `descricao_produto`:
   - Contar quantidade de ocorrencias (vezes vendido)
   - Somar `total_com_desconto` (valor total arrecadado)
   - Somar `quantidade` (unidades vendidas)
   - Ordenar por quantidade de ocorrencias (mais vendido primeiro)

3. **Tabela com colunas**:
   - Posicao (#)
   - Produto (nome)
   - Marca
   - Qtd Vendida (soma das quantidades)
   - Total Arrecadado (soma dos valores)

4. **Limitacao**: Mostrar apenas os 10 primeiros por padrao, com botao "Ver mais (X restantes)" / "Ver menos" identico ao ja existente na tabela de detalhamento.

5. **Icone**: Usar `ShoppingCart` (ja importado) no titulo da secao.

