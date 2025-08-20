// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  items: { type: Array, required: true }, // array of product objects (id, name, price, qty)
  total: { type: Number, required: true },
  status: { type: String, default: 'New' } // optional: New, Processing, Shipped, Delivered
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);

