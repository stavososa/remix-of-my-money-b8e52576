

## Plano: Converter margens de decimal para percentual (×100)

### Problema
Os valores de `margem_percentual` no banco estão em formato decimal (ex: `0,60` = 60%), mas o `parsePctBR` retorna o valor cru (0.6), que é formatado como "0.6%" em vez de "60%".

### Solução
Multiplicar por 100 o resultado do `parsePctBR` em ambos os arquivos. Como os valores estão consistentemente em formato decimal (0.xx), basta adicionar `* 100` após o parse.

### Alterações

**`src/pages/Gerencial.tsx` (linha 33)**
- `parsePctBR`: retornar `val * 100` em vez de `val`

**`src/pages/MeuPainel.tsx` (linha 35)**
- `parsePctBR`: mesma alteração, retornar `val * 100`

### Impacto
- KPI "Margem Média" no Gerencial e MeuPainel: ex. 0.6% → 60%
- Coluna "Margem %" na tabela de vendas detalhadas
- Gauge de margem no MeuPainel (admin)
- Cálculo ponderado de margem (funciona corretamente pois tanto numerador quanto denominador escalam proporcionalmente)

