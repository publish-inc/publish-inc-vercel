import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  console.log("Navigating to login...");
  await page.goto('http://localhost:3001/admin/login');
  
  try {
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    console.log("Logging in...");
    await page.type('input[type="email"]', 'master@publishinc.id');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ timeout: 5000 });
    console.log("Navigated! Current URL:", page.url());
  } catch(e) {
    console.log("Login skip or failed:", e.message);
  }
  
  console.log("Checking Antrian...");
  await page.goto('http://localhost:3001/admin/master-antrian');
  await new Promise(r => setTimeout(r, 2000));

  console.log("Checking Tracking...");
  await page.goto('http://localhost:3001/admin/naskah-tracking');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Checking Pengaturan...");
  await page.goto('http://localhost:3001/admin/pengaturan-sistem');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
  console.log("Done.");
})();
