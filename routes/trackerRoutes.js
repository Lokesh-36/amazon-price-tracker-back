const express = require('express');
const router = express.Router();
const { addProduct } = require('../controllers/trackerController');

router.post('/track', addProduct);

module.exports = router;
