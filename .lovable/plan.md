

## Ajuste do Card "Margem Media Geral" para Admin

### Problema Atual

O gauge de "Margem Media Geral" usa dois calculos inadequados para visao administrativa:

1. **Media aritmetica simples** das margens individuais de cada linha de venda -- isso trata uma venda de R$10 igual a uma de R$10.000, distorcendo o resultado.
2. **Limiares do gauge** (>=80% verde, >=50% dourado, <50% vermelho) foram definidos para o comparativo individual "Ticket vs Media", nao para margem percentual real.

### Solucao

#### 1. Margem Ponderada por Receita (Weighted Margin)

Em vez de `media simples das margens`, calcular a margem ponderada pelo valor vendido de cada item:

```text
Margem Ponderada = (Soma dos Lucros Reais) / (Soma dos Totais Vendidos) x 100
```

Isso reflete a margem real da operacao, onde vendas maiores tem mais peso no resultado.

#### 2. Limiares Ajustados para Margem Agregada

Baseado nos dados reais (margens individuais entre 39-65%) e na logica de negocio existente:

- **Verde** (saudavel): >= 55%
- **Dourado** (atencao): >= 45%
- **Vermelho** (critico): < 45%

Esses valores sao ligeiramente inferiores aos individuais (60/50/50) porque a media da empresa naturalmente sofre pressao de itens com margem baixa.

### Detalhes Tecnicos

**Arquivo**: `src/pages/MeuPainel.tsx`

1. **Alterar o calculo de `margem`** (linha 325): para admin, usar margem ponderada:
   ```typescript
   const margemAdmin = vendasAgg.totalVendido > 0
     ? (vendasAgg.totalLucro / vendasAgg.totalVendido) * 100
     : 0;
   const margem = isAdmin ? margemAdmin : (meusDados?.margem_media ? Number(meusDados.margem_media) : vendasAgg.margemMedia);
   ```

2. **Criar um gauge especifico para admin** ou passar limiares personalizados. A abordagem mais simples: criar um `CircularGaugeAdmin` inline que usa os novos limiares (55/45) para definir a cor.

3. **Atualizar o bloco do gauge** (linhas 557-566): trocar `vendasAgg.margemMedia` por `margemAdmin` e ajustar a legenda dos limiares para refletir os novos valores (>=55%, >=45%, <45%).

4. **Atualizar a nota de rodape** para indicar "Margem ponderada por receita".

