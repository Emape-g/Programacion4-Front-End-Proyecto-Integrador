import { getIngredientes, updateIngrediente } from '../api/ingredientes';
import type { Ingrediente } from '../api/ingredientes';
import { getProducto } from '../api/cliente';
import type { Pedido, Producto } from '../types/store';

interface StockItem {
  producto: Producto;
  cantidad: number;
  personalizacion?: number[];
}

export async function getTodosLosIngredientes() {
  const response = await getIngredientes({ offset: 0, limit: 100 });
  return response.data;
}

export function stockDisponiblePorIngredientes(
  producto: Producto,
  ingredientes: Ingrediente[],
  ingredientesQuitados: number[] = [],
) {
  const stockById = new Map(ingredientes.map((ingrediente) => [ingrediente.id, Number(ingrediente.stock_cantidad)]));
  const cantidades = (producto.ingredientes ?? [])
    .filter((ingrediente) => !ingredientesQuitados.includes(ingrediente.ingrediente_id))
    .map((ingrediente) => {
      const necesario = Number(ingrediente.cantidad);
      const disponible = stockById.get(ingrediente.ingrediente_id);
      if (!necesario || necesario <= 0 || disponible === undefined) return Number.POSITIVE_INFINITY;
      return Math.floor(disponible / necesario);
    });

  const calculado = Math.min(...cantidades);
  if (!Number.isFinite(calculado)) return Math.max(0, Number(producto.stock_cantidad ?? 0));
  return Math.max(0, calculado);
}

export function aplicarStockCalculado(producto: Producto, ingredientes: Ingrediente[]) {
  return {
    ...producto,
    stock_cantidad: stockDisponiblePorIngredientes(producto, ingredientes),
  };
}

function calcularConsumo(items: StockItem[]) {
  const consumo = new Map<number, number>();
  for (const item of items) {
    const removidos = new Set((item.personalizacion ?? []).map(Number));
    for (const ingrediente of item.producto.ingredientes ?? []) {
      if (removidos.has(Number(ingrediente.ingrediente_id))) continue;
      const cantidad = Number(ingrediente.cantidad) * item.cantidad;
      if (!cantidad || cantidad <= 0) continue;
      consumo.set(ingrediente.ingrediente_id, (consumo.get(ingrediente.ingrediente_id) ?? 0) + cantidad);
    }
  }
  return consumo;
}

async function completarProductos(items: StockItem[]) {
  return Promise.all(
    items.map(async (item) => {
      try {
        return { ...item, producto: await getProducto(item.producto.id) };
      } catch {
        return item;
      }
    }),
  );
}

export async function descontarIngredientesPorPedido(items: StockItem[]) {
  const itemsConDetalle = await completarProductos(items);
  const ingredientes = await getTodosLosIngredientes();
  const stockById = new Map(ingredientes.map((ingrediente) => [ingrediente.id, ingrediente]));
  const consumo = calcularConsumo(itemsConDetalle);

  for (const [ingredienteId, cantidadNecesaria] of consumo) {
    const ingrediente = stockById.get(ingredienteId);
    const disponible = Number(ingrediente?.stock_cantidad ?? 0);
    if (!ingrediente || disponible < cantidadNecesaria) {
      throw new Error('No hay stock suficiente de ingredientes para completar el pedido.');
    }
  }

  await Promise.all(
    [...consumo].map(([ingredienteId, cantidadNecesaria]) => {
      const ingrediente = stockById.get(ingredienteId);
      return updateIngrediente(ingredienteId, {
        stock_cantidad: Number((Number(ingrediente?.stock_cantidad ?? 0) - cantidadNecesaria).toFixed(3)),
      });
    }),
  );
}

export async function validarStockIngredientes(items: StockItem[]) {
  const itemsConDetalle = await completarProductos(items);
  const ingredientes = await getTodosLosIngredientes();
  const stockById = new Map(ingredientes.map((ingrediente) => [ingrediente.id, ingrediente]));
  const consumo = calcularConsumo(itemsConDetalle);

  for (const [ingredienteId, cantidadNecesaria] of consumo) {
    const ingrediente = stockById.get(ingredienteId);
    const disponible = Number(ingrediente?.stock_cantidad ?? 0);
    if (!ingrediente || disponible < cantidadNecesaria) {
      throw new Error('No hay stock suficiente de ingredientes para completar el pedido.');
    }
  }
}

export async function validarStockActualCarrito(items: StockItem[]) {
  const itemsConDetalle = await completarProductos(items);

  for (const item of itemsConDetalle) {
    const disponible = Math.max(0, Number(item.producto.stock_cantidad ?? 0));
    if (item.cantidad > disponible) {
      throw new Error(
        `No hay stock suficiente para ${item.producto.nombre}. Pediste ${item.cantidad}, quedan ${disponible}. Ajusta la cantidad para continuar.`,
      );
    }
  }
}

export async function restaurarIngredientesPorPedido(items: StockItem[]) {
  const itemsConDetalle = await completarProductos(items);
  const ingredientes = await getTodosLosIngredientes();
  const stockById = new Map(ingredientes.map((ingrediente) => [ingrediente.id, ingrediente]));
  const consumo = calcularConsumo(itemsConDetalle);

  await Promise.all(
    [...consumo].map(([ingredienteId, cantidadUsada]) => {
      const ingrediente = stockById.get(ingredienteId);
      if (!ingrediente) return Promise.resolve();
      return updateIngrediente(ingredienteId, {
        stock_cantidad: Number((Number(ingrediente.stock_cantidad ?? 0) + cantidadUsada).toFixed(3)),
      });
    }),
  );
}

export async function restaurarIngredientesDesdePedido(pedido: Pedido) {
  const detalles = pedido.items ?? pedido.detalles ?? [];
  const items = await Promise.all(
    detalles.map(async (detalle) => ({
      producto: await getProducto(detalle.producto_id),
      cantidad: detalle.cantidad,
      personalizacion: detalle.personalizacion ?? [],
    })),
  );
  await restaurarIngredientesPorPedido(items);
}
