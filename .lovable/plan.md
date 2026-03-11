

## Diagnostico

Os dados existem na tabela `vendas` (conforme screenshot), mas **as queries do app retornam `[]`**. Confirmado nas network requests:

- `GET /vendas?select=data_emissao,...&order=data_emissao.desc` → `[]` (Status 200)
- `GET /vendas?select=data_emissao,...&data_emissao=not.is.null` → `[]` (Status 200)

**Causa provavel**: A coluna `data_emissao` esta **NULL** em todos os registros. A ordenacao por `data_emissao` funciona mas nao filtra dados. Porem, a query sem filtro tambem retorna `[]`, o que indica que **a RLS pode ter sido desativada APOS a captura das requests**, ou ha um problema de cache.

Alem disso, `controle_pj.nome_vendas` esta **NULL** para todos os vendedores, entao o mapeamento vendedor-unidade nao funciona.

## Plano

### 1. Tornar Gerencial.tsx resiliente a `data_emissao` nula

- Quando `data_emissao` for null, agrupar como `mesAno = "sem-data"` e `dia = 0`
- No filtro de Mes, mostrar "Sem Data" como opcao quando houver registros sem data
- Garantir que KPIs e graficos funcionam mesmo sem data_emissao

### 2. Corrigir mapeamento vendedor → unidade

Atualmente usa `controle_pj.nome_vendas` (que esta null). Mudar para:
- Comparar `vendas.vendedor_nome` (ex: "ANA FRANCA FREGUESIA") com `controle_pj.nome` (ex: "Ana França Freguesia") usando comparacao case-insensitive
- Tambem tentar match parcial: verificar se o nome do vendedor contem partes do nome do controle_pj
- Fallback: tentar extrair unidade do proprio `vendedor_nome` (ex: "CHECKOUT FREGUESIA" → buscar "FREGUESIA" nas unidades conhecidas)

### 3. Corrigir MeuPainel.tsx (crash no console)

O MeuPainel esta crashando. Verificar e corrigir o erro (provavelmente relacionado a dados nulos das queries de vendas/perfis).

### 4. Forcar refetch apos mudanca de RLS

Adicionar `staleTime: 0` ou `refetchOnMount: 'always'` nas queries de vendas para garantir dados frescos.

### Arquivos alterados
- `src/pages/Gerencial.tsx` — resilencia a data_emissao nula, novo mapeamento vendedor-unidade
- `src/pages/MeuPainel.tsx` — fix do crash, mesmo mapeamento resiliente

