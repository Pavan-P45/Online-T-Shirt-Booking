// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const Product = require('./models/product');
const Order = require('./models/order');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session for admin
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true if using HTTPS
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// Admin auth middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ message: 'Unauthorized' });
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ---------- API ROUTES ----------

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ message: 'Logged in' });
  }
  return res.status(401).json({ message: 'Invalid credentials' });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// Add product (admin only)
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { name, price, image, description } = req.body;
    const p = new Product({ name, price: Number(price), image, description });
    await p.save();
    res.status(201).json({ message: 'Product added', product: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding product' });
  }
});

// Get all products (public)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Place order (public)
app.post('/api/order', async (req, res) => {
  try {
    const { name, contact, address, items } = req.body;
    if (!name || !contact || !address || !items || !items.length) {
      return res.status(400).json({ message: 'Missing order fields' });
    }

    let total = 0;
    items.forEach(it => {
      const qty = it.qty ? Number(it.qty) : 1;
      total += (Number(it.price) || 0) * qty;
    });

    const order = new Order({ name, contact, address, items, total });
    await order.save();

    const itemsHtml = items.map(it => `<li>${it.name} x ${it.qty || 1} — ₹${it.price}</li>`).join('');
    const mailHtml = `
      <h2>New Order Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Contact:</strong> ${contact}</p>
      <p><strong>Address:</strong> ${address}</p>
      <p><strong>Total:</strong> ₹${total}</p>
      <ul>${itemsHtml}</ul>
      <p>Order ID: ${order._id}</p>
    `;

    transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `New Order: ${order._id}`,
      html: mailHtml
    }).catch(err => console.error('Email send error:', err));

    res.status(201).json({ message: 'Order placed successfully', orderId: order._id });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ message: 'Order failed' });
  }
});

// Admin view orders
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Product deleted successfully' });
});

app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ message: 'Order deleted successfully' });
});
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));







