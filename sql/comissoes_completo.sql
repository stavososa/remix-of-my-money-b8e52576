-- =============================================
-- TABELA COMISSOES - SCHEMA COMPLETO
-- =============================================

-- 1. Limpar dados antigos (tabela vazia mesmo)
TRUNCATE TABLE public.comissoes;

-- 2. Adicionar todas as colunas necessárias
ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS regime text NOT NULL DEFAULT 'PJ',
  ADD COLUMN IF NOT EXISTS tipo_unidade text,
  ADD COLUMN IF NOT EXISTS produto text,
  ADD COLUMN IF NOT EXISTS min_faturamento numeric,
  ADD COLUMN IF NOT EXISTS periodo_ano int NOT NULL DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS periodo_mes int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS criado_por uuid;

-- 3. Coluna calculada de prioridade
ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS prioridade int GENERATED ALWAYS AS (
    CASE
      WHEN produto IS NOT NULL THEN 4
      WHEN familia_produto IS NOT NULL AND marca IS NOT NULL THEN 3
      WHEN marca IS NOT NULL THEN 2
      WHEN familia_produto IS NOT NULL THEN 1
      ELSE 0
    END
  ) STORED;

-- 4. Índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_comissoes_unique_combo ON comissoes (
  periodo_ano, periodo_mes, regime,
  COALESCE(tipo_unidade, ''),
  COALESCE(familia_produto, ''),
  COALESCE(marca, ''),
  COALESCE(produto, ''),
  COALESCE(min_faturamento::text, '')
) WHERE ativo = true;

-- 5. RLS policies
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comissoes' AND policyname = 'comissoes_select_auth') THEN
    CREATE POLICY "comissoes_select_auth" ON public.comissoes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comissoes' AND policyname = 'comissoes_insert_auth') THEN
    CREATE POLICY "comissoes_insert_auth" ON public.comissoes FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comissoes' AND policyname = 'comissoes_update_auth') THEN
    CREATE POLICY "comissoes_update_auth" ON public.comissoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comissoes' AND policyname = 'comissoes_delete_auth') THEN
    CREATE POLICY "comissoes_delete_auth" ON public.comissoes FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- =============================================
-- INSERIR REGRAS DE MARÇO 2026
-- =============================================

-- 🦅 10% THERMO-X
INSERT INTO comissoes (nome, regime, familia_produto, marca, produto, percentual, periodo_ano, periodo_mes) VALUES
('Thermo-X 10%', 'PJ', 'TERMOGENICO', 'DCX ABSOLUT', NULL, 10, 2026, 3);

-- 10% Beta Alanina
INSERT INTO comissoes (nome, regime, familia_produto, marca, produto, percentual, periodo_ano, periodo_mes) VALUES
('Beta Alanina 10%', 'PJ', 'BETA ALANINA', NULL, NULL, 10, 2026, 3);

-- 10% L-Carnitina DCX
INSERT INTO comissoes (nome, regime, familia_produto, marca, produto, percentual, periodo_ano, periodo_mes) VALUES
('L-Carnitina DCX 10%', 'PJ', 'L-CARNITINA', 'DCX ABSOLUT', NULL, 10, 2026, 3);

-- 💥 5% PRODUTOS ESPECIAIS
INSERT INTO comissoes (nome, regime, produto, percentual, periodo_ano, periodo_mes) VALUES
('Ares Frutas 5%', 'PJ', 'ARES FRUTAS AMARELAS 300G - DCX', 5, 2026, 3),
('Ares Maçã 5%', 'PJ', 'ARES MAÇÃ VERDE 300G - DCX', 5, 2026, 3),
('Diuretic 5%', 'PJ', 'DIURETIC 120 CAPSULAS - DCX', 5, 2026, 3),
('Testo1000 5%', 'PJ', 'TESTO 1000 120CAPS - DCX', 5, 2026, 3),
('Inib-X 60caps 5%', 'PJ', 'INIB-X 60 CAPSULAS - DCX', 5, 2026, 3),
('Thermo Up 5%', 'PJ', 'THERMO UP 420MG 120CAPS - DCX', 5, 2026, 3),
('Hazak 5%', 'PJ', 'HAZAK 120CAPS - DCX', 5, 2026, 3),
('Kratos Black 5%', 'PJ', 'KRATOS BLACK 300G - DCX', 5, 2026, 3),
('T-Dala X 5%', 'PJ', 'T-DALA X 120CAPS - DCX', 5, 2026, 3),
('CoQ10 5%', 'PJ', 'COQ 10 60 CAPS LEVE VIDA - ABSOLUT', 5, 2026, 3);

