

## Plano: Garantir que dropdown de vendedores mostre apenas quem vendeu na Matriz

### Diagnóstico
O código atual tem um fallback problemático: enquanto a query `gerente-filter-options` (atemporal) carrega, o `filterOptions` cai na lógica da linha 329 que deriva vendedores do `allVendas` (filtrado por data). Isso pode momentaneamente mostrar dados inconsistentes. Além disso, não há garantia explícita de que o dropdown fique vazio durante o carregamento.

### Correção no arquivo `src/pages/Gerencial.tsx`

1. **Bloquear fallback para gerente**: No `filterOptions` memo, quando `isGerente` for true mas `gerenteFilterOpts` ainda não carregou, retornar listas vazias em vez de derivar de `allVendas`. Isso garante que o dropdown nunca mostre vendedores de fora da Matriz:

```typescript
if (isGerente) {
  return {
    vendedores: gerenteFilterOpts?.vendedores ?? [],
    familias: gerenteFilterOpts?.familias ?? [],
    marcas: gerenteFilterOpts?.marcas ?? [],
    unidades,
  };
}
```

2. **Sem outras alterações**: A query `fetchAllDistinct('vendedor_nome', gerenteCnpjs)` já busca apenas vendedores com registros na tabela `vendas` filtrados pelo CNPJ da Matriz, de forma independente da data. Apenas o fallback precisa ser corrigido.

