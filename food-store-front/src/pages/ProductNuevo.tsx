import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../api/axiosClient";
import { uploadImagen } from "../api/cliente";
import { getIngredientUnitPreference } from "../utils/ingredientUnits";

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
}

interface IngredienteProductoTemp {
  ingrediente_id: number;
  nombre: string;
  unidad: string;
  unidad_medida_id?: number;
  cantidad: number;
  precio_unitario: number;
  es_removible: boolean;
}

interface ProductoDetalle {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio_base: number | string;
  unidad_venta_id: number;
  imagenes_url?: string[];
  stock_cantidad: number | string;
  disponible: boolean;
  categorias?: {
    categoria_id: number;
    es_principal?: boolean;
  }[];
  ingredientes?: {
    ingrediente_id: number;
    nombre_ingrediente: string;
    cantidad: number;
    unidad_medida_id?: number;
    unidad_simbolo?: string;
    es_removible: boolean;
  }[];
}

function obtenerLista<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;

  const obj = (data ?? {}) as Record<string, unknown>;

  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];
  if (Array.isArray(obj.resultados)) return obj.resultados as T[];
  if (Array.isArray(obj.content)) return obj.content as T[];
  if (Array.isArray(obj.rows)) return obj.rows as T[];

  if (Array.isArray(obj.ingredientes)) return obj.ingredientes as T[];
  if (Array.isArray(obj.unidades)) return obj.unidades as T[];
  if (Array.isArray(obj.unidades_medida)) return obj.unidades_medida as T[];
  if (Array.isArray(obj.productos)) return obj.productos as T[];
  if (Array.isArray(obj.categorias)) return obj.categorias as T[];

  const primeraLista = Object.values(obj).find((valor) =>
    Array.isArray(valor)
  );

  return Array.isArray(primeraLista) ? (primeraLista as T[]) : [];
}

