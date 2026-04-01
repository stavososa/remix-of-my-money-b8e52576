

## Plano: Multi-seleção no filtro de Filiais

### O que muda
Transformar o filtro de Filial de single-select (`string`) para multi-select (`string[]`), permitindo selecionar várias unidades simultaneamente.

### Alterações em `src/pages/Gerencial.tsx`

**1. Estado**: `filtroUnidade` passa de `string` para `string[]`
```ts
// De:
const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
// Para:
const [filtroUnidade, setFiltroUnidade] = useState<string[]>([]);
// [] = todas, array com valores = filtradas
```

**2. Criar componente `MultiFilterSelect`** (inline no mesmo arquivo)
- Usa um `Popover` + lista de `Checkbox` para cada opção
- Botão mostra "Todas as Filiais" quando vazio, ou "2 filiais" quando selecionadas
- Checkbox para marcar/desmarcar cada unidade
- Botão "Limpar" para resetar

**3. Filtro client-side (`filteredAll`)**: 
```ts
if (filtroUnidade.length > 0 && !filtroUnidade.includes(getFilial(row.cnpj_empresa))) return false;
```

**4. Filtro server-side (query paginada)**:
- Quando `filtroUnidade.length > 0`, coletar CNPJs de todas as filiais selecionadas e usar `.in('cnpj_empresa', allCnpjs)`

**5. Active filters / chips**: Mostrar um chip por filial selecionada, cada um removível individualmente

**6. Reset**: No `useEffect` do período e no `clearAllFilters`, setar `[]`

### Componentes utilizados
- `Popover` + `PopoverTrigger` + `PopoverContent` (já existe em `src/components/ui/popover.tsx`)
- `Checkbox` (já existe em `src/components/ui/checkbox.tsx`)
- Sem dependências novas

