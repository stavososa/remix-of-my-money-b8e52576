
## Plano: Fazer as filiais aparecerem sempre no filtro do Gerencial

### Diagnóstico
O problema principal está em `src/pages/Gerencial.tsx` no bloco `filterOptions`.

Hoje a lógica faz isso:
- se `allVendas` ainda não carregou, retorna tudo vazio
- junto com isso, também zera `unidades`

Ou seja: mesmo que `unidadesList` já tenha trazido as filiais da tabela `unidades`, o dropdown de Filial continua vazio porque está indevidamente dependente de `allVendas`.

Além disso, há um ponto secundário:
- `src/integrations/supabase/types.ts` ainda não inclui `cnpj` na tabela `unidades`
- o código está usando `as any`, o que mascara o problema de tipagem

Também vale reforçar o pareamento:
- `unidades.cnpj` e `vendas.cnpj_empresa` devem ser comparados com normalização
- se um lado estiver com máscara e o outro sem, o filtro pode não funcionar corretamente após selecionar a filial

### O que será implementado

1. Ajustar `filterOptions` em `src/pages/Gerencial.tsx`
- remover a dependência que esvazia `unidades` quando `allVendas` não existe
- fazer as opções de Filial virem diretamente de `unidadesList`
- manter vendedores, famílias e marcas dependentes de `allVendas`

2. Separar melhor a origem dos filtros
- `Filial` = tabela `unidades`
- `Vendedor`, `Família`, `Marca` = tabela `vendas`

3. Normalizar CNPJ no mapeamento
- criar função de normalização para comparar apenas os dígitos
- aplicar no `cnpjFilialMap`
- aplicar no `getFilial`
- aplicar no helper `getCnpjsByFilial`, se necessário

4. Atualizar os tipos do Supabase
- incluir `cnpj: string | null` em `public.unidades` no arquivo `src/integrations/supabase/types.ts`
- remover a necessidade de `as any` nessa consulta

5. Melhorar o comportamento visual do filtro
- garantir que o select de Filial mostre as opções assim que `unidadesList` carregar
- mesmo se não houver vendas no período, as filiais ainda devem aparecer para seleção

### Resultado esperado
- o dropdown de Filial volta a listar os nomes da coluna `nome` da tabela `unidades`
- ao selecionar uma filial, o sistema filtra usando o vínculo correto:
  `unidades.cnpj ↔ vendas.cnpj_empresa`
- KPIs, gráfico e tabela detalhada passam a refletir somente a filial escolhida
- o filtro continua funcionando mesmo com CNPJ mascarado em um lado e limpo no outro

### Detalhes técnicos
Arquivos envolvidos:
- `src/pages/Gerencial.tsx`
- `src/integrations/supabase/types.ts`

Correção central:
```ts
const unidades = (unidadesList ?? [])
  .filter(u => u.cnpj)
  .map(u => u.nome)
  .sort();
```

Em vez de depender deste early return:
```ts
if (!allVendas) return { vendedores: [], unidades: [], familias: [], marcas: [] };
```

Ajuste esperado de estrutura:
```text
filterOptions
├─ unidades -> derivadas apenas de unidadesList
├─ vendedores -> derivados de allVendas
├─ familias -> derivados de allVendas
└─ marcas -> derivados de allVendas
```

Observação:
o erro de recursão infinita em `perfis` aparece no console, mas é outro problema e não é a causa principal deste dropdown vazio.
