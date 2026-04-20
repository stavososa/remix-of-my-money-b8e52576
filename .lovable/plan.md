
## Objetivo
Adicionar um toggle no painel Gerencial que, quando ativo, **exclui dos KPIs, gráficos e tabela** as vendas atribuídas a "vendedores" que na verdade representam canais externos / marketplaces (iFood, Mercado Livre, Shopee, Magazine Luiza, Loja Integrada, TikTok Shop, sites próprios, etc.). Os nomes continuam disponíveis no filtro de vendedor (não removo as opções), apenas os totais são ocultados quando o botão está ativo.

## Lista de "vendedores-canais" a excluir
Baseado na imagem + canais comuns mencionados:
- IFOOD BARRA, IFOOD BOTAFOGO, IFOOD CAMPO GRANDE, IFOOD FREGUESIA, IFOOD RECREIO, IFOOD VALQUEIRE, IFOOD VISTA ALEGRE
- Loja Integrada
- Magazine Luiza
- Mercado Livre, MERCADO LIVRE 2
- Shopee
- SITE ATACADÃO, SITE MAROMBA STORE
- TikTok Shop (e variações)

Faço o match **case-insensitive + trim** e por **prefixo/keyword** (ex.: começa com "IFOOD", "SITE ", contém "MERCADO LIVRE", "MAGAZINE LUIZA", "LOJA INTEGRADA", "SHOPEE", "TIKTOK"). Assim novas filiais iFood ou variações entram automaticamente.

## UX no Gerencial
Na barra de filtros (onde já estão Unidade / Vendedor / Família / Marca), adicionar:

```text
[ Toggle: Ocultar canais externos (iFood, ML, Shopee, sites...) ]  ⓘ
```

- Toggle padrão: **desligado** (mantém comportamento atual).
- Quando ligado: chip visual "Canais externos ocultos" + tooltip listando os padrões filtrados.
- Estado guardado em `localStorage` (`gerencial.hideCanais`) para persistir entre sessões.

## Onde aplicar o filtro (técnico)
Arquivo: `src/pages/Gerencial.tsx` (e helper novo `src/lib/canaisExternos.ts`).

1. Criar `isCanalExterno(vendedorNome: string): boolean` em `src/lib/canaisExternos.ts` com a lista de regex/keywords.
2. No Gerencial, após carregar `vendasRaw`, derivar `vendasFiltradas = hideCanais ? vendasRaw.filter(v => !isCanalExterno(v.vendedor_nome)) : vendasRaw`.
3. Usar `vendasFiltradas` em **todos os agregados**: KPIs (faturamento, lucro, margem, qtd vendas, qtd vendedores), gráfico diário/acumulado, top famílias, top marcas e tabela detalhada.
4. **Não** alterar a lista de opções do dropdown "Vendedor" — continua mostrando todos.
5. Se o usuário tiver selecionado manualmente um vendedor que é canal externo e ligar o toggle, mostro um aviso curto: "Vendedor selecionado é canal externo — nenhum dado será exibido enquanto o filtro estiver ativo."

## Arquivos a alterar
- `src/lib/canaisExternos.ts` (novo) — lista + função `isCanalExterno`.
- `src/pages/Gerencial.tsx` — novo state `hideCanais`, toggle na barra de filtros, aplicar filtro em agregações.

## Fora de escopo
- Ranking, Meu Painel, Comissões — mantenho como estão (este pedido é só Gerencial). Posso replicar depois se quiser.
- Não removo nada do banco; é puramente filtro de visualização.
