

## Pergunta direta
Sim, o `0001-01` é o CNPJ da Matriz. A questão é: **como exatamente** o código compara o CNPJ da venda com o `controle_pj`? É comparação exata da string, ou normaliza (tira pontos/traços), ou usa só a raiz (`44.578.137`)?

Preciso ler o código pra te responder com certeza, não chutar.

## O que vou investigar (read-only)

1. **`src/pages/Gerencial.tsx`** — como monta o filtro de filial: pega lista de CNPJs de `controle_pj` onde `unidade = MATRIZ` e faz `.in('cnpj_empresa', [...])`? Ou faz JOIN? Ou mapeia em memória?
2. **`src/pages/MeuPainel.tsx`** e **`src/pages/RankingComissoes.tsx`** — confirmar se a lógica de vínculo CNPJ→Filial é a mesma em todos os painéis ou diverge.
3. **Tabela `controle_pj`** (via `supabase--read_query`) — ver os 3 registros mapeados pra MATRIZ hoje: que formato de CNPJ está salvo? `44.578.137/0001-01` com máscara, ou `44578137000101` sem máscara?
4. **Tabela `vendas`** — ver em que formato `cnpj_empresa` é salvo nas linhas de fevereiro: com máscara ou sem? Comparar com o que está em `controle_pj`.
5. Confirmar se existe alguma normalização (`replace(/\D/g, '')`) antes da comparação, ou se é match literal.

## O que te entrego depois de investigar
Resposta objetiva em 3 linhas:
- **Onde** a comparação acontece (arquivo + linha).
- **Como** ela é feita (literal vs. normalizada vs. raiz).
- **Por que** o `0001-01` da Matriz pode (ou não) estar batendo com o que tem em `vendas` — se o problema é formato de string, raiz vs. sufixo, ou registro faltando mesmo.

A partir daí decidimos o conserto: cadastrar mais CNPJs em `controle_pj`, normalizar a comparação no código, ou as duas coisas.

## Fora de escopo
Não altero nada agora. É só leitura + diagnóstico pontual da pergunta que você fez.

