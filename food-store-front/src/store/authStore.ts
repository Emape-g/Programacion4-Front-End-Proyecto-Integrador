import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TokenResponse, Usuario } from '../types/store';

interface AuthStore {
  accessToken: string | null;
  user: Usuario | null;
  isAuthenticated: boolean;
  setSession: (tokens: TokenResponse, user?: Usuario | null) => void;
  setUser: (user: Usuario | null) => void;
  setAccessToken: (token: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setSession: (tokens, user = null) =>
        set({ accessToken: tokens.access_token, user, isAuthenticated: true }),
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      setAccessToken: (accessToken) => set({ accessToken, isAuthenticated: Boolean(accessToken) }),
      clearSession: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'foodstore_auth',
      partialize: (state) => ({ accessToken: state.accessToken }),
    },
  ),
);
