import axios from 'axios';

function authHeaders(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export const getPlatformStats  = (token) => axios.get('/api/platform/stats', authHeaders(token)).then(r => r.data);
export const getPlatformStores = (token) => axios.get('/api/platform/stores', authHeaders(token)).then(r => r.data);
export const updatePlatformStore = (token, id, data) =>
  axios.put(`/api/platform/stores/${id}`, data, authHeaders(token)).then(r => r.data);
