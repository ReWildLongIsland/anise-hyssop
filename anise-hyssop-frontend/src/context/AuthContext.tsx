import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";

interface Volunteer {
  VolunteerID: string;
  Email: string;
  FirstName: string;
  LastName: string;
  GlobalRole: string;
  Status: string;
  isAdult: string;
  [key: string]: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Volunteer | null;
  isNewUser: boolean;
  getAccessToken: () => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    getAccessTokenSilently,
    logout: auth0Logout,
  } = useAuth0();

  const [user, setUser] = useState<Volunteer | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [meLoading, setMeLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setIsNewUser(false);
      return;
    }

    const fetchMe = async () => {
      setMeLoading(true);
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.isNewUser) {
          setIsNewUser(true);
          setUser(null);
        } else {
          setIsNewUser(false);
          setUser(data.volunteer);
        }
      } catch (err) {
        console.error("Failed to fetch /api/auth/me", err);
      } finally {
        setMeLoading(false);
      }
    };

    fetchMe();
  }, [isAuthenticated, getAccessTokenSilently]);

  const getAccessToken = () => getAccessTokenSilently();

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  const isLoading = auth0Loading || meLoading;

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, user, isNewUser, getAccessToken, logout }}
    >
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
