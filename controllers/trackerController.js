const Product = require('../models/Product');

const addProduct = async (req, res) => {
  try {
    const { url, desiredPrice, name } = req.body;
    
    // Create product with authenticated user
    const newProduct = new Product({ 
      url, 
      desiredPrice, 
      name,
      user: req.user.id,
      userEmail: req.user.email // Keep for backward compatibility with scheduler
    });
    await newProduct.save();
    console.log('Product added by user:', req.user.email);
    
    res.status(200).json({ 
      success: true,
      message: 'Product added for tracking successfully!',
      product: newProduct
    });
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add product.' 
    });
  }
};

const getUserProducts = async (req, res) => {
  try {
    // Get products for the authenticated user
    // Try by user ID first, then fall back to email for backward compatibility
    const productsByUser = await Product.find({ user: req.user.id }).sort({ createdAt: -1 });
    const productsByEmail = await Product.find({ 
      userEmail: req.user.email, 
      user: { $exists: false } 
    }).sort({ createdAt: -1 });
    
    // Combine both results
    const allProducts = [...productsByUser, ...productsByEmail];
    
    res.status(200).json(allProducts);
  } catch (err) {
    console.error('Get user products error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch products.' 
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find product and check if it belongs to the authenticated user
    // Check both by user ID and email for backward compatibility
    const product = await Product.findOne({
      _id: id,
      $or: [
        { user: req.user.id },
        { userEmail: req.user.email, user: { $exists: false } }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found or you do not have permission to delete it.' 
      });
    }
    
    await Product.findByIdAndDelete(id);
    res.status(200).json({ 
      success: true,
      message: 'Product removed from tracking successfully!' 
    });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete product.' 
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate('user', 'name email').sort({ lastChecked: -1 });
    res.status(200).json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (err) {
    console.error('Get all products error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch all products.' 
    });
  }
};

const testScraping = async (req, res) => {
  const { url } = req.body;
  try {
    const puppeteer = require('puppeteer');
    const scrapeAmazon = require('../services/scraper');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const result = await scrapeAmazon(url, browser);
    await browser.close();
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

module.exports = { addProduct, getUserProducts, deleteProduct, getAllProducts, testScraping };
