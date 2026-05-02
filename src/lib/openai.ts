export interface ContextoIA {
  familias: string[];
  marcas: string[];
  produtos: string[];
  unidades: string[];
}

export async function gerarRegraIA(prompt: string, ctx: ContextoIA) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('API Key da OpenAI não configurada no .env');

  const familias = (ctx.familias ?? []).slice(0, 500);
  const marcas = (ctx.marcas ?? []).slice(0, 500);
  const produtos = (ctx.produtos ?? []).slice(0, 300);
  const unidades = (ctx.unidades ?? []).slice(0, 200);

  const systemPrompt = `Você é um assistente que extrai parâmetros de uma regra de comissão a partir de uma descrição em português.

REGRAS OBRIGATÓRIAS:
- Use SOMENTE valores presentes nas listas de contexto (familias, marcas, produtos, unidades). Se o usuário citar algo que não está na lista, devolva null para aquele campo.
- "percentual" deve ser um número decimal (ex.: 1.25 para "1,25%"). Nunca string, nunca com símbolo de %.
- "regime" deve ser "PJ" ou "CLT" (default "PJ" se não especificado).
- "tipo_unidade": null para regra genérica (todas as filiais). Se o usuário citar filiais específicas, use o nome exato em maiúsculas, separado por vírgula. Para entrega/delivery, use "DELIVERY".
- "familia_produto", "marca", "produto": preencha apenas se houver match com a lista de contexto. Caso contrário, null.
- "min_faturamento": número (em reais) só se o usuário mencionar faturamento mínimo; senão null.
- "nome": gere um nome curto e descritivo (ex.: "Suplementos Growth - DELIVERY 1,25%").
- "ativo": sempre true.

CONTEXTO DISPONÍVEL:
Famílias: ${JSON.stringify(familias)}
Marcas: ${JSON.stringify(marcas)}
Produtos (amostra): ${JSON.stringify(produtos)}
Unidades/Filiais: ${JSON.stringify(unidades)}`;

  const tool = {
    type: "function",
    function: {
      name: "preencher_regra",
      description: "Preenche os campos da regra de comissão com base na descrição do usuário.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          regime: { type: "string", enum: ["PJ", "CLT"] },
          tipo_unidade: { type: ["string", "null"] },
          familia_produto: { type: ["string", "null"] },
          marca: { type: ["string", "null"] },
          produto: { type: ["string", "null"] },
          percentual: { type: "number" },
          min_faturamento: { type: ["number", "null"] },
          ativo: { type: "boolean" },
        },
        required: [
          "nome",
          "regime",
          "tipo_unidade",
          "familia_produto",
          "marca",
          "produto",
          "percentual",
          "min_faturamento",
          "ativo",
        ],
        additionalProperties: false,
      },
    },
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "preencher_regra" } },
      temperature: 0.1,
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI erro: ${res.status} - ${txt}`);
  }

  const data = await res.json();
  const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error('A IA não retornou parâmetros válidos');
  
  return JSON.parse(argsStr);
}


export async function gerarRegrasLoteIA(prompt: string, ctx: ContextoIA) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('API Key da OpenAI não configurada no .env');

  const familias = (ctx.familias ?? []).slice(0, 800);
  const marcas = (ctx.marcas ?? []).slice(0, 800);
  const produtos = (ctx.produtos ?? []).slice(0, 1500);
  const unidades = (ctx.unidades ?? []).slice(0, 200);

  const systemPrompt = `Você é um assistente que extrai MÚLTIPLAS regras de comissão a partir de um texto solto em português (mensagens de WhatsApp, comunicados internos, planilhas coladas, etc.).

OBJETIVO: Devolver um ARRAY com UMA regra para cada item/produto/marca/família/percentual diferente mencionado no texto.

REGRAS OBRIGATÓRIAS POR ITEM:
- "percentual": número decimal (ex.: 1.25 para "1,25%"). Nunca string. Sem símbolo %.
- "regime": "PJ" ou "CLT". Default "PJ".
- "tipo_unidade": null para regra geral (todas as filiais). Se citar filiais específicas, use os nomes EXATOS da lista de unidades em maiúsculas, separados por vírgula. Se citar entrega/delivery, use "DELIVERY".
- "familia_produto": preencha SOMENTE se houver match (case-insensitive) com a lista de famílias do contexto. Caso contrário null.
- "marca": preencha SOMENTE se houver match (case-insensitive) com a lista de marcas. Caso contrário null.
- "produto": preencha SOMENTE se o texto citar um nome de produto que tenha match (substring case-insensitive) com a lista de produtos. Caso contrário null.
- "min_faturamento": número em reais SE o texto disser "se passar de R$ X" ou similar; senão null.
- "nome": curto e descritivo (ex: "Beta Alanina 10% (>80 unid)", "Marcas Próprias DCX 4%", "Roupas/Tênis 3%").
- "ativo": sempre true.

EXPANSÃO DE LISTAS:
- Se o texto listar vários produtos/marcas com o MESMO percentual ("5% – Ares, Diuretic, TESTO1000..."), gere UMA regra por item.
- Se citar "marcas próprias DCX, GrowUp, Synthesize" com percentual X, gere UMA regra por marca (uma por DCX, uma por GrowUp, uma por Synthesize).
- Para escalas de margem ("margem 77% = 9% comissão"), gere UMA regra por linha da escala se possível identificar o produto.
- Para regras genéricas ("Todos os itens de outras marcas 1,25%"), gere UMA regra com tudo null exceto percentual.
- Para "Toda linha [Marca]", gere uma regra com marca=Marca e os outros campos null.

QUALIDADE:
- Se houver dúvida sobre família/marca/produto, prefira null em vez de inventar.
- Não duplique regras idênticas.
- Limite a 60 regras por chamada.

CONTEXTO DISPONÍVEL:
Famílias: ${JSON.stringify(familias)}
Marcas: ${JSON.stringify(marcas)}
Produtos (amostra): ${JSON.stringify(produtos)}
Unidades/Filiais: ${JSON.stringify(unidades)}`;

  const tool = {
    type: "function",
    function: {
      name: "preencher_regras_lote",
      description: "Devolve a lista de regras de comissão extraídas do texto.",
      parameters: {
        type: "object",
        properties: {
          regras: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                regime: { type: "string", enum: ["PJ", "CLT"] },
                tipo_unidade: { type: ["string", "null"] },
                familia_produto: { type: ["string", "null"] },
                marca: { type: ["string", "null"] },
                produto: { type: ["string", "null"] },
                percentual: { type: "number" },
                min_faturamento: { type: ["number", "null"] },
                ativo: { type: "boolean" },
                observacao: { type: ["string", "null"], description: "Anotação curta opcional" },
              },
              required: [
                "nome",
                "regime",
                "tipo_unidade",
                "familia_produto",
                "marca",
                "produto",
                "percentual",
                "min_faturamento",
                "ativo",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["regras"],
        additionalProperties: false,
      },
    },
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "preencher_regras_lote" } },
      temperature: 0.1,
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI erro: ${res.status} - ${txt}`);
  }

  const data = await res.json();
  const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error('A IA não retornou parâmetros válidos');
  
  const parsed = JSON.parse(argsStr);
  return parsed.regras || [];
}
