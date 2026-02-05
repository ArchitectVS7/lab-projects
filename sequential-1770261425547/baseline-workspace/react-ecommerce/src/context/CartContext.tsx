import { createContext, useContext, ReactNode } from 'react';
import { useCart, CartItem } from '../hooks/useCart';

// Type for the cart context
type CartContextType = ReturnType<typeof useCart>;

const CartContext = createContext<CartContextType | null>(null);

interface CartProviderProps {
  children: ReactNode;
  userId?: string | null;  // Pass from your auth context
  onError?: (error: Error) => void;
}

/**
 * Cart provider - wrap your app with this
 */
export function CartProvider({ children, userId, onError }: CartProviderProps) {
  const cart = useCart({ userId, onError });
  
  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * Hook to access cart from any component
 */
export function useCartContext() {
  const context = useContext(CartContext);
  
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  
  return context;
}

// Re-export types for convenience
export type { CartItem };
