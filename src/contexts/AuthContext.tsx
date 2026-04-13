import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

// Mapeamento fixo de email → nome da filial (deve coincidir com unidades.nome)
const GERENTE_FILIAL_MAP: Record<string, string> = {
  'matrizatacadao@proton.me': 'MATRIZ',
  'recreioatacadao@proton.me': 'RECREIO',
};

interface UserProfile {
  user: User | null;
  role: 'admin' | 'vendedor' | 'gerente' | null;
  vendedor_id: string | null;
  nome_completo: string | null;
  unidade_nome: string | null;
  unidade_tipo: string | null;
  regime: string | null;
  filial_gerente: string | null; // nome da filial para gerentes
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<UserProfile>({
  user: null, role: null, vendedor_id: null, nome_completo: null,
  unidade_nome: null, unidade_tipo: null, regime: null, filial_gerente: null,
  loading: true, signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'vendedor' | 'gerente' | null>(null);
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [nomeCompleto, setNomeCompleto] = useState<string | null>(null);
  const [unidadeNome, setUnidadeNome] = useState<string | null>(null);
  const [unidadeTipo, setUnidadeTipo] = useState<string | null>(null);
  const [regime, setRegime] = useState<string | null>(null);
  const [filialGerente, setFilialGerente] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User) => {
    try {
      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('role, vendedor_id')
        .eq('id', u.id)
        .maybeSingle();

      if (perfilError) {
        console.error('Erro ao buscar perfil (RLS?):', perfilError.message);
        setRole('admin');
        setNomeCompleto(u.email ?? null);
        setLoading(false);
        return;
      }

      if (!perfil) {
        // Auto-detect gerente by email even without perfis record
        const email = u.email?.toLowerCase() ?? '';
        if (GERENTE_FILIAL_MAP[email]) {
          setRole('gerente');
          setFilialGerente(GERENTE_FILIAL_MAP[email]);
          setNomeCompleto(u.email ?? null);
        } else {
          setRole(null);
        }
        setLoading(false);
        return;
      }

      const detectedRole = perfil.role as string;
      if (detectedRole === 'gerente') {
        setRole('gerente');
        const email = u.email?.toLowerCase() ?? '';
        setFilialGerente(GERENTE_FILIAL_MAP[email] ?? null);
        setNomeCompleto(u.email ?? null);
      } else {
        setRole(detectedRole as 'admin' | 'vendedor');
      }

      setVendedorId(perfil.vendedor_id);

      if (perfil.vendedor_id) {
        const { data: vendedor } = await supabase
          .from('vendedores')
          .select('id, nome_completo, email, regime, setor, unidade_id, unidades(nome, tipo)')
          .eq('id', perfil.vendedor_id)
          .maybeSingle();

        if (vendedor) {
          setNomeCompleto(vendedor.nome_completo);
          setRegime(vendedor.regime);
          const unidade = vendedor.unidades as unknown as { nome: string; tipo: string } | null;
          if (unidade) {
            setUnidadeNome(unidade.nome);
            setUnidadeTipo(unidade.tipo);
          }
        }
      } else if (detectedRole !== 'gerente') {
        setNomeCompleto(u.email ?? null);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearState = () => {
    setUser(null); setRole(null); setVendedorId(null);
    setNomeCompleto(null); setUnidadeNome(null); setUnidadeTipo(null);
    setRegime(null); setFilialGerente(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setTimeout(() => loadProfile(session.user), 0);
      } else {
        clearState();
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearState();
  };

  return (
    <AuthContext.Provider value={{
      user, role, vendedor_id: vendedorId, nome_completo: nomeCompleto,
      unidade_nome: unidadeNome, unidade_tipo: unidadeTipo, regime,
      filial_gerente: filialGerente, loading, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
