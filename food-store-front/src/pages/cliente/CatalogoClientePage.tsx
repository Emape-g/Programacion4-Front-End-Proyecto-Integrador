import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Search, ShoppingCart, Utensils } from 'lucide-react';
import { getCategorias } from '../../api/categorias';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useCart } from '../../hooks/useCart';
import { useDebounce } from '../../hooks/useDebounce';
import { useProductos } from '../../hooks/useProductos';
import type { Producto } from '../../types/store';

const LIMIT = 12;

function money(value: number | string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value));
}

function imageUrl(url?: string) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,c_fill,w_800,h_560/');
}

function stockLabel(stock: number, current = 0) {
  const remaining = Math.max(0, Number(stock) - current);
  if (remaining === 1) return 'Queda 1 unidad';
  return `Quedan ${remaining} unidades`;
}

export function CatalogoClientePage() {
  const { addItem, items } = useCart();
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState<number | ''>('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Producto | null>(null);
  const debouncedSearch = useDebounce(search, 350);
  const productosQuery = useProductos({
    nombre: debouncedSearch || undefined,
    categoria: categoria || undefined,
    disponible: true,
    offset,
    limit: LIMIT,
  });
  const categoriasQuery = useQuery({
    queryKey: ['categorias', 'catalogo'],
    queryFn: () => getCategorias({ offset: 0, limit: 100 }),
    staleTime: 60_000,
  });
  const productos = (productosQuery.data?.data ?? []).filter((producto) => producto.disponible && producto.stock_cantidad > 0);
  const total = productosQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <section className="border-b border-gray-200 pb-6 dark:border-gray-700">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Productos</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Explora el menu, revisa ingredientes y arma tu pedido.</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,360px)_220px] lg:w-auto">
            <label className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Buscar producto" className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
            </label>
            <select value={categoria} onChange={(event) => { setCategoria(event.target.value ? Number(event.target.value) : ''); setOffset(0); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <option value="">Todas las categorias</option>
              {(categoriasQuery.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </div>
        </div>
      </section>

      {productosQuery.isError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">No se pudieron cargar los productos.</div>}
      {productosQuery.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-[410px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
        </div>
      ) : productos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No hay productos disponibles para esos filtros.</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {productos.map((producto) => {
            const cartItem = items.find((item) => item.producto.id === producto.id);
            const allergen = producto.ingredientes?.some((item) => item.es_alergeno);
            const cantidadEnCarrito = cartItem?.cantidad ?? 0;
            const sinStockDisponible = cantidadEnCarrito >= producto.stock_cantidad;
            return (
              <article key={producto.id} className="flex min-h-[400px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <button onClick={() => setSelected(producto)} className="relative block h-52 w-full overflow-hidden bg-gray-100 text-left dark:bg-gray-700">
                  {producto.imagenes_url?.[0] ? <img src={imageUrl(producto.imagenes_url[0])} alt={producto.nombre} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" /> : <Utensils className="absolute inset-0 m-auto text-gray-400" size={42} />}
                </button>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{producto.nombre}</h2>
                      <p className="mt-1 text-xs font-medium text-[#2a7a8a]">{producto.categorias?.map((item) => item.nombre_categoria).join(', ') || 'Sin categoria'}</p>
                    </div>
                    <strong className="whitespace-nowrap text-gray-900 dark:text-white">{money(producto.precio_base)}</strong>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{producto.descripcion || 'Sin descripcion.'}</p>
                  <p className={`mt-3 text-sm font-medium ${sinStockDisponible ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    {stockLabel(producto.stock_cantidad, cantidadEnCarrito)}
                  </p>
                  {allergen && <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"><AlertTriangle size={12} />Contiene alergenos</span>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <button onClick={() => setSelected(producto)} className="text-sm font-medium text-[#2a7a8a]">Ver detalle</button>
                    <button onClick={() => addItem(producto)} disabled={sinStockDisponible} className="inline-flex items-center gap-2 rounded-lg bg-[#2a7a8a] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><ShoppingCart size={16} />{cartItem ? cartItem.cantidad : 'Agregar'}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination total={total} limit={LIMIT} offset={offset} onPageChange={setOffset} />

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.nombre ?? 'Producto'} size="lg">
        {selected && (
          (() => {
            const selectedCartItem = items.find((item) => item.producto.id === selected.id);
            const cantidadEnCarrito = selectedCartItem?.cantidad ?? 0;
            const sinStockDisponible = cantidadEnCarrito >= selected.stock_cantidad;
            return (
          <div className="grid gap-5 md:grid-cols-[240px_1fr]">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              {selected.imagenes_url?.[0] ? <img src={imageUrl(selected.imagenes_url[0])} alt={selected.nombre} className="h-full w-full object-cover" /> : <Utensils className="m-auto h-full text-gray-400" size={44} />}
            </div>
            <div>
              <div className="flex items-start justify-between gap-4"><p className="text-sm text-gray-500 dark:text-gray-400">{selected.descripcion}</p><strong className="whitespace-nowrap text-xl text-gray-900 dark:text-white">{money(selected.precio_base)}</strong></div>
              <p className={`mt-3 text-sm font-medium ${sinStockDisponible ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {stockLabel(selected.stock_cantidad, cantidadEnCarrito)}
              </p>
              <h3 className="mt-5 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">Ingredientes</h3>
              <ul className="mt-2 space-y-2">
                {selected.ingredientes?.map((item) => <li key={item.ingrediente_id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100"><span>{item.nombre_ingrediente}{item.es_removible && <span className="ml-2 text-xs text-[#2a7a8a] dark:text-cyan-300">removible</span>}</span><span className="text-gray-500 dark:text-gray-400">{item.cantidad} {item.unidad_simbolo}</span></li>)}
              </ul>
              <button disabled={sinStockDisponible} onClick={() => { addItem(selected); setSelected(null); }} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2a7a8a] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><ShoppingCart size={16} />Agregar al carrito</button>
            </div>
          </div>
            );
          })()
        )}
      </Modal>
    </div>
  );
}
