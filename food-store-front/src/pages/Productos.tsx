import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import apiClient from '../api/axiosClient';
import { useAuth } from '../hooks/useAuth';
import { isAdminUser } from '../utils/roles';
import { useProductsStockFeed } from '../hooks/useOrderStatusWS';

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

function obtenerLista<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  for (const key of ['data', 'items', 'productos', 'results']) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  const first = Object.values(obj).find((v) => Array.isArray(v));
  return Array.isArray(first) ? (first as T[]) : [];
}

function ordenarProductos(productos: Producto[], orden: 'asc' | 'desc') {
  return [...productos].sort((a, b) => {
    const fechaA = new Date(a.created_at).getTime();
    const fechaB = new Date(b.created_at).getTime();
    return orden === 'asc' ? fechaA - fechaB : fechaB - fechaA;
  });
}

const LIMIT = 10;

export default function Productos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const esAdmin = isAdminUser(user);

  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebounce(search, 350);
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      if (!hasLoadedRef.current) setLoading(true);
      try {
        const params = {
          limit: 100,
          ...(debouncedSearch ? { nombre: debouncedSearch } : {}),
        };
        const res = await apiClient.get<ProductosResponse>('/productos/', {
          params: {
            ...params,
            offset: 0,
          },
        });

        let lista = Array.isArray(res.data.data)
          ? res.data.data
          : obtenerLista<Producto>(res.data);
        const totalVal = (res.data as ProductosResponse).total ?? lista.length;

        while (lista.length < totalVal) {
          const siguiente = await apiClient.get<ProductosResponse>('/productos/', {
            params: { ...params, offset: lista.length },
          });
          const nuevos = Array.isArray(siguiente.data.data)
            ? siguiente.data.data
            : obtenerLista<Producto>(siguiente.data);
          if (nuevos.length === 0) break;
          lista = [...lista, ...nuevos];
        }

        const pagina = ordenarProductos(lista, orden).slice(offset, offset + LIMIT);

        if (!cancelled) {
          setProductos(pagina);
          setTotal(totalVal);
        }
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [offset, refreshKey, debouncedSearch, orden]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  const refreshFromStockEvent = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useProductsStockFeed(true, refreshFromStockEvent);

  useEffect(() => {
    const refreshOnFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  function categoriasTexto(cats: CategoriaProducto[]): string {
    if (!cats?.length) return '—';
    return cats.map((c) => c.nombre_categoria).join(', ');
  }

  function cambiarOrden() {
    setOrden((actual) => (actual === 'desc' ? 'asc' : 'desc'));
    setOffset(0);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');

    try {
      try {
        await apiClient.delete(`/productos/${deleteTarget.id}`);
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 404 || status === 405 || status === 307 || status === 308) {
          await apiClient.delete(`/productos/${deleteTarget.id}/`);
        } else {
          throw error;
        }
      }

      setProductos((prev) => prev.filter((producto) => producto.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      setDeleteError(
        e.response?.data?.detail ??
          `No se pudo eliminar el producto${e.response?.status ? ` (error ${e.response.status})` : ''}.`,
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos</h1>
        {esAdmin && <button
          onClick={() => navigate('/productos/nuevo')}
          className="flex items-center gap-2 px-4 py-2 bg-[#2a7a8a] hover:bg-[#236b7a] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nuevo Producto
        </button>}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
          />
        </div>
        <button
          onClick={cambiarOrden}
          title={orden === 'desc' ? 'Mas recientes primero' : 'Mas antiguos primero'}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowUpDown size={14} />
          {orden === 'desc' ? 'Mas recientes' : 'Mas antiguos'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                {['#', 'Imagen', 'Nombre', 'Categoria', 'Precio', 'Stock', 'Estado', 'Creado', 'Acciones'].map((h) => (
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
                        <div
                          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                          style={{ width: `${60 + (j * 7) % 30}%` }}
                        />
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
                        <img
                          src={item.imagenes_url[0]}
                          alt={item.nombre}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                        />
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
                    <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">
                      ${Number(item.precio_base).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`font-medium ${
                          item.stock_cantidad <= 0
                            ? 'text-red-500'
                            : item.stock_cantidad < 10
                              ? 'text-amber-500'
                              : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
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
                      {esAdmin && <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/productos/${item.id}/editar`)}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 dark:text-blue-400 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError('');
                            setDeleteTarget(item);
                          }}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination total={total} limit={LIMIT} offset={offset} onPageChange={setOffset} />
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar producto"
        message={deleteError || `Eliminar "${deleteTarget?.nombre}"? Esta accion no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError('');
        }}
        loading={deleting}
        confirmLabel="Eliminar"
        confirmLoadingLabel="Eliminando..."
      />
    </div>
  );
}
