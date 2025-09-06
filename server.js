const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3'); // Changed from sqlite3

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup with better-sqlite3
const db = new Database('database.db');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT
  )
`);

// Routes
app.get('/api/products', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products');
    const products = stmt.all();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, price, description } = req.body;
    const stmt = db.prepare('INSERT INTO products (name, price, description) VALUES (?, ?, ?)');
    const result = stmt.run(name, price, description);
    res.json({ id: result.lastInsertRowid, name, price, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;