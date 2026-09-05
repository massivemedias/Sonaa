/* Capture du jeu : ecran titre, ville, panneaux. Sert a verifier a l'oeil.
   node scripts/game-capture.mjs [largeur] [hauteur] */
import { chromium } from 'playwright';

const W = +(process.argv[2] || 430), H = +(process.argv[3] || 860);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: W < 700 });
const page = await ctx.newPage();
const erreurs = [];
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
page.on('pageerror', (e) => erreurs.push(String(e)));
await page.goto('http://localhost:5173/game/');
await page.waitForTimeout(1500);
await page.screenshot({ path: `/tmp/jeu-titre-${W}.png` });
await page.click('#btn-nouvelle');
await page.waitForTimeout(2500);
await page.screenshot({ path: `/tmp/jeu-ville-${W}.png` });

const etape = async (nom, fn) => {
  await fn(); await page.waitForTimeout(500);
  await page.evaluate(() => { const ui = window.__sonaa.ui; ui.fileAnnonces = []; if (!document.querySelector('#annonce').classList.contains('cache')) ui.fermerAnnonce(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `/tmp/jeu-${nom}-${W}.png` });
};
await etape('snack', () => page.evaluate(() => window.__sonaa.ui.ouvrir('snack', window.__sonaa.carte.batiments.find((b) => b.id === 'snack'))));
await etape('snack-travail', () => page.evaluate(() => { for (let i = 0; i < 3; i++) window.__sonaa.jeu.travailler('plonge'); window.__sonaa.ui.rendre(); }));
await etape('gear', () => page.evaluate(() => { window.__sonaa.jeu.s.cash = 5000; window.__sonaa.ui.ouvrir('gear', window.__sonaa.carte.batiments.find((b) => b.id === 'gear')); }));
await etape('studio', () => page.evaluate(() => { const j = window.__sonaa.jeu; for (const id of ['casque', 'platine1', 'aiguille', 'platine2', 'table', 'cables', 'enceintes', 'casque_pro', 'moniteurs', 'laptop']) j.acheterMateriel(id); window.__sonaa.ui.ouvrir('home', window.__sonaa.carte.batiments.find((b) => b.id === 'home')); }));
await etape('disquaire', () => page.evaluate(() => window.__sonaa.ui.ouvrir('disquaire', window.__sonaa.carte.batiments.find((b) => b.id === 'dq_techno'))));
await etape('dates', () => page.evaluate(() => { const j = window.__sonaa.jeu; const bac = j.bac('dq_techno'); for (const d of bac) j.acheterDisque(d.id); for (const d of j.bac('dq_house')) j.acheterDisque(d.id); window.__sonaa.ui.onglet = 'dates'; window.__sonaa.ui.ouvrir('home', window.__sonaa.carte.batiments.find((b) => b.id === 'home')); }));
await etape('set', () => page.evaluate(() => { const j = window.__sonaa.jeu; const o = j.s.offres.find((x) => x.soir === j.s.jour) || j.s.offres[0]; o.soir = j.s.jour; j.accepterDate(o.id); const d = j.dateCeSoir; window.__sonaa.ui.selection = []; window.__sonaa.ui.ouvrir('set', null, d.id); }));
await etape('resultat', () => page.evaluate(() => { const j = window.__sonaa.jeu; const d = j.dateCeSoir; const coll = j.s.collection.filter((id) => window.__sonaa.jeu.s.collection.includes(id)).slice(0, 4); window.__sonaa.ui.selection = coll; window.__sonaa.ui.extra = d.id; window.__sonaa.ui.agir('lancer-set'); }));
await etape('label', () => page.evaluate(() => { const j = window.__sonaa.jeu; j.s.niveau = 9; j.s.cash = 50000; j.ameliorerLabel(); j.ameliorerLabel(); window.__sonaa.ui.onglet = 'signer'; window.__sonaa.ui.ouvrir('label', window.__sonaa.carte.batiments.find((b) => b.id === 'label')); }));
await etape('jour', () => page.evaluate(() => { window.__sonaa.ui.fermer(); window.__sonaa.jeu.dormir(); }));
await etape('ville-niveau9', () => page.evaluate(() => { window.__sonaa.ui.fermer(); window.__sonaa.ville.rafraichirBatiments(); window.__sonaa.ville.cameras.main.setZoom(0.75); }));
await etape('ville-nuit', () => page.evaluate(() => { window.__sonaa.jeu.s.minutes = 22 * 60; window.__sonaa.jeu.change(); window.__sonaa.ville.cameras.main.setZoom(1.1); }));
console.log('erreurs:', erreurs.length ? erreurs : 'aucune');
await browser.close();
