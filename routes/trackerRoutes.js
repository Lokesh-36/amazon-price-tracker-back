const express = require('express');
const router = express.Router();
const { addProduct, getUserProducts, deleteProduct, getAllProducts, testScraping } = require('../controllers/trackerController');
const { protect } = require('../middleware/auth');

// Protected routes - require authentication
router.post('/track', protect, addProduct);
router.get('/products', protect, getUserProducts);
router.delete('/products/:id', protect, deleteProduct);

// Admin routes (for debugging/monitoring)
router.get('/all-products', getAllProducts);
router.post('/test-scraping', testScraping);

module.exports = router;
