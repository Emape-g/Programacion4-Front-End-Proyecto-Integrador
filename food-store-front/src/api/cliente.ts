import apiClient from './axiosClient';
import type {
  CloudinaryUpload,
  DireccionEntrega,
  DireccionPayload,
  FormaPago,
  IngresoFormaPago,
  ListResponse,
  Pago,
  PagoCrearResponse,
  PagoEstadoResponse,
  PaginatedResponse,
  Pedido,
  PedidoCreatePayload,
  PedidosPorEstado,
  Producto,
  ProductoTop,
  ResumenEstadisticas,
  TokenResponse,
  Usuario,
  VentaPeriodo,
} from '../types/store';

export async function loginUsuario(email: string, password: string) {
  const response = await apiClient.post<TokenResponse>('/auth/login', { email, password });
  return response.data;
}

export async function getPerfil() {
  const response = await apiClient.get<Usuario>('/auth/me');
  return response.data;
}

export async function getUsuario(id: number) {
  const response = await apiClient.get<Usuario>(`/auth/usuarios/${id}`);
  return response.data;
}

export async function getUsuarios(offset = 0, limit = 100) {
  const response = await apiClient.get<ListResponse<Usuario>>('/auth/usuarios', { params: { offset, limit } });
  return response.data;
}

export async function getRoles() {
  const response = await apiClient.get<ListResponse<{ codigo: string; nombre: string; descripcion?: string | null }>>(
    '/roles/',
    { params: { limit: 100 } },
  );
  return response.data.data;
}

export async function asignarRol(usuarioId: number, rol_codigo: string) {
  await apiClient.post(`/auth/usuarios/${usuarioId}/roles`, { rol_codigo });
}

export async function quitarRol(usuarioId: number, rolCodigo: string) {
  await apiClient.delete(`/auth/usuarios/${usuarioId}/roles/${rolCodigo}`);
}

export async function deleteUsuario(usuarioId: number) {
  await apiClient.delete(`/auth/usuarios/${usuarioId}`);
}

export async function registerCliente(data: {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  celular?: string | null;
}) {
  const response = await apiClient.post<Usuario>('/auth/register', data);
  return response.data;
}

export async function createUsuarioAdmin(
  data: { nombre: string; apellido: string; email: string; password: string; celular?: string | null },
  roles: string[],
) {
  const usuario = await registerCliente(data);
  const requestedRoles = new Set(roles);
  for (const rol of requestedRoles) {
    if (rol !== 'CLIENT') await asignarRol(usuario.id, rol);
  }
  if (!requestedRoles.has('CLIENT')) await quitarRol(usuario.id, 'CLIENT');
  return usuario;
}

export async function updatePerfil(data: Partial<Pick<Usuario, 'nombre' | 'apellido' | 'celular'>>) {
  const response = await apiClient.patch<Usuario>('/auth/me', data);
  return response.data;
}

export async function getMisDirecciones() {
  const response = await apiClient.get<ListResponse<DireccionEntrega>>('/auth/me/direcciones', {
    params: { limit: 100 },
  });
  return response.data.data;
}

export async function createDireccion(data: DireccionPayload) {
  const response = await apiClient.post<DireccionEntrega>('/auth/me/direcciones', data);
  return response.data;
}

export async function updateDireccion(id: number, data: Partial<DireccionPayload>) {
  const response = await apiClient.patch<DireccionEntrega>(`/auth/direcciones/${id}`, data);
  return response.data;
}

export async function setDireccionPrincipal(id: number) {
  const response = await apiClient.put<DireccionEntrega>(`/auth/direcciones/${id}/principal`);
  return response.data;
}

export async function deleteDireccion(id: number) {
  await apiClient.delete(`/auth/direcciones/${id}`);
}

export async function getProductosCliente(params: {
  nombre?: string;
  categoria?: number;
  disponible?: boolean;
  offset?: number;
  limit?: number;
} = {}) {
  const response = await apiClient.get<ListResponse<Producto>>('/productos/', {
    params: { offset: 0, limit: 24, ...params },
  });
  const detalles = await Promise.all(
    response.data.data.map(async (producto) => {
      try {
        return await getProducto(producto.id);
      } catch {
        return producto;
      }
    }),
  );
  return { ...response.data, data: detalles };
}

