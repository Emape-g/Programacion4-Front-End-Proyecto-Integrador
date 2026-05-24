import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface AuthUser {
  sub?: string | number;
  email?: string;
  name?: string;
  exp?: number;
  [key: string]: unknown;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJWT(token: string): AuthUser {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = localStorage.getItem('access_token');

  const [token, setToken] = useState<string | null>(stored);
  const [user, setUser] = useState<AuthUser | null>(
    stored ? decodeJWT(stored) : null
  );

  function login(newToken: string) {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    setUser(decodeJWT(newToken));
  }

  function logout() {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}