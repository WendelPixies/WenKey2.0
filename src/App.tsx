import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider, useCompany } from "@/contexts/CompanyContext"; // Adicionado useCompany
import { useUserRole } from "@/hooks/useUserRole"; // Adicionado
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Users from "./pages/Users";
import Quarters from "./pages/Quarters";
import Objectives from "./pages/Objectives";
import KRCheckins from "./pages/KRCheckins";
import Profile from "./pages/Profile";
import Overview from "./pages/Overview";
import PerformanceHistory from "./pages/PerformanceHistory";
import Prototypes from "./pages/Prototypes";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail from "./pages/ConfirmEmail";
import PendingApproval from "./pages/PendingApproval";

import { CompanySelectionModal } from "@/components/CompanySelectionModal";
import { AppLayout } from "@/components/AppLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { selectedCompany } = useCompany();
  const location = useLocation();

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Se o usuário não está ativo, redireciona para a página de espera
  // Permitimos acesso à página de pending-approval mesmo se inativo
  if (profile && !profile.is_active && location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }

  // Se o usuário é Admin e não tem empresa selecionada, não renderiza o conteúdo (AppLayout)
  // O CompanySelectionModal (que está fora das rotas) será exibido por cima
  if (role === 'admin' && !selectedCompany) {
    return (
      <div className="min-h-screen bg-background" /> // Fundo vazio enquanto o modal é exibido
    );
  }

  return <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <CompanySelectionModal />
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirm-email" element={<ConfirmEmail />} />

              {/* Pending Approval (Standalone) */}
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />

              {/* Protected Routes with Sidebar Layout */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/users" element={<Users />} />
                <Route path="/quarters" element={<Quarters />} />
                <Route path="/objectives" element={<Objectives />} />
                <Route path="/kr-checkins" element={<KRCheckins />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/performance-history" element={<PerformanceHistory />} />
                <Route path="/prototypes" element={<Prototypes />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