export async function getProducto(id: number) {
  const response = await apiClient.get<Producto>(`/productos/${id}`);
  return response.data;
}

export async function updateProductoStock(id: number, stock_cantidad: number) {
  const response = await apiClient.patch<Producto>(`/productos/${id}/stock`, { stock_cantidad });
  return response.data;
}

export async function toggleProductoDisponibilidad(id: number, disponible: boolean) {
  const response = await apiClient.patch<Producto>(`/productos/${id}/disponibilidad`, { disponible });
  return response.data;
}

export async function getFormasPago() {
  const response = await apiClient.get<FormaPago[]>('/formas-de-pago/habilitadas');
  return response.data;
}

export async function createPedido(data: PedidoCreatePayload) {
  const response = await apiClient.post<Pedido>('/pedidos/', data);
  return response.data;
}

export async function getPedidos(page = 1, size = 100, estado?: string) {
  const response = await apiClient.get<PaginatedResponse<Pedido>>('/pedidos/', {
    params: { page, size, ...(estado ? { estado } : {}) },
  });
  return response.data;
}

export async function getPedido(id: number) {
  const response = await apiClient.get<Pedido>(`/pedidos/${id}`);
  const pedido = response.data;
  return { ...pedido, detalles: pedido.items ?? pedido.detalles ?? [] };
}

export async function getHistorialPedido(id: number) {
  const response = await apiClient.get<Pedido['historial']>(`/pedidos/${id}/historial`);
  return response.data ?? [];
}

export async function cancelarPedido(id: number) {
  const response = await apiClient.delete<Pedido>(`/pedidos/${id}`);
  return response.data;
}

export async function cambiarEstadoPedido(id: number, nuevo_estado: string, motivo?: string) {
  const response = await apiClient.patch<Pedido>(`/pedidos/${id}/estado`, {
    nuevo_estado,
    motivo: motivo || null,
  });
  return response.data;
}

export async function crearPagoMercadoPago(pedidoId: number) {
  const response = await apiClient.post<PagoCrearResponse>('/pagos/crear', { pedido_id: pedidoId });
  return response.data;
}

export async function confirmarPagoMercadoPago(pedidoId: number, paymentId?: number) {
  const response = await apiClient.get<PagoEstadoResponse>(`/pagos/confirmar/${pedidoId}`, {
    params: paymentId ? { payment_id: paymentId } : undefined,
  });
  return response.data;
}

export async function getPagoPedido(pedidoId: number) {
  const response = await apiClient.get<Pago>(`/pagos/${pedidoId}`);
  return response.data;
}

export async function uploadImagen(file: File, folder = 'productos') {
  const body = new FormData();
  body.append('file', file);
  const response = await apiClient.post<CloudinaryUpload>('/uploads/imagen', body, {
    params: { folder },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteImagen(publicId: string) {
  await apiClient.delete(`/uploads/imagen/${encodeURIComponent(publicId)}`);
}

export async function getResumenEstadisticas() {
  const response = await apiClient.get<ResumenEstadisticas>('/estadisticas/resumen');
  return response.data;
}

export async function getVentas(desde: string, hasta: string, agrupacion = 'day') {
  const response = await apiClient.get<VentaPeriodo[]>('/estadisticas/ventas', {
    params: { desde, hasta, agrupacion },
  });
  return response.data;
}

export async function getProductosTop(limit = 10) {
  const response = await apiClient.get<ProductoTop[]>('/estadisticas/productos-top', { params: { limit } });
  return response.data;
}

export async function getPedidosPorEstado() {
  const response = await apiClient.get<PedidosPorEstado[]>('/estadisticas/pedidos-por-estado');
  return response.data;
}

export async function getIngresos(desde?: string, hasta?: string) {
  const response = await apiClient.get<IngresoFormaPago[]>('/estadisticas/ingresos', {
    params: { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) },
  });
  return response.data;
}
