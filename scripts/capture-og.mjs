/* IMAGE DE PARTAGE : une capture de l'atlas, pas le logotype seul.
 *
 * POURQUOI CE SCRIPT EXISTE. L'image Open Graph montrait le disque de la
 * marque. Elle disait qui publie, jamais ce qu'on publie : quelqu'un qui voit
 * passer le lien ne voyait pas qu'il y a une carte derriere. La decision est
 * de montrer le produit. Le disque reste pour les favicons et les ecrans de
 * lancement, ou il est a sa place.
 *
 * POURQUOI PAS verify:visual. Ce script-la mesure, il ne photographie pas, et
 * il a besoin d'une page ouverte a la main : ADR-048 a refuse d'embarquer un
 * navigateur headless en CI. On ne revient pas sur cette decision ici, ce
 * fichier n'est pas lance par la CI mais a la main, comme build-brand.sh,
 * quand l'image doit etre refaite.
 *
 * COMMENT. Chrome est deja installe sur la machine : on le lance en headless
 * avec son port de debogage et on lui parle en CDP, sur le WebSocket natif de
 * Node 22. Aucune dependance ajoutee au projet, ni puppeteer ni playwright.
 *
 * CE QUI EST CAPTURE. La vue d'ensemble des 14 familles, camera a la pose par
 * defaut, sans aucun element d'interface : ni fil d'Ariane, ni controles, ni
 * legende, ni pied de page. Seuls restent le canvas et la couche de labels,
 * qui est du DOM et n'existe donc pas dans le canvas : c'est toute la raison
 * pour laquelle on photographie la PAGE et non le tampon WebGL.
 *
 * Capture a 2400 x 1260, puis reduction a 1200 x 630 : les labels sont fins,
 * et un texte reduit de moitie se tient mieux qu'un texte rendu a sa taille.
 *
 * Usage : npm run capture:og   (serveur de dev sur le port 5173)
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const URL_APP = process.argv[2] ?? 'http://localhost:5173/';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

/* POURQUOI LA FENETRE N'EST PAS AUX DIMENSIONS DE L'IMAGE.
 *
 * Les labels de l'atlas sont bornes en PIXELS D'ECRAN, pas en unites du
 * monde : au niveau d'ensemble ils tombent sur leur plancher de 9 px. Une
 * capture faite dans une fenetre de 1200 px de large les rend donc a 9 px
 * dans une image de 1200, et une carte de partage s'affiche souvent a 500 px
 * de large : les noms deviennent illisibles, ce qui est exactement ce qu'on
 * cherchait a montrer.
 *
 * On photographie donc une fenetre DEUX FOIS PLUS PETITE, avec une densite
 * double, puis on reduit : meme rapport de forme, donc meme cadrage calcule
 * par le moteur et meme composition, mais chaque label occupe le double de
 * l'image finale. 9 px de CSS deviennent 13,5 px sur 1200.
 *
 * 800 et non 600 : sous 768 px l'application bascule dans ses regles
 * mobiles, et l'image de partage doit montrer la carte telle qu'on la voit
 * sur un ecran, pas sa version telephone. */
const LARGEUR_CSS = 800;
const HAUTEUR_CSS = 420;
const DENSITE = 3;
const LARGEUR = 1200;
const HAUTEUR = 630;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------------------------------- lancement Chrome */

const profil = mkdtempSync(join(tmpdir(), 'sonaa-og-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profil}`,
    `--window-size=${LARGEUR_CSS},${HAUTEUR_CSS}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    /* Sans GPU reel, WebGL passe par SwiftShader. Le rendu est identique,
       seulement plus lent : on ne mesure rien ici, on photographie. */
    '--use-gl=angle',
    '--use-angle=swiftshader',
    'about:blank'
  ],
  { stdio: 'ignore' }
);

/* Chrome ecrit encore dans son profil pendant qu'il meurt : un effacement
   immediat echoue en ENOTEMPTY. On lui laisse le temps, et un profil oublie
   dans /tmp ne serait de toute facon pas une raison de rendre un echec. */
const finir = async (code) => {
  try {
    chrome.kill();
  } catch {
    /* deja mort */
  }
  await attendre(400);
  try {
    rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* profil temporaire laisse en place, sans consequence */
  }
  process.exit(code);
};

/* Le port n'est pas ouvert des le spawn : on reessaie au lieu de dormir une
   duree devinee. */
const cibleWs = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const cibles = await r.json();
      const page = cibles.find((c) => c.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* pas encore la */
    }
    await attendre(250);
  }
  throw new Error(`Chrome n'a pas ouvert son port de debogage sur ${PORT}.`);
};

/* ------------------------------------------------------------- client CDP */

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.attente = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      const p = this.attente.get(m.id);
      if (!p) return;
      this.attente.delete(m.id);
      if (m.error) p.rejeter(new Error(`${m.error.message} (${JSON.stringify(m.error)})`));
      else p.resoudre(m.result);
    });
  }

  envoyer(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((resoudre, rejeter) => {
      this.attente.set(id, { resoudre, rejeter });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  /* Evalue une expression dans la page et rend sa valeur. awaitPromise pour
     que les expressions asynchrones soient attendues et non rendues en
     Promise vide. */
  async evaluer(expression) {
    const r = await this.envoyer('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description ?? 'erreur dans la page');
    }
    return r.result.value;
  }
}

const ouvrir = (url) =>
  new Promise((resoudre, rejeter) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resoudre(new Cdp(ws)));
    ws.addEventListener('error', () => rejeter(new Error('WebSocket CDP injoignable')));
  });

