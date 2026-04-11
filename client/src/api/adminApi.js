import client from './client';

// Products
export const getAdminProducts    = ()       => client.get('/admin/products');
export const createProduct       = (data)   => client.post('/admin/products', data);
export const updateProduct       = (id, d)  => client.put(`/admin/products/${id}`, d);
export const deleteProduct       = (id)     => client.delete(`/admin/products/${id}`);
export const bulkProductUpdate   = (data)   => client.post('/admin/products/bulk', data);

// Orders
export const getAdminOrders      = (p)      => client.get('/admin/orders', { params: p });
export const getAdminOrder       = (id)     => client.get(`/admin/orders/${id}`);
export const updateOrderStatus   = (id, s)  => client.put(`/admin/orders/${id}/status`, { status: s });
export const cancelOrder         = (id)     => client.put(`/admin/orders/${id}/cancel`);

// Customers
export const getAdminCustomers   = (p)      => client.get('/admin/customers', { params: p });
export const updateCustomer      = (id, d)  => client.put(`/admin/customers/${id}`, d);

// Discounts
export const getDiscounts        = ()       => client.get('/admin/discounts');
export const createDiscount      = (data)   => client.post('/admin/discounts', data);
export const updateDiscount      = (id, d)  => client.put(`/admin/discounts/${id}`, d);
export const deleteDiscount      = (id)     => client.delete(`/admin/discounts/${id}`);

// Store settings
export const getStoreSettings    = ()       => client.get('/admin/store-settings');
export const updateStoreSettings = (data)   => client.put('/admin/store-settings', data);

// Dashboard stats
export const getAdminDashStats   = ()       => client.get('/admin/dashboard-stats');

// Single inventory item (admin add)
export const addInventoryItem    = (data)   => client.post('/inventory', data);

// Refund
export const refundOrder         = (id, d)  => client.post(`/admin/orders/${id}/refund`, d);

// Stripe Connect
export const startStripeConnect  = ()       => client.post('/stripe/connect/start');
export const getStripeStatus     = ()       => client.get('/stripe/connect/status');
export const disconnectStripe    = ()       => client.post('/stripe/connect/disconnect');
export const getStripeDashboardLink = ()    => client.get('/stripe/connect/dashboard-link');
