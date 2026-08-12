/* VERIFY:VISUAL AUX QUATRE LARGEURS, PILOTE PAR DE VRAIS CLICS.
 *
 * Pourquoi ce pilote existe. ADR-048 avait refuse d'embarquer un navigateur
 * headless en CI, et la marche a suivre etait manuelle : lancer le serveur,
 * ouvrir la page avec ?verify, lire le JSON, recommencer a chaque largeur.
 * Personne ne le faisait aux quatre largeurs.
 *
 * Ce script ne revient pas sur cette decision : il ne tourne PAS en CI. Il
 * automatise la marche a suivre, a la main, avec le meme Chrome que
 * capture-og.mjs et le meme protocole CDP.
 *
 * LE POINT QUI COMPTE : le mode focus est arme par un VRAI evenement de
 * pointeur dispatche sur le canvas, sur le chemin le plus court qu'un
 * visiteur emprunte, un seul clic depuis la vue d'ensemble. C'est la regle 3
 * des quatre regles de verification (HANDOFF.md, section 0), et elle vient
 * d'un defaut qui a traverse toutes les verifications precedentes parce
 * qu'elles appelaient les fonctions internes du moteur.
 *
 * Usage : npm run verify:visual   (serveur de dev sur le port 5173)
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9337;
const URL_APP = process.argv[2] ?? 'http://localhost:5173/';

/* Les quatre largeurs, et ce que chacune vaut la peine de couvrir :
   390  le plus petit telephone en service, feuille du lecteur en barre ;
   700  la bascule entre feuille mobile et colonne laterale ;
   1024 tablette en paysage, colonne et carte se partagent l'ecran ;
   1440 poste de bureau courant. */
const LARGEURS = [
  { w: 390, h: 844 },
  { w: 700, h: 900 },
  { w: 1024, h: 768 },
  { w: 1440, h: 900 }
];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const profil = mkdtempSync(join(tmpdir(), 'sonaa-verify-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
    '--window-size=1440,900', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'
  ],
  { stdio: 'ignore' }
);

const finir = async (code) => {
  try { chrome.kill(); } catch { /* deja mort */ }
  await attendre(400);
  try { rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* rien */ }
  process.exit(code);
};

