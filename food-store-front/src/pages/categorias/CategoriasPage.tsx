import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Pencil, Plus, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../../api/categorias';
import type { Categoria } from '../../api/categorias';
import { useDebounce } from '../../hooks/useDebounce';
import { uploadImagen } from '../../api/cliente';

interface FormState {
  nombre: string;
  descripcion: string;
  padre_id: number | null;
  imagen_url: string;
}

const LIMIT = 10;
const FETCH_LIMIT = 100;
const EMPTY_FORM: FormState = {
  nombre: '',
  descripcion: '',
  padre_id: null,
  imagen_url: '',
};

export function CategoriasPage() {
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allCategorias, setAllCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebounce(search, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Categoria | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await getCategorias({ offset: 0, limit: FETCH_LIMIT });
        if (!cancelled) {
          let lista = res.data;
          while (lista.length < res.total) {
            const siguiente = await getCategorias({ offset: lista.length, limit: FETCH_LIMIT });
            if (siguiente.data.length === 0) break;
            lista = [...lista, ...siguiente.data];
          }
          setAllCategorias(lista);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const categoriasFiltradas = allCategorias
    .filter((categoria) => {
      const term = debouncedSearch.trim().toLowerCase();
      if (!term) return true;
      return [categoria.nombre, categoria.descripcion ?? ''].some((value) => value.toLowerCase().includes(term));
    })
    .sort((a, b) => {
      const fechaA = new Date(a.created_at).getTime();
      const fechaB = new Date(b.created_at).getTime();
      return orden === 'asc' ? fechaA - fechaB : fechaB - fechaA;
    });
  const safeOffset = offset >= categoriasFiltradas.length ? 0 : offset;
  const categorias = categoriasFiltradas.slice(safeOffset, safeOffset + LIMIT);
  const total = categoriasFiltradas.length;

  function refresh() { setRefreshKey((k) => k + 1); }

  function parentName(padreId: number | null | undefined): string {
    if (!padreId) return '—';
    const p = allCategorias.find((c) => c.id === padreId);
    return p ? p.nombre : `#${padreId}`;
  }

  function renderTree(parentId: number | null = null, level = 0): ReactNode {
    const children = allCategorias.filter((c) => (c.padre_id ?? null) === parentId);
    if (!children.length) return null;
    return (
      <div className={level === 0 ? 'space-y-2' : 'ml-5 mt-2 space-y-2 border-l border-gray-200 pl-4 dark:border-gray-700'}>
        {children.map((categoria) => (
          <div key={categoria.id}>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900/40">
              <span className="font-medium text-gray-900 dark:text-white">{categoria.nombre}</span>
              {categoria.descripcion && <span className="text-gray-400">· {categoria.descripcion}</span>}
            </div>
            {renderTree(categoria.id, level + 1)}
          </div>
        ))}
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(item: Categoria) {
    setEditing(item);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      padre_id: item.padre_id ?? null,
      imagen_url: item.imagen_url ?? '',
    });
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
    const payload: Record<string, unknown> = { nombre };
    const desc = form.descripcion.trim();
    if (desc) payload.descripcion = desc;
    else if (editing) payload.descripcion = null;
    if (form.padre_id !== null) payload.padre_id = form.padre_id;
    else if (editing) payload.padre_id = null;
    const img = form.imagen_url.trim();
    if (img) payload.imagen_url = img;
    else if (editing) payload.imagen_url = null;

    try {
      if (editing) {
        await updateCategoria(editing.id, payload);
      } else {
        await createCategoria(payload as { nombre: string });
      }
      setModalOpen(false);
      refresh();
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { detail?: string } } };
      if (e.response?.status === 409) {
        setFormError('Ya existe una categoría con ese nombre');
      } else {
        setFormError(e.response?.data?.detail ?? 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const image = await uploadImagen(file, 'categorias');
      setForm((current) => ({ ...current, imagen_url: image.url }));
    } catch {
      setFormError('No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategoria(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorías</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#2a7a8a] hover:bg-[#236b7a] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nueva Categoría
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

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Arbol de categorias</h2>
        {allCategorias.length ? renderTree() : <p className="text-sm text-gray-400">No hay categorias cargadas.</p>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                {['#', 'Nombre', 'Descripción', 'Categoría Padre', 'Imagen', 'Creado', 'Acciones'].map((h) => (
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
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No hay categorías para mostrar</p>
                  </td>
                </tr>
              ) : (
                categorias.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-gray-400 dark:text-gray-500 text-xs">{safeOffset + idx + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">{item.nombre}</td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 max-w-xs truncate">{item.descripcion || '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">{parentName(item.padre_id)}</td>
                    <td className="px-4 py-3.5">
                      {item.imagen_url ? (
                        <img src={item.imagen_url} alt={item.nombre} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
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
                          onClick={() => setDeleteTarget(item)}
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
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
              placeholder="Nombre de la categoría"
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
              Categoría Padre
            </label>
            <select
              value={form.padre_id ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, padre_id: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
            >
              <option value="">Sin padre (raíz)</option>
              {allCategorias
                .filter((c) => c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL de imagen
            </label>
            <input
              type="url"
              value={form.imagen_url}
              onChange={(e) => setForm((p) => ({ ...p, imagen_url: e.target.value }))}
              placeholder="https://ejemplo.com/img/categoria.png"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
            />
            <div className="mt-2 flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-[#2a7a8a] px-3 py-2 text-sm font-medium text-[#2a7a8a]">
                {uploading ? 'Subiendo...' : 'Subir a Cloudinary'}
                <input type="file" accept="image/*" disabled={uploading} onChange={(event) => handleImageUpload(event.target.files?.[0])} className="sr-only" />
              </label>
              {form.imagen_url && <img src={form.imagen_url} alt="Vista previa" className="h-12 w-12 rounded-lg border border-gray-200 object-cover" />}
            </div>
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

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar categoría"
        message={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel="Eliminar"
        confirmLoadingLabel="Eliminando..."
      />
    </div>
  );
}
