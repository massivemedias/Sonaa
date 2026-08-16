import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
});

// Screenshot WITHOUT plaques (standard)
const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page1 = await ctx1.newPage();
await page1.goto('http://localhost:5173/');
await page1.waitForTimeout(2500);
// Use search to go to Breakbeat
await page1.keyboard.press('/');
await page1.waitForTimeout(500);
await page1.keyboard.type('Breakbeat');
await page1.waitForTimeout(500);
await page1.keyboard.press('Enter');
await page1.waitForTimeout(2500);
await page1.screenshot({ path: '/tmp/breaks-sans-plaques.png', fullPage: false });
console.log('Screenshot WITHOUT plaques saved');
await ctx1.close();

// Screenshot WITH plaques
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page2 = await ctx2.newPage();
await page2.goto('http://localhost:5173/?plaques=1');
await page2.waitForTimeout(2500);
// Use search to go to Breakbeat
await page2.keyboard.press('/');
await page2.waitForTimeout(500);
await page2.keyboard.type('Breakbeat');
await page2.waitForTimeout(500);
await page2.keyboard.press('Enter');
await page2.waitForTimeout(2500);
await page2.screenshot({ path: '/tmp/breaks-avec-plaques.png', fullPage: false });
console.log('Screenshot WITH plaques saved');
await ctx2.close();

await browser.close();
console.log('Done');
