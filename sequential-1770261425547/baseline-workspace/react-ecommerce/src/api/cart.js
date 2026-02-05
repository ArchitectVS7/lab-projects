/**
 * Cart API client
 */

const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Send auth cookies
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Get current user's cart
 * @returns {Promise<Array>} Cart items
 */
export async function getCart() {
  const data = await request('/cart');
  return data.items || [];
}

/**
 * Sync entire cart (replaces server cart)
 * @param {Array} items - Cart items
 * @returns {Promise<Array>} Updated cart items
 */
export async function syncCart(items) {
  const data = await request('/cart', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
  return data.items || [];
}

/**
 * Add single item to cart
 * @param {string} productId 
 * @param {number} quantity 
 * @returns {Promise<Array>} Updated cart items
 */
export async function addToCart(productId, quantity = 1) {
  const data = await request('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
  return data.items || [];
}

/**
 * Update item quantity
 * @param {string} productId 
 * @param {number} quantity 
 * @returns {Promise<Array>} Updated cart items
 */
export async function updateCartItem(productId, quantity) {
  const data = await request(`/cart/items/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
  return data.items || [];
}

/**
 * Remove item from cart
 * @param {string} productId 
 * @returns {Promise<Array>} Updated cart items
 */
export async function removeFromCart(productId) {
  const data = await request(`/cart/items/${productId}`, {
    method: 'DELETE',
  });
  return data.items || [];
}

/**
 * Clear entire cart
 * @returns {Promise<void>}
 */
export async function clearCart() {
  await request('/cart', { method: 'DELETE' });
}
