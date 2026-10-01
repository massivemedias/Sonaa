import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';
const DIST = new URL('./dist', import.meta.url).pathname;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const s = createServer((q, r) => { let c = normalize(join(DIST, decodeURIComponent(q.url.split('?')[0]))); try { if (statSync(c).isDirectory()) c = join(c, 'index.html'); r.writeHead(200, { 'content-type': T[extname(c)] ?? 'application/octet-stream' }); r.end(readFileSync(c)); } catch { r.writeHead(404).end(); } });
await new Promise((ok) => s.listen(5173, 'localhost', ok));
const out = process.argv[2];
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ua = (await (await b.newPage()).evaluate('navigator.userAgent')).replace('HeadlessChrome', 'Chrome');
for (const theme of ['sombre', 'clair']) for (const w of [1440, 390]) {
  const c = await b.newContext({ viewport: { width: w, height: w < 900 ? 844 : 900 }, deviceScaleFactor: 2, userAgent: ua });
  await c.addInitScript(`localStorage.setItem('sonaa.calendar.city','montreal-ca'); localStorage.setItem('sonaa-langue','fr'); localStorage.setItem('sonaa-theme','${theme}');`);
  const p = await c.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForSelector('.cal-quand select', { timeout: 30000 });
  const valeurs = await p.$$eval('.cal-quand select option', (os) => os.map((o) => o.value));
  await p.selectOption('.cal-quand select', valeurs.find((v) => v.includes('2026-10-01')));
  await p.waitForTimeout(2000);
  const gen = await p.$('.cal-gen-carte');
  if (!gen) { console.log(theme, w, 'aucune affiche dessinee'); await c.close(); continue; }
  await gen.scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollBy(0, -120));
  await p.waitForTimeout(1500);
  console.log(theme, w, 'affiches dessinees:', await p.$$eval('.cal-gen-carte', (e) => e.length));
  await p.screenshot({ path: `${out}-carte-${theme}-${w}.png` });
  if (w === 1440) {
    await p.click('.cal-gen-carte');
    await p.waitForSelector('.cal-gen-fiche', { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}-fiche-${theme}.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    await p.fill('.cal-recherche, input[type=search]', 'datcha').catch(() => {});
    await p.waitForTimeout(2500);
    const ligne = await p.$('.cal-gen-ligne');
    if (ligne) { await ligne.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await p.screenshot({ path: `${out}-ligne-${theme}.png` }); console.log('ligne ok'); }
  }
  await c.close();
}
await b.close(); s.close();
