import api from './client';

export const login = (username, password) =>
  api.post('/auth/login', { username, password });
