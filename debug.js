const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
    console.log('STACK:', err.stack);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  await page.goto('http://localhost:3000', {waitUntil: 'networkidle0'});
  
  try {
    await page.type('input', 'ozempic');
    await page.click('button[type="submit"]');
  } catch(e) {
    console.log("Could not click", e);
  }

  console.log("Waiting for processing...");
  await new Promise(r => setTimeout(r, 8000));
  
  await browser.close();
})();
