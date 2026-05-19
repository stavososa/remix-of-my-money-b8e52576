import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

// Edge function: gerar-regra-ia
// Recebe um prompt em linguagem natural + contexto (familias, marcas, produtos, unidades)
// e retorna campos estruturados para preencher o formulário de regra de comissão.

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Não autorizado: token ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Não autorizado: token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        tool_choice: { type: "function", function: { name: "preencher_regra" } },
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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "JSON inválido retornado pela IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, data: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("gerar-regra-ia erro", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
