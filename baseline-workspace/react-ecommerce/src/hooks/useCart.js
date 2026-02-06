import { useState, useEffect, useCallback, useRef } from 'react';
import * as cartApi from '../api/cart';

const CART_KEY = 'shopping_cart';
const SYNC_DEBOUNCE_MS = 500;

/**
 * Shopping cart hook with localStorage + backend sync
 * 
 * - Logged out: localStorage only
 * - Logged in: syncs with backend, merges on login
 * 
 * @param {object} options
 * @param {object|null} options.user - Current user (null if logged out)
 * @returns {object} Cart state and methods
 */
export function useCart({ user } = {}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const syncTimeoutRef = useRef(null);
  const isLoggedIn = Boolean(user);

  // Load cart on mount or auth change
  useEffect(() => {
    loadCart();
  }, [user?.id]);

  async function loadCart() {
    setIsLoading(true);
    setError(null);

    try {
      const localCart = getLocalCart();

      if (isLoggedIn) {
        // Fetch server cart
        const serverCart = await cartApi.getCart();
        
        // Merge local items into server cart on login
        if (localCart.length > 0) {
          const merged = mergeCartsArray(serverCart, localCart);
          await cartApi.syncCart(merged);
          clearLocalCart();
          setItems(merged);
        } else {
          setItems(serverCart);
        }
      } else {
        setItems(localCart);
      }
    } catch (err) {
      setError(err.message);
      // Fallback to local cart on error
      setItems(getLocalCart());
    } finally {
      setIsLoading(false);
    }
  }

  // Persist changes (localStorage immediately, API debounced)
  useEffect(() => {
    if (isLoading) return;

    if (isLoggedIn) {
      // Debounce API calls
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        cartApi.syncCart(items).catch(err => setError(err.message));
      }, SYNC_DEBOUNCE_MS);
    } else {
      // Save to localStorage immediately
      saveLocalCart(items);
    }

    return () => clearTimeout(syncTimeoutRef.current);
  }, [items, isLoggedIn, isLoading]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...prev, { 
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
      }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== productId));
      return;
    }
    
    setItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(async () => {
    setItems([]);
    
    if (isLoggedIn) {
      try {
        await cartApi.clearCart();
      } catch (err) {
        setError(err.message);
      }
    }
  }, [isLoggedIn]);

  // Force refresh from server
  const refresh = useCallback(() => {
    loadCart();
  }, [user?.id]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refresh,
    itemCount,
    subtotal,
    isLoading,
    error,
  };
}

// ============ Local Storage Helpers ============

function getLocalCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function clearLocalCart() {
  localStorage.removeItem(CART_KEY);
}

// ============ Merge Logic ============

function mergeCartsArray(serverCart, localCart) {
  const merged = [...serverCart];
  
  for (const localItem of localCart) {
    const existing = merged.find(item => item.id === localItem.id);
    
    if (existing) {
      // Add quantities together
      existing.quantity += localItem.quantity;
    } else {
      merged.push(localItem);
    }
  }
  
  return merged;
}
