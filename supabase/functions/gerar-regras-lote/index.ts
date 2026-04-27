// Edge function: gerar-regras-lote
// Recebe um texto longo descrevendo MÚLTIPLAS regras de comissão (mensagem solta no WhatsApp etc)
// e retorna um ARRAY de regras estruturadas para preencher em massa.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Contexto {
  familias?: string[];
  marcas?: string[];
  produtos?: string[];
  unidades?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "OPENAI_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const prompt: string = (body?.prompt ?? "").toString().trim();
    const ctx: Contexto = body?.contexto ?? {};

    if (!prompt) {
      return new Response(
        JSON.stringify({ ok: false, error: "prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
                  observacao: { type: ["string", "null"], description: "Anotação curta opcional sobre escalas de margem ou exceções que não couberam nos campos" },
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

    const oaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
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
      }),
    });

    if (!oaiResp.ok) {
      const errText = await oaiResp.text();
      console.error("OpenAI erro", oaiResp.status, errText);
      let msg = `OpenAI ${oaiResp.status}`;
      if (oaiResp.status === 401) msg = "Chave da OpenAI inválida";
      else if (oaiResp.status === 429) msg = "Limite de requisições da OpenAI atingido. Tente em alguns segundos.";
      else if (oaiResp.status === 402) msg = "Créditos da OpenAI esgotados.";
      return new Response(
        JSON.stringify({ ok: false, error: msg }),
        { status: oaiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const oaiData = await oaiResp.json();
    const toolCall = oaiData?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      return new Response(
        JSON.stringify({ ok: false, error: "Resposta da IA sem dados estruturados" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: { regras?: unknown };
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "JSON inválido retornado pela IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const regras = Array.isArray(parsed?.regras) ? parsed.regras : [];

    return new Response(
      JSON.stringify({ ok: true, regras }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("gerar-regras-lote erro", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
