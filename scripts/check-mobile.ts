/* LE SITE TIENT DROIT A HUIT LARGEURS, ET C'EST MESURE.
 *
 * ═══ CE QUE CE CONTROLE PROMET ═══
 *
 * Mika, le 28 septembre 2026 : « arrange le site en mobile, rien n'est
 * droit ». La refonte ADR-089 fixe deux barres de verre en haut et en bas,
 * pose une gouttiere de 20 px, et promet qu'aucune page ne deborde
 * horizontalement a 320, 375, 390, 430, 768, 1024, 1440 et 1920 px. Une
 * promesse de mise en page qu'on ne mesure pas est une promesse qu'on
 * finit par rompre sans le savoir : ce fichier la mesure dans un vrai
 * Chrome, sur le site construit, sur neuf pages.
 *
 * ═══ CE QUI EST MESURE, PAGE PAR PAGE ET LARGEUR PAR LARGEUR ═══
 *
 * 1. AUCUN DEBORDEMENT HORIZONTAL : la largeur de defilement du document,
 *    de body et du corps de Parcourir ne depasse pas la fenetre. Quand ca
 *    deborde, les elements qui depassent le bord droit sont nommes.
 * 2. LA BARRE DU HAUT fait exactement `--entete-h` (56 px), elle est fixee
 *    et floutee (le verre est bien la), et le premier contenu commence
 *    sous elle.
 * 3. LA BARRE DU BAS, sous 900 px, fait exactement `--barre-bas-hauteur`
 *    (64 px), touche le bord bas, et body reserve au moins cette place.
 * 4. LES CIBLES TACTILES, sous 900 px : tout bouton, selecteur ou lien qui
 *    n'est pas dans une phrase fait au moins 44 px de haut et de large.
 *    Et dans la barre du haut, rien ne se chevauche : le logo, le titre,
 *    la loupe et les reglages du compte gardent chacun leur place.
 * 5. LE REPLI DU VERRE : sans filtre d'arriere-plan, chaque surface de
 *    verre visible devient opaque. Voir plus bas comment on simule un
 *    navigateur qui ne le connait pas.
 *
 * Usage : npm run check:mobile   (apres npm run build) */

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright-core';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 4188;
/* LE SITE EN LIGNE SUR DEMANDE : `SONAA_URL=https://sonaa.ca`. En local, la
   source des soirees refuse l'origine 127.0.0.1 et l'accueil n'a pas de
   cartes ; en ligne, elles sont mesurees avec le reste. */
const ORIGINE = process.env.SONAA_URL ?? `http://127.0.0.1:${PORT}`;
const LARGEURS = [320, 375, 390, 430, 768, 1024, 1440, 1920] as const;
const SEUIL_TELEPHONE = 900;
const ENTETE_H = 56;
const BARRE_BAS_H = 64;
const CIBLE_MIN = 44;

/* LES ONZE PAGES : chacune avec le selecteur qui prouve qu'elle est rendue.
   Les pages pre-rendues sont visitees par leur chemin, les autres par leur
   ancre. L'accueil est a la racine depuis le 8 octobre 2026, le calendrier
   a sa propre ancre. */
