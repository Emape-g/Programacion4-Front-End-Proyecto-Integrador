import { useState, useEffect } from 'react';
import { Pencil, Plus, ToggleLeft, ToggleRight, Search, ArrowUpDown } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import {
  getIngredientes,
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
  activarIngrediente,
} from '../../api/ingredientes';
import type { Ingrediente } from '../../api/ingredientes';
import { useDebounce } from '../../hooks/useDebounce';

type Tab = 'todos' | 'alergenos' | 'sin-alergeno';

interface FormState {
  nombre: string;
  descripcion: string;
  es_alergeno: boolean;
}

const LIMIT = 10;
const TABS: [Tab, string][] = [
  ['todos', 'Todos'],
  ['alergenos', 'Alérgenos'],
  ['sin-alergeno', 'Sin alérgeno'],
];

export function IngredientesPage() {
  const [tab, setTab] = useState<Tab>('todos');
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebounce(search, 350);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingrediente | null>(null);
  const [form, setForm] = useState<FormState>({ nombre: '', descripcion: '', es_alergeno: false });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete / toggle state
  const [deleteTarget, setDeleteTarget] = useState<Ingrediente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activateTarget, setActivateTarget] = useState<Ingrediente | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);


  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await getIngredientes({ offset, limit: LIMIT, nombre: debouncedSearch || undefined, orden });
        if (!cancelled) {
          setIngredientes(res.data);
          setTotal(res.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [offset, refreshKey, debouncedSearch, orden]);

  function refresh() { setRefreshKey((k) => k + 1); }

  const displayed = ingredientes.filter((i) => {
    if (tab === 'alergenos') return i.es_alergeno;
    if (tab === 'sin-alergeno') return !i.es_alergeno;
    return true;
  });

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', es_alergeno: false });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(item: Ingrediente) {
    setEditing(item);
    setForm({ nombre: item.nombre, descripcion: item.descripcion ?? '', es_alergeno: item.es_alergeno });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    const nombre = form.nombre.trim();
    if (!nombre) { setFormError('El nombre es requerido'); return; }
    if (nombre.length < 2) { setFormError('Mínimo 2 caracteres'); return; }
    if (nombre.length > 100) { setFormError('Máximo 100 caracteres'); return; }

    setSaving(true);
    setFormError('');
    const payload = {
      nombre,
      descripcion: form.descripcion.trim() || undefined,
      es_alergeno: form.es_alergeno,
    };

    try {
      if (editing) {
        await updateIngrediente(editing.id, payload);
      } else {
        await createIngrediente(payload);
      }
      setModalOpen(false);
      refresh();
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { detail?: string } } };
      if (e.response?.status === 409) {
        setFormError('Ya existe un ingrediente con ese nombre');
      } else {
        setFormError(e.response?.data?.detail ?? 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteIngrediente(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleActivar() {
    if (!activateTarget) return;
    setToggling(activateTarget.id);
    try {
      await activarIngrediente(activateTarget.id);
      setActivateTarget(null);
      refresh();
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ingredientes</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#2a7a8a] hover:bg-[#236b7a] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nuevo Ingrediente
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
          />
        </div>
        <button
          onClick={() => { setOrden((o) => (o === 'desc' ? 'asc' : 'desc')); setOffset(0); }}
          title={orden === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowUpDown size={14} />
          {orden === 'desc' ? 'Más recientes' : 'Más antiguos'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                {['#', 'Nombre', 'Descripción', 'Alérgeno', 'Estado', 'Creado', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === 'Acciones' ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${60 + (j * 7) % 30}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No hay ingredientes para mostrar</p>
                  </td>
                </tr>
              ) : (
                displayed.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-gray-400 dark:text-gray-500 text-xs">{offset + idx + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">{item.nombre}</td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 max-w-xs truncate">{item.descripcion || '—'}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={item.es_alergeno ? 'orange' : 'green'}>
                        {item.es_alergeno ? 'Sí' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={!item.delete_at ? 'green' : 'red'}>
                        {!item.delete_at ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 dark:text-blue-400 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => !item.delete_at ? setDeleteTarget(item) : setActivateTarget(item)}
                          disabled={toggling === item.id}
                          title={!item.delete_at ? 'Desactivar' : 'Activar'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            !item.delete_at
                              ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400'
                              : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 dark:text-green-400'
                          }`}
                        >
                          {!item.delete_at ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination total={total} limit={LIMIT} offset={offset} onPageChange={setOffset} />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar ingrediente' : 'Nuevo ingrediente'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre del ingrediente"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción opcional"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, es_alergeno: !p.es_alergeno }))}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.es_alergeno ? 'bg-[#2a7a8a]' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.es_alergeno ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">¿Es alérgeno?</span>
          </div>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-[#2a7a8a] hover:bg-[#236b7a] text-white disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Desactivar ingrediente"
        message={`¿Desactivar "${deleteTarget?.nombre}"? Podrás reactivarlo luego.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel="Desactivar"
        confirmLoadingLabel="Desactivando..."
      />

      {/* Activate Confirm */}
      <ConfirmDialog
        isOpen={!!activateTarget}
        title="Activar ingrediente"
        message={`¿Activar "${activateTarget?.nombre}"?`}
        onConfirm={handleActivar}
        onCancel={() => setActivateTarget(null)}
        loading={toggling === activateTarget?.id}
        confirmLabel="Activar"
        confirmLoadingLabel="Activando..."
        confirmVariant="green"
      />
    </div>
  );
}
