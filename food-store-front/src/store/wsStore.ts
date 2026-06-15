import { create } from 'zustand';
import type { ConnectionStatus, OrderEvent } from '../types/store';

interface WsStore {
  status: ConnectionStatus;
  reconnectAttempt: number;
  lastEvent: OrderEvent | null;
  setStatus: (status: ConnectionStatus) => void;
  setReconnectAttempt: (attempt: number) => void;
  setLastEvent: (event: OrderEvent) => void;
  reset: () => void;
}

export const useWsStore = create<WsStore>((set) => ({
  status: 'disconnected',
  reconnectAttempt: 0,
  lastEvent: null,
  setStatus: (status) => set({ status }),
  setReconnectAttempt: (reconnectAttempt) => set({ reconnectAttempt }),
  setLastEvent: (lastEvent) => set({ lastEvent }),
  reset: () => set({ status: 'disconnected', reconnectAttempt: 0, lastEvent: null }),
}));
