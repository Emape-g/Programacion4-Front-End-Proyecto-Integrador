import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useCartStore } from '../store/cartStore';
import { CartContext } from './cart-context';

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const updatePersonalizacion = useCartStore((state) => state.updatePersonalizacion);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const setItems = useCartStore((state) => state.setItems);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.cantidad, 0);
    const total = items.reduce(
      (sum, item) => sum + Number(item.producto.precio_base) * item.cantidad,
      0,
    );
    return { items, count, total, addItem, updateQuantity, updatePersonalizacion, removeItem, clearCart, setItems };
  }, [items, addItem, updateQuantity, updatePersonalizacion, removeItem, clearCart, setItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
