import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 500, height: 420 } });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/menu-mesapps.png' });
await browser.close();
