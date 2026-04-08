const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const db      = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Store uploaded file in memory — parsed immediately, never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const FILENAME_RE = /^inventory-\d{4}-\d{2}-\d{2}\.xlsx$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logUpload(filename, uploadedBy, uploadedAt, status, reason, rowsBefore, rowsAfter, companyId) {
  try {
    db.prepare(`
      INSERT INTO upload_logs (filename, uploaded_by, uploaded_at, status, reason, rows_before, rows_after, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(filename, uploadedBy, uploadedAt, status, reason ?? null, rowsBefore, rowsAfter, companyId ?? null);
  } catch (e) {
    console.error('Failed to write upload log:', e.message);
  }
}

/**
 * Converts an Excel cell value to a YYYY-MM-DD string.
 * Handles JS Date objects, Excel serial numbers, and ISO/slash-separated strings.
 */
function parseDate(val) {
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel date serial → parse via XLSX utility
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

// ─── POST /api/uploads ───────────────────────────────────────────────────────

router.post('/', authenticate, requireAdmin, (req, res) => {
  // Use multer as a callback so we can catch its own errors (file-too-large, wrong type)
  upload.single('file')(req, res, (multerErr) => {
    if (multerErr) {
      const msg = multerErr.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 10 MB.'
        : multerErr.message;
      return res.status(400).json({ error: msg });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filename   = req.file.originalname;
    const uploadedBy = req.user.username;
    const uploadedAt = new Date().toISOString();

    // ── Filename validation ──────────────────────────────────────────────────
    if (!FILENAME_RE.test(filename)) {
      return res.status(400).json({
        error: 'Invalid filename. Expected format: inventory-YYYY-MM-DD.xlsx',
      });
    }

    // ── Duplicate check (scoped to company) ─────────────────────────────────
    const companyId = req.user?.companyId;
    const dupCheck = companyId
      ? db.prepare('SELECT id FROM upload_logs WHERE filename = ? AND company_id = ?').get(filename, companyId)
      : db.prepare('SELECT id FROM upload_logs WHERE filename = ? AND company_id IS NULL').get(filename);
    if (dupCheck) {
      return res.status(409).json({
        error: 'Duplicate file: this inventory file has already been uploaded.',
      });
    }

    const rowsBefore = companyId
      ? db.prepare('SELECT COUNT(*) AS c FROM inventory WHERE company_id = ?').get(companyId).c
      : db.prepare('SELECT COUNT(*) AS c FROM inventory').get().c;

    try {
      // ── Parse Excel ─────────────────────────────────────────────────────────
      const wb   = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) {
        logUpload(filename, uploadedBy, uploadedAt, 'failure', 'File is empty or has no data rows', rowsBefore, rowsBefore, companyId ?? null);
        return res.status(400).json({ error: 'File is empty or has no data rows' });
      }

      // ── Header validation ────────────────────────────────────────────────────
      const normalise = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
      const headers   = rows[0].map(normalise);
      const required  = ['item id', 'item name', 'quantity', 'warehouse location', 'available date', 'expiry date'];
      const missing   = required.filter(h => !headers.includes(h));

      if (missing.length > 0) {
        const reason = `Missing columns: ${missing.join(', ')}`;
        logUpload(filename, uploadedBy, uploadedAt, 'failure', reason, rowsBefore, rowsBefore, companyId ?? null);
        return res.status(400).json({ error: reason });
      }

      // ── Process rows ─────────────────────────────────────────────────────────
      const rowErrors = [];
      let added = 0, updated = 0;

      db.transaction(() => {
        for (let i = 1; i < rows.length; i++) {
          const row    = rows[i];
          const rowNum = i + 1; // 1-indexed, row 1 = header

          // Skip entirely empty rows
          if (row.every(c => c === '' || c === null || c === undefined)) continue;

          const [itemIdRaw, itemNameRaw, quantityRaw, locationRaw, availRaw, expiryRaw] = row;

          // Required field checks
          if (itemIdRaw === '' || itemIdRaw === null || itemIdRaw === undefined) {
            rowErrors.push(`Row ${rowNum}: Item ID is missing`); continue;
          }
          if (!itemNameRaw || String(itemNameRaw).trim() === '') {
            rowErrors.push(`Row ${rowNum}: Item Name is missing`); continue;
          }
          if (quantityRaw === '' || quantityRaw === null || quantityRaw === undefined) {
            rowErrors.push(`Row ${rowNum}: Quantity is missing`); continue;
          }
          if (!locationRaw || String(locationRaw).trim() === '') {
            rowErrors.push(`Row ${rowNum}: Warehouse Location is missing`); continue;
          }
          if (!availRaw) { rowErrors.push(`Row ${rowNum}: Available Date is missing`); continue; }
          if (!expiryRaw) { rowErrors.push(`Row ${rowNum}: Expiry Date is missing`); continue; }

          const itemId = parseInt(itemIdRaw);
          if (isNaN(itemId)) { rowErrors.push(`Row ${rowNum}: Item ID "${itemIdRaw}" is not a valid number`); continue; }

          const qty = parseInt(quantityRaw);
          if (isNaN(qty) || qty < 0) { rowErrors.push(`Row ${rowNum}: Quantity "${quantityRaw}" must be a non-negative integer`); continue; }

          const availableDate = parseDate(availRaw);
          const expiryDate    = parseDate(expiryRaw);
          if (!availableDate) { rowErrors.push(`Row ${rowNum}: Available Date "${availRaw}" is not a valid date`); continue; }
          if (!expiryDate)    { rowErrors.push(`Row ${rowNum}: Expiry Date "${expiryRaw}" is not a valid date`); continue; }

          const itemName = String(itemNameRaw).trim();
          const location = String(locationRaw).trim();
          const now      = new Date().toISOString();

          if (db.prepare('SELECT item_id FROM inventory WHERE item_id = ?').get(itemId)) {
            db.prepare(`
              UPDATE inventory
              SET item_name = ?, quantity = ?, warehouse_location = ?, available_date = ?, expiry_date = ?, last_updated = ?
              WHERE item_id = ?
            `).run(itemName, qty, location, availableDate, expiryDate, now, itemId);
            updated++;
          } else {
            db.prepare(`
              INSERT INTO inventory (item_id, item_name, quantity, warehouse_location, available_date, expiry_date, last_updated, company_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(itemId, itemName, qty, location, availableDate, expiryDate, now, companyId ?? null);
            added++;
          }

          // Auto-create product record for this company if not already linked
          if (companyId) {
            const pExists = db.prepare(
              'SELECT id FROM products WHERE company_id = ? AND inventory_item_id = ?'
            ).get(companyId, itemId);
            if (!pExists) {
              db.prepare(`
                INSERT INTO products (company_id, inventory_item_id, product_name, price, is_published, category)
                VALUES (?, ?, ?, 0, 1, 'General')
              `).run(companyId, itemId, itemName);
            }
          }
        }
      })();

      const rowsAfter = companyId
        ? db.prepare('SELECT COUNT(*) AS c FROM inventory WHERE company_id = ?').get(companyId).c
        : db.prepare('SELECT COUNT(*) AS c FROM inventory').get().c;
      logUpload(filename, uploadedBy, uploadedAt, 'success', null, rowsBefore, rowsAfter, companyId);

      res.json({
        success:     true,
        filename,
        uploadedAt,
        uploadedBy,
        rowsBefore,
        rowsAfter,
        added,
        updated,
        rowErrors,
      });

    } catch (err) {
      const reason = `Parse error: ${err.message}`;
      logUpload(filename, uploadedBy, uploadedAt, 'failure', reason, rowsBefore, rowsBefore, companyId ?? null);
      res.status(500).json({ error: reason });
    }
  });
});

// ─── GET /api/uploads — upload history (company-scoped) ──────────────────────

router.get('/', authenticate, requireAdmin, (req, res) => {
  const companyId = req.user?.companyId;
  if (companyId) {
    res.json(db.prepare('SELECT * FROM upload_logs WHERE company_id = ? ORDER BY uploaded_at DESC').all(companyId));
  } else {
    res.json(db.prepare('SELECT * FROM upload_logs ORDER BY uploaded_at DESC').all());
  }
});

module.exports = router;
