

## Adicionar família "OUTROS" como canal externo / não-comissionável

### Comportamento desejado
Uma venda passa a ser "canal externo" se **qualquer uma** for verdadeira:
1. `vendedor_nome` casa com os regex existentes em `PADROES_CANAIS_EXTERNOS` (iFood, Shopee, AVARIA, BONIFICAÇÃO, etc).
2. **NOVO:** `familia_produto` é igual a `OUTROS` (case-insensitive, com trim).

### Mudanças

**1. `src/lib/canaisExternos.ts`**
- Nova assinatura:
  ```ts
  isCanalExterno(vendedorNome, familiaProduto?)
  ```
  Descrição opcional → mantém compatibilidade. Se `familiaProduto?.trim().toUpperCase() === 'OUTROS'`, retorna `true`.
- Adicionar entrada no `PADROES_CANAIS_EXTERNOS_LABEL`: `'Família OUTROS (não-comissionável)'`.

**2. Call sites de `isCanalExterno`** (localizar com `rg "isCanalExterno"`)
Atualizar para passar `familia_produto`. Páginas prováveis: `Gerencial.tsx`, `RankingComissoes.tsx`, `Ranking.tsx`, `MeuPainel.tsx`, e `src/debug/auditNomesNovaIguacu.ts`. Garantir que cada `.select(...)` traga `familia_produto` (a maioria já traz).

**3. `src/debug/auditNomesNovaIguacu.ts`**
Passar `familia_produto` na chamada de `isCanalExterno` — linhas com família `OUTROS` passam a ser classificadas como `CANAL_EXTERNO` no audit.

### Onde NÃO mexo
- Não altero o RPC SQL (`sql/rpc_gerencial.sql`) — filtro continua client-side.
- Não altero o motor de comissão (`resolverRegra.ts`) — ele tem suas próprias exclusões.
- Não toco em KPIs, layout, nem na regra antiga de `%` na descrição (já desfeita).

### Risco
- Se houver produto **legítimo** classificado como família `OUTROS` (ex.: itens novos ainda sem família atribuída), eles serão excluídos de KPIs e rankings. Vale revisar antes se isso é o comportamento desejado pra **toda** a aplicação ou se você prefere limitar só ao painel Gerencial.

### Arquivos editados
- `src/lib/canaisExternos.ts`
- `src/debug/auditNomesNovaIguacu.ts`
- Páginas que chamam `isCanalExterno` (a confirmar via busca na implementação).

