-- ============================================
-- Audit system for comissoes (commission rules)
-- Run this on your external Supabase instance
-- ============================================

-- 1. Add audit columns to comissoes table
ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS atualizado_por uuid,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS criado_em timestamptz DEFAULT now();

-- 2. Create audit log table
CREATE TABLE IF NOT EXISTS public.comissoes_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comissao_id uuid,
  acao text NOT NULL CHECK (acao IN ('criou', 'editou', 'excluiu', 'excluiu_lote')),
  usuario_id uuid,
  usuario_email text,
  detalhes jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_comissoes_audit_comissao_id ON public.comissoes_audit(comissao_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_audit_created_at ON public.comissoes_audit(created_at DESC);

-- 4. Enable RLS on audit table
ALTER TABLE public.comissoes_audit ENABLE ROW LEVEL SECURITY;

-- 5. Policies - admins only
CREATE POLICY "Admins can read audit logs"
  ON public.comissoes_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
  ON public.comissoes_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
