

## Plano: Corrigir dropdowns de famílias, marcas e vendedores para gerentes

### Problema
1. **Limite de 1000 linhas**: As queries `supabase.from('vendas').select('marca')` etc. retornam no máximo 1000 registros (limite padrão do Supabase). Como não fazem `DISTINCT` no servidor, muitas famílias/marcas/vendedores são perdidos após a deduplicação no cliente.
2. **Filtros removendo valores**: Linhas 179-180 filtram `'Outros'` e `'Sem Marca'`, removendo opções válidas do dropdown.

### Solução

#### Arquivo: `src/pages/Gerencial.tsx`

1. **Paginação para buscar TODOS os valores**: Substituir as 3 queries simples por uma função que pagina automaticamente (loop de 1000 em 1000) até esgotar os dados, garantindo que todos os vendedores, famílias e marcas da filial sejam retornados.

2. **Remover filtros de exclusão**: Retirar `.filter(f => f !== 'Outros')` e `.filter(m => m !== 'Sem Marca')` das linhas 179-180 para que todas as opções apareçam nos dropdowns.

3. **Manter lógica existente intacta**: Vendedores, famílias e marcas continuam filtrados por `gerenteCnpjs` (filial Matriz). Apenas vendedores são independentes de data (já implementado). Famílias e marcas também já são independentes de data.

### Detalhe técnico

A função de paginação:
```typescript
async function fetchAllDistinct(column: string, cnpjs: string[]) {
  const pageSize = 1000;
  const all = new Set<string>();
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('vendas')
      .select(column)
      .in('cnpj_empresa', cnpjs)
      .not(column, 'is', null)
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    data.forEach(r => all.add(r[column]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return [...all].sort();
}
```

Apenas 1 arquivo modificado, sem alterações no banco.

