import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { RequireAuth, RequireAdmin, RedirectByRole } from "@/components/auth/RouteGuards";
import Login from "./pages/Login";
import Ranking from "./pages/Ranking";
import MeuPainel from "./pages/MeuPainel";
import Gerencial from "./pages/Gerencial";
import AdminRegras from "./pages/AdminRegras";
import AdminImportar from "./pages/AdminImportar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PeriodProvider>
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
          </PeriodProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
