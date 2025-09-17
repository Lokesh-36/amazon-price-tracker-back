const cron = require('node-cron');
const Product = require('../models/Product');
const scrapeAmazon = require('./scraper');
const transporter = require('../config/mailer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

console.log("Scheduler script started");

// Function to find Chrome executable dynamically
function findChromeExecutable() {
  // Check if we're on Windows
  if (process.platform === 'win32') {
    // On Windows, let Puppeteer find Chrome automatically
    console.log('Running on Windows, using default Chrome detection');
    return null;
  }
  
  // For deployment on Linux (Render, etc.)
  const basePath = '/opt/render/.cache/puppeteer/chrome';
  
  try {
    if (fs.existsSync(basePath)) {
      const versions = fs.readdirSync(basePath);
      if (versions.length > 0) {
        // Get the latest version (they're usually sorted)
        const latestVersion = versions.sort().reverse()[0];
        const chromePath = path.join(basePath, latestVersion, 'chrome-linux64', 'chrome');
        
        if (fs.existsSync(chromePath)) {
          console.log(`Found Chrome at: ${chromePath}`);
          return chromePath;
        }
      }
    }
  } catch (err) {
    console.log('Could not find Chrome executable, falling back to default');
  }
  
  return null;
}

// This runs every 6 hours 
cron.schedule('0 */6 * * *', async () => {
  console.log("Scheduled job triggered");
  await runJob();
});

// This will run immediately once — for testing
console.log("Setting up immediate execution for testing...");
setTimeout(async () => {
  console.log("Running job manually for testing...");
  await runJob();
}, 2000); // Wait 2 seconds for server to fully start

async function runJob() {
  let browser = null;
  
  try {
    console.log('Starting runJob function...');
    console.log('Attempting to connect to database and fetch products...');
    
    const products = await Product.find({});
    console.log(`Found ${products.length} products in database`);
    
    if (!products.length) {
      console.log('No products to check. Make sure to add some products first.');
      return;
    }

    console.log(`Checking ${products.length} products...`);
    products.forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.name || 'Unnamed'} - Target: ₹${product.desiredPrice}`);
    });

    // Find Chrome executable dynamically
    const chromeExecutable = findChromeExecutable();
    
    // Launch browser with optimized settings
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-default-apps',
        '--no-default-browser-check',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
        '--mute-audio',
        '--hide-scrollbars',
        '--disable-prompt-on-repost',
        '--disable-hang-monitor',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-background-networking'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      slowMo: 100, // Add delay between actions
      protocolTimeout: 60000,
      timeout: 60000
    };
    
    // Add executable path if found
    if (chromeExecutable) {
      launchOptions.executablePath = chromeExecutable;
    }
    
    browser = await puppeteer.launch(launchOptions);

    console.log("Browser launched successfully");

    // Test email configuration
    console.log('Testing email configuration...');
    try {
      await transporter.verify();
      console.log('Email configuration is valid');
    } catch (emailError) {
      console.error('Email configuration error:', emailError.message);
    }

    let processedCount = 0;
    let emailsSent = 0;

    for (let product of products) {
      try {
        console.log(`\n--- Processing Product ${processedCount + 1}/${products.length} ---`);
        console.log(`Name: ${product.name || 'Unnamed'}`);
        console.log(`URL: ${product.url.substring(0, 80)}...`);
        console.log(`Target Price: ₹${product.desiredPrice}`);
        console.log(`User Email: ${product.userEmail}`);
        
        // Check if browser is still connected, if not recreate it
        if (!browser || !browser.isConnected()) {
          console.log('Browser disconnected, relaunching...');
          if (browser) {
            try {
              await browser.close();
            } catch (e) {
              console.log('Error closing disconnected browser:', e.message);
            }
          }
          browser = await puppeteer.launch(launchOptions);
          console.log('Browser relaunched successfully');
        }
        
        const { price, title } = await scrapeAmazon(product.url, browser);
        console.log(`Scraped Price: ₹${price}`);
        console.log(`Scraped Title: ${title}`);

        if (price && price <= product.desiredPrice) {
          console.log(`🎉 PRICE DROP DETECTED! Current: ₹${price}, Target: ₹${product.desiredPrice}`);
          console.log(`Sending email to ${product.userEmail}...`);
          
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: product.userEmail,
            subject: 'Price Drop Alert!',
            html: `
              <h2>Great News! Price Drop Detected</h2>
              <p><strong>Product:</strong> ${title}</p>
              <p><strong>New Price:</strong> ₹${price}</p>
              <p><strong>Your Target:</strong> ₹${product.desiredPrice}</p>
              <p><a href="${product.url}" style="background-color: #ff9900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Buy Now on Amazon</a></p>
            `
          });
          console.log(`✅ Email sent successfully to ${product.userEmail} for ${title}`);
          emailsSent++;
        } else {
          console.log(`❌ No price drop: Current ₹${price} > Target ₹${product.desiredPrice}`);
        }

        // Update product data
        product.currentPrice = price;
        product.title = title;
        product.lastChecked = new Date();
        await product.save();
        console.log(`Product data updated in database`);
        
        processedCount++;
        console.log(`✅ Completed processing product ${processedCount}/${products.length}`);

        // Add delay between requests to be respectful and avoid being blocked
        console.log('Waiting 5 seconds before next product...');
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (err) {
        console.error(`\n❌ Failed to process product: ${product.name || 'Unnamed'}`);
        console.error(`URL: ${product.url}`);
        console.error(`Error: ${err.message}`);
        
        // If it's a browser error, try to recreate the browser for next iteration
        if (err.message.includes('Protocol error') || err.message.includes('Connection closed')) {
          console.log('Browser error detected, will recreate browser for next product');
          if (browser) {
            try {
              await browser.close();
            } catch (e) {
              // Ignore close errors
            }
            browser = null;
          }
        }
      }
    }

    console.log(`\n=== JOB SUMMARY ===`);
    console.log(`Products processed: ${processedCount}/${products.length}`);
    console.log(`Emails sent: ${emailsSent}`);
    console.log(`Job completed at: ${new Date().toISOString()}`);

  } catch (err) {
    console.error('\n❌ Critical job error:', err.message);
    console.error('Stack trace:', err.stack);
  } finally {
    // Ensure browser is always closed
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed');
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr.message);
      }
    }
    console.log('Job completed at:', new Date());
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});