const Product = require('../models/Product');

const addProduct = async (req, res) => {
  const { url, desiredPrice, userEmail } = req.body;
  try {
     const newProduct = new Product({ url, desiredPrice, userEmail });
    await newProduct.save();
    console.log(newProduct);
    
    res.status(200).json({ message: 'Product added for tracking.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product.' });
  }
};

module.exports = { addProduct };
