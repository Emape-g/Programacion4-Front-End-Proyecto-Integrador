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
import apiClient from '../../api/axiosClient';

type Tab = 'todos' | 'alergenos' | 'sin-alergeno';

interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
  tipo: string;
}

interface FormState {
  nombre: string;
  descripcion: string;
  stock_cantidad: string;
  unidad_medida_id: string;
  precio_unitario: string;
  es_alergeno: boolean;
}

const LIMIT = 10;
const TABS: [Tab, string][] = [
  ['todos', 'Todos'],
  ['alergenos', 'Alérgenos'],
  ['sin-alergeno', 'Sin alérgeno'],
];

function cantidadTexto(value: number | string) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);
  return numberValue.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function IngredientesPage() {
  const [tab, setTab] = useState<Tab>('todos');
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebounce(search, 350);
  const [loadError, setLoadError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingrediente | null>(null);
  const [form, setForm] = useState<FormState>({
    nombre: '',
    descripcion: '',
    stock_cantidad: '0',
    unidad_medida_id: '',
    precio_unitario: '',
    es_alergeno: false,
  });
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
      setLoadError('');
      try {
        const res = await getIngredientes({ offset, limit: LIMIT, nombre: debouncedSearch || undefined, orden });
        if (!cancelled) {
          setIngredientes(res.data);
          setTotal(res.total);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
          setIngredientes([]);
          setTotal(0);
          setLoadError(detail ?? 'No se pudieron cargar los ingredientes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [offset, refreshKey, debouncedSearch, orden]);

  useEffect(() => {
    let cancelled = false;
    async function fetchUnidades() {
      try {
        const res = await apiClient.get('/unidades-medida/', { params: { limit: 100 } });
        const data = res.data as { data?: UnidadMedida[] } | UnidadMedida[];
        const lista = Array.isArray(data) ? data : data.data ?? [];
        if (!cancelled) setUnidades(lista);
      } catch {
        if (!cancelled) setUnidades([]);
      }
    }
    fetchUnidades();
    return () => { cancelled = true; };
  }, []);

  function refresh() { setRefreshKey((k) => k + 1); }

  const displayed = ingredientes.filter((i) => {
    if (tab === 'alergenos') return i.es_alergeno;
    if (tab === 'sin-alergeno') return !i.es_alergeno;
    return true;
  });

  function openCreate() {
    setEditing(null);
    setForm({
      nombre: '',
      descripcion: '',
      stock_cantidad: '0',
      unidad_medida_id: '',
      precio_unitario: '',
      es_alergeno: false,
    });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(item: Ingrediente) {
    setEditing(item);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      stock_cantidad: String(item.stock_cantidad ?? 0),
      unidad_medida_id: String(item.unidad_medida_id),
      precio_unitario: String(item.precio_unitario),
      es_alergeno: item.es_alergeno,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    const nombre = form.nombre.trim();
    if (!nombre) { setFormError('El nombre es requerido'); return; }
    if (nombre.length < 2) { setFormError('Mínimo 2 caracteres'); return; }
    if (nombre.length > 100) { setFormError('Máximo 100 caracteres'); return; }
    const stock = Number(form.stock_cantidad);
    if (Number.isNaN(stock) || stock < 0) { setFormError('El stock debe ser un numero mayor o igual a 0'); return; }
    const unidadId = Number(form.unidad_medida_id);
    if (!Number.isInteger(unidadId) || unidadId <= 0) { setFormError('Seleccioná en qué formato estás cargando la cantidad'); return; }
    const unidad = unidades.find((item) => item.id === unidadId);
    if (!unidad) { setFormError('La unidad seleccionada no es válida'); return; }

    const precioUnitario = Number(form.precio_unitario);
    if (!form.precio_unitario || Number.isNaN(precioUnitario) || precioUnitario <= 0) {
      setFormError('El precio por unidad debe ser mayor a 0');
      return;
    }

    setSaving(true);
    setFormError('');
    const payload = {
      nombre,
      descripcion: form.descripcion.trim() || undefined,
      stock_cantidad: stock,
      unidad_medida_id: unidad.id,
      precio_unitario: precioUnitario,
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
      const e = err as { response?: { status: number; data?: { detail?: string | { msg?: string }[] } } };
      if (e.response?.status === 409) {
        setFormError('Ya existe un ingrediente con ese nombre');
      } else {
        const detail = e.response?.data?.detail;
        setFormError(Array.isArray(detail) ? detail.map((item) => item.msg).filter(Boolean).join(', ') : detail ?? 'Error al guardar');
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
        {loadError && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {loadError}
          </div>
        )}
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
                {['#', 'Nombre', 'Descripcion', 'Cantidad', 'Formato', 'Precio/u', 'Alergeno', 'Estado', 'Creado', 'Acciones'].map((h) => (
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
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${60 + (j * 7) % 30}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
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
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 max-w-xs truncate">{item.descripcion || '-'}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-700 dark:text-gray-300">{cantidadTexto(item.stock_cantidad)}</td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">
                      {item.unidad_simbolo}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-700 dark:text-gray-300">
                      ${Number(item.precio_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={item.es_alergeno ? 'orange' : 'green'}>
                        {item.es_alergeno ? 'Sí' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={!item.deleted_at ? 'green' : 'red'}>
                        {!item.deleted_at ? 'Activo' : 'Inactivo'}
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
                          onClick={() => !item.deleted_at ? setDeleteTarget(item) : setActivateTarget(item)}
                          disabled={toggling === item.id}
                          title={!item.deleted_at ? 'Desactivar' : 'Activar'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            !item.deleted_at
                              ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400'
                              : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 dark:text-green-400'
                          }`}
                        >
                          {!item.deleted_at ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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

          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cantidad disponible
              </label>
                <input
                type="number"
                step="0.001"
                min="0"
                value={form.stock_cantidad}
                onChange={(e) => setForm((p) => ({ ...p, stock_cantidad: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cantidad actual disponible del ingrediente.
              </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Formato / unidad <span className="text-red-500">*</span>
            </label>
            <select
              value={form.unidad_medida_id}
              onChange={(e) => setForm((p) => ({ ...p, unidad_medida_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
            >
              <option value="">Seleccionar formato</option>
              {unidades.map((unidad) => (
                <option key={unidad.id} value={unidad.id}>{unidad.nombre} ({unidad.simbolo})</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ejemplo: si cargás 5 kilos, ponés cantidad 5 y formato kg.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio por unidad <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.precio_unitario}
              onChange={(e) => setForm((p) => ({ ...p, precio_unitario: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Valor de una unidad del formato elegido.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, es_alergeno: !p.es_alergeno }))}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.es_alergeno ? 'bg-[#2a7a8a]' : 'bg-gray-300 dark:bg-gray-600'}`}
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
