

## Plano: Mapear Filial via `controle_pj` (nome_vendas → unidade)

### Problema Atual
A query `unidades.cnpj` retorna erro 400 porque a coluna `cnpj` não existe na tabela `unidades`. O mapeamento de filial está quebrado.

### Nova Lógica
Usar a tabela `controle_pj` como ponte:
- `vendas.vendedor_nome` ↔ `controle_pj.nome_vendas` → `controle_pj.unidade` (nome da filial)

### Alterações em `src/pages/Gerencial.tsx`

1. **Substituir query `unidades-cnpj`** por query em `controle_pj` buscando `nome_vendas, unidade`:
   ```typescript
   const { data: controlePjData } = useQuery({
     queryKey: ['controle-pj-filial'],
     queryFn: async () => {
       const { data } = await supabase.from('controle_pj').select('nome_vendas, unidade');
       return data ?? [];
     },
   });
   ```

2. **Substituir `cnpjFilialMap`** por `vendedorFilialMap` (Map de `nome_vendas` → `unidade`):
   ```typescript
   const vendedorFilialMap = useMemo(() => {
     const map = new Map<string, string>();
     for (const row of controlePjData ?? []) {
       if (row.nome_vendas && row.unidade) map.set(row.nome_vendas.trim(), row.unidade);
     }
     return map;
   }, [controlePjData]);
   ```

3. **Substituir `getFilial(cnpj_empresa)`** por `getFilial(vendedor_nome)`:
   ```typescript
   const getFilial = (vendedorNome: string | null | undefined): string => {
     if (!vendedorNome) return 'Sem Filial';
     return vendedorFilialMap.get(vendedorNome.trim()) ?? 'Sem Filial';
   };
   ```

4. **Atualizar todos os usos**: trocar `getFilial(row.cnpj_empresa)` por `getFilial(row.vendedor_nome)` nos filtros, KPIs, opções e tabela.

5. **Filtro server-side da tabela**: Em vez de filtrar por `cnpj_empresa`, buscar todos os `nome_vendas` da filial selecionada e filtrar por `vendedor_nome.in(nomes)`.

6. **Remover `cnpj_empresa`** do select das queries (não é mais necessário para o mapeamento).

### Alterações em `src/pages/MeuPainel.tsx`
Aplicar a mesma lógica: usar `controle_pj` para mapear `vendedor_nome` → filial no filtro de filial do dashboard admin.

