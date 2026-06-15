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
          const current = state.items.find((item) => item.producto.id === producto.id);
          if (current) {
            return {
              items: state.items.map((item) =>
                item.producto.id === producto.id
                  ? { ...item, producto, cantidad: Math.min(stock, item.cantidad + cantidad) }
                  : item,
              ),
            };
          }
          return {
            items: [...state.items, { producto, cantidad: Math.min(stock, cantidad), personalizacion: [] }],
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
