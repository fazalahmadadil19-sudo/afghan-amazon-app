const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// Initialize database
const db = new Database('database.db', { verbose: console.log });

// Seed database (create tables and insert initial data)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    role TEXT
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    seller_id INTEGER,
    location_id INTEGER,
    category TEXT
  );
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    city TEXT
  );
  INSERT OR IGNORE INTO locations (name, city) VALUES
    ('Hub 1', 'Jalalabad'),
    ('Hub 2', 'Kabul'),
    ('Hub 3', 'Kandahar'),
    ('Hub 4', 'Herat'),
    ('Hub 5', 'Balkh');
`);

// API endpoints
app.get('/locations', (req, res) => {
  const stmt = db.prepare('SELECT * FROM locations');
  const rows = stmt.all();
  res.json(rows);
});

app.get('/products', (req, res) => {
  const stmt = db.prepare(`
    SELECT p.*, u.username as seller, l.name as location_name, l.city as location_city 
    FROM products p 
    JOIN users u ON p.seller_id = u.id 
    JOIN locations l ON p.location_id = l.id
  `);
  const rows = stmt.all();
  res.json(rows);
});

app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  const info = stmt.run(username, password, role);
  res.json({ id: info.lastInsertRowid } || { error: 'Registration failed' });
});

// Add other endpoints (login, products, cart) similarly...

// Start server (for local testing)
app.listen(3000, () => console.log('Server running at http://localhost:3000'));

// For Vercel, export the app
module.exports = app;