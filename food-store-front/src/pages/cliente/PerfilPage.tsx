import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Home, MapPin, Plus, Save, Star, Trash2 } from 'lucide-react';
import {
  createDireccion,
  deleteDireccion,
  getMisDirecciones,
  getPerfil,
  setDireccionPrincipal,
  updateDireccion,
  updatePerfil,
} from '../../api/cliente';
import { useAuth } from '../../hooks/useAuth';
import type { DireccionEntrega, DireccionPayload } from '../../types/store';

const emptyDireccion: DireccionPayload = {
  alias: '',
  linea1: '',
  linea2: '',
  ciudad: '',
  provincia: '',
  codigo_postal: '',
  es_principal: false,
};

function direccionTexto(direccion: DireccionEntrega) {
  return [direccion.linea1, direccion.linea2, direccion.ciudad, direccion.provincia, direccion.codigo_postal]
    .filter(Boolean)
    .join(', ');
}

export function PerfilPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const locationState = location.state as { alert?: string } | null;
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [apellido, setApellido] = useState(user?.apellido ?? '');
  const [celular, setCelular] = useState((user?.celular as string | undefined) ?? '');
  const [direcciones, setDirecciones] = useState<DireccionEntrega[]>([]);
  const [form, setForm] = useState<DireccionPayload>(emptyDireccion);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [message, setMessage] = useState(locationState?.alert ?? '');
  const [error, setError] = useState('');

  async function reloadDirecciones() {
    const data = await getMisDirecciones();
    setDirecciones(data);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [perfil, dirs] = await Promise.all([getPerfil(), getMisDirecciones()]);
        if (cancelled) return;
        login(perfil);
        setNombre(perfil.nombre);
        setApellido(perfil.apellido);
        setCelular(perfil.celular ?? '');
        setDirecciones(dirs);
      } catch {
        if (!cancelled) setError('No se pudo cargar el perfil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [login]);

  async function savePerfil() {
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      const updated = await updatePerfil({ nombre, apellido, celular: celular || null });
      login(updated);
      setMessage('Perfil actualizado.');
    } catch {
      setError('No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  function editDireccion(direccion: DireccionEntrega) {
    setEditingId(direccion.id);
    setForm({
      alias: direccion.alias ?? '',
      linea1: direccion.linea1,
      linea2: direccion.linea2 ?? '',
      ciudad: direccion.ciudad,
      provincia: direccion.provincia ?? '',
      codigo_postal: direccion.codigo_postal ?? '',
      es_principal: direccion.es_principal,
    });
  }

  function resetDireccion() {
    setEditingId(null);
    setForm(emptyDireccion);
  }

  async function saveDireccion() {
    if (!form.linea1.trim() || !form.ciudad.trim()) {
      setError('La direccion y la ciudad son obligatorias.');
      return;
    }

    setSavingAddress(true);
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await updateDireccion(editingId, form);
      } else {
        await createDireccion({ ...form, es_principal: form.es_principal || direcciones.length === 0 });
      }
      await reloadDirecciones();
      resetDireccion();
      setMessage('Direccion guardada.');
    } catch {
      setError('No se pudo guardar la direccion.');
    } finally {
      setSavingAddress(false);
    }
  }

  async function marcarPrincipal(id: number) {
    setError('');
    setMessage('');
    try {
      await setDireccionPrincipal(id);
      await reloadDirecciones();
      setMessage('Direccion principal actualizada.');
    } catch {
      setError('No se pudo marcar la direccion principal.');
    }
  }

  async function eliminarDireccion(id: number) {
    const ok = window.confirm('Eliminar esta direccion?');
    if (!ok) return;
    setError('');
    setMessage('');
    try {
      await deleteDireccion(id);
      await reloadDirecciones();
      setMessage('Direccion eliminada.');
    } catch {
      setError('No se pudo eliminar la direccion.');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Actualiza tus datos y administra tus direcciones de entrega.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check size={16} />
          {message}
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Home size={19} />
            Datos personales
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Apellido</label>
              <input
                value={apellido}
                onChange={(event) => setApellido(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Celular</label>
              <input
                value={celular}
                onChange={(event) => setCelular(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                value={user?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              />
            </div>
            <button
              disabled={savingProfile || loading}
              onClick={savePerfil}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2a7a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#236b7a] disabled:opacity-50"
            >
              <Save size={16} />
              {savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <MapPin size={19} />
              {editingId ? 'Editar direccion' : 'Agregar direccion'}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.alias ?? ''}
                onChange={(event) => setForm({ ...form, alias: event.target.value })}
                placeholder="Alias, ej: Casa"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <input
                value={form.linea1}
                onChange={(event) => setForm({ ...form, linea1: event.target.value })}
                placeholder="Direccion"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <input
                value={form.linea2 ?? ''}
                onChange={(event) => setForm({ ...form, linea2: event.target.value })}
                placeholder="Piso, depto, referencia"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <input
                value={form.ciudad}
                onChange={(event) => setForm({ ...form, ciudad: event.target.value })}
                placeholder="Ciudad"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <input
                value={form.provincia ?? ''}
                onChange={(event) => setForm({ ...form, provincia: event.target.value })}
                placeholder="Provincia"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <input
                value={form.codigo_postal ?? ''}
                onChange={(event) => setForm({ ...form, codigo_postal: event.target.value })}
                placeholder="Codigo postal"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.es_principal}
                onChange={(event) => setForm({ ...form, es_principal: event.target.checked })}
              />
              Usar como direccion principal
            </label>
            <div className="mt-4 flex gap-2">
              <button
                disabled={savingAddress}
                onClick={saveDireccion}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2a7a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#236b7a] disabled:opacity-50"
              >
                <Plus size={16} />
                {savingAddress ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
              </button>
              {editingId && (
                <button
                  onClick={resetDireccion}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {direcciones.map((direccion) => (
              <article
                key={direccion.id}
                className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {direccion.alias || 'Direccion'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{direccionTexto(direccion)}</p>
                  </div>
                  {direccion.es_principal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <Star size={12} />
                      Principal
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => editDireccion(direccion)} className="text-sm font-medium text-[#2a7a8a]">
                    Editar
                  </button>
                  {!direccion.es_principal && (
                    <button onClick={() => marcarPrincipal(direccion.id)} className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Hacer principal
                    </button>
                  )}
                  <button onClick={() => eliminarDireccion(direccion.id)} className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
