import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (!accessToken || user) return;
    let active = true;
    apiClient
      .get<AuthUser>('/auth/me')
      .then((response) => {
        if (active) setUser(response.data);
      })
      .catch(() => {
        if (active) clearSession();
      });
    return () => {
      active = false;
    };
  }, [accessToken, user, setUser, clearSession]);

  const login = useCallback((userData: AuthUser) => setUser(userData), [setUser]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // La sesión local se limpia aunque la cookie ya haya vencido.
    }
    clearSession();
    window.location.assign('/hacer-pedido');
  }, [clearSession]);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
