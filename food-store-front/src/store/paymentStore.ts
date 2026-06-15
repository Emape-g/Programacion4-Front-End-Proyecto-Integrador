import { create } from 'zustand';
import type { Pago, PaymentStatus } from '../types/store';

interface PaymentStore {
  status: PaymentStatus;
  pedidoId: number | null;
  payment: Pago | null;
  error: string | null;
  begin: (pedidoId: number) => void;
  resolve: (payment: Pago) => void;
  fail: (message: string) => void;
  reset: () => void;
}

export const usePaymentStore = create<PaymentStore>((set) => ({
  status: 'idle',
  pedidoId: null,
  payment: null,
  error: null,
  begin: (pedidoId) => set({ status: 'processing', pedidoId, payment: null, error: null }),
  resolve: (payment) => {
    const status: PaymentStatus =
      (payment.mp_status || payment.estado) === 'approved'
        ? 'approved'
        : ['pending', 'in_process'].includes(payment.mp_status || payment.estado)
          ? 'pending'
          : 'rejected';
    set({ payment, status, error: null });
  },
  fail: (error) => set({ status: 'error', error }),
  reset: () => set({ status: 'idle', pedidoId: null, payment: null, error: null }),
}));
