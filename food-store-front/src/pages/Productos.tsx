import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_base: number | string;
  unidad_venta_id?: number;
  unidad_venta_simbolo?: string;
  imagenes_url?: string[];
  stock_cantidad: number;
  disponible: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function obtenerListaProductos(data: any): Producto[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.productos)) return data.productos;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;

  const primeraLista = Object.values(data ?? {}).find((valor) =>
    Array.isArray(valor)
  );

  return Array.isArray(primeraLista) ? (primeraLista as Producto[]) : [];
}

function Badge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        activo
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          activo ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {activo ? "Disponible" : "No disponible"}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-[#2a7a8a] rounded-full animate-spin" />
    </div>
  );
}

export default function Productos() {
  const navigate = useNavigate();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/productos/");
      console.log("Productos desde backend:", data);

      const lista = obtenerListaProductos(data);
      setProductos(lista);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  async function eliminarProducto(id: number) {
    const confirmar = confirm("¿Seguro que querés eliminar este producto?");
    if (!confirmar) return;

    try {
      await api.delete(`/productos/${id}`);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      setError("No se pudo eliminar el producto.");
    }
  }

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {productos.length} producto{productos.length !== 1 ? "s" : ""} registrado
            {productos.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>

            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] w-56 transition"
            />
          </div>

          <button
            onClick={() => navigate("/productos/nuevo")}
            className="flex items-center gap-2 px-4 py-2 bg-[#2a7a8a] hover:bg-[#236674] text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg
              className="w-10 h-10 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21H8M12 17v4"
              />
            </svg>
            <p className="text-sm font-medium">No se encontraron productos</p>
            <p className="text-xs mt-1">
              {busqueda ? "Probá con otro término de búsqueda" : "Creá tu primer producto"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">
                    ID
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">
                    Nombre
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">
                    Precio
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">
                    Unidad
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">
                    Stock
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">
                    Estado
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {productosFiltrados.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50/50 transition group">
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      #{producto.id}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">
                        {producto.nombre}
                      </p>
                      {producto.descripcion && (
                        <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                          {producto.descripcion}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      ${Number(producto.precio_base).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {producto.unidad_venta_simbolo ?? "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${
                          producto.stock_cantidad <= 0
                            ? "text-red-500"
                            : producto.stock_cantidad < 10
                            ? "text-amber-500"
                            : "text-slate-700"
                        }`}
                      >
                        {producto.stock_cantidad}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <Badge activo={producto.disponible} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/productos/${producto.id}`)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-[#2a7a8a]/10 text-slate-500 hover:text-[#2a7a8a] transition"
                        >
                          Ver
                        </button>

                        <button
                          onClick={() => eliminarProducto(producto.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}