const PAGES: readonly { chemin: string; attend: string; nom: string }[] = [
  { nom: 'accueil', chemin: '/', attend: '.ac-titre' },
  { nom: 'calendrier', chemin: '/#/calendrier', attend: '.hero-titre' },
  { nom: 'styles', chemin: '/styles/', attend: '.pv-tuile' },
  { nom: 'genre', chemin: '/styles/techno/dub-techno/', attend: '.pv-fiche' },
  { nom: 'news', chemin: '/news/', attend: '.news-une, .news-carte, .news-breve' },
  { nom: 'mixtapes', chemin: '/#/mixtapes', attend: '.sp-item, .sp-aide, .sp-carte-artiste, .sets-page h1' },
  { nom: 'micro', chemin: '/reconnaitre/', attend: '.rc-bouton' },
  { nom: 'a-propos', chemin: '/#/a-propos', attend: '.credits-body' },
  { nom: 'credits', chemin: '/#/credits', attend: '.credits-body' },
  { nom: 'mentions', chemin: '/mentions/', attend: '.credits-body' },
  /* La page d'un label, depuis le 1er octobre 2026 : le nom en tres grand
     et deux colonnes, a verifier sous 400 px. */
  { nom: 'label', chemin: '/labels/f-communications/', attend: '.lb-nom' },
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

interface Coupable {
  readonly sel: string;
  readonly droite: number;
}
interface Cible {
  readonly sel: string;
  readonly w: number;
  readonly h: number;
}
interface Mesure {
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly docScroll: number;
  readonly bodyScroll: number;
  readonly pvScroll: number | null;
  readonly pvClient: number | null;
  readonly coupables: readonly Coupable[];
  readonly entete: { readonly hauteur: number; readonly haut: number; readonly position: string; readonly flou: string; readonly alpha: number } | null;
  readonly bas: { readonly hauteur: number; readonly bord: number; readonly flou: string } | null;
  readonly retraitBas: number;
  readonly premierContenu: number | null;
  readonly cibles: readonly Cible[];
  readonly chevauchements: readonly string[];
}

/* LE SCRIPT DE MESURE EST UNE CHAINE, PAS UNE FONCTION : tsx compile ce
   fichier avec esbuild, qui enveloppe chaque fonction nommee d'un
   `__name(...)` absent de la page. Une chaine part telle quelle. */
const SCRIPT_MESURE = `(() => {
  const q = (s) => document.querySelector(s);
  const nom = (e) => {
    const cls = (e.className && typeof e.className === 'string') ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    const texte = (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
    return e.tagName.toLowerCase() + cls + (texte ? ' « ' + texte + ' »' : '');
  };
  const iw = window.innerWidth, ih = window.innerHeight;
  const dansDefilementX = (e) => {
    for (let p = e.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden') return true;
    }
    return false;
  };
  const coupables = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > iw + 1 && !dansDefilementX(e)) coupables.push({ sel: nom(e), droite: Math.round(r.right) });
    if (coupables.length >= 8) break;
  }
  const pv = q('.pv-corps');
  const entete = q('.entete-site, .pv-tete');
  const bas = q('.barre-bas');
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true }); const alpha = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); return cx.getImageData(0, 0, 1, 1).data[3] / 255; };
  const flouDe = (e) => { const s = getComputedStyle(e); return s.backdropFilter && s.backdropFilter !== 'none' ? s.backdropFilter : (s.webkitBackdropFilter || 'none'); };
  const main = q('main.credits') || pv;
  let premierContenu = null;
  if (main) {
    for (const c of main.children) {
      const r = c.getBoundingClientRect();
      if (r.height > 0 && getComputedStyle(c).position !== 'absolute') { premierContenu = Math.round(r.top); break; }
    }
  }
  const cibles = [];
  if (iw < ${SEUIL_TELEPHONE}) {
    for (const e of document.querySelectorAll('button, select, [role="button"], a[href]')) {
      const s = getComputedStyle(e);
      if (s.visibility === 'hidden' || s.display === 'none') continue;
      if (e.closest('[aria-hidden="true"]')) continue;
      if (e.tagName === 'A' && s.display === 'inline' && e.closest('p, li, dd, figcaption, .credits-lede, .intro-page, .rc-envoi')) continue;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > ih * 3) continue;
      /* Hors de l'ecran par construction (le lien d'evitement, cache a
         gauche jusqu'au focus) : ce n'est pas une cible au doigt. */
      if (r.right <= 0 || r.left >= iw) continue;
      if (r.height < ${CIBLE_MIN} - 0.5 || r.width < ${CIBLE_MIN} - 0.5) cibles.push({ sel: nom(e), w: Math.round(r.width), h: Math.round(r.height) });
      if (cibles.length >= 40) break;
    }
  }
  /* RIEN NE SE CHEVAUCHE DANS LA BARRE DU HAUT : le logo, le retour, le
     titre, la loupe, le menu et les trois reglages fixes du compte. */
  const tete = [...document.querySelectorAll('.entete-logo, .pv-logo, .pv-retour, .pv-tete-titre, .pv-chercher-bouton, .entete-site > .sitenav, .pv-tete > .sitenav, .authb > *')]
    .filter((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.top < ${ENTETE_H} + 60; });
  const chevauchements = [];
  for (let i = 0; i < tete.length; i += 1) for (let j = i + 1; j < tete.length; j += 1) {
    const a = tete[i], b = tete[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (x > 1 && y > 1) chevauchements.push(nom(a) + ' / ' + nom(b));
  }
  return JSON.stringify({
    chevauchements,
    innerWidth: iw, innerHeight: ih,
    docScroll: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
    pvScroll: pv ? pv.scrollWidth : null,
    pvClient: pv ? pv.clientWidth : null,
    coupables,
    entete: entete ? { hauteur: Math.round(entete.getBoundingClientRect().height), haut: Math.round(entete.getBoundingClientRect().top), position: getComputedStyle(entete).position, flou: flouDe(entete), alpha: alpha(getComputedStyle(entete).backgroundColor) } : null,
    bas: bas && getComputedStyle(bas).display !== 'none' ? { hauteur: Math.round(bas.getBoundingClientRect().height), bord: Math.round(ih - bas.getBoundingClientRect().bottom), flou: flouDe(bas) } : null,
    retraitBas: Math.round(parseFloat(getComputedStyle(document.body).paddingBottom)),
    premierContenu,
    cibles,
  });
})()`;

const erreurs: string[] = [];
const lignes: string[] = [];

if (!process.env.SONAA_URL) {
  try {
    statSync(join(DIST, 'index.html'));
  } catch {
    console.error('Mobile : dist/index.html manque. Lancer npm run build avant ce controle.');
    process.exit(1);
  }
}

const fermer = await servir();
let navigateur;
try {
  /* SAFARI SUR DEMANDE : `SONAA_MOTEUR=webkit` mesure dans le moteur de
     Safari, si Playwright l'a installe. La barriere, elle, mesure dans
     Chrome, le seul moteur present sur toutes les machines qui publient. */
  navigateur = process.env.SONAA_MOTEUR === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ channel: 'chrome', headless: true });
} catch (e) {
  fermer();
  console.error(`Mobile : Google Chrome introuvable pour la mesure.\n${(e as Error).message.split('\n')[0]}`);
  process.exit(1);
}

