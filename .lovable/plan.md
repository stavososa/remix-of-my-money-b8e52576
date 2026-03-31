

## Plano: Correção do pareamento de nomes entre `vendas` e `controle_pj` para filtro de filial

### Problema
Os nomes na tabela `vendas` nem sempre correspondem exatamente aos nomes em `controle_pj`. Exemplos do Recreio:
- `vendas`: "LILIAN XAVIER LOJA" / `controle_pj`: "LILIAN XAVIER" -- **nao casa**
- `vendas`: "CHECK OUT RECREIO" / `controle_pj`: nao existe -- **nao casa**
- `vendas`: "MATHEUS PENEDO LOJA" / `controle_pj`: "MATHEUS PENEDO LOJA" -- casa

Resultado: ao filtrar por RECREIO, varias vendas ficam de fora.

### Solucao em duas partes

**Parte 1 -- Atualizar `controle_pj` no banco**

Corrigir os nomes na `controle_pj` para corresponder exatamente aos nomes usados na tabela `vendas`, e adicionar entradas extras para "CHECK OUT" da unidade:

```sql
-- Corrigir LILIAN XAVIER → LILIAN XAVIER LOJA
UPDATE controle_pj SET nome_vendas = 'LILIAN XAVIER LOJA' WHERE nome_vendas = 'LILIAN XAVIER' AND unidade = 'RECREIO';

-- Adicionar CHECK OUT RECREIO
INSERT INTO controle_pj (nome, nome_vendas, unidade) VALUES ('CHECK OUT RECREIO', 'CHECK OUT RECREIO', 'RECREIO');
```

Verificar tambem se os outros nomes (ERISON BIZARELO, LUCAS VILLAR, MARCELLE DE CASTRO) aparecem exatamente assim na tabela `vendas`. Se nao aparecerem, corrigir.

**Parte 2 -- Melhorar o matching no codigo (fallback parcial)**

Em `src/pages/Gerencial.tsx`, alterar o `getFilial` para tentar match parcial quando o exato falhar -- se o `vendedor_nome` da venda **contem** algum `nome_vendas` do `controle_pj`, usa essa filial:

```ts
const getFilial = useCallback((vendedorNome: string | null | undefined): string => {
  if (!vendedorNome) return 'Sem Filial';
  const key = vendedorNome.trim().toUpperCase();
  // Exact match first
  const exact = vendedorFilialMap.get(key);
  if (exact) return exact;
  // Partial match: check if vendedor_nome contains any nome_vendas
  for (const [nome, unidade] of vendedorFilialMap.entries()) {
    if (key.includes(nome) || nome.includes(key)) return unidade;
  }
  return 'Sem Filial';
}, [vendedorFilialMap]);
```

### Resultado
- Filtro "RECREIO" captura vendas de LILIAN XAVIER LOJA, CHECK OUT RECREIO, etc.
- KPIs, grafico e tabela detalhada mostram valores corretos
- Fallback parcial garante resiliencia para variacoes futuras de nomes

