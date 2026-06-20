import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Clock, PackageCheck, Radio } from 'lucide-react';
import { cancelarPedido } from '../../api/cliente';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useOrderStatusWS } from '../../hooks/useOrderStatusWS';
import { pedidoKeys, usePedido, usePedidos } from '../../hooks/usePedidos';
import type { EstadoPedido } from '../../types/store';

const ORDER: EstadoPedido[] = ['PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'ENTREGADO'];

function money(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value));
}

function estadoLabel(estado: EstadoPedido) {
  return { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', EN_PREP: 'En preparacion', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado' }[estado] ?? estado;
}

function estadoVariant(estado: EstadoPedido) {
  if (estado === 'ENTREGADO') return 'green';
  if (estado === 'CANCELADO') return 'red';
  if (estado === 'PENDIENTE') return 'orange';
  return 'blue';
}

function fecha(value: string) {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export function PedidosPage() {
  const pedidosQuery = usePedidos(1, 100);
  const pedidos = [...(pedidosQuery.data?.items ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const pedidoActual = pedidos.find((pedido) => !['ENTREGADO', 'CANCELADO'].includes(pedido.estado_codigo));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis pedidos</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Estado actual e historial de tus compras.</p>
      </div>
      {pedidoActual && (
        <Link to={`/pedidos/${pedidoActual.id}`} className="flex items-center justify-between rounded-lg border border-[#2a7a8a]/30 bg-[#2a7a8a]/5 p-5 dark:bg-[#2a7a8a]/10">
          <div className="flex items-center gap-3"><span className="rounded-lg bg-[#2a7a8a]/10 p-3 text-[#2a7a8a] dark:text-cyan-300"><Clock size={22} /></span><div><p className="text-xs uppercase text-gray-500 dark:text-gray-400">Pedido actual</p><strong className="text-gray-900 dark:text-white">#{pedidoActual.id}</strong></div></div>
          <Badge variant={estadoVariant(pedidoActual.estado_codigo)}>{estadoLabel(pedidoActual.estado_codigo)}</Badge>
        </Link>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {pedidosQuery.isLoading ? <div className="p-5 text-sm text-gray-500 dark:text-gray-400">Cargando pedidos...</div> : pedidosQuery.isError ? <div className="p-5 text-sm text-red-600 dark:text-red-400">No se pudieron cargar tus pedidos.</div> : pedidos.length === 0 ? (
          <div className="py-16 text-center"><PackageCheck className="mx-auto text-gray-300 dark:text-gray-600" size={38} /><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Todavia no hiciste pedidos.</p></div>
        ) : (
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/40 dark:text-gray-400"><tr><th className="px-4 py-3 text-left">Pedido</th><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Detalle</th></tr></thead>
            <tbody>{pedidos.map((pedido) => <tr key={pedido.id} className="border-t border-gray-100 dark:border-gray-700"><td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">#{pedido.id}</td><td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fecha(pedido.created_at)}</td><td className="px-4 py-3"><Badge variant={estadoVariant(pedido.estado_codigo)}>{estadoLabel(pedido.estado_codigo)}</Badge></td><td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{money(pedido.total)}</td><td className="px-4 py-3 text-right"><Link to={`/pedidos/${pedido.id}`} className="font-medium text-[#2a7a8a] dark:text-cyan-300">Ver</Link></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function PedidoDetallePage() {
  const id = Number(useParams().id);
  const queryClient = useQueryClient();
  const pedidoQuery = usePedido(id, 5_000);
  const { status, usesPollingFallback } = useOrderStatusWS(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelMutation = useMutation({
    mutationFn: () => cancelarPedido(id),
    onSuccess: async (pedido) => {
      queryClient.setQueryData(pedidoKeys.detail(id), pedido);
      queryClient.invalidateQueries({ queryKey: pedidoKeys.all });
      queryClient.invalidateQueries({ queryKey: ['estadisticas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      setConfirmOpen(false);
    },
  });

  if (pedidoQuery.isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Cargando pedido...</div>;
  if (pedidoQuery.isError || !pedidoQuery.data) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">No se pudo cargar el pedido.</div>;
  const pedido = pedidoQuery.data;
  const currentIndex = pedido.estado_codigo === 'CANCELADO' ? -1 : ORDER.indexOf(pedido.estado_codigo);
  const detalles = pedido.items ?? pedido.detalles ?? [];
  const puedeCancelar = ['PENDIENTE', 'CONFIRMADO'].includes(pedido.estado_codigo);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><Link to="/mis-pedidos" className="text-sm font-medium text-[#2a7a8a] dark:text-cyan-300">Volver</Link><h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Pedido #{pedido.id}</h1><p className="text-sm text-gray-500 dark:text-gray-400">Creado el {fecha(pedido.created_at)}</p></div>
        <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Radio size={13} className={status === 'connected' ? 'text-green-600' : 'text-amber-500'} />{usesPollingFallback ? 'Actualizacion automatica' : status}</span><Badge variant={estadoVariant(pedido.estado_codigo)}>{estadoLabel(pedido.estado_codigo)}</Badge>{puedeCancelar && <button onClick={() => setConfirmOpen(true)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30">Cancelar</button>}</div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Seguimiento</h2>
        <div className="grid gap-3 sm:grid-cols-4">{ORDER.map((estado, index) => <div key={estado} className={`rounded-lg border px-3 py-3 text-sm ${index <= currentIndex ? 'border-[#2a7a8a] bg-[#2a7a8a]/10 text-[#1a3a4a] dark:text-white' : 'border-gray-200 text-gray-400 dark:border-gray-700'}`}>{estadoLabel(estado)}</div>)}</div>
        {pedido.estado_codigo === 'CANCELADO' && <p className="mt-3 text-sm text-red-600 dark:text-red-400">El pedido fue cancelado.</p>}
        {!!pedido.historial?.length && <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Historial</h3><ol className="mt-3 space-y-3">{pedido.historial.map((item) => <li key={item.id} className="flex gap-3 text-sm text-gray-900 dark:text-gray-100"><span className="mt-1 h-2 w-2 rounded-full bg-[#2a7a8a]" /><div><strong>{estadoLabel(item.estado_hacia)}</strong><p className="text-xs text-gray-500 dark:text-gray-400">{fecha(item.created_at)}{item.motivo ? ` - ${item.motivo}` : ''}</p></div></li>)}</ol></div>}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Productos</h2>
        <div className="space-y-3">{detalles.map((detalle) => <div key={detalle.producto_id} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-gray-700"><div><p className="font-medium text-gray-900 dark:text-white">{detalle.nombre_snapshot}</p><p className="text-sm text-gray-500 dark:text-gray-400">{detalle.cantidad} x {money(detalle.precio_snapshot)}</p>{Boolean(detalle.personalizacion?.length) && <p className="mt-1 text-xs text-[#2a7a8a] dark:text-cyan-300">Ingredientes removidos: {detalle.personalizacion?.join(', ')}</p>}</div><strong className="text-gray-900 dark:text-white">{money(detalle.subtotal_snap)}</strong></div>)}</div>
        <div className="mt-4 space-y-1 border-t border-gray-200 pt-4 text-right dark:border-gray-700"><p className="text-sm text-gray-500 dark:text-gray-400">Subtotal: {money(pedido.subtotal)}</p><p className="text-sm text-gray-500 dark:text-gray-400">Envio: {money(pedido.costo_envio)}</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{money(pedido.total)}</p></div>
      </section>

      {pedido.pago && <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pago</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs uppercase text-gray-500 dark:text-gray-400">Estado</p><p className="font-medium text-gray-900 dark:text-white">{pedido.pago.mp_status || pedido.pago.estado}</p></div><div><p className="text-xs uppercase text-gray-500 dark:text-gray-400">Metodo</p><p className="font-medium text-gray-900 dark:text-white">Mercado Pago</p></div><div><p className="text-xs uppercase text-gray-500 dark:text-gray-400">Monto</p><p className="font-medium text-gray-900 dark:text-white">{money(pedido.pago.monto)}</p></div></div></section>}

      <ConfirmDialog isOpen={confirmOpen} title="Cancelar pedido" message="Se cancelara el pedido. Esta accion no se puede deshacer." confirmLabel="Cancelar pedido" confirmLoadingLabel="Cancelando..." loading={cancelMutation.isPending} onConfirm={() => cancelMutation.mutate()} onCancel={() => setConfirmOpen(false)} />
      {cancelMutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">No se pudo cancelar el pedido.</p>}
    </div>
  );
}
