const express = require('express');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/purchases — log a purchase and deduct inventory
router.post('/', authenticate, (req, res) => {
  const { itemId, quantityPurchased, buyerName, purchaseDate } = req.body;

  if (!itemId || !quantityPurchased || !buyerName || !purchaseDate) {
    return res.status(400).json({ error: 'All fields (itemId, quantityPurchased, buyerName, purchaseDate) are required' });
  }

  const qty = parseInt(quantityPurchased);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  const item = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(parseInt(itemId));
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  // Validate availability window
  if (item.available_date > purchaseDate) {
    return res.status(400).json({
      error: `Item is not yet available. Available from: ${item.available_date}`,
    });
  }
  if (item.expiry_date < purchaseDate) {
    return res.status(400).json({
      error: `Item has expired on: ${item.expiry_date}`,
    });
  }
  if (qty > item.quantity) {
    return res.status(400).json({
      error: `Insufficient stock. Available: ${item.quantity}, Requested: ${qty}`,
    });
  }

  const newQuantity  = item.quantity - qty;
  const lastUpdated  = new Date().toISOString();

  const purchaseId = db.transaction(() => {
    db.prepare(
      'UPDATE inventory SET quantity = ?, last_updated = ? WHERE item_id = ?'
    ).run(newQuantity, lastUpdated, item.item_id);

    const result = db.prepare(`
      INSERT INTO purchases (item_id, item_name, quantity_purchased, buyer_name, purchase_date, remaining_quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(item.item_id, item.item_name, qty, buyerName.trim(), purchaseDate, newQuantity);

    return result.lastInsertRowid;
  })();

  res.json({
    success: true,
    purchaseId,
    itemName:          item.item_name,
    quantityPurchased: qty,
    remainingQuantity: newQuantity,
    purchaseDate,
  });
});

// GET /api/purchases — list purchases with optional filters
router.get('/', authenticate, (req, res) => {
  const { itemName = '', startDate = '', endDate = '', buyerName = '' } = req.query;

  let sql    = 'SELECT * FROM purchases WHERE 1=1';
  const params = [];

  if (itemName) {
    sql += ' AND item_name LIKE ?';
    params.push(`%${itemName}%`);
  }
  if (startDate) {
    sql += ' AND purchase_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND purchase_date <= ?';
    params.push(endDate);
  }

  // Regular users only see their own purchases (matched by buyer_name = username)
  if (req.user.role !== 'admin') {
    sql += ' AND buyer_name = ?';
    params.push(req.user.username);
  } else if (buyerName) {
    sql += ' AND buyer_name LIKE ?';
    params.push(`%${buyerName}%`);
  }

  sql += ' ORDER BY purchase_date DESC, id DESC';

  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
