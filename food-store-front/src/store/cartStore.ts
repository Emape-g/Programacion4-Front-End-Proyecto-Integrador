import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Producto } from '../types/store';

export interface CartItem {
  producto: Producto;
  cantidad: number;
  personalizacion: number[];
}

interface CartStore {
  items: CartItem[];
  addItem: (producto: Producto, cantidad?: number) => void;
  updateQuantity: (productoId: number, cantidad: number) => void;
  updatePersonalizacion: (productoId: number, ingredientes: number[]) => void;
  removeItem: (productoId: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (producto, cantidad = 1) =>
        set((state) => {
          const stock = Math.max(0, Number(producto.stock_cantidad));
          if (stock <= 0) return state;
          const current = state.items.find((item) => item.producto.id === producto.id);
          if (current) {
            const nuevaCantidad = Math.min(stock, current.cantidad + cantidad);
            if (nuevaCantidad <= 0) return state;
            return {
              items: state.items.map((it) =>
                it.producto.id === producto.id
                  ? { ...it, producto, cantidad: nuevaCantidad }
                  : it,
              ),
            };
          }
          const cantidadInicial = Math.min(stock, cantidad);
          if (cantidadInicial <= 0) return state;
          return {
            items: [...state.items, { producto, cantidad: cantidadInicial, personalizacion: [] }],
          };
        }),
      updateQuantity: (productoId, cantidad) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.producto.id === productoId
              ? {
                  ...item,
                  cantidad: Math.max(1, Math.min(Number(item.producto.stock_cantidad), cantidad)),
                }
              : item,
          ),
        })),
      updatePersonalizacion: (productoId, ingredientes) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.producto.id === productoId ? { ...item, personalizacion: ingredientes } : item,
          ),
        })),
      removeItem: (productoId) =>
        set((state) => ({ items: state.items.filter((item) => item.producto.id !== productoId) })),
      clearCart: () => set({ items: [] }),
      setItems: (items) => set({ items }),
    }),
    {
      name: 'foodstore_cart',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { items?: CartItem[] };
        return {
          ...state,
          items: (state.items ?? []).map((item) => ({
            ...item,
            personalizacion: item.personalizacion ?? [],
          })),
        };
      },
    },
  ),
);
