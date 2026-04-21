

## Adicionar exclusão de produtos com "%" na descrição (taxas de cartão / canais externos)

### Contexto
Hoje `src/lib/canaisExternos.ts` filtra apenas pelo `vendedor_nome` (iFood, Mercado Livre, AVARIA, BONIFICAÇÃO, etc). Você quer que também sejam tratadas como "canal externo / não-comissionável" as linhas cuja `descricao_produto` contenha um percentual (ex.: `TAXA IFOOD 12%`, `REPASSE SHOPEE 7%`, `TAXA CARTÃO 4%`) — tipicamente taxas de marketplaces e adquirentes que aparecem como item da nota.

### Comportamento desejado
Uma venda é "canal externo" se **qualquer uma** for verdadeira:
1. `vendedor_nome` casa com os regex já existentes em `PADROES_CANAIS_EXTERNOS`.
2. **NOVO:** `descricao_produto` contém um padrão de porcentagem (ex.: `4%`, `10%`, `12,5%`, `7 %`).

Regex proposto para o item 2:
```
/\d+([.,]\d+)?\s*%/
```
Casa: `4%`, `10%`, `12,5%`, `7 %`, `TAXA 3.5%`. Não casa: textos sem dígito antes do `%` (improvável em descrição real).

### Mudanças

**1. `src/lib/canaisExternos.ts`**
- Adicionar constante `PADRAO_DESCRICAO_PERCENTUAL = /\d+([.,]\d+)?\s*%/`.
- Trocar a assinatura de `isCanalExterno` para aceitar também a descrição:
  ```ts
  isCanalExterno(vendedorNome, descricaoProduto?)
  ```
  Mantém compatibilidade (descrição opcional). Se a descrição for passada e casar com o regex de %, retorna `true`.
- Adicionar entrada no `PADROES_CANAIS_EXTERNOS_LABEL`: `"Produtos com % na descrição (ex: TAXA 4%, 10%)"`.

**2. Ajustar todos os call sites de `isCanalExterno`**
Passar `descricao_produto` junto. Vou localizar com `rg "isCanalExterno"` e atualizar cada chamada (provavelmente em `Gerencial.tsx`, `RankingComissoes.tsx`, `Ranking.tsx`, `MeuPainel.tsx`, e o debug `auditNomesNovaIguacu.ts`). Em cada um, garantir que o `select` já traz `descricao_produto` (a maioria já traz; onde não trouxer, adicionar ao `.select(...)`).

**3. `src/debug/auditNomesNovaIguacu.ts`**
Atualizar para usar a nova assinatura — passa a classificar também como `CANAL_EXTERNO` linhas com `%` na descrição, mesmo que o `vendedor_nome` seja "estranho".

### Onde NÃO mexo
- Não altero o RPC SQL (`sql/rpc_gerencial.sql`) — o filtro continua client-side, consistente com o padrão atual.
- Não altero o motor de comissão (`resolverRegra.ts`) — ele já tem suas próprias exclusões em `base-comissionavel-e-exclusoes`. Se quiser estender lá também, é outro passo (me avisa).
- Não toco em KPIs nem em layout.

### Risco / observações
- Se houver produto **legítimo** cuja descrição contenha `%` (ex.: `LEITE 0% LACTOSE`, `WHEY 100%`), ele será excluído indevidamente. Se isso for um problema, a gente refina o regex pra exigir contexto (ex.: palavras `TAXA|REPASSE|COMISS|IFOOD|SHOPEE` próximas do `%`). **Pergunta implícita:** posso seguir com o regex amplo (`\d+%`) ou prefere uma versão mais conservadora exigindo palavra-chave junto?

### Arquivos editados
- `src/lib/canaisExternos.ts`
- `src/debug/auditNomesNovaIguacu.ts`
- Páginas que chamam `isCanalExterno` (a confirmar via busca no momento da implementação).