const cibleWs = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const p = (await r.json()).find((c) => c.type === 'page');
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch { /* pas encore la */ }
    await attendre(250);
  }
  throw new Error(`Chrome n'a pas ouvert son port de debogage sur ${PORT}.`);
};

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.attente = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      const p = this.attente.get(m.id);
      if (!p) return;
      this.attente.delete(m.id);
      if (m.error) p.rejeter(new Error(m.error.message)); else p.resoudre(m.result);
    });
  }
  envoyer(method, params = {}) {
    this.id += 1; const id = this.id;
    return new Promise((resoudre, rejeter) => {
      this.attente.set(id, { resoudre, rejeter });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluer(expression) {
    const r = await this.envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'erreur dans la page');
    return r.result.value;
  }
}

const ouvrir = (url) => new Promise((resoudre, rejeter) => {
  const ws = new WebSocket(url);
  ws.addEventListener('open', () => resoudre(new Cdp(ws)));
  ws.addEventListener('error', () => rejeter(new Error('WebSocket CDP injoignable')));
});

const main = async () => {
  const cdp = await ouvrir(await cibleWs());
  await cdp.envoyer('Page.enable');
  await cdp.envoyer('Runtime.enable');
  await cdp.envoyer('Page.addScriptToEvaluateOnNewDocument', {
    source: `try{
      localStorage.setItem('sonaa-welcome-seen','1');
      localStorage.setItem('sonaa-intro-seen','1');
      localStorage.setItem('sonaa-colonne-vue','1');
      localStorage.setItem('sonaa-view','libre');
    }catch(e){}`
  });

  const resultats = [];
  let echecs = 0;

  for (const { w, h } of LARGEURS) {
    await cdp.envoyer('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: 2, mobile: w < 768
    });
    /* ?verify n'est PAS pose ici : la suite doit tourner APRES le clic, sinon
       le test de focus trouve un mode non arme et rend « non arme ». */
    await cdp.envoyer('Page.navigate', { url: URL_APP });

    let pret = false;
    for (let i = 0; i < 120; i += 1) {
      await attendre(500);
      pret = await cdp.evaluer(
        `Boolean(window.__atlas && window.__atlas.framing && document.querySelectorAll('.atlas-label').length > 4 && !window.__atlas.framing().introActive)`
      );
      if (pret) break;
    }
    if (!pret) throw new Error(`${w} px : l'atlas ne s'est pas pose`);
    await attendre(2500);

    /* LE VRAI CLIC. On vise le premier nom de genre affiche, celui qu'un
       visiteur verrait en premier, et on clique dessus une seule fois depuis
       la vue d'ensemble. */
    const cible = await cdp.evaluer(`(() => {
      const visibles = [...document.querySelectorAll('.atlas-label')]
        .filter(e => e.getBoundingClientRect().left > -500 && Number(getComputedStyle(e).opacity) > 0.05);
      /* Un nom de genre de preference : cliquer un nom de FAMILLE entre dans
         son fondateur, ce qui reste un genre, mais on veut ici le geste le
         plus courant. A defaut, n'importe quel nom visible fait l'affaire. */
      const e = visibles.find(x => x.dataset.kind === 'genre') ?? visibles[0];
      if (!e) return {vide: true, total: document.querySelectorAll('.atlas-label').length};
      const r = e.getBoundingClientRect();
      return {texte: e.textContent, kind: e.dataset.kind, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)};
    })()`);
    if (!cible || cible.vide) {
      throw new Error(`${w} px : aucun nom visible a cliquer (${cible ? cible.total : 0} dans le DOM)`);
    }

    for (const type of ['mousePressed', 'mouseReleased']) {
      await cdp.envoyer('Input.dispatchMouseEvent', {
        type, x: cible.x, y: cible.y, button: 'left',
        buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, pointerType: 'mouse'
      });
      await attendre(60);
    }
    await attendre(4500); // vol, couronne, montee du flou

    const rapport = await cdp.evaluer(`(async () => {
      const m = await import('/src/atlas/verify-visual.ts');
      return await m.runVisualVerification();
    })()`);

    const verdicts = Object.entries(rapport).map(([k, v]) => [k, v.verdict]);
    const rates = verdicts.filter(([, v]) => v === 'echec');
    echecs += rates.length;
    resultats.push({ largeur: w, clic: cible.texte, verdicts: Object.fromEntries(verdicts), rapport });

    console.log(`\n${w} x ${h} px, clic reel sur « ${cible.texte} »`);
    for (const [nom, v] of verdicts) console.log(`  ${v === 'ok' ? 'ok    ' : v.startsWith('coupe') || v.startsWith('non') || v.includes('indisponible') ? 'sans  ' : 'ECHEC '} ${nom} : ${v}`);
    if (rapport.focus) {
      const f = rapport.focus;
      console.log(`  focus : ${f.zone} cibles, ecart ${f.ecartMinPx} px, flou min ${f.flouMin}, ${f.netsHorsZone} nettes hors zone, ${f.nomsSurSphereNette} noms sur sphere nette, ${f.ciblesHorsZone} cibles hors zone`);
      if (f.detailNoms && f.detailNoms.length) console.log(`          ${f.detailNoms.join(' | ')}`);
    }
  }

  console.log(`\n${echecs === 0 ? 'AUCUN ECHEC sur les quatre largeurs.' : echecs + ' echec(s).'}`);
  if (process.env['SONAA_VERIFY_JSON']) console.log(JSON.stringify(resultats, null, 1));
  return echecs;
};

main()
  .then((n) => finir(n === 0 ? 0 : 1))
  .catch(async (e) => { console.error('ECHEC :', e.message); await finir(1); });
