/* LE CONTRASTE AA, MESURE SUR LE SITE CONSTRUIT, DANS LES DEUX THEMES.
 *
 * ADR-089 change toutes les couleurs du site. Un contraste qu'on suppose
 * n'est pas un contraste : ce script lit chaque texte visible de neuf pages,
 * a 390 et 1440 px, en clair et en sombre, compose sa couleur sur ce qu'il
 * recouvre reellement (fond translucide, verre, opacite) et calcule le
 * rapport WCAG. Il rend le minimum par theme et nomme ce qui passe sous le
 * AA : 4,5 pour 1 pour du texte courant, 3 pour 1 pour du texte large
 * (24 px, ou 18,66 px en gras).
 *
 * CE QU'IL NE SAIT PAS MESURER, ET LE DIT : un texte pose sur une image
 * (photo, pochette, degrade) n'a pas de fond calculable ; il est compte a
 * part, jamais dans le minimum.
 *
 * Usage : npm run audit:contraste   (apres npm run build) */

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 4189;
/* LE SITE EN LIGNE SUR DEMANDE : `SONAA_URL=https://sonaa.ca` mesure les vraies
   cartes de soirees et de mixtapes, que le site construit sans base n'a pas. */
const ORIGINE = process.env.SONAA_URL ?? `http://127.0.0.1:${PORT}`;
const LARGEURS = [390, 1440] as const;
/* LE SOMBRE SEUL depuis le 1er octobre 2026 : le theme clair a ete retire. */
const THEMES = ['sombre'] as const;
const PAGES: readonly { chemin: string; attend: string; nom: string }[] = [
  { nom: 'accueil', chemin: '/', attend: '.hero-titre' },
  { nom: 'styles', chemin: '/styles/', attend: '.pv-tuile' },
  { nom: 'genre', chemin: '/styles/techno/dub-techno/', attend: '.pv-fiche' },
  { nom: 'news', chemin: '/news/', attend: '.news-une, .news-carte, .news-breve' },
  { nom: 'mixtapes', chemin: '/#/mixtapes', attend: '.sp-item, .sp-aide, .sp-carte-artiste, .sets-page h1' },
  { nom: 'micro', chemin: '/reconnaitre/', attend: '.rc-bouton' },
  { nom: 'a-propos', chemin: '/#/a-propos', attend: '.credits-body' },
  { nom: 'credits', chemin: '/#/credits', attend: '.credits-body' },
  { nom: 'mentions', chemin: '/mentions/', attend: '.credits-body' },
];

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

