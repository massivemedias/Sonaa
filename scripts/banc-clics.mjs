/* LE BANC DES CLICS, RÉÉCRIT.
 *
 * Objectif : ouvrir un genre, puis cliquer chacun de ses dérivés, et compter
 * combien ouvrent LA BONNE fiche.
 *
 * CE QUI CLOCHAIT DANS LE PRÉCÉDENT, et qui l'a fait accuser le produit à
 * tort : il relevait les positions des quinze sphères UNE SEULE FOIS, puis
 * cliquait quinze fois. Or un clic peut déplier une génération et recomposer
 * l'arbre : les quatorze clics suivants tombaient sur des coordonnées
 * périmées, et quatre d'entre eux convergeaient vers la même sphère parce
 * qu'ils convergeaient vers la même zone d'écran pendant l'animation.
 *
 * TROIS RÈGLES ICI, chacune corrigeant une façon de mentir :
 *
 *   1. la position est relue JUSTE AVANT chaque clic ;
 *   2. on attend que la carte soit IMMOBILE avant de lire, pas un délai fixe :
 *      un délai deviné est un pari sur la vitesse de la machine ;
 *   3. on repart d'un ÉTAT PROPRE entre deux clics, en rouvrant le genre
 *      racine, pour que chaque mesure soit indépendante des précédentes.
 *
 * Usage : node scripts/banc-clics.mjs "Detroit Techno"
 */

import { spawn } from 'node:child_process';
/* LE PRELUDE, ENFIN BRANCHE. Il a ete ecrit apres quatre morts du serveur de
   developpement, documente sur quarante lignes, exporte, et jamais appele :
   c'est exactement le defaut qu'il decrit, applique a lui-meme.

   Ce banc avait sa propre attente, cent vingt essais d'une demi-seconde, mais
   elle ne CRIAIT PAS : au bout du compte elle passait a la suite et mesurait
   sur une page absente. Un zero rendu la ressemble a une mesure. */
import { exigerLaPage, serieValide } from './banc-prelude.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9401;
const L = 1280;
const H = 800;
const GENRE = process.argv[2] ?? 'Detroit Techno';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const profil = mkdtempSync(join(tmpdir(), 'sonaa-banc-'));
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
    `--window-size=${L},${H}`, '--no-first-run', '--no-default-browser-check',
    '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'
  ],
  { stdio: 'ignore' }
);

