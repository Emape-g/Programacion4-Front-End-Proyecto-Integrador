import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useWsStore } from '../store/wsStore';
import { pedidoKeys } from './usePedidos';
import type { OrderEvent, Pedido } from '../types/store';

const MAX_RECONNECT_ATTEMPTS = 5;
const API_PREFIX = /\/api\/v\d+\/?$/;

function wsBaseUrl() {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (!configured || configured.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return configured.replace(/^http/, 'ws').replace(API_PREFIX, '').replace(/\/+$/, '');
}

function applyEvent(queryClient: ReturnType<typeof useQueryClient>, event: OrderEvent) {
  useWsStore.getState().setLastEvent(event);
  queryClient.invalidateQueries({ queryKey: pedidoKeys.all });
  if (event.event === 'pago_confirmado') {
    queryClient.invalidateQueries({ queryKey: pedidoKeys.detail(event.pedido_id) });
    return;
  }
  queryClient.setQueryData<Pedido>(pedidoKeys.detail(event.pedido_id), (previous) =>
    previous ? { ...previous, estado_codigo: event.estado_nuevo } : previous,
  );
}

function useWsConnection(path: string, enabled: boolean) {
  const token = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !token) return;
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    let disposed = false;
    let attempt = 0;
    const store = useWsStore.getState();

    function connect() {
      store.setStatus(attempt ? 'reconnecting' : 'connecting');
      socket = new WebSocket(`${wsBaseUrl()}${path}?token=${encodeURIComponent(token as string)}`);
      socket.onopen = () => {
        attempt = 0;
        store.setReconnectAttempt(0);
        store.setStatus('connected');
      };
      socket.onmessage = (message) => {
        try {
          applyEvent(queryClient, JSON.parse(message.data) as OrderEvent);
        } catch {
          // ignore non-JSON frames
        }
      };
      socket.onerror = () => store.setStatus('error');
      socket.onclose = (event) => {
        if (disposed) return;
        if (event.code === 4001) {
          store.setStatus('error');
          clearSession();
          return;
        }
        if (event.code === 4003) {
          store.setStatus('error');
          return;
        }
        attempt += 1;
        store.setReconnectAttempt(attempt);
        if (attempt > MAX_RECONNECT_ATTEMPTS) {
          store.setStatus('error');
          return;
        }
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
        retryTimer = window.setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
      store.reset();
    };
  }, [enabled, token, path, queryClient, clearSession]);
}

export function useAdminOrdersFeed(enabled: boolean) {
  useWsConnection('/ws/admin/pedidos', enabled);
}

export function useOrderStatusWS(pedidoId?: number) {
  const enabled = Number.isFinite(pedidoId);
  useWsConnection(`/ws/pedidos/${pedidoId ?? 0}`, enabled);
  const status = useWsStore((state) => state.status);
  const lastEvent = useWsStore((state) => state.lastEvent);
  return {
    status,
    lastEvent: lastEvent?.pedido_id === pedidoId ? lastEvent : null,
    usesPollingFallback: status !== 'connected',
  };
}
