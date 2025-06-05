const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  url: String,
  desiredPrice: Number,
  currentPrice: Number,
  userEmail: String,
  title: String,
  lastChecked: Date
});

module.exports = mongoose.model('Product', productSchema);
