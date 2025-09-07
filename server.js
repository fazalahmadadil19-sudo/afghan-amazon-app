const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');

const app = express();
const port = 3000;

// Initialize database
const db = new Database('afghan_amazon.db', { verbose: console.log });

// Create a table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT
  )
`);

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Sample route to get all products
app.get('/api/products', (req, res) => {
  const stmt = db.prepare('SELECT * FROM products');
  const products = stmt.all();
  res.json(products);
});

// Sample route to add a product
app.post('/api/products', (req, res) => {
  const { name, price, category } = req.body;
  const stmt = db.prepare('INSERT INTO products (name, price, category) VALUES (?, ?, ?)');
  const info = stmt.run(name, price, category);
  res.json({ id: info.lastInsertRowid, name, price, category });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;