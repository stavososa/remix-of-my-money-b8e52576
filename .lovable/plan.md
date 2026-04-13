

## Plano: Corrigir isolamento de dados por filial para gerentes

### Problema real (confirmado via rede)
A query de vendas (tabela e allVendas) dispara **antes** do `useEffect` setar `filtroUnidade` para o gerente, porque `unidadesList` ainda está carregando. Resultado: `filtroUnidade = []`, nenhum filtro de CNPJ é aplicado, e dados de todas as filiais são retornados.

A resposta da API mostra CNPJs de múltiplas filiais (`/0016-80`, `/0015-07`, `/0011-75`) para o gerente da Matriz.

### Correções no arquivo `src/pages/Gerencial.tsx`

1. **Bloquear queries até filtro do gerente estar pronto**: Adicionar `enabled` nas queries de `allVendas` e `vendasResult` para que não executem enquanto o gerente não tiver `filtroUnidade` populado:
   ```
   enabled: !isGerente || filtroUnidade.length > 0
   ```

2. **Filtrar `allVendas` no nível do fetch para gerentes**: Na query `allVendas` (que busca todos os dados do período), adicionar filtro `.in('cnpj_empresa', gerenteCnpjs)` diretamente na query SQL quando `isGerente`, em vez de baixar tudo e filtrar no cliente. Isso reduz transferência de dados e garante isolamento mesmo se o filtro client-side falhar.

3. **Garantir `getCnpjsByFiliais` case-insensitive**: A comparação `filiais.includes(u.nome)` na linha 301 é case-sensitive. Trocar por comparação `.toUpperCase()`.

### Resultado esperado
- Queries só disparam após `filtroUnidade` estar definido para gerentes
- Os dropdowns de Vendedor, Família e Marca mostram apenas dados da Matriz
- A tabela mostra apenas vendas com CNPJs da Matriz
- Nenhuma dado de outras filiais é visível

