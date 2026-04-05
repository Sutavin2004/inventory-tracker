import api from './client';

export const getPurchases   = (params) => api.get('/purchases', { params });
export const createPurchase = (data)   => api.post('/purchases', data);
