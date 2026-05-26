import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import apiClient from '../api/axiosClient';

interface CategoriaProducto {
  categoria_id: number;
  nombre_categoria: string;
  es_principal: boolean;
}

interface IngredienteProducto {
  ingrediente_id: number;
  nombre_ingrediente: string;
  cantidad: number;
  unidad_medida_id: number;
  unidad_simbolo: string;
  es_removible: boolean;
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  unidad_venta_id: number;
  unidad_venta_simbolo: string;
  imagenes_url: string[];
  stock_cantidad: number;
  disponible: boolean;
  categorias: CategoriaProducto[];
  ingredientes: IngredienteProducto[];
  created_at: string;
  updated_at: string;
}

interface ProductosResponse {
  data: Producto[];
  total: number;
}

interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
}

interface EditFormState {
  nombre: string;
  descripcion: string;
  precio_base: string;
  unidad_venta_id: string;
  imagenes_url: string;
  stock_cantidad: string;
  disponible: boolean;
}

function obtenerLista<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  for (const key of ['data', 'items', 'productos', 'results']) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  const first = Object.values(obj).find((v) => Array.isArray(v));
  return Array.isArray(first) ? (first as T[]) : [];
}

const LIMIT = 10;
const EMPTY_FORM: EditFormState = {
  nombre: '',
  descripcion: '',
  precio_base: '',
  unidad_venta_id: '',
  imagenes_url: '',
  stock_cantidad: '',
  disponible: true,
};

