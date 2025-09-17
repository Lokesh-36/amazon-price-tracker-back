// test.js
const puppeteer = require('puppeteer');
const scrapeAmazon = require('./services/scraper');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const url = 'https://www.amazon.in/AVANT-Cushioning-Lightweight-Absorption-AVMSH167CL01UK10_White/dp/B0D8J9LB95/ref=sr_1_2_sspa?crid=1CEZNYZAYVHBH&dib=eyJ2IjoiMSJ9.aZYwrRyfxNQTxuF1WHQ3AQNWy4idEKR0TlQdIVnebUzzIG4IJIn5D6Uhp3FvTP_gZ9vMHaHmgtsJbBz594yuWgjfT_3eJCWCdVqOIpg87OK3FUmc08ovVeZ9VuMK57eYUdI1-oLm3KOCQnatiBbjIt7nqKL9UqJlSnK7VUmPgSqkE9jMr3sDv_4QjwR5lOXHmTOYNueqMcdcg9aLoO0MNl0o-4fkPzPDjEfMa8Y9tR_as5T1MROm0zmDdWA28zvKGUKicqH4Ydweorr6vmZHolJVZTf1lzC4jL9rjCdo6dU.-p2Jnq7zuopbS2G997yzXxexeth8P1inz2mohFanA1Y&dib_tag=se&keywords=shoes&qid=1748368630&sprefix=shoes%2Caps%2C216&sr=8-2-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1&psc=1'; // Replace with your product URL
  try {
    const result = await scrapeAmazon(url, browser);
    console.log('Final Result:', result);
  } catch (err) {
    console.error('Error during test scrape:', err.message);
  } finally {
    await browser.close();
  }
})();