export default function ProductNuevo() {
  const navigate = useNavigate();
  const { id } = useParams();
  const productoId = id ? Number(id) : null;
  const editando = productoId !== null && !Number.isNaN(productoId);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioVentaManual, setPrecioVentaManual] = useState(false);
  const [agregado, setAgregado] = useState("");
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
  const [unidadIngredienteId, setUnidadIngredienteId] = useState("");
  const [costoUnitarioIngrediente, setCostoUnitarioIngrediente] = useState("");
  const [esRemovible, setEsRemovible] = useState(false);

  const [ingredientesProducto, setIngredientesProducto] = useState<
    IngredienteProductoTemp[]
  >([]);
  const [categoriaOriginalIds, setCategoriaOriginalIds] = useState<number[]>([]);
  const [ingredienteOriginalIds, setIngredienteOriginalIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      setError("");

      try {
        const [resUnidades, resIngredientes, resCategorias, resProducto] =
          await Promise.all([
            apiClient.get("/unidades-medida/").catch(() => null),
            apiClient.get("/ingredientes/").catch(() => null),
            apiClient.get("/categorias/").catch(() => null),
            editando
              ? apiClient.get<ProductoDetalle>(`/productos/${productoId}`).catch(() => null)
              : Promise.resolve(null),
          ]);

        const listaUnidades = obtenerLista<UnidadMedida>(resUnidades?.data);
        const listaIngredientes = obtenerLista<Ingrediente>(
          resIngredientes?.data
        );
        const listaCategorias = obtenerLista<Categoria>(resCategorias?.data);

        console.log("Unidades procesadas:", listaUnidades);
        console.log("Ingredientes procesados:", listaIngredientes);
        console.log("Categorías procesadas:", listaCategorias);

        setUnidades(listaUnidades);
        setIngredientes(listaIngredientes);
        setCategorias(listaCategorias);

        if (!resIngredientes) {
          setError("El servidor no pudo cargar los ingredientes. Puedes completar los otros datos, pero el producto necesita al menos un ingrediente para guardarse.");
        }

        const listaUnidadesFiltradas = listaUnidades.filter(
          (unidad) =>
            !unidad.nombre.toLowerCase().includes("metro cuadrado") &&
            !unidad.simbolo.toLowerCase().includes("m2")
        );

        setUnidades(listaUnidadesFiltradas);

        if (listaUnidadesFiltradas.length > 0) {
          setUnidadVentaId(String(listaUnidadesFiltradas[0].id));
        }

        if (listaCategorias.length > 0) {
          setCategoriaId(String(listaCategorias[0].id));
        }
        if (editando && !resProducto) {
          throw new Error("No se pudo cargar el producto.");
        }
        if (resProducto?.data) {
          const producto = resProducto.data;
          const categoriasOriginales = producto.categorias ?? [];
          const ingredientesOriginales = producto.ingredientes ?? [];
          const categoriaPrincipal =
            categoriasOriginales.find((categoria) => categoria.es_principal) ??
            categoriasOriginales[0];

          const ingredientesIniciales = ingredientesOriginales.map((ing) => {
            const preference = getIngredientUnitPreference(ing.ingrediente_id);
            return {
              ingrediente_id: ing.ingrediente_id,
              nombre: ing.nombre_ingrediente,
              unidad: ing.unidad_simbolo ?? preference?.unidad_simbolo ?? "-",
              unidad_medida_id: ing.unidad_medida_id ?? preference?.unidad_medida_id,
              cantidad: Number(ing.cantidad),
              precio_unitario: preference?.precio_unitario ?? 0,
              es_removible: ing.es_removible,
            };
          });
          const costoInicial = ingredientesIniciales.reduce(
            (total, ing) => total + ing.cantidad * ing.precio_unitario,
            0
          );
          const precioActual = Number(producto.precio_base ?? 0);
          const agregadoInicial = precioActual - costoInicial * 1.15;

          setNombre(producto.nombre ?? "");
          setDescripcion(producto.descripcion ?? "");
          setPrecioVenta("");
          setPrecioVentaManual(false);
          setAgregado(
            agregadoInicial > 0 && !Number.isNaN(agregadoInicial)
              ? agregadoInicial.toFixed(2)
              : ""
          );
          setUnidadVentaId(String(producto.unidad_venta_id ?? ""));
          setCategoriaId(
            categoriaPrincipal ? String(categoriaPrincipal.categoria_id) : ""
          );
          setStockCantidad(String(producto.stock_cantidad ?? ""));
          setImagenesUrl((producto.imagenes_url ?? []).join(", "));
          setDisponible(Boolean(producto.disponible));
          setIngredientesProducto(ingredientesIniciales);
          setCategoriaOriginalIds(
            categoriasOriginales.map((categoria) => categoria.categoria_id)
          );
          setIngredienteOriginalIds(
            ingredientesOriginales.map((ing) => ing.ingrediente_id)
          );
        }
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        setError("No se pudieron cargar unidades, ingredientes o categorías.");
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, [editando, productoId]);

  const ingredientesFiltrados = ingredientes.filter((ingrediente) =>
    ingrediente.nombre.toLowerCase().includes(busquedaIngrediente.toLowerCase()) &&
    !ingredientesProducto.some((item) => item.ingrediente_id === ingrediente.id)
  );

  const costoEstimadoTotal = useMemo(() => {
    return ingredientesProducto.reduce(
      (total, item) => total + item.cantidad * item.precio_unitario,
      0
    );
  }, [ingredientesProducto]);

  const precioSugerido = useMemo(() => {
    const agregadoNumero = agregado ? Number(agregado) : 0;
    return (
      costoEstimadoTotal * 1.15 +
      (Number.isNaN(agregadoNumero) ? 0 : agregadoNumero)
    );
  }, [costoEstimadoTotal, agregado]);

  function limpiarIngredienteForm() {
    setBusquedaIngrediente("");
    setIngredienteSeleccionado(null);
    setCantidadIngrediente("");
    setUnidadIngredienteId("");
    setCostoUnitarioIngrediente("");
    setEsRemovible(false);
    setMostrarDropdownIngredientes(false);
  }

  function agregarIngrediente() {
    setError("");

    if (!ingredienteSeleccionado) {
      setError("Seleccioná un ingrediente.");
      return;
    }

    const cantidad = Number(cantidadIngrediente);
    const precio = costoUnitarioIngrediente
      ? Number(costoUnitarioIngrediente)
      : 0;

    if (!cantidad || cantidad <= 0) {
      setError("La cantidad del ingrediente debe ser mayor a 0.");
      return;
    }

    if (Number.isNaN(precio) || precio < 0) {
      setError("El costo por unidad debe ser un numero valido.");
      return;
    }

    const unidadId = Number(unidadIngredienteId);
    if (!Number.isInteger(unidadId) || unidadId <= 0) {
      setError("Este ingrediente no tiene unidad cargada. Editalo desde Ingredientes antes de agregarlo al producto.");
      return;
    }

    const yaExiste = ingredientesProducto.some(
      (item) => item.ingrediente_id === ingredienteSeleccionado.id
    );

    if (yaExiste) {
      setError("Ese ingrediente ya fue agregado al producto.");
      return;
    }

    const unidad = unidades.find((item) => item.id === unidadId)?.simbolo ?? "-";

    const nuevoIngrediente: IngredienteProductoTemp = {
      ingrediente_id: ingredienteSeleccionado.id,
      nombre: ingredienteSeleccionado.nombre,
      unidad,
      unidad_medida_id: unidadId,
      cantidad,
      precio_unitario: precio,
      es_removible: esRemovible,
    };

    setIngredientesProducto((prev) => [...prev, nuevoIngrediente]);
    limpiarIngredienteForm();
  }

  function eliminarIngrediente(id: number) {
    setIngredientesProducto((prev) =>
      prev.filter((item) => item.ingrediente_id !== id)
    );
  }

  function actualizarCostoIngrediente(id: number, costo: string) {
    const precio = costo ? Number(costo) : 0;
    if (Number.isNaN(precio) || precio < 0) return;

    setIngredientesProducto((prev) =>
      prev.map((item) =>
        item.ingrediente_id === id
          ? { ...item, precio_unitario: precio }
          : item
      )
    );
  }

  async function subirImagen(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen valido.");
      return;
    }
    setSubiendoImagen(true);
    setError("");
    try {
      const imagen = await uploadImagen(file, "productos");
      setImagenesUrl((actual) => [actual.trim(), imagen.secure_url].filter(Boolean).join(", "));
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function sincronizarRelacionesProducto(productoIdActual: number) {
    const categoriaActualId = Number(categoriaId);
    const categoriasAEliminar = categoriaOriginalIds.filter(
      (id) => id !== categoriaActualId
    );

    if (!categoriaOriginalIds.includes(categoriaActualId)) {
      await apiClient.post(`/productos/${productoIdActual}/categorias`, {
        categoria_id: categoriaActualId,
        es_principal: true,
      });
    }

    await Promise.all(
      categoriasAEliminar.map((id) =>
        apiClient.delete(`/productos/${productoIdActual}/categorias/${id}`)
      )
    );

    const ingredienteActualIds = ingredientesProducto.map(
      (ing) => ing.ingrediente_id
    );
    const ingredientesAEliminar = ingredienteOriginalIds.filter(
      (id) => !ingredienteActualIds.includes(id)
    );
    const ingredientesAAgregar = ingredientesProducto.filter(
      (ing) => !ingredienteOriginalIds.includes(ing.ingrediente_id)
    );

    await Promise.all(
      ingredientesAEliminar.map((id) =>
        apiClient.delete(`/productos/${productoIdActual}/ingredientes/${id}`)
      )
    );

    await Promise.all(
      ingredientesAAgregar.map((ing) =>
        apiClient.post(`/productos/${productoIdActual}/ingredientes`, {
          ingrediente_id: ing.ingrediente_id,
          cantidad: ing.cantidad,
          unidad_medida_id: ing.unidad_medida_id,
          es_removible: ing.es_removible,
        })
      )
    );
  }

  async function guardarProducto() {
    setError("");
    const precioFinal = precioVentaManual ? precioVenta : precioSugerido.toFixed(2);

    if (!nombre.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }

    if (!precioFinal || Number(precioFinal) < 0) {
      setError("El precio final debe ser válido.");
      return;
    }

    const agregadoNumero = agregado ? Number(agregado) : 0;
    if (Number.isNaN(agregadoNumero) || agregadoNumero < 0) {
      setError("El agregado debe ser un numero valido.");
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
        precio_base: Number(precioFinal),
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
        ingredientes: ingredientesProducto.map((ing) => ({
          ingrediente_id: ing.ingrediente_id,
          cantidad: ing.cantidad,
          unidad_medida_id: ing.unidad_medida_id,
          es_removible: ing.es_removible,
        })),
      };

      console.log("Payload producto:", payloadProducto);

      if (editando && productoId !== null) {
        await apiClient.put(`/productos/${productoId}`, {
          nombre: payloadProducto.nombre,
          descripcion: payloadProducto.descripcion,
          precio_base: payloadProducto.precio_base,
          unidad_venta_id: payloadProducto.unidad_venta_id,
          imagenes_url: payloadProducto.imagenes_url,
          stock_cantidad: payloadProducto.stock_cantidad,
          disponible: payloadProducto.disponible,
        });
        await sincronizarRelacionesProducto(productoId);
      } else {
        await apiClient.post("/productos/", payloadProducto);
      }

      navigate("/productos");
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { detail?: string | { msg?: string }[] } };
      };
      console.error("Error al guardar producto:", error);
      console.log("Detalle del error:", apiError.response?.data);
      console.log(
        "Detalle del error completo:",
        JSON.stringify(apiError.response?.data, null, 2)
      );

      const detail = apiError.response?.data?.detail;

      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).filter(Boolean).join(", "));
      } else {
        setError(
          editando
            ? "No se pudo guardar el producto. Revisá los datos."
            : "No se pudo crear el producto. Revisá los datos."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  const botonGuardarDeshabilitado =
    guardando;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/productos")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editando ? "Editar Producto" : "Nuevo Producto"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {editando
              ? "Modifica los datos generales y los ingredientes del producto."
              : "Carga los datos generales y agrega al menos un ingrediente."}
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
          Cargando datos...
        </div>
      ) : (
        <>
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Datos generales del producto
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Pizza muzzarella"
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción breve del producto..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Agregado
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={agregado}
                  onChange={(e) => setAgregado(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Se suma al precio sugerido.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Precio final <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioVentaManual ? precioVenta : precioSugerido.toFixed(2)}
                  onChange={(e) => {
                    setPrecioVenta(e.target.value);
                    setPrecioVentaManual(true);
                  }}
                  placeholder={precioSugerido.toFixed(2)}
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Sugerido: ${precioSugerido.toFixed(2)} (costo de ingredientes + 15% + agregado)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Categoría <span className="text-red-400">*</span>
                </label>

                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
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
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Stock inicial
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockCantidad}
                  onChange={(e) => setStockCantidad(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-lg border border-[#2a7a8a] px-3 py-2 text-sm font-medium text-[#2a7a8a] hover:bg-[#2a7a8a]/5">
                    {subiendoImagen ? "Subiendo..." : "Subir imagen"}
                    <input type="file" accept="image/*" disabled={subiendoImagen} onChange={(event) => subirImagen(event.target.files?.[0])} className="sr-only" />
                  </label>
                  <span className="text-xs text-gray-500">JPG, PNG o WebP. La imagen se almacena en Cloudinary.</span>
                </div>
                {imagenesUrl && <div className="mt-3 flex gap-2 overflow-x-auto">{imagenesUrl.split(",").map((url) => url.trim()).filter(Boolean).map((url) => <img key={url} src={url} alt="Vista previa" className="h-20 w-24 rounded-lg border border-gray-200 object-cover" />)}</div>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Disponible
                </label>
                <label className="flex items-center gap-3 h-10.5">
                  <input
                    type="checkbox"
                    checked={disponible}
                    onChange={(e) => setDisponible(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Disponible para venta
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Imágenes URL{" "}
                  <span className="normal-case font-normal text-gray-400 dark:text-gray-500">
                    separadas por coma
                  </span>
                </label>
                <input
                  value={imagenesUrl}
                  onChange={(e) => setImagenesUrl(e.target.value)}
                  placeholder="https://imagen1.jpg, https://imagen2.jpg"
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ingredientes del producto
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {ingredientesProducto.length} ingrediente
                {ingredientesProducto.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Agregar ingrediente
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_130px_120px_130px_auto_120px] gap-3">
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
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                  />

                  {mostrarDropdownIngredientes &&
                    !ingredienteSeleccionado &&
                    ingredientesFiltrados.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {ingredientesFiltrados
                          .slice(0, 10)
                          .map((ingrediente) => (
                            <button
                              key={ingrediente.id}
                              type="button"
                              onClick={() => {
                                const preferredUnit = getIngredientUnitPreference(ingrediente.id);
                                setIngredienteSeleccionado(ingrediente);
                                setBusquedaIngrediente(ingrediente.nombre);
                                setUnidadIngredienteId(preferredUnit ? String(preferredUnit.unidad_medida_id) : "");
                                setCostoUnitarioIngrediente(
                                  preferredUnit?.precio_unitario !== undefined
                                    ? String(preferredUnit.precio_unitario)
                                    : ""
                                );
                                setMostrarDropdownIngredientes(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#2a7a8a]/10 dark:hover:bg-[#2a7a8a]/20 transition"
                            >
                              <span className="font-medium text-gray-700 dark:text-gray-200">
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
                  className="px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                />

                <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-200">
                  {unidadIngredienteId
                    ? unidades.find((unidad) => unidad.id === Number(unidadIngredienteId))?.simbolo ?? "Unidad"
                    : "Sin unidad"}
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costoUnitarioIngrediente}
                  onChange={(e) => setCostoUnitarioIngrediente(e.target.value)}
                  placeholder="Costo/u"
                  className="px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                />

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={esRemovible}
                    onChange={(e) => setEsRemovible(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Removible
                </label>

                <button
                  type="button"
                  onClick={agregarIngrediente}
                  className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                >
                  + Agregar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-6 py-3">
                      Ingrediente
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-6 py-3">
                      Unidad
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-6 py-3">
                      Cantidad
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-6 py-3">
                      Costo/u
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-6 py-3">
                      Removible
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-6 py-3">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {ingredientesProducto.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-gray-400 dark:text-gray-500"
                      >
                        Sin ingredientes. Agregá el primero.
                      </td>
                    </tr>
                  ) : (
                    ingredientesProducto.map((item) => (
                      <tr key={item.ingrediente_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {item.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {item.unidad}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {item.cantidad}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precio_unitario || ""}
                            onChange={(e) =>
                              actualizarCostoIngrediente(
                                item.ingrediente_id,
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="w-28 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2a7a8a]/30 focus:border-[#2a7a8a] transition-colors"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {item.es_removible ? "Sí" : "No"}
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Costo estimado de ingredientes
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                ${costoEstimadoTotal.toFixed(2)}
              </span>
            </div>

          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/productos")}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={guardarProducto}
              disabled={botonGuardarDeshabilitado}
              className="px-5 py-2 bg-[#2a7a8a] hover:bg-[#236674] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {guardando
                ? editando
                  ? "Guardando..."
                  : "Creando..."
                : editando
                ? "Guardar cambios"
                : "Crear producto"}
            </button>
          </div>

          {ingredientesProducto.length === 0 && (
            <p className="text-right text-xs text-gray-400 dark:text-gray-500">
              Para guardar el producto tenés que agregar al menos un ingrediente.
            </p>
          )}
        </>
      )}
    </div>
  );
}

