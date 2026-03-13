

## Plano: Tabela mobile com 3 colunas + popup de detalhes

### Problema
No mobile (390px), a tabela de vendas detalhadas tem 10 colunas, forçando scroll horizontal excessivo.

### Solução
No mobile, exibir apenas 3 colunas (Data, Vendedor, Produto). Ao clicar em uma linha, abrir um `Dialog` com todos os detalhes da venda.

### Alterações

**`src/pages/Gerencial.tsx`**

1. Criar duas versões de colunas:
   - `detailColumnsMobile`: apenas `data_emissao`, `vendedor_nome`, `descricao_produto`
   - `detailColumns`: as 10 colunas atuais (para desktop)

2. Adicionar estado para a linha selecionada: `const [selectedRow, setSelectedRow] = useState<any>(null)`

3. Passar `columns={isMobile ? detailColumnsMobile : detailColumns}` ao `DataTable`

4. No mobile, adicionar `onRowClick={(row) => setSelectedRow(row)}` — precisaremos adicionar essa prop ao `DataTable`

5. Renderizar um `Dialog` que exibe todos os campos da venda quando `selectedRow` não é null

**`src/components/DataTable.tsx`**

1. Adicionar prop opcional `onRowClick?: (row: T) => void`
2. No `<tr>` do tbody, adicionar `onClick={() => onRowClick?.(row)}` e `cursor-pointer` quando `onRowClick` está definido

### Detalhes do Dialog
Exibirá os campos em lista vertical:
- Data, Vendedor, Filial, Produto, Família, Marca, NF, Valor, Lucro, Margem
- Formatados com os mesmos renders das colunas originais