/* ------------------------------------------------------------------ capture */

const main = async () => {
  const cdp = await ouvrir(await cibleWs());

  await cdp.envoyer('Page.enable');
  await cdp.envoyer('Runtime.enable');
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', {
    width: LARGEUR_CSS,
    height: HAUTEUR_CSS,
    deviceScaleFactor: DENSITE,
    mobile: false
  });

  /* AVANT le premier script de la page, sinon l'ecran d'accueil s'affiche et
     l'intro rejoue. Ces trois cles sont celles que l'application ecrit
     elle-meme quand on a deja visite : on ne simule rien, on se met dans
     l'etat d'un visiteur qui revient.
     La feuille de style cache TOUT sauf le canvas et la couche de labels. */
  await cdp.envoyer('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try {
        localStorage.setItem('sonaa-welcome-seen', '1');
        localStorage.setItem('sonaa-intro-seen', '1');
        localStorage.setItem('sonaa-view', 'libre');
      } catch (e) {}
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = \`
          #sonaa-splash { display: none !important; }
          .atlas-root > *:not(canvas):not(.atlas-labels) { display: none !important; }
          body > *:not(#root) { display: none !important; }
        \`;
        document.head.appendChild(s);
      });
    `
  });

  await cdp.envoyer('Page.navigate', { url: URL_APP });

  /* Le moteur s'annonce par window.__atlas. On attend qu'il existe, puis que
     les labels soient poses : une capture prise trop tot rend une carte sans
     noms, ce qui est exactement ce qu'on ne veut pas. */
  let pret = false;
  for (let i = 0; i < 240; i += 1) {
    await attendre(500);
    const etat = await cdp.evaluer(`(() => {
      const a = window.__atlas;
      if (!a || !a.framing) return null;
      const f = a.framing();
      return {
        labels: document.querySelectorAll('.atlas-label').length,
        introActive: f.introActive,
        distance: f.distance,
        atlasDistance: f.atlasDistance,
        defauts: f.defaults
      };
    })()`);
    if (etat && etat.labels > 8 && !etat.introActive) {
      console.log(
        `moteur pret : ${etat.labels} labels, distance ${Math.round(etat.distance)}`
      );
      pret = true;
      break;
    }
  }
  if (!pret) throw new Error("l'atlas n'a pas fini de se poser");

  /* Pose exacte : les valeurs par defaut du moteur, jamais des angles
     inventes ici. On photographie le cadrage que voit un visiteur. */
  await cdp.evaluer(`(() => {
    const a = window.__atlas;
    const f = a.framing();
    a.setOrbit(f.defaults[0] * 180 / Math.PI, f.defaults[1] * 180 / Math.PI, f.atlasDistance);
    return true;
  })()`);

  /* La passe de placement des labels arbitre sur des positions qui bougent
     encore juste apres un saut d'orbite : meme delai que le test de
     recouvrement de verify-visual, 700 ms, plus une marge. */
  await attendre(2000);

  const compte = await cdp.evaluer(
    `document.querySelectorAll('.atlas-label').length`
  );
  const lisibles = await cdp.evaluer(`(() => {
    let n = 0;
    for (const e of document.querySelectorAll('.atlas-label')) {
      const r = e.getBoundingClientRect();
      if (r.left > -500 && Number(getComputedStyle(e).opacity) > 0.05) n += 1;
    }
    return n;
  })()`);

  const shot = await cdp.envoyer('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: LARGEUR_CSS, height: HAUTEUR_CSS, scale: DENSITE }
  });

  const brut = join(profil, 'atlas.png');
  writeFileSync(brut, Buffer.from(shot.data, 'base64'));
  console.log(`capture : ${compte} labels dans le DOM, ${lisibles} visibles`);

  /* ------------------------------------------------- composition finale */

  /* Le logotype en bas a gauche, petit, sans texte ajoute : l'image doit
     montrer la carte, la marque signe le coin. 180 px de large sur 1200,
     soit un septieme de la largeur ; marge de 48 px, la meme des deux cotes.
     Le coin bas-gauche est le seul que le nuage de spheres ne visite pas au
     cadrage par defaut : le logotype ne couvre donc aucun genre. */
  execFileSync('magick', [
    brut,
    '-resize', `${LARGEUR}x${HAUTEUR}`,
    '(', 'public/brand/sonaa-logo.png', '-resize', '180x', ')',
    '-gravity', 'southwest',
    '-geometry', '+48+48',
    '-composite',
    '-alpha', 'off',
    '-strip',
    'public/og.png'
  ]);

  const taille = execFileSync('magick', ['identify', '-format', '%wx%h %b', 'public/og.png'])
    .toString()
    .trim();
  console.log(`public/og.png ecrit : ${taille}`);
};

main()
  .then(() => finir(0))
  .catch(async (e) => {
    console.error(`ECHEC : ${e.message}`);
    await finir(1);
  });