-- 🔹 4% MARCAS PRÓPRIAS
INSERT INTO comissoes (nome, regime, marca, percentual, periodo_ano, periodo_mes) VALUES
('DCX Absolut 4%', 'PJ', 'DCX ABSOLUT', 4, 2026, 3),
('DCX Bioghen 4%', 'PJ', 'DCX BIOGHEN', 4, 2026, 3),
('DCX 4%', 'PJ', 'DCX', 4, 2026, 3),
('Grow Up 4%', 'PJ', 'GROW UP', 4, 2026, 3),
('Synthesize 4%', 'PJ', 'SYNTHESIZE', 4, 2026, 3);

-- 🔹 2.5% CREATINAS 300g
INSERT INTO comissoes (nome, regime, produto, percentual, periodo_ano, periodo_mes) VALUES
('Creatina BlackSkull 2.5%', 'PJ', 'CREATINA 100% PURA 300G POTE - BLACK SKULL', 2.5, 2026, 3),
('Creatina DCX 2.5%', 'PJ', 'CREATINA 100% PURA 300G - DCX', 2.5, 2026, 3);

-- 🔹 3.5% Whey Mix GrowUp e Isolate GrowUp
INSERT INTO comissoes (nome, regime, produto, percentual, periodo_ano, periodo_mes) VALUES
('Whey Mix GrowUp 3.5%', 'PJ', 'WHEY MIX PROTEIN 900G - GROW UP', 3.5, 2026, 3),
('Isolate GrowUp 3.5%', 'PJ', 'WHEY ISOLATE 900G - GROW UP', 3.5, 2026, 3);

-- 🔹 3% Whey Synthesize e Absolut
INSERT INTO comissoes (nome, regime, produto, percentual, periodo_ano, periodo_mes) VALUES
('Whey Synthesize Baunilha 3%', 'PJ', '100% WHEY PROTEIN CONCENTRATED BAUNILHA 907G - SYNTHESIZE', 3, 2026, 3),
('Whey Synthesize Choc 3%', 'PJ', '100% WHEY PROTEIN CONCENTRATED CHOCOLATE 907G - SYNTHESIZE', 3, 2026, 3),
('Whey Synthesize Cookies 3%', 'PJ', '100% WHEY PROTEIN CONCENTRATED COOKIES N CREAM 907G - SYNTHESIZE', 3, 2026, 3),
('Whey High Protein Absolut 3%', 'PJ', 'WHEY HIGH PROTEIN 900G - ABSOLUT', 3, 2026, 3);

-- 🔹 2% Wheys/Proteínas marcas próprias
INSERT INTO comissoes (nome, regime, familia_produto, marca, percentual, periodo_ano, periodo_mes) VALUES
('Whey DCX 2%', 'PJ', 'WHEY PROTEIN', 'DCX ABSOLUT', 2, 2026, 3),
('Whey Synthesize 2%', 'PJ', 'WHEY PROTEIN', 'SYNTHESIZE', 2, 2026, 3),
('Proteína DCX 2%', 'PJ', 'PROTEÍNA', 'DCX ABSOLUT', 2, 2026, 3),
('Proteína Synthesize 2%', 'PJ', 'PROTEÍNA', 'SYNTHESIZE', 2, 2026, 3),
('Albumina DCX 2%', 'PJ', 'ALBUMINA', 'DCX ABSOLUT', 2, 2026, 3),
('Whey GrowUp 2%', 'PJ', 'WHEY PROTEIN', 'GROW UP', 2, 2026, 3),
('Proteína GrowUp 2%', 'PJ', 'PROTEÍNA', 'GROW UP', 2, 2026, 3);

-- 🔹 3% VESTUÁRIO e ACESSÓRIOS
INSERT INTO comissoes (nome, regime, familia_produto, percentual, periodo_ano, periodo_mes) VALUES
('Vestuário 3%', 'PJ', 'VESTUARIO', 3, 2026, 3),
('Acessórios 3%', 'PJ', 'ACESSÓRIOS E UTILIDADES', 3, 2026, 3),
('Camisa 3%', 'PJ', 'CAMISA', 3, 2026, 3);

-- 🔹 5% VESTUÁRIO (>R$7.500 faturamento)
INSERT INTO comissoes (nome, regime, familia_produto, percentual, min_faturamento, periodo_ano, periodo_mes) VALUES
('Vestuário 5% (>R$7.500)', 'PJ', 'VESTUARIO', 5, 7500, 2026, 3),
('Acessórios 5% (>R$7.500)', 'PJ', 'ACESSÓRIOS E UTILIDADES', 5, 7500, 2026, 3),
('Camisa 5% (>R$7.500)', 'PJ', 'CAMISA', 5, 7500, 2026, 3);

-- 🔹 1.25% REGRA GENÉRICA
INSERT INTO comissoes (nome, regime, percentual, periodo_ano, periodo_mes) VALUES
('Outras marcas 1.25%', 'PJ', 1.25, 2026, 3);
