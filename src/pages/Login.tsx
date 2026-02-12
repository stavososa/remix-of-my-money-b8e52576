import { useState } from 'react';
import logoImg from '@/assets/logo-atacadao-maromba.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Email ou senha inválidos');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0D1F3C 100%)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <img src={logoImg} alt="Atacadão Maromba" className="h-14 w-auto mx-auto" />
          <p className="text-secondary-foreground text-sm">Painel de Comissões</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
          <div>
            <label className="text-sm text-secondary-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm text-secondary-foreground mb-1 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              className="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold rounded-md py-2.5 text-sm hover:brightness-110 transition disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
