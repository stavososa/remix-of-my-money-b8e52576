import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (role !== 'admin') return <Navigate to="/meu-painel" replace />;
  return <>{children}</>;
}

export function RequireAdminOrGerente({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (role !== 'admin' && role !== 'gerente') return <Navigate to="/meu-painel" replace />;
  return <>{children}</>;
}

export function RedirectByRole() {
  const { role, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (role === 'admin') return <Navigate to="/gerencial" replace />;
  if (role === 'gerente') return <Navigate to="/gerencial" replace />;
  return <Navigate to="/meu-painel" replace />;
}
