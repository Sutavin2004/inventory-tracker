/**
 * Public store routes — no authentication required.
 * These power the customer-facing storefront.
 */
const express = require('express');
const db      = require('../db');

const router = express.Router();

// ─── Helper: resolve company by slug ─────────────────────────────────────────

function getCompany(slug) {
  return db.prepare('SELECT * FROM companies WHERE slug = ?').get(slug);
}

// GET /api/store/:slug — store info + featured products
router.get('/:slug', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const featured = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ? AND p.is_published = 1 AND p.is_featured = 1
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all(company.id);

  // Strip sensitive fields
  const { tax_rate, shipping_fee, ...publicInfo } = company;

  res.json({
    store: {
      ...publicInfo,
      tax_rate,
      shipping_fee,
    },
    featured,
  });
});

// GET /api/store/:slug/categories
router.get('/:slug/categories', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) return res.status(404).json({ error: 'Store not found' });

  const cats = db.prepare(`
    SELECT DISTINCT category FROM products
    WHERE company_id = ? AND is_published = 1 AND category IS NOT NULL AND category != ''
    ORDER BY category ASC
  `).all(company.id);

  res.json(cats.map(r => r.category));
});

// GET /api/store/:slug/products — published products with filters + pagination
router.get('/:slug/products', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) return res.status(404).json({ error: 'Store not found' });

  const {
    page      = 1,
    limit     = 24,
    search    = '',
    category  = '',
    minPrice  = '',
    maxPrice  = '',
    inStock   = '',
    sortBy    = 'created_at',
    sortOrder = 'DESC',
  } = req.query;

  const ALLOWED_SORT = ['price', 'product_name', 'created_at'];
  const col   = ALLOWED_SORT.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let sql    = `
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location,
      COALESCE(i.expiry_date, '') AS expiry_date,
      COALESCE(i.available_date, '') AS available_date
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ? AND p.is_published = 1
  `;
  const params = [company.id];

  if (search) {
    sql += ' AND (p.product_name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
    const pat = `%${search}%`;
    params.push(pat, pat, pat);
  }
  if (category) {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (minPrice !== '') {
    sql += ' AND p.price >= ?';
    params.push(parseFloat(minPrice));
  }
  if (maxPrice !== '') {
    sql += ' AND p.price <= ?';
    params.push(parseFloat(maxPrice));
  }
  if (inStock === 'true') {
    sql += ' AND COALESCE(i.quantity, 0) > 0';
  }

  const countSql = sql.replace(
    /SELECT p\.\*.*?FROM products p/s,
    'SELECT COUNT(*) AS count FROM products p'
  );
  const { count: total } = db.prepare(countSql).get(...params);

  sql += ` ORDER BY ${col} ${order} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const products = db.prepare(sql).all(...params);
  res.json({ products, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/store/:slug/products/:id — single product detail
router.get('/:slug/products/:id', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) return res.status(404).json({ error: 'Store not found' });

  const product = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location,
      COALESCE(i.expiry_date, '') AS expiry_date,
      COALESCE(i.available_date, '') AS available_date
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.id = ? AND p.company_id = ? AND p.is_published = 1
  `).get(req.params.id, company.id);

  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Related products from same category
  const related = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ? AND p.is_published = 1
      AND p.category = ? AND p.id != ?
    ORDER BY RANDOM()
    LIMIT 4
  `).all(company.id, product.category || '', product.id);

  res.json({ product, related });
});

// GET /api/store/:slug/products/:id/reviews
router.get('/:slug/products/:id/reviews', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company) return res.status(404).json({ error: 'Store not found' });

  const reviews = db.prepare(`
    SELECT pr.*, c.full_name AS reviewer_name
    FROM product_reviews pr
    JOIN customers c ON c.id = pr.customer_id
    WHERE pr.product_id = ? AND pr.company_id = ? AND pr.is_approved = 1
    ORDER BY pr.created_at DESC
  `).all(req.params.id, company.id);

  const { avg_rating } = db.prepare(
    'SELECT COALESCE(AVG(rating), 0) AS avg_rating FROM product_reviews WHERE product_id = ? AND is_approved = 1'
  ).get(req.params.id);

  res.json({ reviews, avg_rating: Math.round(avg_rating * 10) / 10 });
});

module.exports = router;
