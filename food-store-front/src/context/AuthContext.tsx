import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../api/axiosClient';

export interface AuthUser {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  roles: string[];
  [key: string]: unknown;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  function login(userData: AuthUser) {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  async function logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // cookie may already be expired
    }
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
