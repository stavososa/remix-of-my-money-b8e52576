

## Plano: KPIs como ícones clicáveis no mobile

### Conceito
No mobile, os 5 KPI cards são substituídos por uma barra horizontal de 5 ícones circulares. Ao clicar em um ícone, um pequeno popover/tooltip mostra o label e o valor. No desktop, tudo continua como está.

### Alterações

**`src/components/KPICard.tsx`**
- Adicionar prop `compact?: boolean` (controlada pelo pai)
- Quando `compact=true`: renderizar apenas o ícone circular (sem label/value), com um `Popover` que ao clicar exibe label + value em um pequeno card flutuante
- Usar `Popover` do Radix (já existe em `src/components/ui/popover.tsx`)

**`src/pages/Gerencial.tsx`** (linhas 387-393)
- Importar `useIsMobile` de `src/hooks/use-mobile.tsx`
- Passar `compact={isMobile}` para cada `KPICard`
- No mobile, mudar o grid para `grid-cols-5` (uma coluna por ícone) com gap menor, centralizando os ícones em uma única linha horizontal
- No desktop, manter `lg:grid-cols-5` com cards completos

### Resultado
No smartphone, os 5 KPIs ocupam uma única linha como ícones compactos. Tocar em qualquer um abre um popover com o nome e valor. No desktop, nada muda.

