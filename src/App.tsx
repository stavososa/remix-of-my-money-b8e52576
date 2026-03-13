import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { RequireAuth, RequireAdmin, RedirectByRole } from "@/components/auth/RouteGuards";

// Lazy loaded pages — code splitting para reduzir bundle inicial
const Login = lazy(() => import("./pages/Login"));
const Ranking = lazy(() => import("./pages/Ranking"));
const MeuPainel = lazy(() => import("./pages/MeuPainel"));
const Gerencial = lazy(() => import("./pages/Gerencial"));
const AdminRegras = lazy(() => import("./pages/AdminRegras"));
const AdminImportar = lazy(() => import("./pages/AdminImportar"));
const NotFound = lazy(() => import("./pages/NotFound"));

// QueryClient otimizado: cache de 2min, mantém dados 10min, sem retry em erros 4xx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // dados frescos por 2 minutos
      gcTime: 10 * 60 * 1000,          // mantém cache por 10 minutos
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,     // evita recargas ao trocar de aba
    },
  },
});

// Fallback de carregamento suave entre rotas
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PeriodProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RequireAuth><RedirectByRole /></RequireAuth>} />
                <Route path="/ranking" element={<RequireAuth><Ranking /></RequireAuth>} />
                <Route path="/meu-painel" element={<RequireAuth><MeuPainel /></RequireAuth>} />
                <Route path="/gerencial" element={<RequireAuth><RequireAdmin><Gerencial /></RequireAdmin></RequireAuth>} />
                <Route path="/admin/regras" element={<RequireAuth><RequireAdmin><AdminRegras /></RequireAdmin></RequireAuth>} />
                <Route path="/admin/importar" element={<RequireAuth><RequireAdmin><AdminImportar /></RequireAdmin></RequireAuth>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PeriodProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
