

## Plano: Corrigir contagem de Notas Fiscais para corresponder aos valores reais

### Problema

A contagem atual usa chave composta `nota_fiscal + cnpj_empresa`, o que infla o número (a mesma NF aparece em CNPJs diferentes e é contada múltiplas vezes). O resultado correto do banco é:
- **2026-02**: 8.794 notas únicas
- **2026-03**: 6.522 notas únicas

### Alteração

**`src/pages/Gerencial.tsx`** — linha 211-216

Mudar o `Set` para contar apenas `nota_fiscal` (sem `cnpj_empresa`):

```typescript
const totalNotas = useMemo(() => {
  const set = new Set<string>();
  for (const row of filteredAll) {
    if (row.nota_fiscal && row.nota_fiscal.trim() !== '') {
      set.add(row.nota_fiscal.trim());
    }
  }
  return set.size;
}, [filteredAll]);
```

Isso alinha a contagem com a query SQL do usuário (`SELECT DISTINCT nota_fiscal`).

### Escopo
Uma única mudança de ~5 linhas em um arquivo.

