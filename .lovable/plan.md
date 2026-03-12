

## Plano: Renomear "Unidade" para "Filial" na UI do Gerencial

Trocar todos os textos visíveis ao usuário de "Unidade" para "Filial" em `src/pages/Gerencial.tsx`:

1. **Linha 297**: `Unidade: ${filtroUnidade}` → `Filial: ${filtroUnidade}`
2. **Linha 314**: `label: 'Unidade'` → `label: 'Filial'` (coluna da tabela)
3. **Linha 330**: `label="Unidade"` e `allLabel="Todas as Unidades"` → `label="Filial"` e `allLabel="Todas as Filiais"`
4. **Linhas 118, 124**: `'Sem Unidade'` → `'Sem Filial'` (texto exibido quando vendedor não tem unidade associada)
5. **Linha 216**: `'Sem Unidade'` → `'Sem Filial'` (filtro de opções)

Somente textos visíveis ao usuário serão alterados. Nomes de variáveis internas permanecem iguais.

