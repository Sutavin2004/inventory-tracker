import api from './client';

export const login    = (username, password, company_slug) =>
  api.post('/auth/login', { username, password, ...(company_slug ? { company_slug } : {}) });

export const register = (data) =>
  api.post('/auth/register', data);

export const checkSlug = (slug) =>
  api.get(`/auth/check-slug/${slug}`);

export const getMe = () =>
  api.get('/auth/me');
