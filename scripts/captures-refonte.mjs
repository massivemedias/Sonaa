/* LES CAPTURES DE LA REFONTE ADR-089 : quatre pages, deux themes, deux
 * largeurs, seize images, sur le site construit.
 *
 * Accueil, fiche de genre, liste des news, surcouche du micro (ouverte par
 * le bouton de l'accueil), en clair et en sombre, a 390 et 1440 px. Elles
 * ne vont pas dans le depot : elles vont a Mika.
 *
 * Usage : node scripts/captures-refonte.mjs DOSSIER_DE_SORTIE   (apres npm run build) */

import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 4190;
/* Le site en ligne sur demande : SONAA_URL=https://sonaa.ca. */
const ORIGINE = process.env.SONAA_URL ?? `http://127.0.0.1:${PORT}`;
const SORTIE = resolve(process.argv[2] ?? 'captures-refonte');
mkdirSync(SORTIE, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const serveur = createServer((req, res) => {
  const brut = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
  let chemin = normalize(join(DIST, brut));
  if (!chemin.startsWith(DIST)) return res.writeHead(403).end();
  try {
    if (statSync(chemin).isDirectory()) chemin = join(chemin, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
    res.end(readFileSync(chemin));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => serveur.listen(PORT, '127.0.0.1', ok));

const PAGES = [
  { nom: 'accueil', chemin: '/', attend: '.hero-titre' },
  { nom: 'genre', chemin: '/styles/techno/dub-techno/', attend: '.pv-fiche' },
  { nom: 'news', chemin: '/news/', attend: '.news-une, .news-carte, .news-breve' },
  { nom: 'micro', chemin: '/', attend: '.bt', ouvrir: '.bt', puis: '.rc-deplie .rc-bouton' },
];

const navigateur = await chromium.launch({ channel: 'chrome', headless: true });
const CHROME_ORDINAIRE = (await navigateur.newPage().then(async (p) => { const ua = await p.evaluate('navigator.userAgent'); await p.close(); return ua; })).replace('HeadlessChrome', 'Chrome');
for (const theme of ['clair', 'sombre']) {
  for (const largeur of [390, 1440]) {
    for (const p of PAGES) {
      /* L'IDENTITE D'UN CHROME ORDINAIRE : images.ra.co refuse ses affiches a
         un navigateur qui se declare « HeadlessChrome » (403, mesure le 28
         septembre 2026), et les captures montraient des cadres vides la ou
         un visiteur voit les affiches. */
      const contexte = await navigateur.newContext({ viewport: { width: largeur, height: largeur < 900 ? 844 : 900 }, deviceScaleFactor: 2, userAgent: CHROME_ORDINAIRE });
      await contexte.addInitScript(`localStorage.setItem('sonaa-theme', '${theme}')`);
      /* Montreal, pour que l'accueil porte de vraies cartes de soirees : sans
         ville, un navigateur de controle ne voit que l'invitation a en choisir une. */
      await contexte.addInitScript(`localStorage.setItem('sonaa.calendar.city', 'montreal-ca')`);
      const page = await contexte.newPage();
      await page.goto(`${ORIGINE}${p.chemin}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      /* Les cartes entrent en cascade quand elles arrivent a l'ecran : on
         laisse passer l'entree avant de capturer. */
      await page.waitForTimeout(1200);
      await page.waitForSelector(p.attend, { timeout: 20000 });
      await page.evaluate('document.fonts.ready');
      if (p.ouvrir) {
        await page.click(p.ouvrir);
        await page.waitForSelector(p.puis, { timeout: 20000 });
      }
      await page.waitForTimeout(600);
      const fichier = join(SORTIE, `${p.nom}-${theme}-${largeur}.png`);
      await page.screenshot({ path: fichier, fullPage: false });
      console.log(fichier);
      await contexte.close();
    }
  }
}
await navigateur.close();
serveur.close();
