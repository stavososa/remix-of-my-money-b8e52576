
## Diferenças entre sua planilha (Matriz / Fevereiro) e a Plataforma

### Total da planilha
- **Faturamento:** R$ 481.481,62
- **Lucro:** R$ 262.541,10
- **Vendedores listados:** 22

### O que a plataforma faz diferente hoje (filial = Matriz, mês = Fev)

#### 1. Itens que o toggle "Ocultar canais externos" REMOVE (e portanto somem do KPI quando ativo)
Da sua planilha, estes nomes batem com `PADROES_CANAIS_EXTERNOS`:

| Vendedor planilha | Faturamento | Lucro | Padrão que captura |
|---|---|---|---|
| CHECK OUT | R$ 21.935,12 | R$ 7.175,27 | ❌ **NÃO captura** (não tem regex pra CHECKOUT) |
| check | R$ 17,98 | R$ 7,22 | ❌ **NÃO captura** |
| COMPRA VENDEDOR | R$ 2.760,08 | R$ 1.102,84 | ❌ **NÃO captura** |
| Devi PDV_01/02/04 | R$ 2.838,20 | R$ 1.458,97 | ❌ **NÃO captura** |
| OmieApp_01 | R$ 240,79 | R$ 240,79 | ❌ **NÃO captura** |
| VENDA OPERADOR LOGISTICA | R$ 57.923,20 | R$ 14.814,45 | ❌ **NÃO captura** |
| LUCIANE ATHANASIO SITE | R$ 12.432,39 | R$ 6.487,68 | ⚠️ regex `^SITE` exige começar com SITE → **NÃO captura** (termina em SITE) |
| WALLACE OLIVEIRA LOJA | R$ 76.207,57 | R$ 45.431,23 | ❌ não tem padrão `*LOJA` |

**Soma desses "operacionais/sistema" não-pessoa:** ~R$ 86.347 fat / ~R$ 25.040 lucro
(CHECK OUT + check + COMPRA VENDEDOR + Devi PDV + OmieApp + VENDA OPERADOR LOGISTICA)

#### 2. Duplicidade de cadastro (mesma pessoa, dois nomes)
- **LUCAS VILAR** (R$ 188,00) e **LUCAS VILLAR** (R$ 4.698,23) — provavelmente a mesma pessoa, grafia diferente. A plataforma trata como dois vendedores distintos no ranking/filtro.
- **WALLACE OLIVEIRA** (R$ 594,89) e **WALLACE OLIVEIRA LOJA** (R$ 76.207,57) — mesma pessoa em dois canais (PJ vs balcão da loja).
- **LUCIANE ATHANASIO SITE** — Luciane vendendo no site da Matriz.

#### 3. Por que o número da plataforma ≠ planilha mesmo sem toggle
A plataforma com toggle **DESLIGADO** deveria bater os R$ 481.481,62. Se não bate, são 3 causas prováveis:
- **Vínculo de filial por CNPJ**: a plataforma associa venda → Matriz pelo CNPJ em `controle_pj`. Se algum desses "vendedores" (Devi PDV, OmieApp, CHECK OUT, VENDA OPERADOR LOGISTICA) **não tem CNPJ mapeado pra Matriz**, eles caem em "Sem Unidade" e somem do filtro Matriz na plataforma — mas aparecem na sua planilha que provavelmente foi extraída direto do Omie por filial de origem da nota.
- **Vendas fracionadas**: a plataforma preserva linhas com quantidade decimal (intencional). Se a planilha foi exportada com agrupamento, números batem; se exportada bruta, idem. Geralmente não dá diferença em SOMA de valor, só em contagem.
- **Filtro de sanidade |margem| > 1000%**: a plataforma descarta vendas com margem absurda. Sua planilha bruta inclui tudo.

### O que vou te entregar (precisa aprovar)
Um diagnóstico real, não chute:

1. **Rodar query** no Supabase externo somando `total_com_desconto` e `lucros_reais` da Matriz em fevereiro/2025, agrupado por `vendedor_nome`, e comparar linha-a-linha com sua planilha.
2. Identificar exatamente:
   - Quais nomes a plataforma **não está vinculando** à Matriz (CNPJ não mapeado em `controle_pj`).
   - Quais valores divergem por causa do filtro de sanidade.
   - Quais nomes operacionais (CHECK OUT, COMPRA VENDEDOR, Devi PDV, OmieApp, VENDA OPERADOR LOGISTICA) deveriam entrar no `PADROES_CANAIS_EXTERNOS` — eles **claramente não são pessoas vendendo**.
3. Te devolver tabela comparativa: `Vendedor | Planilha | Plataforma (toggle off) | Plataforma (toggle on) | Diferença | Causa`.

### Recomendação de patch (separado, depois do diagnóstico)
Adicionar ao `PADROES_CANAIS_EXTERNOS` em `src/lib/canaisExternos.ts`:
- `/CHECK\s*OUT/i` (CHECK OUT, check)
- `/COMPRA\s*VENDEDOR/i`
- `/^Devi\s*PDV/i`
- `/^OmieApp/i`
- `/VENDA\s*OPERADOR\s*LOG[ÍI]STICA/i`
- `/RETIRADA\s*DIRETORIA/i` (apareceu na auditoria anterior)
- Trocar `/^\s*SITE\b/i` por `/(^|\s)SITE($|\s)/i` pra pegar também "LUCIANE ATHANASIO SITE"

**Fora de escopo agora:** mexer em `*LOJA` e `*DELIVERY` — ali tem pessoa real (WALLACE OLIVEIRA LOJA é vendedor de balcão). Esses ficam como estão até você decidir.

### Arquivos envolvidos
- Diagnóstico: query read-only no Supabase externo (sem alterar código).
- Patch (passo seguinte, se aprovar): `src/lib/canaisExternos.ts`.

