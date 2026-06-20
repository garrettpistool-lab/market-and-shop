import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mas_cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  // Save to localStorage when cart changes
  useEffect(() => {
    localStorage.setItem('mas_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.id === item.id);
      if (existing !== -1) {
        // Increment quantity for existing item (premium UX)
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: (updated[existing].qty || 1) + 1 };
        return updated;
      } else {
        return [...prev, { ...item, cartId: Date.now(), qty: 1 }];
      }
    });
  };

  const removeFromCart = (cartId) => {
    setCart(prev => {
      const item = prev.find(i => i.cartId === cartId);
      if (item && (item.qty || 1) > 1) {
        // Decrease quantity
        return prev.map(i => 
          i.cartId === cartId ? { ...i, qty: (i.qty || 1) - 1 } : i
        );
      } else {
        return prev.filter(i => i.cartId !== cartId);
      }
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);