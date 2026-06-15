import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/axiosClient';
import { getPerfil } from '../api/cliente';
import { useAuthStore } from '../store/authStore';
import type { TokenResponse } from '../types/store';
import { defaultPathForUser, isClientUser } from '../utils/roles';

export function LoginPage() {
  const { login } = useAuth();
  const setSession = useAuthStore((store) => store.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { redirectTo?: string; message?: string } | null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post<TokenResponse>('/auth/login', { email, password });
      setSession(res.data);
      const perfil = await getPerfil();
      login(perfil);
      const redirectTo = isClientUser(perfil)
        ? state?.redirectTo || defaultPathForUser(perfil)
        : defaultPathForUser(perfil);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const body = err.response.data as { detail?: string };
        setError(body.detail ?? 'Credenciales invalidas');
      } else {
        setError(err instanceof Error ? err.message : 'Error al iniciar sesion');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-80 flex-shrink-0 flex-col items-center justify-center bg-[#1a3a4a] p-10 text-white lg:flex">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2a7a8a]">
          <Leaf size={32} />
        </div>
        <h1 className="mb-3 text-3xl font-bold">FoodStore</h1>
        <p className="text-center text-sm leading-relaxed text-white/60">
          Sistema de gestion de ingredientes y stock
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#f0f4f8] p-6 dark:bg-gray-900">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
              Iniciar sesion
            </h2>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Ingresa tus credenciales para continuar
            </p>

            {state?.message && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
                {state.message}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#2a7a8a] focus:ring-2 focus:ring-[#2a7a8a]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contrasena
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="********"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-[#2a7a8a] focus:ring-2 focus:ring-[#2a7a8a]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#2a7a8a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#236b7a] disabled:opacity-50"
              >
                {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
              No tenes cuenta?{' '}
              <Link to="/register" className="font-medium text-[#2a7a8a] dark:text-cyan-300">
                Crear cuenta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
