-- Helper function: parse Brazilian currency/percentage strings to numeric
CREATE OR REPLACE FUNCTION parse_brl(val text) RETURNS numeric AS $$
  SELECT CASE
    WHEN val IS NULL OR TRIM(val) = '' THEN 0
    ELSE COALESCE(
      NULLIF(
        REPLACE(
          REPLACE(
            REGEXP_REPLACE(val, '[R$\s%]', '', 'g'),
            '.', ''
          ),
          ',', '.'
        ),
        ''
      )::numeric,
      0
    )
  END;
$$ LANGUAGE sql IMMUTABLE;

-- RPC: Gerencial Summary (KPIs, charts, filter options)
CREATE OR REPLACE FUNCTION rpc_gerencial_resumo(
  p_ano int,
  p_mes int,
  p_unidade text DEFAULT NULL,
  p_vendedor text DEFAULT NULL,
  p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  start_date text;
  end_date text;
  last_day int;
BEGIN
  start_date := p_ano || '-' || LPAD(p_mes::text, 2, '0') || '-01';
  last_day := EXTRACT(DAY FROM (DATE_TRUNC('month', (start_date || ' 00:00:00')::timestamp) + INTERVAL '1 month - 1 day'));
  end_date := p_ano || '-' || LPAD(p_mes::text, 2, '0') || '-' || LPAD(last_day::text, 2, '0');

  WITH filtered AS (
    SELECT
      v.id,
      v.data_emissao,
      v.vendedor_nome,
      COALESCE(cp.unidade, 'Sem Unidade') AS unidade_nome,
      COALESCE(v.familia_produto, 'Outros') AS familia_produto,
      COALESCE(v.marca, 'Sem Marca') AS marca,
      v.descricao_produto,
      v.nota_fiscal,
      parse_brl(v.total_com_desconto::text) AS total_cd,
      parse_brl(v.lucros_reais::text) AS lucro,
      parse_brl(v.margem_percentual::text) AS margem,
      parse_brl(v.quantidade::text) AS qtd
    FROM vendas v
    LEFT JOIN controle_pj cp
      ON UPPER(TRIM(COALESCE(cp.nome_vendas, cp.nome))) = UPPER(TRIM(v.vendedor_nome))
    WHERE v.data_emissao >= start_date
      AND v.data_emissao <= end_date
      AND (p_unidade IS NULL OR COALESCE(cp.unidade, 'Sem Unidade') = p_unidade)
      AND (p_vendedor IS NULL OR v.vendedor_nome = p_vendedor)
      AND (p_familia IS NULL OR COALESCE(v.familia_produto, 'Outros') = p_familia)
      AND (p_marca IS NULL OR COALESCE(v.marca, 'Sem Marca') = p_marca)
  ),
  kpis AS (
    SELECT
      COALESCE(SUM(total_cd), 0) AS faturamento,
      COALESCE(SUM(lucro), 0) AS lucro_total,
      COUNT(*) AS qtd_vendas,
      COUNT(DISTINCT vendedor_nome) AS qtd_vendedores,
      CASE WHEN SUM(total_cd) > 0
        THEN SUM(margem * total_cd) / SUM(total_cd)
        ELSE 0
      END AS margem_media
    FROM filtered
  ),
  daily AS (
    SELECT
      data_emissao AS data,
      SUM(total_cd) AS faturamento_dia,
      SUM(lucro) AS lucro_dia
    FROM filtered
    WHERE data_emissao IS NOT NULL
    GROUP BY data_emissao
    ORDER BY data_emissao
  ),
  daily_acum AS (
    SELECT
      data,
      faturamento_dia,
      lucro_dia,
      SUM(faturamento_dia) OVER (ORDER BY data) AS acumulado
    FROM daily
  ),
  top_familias AS (
    SELECT familia_produto AS name, SUM(total_cd) AS total
    FROM filtered
    WHERE familia_produto != 'Outros'
    GROUP BY familia_produto
    ORDER BY total DESC
    LIMIT 10
  ),
  top_marcas AS (
    SELECT marca AS name, SUM(total_cd) AS total
    FROM filtered
    WHERE marca != 'Sem Marca'
    GROUP BY marca
    ORDER BY total DESC
    LIMIT 10
  ),
  all_vendas AS (
    SELECT
      v.vendedor_nome,
      COALESCE(cp2.unidade, 'Sem Unidade') AS unidade_nome,
      COALESCE(v.familia_produto, 'Outros') AS familia_produto,
      COALESCE(v.marca, 'Sem Marca') AS marca
    FROM vendas v
    LEFT JOIN controle_pj cp2
      ON UPPER(TRIM(COALESCE(cp2.nome_vendas, cp2.nome))) = UPPER(TRIM(v.vendedor_nome))
    WHERE v.data_emissao >= start_date
      AND v.data_emissao <= end_date
  ),
  filter_vendedores AS (
    SELECT DISTINCT vendedor_nome AS val FROM all_vendas WHERE vendedor_nome IS NOT NULL ORDER BY val
  ),
  filter_unidades AS (
    SELECT DISTINCT unidade_nome AS val FROM all_vendas WHERE unidade_nome != 'Sem Unidade' ORDER BY val
  ),
  filter_familias AS (
    SELECT DISTINCT familia_produto AS val FROM all_vendas WHERE familia_produto != 'Outros' ORDER BY val
  ),
  filter_marcas AS (
    SELECT DISTINCT marca AS val FROM all_vendas WHERE marca != 'Sem Marca' ORDER BY val
  )
  SELECT json_build_object(
    'kpis', (SELECT row_to_json(k) FROM kpis k),
    'chart_diario', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json) FROM daily_acum d),
    'top_familias', (SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json) FROM top_familias f),
    'top_marcas', (SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json) FROM top_marcas m),
    'filtros', json_build_object(
      'vendedores', (SELECT COALESCE(json_agg(val), '[]'::json) FROM filter_vendedores),
      'unidades', (SELECT COALESCE(json_agg(val), '[]'::json) FROM filter_unidades),
      'familias', (SELECT COALESCE(json_agg(val), '[]'::json) FROM filter_familias),
      'marcas', (SELECT COALESCE(json_agg(val), '[]'::json) FROM filter_marcas)
    ),
    'total_periodo', (SELECT COUNT(*) FROM all_vendas)
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: Gerencial Vendas (paginated detail table)
CREATE OR REPLACE FUNCTION rpc_gerencial_vendas(
  p_ano int,
  p_mes int,
  p_unidade text DEFAULT NULL,
  p_vendedor text DEFAULT NULL,
  p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 30
) RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  start_date text;
  end_date text;
  last_day int;
