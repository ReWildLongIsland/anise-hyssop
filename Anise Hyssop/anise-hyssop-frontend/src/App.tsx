import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Registration from "./pages/Registration";
import Portal from "./pages/Portal";
import AdminDashboard from "./pages/AdminDashboard";
import Navigation from "./components/Navigation";

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // If user is authenticated but hasn't completed registration, force them to registration
  if (user?.isNewUser) {
    return <Navigate to="/register" replace />;
  }

  if (requireAdmin && user?.globalRole !== "Admin") {
    return <Navigate to="/portal" replace />;
  }

  return <Navigation>{children}</Navigation>;
}

function RegistrationRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // If user is already fully registered, send them to portal
  if (!user?.isNewUser) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/registration" element={<Registration />} />
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
