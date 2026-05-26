import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
  tipo: string;
}

interface Categoria {
  id: number;
  nombre: string;
}

interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  unidad_medida_id?: number;
  unidad_medida?: string;
  unidad_medida_simbolo?: string;
  precio_unitario?: number | string;
}

interface IngredienteProductoTemp {
  ingrediente_id: number;
  nombre: string;
  unidad: string;
  unidad_medida_id?: number;
  cantidad: number;
  precio_unitario: number;
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

function obtenerLista<T>(data: any): T[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.resultados)) return data.resultados;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.rows)) return data.rows;

  if (Array.isArray(data.ingredientes)) return data.ingredientes;
  if (Array.isArray(data.unidades)) return data.unidades;
  if (Array.isArray(data.unidades_medida)) return data.unidades_medida;
  if (Array.isArray(data.productos)) return data.productos;
  if (Array.isArray(data.categorias)) return data.categorias;

  const primeraLista = Object.values(data ?? {}).find((valor) =>
    Array.isArray(valor)
  );

  return Array.isArray(primeraLista) ? (primeraLista as T[]) : [];
}

export default function ProductNuevo() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [unidadVentaId, setUnidadVentaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [stockCantidad, setStockCantidad] = useState("");
  const [imagenesUrl, setImagenesUrl] = useState("");
  const [disponible, setDisponible] = useState(true);

  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);

  const [busquedaIngrediente, setBusquedaIngrediente] = useState("");
  const [mostrarDropdownIngredientes, setMostrarDropdownIngredientes] =
    useState(false);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] =
    useState<Ingrediente | null>(null);

  const [cantidadIngrediente, setCantidadIngrediente] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");

  const [ingredientesProducto, setIngredientesProducto] = useState<
    IngredienteProductoTemp[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      setError("");

      try {
        const [resUnidades, resIngredientes, resCategorias] =
          await Promise.all([
            api.get("/unidades-medida/"),
            api.get("/ingredientes/"),
            api.get("/categorias/"),
          ]);

        const listaUnidades = obtenerLista<UnidadMedida>(resUnidades.data);
        const listaIngredientes = obtenerLista<Ingrediente>(
          resIngredientes.data
        );
        const listaCategorias = obtenerLista<Categoria>(resCategorias.data);

        console.log("Unidades procesadas:", listaUnidades);
        console.log("Ingredientes procesados:", listaIngredientes);
        console.log("Categorías procesadas:", listaCategorias);

        setUnidades(listaUnidades);
        setIngredientes(listaIngredientes);
        setCategorias(listaCategorias);

        if (listaUnidades.length > 0) {
          setUnidadVentaId(String(listaUnidades[0].id));
        }

        if (listaCategorias.length > 0) {
          setCategoriaId(String(listaCategorias[0].id));
        }
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        setError("No se pudieron cargar unidades, ingredientes o categorías.");
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, []);

  const ingredientesFiltrados = ingredientes.filter((ingrediente) =>
    ingrediente.nombre.toLowerCase().includes(busquedaIngrediente.toLowerCase())
  );

  const costoEstimadoTotal = useMemo(() => {
    return ingredientesProducto.reduce(
      (total, item) => total + item.cantidad * item.precio_unitario,
      0
    );
  }, [ingredientesProducto]);

  function limpiarIngredienteForm() {
    setBusquedaIngrediente("");
    setIngredienteSeleccionado(null);
    setCantidadIngrediente("");
    setPrecioUnitario("");
    setMostrarDropdownIngredientes(false);
  }

  function agregarIngrediente() {
    setError("");

    if (!ingredienteSeleccionado) {
      setError("Seleccioná un ingrediente.");
      return;
    }

    const cantidad = Number(cantidadIngrediente);
    const precio = Number(precioUnitario);

    if (!cantidad || cantidad <= 0) {
      setError("La cantidad del ingrediente debe ser mayor a 0.");
      return;
    }

    if (precio < 0 || Number.isNaN(precio)) {
      setError("El precio unitario no puede ser negativo.");
      return;
    }

    const yaExiste = ingredientesProducto.some(
      (item) => item.ingrediente_id === ingredienteSeleccionado.id
    );

    if (yaExiste) {
      setError("Ese ingrediente ya fue agregado al producto.");
      return;
    }

    const unidad =
      ingredienteSeleccionado.unidad_medida_simbolo ??
      ingredienteSeleccionado.unidad_medida ??
      "-";

    const nuevoIngrediente: IngredienteProductoTemp = {
      ingrediente_id: ingredienteSeleccionado.id,
      nombre: ingredienteSeleccionado.nombre,
      unidad,
      unidad_medida_id: ingredienteSeleccionado.unidad_medida_id,
      cantidad,
      precio_unitario: precio || 0,
    };

    setIngredientesProducto((prev) => [...prev, nuevoIngrediente]);
    limpiarIngredienteForm();
  }

  function eliminarIngrediente(id: number) {
    setIngredientesProducto((prev) =>
      prev.filter((item) => item.ingrediente_id !== id)
    );
  }

  async function crearProducto() {
    setError("");

    if (!nombre.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }

    if (!precioBase || Number(precioBase) < 0) {
      setError("El precio base debe ser válido.");
      return;
    }

    if (!unidadVentaId) {
      setError("Seleccioná una unidad de venta.");
      return;
    }

    if (!categoriaId) {
      setError("Seleccioná una categoría.");
      return;
    }

    if (ingredientesProducto.length === 0) {
      setError("Debés agregar al menos un ingrediente para crear el producto.");
      return;
    }

    setGuardando(true);

    try {
      const payloadProducto = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio_base: Number(precioBase),
        unidad_venta_id: Number(unidadVentaId),
        imagenes_url: imagenesUrl
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean),
        stock_cantidad: Number(stockCantidad) || 0,
        disponible,
        categorias: [
          {
            categoria_id: Number(categoriaId),
            es_principal: true,
          },
        ],
        ingredientes: [],
      };

      console.log("Payload producto:", payloadProducto);

      const responseProducto = await api.post("/productos/", payloadProducto);

      const productoCreado = responseProducto.data;
      const productoId = productoCreado.id;

      console.log("Producto creado:", productoCreado);

      try {
        for (const ingrediente of ingredientesProducto) {
          const payloadIngrediente = {
            ingrediente_id: ingrediente.ingrediente_id,
            cantidad: ingrediente.cantidad,
            unidad_medida_id:
              ingrediente.unidad_medida_id ?? Number(unidadVentaId),
          };

          console.log("Agregando ingrediente:", payloadIngrediente);

          await api.post(
            `/productos/${productoId}/ingredientes`,
            payloadIngrediente
          );
        }
      } catch (error) {
        console.error(
          "El producto se creó, pero falló al agregar ingredientes:",
          error
        );
      }

      navigate("/productos");
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      console.log("Detalle del error:", error.response?.data);
      console.log(
        "Detalle del error completo:",
        JSON.stringify(error.response?.data, null, 2)
      );

      const detail = error.response?.data?.detail;

      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(", "));
      } else {
        setError("No se pudo crear el producto. Revisá los datos.");
      }
    } finally {
      setGuardando(false);
    }
  }

  const botonCrearDeshabilitado =
    guardando || ingredientesProducto.length === 0;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/productos")}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nuevo Producto</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cargá los datos generales y agregá al menos un ingrediente.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          Cargando datos...
        </div>
      ) : (
        <>
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                Datos generales del producto
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Pizza muzzarella"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción breve del producto..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Precio base <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Unidad de venta <span className="text-red-400">*</span>
                </label>
                <select
                  value={unidadVentaId}
                  onChange={(e) => setUnidadVentaId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                >
                  {unidades.map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.nombre} ({unidad.simbolo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Categoría <span className="text-red-400">*</span>
                </label>

                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                >
                  <option value="">Seleccionar categoría</option>

                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Stock inicial
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockCantidad}
                  onChange={(e) => setStockCantidad(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Disponible
                </label>
                <label className="flex items-center gap-3 h-[42px]">
                  <input
                    type="checkbox"
                    checked={disponible}
                    onChange={(e) => setDisponible(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    Disponible para venta
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Imágenes URL{" "}
                  <span className="normal-case font-normal text-slate-400">
                    separadas por coma
                  </span>
                </label>
                <input
                  value={imagenesUrl}
                  onChange={(e) => setImagenesUrl(e.target.value)}
                  placeholder="https://imagen1.jpg, https://imagen2.jpg"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 overflow-visible">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                Ingredientes del producto
              </h2>
              <span className="text-sm text-slate-500">
                {ingredientesProducto.length} ingrediente
                {ingredientesProducto.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Agregar ingrediente
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px_140px_120px] gap-3">
                <div className="relative">
                  <input
                    value={busquedaIngrediente}
                    onFocus={() => setMostrarDropdownIngredientes(true)}
                    onChange={(e) => {
                      setBusquedaIngrediente(e.target.value);
                      setIngredienteSeleccionado(null);
                      setMostrarDropdownIngredientes(true);
                    }}
                    placeholder="Buscar ingrediente..."
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                  />

                  {mostrarDropdownIngredientes &&
                    !ingredienteSeleccionado &&
                    ingredientesFiltrados.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {ingredientesFiltrados
                          .slice(0, 10)
                          .map((ingrediente) => (
                            <button
                              key={ingrediente.id}
                              type="button"
                              onClick={() => {
                                setIngredienteSeleccionado(ingrediente);
                                setBusquedaIngrediente(ingrediente.nombre);
                                setPrecioUnitario(
                                  ingrediente.precio_unitario
                                    ? String(ingrediente.precio_unitario)
                                    : ""
                                );
                                setMostrarDropdownIngredientes(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#2a7a8a]/10 transition"
                            >
                              <span className="font-medium text-slate-700">
                                {ingrediente.nombre}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cantidadIngrediente}
                  onChange={(e) => setCantidadIngrediente(e.target.value)}
                  placeholder="Cantidad"
                  className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                  placeholder="Precio/u"
                  className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a]"
                />

                <button
                  type="button"
                  onClick={agregarIngrediente}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-sm font-medium rounded-xl transition"
                >
                  + Agregar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">
                      Ingrediente
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">
                      Unidad
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">
                      Cantidad
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">
                      Costo estimado
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {ingredientesProducto.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-400"
                      >
                        Sin ingredientes. Agregá el primero.
                      </td>
                    </tr>
                  ) : (
                    ingredientesProducto.map((item) => (
                      <tr key={item.ingrediente_id}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {item.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {item.unidad}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {item.cantidad}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          ${(item.cantidad * item.precio_unitario).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              eliminarIngrediente(item.ingrediente_id)
                            }
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <p className="text-sm text-slate-600">
                Costo estimado total:{" "}
                <span className="font-bold text-slate-800">
                  ${costoEstimadoTotal.toFixed(2)}
                </span>
              </p>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/productos")}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={crearProducto}
              disabled={botonCrearDeshabilitado}
              className="px-5 py-2 bg-[#2a7a8a] hover:bg-[#236674] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition"
            >
              {guardando ? "Creando..." : "Crear producto"}
            </button>
          </div>

          {ingredientesProducto.length === 0 && (
            <p className="text-right text-xs text-slate-400">
              Para crear el producto tenés que agregar al menos un ingrediente.
            </p>
          )}
        </>
      )}
    </div>
  );
}