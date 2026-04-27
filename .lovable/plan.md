## Botão "Preencher com IA" no formulário de Regras de Comissão

### Objetivo
Adicionar, dentro do modal de criação/edição de regra na página **Regras de Comissão**, um botão **"Preencher com IA"** que, a partir de uma descrição em linguagem natural digitada pelo usuário (ex.: *"comissão de 1,25% para a família SUPLEMENTOS da marca GROWTH em filiais DELIVERY no regime PJ"*), chame a OpenAI e devolva os campos do formulário já preenchidos.

A `OPENAI_API_KEY` já está configurada como secret no backend, então a chamada será feita por **edge function** (nunca do cliente, para não expor a chave).

---

### Comportamento (UX)

1. No modal "Nova/Editar Regra" (`AdminRegras.tsx`), no topo do formulário, um bloco compacto:
   - Campo de texto (textarea) com placeholder: *"Descreva a regra em português. Ex.: 1,25% para família SUPLEMENTOS marca GROWTH no DELIVERY, regime PJ."*
   - Botão **"Preencher com IA"** (ícone `Sparkles`/`Wand2`).
2. Ao clicar:
   - Botão entra em estado de loading (`"Gerando..."`, disabled).
   - Chama a edge function `gerar-regra-ia` enviando: `{ prompt, contexto: { familias: [...], marcas: [...], produtos: [...amostra...], unidades: [...] } }` — assim a IA escolhe valores que **realmente existem** no banco.
   - A edge function retorna JSON estruturado com os campos da regra.
   - O front faz **merge** no estado `modal` (preserva o que o usuário já digitou em `nome` se a IA não sugerir; sobrescreve apenas os campos retornados).
   - Toast de sucesso: *"Campos preenchidos. Revise antes de salvar."*
3. Erros (chave inválida, rate limit, JSON malformado): toast vermelho com mensagem clara. Formulário continua editável.
4. **Nada é salvo automaticamente** — o usuário sempre confirma clicando em "Salvar".

---

### Modelo de dados retornado pela IA (structured output via tool calling)

```json
{
  "nome": "string",
  "regime": "PJ" | "CLT",
  "tipo_unidade": "string | null (CSV de filiais ou DELIVERY ou null para genérica)",
  "familia_produto": "string | null",
  "marca": "string | null",
  "produto": "string | null",
  "percentual": "number (ex.: 1.25)",
  "min_faturamento": "number | null",
  "ativo": true
}
```

`periodo_ano` e `periodo_mes` permanecem os do contexto atual (não vêm da IA).

---

### Detalhes técnicos

**1. Nova edge function: `supabase/functions/gerar-regra-ia/index.ts`**
- CORS padrão Lovable.
- Lê `OPENAI_API_KEY` de `Deno.env`.
- Recebe `{ prompt: string, contexto: { familias, marcas, produtos, unidades } }` (validação leve).
- Chama `https://api.openai.com/v1/chat/completions` com:
  - Modelo: `gpt-4o-mini` (rápido e barato, suficiente para classificação).
  - `tool_choice` forçando uma função `preencher_regra` cujos `parameters` definem o schema acima — garante saída JSON estruturada e válida.
  - System prompt instruindo: usar apenas valores presentes no contexto (família/marca/produto/unidade); se não tiver certeza, devolver `null`; percentual sempre em número decimal (`1.25`, não `"1,25%"`).
- Retorna `{ ok: true, data: <objeto da regra> }` ou `{ ok: false, error }` com status apropriado (incluindo tratamento de 401/429 da OpenAI).
- `verify_jwt = false` (segue o padrão do projeto; a chave fica protegida no servidor).

**2. Edição em `src/pages/AdminRegras.tsx`**
- Adicionar estados locais: `iaPrompt`, `iaLoading`.
- Adicionar bloco "Preencher com IA" no topo do formulário do modal (antes dos campos atuais).
- Função `gerarComIA()`:
  - Monta o `contexto` a partir dos dados que a página já carrega:
    - `familias` e `marcas` vêm de `regras-autocomplete-combos` (já existente).
    - `unidades` vêm da query existente de unidades/filiais.
    - `produtos`: amostra dos primeiros ~200 produtos distintos já carregados (evita prompt gigante).
  - Chama via `supabase.functions.invoke('gerar-regra-ia', { body: { prompt, contexto } })`.
  - No sucesso, faz `setModal(prev => ({ ...prev, ...data, periodo_ano, periodo_mes }))` mantendo o período atual.
- Importar ícone `Sparkles` do `lucide-react`.

**3. Sem mudanças em**
- Schema do banco, RLS, motor de comissão, lógica de salvar/editar/duplicar, exclusões, auditoria.

---

### Arquivos
- **Novo:** `supabase/functions/gerar-regra-ia/index.ts`
- **Editado:** `src/pages/AdminRegras.tsx`

### Observações
- A chave **OPENAI_API_KEY** já está cadastrada nos secrets do projeto — nenhuma ação adicional do usuário é necessária.
- Como o `LOVABLE_API_KEY` também está disponível, posso alternativamente usar o **Lovable AI Gateway** com `google/gemini-3-flash-preview` (grátis até o limite mensal e sem depender da OpenAI). **Pergunta para o usuário antes de implementar:** prefere usar a OpenAI (sua chave) ou o Lovable AI (gratuito até o limite)?