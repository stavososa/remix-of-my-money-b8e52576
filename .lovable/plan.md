

## Objetivo
Listar todos os `vendedor_nome` distintos da base e separar:
1. **Suspeitos de canal externo** que **não** estão sendo capturados pelos padrões atuais em `src/lib/canaisExternos.ts` (precisam ser adicionados).
2. **Vendedores reais** (nomes de pessoas) — apenas para conferência.

Sem isso, é chute. Preciso ler o universo real de nomes na tabela `vendas` (instância externa `tdbuhbppxztuloncplqj`).

## Por que não consigo responder agora
- Estou em modo plan (read-only): não rodo scripts.
- A tabela `vendas` está na instância **externa** do Supabase, não no Cloud deste projeto, então o `read_query` do Cloud não enxerga ela.

## Plano de execução (ao aprovar)

### Passo 1 — Script de inspeção (somente leitura)
Criar um script em `/tmp/listar_vendedores.ts` que:
- Usa a anon key da instância externa (já presente em `src/integrations/supabase/client.ts`).
- Faz `SELECT DISTINCT vendedor_nome` paginado da tabela `vendas` (todos os períodos, ou últimos 12 meses para ficar rápido).
- Para cada nome, aplica `isCanalExterno()` do helper atual.
- Imprime três blocos:
  - **Já cobertos** (canal externo detectado).
  - **NÃO cobertos mas suspeitos** — heurística: nome com 1 palavra muito curta, contém dígito, contém palavras-chave como "DELIVERY", "ATACADO", "PROMO", "BALCAO", "WHATS", "INSTA", "GERENCIA", "CAIXA", "MATRIZ", "FILIAL", "ECOMMERCE", "APP", "WEB".
  - **Provavelmente pessoas físicas** (nomes com 2+ palavras alfabéticas).

### Passo 2 — Te apresentar a lista
Devolvo na chat o texto cru separado nos 3 blocos, para você marcar quais quer adicionar à lista de canais externos.

### Passo 3 (opcional, se você confirmar)
Atualizo `PADROES_CANAIS_EXTERNOS` em `src/lib/canaisExternos.ts` com os novos padrões aprovados.

## Arquivos envolvidos
- `/tmp/listar_vendedores.ts` (script descartável, não vai pro repo).
- Eventualmente `src/lib/canaisExternos.ts` (só no passo 3, se aprovado).

## Fora de escopo
- Não altero nenhuma página, KPI ou regra de negócio neste passo.
- Não toco no banco — é apenas leitura.

