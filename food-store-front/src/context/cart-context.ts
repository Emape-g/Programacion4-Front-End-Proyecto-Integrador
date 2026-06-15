import { createContext } from 'react';
import type { Producto } from '../types/store';

export interface CartItem {
  producto: Producto;
  cantidad: number;
  personalizacion: number[];
}

export interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (producto: Producto, cantidad?: number) => void;
  updateQuantity: (productoId: number, cantidad: number) => void;
  updatePersonalizacion: (productoId: number, ingredientes: number[]) => void;
  removeItem: (productoId: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | null>(null);
