import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('pi_cart').then((raw) => {
      if (raw) { try { setItems(JSON.parse(raw)); } catch (e) {} }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('pi_cart', JSON.stringify(items));
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

  const setQty = (id, quantity) =>
    setItems((prev) =>
      quantity < 1 ? prev.filter((i) => i.product._id !== id)
        : prev.map((i) => (i.product._id === id ? { ...i, quantity } : i))
    );

  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const groups = items.reduce((acc, i) => {
    const b = i.product.business;
    const id = typeof b === 'object' ? b._id : b;
    const name = typeof b === 'object' ? b.name : 'Business';
    acc[id] = acc[id] || { businessId: id, businessName: name, items: [] };
    acc[id].items.push(i);
    return acc;
  }, {});

  return (
    <Ctx.Provider value={{ items, add, setQty, clear, count, total, groups }}>
      {children}
    </Ctx.Provider>
  );
}
