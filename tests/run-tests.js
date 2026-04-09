const axios    = require('axios');
const fs       = require('fs');
const path     = require('path');
const FormData = require('form-data');

// Port 5001 is the local dev port; override with API_URL env var
const BASE_URL = process.env.API_URL || 'http://localhost:5001';

const results = [];
let storeAAdminToken    = null;
let storeBAdminToken    = null;
let storeACustomerToken = null;
let storeBCustomerToken = null;
let storeASlug          = null;
let storeBSlug          = null;
let testOrderNumber     = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(name, detail = '') {
  results.push({ name, status: 'PASS', detail });
  console.log(`✅ PASS: ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, status: 'FAIL', detail });
  console.log(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
}

function section(name) {
  console.log(`\n${'='.repeat(60)}\n  ${name}\n${'='.repeat(60)}`);
}

async function api(method, url, data = null, token = null, isForm = false) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (isForm && data) Object.assign(headers, data.getHeaders());
    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      data,
      headers,
      validateStatus: () => true,
    });
    return response;
  } catch (err) {
    return { status: 0, data: { error: err.message } };
  }
}

// ─── Test runner ──────────────────────────────────────────────────────────────

async function runTests() {

  // ══════════════════════════════════════════════════════════
  //  GROUP 1 — STORE CREATION
  // ══════════════════════════════════════════════════════════
  section('GROUP 1: Store Creation');

  // 1.1 Register Store A
  try {
    const res = await api('POST', '/api/auth/register', {
      display_name: 'Sutavin Tools',
      username: 'sutavin',
      password: 'tools123',
      email: 'sutavin@test.com',
    });
    if ((res.status === 200 || res.status === 201) && res.data.slug) {
      storeASlug = res.data.slug;
      pass('1.1 Register Store A', `slug: ${storeASlug}`);
    } else {
      fail('1.1 Register Store A', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('1.1 Register Store A', e.message); }

  // 1.2 Register Store B
  try {
    const res = await api('POST', '/api/auth/register', {
      display_name: "Jane's Gadgets",
      username: 'janegadgets',
      password: 'gadgets456',
      email: 'jane@test.com',
    });
    if ((res.status === 200 || res.status === 201) && res.data.slug) {
      storeBSlug = res.data.slug;
      pass('1.2 Register Store B', `slug: ${storeBSlug}`);
    } else {
      fail('1.2 Register Store B', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('1.2 Register Store B', e.message); }

  // 1.3 Duplicate store name auto-increments slug
  try {
    const res = await api('POST', '/api/auth/register', {
      display_name: 'Sutavin Tools',
      username: 'sutavin2',
      password: 'tools123',
    });
    if ((res.status === 200 || res.status === 201) && res.data.slug && res.data.slug !== storeASlug) {
      pass('1.3 Duplicate store name auto-increments slug', `new slug: ${res.data.slug}`);
    } else if (res.status === 409 || res.status === 400) {
      pass('1.3 Duplicate slug handling', 'conflict returned');
    } else {
      fail('1.3 Duplicate slug handling', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('1.3 Duplicate slug handling', e.message); }

  // 1.4 Slug availability check — taken
  try {
    const res = await api('GET', `/api/check-slug/${storeASlug}`);
    if (res.status === 200 && res.data.available === false) {
      pass('1.4 Slug availability check — taken slug returns available:false');
    } else {
      fail('1.4 Slug availability check', `got: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('1.4 Slug availability check', e.message); }

  // 1.5 Slug availability check — fresh
  try {
    const res = await api('GET', `/api/check-slug/completely-new-store-xyz-999`);
    if (res.status === 200 && res.data.available === true) {
      pass('1.5 Fresh slug shows available:true');
    } else {
      fail('1.5 Fresh slug availability', `got: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('1.5 Fresh slug availability', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 2 — AUTHENTICATION
  // ══════════════════════════════════════════════════════════
  section('GROUP 2: Authentication');

  // 2.1 Store A admin login
  try {
    const res = await api('POST', '/api/auth/login', {
      username: 'sutavin', password: 'tools123', company_slug: storeASlug,
    });
    if (res.status === 200 && res.data.token) {
      storeAAdminToken = res.data.token;
      pass('2.1 Store A admin login', 'token received');
    } else {
      fail('2.1 Store A admin login', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('2.1 Store A admin login', e.message); }

  // 2.2 Store B admin login
  try {
    const res = await api('POST', '/api/auth/login', {
      username: 'janegadgets', password: 'gadgets456', company_slug: storeBSlug,
    });
    if (res.status === 200 && res.data.token) {
      storeBAdminToken = res.data.token;
      pass('2.2 Store B admin login', 'token received');
    } else {
      fail('2.2 Store B admin login', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('2.2 Store B admin login', e.message); }

  // 2.3 Wrong password rejected
  try {
    const res = await api('POST', '/api/auth/login', {
      username: 'sutavin', password: 'wrongpassword', company_slug: storeASlug,
    });
    if (res.status === 401 || res.status === 400) {
      pass('2.3 Wrong password rejected');
    } else {
      fail('2.3 Wrong password rejected', `status ${res.status}`);
    }
  } catch (e) { fail('2.3 Wrong password rejected', e.message); }

  // 2.4 Wrong store slug rejected
  try {
    const res = await api('POST', '/api/auth/login', {
      username: 'sutavin', password: 'tools123', company_slug: 'nonexistent-store-xyz',
    });
    if (res.status === 401 || res.status === 404 || res.status === 400) {
      pass('2.4 Wrong store slug rejected');
    } else {
      fail('2.4 Wrong store slug rejected', `status ${res.status}`);
    }
  } catch (e) { fail('2.4 Wrong store slug rejected', e.message); }

  // 2.5 JWT required for admin routes
  try {
    const res = await api('GET', '/api/admin/products');
    if (res.status === 401 || res.status === 403) {
      pass('2.5 Admin routes require JWT');
    } else {
      fail('2.5 Admin routes require JWT', `status ${res.status} — route unprotected`);
    }
  } catch (e) { fail('2.5 Admin routes require JWT', e.message); }

  // 2.6 GET /api/auth/me
  try {
    const res = await api('GET', '/api/auth/me', null, storeAAdminToken);
    if (res.status === 200 && res.data.username === 'sutavin') {
      pass('2.6 GET /api/auth/me returns correct user');
    } else {
      fail('2.6 GET /api/auth/me', `got: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('2.6 GET /api/auth/me', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 3 — INVENTORY UPLOAD
  // ══════════════════════════════════════════════════════════
  section('GROUP 3: Inventory Upload');

  // 3.1 Upload inventory to Store A
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(
      path.join(__dirname, 'data/inventory-store-a.xlsx')
    ), 'inventory-2026-04-08.xlsx');
    const res = await api('POST', '/api/inventory/upload', form, storeAAdminToken, true);
    if (res.status === 200 && res.data.success) {
      pass('3.1 Upload inventory to Store A', `added: ${res.data.added}`);
    } else {
      fail('3.1 Upload inventory to Store A', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('3.1 Upload inventory to Store A', e.message); }

  // 3.2 Inventory appears in Store A admin
  try {
    const res = await api('GET', '/api/inventory', null, storeAAdminToken);
    const items = res.data.items || [];
    if (res.status === 200 && items.length >= 5) {
      pass('3.2 Store A inventory has correct items', `count: ${items.length}`);
    } else {
      fail('3.2 Store A inventory count', `count: ${items.length}`);
    }
  } catch (e) { fail('3.2 Store A inventory count', e.message); }

  // 3.3 Duplicate file rejected
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(
      path.join(__dirname, 'data/inventory-store-a.xlsx')
    ), 'inventory-2026-04-08.xlsx');
    const res = await api('POST', '/api/inventory/upload', form, storeAAdminToken, true);
    const msg = (res.data.error || res.data.message || '').toLowerCase();
    if ((res.status === 400 || res.status === 409) && msg.includes('duplicate')) {
      pass('3.3 Duplicate file upload rejected');
    } else {
      fail('3.3 Duplicate file upload rejected', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('3.3 Duplicate file upload rejected', e.message); }

  // 3.4 Upload inventory to Store B
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(
      path.join(__dirname, 'data/inventory-store-b.xlsx')
    ), 'inventory-2026-04-09.xlsx');
    const res = await api('POST', '/api/inventory/upload', form, storeBAdminToken, true);
    if (res.status === 200 && res.data.success) {
      pass('3.4 Upload inventory to Store B', `added: ${res.data.added}`);
    } else {
      fail('3.4 Upload inventory to Store B', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('3.4 Upload inventory to Store B', e.message); }

  // 3.5 Store A cannot see Store B inventory
  try {
    const res = await api('GET', '/api/inventory', null, storeAAdminToken);
    const items = res.data.items || [];
    const hasStoreB = items.some(i => i.item_id >= 4001 && i.item_id <= 4005);
    if (!hasStoreB) {
      pass('3.5 Store A cannot see Store B inventory items');
    } else {
      fail('3.5 Store A cannot see Store B inventory', 'Store B items found in Store A response');
    }
  } catch (e) { fail('3.5 Store A cannot see Store B inventory', e.message); }

  // 3.6 Products auto-created from inventory
  try {
    const res = await api('GET', '/api/admin/products', null, storeAAdminToken);
    const products = res.data.products || res.data || [];
    if (products.length >= 5) {
      pass('3.6 Products auto-created from uploaded inventory', `count: ${products.length}`);
    } else {
      fail('3.6 Products auto-created', `only ${products.length} products`);
    }
  } catch (e) { fail('3.6 Products auto-created', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 4 — PUBLIC STOREFRONT
  // ══════════════════════════════════════════════════════════
  section('GROUP 4: Public Storefront');

  // 4.1 Store info endpoint
  try {
    const res = await api('GET', `/api/store/${storeASlug}`);
    const name = res.data.display_name || res.data.store?.display_name;
    if (res.status === 200 && name) {
      pass('4.1 Store A info endpoint returns store data', `name: ${name}`);
    } else {
      fail('4.1 Store A info endpoint', `status ${res.status}: ${JSON.stringify(res.data).substring(0,100)}`);
    }
  } catch (e) { fail('4.1 Store A info endpoint', e.message); }

  // 4.2 Products visible without auth
  try {
    const res = await api('GET', `/api/store/${storeASlug}/products`);
    const products = res.data.products || res.data || [];
    if (res.status === 200 && products.length >= 5) {
      pass('4.2 Store A products visible without login', `count: ${products.length}`);
    } else {
      fail('4.2 Store A products without auth', `count: ${products.length}, status: ${res.status}`);
    }
  } catch (e) { fail('4.2 Store A products without auth', e.message); }

  // 4.3 Store isolation — products don't overlap
  try {
    const resA = await api('GET', `/api/store/${storeASlug}/products`);
    const resB = await api('GET', `/api/store/${storeBSlug}/products`);
    const idsA = (resA.data.products || []).map(p => p.inventory_item_id);
    const idsB = (resB.data.products || []).map(p => p.inventory_item_id);
    const overlap = idsA.filter(id => id && idsB.includes(id));
    if (overlap.length === 0) {
      pass('4.3 Store A and Store B products are completely separate');
    } else {
      fail('4.3 Store product isolation', `${overlap.length} overlapping item IDs`);
    }
  } catch (e) { fail('4.3 Store product isolation', e.message); }

  // 4.4 Categories endpoint
  try {
    const res = await api('GET', `/api/store/${storeASlug}/categories`);
    if (res.status === 200) {
      pass('4.4 Categories endpoint returns data');
    } else {
      fail('4.4 Categories endpoint', `status ${res.status}`);
    }
  } catch (e) { fail('4.4 Categories endpoint', e.message); }

  // 4.5 Non-existent store returns 404
  try {
    const res = await api('GET', `/api/store/this-store-does-not-exist-xyz`);
    if (res.status === 404) {
      pass('4.5 Non-existent store returns 404');
    } else {
      fail('4.5 Non-existent store 404', `status ${res.status}`);
    }
  } catch (e) { fail('4.5 Non-existent store 404', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 5 — CUSTOMER ACCOUNTS
  // ══════════════════════════════════════════════════════════
  section('GROUP 5: Customer Accounts');

  // 5.1 Register customer at Store A (slug-scoped URL)
  try {
    const res = await api('POST', `/api/store/${storeASlug}/customer/register`, {
      full_name: 'Alex Smith', email: 'alex@testcustomer.com', password: 'shopper123',
    });
    if (res.status === 200 || res.status === 201) {
      pass('5.1 Customer registers at Store A');
    } else {
      fail('5.1 Customer register Store A', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('5.1 Customer register Store A', e.message); }

  // 5.2 Customer login at Store A (slug-scoped URL)
  try {
    const res = await api('POST', `/api/store/${storeASlug}/customer/login`, {
      email: 'alex@testcustomer.com', password: 'shopper123',
    });
    if (res.status === 200 && res.data.token) {
      storeACustomerToken = res.data.token;
      pass('5.2 Customer login at Store A', 'token received');
    } else {
      fail('5.2 Customer login Store A', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('5.2 Customer login Store A', e.message); }

  // 5.3 Duplicate email rejected
  try {
    const res = await api('POST', `/api/store/${storeASlug}/customer/register`, {
      full_name: 'Alex Duplicate', email: 'alex@testcustomer.com', password: 'shopper123',
    });
    if (res.status === 400 || res.status === 409) {
      pass('5.3 Duplicate email rejected at same store');
    } else {
      fail('5.3 Duplicate email rejected', `status ${res.status}`);
    }
  } catch (e) { fail('5.3 Duplicate email rejected', e.message); }

  // 5.4 Same email can register at Store B (isolated customer DB per store)
  try {
    const res = await api('POST', `/api/store/${storeBSlug}/customer/register`, {
      full_name: 'Alex Smith', email: 'alex@testcustomer.com', password: 'shopper123',
    });
    if (res.status === 200 || res.status === 201) {
      pass('5.4 Same email can register at different store');
    } else {
      fail('5.4 Same email at Store B', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('5.4 Same email at Store B', e.message); }

  // 5.5 Wrong password rejected at Store B
  try {
    const res = await api('POST', `/api/store/${storeBSlug}/customer/login`, {
      email: 'alex@testcustomer.com', password: 'WRONG',
    });
    if (res.status === 401 || res.status === 400) {
      pass('5.5 Wrong password rejected at Store B');
    } else {
      fail('5.5 Wrong password at Store B', `status ${res.status}`);
    }
  } catch (e) { fail('5.5 Wrong password at Store B', e.message); }

  // 5.6 Login at Store B
  try {
    const res = await api('POST', `/api/store/${storeBSlug}/customer/login`, {
      email: 'alex@testcustomer.com', password: 'shopper123',
    });
    if (res.status === 200 && res.data.token) {
      storeBCustomerToken = res.data.token;
      pass('5.6 Customer login at Store B');
    } else {
      fail('5.6 Customer login Store B', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('5.6 Customer login Store B', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 6 — SHOPPING CART
  // ══════════════════════════════════════════════════════════
  section('GROUP 6: Shopping Cart');

  let storeAProductId = null;
  try {
    const r = await api('GET', `/api/store/${storeASlug}/products`);
    const ps = r.data.products || r.data || [];
    if (ps.length > 0) storeAProductId = ps[0].id;
  } catch (_) {}

  // 6.1 Cart requires auth
  try {
    const res = await api('GET', `/api/store/${storeASlug}/cart`);
    if (res.status === 401 || res.status === 403) {
      pass('6.1 Cart endpoint requires customer auth');
    } else {
      fail('6.1 Cart requires auth', `status ${res.status} — unprotected`);
    }
  } catch (e) { fail('6.1 Cart requires auth', e.message); }

  // 6.2 Add to cart
  try {
    const res = await api('POST', `/api/store/${storeASlug}/cart`, {
      product_id: storeAProductId, quantity: 2,
    }, storeACustomerToken);
    if (res.status === 200 || res.status === 201) {
      pass('6.2 Add product to cart');
    } else {
      fail('6.2 Add to cart', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('6.2 Add to cart', e.message); }

  // 6.3 Get cart shows item
  try {
    const res = await api('GET', `/api/store/${storeASlug}/cart`, null, storeACustomerToken);
    const items = res.data.items || res.data || [];
    if (res.status === 200 && items.length > 0) {
      pass('6.3 Cart shows added item', `items: ${items.length}`);
    } else {
      fail('6.3 Cart shows item', `got: ${JSON.stringify(res.data).substring(0,100)}`);
    }
  } catch (e) { fail('6.3 Cart shows item', e.message); }

  // 6.4 Cart persists
  try {
    const res = await api('GET', `/api/store/${storeASlug}/cart`, null, storeACustomerToken);
    const items = res.data.items || res.data || [];
    if (items.length > 0) {
      pass('6.4 Cart persists in database across requests');
    } else {
      fail('6.4 Cart persistence', 'cart empty on second fetch');
    }
  } catch (e) { fail('6.4 Cart persistence', e.message); }

  // 6.5 Store B customer cannot access Store A cart
  try {
    const res = await api('GET', `/api/store/${storeASlug}/cart`, null, storeBCustomerToken);
    if (res.status === 401 || res.status === 403) {
      pass('6.5 Store B customer rejected at Store A cart');
    } else {
      const items = res.data.items || res.data || [];
      if (items.length === 0) {
        pass('6.5 Store B customer sees empty cart at Store A (cross-company isolation)');
      } else {
        fail('6.5 Cart isolation', 'Store B customer can see Store A cart items');
      }
    }
  } catch (e) { fail('6.5 Cart isolation', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 7 — CHECKOUT AND ORDERS
  // ══════════════════════════════════════════════════════════
  section('GROUP 7: Checkout and Orders');

  let initialQuantity = null;
  try {
    const r = await api('GET', `/api/store/${storeASlug}/products/${storeAProductId}`);
    const p = r.data.product || r.data;
    initialQuantity = p.stock_quantity ?? p.quantity ?? p.stock ?? null;
  } catch (_) {}

  // 7.1 Place order
  try {
    const res = await api('POST', `/api/store/${storeASlug}/orders`, {
      shipping_address: JSON.stringify({
        name: 'Alex Smith', address: '123 Test Street',
        city: 'Toronto', province: 'ON',
        postal_code: 'M5V 1A1', phone: '4165550123',
      }),
      payment_method: 'simulated',
    }, storeACustomerToken);
    if ((res.status === 200 || res.status === 201) && (res.data.order_number || res.data.orderNumber)) {
      testOrderNumber = res.data.order_number || res.data.orderNumber;
      pass('7.1 Customer places order successfully', `order: ${testOrderNumber}`);
    } else {
      fail('7.1 Place order', `status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e) { fail('7.1 Place order', e.message); }

  // 7.2 Inventory deducted after order
  try {
    const r = await api('GET', `/api/store/${storeASlug}/products/${storeAProductId}`);
    const p = r.data.product || r.data;
    const newQty = p.stock_quantity ?? p.quantity ?? p.stock ?? null;
    if (initialQuantity !== null && newQty !== null && newQty < initialQuantity) {
      pass('7.2 Inventory deducted after order', `${initialQuantity} → ${newQty}`);
    } else {
      fail('7.2 Inventory deduction', `init: ${initialQuantity}, now: ${newQty}`);
    }
  } catch (e) { fail('7.2 Inventory deduction', e.message); }

  // 7.3 Cart cleared after order
  try {
    const res = await api('GET', `/api/store/${storeASlug}/cart`, null, storeACustomerToken);
    const items = res.data.items || res.data || [];
    if (items.length === 0) {
      pass('7.3 Cart cleared after successful order');
    } else {
      fail('7.3 Cart cleared', `${items.length} items still in cart`);
    }
  } catch (e) { fail('7.3 Cart cleared after order', e.message); }

  // 7.4 Customer views order history
  try {
    const res = await api('GET', `/api/store/${storeASlug}/orders`, null, storeACustomerToken);
    const orders = res.data.orders || res.data || [];
    if (res.status === 200 && orders.length > 0) {
      pass('7.4 Customer can view order history', `orders: ${orders.length}`);
    } else {
      fail('7.4 Customer order history', `status ${res.status}, data: ${JSON.stringify(res.data).substring(0,100)}`);
    }
  } catch (e) { fail('7.4 Customer order history', e.message); }

  // 7.5 Admin can see order
  try {
    const res = await api('GET', '/api/admin/orders', null, storeAAdminToken);
    const orders = res.data.orders || res.data || [];
    if (res.status === 200 && orders.length > 0) {
      pass('7.5 Admin can see customer orders', `orders: ${orders.length}`);
    } else {
      fail('7.5 Admin order visibility', `status ${res.status}`);
    }
  } catch (e) { fail('7.5 Admin order visibility', e.message); }

  // 7.6 Store B admin cannot see Store A orders
  try {
    const res = await api('GET', '/api/admin/orders', null, storeBAdminToken);
    const orders = res.data.orders || res.data || [];
    const hasCross = orders.some(o => o.order_number === testOrderNumber);
    if (!hasCross) {
      pass('7.6 Store B admin cannot see Store A orders');
    } else {
      fail('7.6 Order isolation', 'Store A orders visible to Store B admin');
    }
  } catch (e) { fail('7.6 Order isolation', e.message); }

  // 7.7 Orders endpoint requires auth
  try {
    const res = await api('GET', `/api/store/${storeASlug}/orders`);
    if (res.status === 401 || res.status === 403) {
      pass('7.7 Orders endpoint requires customer auth');
    } else {
      fail('7.7 Orders require auth', `status ${res.status}`);
    }
  } catch (e) { fail('7.7 Orders require auth', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 8 — PERMISSION WALLS
  // ══════════════════════════════════════════════════════════
  section('GROUP 8: Permission Walls');

  // 8.1 Customer token rejected on admin routes
  try {
    const res = await api('GET', '/api/admin/products', null, storeACustomerToken);
    if (res.status === 401 || res.status === 403) {
      pass('8.1 Customer token rejected on admin routes');
    } else {
      fail('8.1 Customer token on admin routes', `status ${res.status} — unprotected`);
    }
  } catch (e) { fail('8.1 Customer token on admin routes', e.message); }

  // 8.2 Store A and Store B admins see different products
  try {
    const rA = await api('GET', '/api/admin/products', null, storeAAdminToken);
    const rB = await api('GET', '/api/admin/products', null, storeBAdminToken);
    const pA = (rA.data.products || rA.data || []);
    const pB = (rB.data.products || rB.data || []);
    const overlap = pA.filter(p => pB.some(q => q.id === p.id));
    if (overlap.length === 0) {
      pass('8.2 Store A and Store B admins see different products');
    } else {
      fail('8.2 Admin product isolation', `${overlap.length} shared products`);
    }
  } catch (e) { fail('8.2 Admin product isolation', e.message); }

  // 8.3 All admin routes protected without token
  const protectedRoutes = ['/api/admin/products', '/api/admin/orders', '/api/admin/customers', '/api/inventory'];
  let allProtected = true;
  for (const route of protectedRoutes) {
    const res = await api('GET', route);
    if (res.status !== 401 && res.status !== 403) {
      allProtected = false;
      fail(`8.3 Route unprotected: ${route}`, `status ${res.status}`);
    }
  }
  if (allProtected) pass('8.3 All admin routes protected without token');

  // 8.4 Invalid token rejected
  try {
    const res = await api('GET', '/api/admin/products', null, 'invalid.token.here');
    if (res.status === 401 || res.status === 403) {
      pass('8.4 Invalid token rejected');
    } else {
      fail('8.4 Invalid token rejected', `status ${res.status}`);
    }
  } catch (e) { fail('8.4 Invalid token rejected', e.message); }

  // ══════════════════════════════════════════════════════════
  //  GROUP 9 — DATA PERSISTENCE
  // ══════════════════════════════════════════════════════════
  section('GROUP 9: Data Persistence');

  // 9.1 Store A inventory persists
  try {
    const res = await api('GET', '/api/inventory', null, storeAAdminToken);
    const items = res.data.items || [];
    if (items.length >= 5) {
      pass('9.1 Store A inventory persists', `count: ${items.length}`);
    } else {
      fail('9.1 Store A inventory persistence', `only ${items.length} items`);
    }
  } catch (e) { fail('9.1 Store A inventory persistence', e.message); }

  // 9.2 Store B inventory persists
  try {
    const res = await api('GET', '/api/inventory', null, storeBAdminToken);
    const items = res.data.items || [];
    if (items.length >= 5) {
      pass('9.2 Store B inventory persists', `count: ${items.length}`);
    } else {
      fail('9.2 Store B inventory persistence', `only ${items.length} items`);
    }
  } catch (e) { fail('9.2 Store B inventory persistence', e.message); }

  // 9.3 Upload history logged
  try {
    const res = await api('GET', '/api/upload-history', null, storeAAdminToken);
    const logs = res.data.logs || res.data || [];
    if (res.status === 200 && logs.length > 0) {
      pass('9.3 Upload history logged correctly', `entries: ${logs.length}`);
    } else {
      fail('9.3 Upload history', `status ${res.status}, data: ${JSON.stringify(res.data).substring(0,100)}`);
    }
  } catch (e) { fail('9.3 Upload history', e.message); }

  // 9.4 Audit log has purchase entry
  try {
    const res = await api('GET', '/api/audit', null, storeAAdminToken);
    const logs = res.data.logs || res.data || [];
    const hasPurchase = logs.some(l =>
      (l.action || '').toUpperCase() === 'PURCHASE'
    );
    if (hasPurchase) {
      pass('9.4 Audit log contains purchase entry');
    } else {
      fail('9.4 Audit log purchase entry', `logs: ${logs.length}, no PURCHASE action found`);
    }
  } catch (e) { fail('9.4 Audit log purchase entry', e.message); }

  // ══════════════════════════════════════════════════════════
  //  FINAL REPORT
  // ══════════════════════════════════════════════════════════
  section('FINAL TEST REPORT');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total  = results.length;
  const pct    = Math.round((passed / total) * 100);

  console.log(`\nTotal:  ${total}`);
  console.log(`Passed: ${passed} (${pct}%)`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, passRate: pct + '%' },
    results,
  };
  fs.writeFileSync(
    path.join(__dirname, 'results/report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\nFull report saved to tests/results/report.json');

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review failures above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
