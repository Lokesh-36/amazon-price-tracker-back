const puppeteer = require('puppeteer');

const scrapeAmazon = async (url, browser) => {
  let page = null;
  try {
    page = await browser.newPage();
    
    // Set a more realistic viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Set user agent to mimic real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Set additional headers to appear more human-like
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    console.log('Navigating to:', url);
    
    // Navigate with longer timeout and wait for network to be idle
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log('Page loaded successfully');

    // Wait a bit to let the page fully render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to wait for the title element with a reasonable timeout
    try {
      await page.waitForSelector('#productTitle', { timeout: 15000 });
      console.log('Product title element found');
    } catch (e) {
      console.log('productTitle not found, trying alternative selectors...');
      // Try alternative selectors
      const titleExists = await page.$('#productTitle, .product-title, h1[data-automation-id="product-title"], h1');
      if (!titleExists) {
        // Let's see what's actually on the page
        console.log('Checking page content...');
        const pageContent = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            hasProductTitle: !!document.querySelector('#productTitle'),
            hasAnyH1: !!document.querySelector('h1'),
            bodyText: document.body?.innerText?.substring(0, 500) || 'No body text found'
          };
        });
        console.log('Page content:', pageContent);
        throw new Error('Product title not found - page may not have loaded correctly or may be a CAPTCHA/blocked page');
      }
    }

    const data = await page.evaluate(() => {
      // Try multiple selectors for title
      const title = document.querySelector('#productTitle')?.innerText?.trim() ||
                   document.querySelector('.product-title')?.innerText?.trim() ||
                   document.querySelector('h1[data-automation-id="product-title"]')?.innerText?.trim() ||
                   document.querySelector('h1')?.innerText?.trim() ||
                   document.querySelector('[data-testid="product-title"]')?.innerText?.trim();

      // Try multiple selectors for price - Amazon uses different ones
      let priceText = 
        document.querySelector('.reinventPricePriceToPayMargin .a-offscreen')?.innerText ||
        document.querySelector('.a-price .a-offscreen')?.innerText ||
        document.querySelector('.a-price-current .a-offscreen')?.innerText ||
        document.querySelector('.a-price-to-pay .a-offscreen')?.innerText ||
        document.querySelector('#priceblock_ourprice')?.innerText ||
        document.querySelector('#priceblock_dealprice')?.innerText ||
        document.querySelector('.a-price-range .a-offscreen')?.innerText ||
        document.querySelector('.a-price-symbol')?.parentElement?.innerText ||
        document.querySelector('[data-testid="price"]')?.innerText;

      // If no offscreen price found, try to construct from whole and fraction
      if (!priceText) {
        const whole = document.querySelector('.a-price-whole')?.innerText?.replace(/[^\d]/g, '');
        const fraction = document.querySelector('.a-price-fraction')?.innerText?.replace(/[^\d]/g, '') || '00';
        if (whole) {
          priceText = `${whole}.${fraction}`;
        }
      }

      // If still no price, try visible price elements
      if (!priceText) {
        const priceElements = document.querySelectorAll('[class*="price"], [id*="price"], [data*="price"]');
        for (let elem of priceElements) {
          const text = elem.innerText || elem.textContent;
          if (text && /[\d,]+\.?\d*/.test(text)) {
            priceText = text;
            break;
          }
        }
      }

      // Clean up the price text and convert to number
      const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
      
      // Debug information
      const debugInfo = {
        foundTitle: !!title,
        foundPriceText: !!priceText,
        priceText: priceText,
        allPriceElements: Array.from(document.querySelectorAll('[class*="price"], [id*="price"]')).map(el => el.innerText).filter(t => t)
      };
      
      console.log('Extraction debug:', debugInfo);
      return { title, price, debugInfo };
    });

    if (!data.title) {
      throw new Error('Product title not found');
    }

    if (!data.price || isNaN(data.price)) {
      throw new Error('Price not found or invalid');
    }

    console.log('Successfully scraped:', data);
    return data;

  } catch (err) {
    console.error(`Scraping failed for ${url}: ${err.message}`);
    throw err;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeErr) {
        console.error('Error closing page:', closeErr.message);
      }
    }
  }
};

module.exports = scrapeAmazon;
