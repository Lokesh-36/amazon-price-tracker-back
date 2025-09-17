const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  desiredPrice: {
    type: Number,
    required: true
  },
  currentPrice: Number,
  userEmail: String, // Keep for backward compatibility
  title: String,
  name: String, // User-defined product name
  lastChecked: Date,
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false // Made optional for backward compatibility
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
