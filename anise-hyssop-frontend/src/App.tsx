import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Registration from "./pages/Registration";
import Portal from "./pages/Portal";
import AdminDashboard from "./pages/AdminDashboard";
import Navigation from "./components/Navigation";

function Spinner() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#2D5A27] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { isAuthenticated, isLoading, isNewUser, user } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (isNewUser) return <Navigate to="/register" replace />;
  if (requireAdmin && user?.GlobalRole !== "Admin") return <Navigate to="/portal" replace />;

  return <Navigation>{children}</Navigation>;
}

function RegistrationRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isNewUser } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isNewUser) return <Navigate to="/portal" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/register"
            element={
              <RegistrationRoute>
                <Registration />
              </RegistrationRoute>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
