import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "company" | "candidate";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string, role: UserRole, company?: string) => boolean;
  logout: () => void;
}

const MOCK_USERS: (User & { password: string })[] = [
  { id: "c1", name: "TechCorp HR", email: "company@test.com", password: "password", role: "company", company: "TechCorp" },
  { id: "c2", name: "InnovateLab", email: "innovate@test.com", password: "password", role: "company", company: "InnovateLab" },
  { id: "u1", name: "John Doe", email: "john@test.com", password: "password", role: "candidate" },
  { id: "u2", name: "Jane Smith", email: "jane@test.com", password: "password", role: "candidate" },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState(MOCK_USERS);
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    const found = users.find((u) => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      return true;
    }
    return false;
  };

  const register = (name: string, email: string, password: string, role: UserRole, company?: string): boolean => {
    if (users.find((u) => u.email === email)) return false;
    const newUser = { id: `user-${Date.now()}`, name, email, password, role, company: role === "company" ? (company || name) : undefined };
    setUsers((prev) => [...prev, newUser]);
    const { password: _, ...userData } = newUser;
    setUser(userData);
    return true;
  };

  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
