import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { confirmarPagoMercadoPago } from '../../api/cliente';

function findPendingPedidoId() {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith('foodstore_mp_pending_')) continue;
    try {
      const pending = JSON.parse(localStorage.getItem(key) || '{}') as { pedido?: { id?: number } };
      if (pending.pedido?.id) return pending.pedido.id;
    } catch {
      localStorage.removeItem(key);
    }
  }
  return null;
}

function clearPendingPayments() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('foodstore_mp_pending_'))
    .forEach((key) => localStorage.removeItem(key));
}

export function CheckoutReturnPage() {
  const navigate = useNavigate();
  const { estado } = useParams();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Procesando resultado del pago...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processReturn() {
      const pedidoId = findPendingPedidoId();
      const paymentId = Number(searchParams.get('payment_id') || searchParams.get('collection_id') || '');
      const status = searchParams.get('status') || searchParams.get('collection_status') || estado;

      if (!pedidoId) {
        setMessage('No encontramos un pedido pendiente de Mercado Pago en este navegador.');
        setLoading(false);
        return;
      }

      if (status === 'approved' || estado === 'success') {
        try {
          await confirmarPagoMercadoPago(pedidoId, Number.isFinite(paymentId) ? paymentId : undefined);
          clearPendingPayments();
          navigate(`/pedidos/${pedidoId}`, { replace: true });
          return;
        } catch {
          setMessage('El pago volvio como aprobado, pero no se pudo confirmarlo todavia. Revisalo desde tus pedidos.');
          setLoading(false);
          return;
        }
      }

      if (estado === 'failure') {
        setMessage('El pago no se completo. Podes revisar o cancelar el pedido desde tus pedidos.');
      } else {
        setMessage('El pago quedo pendiente. Cuando Mercado Pago lo confirme, el pedido se actualizara.');
      }
      setLoading(false);
    }

    void processReturn();
  }, [estado, navigate, searchParams]);

  const Icon = estado === 'success' ? CheckCircle2 : estado === 'failure' ? XCircle : Clock;

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Icon className="mx-auto text-[#2a7a8a]" size={42} />
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Mercado Pago</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{message}</p>
      {loading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">Un momento...</p>
      ) : (
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/mis-pedidos" className="rounded-lg bg-[#2a7a8a] px-4 py-2 text-sm font-medium text-white">
            Ver mis pedidos
          </Link>
          <Link to="/hacer-pedido" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">
            Ver productos
          </Link>
        </div>
      )}
    </div>
  );
}