export default function Productos() {
  const navigate = useNavigate();

  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebounce(search, 350);

  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<EditFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiClient.get('/unidades-medida/').then((res) => {
      setUnidades(obtenerLista<UnidadMedida>(res.data));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await apiClient.get<ProductosResponse>('/productos/', {
          params: { offset, limit: LIMIT, ...(debouncedSearch ? { nombre: debouncedSearch } : {}), orden },
        });

        const lista = Array.isArray(res.data.data) ? res.data.data : obtenerLista<Producto>(res.data);
        const totalVal = (res.data as ProductosResponse).total ?? lista.length;

        const conDetalle = await Promise.all(
          lista.map(async (p) => {
            try {
              const d = await apiClient.get<Producto>(`/productos/${p.id}`);
              return d.data;
            } catch {
              return p;
            }
          }),
        );

        if (!cancelled) {
          setProductos(conDetalle);
          setTotal(totalVal);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [offset, refreshKey, debouncedSearch, orden]);

  function refresh() { setRefreshKey((k) => k + 1); }

  function categoriasTexto(cats: CategoriaProducto[]): string {
    if (!cats?.length) return '—';
    return cats.map((c) => c.nombre_categoria).join(', ');
  }

  function openEdit(item: Producto) {
    setEditing(item);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      precio_base: String(item.precio_base),
      unidad_venta_id: String(item.unidad_venta_id),
      imagenes_url: (item.imagenes_url ?? []).join(', '),
      stock_cantidad: String(item.stock_cantidad),
      disponible: item.disponible,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    const nombre = form.nombre.trim();
    if (!nombre) { setFormError('El nombre es requerido'); return; }
    if (nombre.length < 2) { setFormError('Mínimo 2 caracteres'); return; }

    const precio = Number(form.precio_base);
    if (Number.isNaN(precio) || precio < 0) { setFormError('Precio inválido'); return; }

    if (!form.unidad_venta_id) { setFormError('Seleccioná una unidad de venta'); return; }

    const stock = Number(form.stock_cantidad);
    if (Number.isNaN(stock) || stock < 0) { setFormError('Stock inválido'); return; }

    setSaving(true);
    setFormError('');

    const payload: Record<string, unknown> = {
      nombre,
      descripcion: form.descripcion.trim() || null,
      precio_base: precio,
      unidad_venta_id: Number(form.unidad_venta_id),
      stock_cantidad: stock,
      disponible: form.disponible,
      imagenes_url: form.imagenes_url
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
    };

    try {
      await apiClient.patch(`/productos/${editing!.id}`, payload);
      setModalOpen(false);
      refresh();
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { detail?: string | { msg: string }[] } } };
      if (e.response?.status === 409) {
        setFormError('Ya existe un producto con ese nombre');
      } else if (Array.isArray(e.response?.data?.detail)) {
        setFormError((e.response!.data!.detail as { msg: string }[]).map((d) => d.msg).join(', '));
      } else {
        setFormError((e.response?.data?.detail as string) ?? 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  }

  const [deleteError, setDeleteError] = useState('');

  async function handleDelete() {
    console.log('handleDelete called, deleteTarget:', deleteTarget);
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      console.log('DELETE producto id:', deleteTarget.id);
      await apiClient.delete(`/productos/${deleteTarget.id}`);
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { detail?: string } } };
      console.error('Error al eliminar producto:', e);
      setDeleteError(e.response?.data?.detail ?? `Error ${e.response?.status ?? ''} al eliminar producto`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos</h1>
        <button
          onClick={() => navigate('/productos/nuevo')}
          className="flex items-center gap-2 px-4 py-2 bg-[#2a7a8a] hover:bg-[#236b7a] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nuevo Producto
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                {['#', 'Imagen', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado', 'Creado', 'Acciones'].map((h) => (
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
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${60 + (j * 7) % 30}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No hay productos para mostrar</p>
                  </td>
                </tr>
              ) : (
                productos.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-gray-400 dark:text-gray-500 text-xs">{offset + idx + 1}</td>
                    <td className="px-4 py-3.5">
                      {item.imagenes_url?.[0] ? (
                        <img src={item.imagenes_url[0]} alt={item.nombre} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-400">
                          Sin img
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-white">{item.nombre}</p>
                      {item.descripcion && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs mt-0.5">{item.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">{categoriasTexto(item.categorias)}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">${Number(item.precio_base).toFixed(2)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`font-medium ${item.stock_cantidad <= 0 ? 'text-red-500' : item.stock_cantidad < 10 ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.stock_cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={item.disponible && item.stock_cantidad > 0 ? 'green' : 'red'}>
                        {item.disponible && item.stock_cantidad > 0 ? 'Disponible' : 'No disponible'}
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
                          onClick={() => { console.log('TRASH click, item:', item.id); setDeleteTarget(item); }}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
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

      {/* Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Editar producto"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre del producto"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio base <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio_base}
                onChange={(e) => setForm((p) => ({ ...p, precio_base: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unidad de venta <span className="text-red-500">*</span>
              </label>
              <select
                value={form.unidad_venta_id}
                onChange={(e) => setForm((p) => ({ ...p, unidad_venta_id: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
              >
                <option value="">Seleccionar</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stock
              </label>
              <input
                type="number"
                min="0"
                value={form.stock_cantidad}
                onChange={(e) => setForm((p) => ({ ...p, stock_cantidad: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
              />
            </div>

            <div className="flex items-end pb-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, disponible: !p.disponible }))}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.disponible ? 'bg-[#2a7a8a]' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.disponible ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponible</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imágenes URL <span className="text-xs font-normal text-gray-400">(separadas por coma)</span>
            </label>
            <input
              type="text"
              value={form.imagenes_url}
              onChange={(e) => setForm((p) => ({ ...p, imagenes_url: e.target.value }))}
              placeholder="https://imagen1.jpg, https://imagen2.jpg"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
            />
          </div>

          {editing && (editing.categorias?.length > 0 || editing.ingredientes?.length > 0) && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {editing.categorias?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Categorías</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editing.categorias.map((c) => (
                      <Badge key={c.categoria_id} variant={c.es_principal ? 'blue' : 'gray'}>
                        {c.nombre_categoria}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {editing.ingredientes?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Ingredientes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editing.ingredientes.map((i) => (
                      <Badge key={i.ingrediente_id} variant="gray">
                        {i.nombre_ingrediente} ({i.cantidad}{i.unidad_simbolo})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Categorías e ingredientes se gestionan por separado.
              </p>
            </div>
          )}

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

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar producto"
        message={deleteError || `¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={() => { console.log('CONFIRM click'); handleDelete(); }}
        onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
        loading={deleting}
        confirmLabel="Eliminar"
        confirmLoadingLabel="Eliminando..."
      />
    </div>
  );
}
