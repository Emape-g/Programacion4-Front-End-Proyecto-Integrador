import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Radio, RefreshCw } from 'lucide-react';
import { cambiarEstadoPedido } from '../../api/cliente';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAdminOrdersFeed } from '../../hooks/useOrderStatusWS';
import { pedidoKeys, usePedidos } from '../../hooks/usePedidos';
import { useWsStore } from '../../store/wsStore';
import type { EstadoPedido, Pedido } from '../../types/store';

const NEXT_STATES: Record<EstadoPedido, EstadoPedido[]> = {
  PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EN_PREP', 'CANCELADO'],
  EN_PREP: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

function label(estado: EstadoPedido | string) {
  return { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', EN_PREP: 'En preparacion', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado' }[estado] ?? estado;
}

function variant(estado: EstadoPedido) {
  if (estado === 'ENTREGADO') return 'green';
  if (estado === 'CANCELADO') return 'red';
  if (estado === 'PENDIENTE') return 'orange';
  return 'blue';
}

function cliente(pedido: Pedido) {
  const nombre = [pedido.usuario?.nombre, pedido.usuario?.apellido].filter(Boolean).join(' ');
  return nombre || pedido.usuario_nombre || pedido.cliente_nombre || (pedido.usuario_id ? `Usuario #${pedido.usuario_id}` : 'Cliente no disponible');
}

function realtimeLabel(status: string) {
  if (status === 'connected') return 'En tiempo real';
  if (status === 'error' || status === 'disconnected') return 'Actualizacion automatica';
  return 'Reconectando';
}

export function AdminPedidosPage() {
  useAdminOrdersFeed(true);
  const wsStatus = useWsStore((state) => state.status);
  const queryClient = useQueryClient();
  const [estadoFilter, setEstadoFilter] = useState('');
  const [target, setTarget] = useState<{ pedido: Pedido; estado: EstadoPedido } | null>(null);
  const [motivo, setMotivo] = useState('');
  const pedidosQuery = usePedidos(1, 100, estadoFilter || undefined, { refetchInterval: wsStatus === 'connected' ? false : 5_000 });
  const pedidos = [...(pedidosQuery.data?.items ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const mutation = useMutation({
    mutationFn: () => cambiarEstadoPedido(target?.pedido.id ?? 0, target?.estado ?? 'PENDIENTE', motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidoKeys.all });
      queryClient.invalidateQueries({ queryKey: ['estadisticas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      setTarget(null);
      setMotivo('');
    },
  });

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pedidos</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestion de estados y seguimiento operativo.</p></div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"><Radio size={13} className={wsStatus === 'connected' ? 'text-green-600' : wsStatus === 'error' ? 'text-gray-500' : 'text-amber-600'} />{realtimeLabel(wsStatus)}</span>
          <select value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"><option value="">Todos</option>{Object.keys(NEXT_STATES).map((estado) => <option key={estado} value={estado}>{label(estado as EstadoPedido)}</option>)}</select>
          <button onClick={() => pedidosQuery.refetch()} className="rounded-lg border border-gray-300 p-2.5 text-gray-700 dark:border-gray-600 dark:text-gray-200" title="Actualizar"><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
        {pedidosQuery.isLoading ? <div className="p-5 text-sm text-gray-500 dark:text-gray-400">Cargando pedidos...</div> : pedidosQuery.isError ? <div className="p-5 text-sm text-red-600 dark:text-red-400">No se pudieron cargar los pedidos.</div> : (
          pedidos.length === 0 ? <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No hay pedidos para mostrar.</div> : <table className="min-w-[850px] w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/40 dark:text-gray-400"><tr><th className="px-4 py-3 text-left">Pedido</th><th className="px-4 py-3 text-left">Cliente</th><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody>{pedidos.map((pedido) => <tr key={pedido.id} className="border-t border-gray-100 dark:border-gray-700"><td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">#{pedido.id}</td><td className="px-4 py-3 text-gray-500 dark:text-gray-300">{cliente(pedido)}</td><td className="px-4 py-3 text-gray-500 dark:text-gray-300">{new Date(pedido.created_at).toLocaleString('es-AR')}</td><td className="px-4 py-3"><Badge variant={variant(pedido.estado_codigo)}>{label(pedido.estado_codigo)}</Badge></td><td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">${Number(pedido.total).toFixed(2)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Link to={`/admin/pedidos/${pedido.id}`} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">Ver</Link>{(NEXT_STATES[pedido.estado_codigo] ?? []).map((estado) => <button key={estado} onClick={() => setTarget({ pedido, estado })} className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${estado === 'CANCELADO' ? 'bg-red-600' : 'bg-[#2a7a8a]'}`}>{label(estado)}</button>)}</div></td></tr>)}</tbody>
          </table>
        )}
      </div>

      <Modal isOpen={Boolean(target)} onClose={() => setTarget(null)} title={`Cambiar a ${target ? label(target.estado) : ''}`} size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-300">Pedido #{target?.pedido.id}. Confirma el cambio de estado.</p>
        {target?.estado === 'CANCELADO' && <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={3} placeholder="Motivo obligatorio" className="mt-4 w-full rounded-lg border p-3 text-sm dark:border-gray-600 dark:bg-gray-900" />}
        {mutation.isError && <p className="mt-3 text-sm text-red-600">No se pudo cambiar el estado.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">Volver</button><button disabled={mutation.isPending || (target?.estado === 'CANCELADO' && !motivo.trim())} onClick={() => mutation.mutate()} className="rounded-lg bg-[#2a7a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{mutation.isPending ? 'Guardando...' : 'Confirmar'}</button></div>
      </Modal>
    </div>
  );
}
