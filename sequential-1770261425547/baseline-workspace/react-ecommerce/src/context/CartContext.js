import { createContext, useContext } from 'react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth'; // Your auth hook

const CartContext = createContext(null);

/**
 * Wrap your app with this to access cart anywhere
 * Automatically syncs with backend when user is logged in
 */
export function CartProvider({ children }) {
  const { user } = useAuth(); // Get current user from your auth system
  const cart = useCart({ user });
  
  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * Access cart from any component
 */
export function useCartContext() {
  const context = useContext(CartContext);
  
  if (!context) {
    throw new Error('useCartContext must be used within CartProvider');
  }
  
  return context;
}
