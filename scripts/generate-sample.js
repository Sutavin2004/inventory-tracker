#!/usr/bin/env node
/**
 * Generates a sample inventory Excel file for upload testing.
 *
 * Usage (from project root, after running npm install):
 *   node scripts/generate-sample.js
 *
 * Output: sample-files/inventory-2025-01-15.xlsx
 *
 * The file contains 12 items in various states:
 *   - Normal stock (green rows in the UI)
 *   - Low stock  (qty < 10 → yellow rows)
 *   - Expiring within 7 days of 2025-01-15 (red rows)
 *   - Already expired (red rows)
 *   - Not yet available (available date in the future)
 */

'use strict';

const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

const OUTPUT_DIR  = path.join(__dirname, '..', 'sample-files');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'inventory-2025-01-15.xlsx');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Data ────────────────────────────────────────────────────────────────────
const rows = [
  // header
  ['Item ID', 'Item Name', 'Quantity', 'Warehouse Location', 'Available Date', 'Expiry Date'],

  // ── Normal items (green) ──────────────────────────────────────────────────
  [1001, 'Industrial Bearings A3',     150, 'Warehouse A - Shelf 3',  '2025-01-01', '2026-06-01'],
  [1002, 'Steel Bolts M12 (100-pack)', 320, 'Warehouse A - Shelf 7',  '2024-12-01', '2027-01-01'],
  [1003, 'Electrical Conduit 2m',      200, 'Warehouse C - Shelf 9',  '2024-09-01', '2027-06-01'],
  [1004, 'Air Filter HEPA Grade',       45, 'Warehouse A - Shelf 12', '2025-01-08', '2025-12-31'],
  [1005, 'Lubricant Oil 5L',            60, 'Warehouse B - Bay 4',    '2024-12-15', '2026-08-30'],

  // ── Low stock (qty < 10 → yellow) ────────────────────────────────────────
  [1006, 'Hydraulic Pump Model X',       8, 'Warehouse B - Bay 2',    '2025-01-05', '2026-03-15'],
  [1007, 'Motor Control Unit v2',        5, 'Warehouse C - Rack 1',   '2025-01-10', '2026-09-01'],
  [1008, 'Conveyor Belt Type B',         3, 'Warehouse D - Bay 1',    '2025-01-01', '2026-04-10'],

  // ── Expiring within 7 days of 2025-01-15 → red ───────────────────────────
  [1009, 'Safety Valve SV-400',         25, 'Warehouse A - Rack 2',   '2024-10-01', '2025-01-18'],
  [1010, 'Pressure Regulator PR-20',    12, 'Warehouse B - Shelf 5',  '2024-11-01', '2025-01-20'],

  // ── Already expired → red ─────────────────────────────────────────────────
  [1011, 'Coolant Fluid Type A 2L',      7, 'Warehouse C - Bay 3',    '2024-06-01', '2025-01-10'],

  // ── Not yet available ─────────────────────────────────────────────────────
  [1012, 'Next-Gen Sensor Module',      50, 'Warehouse D - Shelf 2',  '2025-03-01', '2027-01-01'],
];

// ─── Build workbook ──────────────────────────────────────────────────────────
const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = [
  { width: 10 },
  { width: 30 },
  { width: 10 },
  { width: 26 },
  { width: 15 },
  { width: 15 },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
XLSX.writeFile(wb, OUTPUT_FILE);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n✅  Sample file created:');
console.log(`    ${OUTPUT_FILE}`);
console.log('\n    Items included:');
console.log('      5 × normal stock (green in UI)');
console.log('      3 × low stock — qty < 10 (yellow in UI)');
console.log('      2 × expiring within 7 days of 2025-01-15 (red in UI)');
console.log('      1 × already expired on 2025-01-10 (red in UI)');
console.log('      1 × not yet available until 2025-03-01');
console.log('\n    To upload:');
console.log('      1. Run the app and sign in as admin');
console.log('      2. Go to Upload in the sidebar');
console.log('      3. Select  sample-files/inventory-2025-01-15.xlsx');
console.log('      4. Click Upload File\n');
