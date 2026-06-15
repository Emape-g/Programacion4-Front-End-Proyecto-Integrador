import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { usePedido } from '../../hooks/usePedidos';
import type { EstadoPedido } from '../../types/store';

const ORDER: EstadoPedido[] = ['PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'ENTREGADO'];
const labels: Record<EstadoPedido, string> = { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', EN_PREP: 'En preparacion', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado' };

export function AdminPedidoDetallePage() {
  const id = Number(useParams().id);
  const query = usePedido(id);
  if (query.isLoading) return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando pedido...</p>;
  if (query.isError || !query.data) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">No se pudo cargar el pedido.</p>;
  const pedido = query.data;
  const details = pedido.items ?? pedido.detalles ?? [];
  const currentIndex = pedido.estado_codigo === 'CANCELADO' ? -1 : ORDER.indexOf(pedido.estado_codigo);
  return <div className="space-y-5 text-gray-900 dark:text-gray-100">
    <div><Link to="/admin/pedidos" className="text-sm font-medium text-[#2a7a8a] dark:text-cyan-300">Volver a pedidos</Link><div className="mt-2 flex items-center justify-between"><div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pedido #{pedido.id}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{new Date(pedido.created_at).toLocaleString('es-AR')}</p></div><Badge variant={pedido.estado_codigo === 'CANCELADO' ? 'red' : pedido.estado_codigo === 'ENTREGADO' ? 'green' : 'blue'}>{labels[pedido.estado_codigo]}</Badge></div></div>
    <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Linea de tiempo</h2><div className="grid gap-3 sm:grid-cols-4">{ORDER.map((estado, index) => <div key={estado} className={`rounded-lg border p-3 text-sm ${index <= currentIndex ? 'border-[#2a7a8a] bg-[#2a7a8a]/10 text-gray-900 dark:text-white' : 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'}`}>{labels[estado]}</div>)}</div>{pedido.historial?.map((event) => <div key={event.id} className="mt-3 border-l-2 border-[#2a7a8a] pl-3 text-sm text-gray-900 dark:text-gray-100"><strong>{labels[event.estado_hacia] ?? event.estado_hacia}</strong><p className="text-xs text-gray-500 dark:text-gray-400">{new Date(event.created_at).toLocaleString('es-AR')}{event.motivo ? ` - ${event.motivo}` : ''}</p></div>)}</section>
    <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Productos</h2>{details.map((detail) => <div key={detail.producto_id} className="flex justify-between border-b border-gray-100 py-3 last:border-0 dark:border-gray-700"><div><strong className="text-gray-900 dark:text-white">{detail.nombre_snapshot}</strong><p className="text-sm text-gray-500 dark:text-gray-400">{detail.cantidad} x ${Number(detail.precio_snapshot).toFixed(2)}</p>{Boolean(detail.personalizacion?.length) && <p className="text-xs text-[#2a7a8a] dark:text-cyan-300">Sin ingredientes: {detail.personalizacion?.join(', ')}</p>}</div><strong className="text-gray-900 dark:text-white">${Number(detail.subtotal_snap).toFixed(2)}</strong></div>)}<div className="mt-4 text-right text-2xl font-bold text-gray-900 dark:text-white">${Number(pedido.total).toFixed(2)}</div></section>
    {pedido.pago && <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pago Mercado Pago</h2><p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Estado: <strong className="text-gray-900 dark:text-white">{pedido.pago.mp_status}</strong></p><p className="text-sm text-gray-700 dark:text-gray-300">ID: {pedido.pago.mp_payment_id ?? 'Pendiente'}</p></section>}
  </div>;
}
