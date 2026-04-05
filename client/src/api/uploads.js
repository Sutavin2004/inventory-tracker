import api from './client';

export const uploadInventory = (formData) =>
  api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getUploads = () => api.get('/uploads');