const finir = async (c) => {
  try { chrome.kill(); } catch { /* deja mort */ }
  await attendre(300);
  try { rmSync(profil, { recursive: true, force: true, maxRetries: 5 }); } catch { /* rien */ }
  process.exit(c);
};

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.a = new Map();
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      const p = this.a.get(m.id);
      if (!p) return;
      this.a.delete(m.id);
      if (m.error) p.j(new Error(m.error.message)); else p.r(m.result);
    });
  }
  envoyer(method, params = {}) {
    this.id += 1; const id = this.id;
    return new Promise((r, j) => { this.a.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async ev(e) {
    const r = await this.envoyer('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'err');
    return r.result.value;
  }
}

const main = async () => {
  let ws;
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const p = (await r.json()).find((c) => c.type === 'page');
      if (p?.webSocketDebuggerUrl) { ws = p.webSocketDebuggerUrl; break; }
    } catch { /* pas encore la */ }
    await attendre(250);
  }
  const cdp = await new Promise((r, j) => {
    const w = new WebSocket(ws);
    w.addEventListener('open', () => r(new Cdp(w)));
    w.addEventListener('error', () => j(new Error('ws')));
  });
  await cdp.envoyer('Page.enable');
  await cdp.envoyer('Runtime.enable');
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: L, height: H, deviceScaleFactor: 2, mobile: false });
  await cdp.envoyer('Page.addScriptToEvaluateOnNewDocument', {
    source: `try{localStorage.setItem('sonaa-welcome-seen','1');localStorage.setItem('sonaa-intro-seen','1');localStorage.setItem('sonaa-colonne-vue','1');}catch(e){}`
  });
  await cdp.envoyer('Page.navigate', { url: 'http://localhost:5173/' });
  /* AVANT TOUTE MESURE : la page est-elle la ? S'arrete BRUYAMMENT sinon. */
  await exigerLaPage({
    lire: (e) => cdp.ev(e),
    marqueur: 'canvas.atlas-canvas',
    url: 'http://localhost:5173/',
    arreter: (c) => finir(c)
  });
  for (let i = 0; i < 120; i += 1) {
    await attendre(500);
    if (await cdp.ev(`Boolean(window.__atlas && window.__atlas.framing && !window.__atlas.framing().introActive)`)) break;
  }
  await attendre(2000);

  /* IMMOBILE, ET NON « APRES DEUX SECONDES ». On lit la camera deux fois a
     250 ms d'intervalle : tant qu'elle bouge, on attend. Un delai fixe est un
     pari sur la vitesse de la machine, et il a deja fait mentir un banc. */
  const immobile = async (maxMs = 9000) => {
    const lire = () => cdp.ev(`(()=>{const f=window.__atlas.framing();return f.azimuth+'|'+f.elevation+'|'+Math.round(f.distance*100);})()`);
    let precedent = await lire();
    for (let t = 0; t < maxMs; t += 250) {
      await attendre(250);
      const courant = await lire();
      if (courant === precedent) return true;
      precedent = courant;
    }
    return false;
  };

  const clic = async (x, y) => {
    await cdp.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await attendre(120);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await cdp.envoyer('Input.dispatchMouseEvent', {
        type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, pointerType: 'mouse'
      });
    }
  };

  /* Ouvrir le genre racine par la recherche : c'est le chemin d'un visiteur
     pour atteindre un genre qui n'est pas nomme a la vue d'ensemble. */
  const ouvrirRacine = async () => {
    await cdp.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: '/', code: 'Slash', text: '/', windowsVirtualKeyCode: 191 });
    await cdp.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: '/', code: 'Slash', windowsVirtualKeyCode: 191 });
    await attendre(600);
    await cdp.envoyer('Input.insertText', { text: GENRE });
    await attendre(1000);
    const res = await cdp.ev(`(()=>{const e=document.querySelector('.search-hit');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
    if (!res) throw new Error(`« ${GENRE} » introuvable dans la recherche`);
    await clic(res.x, res.y);
    await immobile();
  };

  /* LES HYPOTHESES DE CE BANC, DECLAREES ET VERIFIEES.

     Regle posee apres le quatrieme outil faux de la semaine : un outil qui ne
     declare pas ses hypotheses ne peut pas les voir tomber. Celles-ci sont
     verifiables, donc elles sont verifiees ici et non esperees. */
  await ouvrirRacine();
  const hyp = await cdp.ev(`(()=>{
    const z = window.__atlas.zoneFocus();
    const c = document.querySelector('canvas');
    const r = c && c.getBoundingClientRect();
    const d = window.__atlas.dimensions ? window.__atlas.dimensions() : null;
    return [
      { e: 'un genre est ouvert et sa zone est armee', t: Boolean(z && z.actif), c: z ? (z.racine || 'sans racine') : 'zoneFocus indisponible' },
      { e: 'les coordonnees de la zone sont dans le repere du canvas, origine connue',
        t: Boolean(r), c: r ? 'canvas a (' + Math.round(r.left) + ', ' + Math.round(r.top) + ')' : 'aucun canvas' },
      { e: 'les dimensions annoncees par le moteur sont celles du canvas affiche',
        t: Boolean(d && r) && Math.abs(d.largeur - r.width) <= 2 && Math.abs(d.hauteur - r.height) <= 2,
        c: d && r ? 'moteur ' + Math.round(d.largeur) + 'x' + Math.round(d.hauteur) + ', canvas ' + Math.round(r.width) + 'x' + Math.round(r.height) : 'indisponible' },
      { e: 'la colonne du lecteur est presente, elle deduit la zone utile',
        t: Boolean(document.querySelector('.pcol')), c: document.querySelector('.pcol') ? 'presente' : 'absente' }
    ];})()`);
  for (const x of hyp) console.log(`  hypothese ${x.t ? 'tenue ' : 'TOMBEE'} : ${x.e}  (${x.c})`);
  const tombees = hyp.filter((x) => !x.t);
  if (tombees.length > 0) {
    console.error('\nHYPOTHESES TOMBEES : les mesures qui suivent sont sans valeur.');
    return tombees.length;
  }

  const racine = await cdp.ev(`window.__atlas.zoneFocus().racine`);
  const noms = await cdp.ev(`window.__atlas.zoneFocus().membres.filter(m=>m.generation>=1).map(m=>m.label)`);
  console.log(`racine « ${racine} », ${noms.length} derives`);

  let bons = 0;
  const rates = [];

  for (const nom of noms) {
    /* ENTRE CHAQUE POINT DE LA SERIE, et pas seulement au debut : un serveur
       mort au milieu donne une serie qui a l'allure d'une regression trouvee.
       Ce qui compte dans une serie est la COMPARAISON, et elle n'a plus de
       sens des qu'un seul point vient d'un autre environnement. */
    if (!(await serieValide({ lire: (e) => cdp.ev(e), marqueur: 'canvas.atlas-canvas', url: 'http://localhost:5173/', arreter: (c) => finir(c), point: nom }))) return;
    /* ÉTAT PROPRE : on rouvre la racine avant chaque mesure. Sans cela, le
       clic precedent a pu deplier une generation, et la mesure suivante porte
       sur un arbre different de celui qu'on croit mesurer. */
    await ouvrirRacine();

    /* POSITION RELUE JUSTE AVANT LE CLIC, sur une carte immobile. */
    const cible = await cdp.ev(`(()=>{const z=window.__atlas.zoneFocus();const t=z.membres.find(m=>m.label===${JSON.stringify(nom)});return t?{x:Math.round(t.x),y:Math.round(t.y),r:t.rayonPx}:null;})()`);
    if (!cible) { rates.push(`${nom} : absent de la zone`); continue; }

    await clic(cible.x, cible.y);
    await immobile();

    const panneau = await cdp.ev(`document.querySelector('.pcol-titre, .pcol h2') ? document.querySelector('.pcol-titre, .pcol h2').textContent : null`);
    if (panneau === nom) bons += 1;
    else rates.push(`${nom} (r=${cible.r}) ouvre « ${panneau} »`);
  }

  console.log(`\nBANC : ${bons} sur ${noms.length} ouvrent la bonne fiche.`);
  for (const r of rates) console.log(`   ${r}`);
  return rates.length;
};

main().then((n) => finir(n === 0 ? 0 : 1)).catch(async (e) => { console.error('ECHEC :', e.message); await finir(1); });
