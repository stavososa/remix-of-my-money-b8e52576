-- =============================================
-- ADICIONAR COLUNA min_faturamento
-- =============================================
ALTER TABLE regras_comissao
  ADD COLUMN IF NOT EXISTS min_faturamento numeric DEFAULT NULL;

-- =============================================
-- REGRA: Vestuário 5% (acima de R$7.500 de faturamento)
-- Estas regras têm prioridade 1 (Família) igual às regras de 3%,
-- mas o sistema resolverRegra escolhe a de 5% quando o vendedor
-- atingir o faturamento mínimo de R$7.500
-- =============================================
INSERT INTO regras_comissao (nome, regime, familia_produto, percentual, min_faturamento, periodo_ano, periodo_mes) VALUES
('Vestuário 5% (>R$7.500)', 'PJ', 'VESTUARIO', 5, 7500, 2026, 3),
('Acessórios 5% (>R$7.500)', 'PJ', 'ACESSÓRIOS E UTILIDADES', 5, 7500, 2026, 3),
('Camisa 5% (>R$7.500)', 'PJ', 'CAMISA', 5, 7500, 2026, 3);
