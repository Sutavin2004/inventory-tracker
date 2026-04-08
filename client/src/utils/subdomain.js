/**
 * Subdomain routing utilities for E-Depot.
 * In production: mystore.edepot.ca → slug = 'mystore'
 * In development: ?store=mystore → slug = 'mystore'
 */

export function getStoreSlug() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Production: mystore.edepot.ca (3 parts minimum)
  if (hostname.endsWith('edepot.ca') && parts.length >= 3) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'edepot') return sub;
  }

  // Railway preview URL: mystore.inventory-tracker-production-xxx.up.railway.app
  if (hostname.includes('railway.app') && parts.length >= 4) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'inventory-tracker-production-dab1') return sub;
  }

  // Development: ?store=myslug query param
  const params = new URLSearchParams(window.location.search);
  const storeParam = params.get('store');
  if (storeParam) return storeParam;

  return null;
}

export function getStoreUrl(slug) {
  const hostname = window.location.hostname;

  if (hostname.endsWith('edepot.ca')) {
    return `https://${slug}.edepot.ca`;
  }
  if (hostname.includes('railway.app')) {
    // Replace first subdomain with the store slug
    const parts = hostname.split('.');
    parts[0] = slug;
    return `https://${parts.join('.')}`;
  }
  // Development: query param
  return `${window.location.origin}?store=${slug}`;
}

export function getPlatformUrl() {
  const hostname = window.location.hostname;
  if (hostname.endsWith('edepot.ca')) return 'https://edepot.ca';
  if (hostname.includes('railway.app')) {
    return 'https://inventory-tracker-production-dab1.up.railway.app';
  }
  return window.location.origin;
}
