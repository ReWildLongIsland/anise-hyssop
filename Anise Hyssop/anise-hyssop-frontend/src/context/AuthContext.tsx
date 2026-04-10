import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => void;
  checkEmail: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const checkEmail = async (email: string) => {
    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error("Failed to check email", error);
      return false;
    }
  };

  const login = async (email: string, password?: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password || "mock-password" }),
      });
      const data = await response.json();
      
      if (data.isNewUser) {
        // For new users, we just set the email in local storage to simulate the "verified" state
        // before they complete the full registration flow.
        const partialUser = { email: data.email, isNewUser: true };
        localStorage.setItem("auth_user", JSON.stringify(partialUser));
        setUser(partialUser);
        setIsAuthenticated(true);
        return true;
      } else {
        if (data.user) {
          localStorage.setItem("auth_user", JSON.stringify(data.user));
          setUser(data.user);
          setIsAuthenticated(true);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_user");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, checkSession, checkEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
