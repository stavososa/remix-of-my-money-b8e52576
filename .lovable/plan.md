

## Plano: Garantir filtro permanente de filial para gerente no Gerencial

### Problema
O filtro de filial do gerente pode ser removido em duas situações:
1. O botão "Limpar filtros" (`clearAllFilters`) reseta `filtroUnidade` para `[]`
2. O chip de filtro ativo "Filial: MATRIZ" tem um botão X que permite removê-lo
3. O dropdown de filiais ainda aparece como editável

### Correções

#### Arquivo: `src/pages/Gerencial.tsx`

1. **`clearAllFilters`** — não resetar `filtroUnidade` quando `isGerente`
2. **`activeFilters`** — não incluir chip removível de filial quando `isGerente` (o filtro é permanente, não deve ter X)
3. **Dropdown de filiais** — esconder ou desabilitar completamente para gerentes (já que a filial é fixa)
4. **useEffect de reset de período** — garantir que o `filtroUnidade` do gerente é preservado ao trocar de mês

São 4 ajustes pontuais no mesmo arquivo, sem mudanças em outros arquivos ou no banco.

