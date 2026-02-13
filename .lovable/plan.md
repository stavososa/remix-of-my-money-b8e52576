

# Ajustar Limiares do Gauge "Seu Ticket vs Media"

## Contexto da Analise

Com base na analise estatistica feita anteriormente:
- A **media** das vendas gerais (R$ 46,62) e inflada por outliers (top 10% > R$ 100).
- A **mediana** real e R$ 36,00 -- ou seja, metade das vendas esta abaixo disso.
- 61% das vendas estao abaixo de R$ 40.
- O ticket do Lucas (R$ 25,04) representa ~53,7% da media, mas esta dentro da faixa mais comum de vendas (R$ 20-40).

Os limiares atuais (verde >= 100%, dourado >= 80%, vermelho < 80%) sao irrealistas porque a media e distorcida por valores extremos.

## Mudancas no arquivo `src/pages/MeuPainel.tsx`

### 1. Ajustar limiares na funcao `CircularGauge` (linha 55)

**Antes:**
```
value >= 100 ? verde : value >= 80 ? dourado : vermelho
```

**Depois:**
```
value >= 75 ? verde : value >= 50 ? dourado : vermelho
```

Justificativa:
- **Verde (>= 75%)**: Equivale a ~R$ 35, proximo da mediana real. O vendedor esta na metade superior da distribuicao.
- **Dourado (>= 50%)**: Equivale a ~R$ 23. O vendedor esta dentro do padrao normal de vendas.
- **Vermelho (< 50%)**: Abaixo de R$ 23, significativamente abaixo do padrao.

Com isso, Lucas (53,7%) passaria de **vermelho para dourado** -- refletindo que ele esta dentro do padrao, mas com espaco para melhorar.

### 2. Atualizar legendas do gauge (linhas 469-479)

Trocar os textos das legendas de cor:
- Verde: `>=75%`
- Dourado: `>=50%`
- Vermelho: `<50%`

### 3. Atualizar o clamp maximo do gauge (linha 52)

Manter o clamp em 150 para permitir que vendedores acima da media tenham o arco completo e um pouco alem.

## Resultado

O gauge vai refletir a realidade estatistica da distribuicao de vendas, sem penalizar vendedores que estao dentro da faixa normal so porque a media e puxada por outliers.

