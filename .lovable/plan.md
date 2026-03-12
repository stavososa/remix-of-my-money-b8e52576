

## Problema

O período selecionado é **Março/2026**, mas a view `v_ranking` e a tabela `vendas` não têm dados para esse mês. Por isso todas as abas mostram "Nenhum dado encontrado" e KPIs zerados.

## Solução: Autoajustar período para o último mês com dados

### Alteração 1: `src/contexts/PeriodContext.tsx`

- Ao inicializar, consultar a tabela `vendas` para descobrir o `MAX(data_emissao)` existente
- Extrair mês/ano dessa data e usá-la como período inicial (ao invés de `new Date()`)
- Enquanto a consulta carrega, manter um estado `loading` para evitar queries com período incorreto

### Alteração 2: `src/components/PeriodFilter.tsx`

- Nenhuma alteração estrutural necessária — o componente já reflete o estado do contexto

### Alteração 3: `src/pages/Ranking.tsx` (e outras páginas)

- Nenhuma alteração necessária — as queries já usam `periodoAno`/`periodoMes` do contexto

### Detalhes técnicos

```typescript
// PeriodContext.tsx — nova lógica de inicialização
useEffect(() => {
  supabase
    .from('vendas')
    .select('data_emissao')
    .order('data_emissao', { ascending: false })
    .limit(1)
    .then(({ data }) => {
      if (data?.[0]?.data_emissao) {
        const d = new Date(data[0].data_emissao);
        setAno(d.getFullYear());
        setMes(d.getMonth() + 1);
      }
    });
}, []);
```

Isso garante que, ao abrir o app, o período já aponta para o mês mais recente com vendas registradas, eliminando a tela vazia.

