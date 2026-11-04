const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

  await new Promise(r => setTimeout(r, 2000));

  // Find the Fuel Siphoning card (Row 2, Box 1) and click it
  console.log('Clicking Fuel Siphoning card...');
  const clicked = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, button'));
    const target = cards.find(el => el.textContent && el.textContent.includes('Fuel Siphoning') && el.textContent.includes('28.5 L'));
    if (target) {
      target.click();
      return true;
    }
    // Fallback: search for any element containing Fuel Siphoning
    const fallback = cards.find(el => el.textContent && el.textContent.includes('Fuel Siphoning'));
    if (fallback) {
      fallback.click();
      return true;
    }
    return false;
  });

  console.log('Card clicked:', clicked);
  await new Promise(r => setTimeout(r, 1500));

  // Capture dark mode screenshot
  const darkPath = 'C:/Users/user/.gemini/antigravity/brain/a3fe4057-c764-4d88-b0e8-a182265aee02/verified_siphoning_modal_dark.png';
  await page.screenshot({ path: darkPath });
  console.log('Saved dark mode screenshot:', darkPath);

  // Switch to light theme
  console.log('Switching to light theme...');
  await page.evaluate(() => {
    // Look for theme toggle button (sun/moon icon or similar)
    const buttons = Array.from(document.querySelectorAll('button'));
    const toggle = buttons.find(b => b.title && (b.title.toLowerCase().includes('theme') || b.title.toLowerCase().includes('light') || b.title.toLowerCase().includes('dark')));
    if (toggle) toggle.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const lightPath = 'C:/Users/user/.gemini/antigravity/brain/a3fe4057-c764-4d88-b0e8-a182265aee02/verified_siphoning_modal_light.png';
  await page.screenshot({ path: lightPath });
  console.log('Saved light mode screenshot:', lightPath);

  await browser.close();
  console.log('Done!');
})();
