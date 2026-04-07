import axios from 'axios';

// Build an axios instance with the customer token attached
function authHeaders(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export const getCart           = (token)              => axios.get('/api/customer/cart', authHeaders(token)).then(r => r.data);
export const addToCart         = (token, data)        => axios.post('/api/customer/cart', data, authHeaders(token)).then(r => r.data);
export const updateCartItem    = (token, id, qty)     => axios.put(`/api/customer/cart/${id}`, { quantity: qty }, authHeaders(token)).then(r => r.data);
export const removeCartItem    = (token, id)          => axios.delete(`/api/customer/cart/${id}`, authHeaders(token)).then(r => r.data);
export const clearCart         = (token)              => axios.delete('/api/customer/cart', authHeaders(token)).then(r => r.data);
export const applyDiscount     = (token, data)        => axios.post('/api/customer/cart/apply-discount', data, authHeaders(token)).then(r => r.data);
export const placeOrder        = (token, data)        => axios.post('/api/customer/orders', data, authHeaders(token)).then(r => r.data);
export const getOrders         = (token)              => axios.get('/api/customer/orders', authHeaders(token)).then(r => r.data);
export const getOrder          = (token, orderNumber) => axios.get(`/api/customer/orders/${orderNumber}`, authHeaders(token)).then(r => r.data);
export const getWishlist       = (token)              => axios.get('/api/customer/wishlist', authHeaders(token)).then(r => r.data);
export const addToWishlist     = (token, productId)   => axios.post('/api/customer/wishlist', { product_id: productId }, authHeaders(token)).then(r => r.data);
export const removeFromWishlist = (token, productId)  => axios.delete(`/api/customer/wishlist/${productId}`, authHeaders(token)).then(r => r.data);
export const getProfile        = (token)              => axios.get('/api/customer/profile', authHeaders(token)).then(r => r.data);
export const updateProfile     = (token, data)        => axios.put('/api/customer/profile', data, authHeaders(token)).then(r => r.data);
export const changePassword    = (token, data)        => axios.put('/api/customer/profile/password', data, authHeaders(token)).then(r => r.data);
export const submitReview      = (token, data)        => axios.post('/api/customer/reviews', data, authHeaders(token)).then(r => r.data);