BEGIN
  start_date := p_ano || '-' || LPAD(p_mes::text, 2, '0') || '-01';
  last_day := EXTRACT(DAY FROM (DATE_TRUNC('month', (start_date || ' 00:00:00')::timestamp) + INTERVAL '1 month - 1 day'));
  end_date := p_ano || '-' || LPAD(p_mes::text, 2, '0') || '-' || LPAD(last_day::text, 2, '0');

  WITH filtered AS (
    SELECT
      v.id,
      v.data_emissao,
      v.vendedor_nome,
      COALESCE(cp.unidade, 'Sem Unidade') AS unidade_nome,
      COALESCE(v.familia_produto, 'Outros') AS familia_produto,
      COALESCE(v.marca, 'Sem Marca') AS marca,
      v.descricao_produto,
      v.nota_fiscal,
      parse_brl(v.total_com_desconto::text) AS total_com_desconto,
      parse_brl(v.lucros_reais::text) AS lucros_reais,
      parse_brl(v.margem_percentual::text) AS margem_percentual
    FROM vendas v
    LEFT JOIN controle_pj cp
      ON UPPER(TRIM(COALESCE(cp.nome_vendas, cp.nome))) = UPPER(TRIM(v.vendedor_nome))
    WHERE v.data_emissao >= start_date
      AND v.data_emissao <= end_date
      AND (p_unidade IS NULL OR COALESCE(cp.unidade, 'Sem Unidade') = p_unidade)
      AND (p_vendedor IS NULL OR v.vendedor_nome = p_vendedor)
      AND (p_familia IS NULL OR COALESCE(v.familia_produto, 'Outros') = p_familia)
      AND (p_marca IS NULL OR COALESCE(v.marca, 'Sem Marca') = p_marca)
      AND (p_search IS NULL OR p_search = '' OR
        v.vendedor_nome ILIKE '%' || p_search || '%' OR
        COALESCE(cp.unidade, '') ILIKE '%' || p_search || '%' OR
        COALESCE(v.descricao_produto, '') ILIKE '%' || p_search || '%' OR
        COALESCE(v.familia_produto, '') ILIKE '%' || p_search || '%' OR
        COALESCE(v.marca, '') ILIKE '%' || p_search || '%' OR
        COALESCE(v.nota_fiscal, '') ILIKE '%' || p_search || '%'
      )
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM filtered
  )
  SELECT json_build_object(
    'rows', (
      SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json)
      FROM (
        SELECT * FROM filtered
        ORDER BY data_emissao DESC, id DESC
        OFFSET p_offset LIMIT p_limit
      ) f
    ),
    'total_count', (SELECT cnt FROM total)
  ) INTO result;

  RETURN result;
END;
$$;
