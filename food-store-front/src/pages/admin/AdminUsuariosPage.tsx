import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { asignarRol, createUsuarioAdmin, deleteUsuario, getRoles, getUsuarios, quitarRol } from '../../api/cliente';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import type { AppRole, Usuario } from '../../types/store';

interface Rol {
  codigo: string;
  nombre: string;
}

export function AdminUsuariosPage() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', celular: '', password: '', roles: ['CLIENT'] as string[] });
  const queryClient = useQueryClient();

  const usuariosQuery = useQuery({ queryKey: ['admin-usuarios'], queryFn: () => getUsuarios() });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: getRoles });
  const usuarios = usuariosQuery.data?.data ?? [];
  const roles = (rolesQuery.data ?? []) as Rol[];
  const loading = usuariosQuery.isLoading || rolesQuery.isLoading;

  async function toggleRol(usuario: Usuario, rol: AppRole) {
    setError('');
    setMessage('');
    try {
      if (usuario.roles.includes(rol)) {
        await quitarRol(usuario.id, rol);
      } else {
        await asignarRol(usuario.id, rol);
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setMessage('Roles actualizados.');
    } catch {
      setError('No se pudo actualizar el rol.');
    }
  }

  function toggleFormRole(rol: string) {
    setForm((current) => ({
      ...current,
      roles: current.roles.includes(rol) ? current.roles.filter((item) => item !== rol) : [...current.roles, rol],
    }));
  }

  async function createUser() {
    setError('');
    setMessage('');
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim()) {
      setError('Completa nombre, apellido y email.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.roles.length === 0) {
      setError('Selecciona al menos un rol.');
      return;
    }
    setSaving(true);
    try {
      await createUsuarioAdmin({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        celular: form.celular.trim() || null,
        password: form.password,
      }, form.roles);
      await queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setModalOpen(false);
      setForm({ nombre: '', apellido: '', email: '', celular: '', password: '', roles: ['CLIENT'] });
      setMessage('Usuario creado correctamente.');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (err.response?.status === 429) {
          setError('Se alcanzó el límite temporal de registros. Espera unos minutos e intenta nuevamente.');
        } else if (Array.isArray(detail)) {
          setError(detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(', ') || 'No se pudo crear el usuario.');
        } else {
          setError(typeof detail === 'string' ? detail : 'No se pudo crear el usuario.');
        }
      } else {
        setError('No se pudo crear el usuario.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setMessage('');
    try {
      await deleteUsuario(deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setMessage('Usuario eliminado.');
      setDeleteTarget(null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'No se pudo eliminar el usuario.');
      } else {
        setError('No se pudo eliminar el usuario.');
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usuarios y roles</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestion de permisos desde el panel admin.</p>
        </div>
        <button onClick={() => { setError(''); setModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-[#2a7a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#236b7a]">
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>
      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      {(usuariosQuery.isError || rolesQuery.isError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar usuarios o roles.
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="p-5 text-sm text-gray-500 dark:text-gray-400">Cargando usuarios...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {[usuario.nombre, usuario.apellido].filter(Boolean).join(' ') || `Usuario #${usuario.id}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{usuario.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {roles.map((rol) => {
                        const active = usuario.roles.includes(rol.codigo as AppRole);
                        return (
                          <button
                            key={rol.codigo}
                            onClick={() => toggleRol(usuario, rol.codigo as AppRole)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              active
                                ? 'border-[#2a7a8a] bg-[#2a7a8a] text-white'
                                : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {rol.codigo}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(usuario)}
                      className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => !saving && setModalOpen(false)} title="Nuevo usuario" size="lg">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input value={form.apellido} onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))} placeholder="Apellido" className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.celular} onChange={(e) => setForm((p) => ({ ...p, celular: e.target.value }))} placeholder="Celular (opcional)" className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Contraseña" className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Roles</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((rol) => {
                const active = form.roles.includes(rol.codigo);
                return <button key={rol.codigo} type="button" onClick={() => toggleFormRole(rol.codigo)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${active ? 'border-[#2a7a8a] bg-[#2a7a8a] text-white' : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'}`}>{rol.codigo}</button>;
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancelar</button>
            <button type="button" disabled={saving} onClick={createUser} className="rounded-lg bg-[#2a7a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Creando...' : 'Crear usuario'}</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Eliminar usuario"
        message={`Eliminar ${deleteTarget?.email ?? 'este usuario'}? Esta accion realiza una baja logica.`}
        onConfirm={removeUser}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel="Eliminar"
        confirmLoadingLabel="Eliminando..."
      />
    </div>
  );
}
