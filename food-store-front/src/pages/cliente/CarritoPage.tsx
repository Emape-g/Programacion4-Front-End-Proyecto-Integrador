import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, ExternalLink, Minus, Plus, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import { cancelarPedido, confirmarPagoMercadoPago, createPedido, crearPagoMercadoPago, getFormasPago, getMisDirecciones, getPedido } from '../../api/cliente';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { isClientUser } from '../../utils/roles';
import type { DireccionEntrega, FormaPago, IngredienteProducto, PagoCrearResponse, Pedido, Producto } from '../../types/store';
import {
  validarStockActualCarrito,
} from '../../utils/stockIngredientes';

const DELIVERY_COST = 50;

interface PendingMercadoPagoOrder {
  pedido: Pedido;
  preferencia: PagoCrearResponse | null;
  estadoPago: string;
}

function money(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

function direccionTexto(direccion: DireccionEntrega) {
  return [direccion.linea1, direccion.linea2, direccion.ciudad, direccion.provincia].filter(Boolean).join(', ');
}

function formaPagoLabel(pago: FormaPago) {
  if (pago.codigo === 'EFECTIVO') return 'Efectivo';
  if (pago.codigo === 'MERCADOPAGO') return 'Mercado Pago';
  if (pago.codigo === 'TRANSFERENCIA') return 'Transferencia';
  return pago.descripcion;
}

function removibles(ingredientes?: IngredienteProducto[]) {
  return ingredientes?.filter((ingrediente) => ingrediente.es_removible) ?? [];
}

function stockRestante(stock: number, cantidad: number) {
  return Math.max(0, Number(stock) - cantidad);
}

function pendingPaymentKey(userId?: number) {
  return userId ? `foodstore_mp_pending_${userId}` : null;
}

function abrirMercadoPago(initPoint: string) {
  window.location.assign(initPoint);
}

export function CarritoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { items, total, updateQuantity, updatePersonalizacion, removeItem, clearCart } = useCart();
  const [direcciones, setDirecciones] = useState<DireccionEntrega[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [direccionId, setDireccionId] = useState<number | ''>('');
  const [formaPago, setFormaPago] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [pedidoCreado, setPedidoCreado] = useState<Pedido | null>(null);
  const [preferenciaPago, setPreferenciaPago] = useState<PagoCrearResponse | null>(null);
  const [comprobandoPago, setComprobandoPago] = useState(false);
  const [cancelandoPendiente, setCancelandoPendiente] = useState(false);
  const [redirigiendoPago, setRedirigiendoPago] = useState(false);
  const [estadoPago, setEstadoPago] = useState('');
  const [pendingVersion, setPendingVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([user ? getMisDirecciones() : Promise.resolve([]), getFormasPago()])
      .then(([addresses, payments]) => {
        if (!active) return;
        setDirecciones(addresses);
        setFormasPago(payments.filter((payment) => payment.habilitado));
        setDireccionId(addresses.find((address) => address.es_principal)?.id ?? addresses[0]?.id ?? '');
        setFormaPago('');
      })
      .catch(() => setError('No se pudieron cargar los datos del checkout.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  const pagoPendienteGuardado = useMemo(() => {
    void pendingVersion;
    const key = pendingPaymentKey(user?.id);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const pending = JSON.parse(raw) as PendingMercadoPagoOrder;
      return pending?.pedido?.id ? pending : null;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }, [user?.id, pendingVersion]);

  const pedidoMercadoPago = pedidoCreado ?? pagoPendienteGuardado?.pedido ?? null;
  const preferenciaMercadoPago = preferenciaPago ?? pagoPendienteGuardado?.preferencia ?? null;
  const estadoPagoActual = estadoPago || pagoPendienteGuardado?.estadoPago || '';

  const guardarPagoPendiente = useCallback((pedido: Pedido, preferencia: PagoCrearResponse | null, estado = '') => {
    const key = pendingPaymentKey(user?.id);
    if (!key) return;
    const pending: PendingMercadoPagoOrder = { pedido, preferencia, estadoPago: estado };
    localStorage.setItem(key, JSON.stringify(pending));
    setPendingVersion((version) => version + 1);
  }, [user?.id]);

  const limpiarPagoPendiente = useCallback(() => {
    const key = pendingPaymentKey(user?.id);
    if (key) localStorage.removeItem(key);
    setPedidoCreado(null);
    setPreferenciaPago(null);
    setEstadoPago('');
    setPendingVersion((version) => version + 1);
  }, [user?.id]);

  useEffect(() => {
    if (!pagoPendienteGuardado?.pedido.id) return;
    let active = true;

    getPedido(pagoPendienteGuardado.pedido.id)
      .then((pedidoActual) => {
        if (!active) return;
        if (['CANCELADO', 'ENTREGADO'].includes(pedidoActual.estado_codigo)) {
          limpiarPagoPendiente();
          setError('');
          return;
        }
        if (pedidoActual.estado_codigo !== pagoPendienteGuardado.pedido.estado_codigo) {
          guardarPagoPendiente(pedidoActual, pagoPendienteGuardado.preferencia, pagoPendienteGuardado.estadoPago);
        }
      })
      .catch(() => {
        if (active) limpiarPagoPendiente();
      });

    return () => {
      active = false;
    };
  }, [guardarPagoPendiente, limpiarPagoPendiente, pagoPendienteGuardado]);

  function stockCalculado(item: { producto: Producto; personalizacion: number[] }) {
    return Math.max(0, Number(item.producto.stock_cantidad ?? 0));
  }

  const totalFinal = total + (items.length ? DELIVERY_COST : 0);
  const puedeConfirmar = useMemo(
    () => items.length > 0 && !submitting && Boolean(formaPago) && (!user || Boolean(direccionId)),
    [items.length, submitting, formaPago, user, direccionId],
  );

  function solicitarConfirmacion() {
    if (!user) {
      navigate('/login', {
        state: { redirectTo: '/carrito', message: 'Inicia sesion para confirmar tu pedido.' },
      });
      return;
    }
    if (!isClientUser(user)) {
      setError('Los usuarios administrativos no pueden realizar pedidos.');
      return;
    }
    if (!direcciones.length) {
      navigate('/perfil', { state: { alert: 'Agrega una direccion para poder finalizar tu pedido.' } });
      return;
    }
    setConfirmOpen(true);
  }

  async function crearPedido() {
    if (!user || !direccionId) return;
    setConfirmOpen(false);
    setSubmitting(true);
    setError('');
    try {
      await validarStockActualCarrito(items);
      const pedido = await createPedido({
        direccion_id: Number(direccionId),
        forma_pago_codigo: formaPago,
        notas: notas.trim() || null,
        items: items.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad,
          personalizacion: item.personalizacion,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ['estadisticas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      setPedidoCreado(pedido);
      if (formaPago === 'MERCADOPAGO') {
        setRedirigiendoPago(true);
        guardarPagoPendiente(pedido, null);
        const preference = await crearPagoMercadoPago(pedido.id);
        if (!preference.init_point) {
          throw new Error('Mercado Pago no devolvio una URL de pago.');
        }
        setPreferenciaPago(preference);
        guardarPagoPendiente(pedido, preference);
        clearCart();
        abrirMercadoPago(preference.init_point);
        return;
      }
      clearCart();
      navigate(`/pedidos/${pedido.id}`, { replace: true });
    } catch (requestError) {
      const detail = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      const message = requestError instanceof Error ? requestError.message : null;
      setError(detail ?? message ?? 'No se pudo crear el pedido.');
      setRedirigiendoPago(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function comprobarPago() {
    if (!pedidoMercadoPago) return;
    setComprobandoPago(true);
    setError('');
    try {
      const resultado = await confirmarPagoMercadoPago(pedidoMercadoPago.id);
      const estado = resultado.estado ?? 'pendiente';
      setEstadoPago(estado);
      if (estado === 'aprobado') {
        limpiarPagoPendiente();
        navigate(`/pedidos/${pedidoMercadoPago.id}`, { replace: true });
      } else {
        guardarPagoPendiente(pedidoMercadoPago, preferenciaMercadoPago, estado);
      }
    } catch (requestError) {
      const detail = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail ?? 'No se pudo comprobar el pago. Intenta nuevamente en unos segundos.');
    } finally {
      setComprobandoPago(false);
    }
  }

  async function reintentarPago() {
    if (!pedidoMercadoPago) return;
    setRedirigiendoPago(true);
    setSubmitting(true);
    setError('');
    try {
      const preference = await crearPagoMercadoPago(pedidoMercadoPago.id);
      if (!preference.init_point) {
        throw new Error('Mercado Pago no devolvio una URL de pago.');
      }
      setPreferenciaPago(preference);
      guardarPagoPendiente(pedidoMercadoPago, preference, estadoPagoActual);
      clearCart();
      abrirMercadoPago(preference.init_point);
    } catch (requestError) {
      const detail = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      const message = requestError instanceof Error ? requestError.message : null;
      setError(detail ?? message ?? 'No se pudo crear la preferencia de Mercado Pago.');
      setRedirigiendoPago(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelarPagoPendiente() {
    if (!pedidoMercadoPago) return;
    setCancelandoPendiente(true);
    setError('');
    try {
      await cancelarPedido(pedidoMercadoPago.id);
      queryClient.invalidateQueries({ queryKey: ['estadisticas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      limpiarPagoPendiente();
    } catch (requestError) {
      const detail = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail ?? 'No se pudo cancelar el pedido pendiente.');
    } finally {
      setCancelandoPendiente(false);
    }
  }

  if (redirigiendoPago) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <RefreshCw className="animate-spin text-[#2a7a8a]" size={42} />
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">Abriendo Mercado Pago</h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Estamos preparando el pago seguro. En unos segundos vas a Mercado Pago.
        </p>
      </div>
    );
  }

  if (pedidoMercadoPago && (formaPago === 'MERCADOPAGO' || preferenciaMercadoPago || pagoPendienteGuardado)) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <CreditCard size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagar pedido #{pedidoMercadoPago.id}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">El pago se procesa de forma segura en Mercado Pago.</p>
            </div>
          </div>
          {preferenciaMercadoPago?.init_point ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Abre Mercado Pago, completa el pago de prueba y luego vuelve a esta pantalla para comprobarlo.
              </p>
              <a
                href={preferenciaMercadoPago.init_point}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#009ee3] px-4 py-3 text-sm font-semibold text-white hover:bg-[#008dcc]"
              >
                <ExternalLink size={17} />
                Abrir Mercado Pago
              </a>
              <button
                type="button"
                disabled={comprobandoPago}
                onClick={comprobarPago}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#2a7a8a] px-4 py-3 text-sm font-semibold text-[#2a7a8a] hover:bg-[#2a7a8a]/5 disabled:opacity-50"
              >
                {estadoPagoActual === 'aprobado' ? <CheckCircle2 size={17} /> : <RefreshCw size={17} className={comprobandoPago ? 'animate-spin' : ''} />}
                {comprobandoPago ? 'Comprobando...' : 'Ya pague, comprobar estado'}
              </button>
              {estadoPagoActual && estadoPagoActual !== 'aprobado' && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  El pago todavía figura como {estadoPagoActual}. Espera unos segundos y vuelve a comprobar.
                </p>
              )}
              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
              <button
                type="button"
                disabled={cancelandoPendiente}
                onClick={cancelarPagoPendiente}
                className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:hover:bg-red-950/30"
              >
                {cancelandoPendiente ? 'Cancelando...' : 'Cancelar pedido pendiente'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error || 'No se pudo crear la preferencia de Mercado Pago.'}
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={reintentarPago}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#009ee3] px-4 py-3 text-sm font-semibold text-white hover:bg-[#008dcc] disabled:opacity-50"
              >
                <RefreshCw size={17} className={submitting ? 'animate-spin' : ''} />
                {submitting ? 'Creando pago...' : 'Reintentar Mercado Pago'}
              </button>
              <button
                type="button"
                disabled={cancelandoPendiente}
                onClick={cancelarPagoPendiente}
                className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:hover:bg-red-950/30"
              >
                {cancelandoPendiente ? 'Cancelando...' : 'Cancelar pedido pendiente'}
              </button>
            </div>
          )}
        </section>
        <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Tenes un pedido de Mercado Pago pendiente. Para hacer otro pedido, primero tenes que pagarlo o cancelarlo.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total del pedido</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{money(Number(pedidoMercadoPago.total))}</p>
          <Link to={`/pedidos/${pedidoMercadoPago.id}`} className="mt-5 block text-sm font-medium text-[#2a7a8a]">
            Ver pedido pendiente
          </Link>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tu carrito</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajusta cantidades y personaliza los ingredientes removibles.</p>
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <ShoppingBag className="mx-auto text-gray-300" size={38} />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Tu carrito esta vacio.</p>
            <Link to="/hacer-pedido" className="mt-4 inline-block text-sm font-medium text-[#2a7a8a]">Ver productos</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.producto.id} className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:grid-cols-[96px_minmax(0,1fr)_auto]">
                <img src={item.producto.imagenes_url?.[0] || '/favicon.svg'} alt={item.producto.nombre} className="h-24 w-24 rounded-lg object-cover" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{item.producto.nombre}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{money(Number(item.producto.precio_base))}</p>
                  <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                    Tenes {item.cantidad} de {stockCalculado(item)}. Quedan {stockRestante(stockCalculado(item), item.cantidad)}.
                  </p>
                  {removibles(item.producto.ingredientes).length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Quitar ingredientes</p>
                      <div className="flex flex-wrap gap-2">
                        {removibles(item.producto.ingredientes).map((ingrediente) => {
                          const selected = item.personalizacion.includes(ingrediente.ingrediente_id);
                          return (
                            <label key={ingrediente.ingrediente_id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${selected ? 'border-[#2a7a8a] bg-[#2a7a8a] text-white' : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'}`}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={selected}
                                onChange={(event) => updatePersonalizacion(
                                  item.producto.id,
                                  event.target.checked
                                    ? [...item.personalizacion, ingrediente.ingrediente_id]
                                    : item.personalizacion.filter((id) => id !== ingrediente.ingrediente_id),
                                )}
                              />
                              Sin {ingrediente.nombre_ingrediente}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 md:flex-col md:items-end md:justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.producto.id, item.cantidad - 1)} className="rounded-lg border border-gray-300 p-2 text-gray-700 dark:border-gray-600 dark:text-gray-200"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.cantidad}</span>
                    <button disabled={item.cantidad >= stockCalculado(item)} onClick={() => updateQuantity(item.producto.id, Math.min(stockCalculado(item), item.cantidad + 1))} className="rounded-lg border border-gray-300 p-2 text-gray-700 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"><Plus size={14} /></button>
                    <button onClick={() => removeItem(item.producto.id)} className="rounded-lg p-2 text-red-600"><Trash2 size={16} /></button>
                  </div>
                  <strong className="text-gray-900 dark:text-white">{money(Number(item.producto.precio_base) * item.cantidad)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="h-fit rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Finalizar pedido</h2>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {loading ? <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Cargando checkout...</p> : (
          <div className="mt-5 space-y-4">
            {!user && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">Puedes armar el carrito, pero necesitas iniciar sesion para comprar.</p>}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Direccion de entrega</label>
              {direcciones.length ? (
                <select value={direccionId} onChange={(event) => setDireccionId(Number(event.target.value))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                  {direcciones.map((direccion) => <option key={direccion.id} value={direccion.id}>{direccion.es_principal ? 'Principal - ' : ''}{direccion.alias || direccionTexto(direccion)}</option>)}
                </select>
              ) : <button onClick={solicitarConfirmacion} className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">No tienes direcciones cargadas</button>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Forma de pago</label>
              <select value={formaPago} onChange={(event) => setFormaPago(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                <option value="">Seleccionar forma de pago</option>
                {formasPago.map((payment) => <option key={payment.codigo} value={payment.codigo}>{formaPagoLabel(payment)}</option>)}
              </select>
            </div>
            <textarea value={notas} onChange={(event) => setNotas(event.target.value)} rows={3} placeholder="Notas para el pedido" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            <div className="space-y-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-700">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{money(total)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Envio</span><span>{money(items.length ? DELIVERY_COST : 0)}</span></div>
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white"><span>Total estimado</span><span>{money(totalFinal)}</span></div>
            </div>
            <button disabled={!puedeConfirmar} onClick={solicitarConfirmacion} className="w-full rounded-lg bg-[#2a7a8a] px-4 py-3 text-sm font-medium text-white disabled:opacity-50">{submitting ? 'Creando pedido...' : formaPago === 'MERCADOPAGO' ? 'Continuar al pago' : 'Confirmar pedido'}</button>
          </div>
        )}
      </aside>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Confirmar pedido"
        message={`Se creara el pedido por un total estimado de ${money(totalFinal)}. ¿Deseas continuar?`}
        confirmLabel="Confirmar"
        confirmLoadingLabel="Creando..."
        confirmVariant="green"
        loading={submitting}
        onConfirm={crearPedido}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
