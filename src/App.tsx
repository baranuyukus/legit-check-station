import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Verify from "./pages/Verify.tsx";
import Auth from "./pages/Auth.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Account from "./pages/Account.tsx";
import Claim from "./pages/Claim.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import CertificateForm from "./pages/admin/CertificateForm.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminTransfers from "./pages/admin/AdminTransfers.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/verify/:code" element={<Verify />} />
            <Route path="/claim/:token" element={<Claim />} />
            <Route path="/giris" element={<Login />} />
            <Route path="/kayit" element={<Register />} />
            <Route path="/hesabim" element={<Account />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/certificates/new" element={<CertificateForm />} />
            <Route path="/admin/certificates/:id" element={<CertificateForm />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
