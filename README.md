# Inventory Tracker

A full-stack inventory management system with role-based access, Excel file uploads, purchase logging, and a real-time dashboard.

**Stack:** React + Vite + TailwindCSS · Node.js + Express · SQLite (better-sqlite3)

---

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Sutavin2004/inventory-tracker.git
cd inventory-tracker
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs packages for the root, `/client`, and `/server`.

### 3. Start the application

```bash
npm start
```

This launches both servers concurrently:

| Service  | URL                      |
|----------|--------------------------|
| Frontend | http://localhost:5173    |
| Backend  | http://localhost:5000    |

Open **http://localhost:5173** in your browser.

---

## Login Credentials

| Role  | Username | Password  | Capabilities                            |
|-------|----------|-----------|-----------------------------------------|
| Admin | `admin`  | `admin123`| Full access — upload, all logs, all data|
| User  | `user`   | `user123` | View inventory, submit purchases        |

---

## Generating a Test Excel File

```bash
node scripts/generate-sample.js
```

Creates **`sample-files/inventory-2025-01-15.xlsx`** containing 12 items:

| Category                      | Rows | UI colour |
|-------------------------------|------|-----------|
| Normal stock                  | 5    | Default   |
| Low stock (qty < 10)          | 3    | Yellow    |
| Expiring within 7 days        | 2    | Red       |
| Already expired               | 1    | Red       |
| Not yet available             | 1    | —         |

**Upload steps:**
1. Log in as **admin**
2. Click **Upload** in the sidebar
3. Select `sample-files/inventory-2025-01-15.xlsx`
4. Click **Upload File**

---

## Features

| Feature                | Description                                                  | Access       |
|------------------------|--------------------------------------------------------------|--------------|
| **Dashboard**          | Summary cards + expiry alert + expiring items table          | All users    |
| **Inventory**          | Searchable, sortable, paginated table · colour-coded rows    | All users    |
| **Export CSV**         | Downloads current filtered view as a CSV file                | All users    |
| **Upload**             | Excel upload with validation, duplicate rejection, diff card | Admin only   |
| **New Purchase**       | Item select, qty, buyer, date · confirmation modal           | All users    |
| **Purchase History**   | Filterable log · users see own records; admins see all       | All users    |
| **Upload History**     | Log of all past uploads with status and row diff             | Admin only   |

---

## Project Structure

```
inventory-app/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── api/               # Axios API wrappers
│   │   ├── components/        # Layout, Sidebar, Header, Toast, Modal, Spinner
│   │   ├── context/           # AuthContext, ToastContext
│   │   └── pages/             # Dashboard, Inventory, Upload, Purchases, History pages
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                    # Express API
│   ├── middleware/auth.js     # JWT verification + admin guard
│   ├── routes/                # auth · inventory · purchases · uploads
│   ├── db.js                  # SQLite schema + seed users
│   └── index.js               # Server entry point
├── scripts/
│   └── generate-sample.js    # Creates sample-files/inventory-2025-01-15.xlsx
└── package.json               # Root scripts (install:all · dev · start)
```

---

## API Endpoints

| Method | Path                      | Auth  | Description                   |
|--------|---------------------------|-------|-------------------------------|
| POST   | `/api/auth/login`         | Public| Login → JWT                   |
| GET    | `/api/inventory`          | Any   | Paginated + search + sort list|
| GET    | `/api/inventory/stats`    | Any   | Dashboard summary numbers     |
| GET    | `/api/inventory/expiring` | Any   | Items expiring ≤ 7 days       |
| POST   | `/api/uploads`            | Admin | Upload Excel inventory file   |
| GET    | `/api/uploads`            | Admin | Upload history log            |
| POST   | `/api/purchases`          | Any   | Log a purchase                |
| GET    | `/api/purchases`          | Any   | Purchase history (role-filtered)|

---

## Environment

The server reads an optional `JWT_SECRET` environment variable. For production, set it to a long random string:

```bash
JWT_SECRET=your-secret-here npm start
```

The SQLite database (`server/database.db`) is auto-created on first run and is excluded from git via `.gitignore`.
