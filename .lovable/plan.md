

## Plano: Filtro de Filial por CNPJ (unidades.cnpj ↔ vendas.cnpj_empresa)

### Situação atual
- A tabela `unidades` **já possui** a coluna `cnpj` com dados preenchidos (ex: RECREIO = `44.578.137/0011-75`)
- A tabela `vendas` possui `cnpj_empresa`
- O código atual usa `controle_pj` + matching por nome de vendedor — abordagem frágil

### Nova abordagem
Parear `vendas.cnpj_empresa` com `unidades.cnpj` diretamente. Sem intermediários.

### Alterações

**1. Atualizar types.ts** — Regenerar tipos para incluir `cnpj` na tabela `unidades` (adicionar `cnpj: string | null` ao Row/Insert/Update)

**2. Refatorar `src/pages/Gerencial.tsx`**

- **Remover**: query `controle-pj-filial`, `vendedorFilialMap`, `getFilial` (baseado em nomes), `getVendedoresByFilial`

- **Adicionar**: query para `unidades` buscando `nome, cnpj`:
```ts
const { data: unidadesList } = useQuery({
  queryKey: ['unidades-cnpj'],
  queryFn: async () => {
    const { data } = await supabase.from('unidades').select('nome, cnpj');
    return data ?? [];
  },
  staleTime: Infinity,
});
```

- **Novo `cnpjFilialMap`**: `Map<string, string>` onde chave = cnpj normalizado, valor = nome da unidade

- **Novo `getFilial(cnpj_empresa)`**: lookup direto pelo CNPJ da venda:
```ts
const getFilial = (cnpj: string | null) => {
  if (!cnpj) return 'Sem Filial';
  return cnpjFilialMap.get(cnpj.trim()) ?? 'Sem Filial';
};
```

- **`filteredAll`**: trocar `getFilial(row.vendedor_nome)` por `getFilial(row.cnpj_empresa)`

- **`filterOptions.unidades`**: extrair dos dados de `unidadesList` em vez de iterar vendas

- **Filtro server-side (tabela paginada)**: quando `filtroUnidade !== 'all'`, buscar os CNPJs da filial e usar `.in('cnpj_empresa', cnpjs)` — direto, sem mapear por vendedor

- **`mappedRows`** na tabela detalhada: `unidade_nome = getFilial(row.cnpj_empresa)`

### Nenhuma migration necessária
A coluna `cnpj` já existe no banco. Só precisa atualizar o type no código.

### Resultado
- Filtro por filial 100% confiável via CNPJ
- Sem dependência de nomes de vendedores
- RECREIO e todas as outras filiais funcionam automaticamente

