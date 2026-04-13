

## Plano: Tornar filtro de filial fixo e oculto para gerentes no Ranking Comissões

### Contexto
No `RankingComissoes.tsx`, o filtro de filial para gerentes já é exibido como um badge estático (linha 415-419). O problema é o botão "Limpar filtros" (linha 470-474) que aparece quando `filtroFilial.length > 0`, permitindo que o gerente remova o filtro de filial. Além disso, o vendedor pode ser limpo normalmente.

### Alterações em `src/pages/RankingComissoes.tsx`

1. **Ocultar o badge estático da filial para gerentes** (linhas 415-419): Remover o bloco que mostra o nome da filial como badge visual. O gerente não precisa ver essa informação no filtro, ela é implícita.

2. **Ajustar o botão "Limpar filtros"** (linhas 470-474): Para gerentes, o botão só deve aparecer quando `filtroVendedor !== 'all'` (já que a filial é fixa e não pode ser limpa). Ao clicar, deve limpar apenas o vendedor, mantendo a filial intacta.

Alterar a condição e o handler:
```typescript
{(isGerente ? filtroVendedor !== 'all' : (filtroFilial.length > 0 || filtroVendedor !== 'all')) && (
  <button onClick={() => { 
    if (!isGerente) setFiltroFilial([]); 
    setFiltroVendedor('all'); 
  }} ...>
    <X className="h-3 w-3" /> Limpar filtros
  </button>
)}
```

3. **Proteger o useEffect de reset por período** (linha 193-198): Garantir que ao mudar de período, o gerente não perca o filtro de filial (já está correto pois o `setFiltroFilial([])` está dentro de `if (!isGerente)`).

### Arquivo alterado
- `src/pages/RankingComissoes.tsx`

