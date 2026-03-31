

## Plano: Inserir vendedores do Recreio na tabela controle_pj

### Dados identificados na planilha (aba Recreio)

Os 6 vendedores da unidade Recreio:

| nome | nome_vendas (como aparece na planilha) |
|------|---------------------------------------|
| ANDERSON RIBEIRO | ANDERSON RIBEIRO |
| ERISON BIZARELO RIBEIRO CRUZ | ERISON BIZARELO RIBEIRO CRUZ |
| LILIAN XAVIER | LILIAN XAVIER |
| LUCAS VILLAR ROSA | LUCAS VILLAR ROSA |
| MARCELLE DE CASTRO | MARCELLE DE CASTRO |
| MATHEUS PENEDO LOJA | MATHEUS PENEDO LOJA |

### Ação

Executar um INSERT na tabela `controle_pj` com os 6 vendedores, usando:
- `nome` = nome completo do vendedor
- `nome_vendas` = mesmo nome (usado para mapear com a tabela `vendas`)
- `unidade` = "RECREIO"
- `setor` e `cnpj` = null (a preencher depois, se necessário)

### SQL a executar

```sql
INSERT INTO controle_pj (nome, nome_vendas, unidade)
VALUES
  ('ANDERSON RIBEIRO', 'ANDERSON RIBEIRO', 'RECREIO'),
  ('ERISON BIZARELO RIBEIRO CRUZ', 'ERISON BIZARELO RIBEIRO CRUZ', 'RECREIO'),
  ('LILIAN XAVIER', 'LILIAN XAVIER', 'RECREIO'),
  ('LUCAS VILLAR ROSA', 'LUCAS VILLAR ROSA', 'RECREIO'),
  ('MARCELLE DE CASTRO', 'MARCELLE DE CASTRO', 'RECREIO'),
  ('MATHEUS PENEDO LOJA', 'MATHEUS PENEDO LOJA', 'RECREIO');
```

### Nenhuma alteração de código
Apenas inserção de dados no banco.

