import { createContext } from 'react';
import type { Usuario } from '../types/store';

export type AuthUser = Usuario;

export interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
