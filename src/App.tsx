import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { JobProvider } from "@/contexts/JobContext";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PostJobPage from "./pages/PostJobPage";
import CompanyJobsPage from "./pages/CompanyJobsPage";
import CompanyJobDetailPage from "./pages/CompanyJobDetailPage";
import BrowseJobsPage from "./pages/BrowseJobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import CandidateApplicationsPage from "./pages/CandidateApplicationsPage";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      {/* Public job pages */}
      <Route path="/jobs" element={<BrowseJobsPage />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />

      {/* Dashboard layout for authenticated users */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Company routes */}
        <Route path="/company/post-job" element={<ProtectedRoute role="company"><PostJobPage /></ProtectedRoute>} />
        <Route path="/company/jobs" element={<ProtectedRoute role="company"><CompanyJobsPage /></ProtectedRoute>} />
        <Route path="/company/jobs/:id" element={<ProtectedRoute role="company"><CompanyJobDetailPage /></ProtectedRoute>} />

        {/* Candidate routes inside dashboard */}
        <Route path="/candidate/applications" element={<ProtectedRoute role="candidate"><CandidateApplicationsPage /></ProtectedRoute>} />
        
        {/* Candidate browse jobs inside dashboard */}
        <Route path="/candidate/jobs" element={<ProtectedRoute role="candidate"><BrowseJobsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <JobProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </JobProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
