import { useState, useEffect, useCallback, useRef } from 'react';

// Types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface UseCartOptions {
  userId?: string | null;  // Pass user ID when logged in
  onError?: (error: Error) => void;
}

const CART_STORAGE_KEY = 'shopping-cart';
const API_BASE = '/api/cart';

// =============================================================================
// localStorage helpers
// =============================================================================

function loadLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

function clearLocalCart(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
}

// =============================================================================
// API helpers
// =============================================================================

async function fetchServerCart(): Promise<CartItem[]> {
  const response = await fetch(API_BASE, {
    credentials: 'include',  // Send auth cookies
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cart');
  }
  
  const data = await response.json();
  return data.items;
}

async function saveServerCart(items: CartItem[]): Promise<void> {
  const response = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save cart');
  }
}

async function addServerItem(item: CartItem): Promise<void> {
  const response = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(item),
  });
  
  if (!response.ok) {
    throw new Error('Failed to add item');
  }
}

async function updateServerItem(itemId: string, quantity: number): Promise<void> {
  const response = await fetch(`${API_BASE}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update item');
  }
}

async function removeServerItem(itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to remove item');
  }
}

// =============================================================================
// Merge logic
// =============================================================================

function mergeCarts(localCart: CartItem[], serverCart: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  
  // Add server items first (source of truth for existing items)
  for (const item of serverCart) {
    merged.set(item.id, item);
  }
  
  // Merge local items (add quantities for existing, add new items)
  for (const item of localCart) {
    const existing = merged.get(item.id);
    if (existing) {
      // Item exists on server - keep higher quantity
      merged.set(item.id, {
        ...existing,
        quantity: Math.max(existing.quantity, item.quantity),
      });
    } else {
      // New item from local - add it
      merged.set(item.id, item);
    }
  }
  
  return Array.from(merged.values());
}

// =============================================================================
// Main hook
// =============================================================================

export function useCart({ userId, onError }: UseCartOptions = {}) {
  const [items, setItems] = useState<CartItem[]>(loadLocalCart);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isLoggedIn = Boolean(userId);
  const prevUserId = useRef<string | null | undefined>(undefined);

  // Handle login/logout transitions
  useEffect(() => {
    const wasLoggedIn = Boolean(prevUserId.current);
    const justLoggedIn = isLoggedIn && !wasLoggedIn && prevUserId.current !== undefined;
    const justLoggedOut = !isLoggedIn && wasLoggedIn;
    
    prevUserId.current = userId;

    if (justLoggedIn) {
      // User just logged in - fetch server cart and merge with local
      handleLogin();
    } else if (justLoggedOut) {
      // User just logged out - keep local cart, clear any server state
      // Local cart already has items, nothing to do
    } else if (isLoggedIn && prevUserId.current === undefined) {
      // Initial load while logged in - fetch server cart
      handleLogin();
    }
  }, [userId, isLoggedIn]);

  // Fetch and merge carts on login
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const serverCart = await fetchServerCart();
      const localCart = loadLocalCart();
      
      if (localCart.length > 0 && serverCart.length > 0) {
        // Merge local and server carts
        const merged = mergeCarts(localCart, serverCart);
        setItems(merged);
        await saveServerCart(merged);
        clearLocalCart();
      } else if (localCart.length > 0) {
        // Only local cart exists - push to server
        setItems(localCart);
        await saveServerCart(localCart);
        clearLocalCart();
      } else {
        // Only server cart exists (or both empty)
        setItems(serverCart);
      }
    } catch (error) {
      onError?.(error as Error);
      // Fall back to local cart on error
      setItems(loadLocalCart());
    } finally {
      setIsLoading(false);
    }
  };

  // Persist changes
  useEffect(() => {
    if (isLoading) return;  // Don't save during initial load
    
    if (isLoggedIn) {
      // Debounced save to server
      const timeoutId = setTimeout(() => {
        setIsSyncing(true);
        saveServerCart(items)
          .catch(error => onError?.(error as Error))
          .finally(() => setIsSyncing(false));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Save to localStorage immediately
      saveLocalCart(items);
    }
  }, [items, isLoggedIn, isLoading, onError]);

  // ---------------------------------------------------------------------------
  // Cart actions
  // ---------------------------------------------------------------------------

  const addItem = useCallback(async (
    item: Omit<CartItem, 'quantity'>, 
    quantity = 1
  ) => {
    const newItem: CartItem = { ...item, quantity };
    
    setItems(current => {
      const existingIndex = current.findIndex(i => i.id === item.id);
      
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      
      return [...current, newItem];
    });

    // Optimistic update - server sync happens via useEffect
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(current => current.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(current => current.filter(item => item.id !== itemId));
      return;
    }
    
    setItems(current =>
      current.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, []);

  const incrementQuantity = useCallback((itemId: string) => {
    setItems(current =>
      current.map(item =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }, []);

  const decrementQuantity = useCallback((itemId: string) => {
    setItems(current => {
      const item = current.find(i => i.id === itemId);
      if (item && item.quantity <= 1) {
        return current.filter(i => i.id !== itemId);
      }
      return current.map(i =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback((itemId: string) => {
    return items.some(item => item.id === itemId);
  }, [items]);

  const getItemQuantity = useCallback((itemId: string) => {
    return items.find(item => item.id === itemId)?.quantity ?? 0;
  }, [items]);

  // Calculated values
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    // State
    items,
    total,
    itemCount,
    isEmpty: items.length === 0,
    isLoading,
    isSyncing,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    
    // Helpers
    isInCart,
    getItemQuantity,
  };
}
