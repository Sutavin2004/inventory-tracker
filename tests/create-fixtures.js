const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

fs.mkdirSync(path.join(__dirname, 'data'),    { recursive: true });
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });

function makeWorkbook(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Item ID', 'Item Name', 'Quantity', 'Warehouse Location', 'Available Date', 'Expiry Date'],
    ...rows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  return wb;
}

XLSX.writeFile(
  makeWorkbook([
    [3001, 'Safety Helmet Pro', 50,  'Zone A - Shelf 1', '2025-01-01', '2028-12-31'],
    [3002, 'Work Gloves Large', 120, 'Zone A - Shelf 2', '2025-01-01', '2027-06-30'],
    [3003, 'Steel Toe Boots',    8,  'Zone B - Bay 1',   '2025-01-01', '2029-01-01'],
    [3004, 'High-Vis Vest',     75,  'Zone A - Shelf 3', '2025-01-01', '2030-01-01'],
    [3005, 'Safety Goggles',     3,  'Zone C - Rack 1',  '2025-01-01', '2028-03-31'],
  ]),
  path.join(__dirname, 'data/inventory-store-a.xlsx')
);

XLSX.writeFile(
  makeWorkbook([
    [4001, 'Wireless Keyboard', 30, 'Zone D - Shelf 1', '2025-01-01', '2028-12-31'],
    [4002, 'USB Hub 7 Port',    65, 'Zone D - Shelf 2', '2025-01-01', '2029-06-30'],
    [4003, 'Monitor Stand',     12, 'Zone E - Bay 1',   '2025-01-01', '2030-01-01'],
    [4004, 'Webcam HD 1080p',    5, 'Zone E - Shelf 1', '2025-01-01', '2027-09-30'],
    [4005, 'Desk Lamp LED',     90, 'Zone F - Rack 1',  '2025-01-01', '2031-01-01'],
  ]),
  path.join(__dirname, 'data/inventory-store-b.xlsx')
);

console.log('Test fixtures created.');
