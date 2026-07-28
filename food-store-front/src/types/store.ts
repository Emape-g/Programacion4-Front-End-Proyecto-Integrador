export type AppRole = 'ADMIN' | 'CLIENT' | 'PEDIDOS' | 'STOCK';
export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'EN_PREP' | 'ENTREGADO' | 'CANCELADO';
export type PaymentStatus = 'idle' | 'processing' | 'approved' | 'pending' | 'rejected' | 'error';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  celular?: string | null;
  roles: AppRole[];
  created_at?: string;
  updated_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface CategoriaProducto {
  categoria_id: number;
  nombre_categoria: string;
  es_principal: boolean;
}

export interface IngredienteProducto {
  ingrediente_id: number;
  nombre_ingrediente: string;
  cantidad: number | string;
  unidad_medida_id: number;
  unidad_simbolo: string;
  es_removible: boolean;
  es_alergeno?: boolean;
  costo?: number | string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio_base: number | string;
  unidad_venta_id?: number | null;
  unidad_venta_simbolo?: string | null;
  imagenes_url: string[];
  stock_cantidad: number;
  disponible: boolean;
  categorias: CategoriaProducto[];
  ingredientes?: IngredienteProducto[];
  created_at: string;
  updated_at: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages?: number;
}

export interface DireccionEntrega {
  id: number;
  usuario_id: number;
  alias?: string | null;
  linea1: string;
  linea2?: string | null;
  ciudad: string;
  provincia?: string | null;
  codigo_postal?: string | null;
  latitud?: number | string | null;
  longitud?: number | string | null;
  es_principal: boolean;
  created_at: string;
  updated_at: string;
}

export interface DireccionPayload {
  alias?: string | null;
  linea1: string;
  linea2?: string | null;
  ciudad: string;
  provincia?: string | null;
  codigo_postal?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  es_principal: boolean;
}

export interface FormaPago {
  codigo: string;
  descripcion: string;
  habilitado: boolean;
}

export interface DetallePedido {
  producto_id: number;
  cantidad: number;
  nombre_snapshot: string;
  precio_snapshot: number;
  subtotal_snap: number;
  personalizacion?: number[] | null;
}

export interface HistorialPedido {
  id: number;
  estado_desde?: EstadoPedido | null;
  estado_hacia: EstadoPedido;
  motivo?: string | null;
  usuario_id?: number | null;
  created_at: string;
}

export interface Pago {
  id: number;
  pedido_id?: number;
  monto: number;
  estado: string;
  mp_preference_id?: string | null;
  mp_init_point?: string | null;
  mp_payment_id?: number | null;
  mp_status?: string | null;
  mp_status_detail?: string | null;
  idempotency_key?: string;
  created_at?: string;
}

export interface PagoCrearResponse {
  pago_id: number;
  preference_id: string;
  init_point?: string | null;
  public_key?: string | null;
}

export interface PagoEstadoResponse {
  estado?: string | null;
  pedido_id: number;
}

export interface Pedido {
  id: number;
  usuario_id?: number;
  usuario_nombre?: string;
  usuario_apellido?: string;
  cliente_nombre?: string;
  usuario?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email'>;
  direccion_entrega_id?: number | null;
  estado_codigo: EstadoPedido;
  forma_pago_codigo?: string;
  subtotal: number;
  descuento: number;
  costo_envio: number;
  total: number;
  notas?: string | null;
  items?: DetallePedido[];
  detalles?: DetallePedido[];
  historial?: HistorialPedido[];
  pago?: Pago | null;
  created_at: string;
  updated_at?: string;
}

export interface PedidoCreatePayload {
  forma_pago_codigo: string;
  direccion_id?: number | null;
  notas?: string | null;
  items: Array<{ producto_id: number; cantidad: number; personalizacion?: number[] }>;
}

export interface OrderEvent {
  event: string;
  pedido_id: number;
  estado_anterior?: EstadoPedido | null;
  estado_nuevo: EstadoPedido;
  usuario_id?: number | null;
  motivo?: string | null;
  timestamp: string;
}

export interface ResumenEstadisticas {
  ventas_hoy: number;
  ticket_promedio: number;
  pedidos_activos: number;
  ventas_mes: number;
  pedidos_hoy?: number;
  productos_bajo_stock?: number;
}

export interface VentaPeriodo {
  periodo: string;
  total_ventas: number;
  cantidad_pedidos: number;
}

export interface ProductoTop {
  nombre: string;
  ingresos: number;
  cantidad_vendida: number;
}

export interface PedidosPorEstado {
  estado_codigo: EstadoPedido;
  cantidad: number;
}

export interface IngresoFormaPago {
  forma_pago_codigo: string;
  total: number;
  cantidad: number;
}

export interface ImagenUploadResponse {
  url: string;
  filename: string;
}