function servir(): Promise<() => void> {
  const serveur = createServer((req, res) => {
    const brut = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    let chemin = normalize(join(DIST, brut));
    if (!chemin.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (statSync(chemin).isDirectory()) chemin = join(chemin, 'index.html');
      const corps = readFileSync(chemin);
      res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
      res.end(corps);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => {
    serveur.listen(PORT, '127.0.0.1', () => ok(() => serveur.close()));
  });
}

interface Texte {
  readonly sel: string;
  readonly texte: string;
  readonly ratio: number;
  readonly requis: number;
  readonly fg: string;
  readonly bg: string;
  readonly taille: number;
  readonly gras: boolean;
}
interface Lecture {
  readonly textes: readonly Texte[];
  readonly surImage: number;
  readonly total: number;
}

const SCRIPT = `(() => {
  /* TOUTE COULEUR PASSE PAR UN CANEVAS : Chrome rend les couleurs oklch
     telles quelles dans les styles calcules, et un analyseur de rgb() les
     lirait comme transparentes. Le canevas les convertit en sRGB. */
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const sur = (haut, bas) => { const a = haut[3] + bas[3] * (1 - haut[3]); if (a === 0) return [0, 0, 0, 0]; return [0, 1, 2].map((i) => (haut[i] * haut[3] + bas[i] * bas[3] * (1 - haut[3])) / a).concat([a]); };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const nom = (e) => {
    const cls = (e.className && typeof e.className === 'string') ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    const parent = e.parentElement && e.parentElement.className && typeof e.parentElement.className === 'string' ? '.' + e.parentElement.className.trim().split(/\\s+/)[0] + ' > ' : '';
    return parent + e.tagName.toLowerCase() + cls;
  };
  /* LE FOND DE LA PAGE EST CELUI QU'ON VOIT, GRAIN COMPRIS : mesure en
     pixels avant la lecture (voir plus bas), et non la couleur de body. */
  const fondPage = __FOND__;
  const textes = []; let surImage = 0; let total = 0;
  for (const e of document.querySelectorAll('body *')) {
    let brut = '';
    for (const n of e.childNodes) if (n.nodeType === 3) brut += n.textContent;
    const texte = brut.replace(/\\s+/g, ' ').trim();
    if (!texte || !/[A-Za-z0-9\\u00C0-\\u017F]/.test(texte)) continue;
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    if (e.closest('[aria-hidden="true"], .credits-skip, [disabled], option, script, style, noscript')) continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right < 0 || r.left > window.innerWidth) continue;
    total += 1;
    /* La couleur du texte, avec l'opacite de ses ancetres. */
    let fg = parse(s.color);
    let op = 1;
    for (let p = e; p; p = p.parentElement) { const o = parseFloat(getComputedStyle(p).opacity); if (!isNaN(o)) op *= o; }
    /* Encore invisible (une entree qui n'a pas eu lieu) : ce n'est pas un
       texte qu'on lit, on ne le mesure pas. */
    if (op < 0.05) continue;
    fg = [fg[0], fg[1], fg[2], fg[3] * op];
    /* Le fond : on empile les fonds des ancetres, du plus proche au plus
       loin, jusqu'a l'opaque. Une image de fond rend le calcul impossible. */
    const couches = []; let image = false; let opaque = false;
    for (let p = e; p && p !== document.documentElement; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.backgroundImage && ps.backgroundImage !== 'none' && p !== document.body) { image = true; break; }
      const bg = parse(ps.backgroundColor);
      if (bg[3] > 0) { couches.push(bg); if (bg[3] >= 1) { opaque = true; break; } }
    }
    if (image) { surImage += 1; continue; }
    let fond = opaque ? couches.pop() : fondPage.slice();
    for (let i = couches.length - 1; i >= 0; i -= 1) fond = sur(couches[i], fond);
    const couleur = sur(fg, fond);
    const taille = parseFloat(s.fontSize);
    const gras = parseInt(s.fontWeight, 10) >= 700;
    const large = taille >= 24 || (taille >= 18.66 && gras);
    const requis = large ? 3 : 4.5;
    textes.push({ sel: nom(e), texte: texte.slice(0, 40), ratio: Math.round(ratio(couleur, fond) * 100) / 100, requis, fg: hex(couleur), bg: hex(fond), taille: Math.round(taille * 10) / 10, gras });
  }
  return JSON.stringify({ textes, surImage, total });
})()`;

if (!process.env.SONAA_URL) {
  try {
    statSync(join(DIST, 'index.html'));
  } catch {
    console.error('Contraste : dist/index.html manque. Lancer npm run build avant.');
    process.exit(1);
  }
}

const fermer = await servir();
const navigateur = await chromium.launch({ channel: 'chrome', headless: true });
const parTheme: Record<string, { min: number; ou: string; sous: Texte[]; lus: number; surImage: number }> = {};
const fondsVus: Record<string, number[]> = {};

for (const theme of THEMES) {
  parTheme[theme] = { min: Infinity, ou: '', sous: [], lus: 0, surImage: 0 };
  for (const page_ of PAGES) {
    for (const largeur of LARGEURS) {
      const contexte = await navigateur.newContext({ viewport: { width: largeur, height: largeur < 900 ? 844 : 900 } });
      await contexte.addInitScript(`localStorage.setItem('sonaa-theme', '${theme}')`);
      /* Montreal, pour que l'accueil porte de vraies cartes de soirees : sans
         ville, un navigateur de controle ne voit que l'invitation a en choisir une. */
      await contexte.addInitScript(`localStorage.setItem('sonaa.calendar.city', 'montreal-ca')`);
      const page = await contexte.newPage();
      try {
        await page.goto(`${ORIGINE}${page_.chemin}`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForSelector(page_.attend, { timeout: 20000 });
        await page.evaluate('document.fonts.ready');
        /* LES CARTES ENTRENT EN CASCADE QUAND ELLES ARRIVENT A L'ECRAN, et
           jusque-la elles sont a opacite zero : lues sans defiler, elles
           donnaient un faux 1 pour 1. On parcourt la page jusqu'en bas, par
           pas d'un ecran, puis on remonte. */
        await page.evaluate(`(async () => {
          const pas = window.innerHeight * 0.8;
          const cible = document.querySelector('.pv-corps') || document.scrollingElement;
          for (let y = 0; y < cible.scrollHeight; y += pas) { cible.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          cible.scrollTo(0, 0);
        })()`);
        await page.waitForTimeout(900);
      } catch (e) {
        console.error(`  ${theme} ${page_.nom} ${largeur} : ne rend pas (${(e as Error).message.split('\n')[0]})`);
        await contexte.close();
        continue;
      }
      /* LE FOND REEL : on cache tout ce que porte la page, on photographie
         une tuile de grain sur le granite, et on en prend la moyenne. Le grain
         assombrit le granite clair et eclaircit le sombre ; un texte qui
         passe sur la couleur nue peut ne plus passer sur le fond qu'on voit. */
      const cache = await page.addStyleTag({ content: 'body > * { visibility: hidden !important; }' });
      const tuile = await page.screenshot({ clip: { x: 0, y: 300, width: 200, height: 200 } });
      await cache.evaluate((e) => (e as Element).remove());
      const fond: number[] = await page.evaluate(`(async () => {
        const img = new Image();
        img.src = 'data:image/png;base64,${tuile.toString('base64')}';
        await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, cv.width, cv.height).data;
        let r = 0, g = 0, b = 0; const n = d.length / 4;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        return [r / n, g / n, b / n, 1];
      })()`);
      if (!fondsVus[theme]) fondsVus[theme] = fond.slice(0, 3).map((v) => Math.round(v));
      const lu: Lecture = JSON.parse(await page.evaluate(SCRIPT.replace('__FOND__', JSON.stringify(fond))));
      await contexte.close();
      const t = parTheme[theme]!;
      t.lus += lu.textes.length;
      t.surImage += lu.surImage;
      for (const x of lu.textes) {
        if (x.ratio < t.min) {
          t.min = x.ratio;
          t.ou = `${page_.nom} a ${largeur} px, ${x.sel} « ${x.texte} »`;
        }
        if (x.ratio < x.requis) t.sous.push({ ...x, sel: `${page_.nom}@${largeur} ${x.sel}` });
      }
    }
  }
}

await navigateur.close();
fermer();

for (const theme of THEMES) {
  const t = parTheme[theme]!;
  const uniques = new Map<string, Texte>();
  for (const x of t.sous) {
    const k = `${x.sel}|${x.fg}|${x.bg}`;
    if (!uniques.has(k)) uniques.set(k, x);
  }
  console.log(`\n${theme.toUpperCase()} : fond reel rgb(${(fondsVus[theme] ?? []).join(', ')}), ${t.lus} textes lus, ${t.surImage} sur image (non mesurables), minimum ${t.min === Infinity ? '-' : t.min} pour 1 (${t.ou}).`);
  if (uniques.size === 0) console.log('  Tout passe le AA.');
  else {
    console.log(`  ${uniques.size} texte(s) sous le AA :`);
    for (const x of [...uniques.values()].sort((a, b) => a.ratio - b.ratio).slice(0, 60)) {
      console.log(`    ${x.ratio.toFixed(2)} < ${x.requis}  ${x.sel} « ${x.texte} »  ${x.fg} sur ${x.bg}, ${x.taille} px${x.gras ? ' gras' : ''}`);
    }
  }
}
const pire = Math.min(...THEMES.map((th) => parTheme[th]!.min));
process.exit(THEMES.some((th) => parTheme[th]!.sous.length > 0) ? 1 : 0);
void pire;
