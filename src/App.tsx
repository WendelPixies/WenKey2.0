import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail from "./pages/ConfirmEmail";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  
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
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirm-email" element={<ConfirmEmail />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/quarters" element={<ProtectedRoute><Quarters /></ProtectedRoute>} />
              <Route path="/objectives" element={<ProtectedRoute><Objectives /></ProtectedRoute>} />
              <Route path="/kr-checkins" element={<ProtectedRoute><KRCheckins /></ProtectedRoute>} />
              <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
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
