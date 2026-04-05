import api from './client';

export const getInventory = (params) => api.get('/inventory', { params });
export const getStats     = ()       => api.get('/inventory/stats');
export const getExpiring  = ()       => api.get('/inventory/expiring');
