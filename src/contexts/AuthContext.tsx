import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { apiGet, apiPost, clearTokens, setTokens } from "@/lib/api";

export type UserRole = "recruiter" | "candidate";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_name?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole, companyName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const me = await apiGet<User>("/api/v1/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await refreshMe();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiPost<{ access_token: string; refresh_token: string; user: User }>(
        "/api/v1/auth/login",
        { email, password },
        { auth: false },
      );
      setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    companyName?: string,
  ): Promise<boolean> => {
    try {
      const payload =
        role === "recruiter"
          ? { name, email, password, role, company_name: companyName }
          : { name, email, password, role };

      const data = await apiPost<{ access_token: string; refresh_token: string; user: User }>(
        "/api/v1/auth/register",
        payload,
        { auth: false },
      );
      setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiPost("/api/v1/auth/logout", undefined);
    } catch {
      // ignore network errors; still clear local session
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
