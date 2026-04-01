

## Plano: Substituir "BRX" por "HAZAK" com CNPJ fixo

### Contexto
"BRX" existe como registro na tabela `unidades` no banco. Precisamos:
1. Atualizar o registro no banco (renomear BRX → HAZAK e garantir o CNPJ correto)
2. Garantir que o código funcione sem alterações (já usa `unidades.nome` e `unidades.cnpj` dinamicamente)

### Alterações

**1. Migration SQL** — Criar migration para atualizar o registro:
```sql
UPDATE unidades 
SET nome = 'HAZAK', cnpj = '44.578.137/0020-66'
WHERE nome = 'BRX';
```
Se "BRX" não existir no banco, inserir:
```sql
INSERT INTO unidades (nome, cnpj, tipo, ativo)
VALUES ('HAZAK', '44.578.137/0020-66', 'filial', true)
ON CONFLICT DO NOTHING;
```

**2. Nenhuma alteração no código React** — O `Gerencial.tsx` já:
- Busca `nome` e `cnpj` da tabela `unidades` dinamicamente
- Usa `cnpjFilialMap` para mapear CNPJ → nome da filial
- O filtro multi-select mostra os nomes vindos do banco

Após a migration, "HAZAK" aparecerá automaticamente no dropdown e filtrará vendas com CNPJ `44.578.137/0020-66`.

