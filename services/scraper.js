const puppeteer = require('puppeteer');

const scrapeAmazon = async (url, browser) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('🌐 Page loaded:', url);

    await page.waitForSelector('#productTitle', { timeout: 10000 });

    const data = await page.evaluate(() => {
      const title = document.querySelector('#productTitle')?.innerText?.trim();

      // Use most reliable selector for Amazon price block
      let priceText =
        document.querySelector('.reinventPricePriceToPayMargin .a-offscreen')?.innerText ||
        document.querySelector('.a-price .a-offscreen')?.innerText;

      if (!priceText) {
        const whole = document.querySelector('.a-price-whole')?.innerText?.replace(/[^\d]/g, '');
        const fraction = document.querySelector('.a-price-fraction')?.innerText?.replace(/[^\d]/g, '00');
        if (whole) priceText = `${whole}.${fraction || '00'}`;
      }

      const price = parseFloat(priceText?.replace(/[^0-9.]/g, ''));
      return { title, price };
    });

    if (!data.price || isNaN(data.price)) {
      throw new Error('Price not found or invalid');
    }

    console.log('✅ Scraped Data:', data);
    return data;

  } catch (err) {
    console.error(`❌ Scraping failed: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
};

module.exports = scrapeAmazon;
