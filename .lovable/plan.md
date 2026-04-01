

## Plano: Garantir que o dashboard só exiba dados quando tudo estiver carregado

### Problema
Atualmente `isBusy = loadAll || fetchingAll` — não considera se `unidadesList` (filiais) já carregou. Se as unidades ainda não carregaram, o mapeamento CNPJ→Filial fica vazio e os dados podem aparecer incorretos momentaneamente.

### Alteração em `src/pages/Gerencial.tsx`

**1. Capturar estado de loading das unidades:**
```ts
const { data: unidadesList, isLoading: loadUnidades } = useQuery({ ... });
```

**2. Expandir `isBusy` para incluir unidades:**
```ts
const isBusy = loadAll || fetchingAll || loadUnidades || !unidadesList;
```

**3. Proteger o gráfico e a tabela:** Além dos KPIs (que já mostram '—'), garantir que o gráfico e a contagem de registros da tabela também respeitem `isBusy` — já está feito com o overlay de spinner no gráfico. Adicionar proteção na contagem de vendas detalhadas para não mostrar "0 registros" durante carregamento.

### Resultado
- KPIs mostram '—' até vendas + unidades carregarem
- Gráfico mostra spinner até tudo resolver
- Notas Fiscais só exibe o número final correto (8794 para fev, 6522 para mar)
- Nenhum "flickering" de dados parciais

