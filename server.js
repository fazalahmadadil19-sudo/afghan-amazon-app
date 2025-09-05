const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  // Create tables
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    city TEXT
  )`);

  db.run(`CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    seller_id INTEGER,
    location_id INTEGER,
    category TEXT,
    FOREIGN KEY(seller_id) REFERENCES users(id),
    FOREIGN KEY(location_id) REFERENCES locations(id)
  )`);

  db.run(`CREATE TABLE carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    pickup_location_id INTEGER,
    FOREIGN KEY(buyer_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(pickup_location_id) REFERENCES locations(id)
  )`);

  // Seed locations (10 per city)
  const cities = ['Jalalabad', 'Kabul', 'Kandahar', 'Herat', 'Balkh'];
  const hubs = {
    Jalalabad: ['Sorkh Dewal Site', 'Jalalabad Central Market', 'Behsud Bridge Area', 'Nangarhar University Campus', 'Jalalabad Stadium', 'Darunta Market', 'Kunar Road Bazaar', 'Jalalabad Airport Vicinity', 'Pashtunistan Square', 'Farm Hada Market'],
    Kabul: ['Ka Feroshi Bird Market', 'Babur Garden', 'Sakhi Shrine', 'Chicken Street Market', 'Mandawi Bazaar', 'Shar-e-Naw Park', 'Serena Hotel Area', 'Wazir Akbar Khan Market', 'Kabul City Center Mall', 'Darul Aman Palace Grounds'],
    Kandahar: ['Kandahar Central Bazaar', 'Ahmad Shah Baba Shrine', 'Kandahar Stadium', 'Arghandab River Market', 'Shah Bazaar', 'Kandahar Airport Area', 'Baba Wali Shrine', 'Dand Market', 'Herat Gate Area', 'Spin Boldak Border Hub'],
    Herat: ['Friday Mosque', 'Herat Citadel', 'Herat Antiques Bazaar', 'Musalla Complex', 'Chahar Suq Market', 'Herat University Area', 'Bagh-e-Mellat Park', 'Islam Qala Border Market', 'Herat Glass Factory Area', 'Takht-e-Safar Park'],
    Balkh: ['Blue Mosque', 'Rabia Balkhi Market', 'Balkh Ancient Walls', 'Mazar-i-Sharif Central Bazaar', 'Balkh University Campus', 'Nowruz Festival Grounds', 'Mazar Airport Area', 'Tashkurgan Market', 'Dehdadi Bazaar', 'Khulm Road Hub']
  };
  cities.forEach(city => {
    hubs[city].forEach(name => {
      db.run(`INSERT INTO locations (name, city) VALUES (?, ?)`, [name, city]);
    });
  });

  // Seed sellers and buyers
  const sellers = [];
  for (let i = 1; i <= 10; i++) {
    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [`seller${i}`, `pass${i}`, 'seller']);
    sellers.push(i);
  }
  for (let i = 1; i <= 100; i++) {
    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [`buyer${i}`, `pass${i}`, 'buyer']);
  }

  // Seed products with categories and prioritize Jalalabad
  sellers.forEach(sellerId => {
    const randomLocation = Math.floor(Math.random() * 50) + 1;
    db.run(`INSERT INTO products (name, price, seller_id, location_id, category) VALUES (?, ?, ?, ?, ?)`, ['Handwoven Afghan Rug', 49.99, sellerId, randomLocation, 'Wearing Stuff']);
    db.run(`INSERT INTO products (name, price, seller_id, location_id, category) VALUES (?, ?, ?, ?, ?)`, ['Wooden Dining Table', 129.99, sellerId, randomLocation, 'Grocery']);
    db.run(`INSERT INTO products (name, price, seller_id, location_id, category) VALUES (?, ?, ?, ?, ?)`, ['Smartphone', 199.99, sellerId, randomLocation, 'Electronic']);
    db.run(`INSERT INTO products (name, price, seller_id, location_id, category) VALUES (?, ?, ?, ?, ?)`, ['Football', 29.99, sellerId, randomLocation, 'Sports']);
    if (randomLocation <= 10) { // Jalalabad locations (1-10)
      db.run(`INSERT INTO products (name, price, seller_id, location_id, category) VALUES (?, ?, ?, ?, ?)`, ['Extra Grocery Item', 15.99, sellerId, randomLocation, 'Grocery']);
      db.run(`INSERT INTO products (name, price, seller_id, location_id, category) VALUES (?, ?, ?, ?, ?)`, ['Priority Clothing', 39.99, sellerId, randomLocation, 'Wearing Stuff']);
    }
  });

  console.log('Database seeded with users, 50 hubs across 5 cities, and sample products.');
});

// API Endpoints
app.get('/locations', (req, res) => {
  db.all(`SELECT * FROM locations`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, password, role], function(err) {
    if (err) return res.status(400).json({ error: 'Username taken' });
    res.json({ id: this.lastID });
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err || !row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(row);
  });
});

app.get('/products', (req, res) => {
  db.all(`SELECT p.*, u.username as seller, l.name as location_name, l.city as location_city, p.category 
          FROM products p JOIN users u ON p.seller_id = u.id JOIN locations l ON p.location_id = l.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/products', (req, res) => {
  const { name, price, seller_id, location_id, category } = req.body;
  db.run(`INSERT INTO products (name, price, seller_id, location_id, category) VALUES (?, ?, ?, ?, ?)`, [name, price, seller_id, location_id, category], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.post('/cart', (req, res) => {
  const { buyer_id, product_id, quantity, pickup_location_id } = req.body;
  db.run(`INSERT INTO carts (buyer_id, product_id, quantity, pickup_location_id) VALUES (?, ?, ?, ?)`, [buyer_id, product_id, quantity, pickup_location_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.get('/cart/:buyer_id', (req, res) => {
  const buyer_id = req.params.buyer_id;
  db.all(`SELECT c.*, p.name, p.price, l.name as pickup_location, l.city as pickup_city 
          FROM carts c JOIN products p ON c.product_id = p.id JOIN locations l ON c.pickup_location_id = l.id 
          WHERE c.buyer_id = ?`, [buyer_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/pashto.html', (req, res) => res.sendFile(path.join(__dirname, 'public/pashto.html')));
app.get('/categories.html', (req, res) => res.sendFile(path.join(__dirname, 'public/categories.html')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});