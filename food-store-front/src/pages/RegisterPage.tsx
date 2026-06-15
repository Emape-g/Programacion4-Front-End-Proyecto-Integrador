import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { registerCliente } from '../api/cliente';

export function RegisterPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await registerCliente({
        nombre,
        apellido,
        email,
        password,
        celular: celular.trim() || null,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Cuenta creada. Ahora podes iniciar sesion.' },
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const body = err.response.data as { detail?: string | { msg?: string }[] };
        if (err.response.status === 429) {
          setError('Se alcanzo el limite temporal de registros. Espera unos minutos e intenta nuevamente.');
        } else if (Array.isArray(body.detail)) {
          setError(body.detail.map((item) => item.msg).filter(Boolean).join(', ') || 'No se pudo crear la cuenta.');
        } else {
          setError(body.detail ?? 'No se pudo crear la cuenta.');
        }
      } else {
        setError('No se pudo crear la cuenta.');
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
          Crea tu cuenta para guardar direcciones y hacer pedidos.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#f0f4f8] p-6 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
              Crear cuenta
            </h2>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Registrate como cliente para finalizar pedidos
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={nombre} onChange={(event) => setNombre(event.target.value)} required placeholder="Nombre" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#2a7a8a] focus:ring-2 focus:ring-[#2a7a8a]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                <input value={apellido} onChange={(event) => setApellido(event.target.value)} required placeholder="Apellido" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#2a7a8a] focus:ring-2 focus:ring-[#2a7a8a]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="Email" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#2a7a8a] focus:ring-2 focus:ring-[#2a7a8a]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <input value={celular} onChange={(event) => setCelular(event.target.value)} placeholder="Celular" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#2a7a8a] focus:ring-2 focus:ring-[#2a7a8a]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Contrasena" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#2a7a8a] focus:ring-2 focus:ring-[#2a7a8a]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />

              <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#2a7a8a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#236b7a] disabled:opacity-50">
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
              Ya tenes cuenta? <Link to="/login" className="font-medium text-[#2a7a8a] dark:text-cyan-300">Iniciar sesion</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
