const cron = require('node-cron');
const Product = require('../models/Product');
const scrapeAmazon = require('./scraper');
const transporter = require('../config/mailer');
const puppeteer = require('puppeteer');

console.log("📆 Scheduler script started");

// This runs every 6 hours — keep it
cron.schedule('0 */6 * * *', async () => {
  console.log("⏰ Scheduled job triggered");
  await runJob();
});

// This will run immediately once — for testing
(async () => {
  console.log("🚀 Running job manually for testing...");
  await runJob();
})();

async function runJob() {
  let browser = null;
  
  try {
    const products = await Product.find({});
    if (!products.length) {
      console.log('ℹ️ No products to check.');
      return;
    }

    console.log(`🔍 Checking ${products.length} products...`);

    // Launch browser with Render-optimized settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      // Let Puppeteer handle the executable path automatically
      // This works better on Render than specifying executablePath
    });

    console.log("🌐 Browser launched successfully");

    let processedCount = 0;
    let emailsSent = 0;

    for (let product of products) {
      try {
        console.log(`🔎 Processing: ${product.url.substring(0, 50)}...`);
        
        const { price, title } = await scrapeAmazon(product.url, browser);

        if (price && price <= product.desiredPrice) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: product.userEmail,
            subject: '🔥 Price Drop Alert!',
            html: `
              <h2>🎉 Great News! Price Drop Detected</h2>
              <p><strong>Product:</strong> ${title}</p>
              <p><strong>New Price:</strong> ₹${price}</p>
              <p><strong>Your Target:</strong> ₹${product.desiredPrice}</p>
              <p><a href="${product.url}" style="background-color: #ff9900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">🛒 Buy Now on Amazon</a></p>
            `
          });
          console.log(`📧 Email sent to ${product.userEmail} for ${title}`);
          emailsSent++;
        }

        // Update product data
        product.currentPrice = price;
        product.title = title;
        product.lastChecked = new Date();
        await product.save();
        
        processedCount++;
        console.log(`✅ Processed ${processedCount}/${products.length}: ${title}`);

        // Add small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`❌ Failed to process product: ${product.url}`, err.message);
        // Continue with other products even if one fails
      }
    }

    console.log(`📊 Job Summary: ${processedCount} products processed, ${emailsSent} emails sent`);

  } catch (err) {
    console.error('❌ Job error:', err.message);
    console.error('Stack trace:', err.stack);
  } finally {
    // Ensure browser is always closed
    if (browser) {
      try {
        await browser.close();
        console.log('🔒 Browser closed');
      } catch (closeErr) {
        console.error('❌ Error closing browser:', closeErr.message);
      }
    }
    console.log('✅ Job completed at:', new Date());
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});