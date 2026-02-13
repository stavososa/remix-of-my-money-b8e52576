

## Painel Admin: Visao Geral com Ranking Completo

### Problema Atual
Quando a conta admin acessa `/meu-painel`, o painel tenta buscar dados de um vendedor especifico (hardcoded "LUCAS VILAR") e exibe o nome como apenas "admin", pois a conta admin nao possui `vendedor_id` associado.

### Solucao

Transformar o `/meu-painel` em um painel adaptativo que detecta a role do usuario:
- **Admin**: Mostra visao geral da empresa com ranking completo de todos os vendedores
- **Vendedor**: Mantem o comportamento atual (dados individuais)

### Mudancas no arquivo `src/pages/MeuPainel.tsx`

#### 1. Importar `role` do AuthContext
Adicionar `role` na desestruturacao do `useAuth()`.

#### 2. Ajustar o Header para Admin
- Exibir "Painel Administrativo" no lugar de "Ola, admin!"
- Remover referencias a unidade/regime individuais
- Mostrar KPIs agregados no header (total vendido geral, total lucro geral, margem media geral, total notas)

#### 3. Buscar dados gerais (sem filtro de vendedor)
- Para admin, a query de `vendas` nao filtra por `vendedor_nome` -- usa todos os registros
- Os KPIs (Total Vendido, Lucro, Margem, Notas) serao calculados sobre TODAS as vendas

#### 4. Substituir o card "Sua Posicao PJ" por um Ranking Completo
Para admin, no lugar dos 3 cards (posicao PJ, comparativo, gauge), exibir uma tabela/listagem com:
- Posicao (numero)
- Nome do vendedor (vindo de `controle_pj.nome`)
- Quantidade de vendas (contagem na tabela `vendas`)
- Total arrecadado (soma de `total_com_desconto` ou `total_mercadoria`)
- Medalhas para top 3

#### 5. Manter graficos gerais
- O grafico "Vendas da Empresa" continua mostrando todas as vendas por data
- Remover a linha "Suas Vendas" do grafico (nao faz sentido para admin)
- Manter as linhas de referencia (Media e Mediana)

#### 6. Tabela Detalhada e Vendas por Dia
- Mostrar TODAS as vendas na tabela detalhada (sem filtro por vendedor)
- Adicionar coluna "Vendedor" na tabela detalhada
- Grafico "Vendas por Dia" com dados de todos os vendedores

### Detalhes Tecnicos

```text
Fluxo de decisao:
+------------------+
|  useAuth().role  |
+--------+---------+
         |
    +----+----+
    | admin?  |
    +----+----+
    Yes  |    No
    |    |    |
    v    |    v
  Visao  | Visao
  Geral  | Individual
  (sem   | (comportamento
  filtro)| atual)
```

- Query `vendasAdmin`: busca TODAS as vendas sem filtro `vendedor_nome`, com `data_emissao`, `total_com_desconto`, `lucros_reais`, `margem_percentual`, `nota_fiscal`, `vendedor_nome`, `descricao_produto`, `marca`, `quantidade`
- Ranking completo: usa os dados ja existentes de `rankingPj` (controle_pj + contagem de vendas), adicionando soma de valores arrecadados por vendedor
- Condicional `role === 'admin'` para alternar entre os dois modos de exibicao em cada secao do JSX

### Estrutura do Ranking (Admin)

| # | Vendedor | Vendas | Total Arrecadado |
|---|----------|--------|------------------|
| 1 | Nome     | 150    | R$ 500.000,00    |
| 2 | Nome     | 120    | R$ 400.000,00    |
| 3 | Nome     | 100    | R$ 350.000,00    |

Com medalhas visuais para as 3 primeiras posicoes e estilizacao consistente com o design atual (cores dark, bordas sutis, gradientes dourados para destaques).

