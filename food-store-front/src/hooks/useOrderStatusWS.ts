import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useWsStore } from '../store/wsStore';
import { pedidoKeys } from './usePedidos';
import type { OrderEvent, Pedido } from '../types/store';

function wsBaseUrl() {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (!configured || configured.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${configured ?? '/api/v1'}`;
  }
  return configured.replace(/^http/, 'ws').replace(/\/+$/, '');
}

export function useAdminOrdersFeed(enabled: boolean) {
  const token = useAuthStore((state) => state.accessToken);
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
      socket = new WebSocket(`${wsBaseUrl()}/pedidos/ws/pedidos?token=${encodeURIComponent(token as string)}`);
      socket.onopen = () => {
        attempt = 0;
        store.setReconnectAttempt(0);
        store.setStatus('connected');
      };
      socket.onmessage = (message) => {
        const event = JSON.parse(message.data) as OrderEvent;
        store.setLastEvent(event);
        queryClient.invalidateQueries({ queryKey: pedidoKeys.all });
        queryClient.setQueryData<Pedido>(pedidoKeys.detail(event.pedido_id), (previous) =>
          previous ? { ...previous, estado_codigo: event.estado_nuevo } : previous,
        );
      };
      socket.onerror = () => store.setStatus('error');
      socket.onclose = () => {
        if (disposed) return;
        attempt += 1;
        store.setReconnectAttempt(attempt);
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
  }, [enabled, token, queryClient]);
}

export function useOrderStatusWS(pedidoId?: number) {
  const status = useWsStore((state) => state.status);
  const lastEvent = useWsStore((state) => state.lastEvent);
  return {
    status,
    lastEvent: lastEvent?.pedido_id === pedidoId ? lastEvent : null,
    usesPollingFallback: true,
  };
}
