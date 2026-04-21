

## Investigação: vendas de fevereiro (Nova Iguaçu) atribuídas a nomes "estranhos"

### Problema
Listar todos os `vendedor_nome` distintos em **fevereiro/2026**, filial **NOVA IGUAÇU**, que **não** estejam:
- Na lista oficial (13 nomes informados)
- Nem cobertos pelos padrões de canais externos (`src/lib/canaisExternos.ts`)

### Limitação técnica
O banco de dados real do app está em uma instância Supabase externa (`tdbuhbppxztuloncplqj`) que **não é acessível** pelas ferramentas `supabase--read_query` daqui (que apontam para `efgcrtsxpfqmqhajaurh`, vazio). Portanto preciso de uma das duas vias abaixo.

### Via A — Você roda esta query no SQL Editor do Supabase externo

```sql
WITH lista_oficial AS (
  SELECT UPPER(TRIM(nome)) AS nome FROM (VALUES
    ('BEATRIZ AGUIAR'),('CARLS HENRIQUE'),('CAROLINE LACERDA'),
    ('CHECK OUT VISTA ALEGRE'),('CHECKOUT NOVA IGUAÇU'),
    ('Devi PDV_01'),('Devi PDV_02'),('Devi PDV_03'),('Devi PDV_04'),
    ('KELLY ANNE'),('LUCAS VILLAR'),('LUIS FELIPE'),
    ('ORLANDO MARINHO'),('WALLACE OLIVEIRA')
  ) t(nome)
),
cnpj_ni AS (
  SELECT cnpj_empresa FROM unidades
  WHERE UPPER(nome) LIKE '%NOVA%IGUA%'
)
SELECT
  v.vendedor_nome,
  COUNT(*) AS qtd_linhas,
  COUNT(DISTINCT v.nota_fiscal) AS qtd_nfs,
  ROUND(SUM(v.total_com_desconto)::numeric, 2) AS faturamento,
  ROUND(SUM(v.lucros_reais)::numeric, 2) AS lucro
FROM vendas v
WHERE v.data_emissao BETWEEN '2026-02-01' AND '2026-02-28'
  AND v.cnpj_empresa IN (SELECT cnpj_empresa FROM cnpj_ni)
  AND UPPER(TRIM(v.vendedor_nome)) NOT IN (SELECT nome FROM lista_oficial)
  -- Exclui canais externos (mesmos regex do front)
  AND NOT (
    v.vendedor_nome ~* '\bIFOOD\b|MERCADO\s*LIVRE|\bSHOPEE\b|MAGAZINE\s*LUIZA|\bMAGALU\b|LOJA\s*INTEGRADA|TIK\s*TOK|TIKTOK'
    OR v.vendedor_nome ~* '^\s*SITE\b|\bAVARIA\b|BONIFICA[ÇC][ÃA]O|\bBRINDES?\b|DEGUSTA[ÇC][ÃA]O|PROMOTOR|PARCERIA|\bCOLLAB\b|INFLUENCER|\bRESGATE\b'
  )
GROUP BY v.vendedor_nome
ORDER BY faturamento DESC NULLS LAST;
```

Cola o resultado no chat e eu interpreto (quais são erros de digitação dos oficiais, quais são canais externos novos a adicionar no regex, quais são realmente pessoas faltando na lista).

### Via B — Eu te entrego um script TS executável no app

Crio um arquivo temporário `src/debug/auditNomesNovaIguacu.ts` que:
1. Busca via `supabase` client todos os `vendedor_nome` distintos do período/filial.
2. Aplica o mesmo filtro de canais externos do `src/lib/canaisExternos.ts`.
3. Exclui a lista oficial.
4. Loga o resultado no console do navegador (`console.table`).

Você abre `/gerencial`, abre o devtools e cola o resultado aqui.

### Recomendação
**Via A** é mais rápida e direta. Sem mudança de código.

### Fora de escopo
- Não altero `canaisExternos.ts` ainda.
- Não mexo no Gerencial.
- Decisão sobre adicionar/remover nomes vem **depois** do resultado.

