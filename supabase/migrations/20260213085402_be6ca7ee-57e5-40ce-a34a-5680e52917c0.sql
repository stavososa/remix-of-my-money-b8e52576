
ALTER TABLE controle_pj ADD COLUMN nome_vendas text;

-- Pre-popular via vendedores (ponte confiavel)
UPDATE controle_pj cp
SET nome_vendas = v.nome_omie
FROM vendedores v
WHERE v.regime = 'PJ'
  AND LOWER(TRIM(cp.nome)) = LOWER(TRIM(v.nome_completo));
