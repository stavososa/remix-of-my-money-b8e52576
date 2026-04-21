

## Adicionar exclusão: famílias OUTROS / ATACADO **com `%` na descrição**

### Regra
Tratar como **canal externo / não-comissionável** uma linha quando **TODAS** forem verdadeiras:
1. `familia_produto` é `OUTROS` **ou** `ATACADO` (case/trim-insensitive).
2. `descricao_produto` contém um padrão de porcentagem (ex.: `4%`, `7%`, `10%`, `12,5%`, `3.5 %`).

Regex de %: `/\d+([.,]\d+)?\s*%/`

Continua valendo a regra antiga: `vendedor_nome` casando com `PADROES_CANAIS_EXTERNOS` também marca como canal externo. As duas regras são **OR** entre si (linha é canal externo se qualquer uma valer); **dentro** da regra nova, família e `%` são **AND**.

### Mudanças

**1. `src/lib/canaisExternos.ts`**
- Adicionar:
  - `PADRAO_DESCRICAO_PERCENTUAL = /\d+([.,]\d+)?\s*%/`
  - `FAMILIAS_CANAL_EXTERNO_COM_PCT = new Set(['OUTROS', 'ATACADO'])`
- Nova assinatura:
  ```ts
  isCanalExterno(
    vendedorNome?: string | null,
    descricaoProduto?: string | null,
    familiaProduto?: string | null,
  ): boolean
  ```
  Retorna `true` se:
  - vendedor casa com `PADROES_CANAIS_EXTERNOS`, **ou**
  - `familia ∈ {OUTROS, ATACADO}` **e** `descricao` casa com `PADRAO_DESCRICAO_PERCENTUAL`.
- Manter parâmetros opcionais → call sites antigos continuam compilando (só perdem a regra nova até serem atualizados).
- Adicionar label: `'Famílias OUTROS/ATACADO com % na descrição (taxas)'`.

**2. Call sites**
Localizar com `rg "isCanalExterno"` e atualizar cada chamada para passar `(vendedor_nome, descricao_produto, familia_produto)`. Provável: `Gerencial.tsx`, `RankingComissoes.tsx`, `Ranking.tsx`, `MeuPainel.tsx`, `auditNomesNovaIguacu.ts`. Garantir que o `.select(...)` da query Supabase já traz `descricao_produto` e `familia_produto`; adicionar onde faltar.

**3. `src/debug/auditNomesNovaIguacu.ts`**
- Incluir `descricao_produto` e `familia_produto` no `select`.
- Passar os 3 args na classificação.

### Onde NÃO mexo
- RPC SQL (`sql/rpc_gerencial.sql`) — filtro segue client-side.
- Motor de comissão (`resolverRegra.ts`) — exclusões próprias permanecem.
- KPIs e layout.

### Risco
Regex amplo (`\d+%`) restrito às famílias OUTROS/ATACADO reduz falso-positivo (não pega `WHEY 100%` se ele estiver em outra família). Se mesmo dentro de OUTROS/ATACADO houver produto legítimo com `%`, refinamos depois exigindo palavras-chave (`TAXA|REPASSE|COMISS`).

### Arquivos
- `src/lib/canaisExternos.ts`
- `src/debug/auditNomesNovaIguacu.ts`
- Páginas que chamam `isCanalExterno` (a confirmar na implementação).

