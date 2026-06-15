import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface UiStore {
  mobileMenuOpen: boolean;
  cartOpen: boolean;
  toast: ToastState | null;
  setMobileMenuOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
  showToast: (message: string, kind?: ToastKind) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  mobileMenuOpen: false,
  cartOpen: false,
  toast: null,
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setCartOpen: (cartOpen) => set({ cartOpen }),
  showToast: (message, kind = 'info') => set({ toast: { id: Date.now(), message, kind } }),
  clearToast: () => set({ toast: null }),
}));
