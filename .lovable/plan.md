

## Excluir família ATACADO totalmente (sem exigir `%`)

### Regra final
Linha é **canal externo / não-comissionável** se **qualquer uma** for verdadeira:
1. `vendedor_nome` casa com `PADROES_CANAIS_EXTERNOS` (iFood, Shopee, AVARIA, etc.) — inalterado.
2. `familia_produto = OUTROS` **E** `descricao_produto` contém `%` — inalterado.
3. **NOVO:** `familia_produto = ATACADO` — exclusão total, independente da descrição.

### Mudanças

**`src/lib/canaisExternos.ts`**
- Adicionar constante:
  ```ts
  FAMILIAS_CANAL_EXTERNO_TOTAL = new Set(['ATACADO'])
  ```
- Manter `FAMILIAS_CANAL_EXTERNO_COM_PCT = new Set(['OUTROS'])` como está.
- Em `isCanalExterno(...)`, antes da checagem de OUTROS+%, adicionar:
  ```ts
  if (familia && FAMILIAS_CANAL_EXTERNO_TOTAL.has(familia)) return true;
  ```
- Em `PADROES_CANAIS_EXTERNOS_LABEL`, adicionar entrada: `'Família ATACADO (todos os itens)'`.

### Onde NÃO mexo
- Call sites (`Gerencial.tsx`, `auditNomesNovaIguacu.ts`) já passam `familia_produto` — nenhuma alteração necessária.
- RPC SQL, motor de comissão, KPIs, layout — intocados.

### Arquivo
- `src/lib/canaisExternos.ts` (única alteração)