/* HYPOTHESE : au moins une mesure a ete prise. Un controle qui ne mesure
   rien rend un vert parfait, indistinguable d'un controle qui a tout lu. */
let mesures = 0;

/* EN FRANCAIS PARTOUT, ET EN ANGLAIS SUR TELEPHONE. Le francais est la
   langue du site et ses mots sont les plus longs (« Se connecter » contre
   « Log in ») ; l'anglais est remesure la ou la place manque. */
for (const page_ of PAGES) {
  for (const largeur of LARGEURS) {
   for (const langue of largeur < SEUIL_TELEPHONE ? (['fr', 'en'] as const) : (['fr'] as const)) {
    /* LES CIBLES SE MESURENT AU REPOS. Le parallaxe fait arriver les cartes
       du bas a 97 % de leur taille : une pastille de 44 px mesuree en
       chemin en faisait 43 (vu le 1er octobre 2026). Sans mouvement, on
       mesure ce que le doigt trouve une fois la page posee. */
    const contexte = await navigateur.newContext({
      viewport: { width: largeur, height: largeur < SEUIL_TELEPHONE ? 844 : 900 },
      reducedMotion: 'reduce',
    });
    await contexte.addInitScript(`localStorage.setItem('sonaa-langue', '${langue}')`);
    /* Montreal, pour que l'accueil porte de vraies cartes de soirees : sans
       ville, un navigateur de controle ne voit que l'invitation a en choisir une. */
    await contexte.addInitScript(`localStorage.setItem('sonaa.calendar.city', 'montreal-ca')`);
    const page = await contexte.newPage();
    try {
      await page.goto(`${ORIGINE}${page_.chemin}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForSelector(page_.attend, { timeout: 20000 });
      await page.evaluate('document.fonts.ready');
      await page.waitForTimeout(250);
    } catch (e) {
      erreurs.push(`${page_.nom} (${langue}) a ${largeur} px : la page ne rend pas (${(e as Error).message.split('\n')[0]})`);
      await contexte.close();
      continue;
    }
    const m: Mesure = JSON.parse(await page.evaluate(SCRIPT_MESURE));
    await contexte.close();
    mesures += 1;
    const ou = `${page_.nom} (${langue}) a ${largeur} px`;

    if (m.docScroll > m.innerWidth || m.bodyScroll > m.innerWidth) {
      erreurs.push(`${ou} : deborde, document ${m.docScroll} px sur ${m.innerWidth}${m.coupables.length ? ' ; depassent : ' + m.coupables.map((c) => `${c.sel} (droite ${c.droite})`).join(', ') : ''}`);
    }
    if (m.pvScroll !== null && m.pvClient !== null && m.pvScroll > m.pvClient + 1) {
      erreurs.push(`${ou} : le corps de Parcourir deborde, ${m.pvScroll} px sur ${m.pvClient}${m.coupables.length ? ' ; depassent : ' + m.coupables.map((c) => `${c.sel} (droite ${c.droite})`).join(', ') : ''}`);
    }
    if (m.chevauchements.length > 0) erreurs.push(`${ou} : dans la barre du haut, se chevauchent : ${m.chevauchements.join(' ; ')}`);
    if (!m.entete) {
      erreurs.push(`${ou} : pas de barre du haut`);
    } else {
      if (Math.abs(m.entete.hauteur - ENTETE_H) > 1) erreurs.push(`${ou} : la barre du haut fait ${m.entete.hauteur} px au lieu de ${ENTETE_H}`);
      if (m.entete.haut !== 0) erreurs.push(`${ou} : la barre du haut est a ${m.entete.haut} px du bord`);
      if (m.entete.position !== 'fixed' && m.entete.position !== 'absolute') erreurs.push(`${ou} : la barre du haut n'est pas fixee (${m.entete.position})`);
      if (!/blur\(24px\)/.test(m.entete.flou)) erreurs.push(`${ou} : la barre du haut n'est pas en verre (${m.entete.flou})`);
      if (m.entete.alpha >= 1) erreurs.push(`${ou} : la barre du haut est opaque, le verre ne passe pas`);
      if (m.premierContenu !== null && m.premierContenu < ENTETE_H) erreurs.push(`${ou} : le contenu commence a ${m.premierContenu} px, sous la barre du haut`);
    }
    if (largeur < SEUIL_TELEPHONE) {
      if (!m.bas) erreurs.push(`${ou} : pas de barre du bas`);
      else {
        if (Math.abs(m.bas.hauteur - BARRE_BAS_H) > 1) erreurs.push(`${ou} : la barre du bas fait ${m.bas.hauteur} px au lieu de ${BARRE_BAS_H}`);
        if (m.bas.bord !== 0) erreurs.push(`${ou} : la barre du bas est a ${m.bas.bord} px du bord`);
        if (!/blur\(24px\)/.test(m.bas.flou)) erreurs.push(`${ou} : la barre du bas n'est pas en verre (${m.bas.flou})`);
        if (m.retraitBas < BARRE_BAS_H) erreurs.push(`${ou} : body ne reserve que ${m.retraitBas} px sous la page pour une barre de ${BARRE_BAS_H}`);
      }
      if (m.cibles.length > 0) erreurs.push(`${ou} : ${m.cibles.length} cible(s) sous ${CIBLE_MIN} px : ${m.cibles.slice(0, 12).map((c) => `${c.sel} ${c.w}x${c.h}`).join(' ; ')}`);
    } else if (m.bas) {
      erreurs.push(`${ou} : la barre du bas est affichee sur un grand ecran`);
    }
    lignes.push(`  ${ou} : document ${m.docScroll}/${m.innerWidth}, haut ${m.entete ? m.entete.hauteur : '-'}, bas ${m.bas ? m.bas.hauteur : '-'}, contenu a ${m.premierContenu ?? '-'}, cibles courtes ${m.cibles.length}`);
   }
  }
}

/* ═══ LE REPLI DU VERRE ═══

   Chrome refuse de se lancer sans filtre d'arriere-plan : les drapeaux
   `--disable-blink-features` ne le retirent pas (essaye le 28 septembre
   2026, `CSS.supports` repond toujours vrai). On simule donc exactement ce
   que ferait un navigateur sans filtre : dans la feuille construite, la
   regle `@supports not (...)` est remplacee, A SA PLACE, par les regles
   qu'elle contient, et le filtre est retire de la page. L'ordre de la
   cascade est celui du vrai repli ; ce qu'on mesure ensuite, c'est le fond
   que prend reellement chaque surface de verre visible. */
let repli = '';
{
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
  const page = await contexte.newPage();
  await page.goto(`${ORIGINE}/`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('.entete-site', { timeout: 20000 });
  await page.waitForTimeout(250);
  const r = JSON.parse(await page.evaluate(`(() => {
    let remplacees = 0;
    for (const feuille of document.styleSheets) {
      let regles;
      try { regles = feuille.cssRules; } catch { continue; }
      for (let i = regles.length - 1; i >= 0; i -= 1) {
        const r = regles[i];
        if (r.constructor.name === 'CSSSupportsRule' && /^not/.test(r.conditionText.trim()) && /backdrop-filter/.test(r.conditionText)) {
          const dedans = [...r.cssRules].map((x) => x.cssText);
          feuille.deleteRule(i);
          dedans.reverse().forEach((txt) => feuille.insertRule(txt, i));
          remplacees += 1;
        }
      }
    }
    const coupe = document.createElement('style');
    /* LES TRANSITIONS SONT COUPEES AUSSI : une carte de soiree anime sa
       couleur de fond sur 400 ms, et lue aussitot elle rendait encore le
       fond d'avant le repli. */
    coupe.textContent = '* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; transition: none !important; }';
    document.head.appendChild(coupe);
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true }); const alpha = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); return cx.getImageData(0, 0, 1, 1).data[3] / 255; };
    const surfaces = [...document.querySelectorAll('.entete-site, .barre-bas, .cal-soiree, .cal-ville, .pied, .authb-bouton')]
      .filter((e) => e.getBoundingClientRect().height > 0)
      .map((e) => ({ nom: e.className.split(' ')[0], fond: getComputedStyle(e).backgroundColor, alpha: alpha(getComputedStyle(e).backgroundColor) }));
    return JSON.stringify({ remplacees, surfaces });
  })()`));
  await contexte.close();
  if (r.remplacees === 0) erreurs.push("repli du verre : aucune regle @supports not sur le filtre d'arriere-plan dans le CSS construit");
  const translucides = (r.surfaces as { nom: string; fond: string; alpha: number }[]).filter((s) => s.alpha < 1);
  if (translucides.length > 0) erreurs.push(`repli du verre : sans filtre, ces surfaces restent translucides : ${translucides.map((s) => `${s.nom} ${s.fond}`).join(', ')}`);
  if ((r.surfaces as unknown[]).length === 0) erreurs.push('repli du verre : aucune surface de verre mesuree');
  repli = `${(r.surfaces as unknown[]).length} surfaces mesurees sans filtre, toutes opaques (${(r.surfaces as { nom: string }[]).map((s) => s.nom).join(', ')}).`;
}

/* ═══ CHANGER D'ONGLET ARRIVE EN HAUT, ET L'ACCUEIL DEFILE COMME UNE PAGE ═══

   Mika, le 2 octobre 2026 : « quand on change de bouton en bas, des fois le
   menu remonte et ca casse la navigation ». Deux causes, mesurees ici pour
   qu'elles ne reviennent pas : la page suivante heritait de la position de
   defilement de la precedente (le calendrier s'ouvrait a 391 px), et
   l'accueil defilait dans une boite au lieu de la page, ce qui empeche
   Safari de replier sa barre d'adresse et la fait bouger d'un onglet a
   l'autre. */
let parcours = '';
{
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await contexte.newPage();
  await page.goto(`${ORIGINE}/#/news`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('a.barre-bas-onglet', { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.evaluate('window.scrollTo(0, 1500)');
  await page.waitForTimeout(150);
  await page.click('a.barre-bas-onglet[href="#/calendrier"]');
  await page.waitForTimeout(900);
  const yCalendrier = Number(await page.evaluate('Math.round(window.scrollY)'));
  if (yCalendrier !== 0) erreurs.push(`onglets : de News descendu, le calendrier s'ouvre a ${yCalendrier} px au lieu du haut`);
  await page.click('a.barre-bas-onglet[href="#/parcourir"]');
  await page.waitForSelector('.pv-corps', { timeout: 20000 });
  await page.waitForTimeout(900);
  const accueil = JSON.parse(String(await page.evaluate(`JSON.stringify({ doc: document.documentElement.scrollHeight, ecran: innerHeight, debord: getComputedStyle(document.querySelector('.pv-corps')).overflowY, y: Math.round(scrollY) })`))) as { doc: number; ecran: number; debord: string; y: number };
  if (accueil.debord !== 'visible' || accueil.doc <= accueil.ecran) erreurs.push(`onglets : l'accueil defile dans une boite (overflow ${accueil.debord}, document ${accueil.doc} px pour un ecran de ${accueil.ecran}) et non avec la page`);
  if (accueil.y !== 0) erreurs.push(`onglets : l'accueil s'ouvre a ${accueil.y} px au lieu du haut`);
  await contexte.close();
  parcours = `calendrier ouvert a ${yCalendrier} px apres News descendu ; accueil ${accueil.doc} px de document, defilement ${accueil.debord}.`;
}

await navigateur.close();
fermer();

if (mesures === 0) {
  console.error('Mobile : HYPOTHESE TOMBEE, aucune page mesuree.');
  process.exit(1);
}
if (erreurs.length > 0) {
  console.error(`MOBILE : ${erreurs.length} defaut(s) mesure(s).\n` + erreurs.map((e) => `  ${e}`).join('\n') + '\n\nMesures :\n' + lignes.join('\n'));
  process.exit(1);
}
console.log(`Mobile : ${mesures} mesures, aucun debordement, barres de ${ENTETE_H} et ${BARRE_BAS_H} px, cibles de ${CIBLE_MIN} px. Repli : ${repli} Onglets : ${parcours}\n${lignes.join('\n')}`);
