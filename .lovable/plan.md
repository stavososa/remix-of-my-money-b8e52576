

## Plano: Mapear Filial via CNPJ (unidades ↔ vendas)

### Situação Atual
O mapeamento de filial é feito indiretamente: `controle_pj.nome_vendas` → `vendas.vendedor_nome` → `controle_pj.unidade` (string). Isso é frágil e depende de match de nomes.

### Nova Abordagem
Usar o relacionamento direto por CNPJ:
- `vendas.cnpj_empresa` ↔ `unidades.cnpj` → `unidades.nome` (nome da filial)

### Problema: Tipos Desatualizados
A tabela `unidades` no arquivo de tipos gerado (`types.ts`) **não possui a coluna `cnpj`**. É necessário regenerar os tipos do Supabase para que a coluna fique disponível no cliente.

### Alterações

**1. Regenerar tipos Supabase** para incluir `unidades.cnpj` em `src/integrations/supabase/types.ts`.

**2. `src/pages/Gerencial.tsx`** — Substituir a lógica de mapeamento:

- **Query**: Carregar `unidades` (cnpj, nome) no lugar de depender apenas de `controle_pj`:
  ```typescript
  const { data: unidadesData } = useQuery({
    queryKey: ['unidades-cnpj'],
    queryFn: async () => {
      const { data } = await supabase.from('unidades').select('cnpj, nome');
      return data ?? [];
    },
  });
  ```

- **Mapa CNPJ→Nome**: Substituir `vendedorUnidadeMap` por um mapa baseado em CNPJ:
  ```typescript
  const cnpjFilialMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of unidadesData ?? []) {
      if (u.cnpj) map.set(u.cnpj.trim(), u.nome);
    }
    return map;
  }, [unidadesData]);
  ```

- **Função getFilial**: Substituir `getUnidade(vendedor_nome)` por uma função que recebe o CNPJ da venda:
  ```typescript
  const getFilial = (cnpjEmpresa: string | null): string => {
    if (!cnpjEmpresa) return 'Sem Filial';
    return cnpjFilialMap.get(cnpjEmpresa.trim()) ?? 'Sem Filial';
  };
  ```

- **Query allVendas**: Adicionar `cnpj_empresa` ao `select`:
  ```typescript
  .select('data_emissao, vendedor_nome, total_com_desconto, lucros_reais, margem_percentual, familia_produto, marca, nota_fiscal, cnpj_empresa')
  ```

- **Filtros e opções**: Atualizar para usar `getFilial(row.cnpj_empresa)` em vez de `getUnidade(row.vendedor_nome)`.

- **Tabela paginada (server-side)**: Ajustar a query de detalhes para também trazer `cnpj_empresa` e exibir o nome da filial via o mapa.

**3. `src/pages/Ranking.tsx`** — Aplicar a mesma lógica se a coluna filial for exibida lá.

### Resumo
Uma alteração principal em `Gerencial.tsx`: trocar o mapeamento por nome de vendedor para mapeamento direto por CNPJ, que é mais confiável e preciso.

