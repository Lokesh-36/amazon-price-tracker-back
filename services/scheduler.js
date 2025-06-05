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
  try {
    const products = await Product.find({});
    if (!products.length) {
      console.log('ℹ️ No products to check.');
      return;
    }

    const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: puppeteer.executablePath(),  // ✅ Automatically correct path
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});




    for (let product of products) {
      try {
        const { price, title } = await scrapeAmazon(product.url, browser);

        if (price && price <= product.desiredPrice) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: product.userEmail,
            subject: '🔥 Price Drop Alert!',
            html: `<p>${title}</p><p>New Price: ₹${price}</p><p><a href="${product.url}">Buy Now</a></p>`
          });
          console.log(`📧 Email sent to ${product.userEmail} for ${title}`);
        }

        product.currentPrice = price;
        product.title = title;
        product.lastChecked = new Date();
        await product.save();

      } catch (err) {
        console.error(`❌ Failed to process product: ${product.url}`, err.message);
      }
    }

    await browser.close();
    console.log('✅ Job completed at:', new Date());

  } catch (err) {
    console.error('❌ Job error:', err.message);
  }
}
