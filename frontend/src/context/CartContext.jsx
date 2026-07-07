import { createContext, useContext, useEffect, useState } from 'react';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pi_cart')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('pi_cart', JSON.stringify(items));
  }, [items]);

  const add = (product, quantity = 1) =>
    setItems((prev) => {
      const found = prev.find((i) => i.product._id === product._id);
      if (found) {
        return prev.map((i) =>
          i.product._id === product._id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity }];
    });

  const setQty = (productId, quantity) =>
    setItems((prev) =>
      quantity < 1
        ? prev.filter((i) => i.product._id !== productId)
        : prev.map((i) => (i.product._id === productId ? { ...i, quantity } : i))
    );

  const remove = (productId) => setItems((prev) => prev.filter((i) => i.product._id !== productId));
  const clear = () => setItems([]);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  // Orders are per-business on the backend, so group here
  const groups = items.reduce((acc, i) => {
    const b = i.product.business;
    const id = typeof b === 'object' ? b._id : b;
    const name = typeof b === 'object' ? b.name : 'Business';
    acc[id] = acc[id] || { businessId: id, businessName: name, items: [] };
    acc[id].items.push(i);
    return acc;
  }, {});

  return (
    <CartCtx.Provider value={{ items, add, setQty, remove, clear, count, total, groups }}>
      {children}
    </CartCtx.Provider>
  );
}
