import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirm-email" element={<ConfirmEmail />} />
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/quarters" element={<ProtectedRoute><Quarters /></ProtectedRoute>} />
              <Route path="/objectives" element={<ProtectedRoute><Objectives /></ProtectedRoute>} />
              <Route path="/kr-checkins" element={<ProtectedRoute><KRCheckins /></ProtectedRoute>} />
              <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
              <Route path="/performance-history" element={<ProtectedRoute><PerformanceHistory /></ProtectedRoute>} />
              <Route path="/prototypes" element={<ProtectedRoute><Prototypes /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
