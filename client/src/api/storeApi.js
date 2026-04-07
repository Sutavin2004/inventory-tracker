import axios from 'axios';

export const getStore         = (slug)           => axios.get(`/api/store/${slug}`).then(r => r.data);
export const getStoreProducts = (slug, params)   => axios.get(`/api/store/${slug}/products`, { params }).then(r => r.data);
export const getStoreProduct  = (slug, id)       => axios.get(`/api/store/${slug}/products/${id}`).then(r => r.data);
export const getCategories    = (slug)           => axios.get(`/api/store/${slug}/categories`).then(r => r.data);
export const getProductReviews = (slug, id)      => axios.get(`/api/store/${slug}/products/${id}/reviews`).then(r => r.data);
