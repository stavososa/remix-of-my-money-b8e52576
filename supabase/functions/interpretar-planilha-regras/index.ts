import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

// Edge function: interpretar-planilha-regras
// Recebe linhas de uma planilha (.csv/.xlsx) já parseadas em JSON pelo frontend
// e retorna um ARRAY de regras de comissão estruturadas, usando IA para mapear as colunas.

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
          headers: { Authorization: `Bearer ${token}` },
        },
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const headers: string[] = body?.headers ?? [];
    const rows: Record<string, string>[] = body?.rows ?? [];
    const ctx: Contexto = body?.contexto ?? {};

    if (!rows.length) {
      return new Response(
        JSON.stringify({ ok: false, error: "rows é obrigatório e não pode ser vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const familias = (ctx.familias ?? []).slice(0, 800);
    const marcas = (ctx.marcas ?? []).slice(0, 800);
    const produtos = (ctx.produtos ?? []).slice(0, 1500);
    const unidades = (ctx.unidades ?? []).slice(0, 200);

    // Serializa as linhas como CSV com separador ";" para enviar à IA
    const csvHeader = headers.join(";");
    const csvRows = rows.slice(0, 200).map((row) =>
      headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(";")
    ).join("\n");
    const csvData = `${csvHeader}\n${csvRows}`;

    const systemPrompt = `Você é um assistente especializado em interpretar planilhas de regras de comissão de vendas.

OBJETIVO: Converter cada linha da planilha em UMA regra de comissão estruturada. Retorne somente linhas com percentual válido (> 0).

MAPEAMENTO DE COLUNAS — exemplos de nomes que podem aparecer (case-insensitive):
- "percentual": "%", "Percentual", "% Comissão", "Comissão", "Comis.", "perc", "%comiss", "commission", "taxa", "% comis"
  → Normalizar SEMPRE para número decimal: "1,25%" → 1.25 | "1,25" → 1.25 | "1.25" → 1.25
  → NUNCA retornar string, NUNCA incluir símbolo %
- "familia_produto": "Família", "Familia", "Fam.", "Grupo", "Categoria", "family", "familia"
- "marca": "Marca", "Brand", "Fornecedor", "Fabricante"
- "produto": "Produto", "Item", "Descrição", "Descrição Produto", "desc_produto", "product"
- "regime": "Regime", "Tipo", "PJ/CLT", "Tipo Vendedor"
  → Default "PJ". Usar "CLT" apenas se a célula contiver explicitamente "CLT" ou "Celetista"
- "tipo_unidade": "Filial", "Loja", "Unidade", "Canal", "tipo_unidade"
  → null = todas as filiais | "DELIVERY" = apenas delivery | nomes exatos separados por vírgula = filiais específicas
- "min_faturamento": "Mín Fat.", "Fat. Mínimo", "Faturamento Mínimo", "Mínimo", "min_fat", "fat min"
  → null se célula vazia, zero ou ausente
- "nome": "Nome", "Descrição da Regra", "Regra", "Observação"
  → Se ausente ou vazio, gere um nome descritivo curto baseado nos campos preenchidos (ex: "GROWTH PJ 1,25%")

VALIDAÇÃO OBRIGATÓRIA (use SOMENTE valores que existam nas listas abaixo):
- "familia_produto": match case-insensitive com lista de famílias → se não encontrar, retornar null
- "marca": match case-insensitive com lista de marcas → se não encontrar, retornar null
- "produto": match substring case-insensitive com lista de produtos → se não encontrar, retornar null
- "tipo_unidade": nomes EXATOS da lista de unidades (separados por vírgula), ou "DELIVERY", ou null

QUALIDADE:
- Gere UMA regra por linha da planilha (sem expansão de listas)
- Ignore linhas completamente vazias ou sem percentual válido (vazio, zero, texto não-numérico)
- Se houver dúvida sobre família/marca/produto, prefira null
- Limite a 200 regras por chamada

CONTEXTO DISPONÍVEL:
Famílias: ${JSON.stringify(familias)}
Marcas: ${JSON.stringify(marcas)}
Produtos (amostra): ${JSON.stringify(produtos)}
Unidades/Filiais: ${JSON.stringify(unidades)}`;

    const userMessage = `Planilha de regras de comissão (CSV com separador ";"):\n\n${csvData}`;

    const tool = {
      type: "function",
      function: {
        name: "preencher_regras_planilha",
        description: "Converte cada linha da planilha em uma regra de comissão estruturada.",
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
          { role: "user", content: userMessage },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "preencher_regras_planilha" } },
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
        { status: oaiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oaiData = await oaiResp.json();
    const toolCall = oaiData?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      return new Response(
        JSON.stringify({ ok: false, error: "Resposta da IA sem dados estruturados" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: { regras?: unknown };
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "JSON inválido retornado pela IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const regras = Array.isArray(parsed?.regras) ? parsed.regras : [];

    return new Response(
      JSON.stringify({ ok: true, regras }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("interpretar-planilha-regras erro", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
