/* LE BANC D'ESSAI DE LA RECONNAISSANCE : UN FICHIER, PAR LE MICRO, JUSQU'AU BOUT.
 *
 * Mika, le 22 septembre 2026 : « deep house et hypnotic techno donnent le
 * meme trio Hi NRG / Dance-pop / Hardstyle, et aucun morceau affiche ». La
 * regle de la mission : aucune correction avant d'avoir mesure.
 *
 * CE BANC NE CONTOURNE RIEN. Chrome est lance avec un faux micro qui lit un
 * fichier WAV a la place de la piece (`--use-file-for-fake-audio-capture`),
 * et la page /reconnaitre/ est pilotee comme un visiteur le ferait : bouton
 * Ecouter, case du morceau cochee, Accepter. Tout ce qui suit est le code de
 * production : getUserMedia, MediaRecorder, decodage, reechantillonnage,
 * fenetres mel, reseau, envoi a la passerelle. Ce qu'on lit a la fin est ce
 * que le visiteur aurait lu, plus les mesures que la page expose en
 * developpement sous `window.__sonaaReco`.
 *
 * CE QU'IL RAPPORTE, PAR FICHIER :
 * - la capture : type MIME, tranches, octets, frequence decodee, nombre
 *   d'echantillons a 16 kHz, niveau efficace (RMS) ;
 * - le style : les trois affiches, et les dix premieres sorties brutes ;
 * - le groupement : l'ecart maximal entre un appel groupe et des appels
 *   separes sur les memes fenetres, et leurs deux top 3 ;
 * - les etiquettes : leur nombre, la premiere et la derniere ;
 * - le morceau : ce qui est parti (octets, type), ce qui est revenu (statut,
 *   corps), et ce que la page affiche.
 *
 * Usage : node scripts/banc-reconnaitre.mjs extrait1.wav [extrait2.wav ...]
 *         (serveur de developpement sur http://localhost:5173) */

import { resolve } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const URL_PAGE = process.env.SONAA_URL ?? 'http://localhost:5173/reconnaitre/';
const ORIGINE = new URL(URL_PAGE).origin;
/* Un profil qui survit d'un fichier a l'autre : TensorFlow.js y range le
   modele dans IndexedDB, et les 43 Mo ne se telechargent qu'une fois. */
const PROFIL = resolve(process.env.TMPDIR ?? '/tmp', 'sonaa-banc-chrome');
const ATTENTE_RESULTAT_MS = 120_000;

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error('Donner au moins un fichier WAV.');
  process.exit(1);
}
mkdirSync(PROFIL, { recursive: true });

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function passer(fichier) {
  const chemin = resolve(fichier);
  const contexte = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1200, height: 900 },
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${chemin}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
  await contexte.grantPermissions(['microphone'], { origin: ORIGINE });
  const page = contexte.pages()[0] ?? (await contexte.newPage());

  const reseau = { envoye: null, recu: null };
  const console_ = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console_.push(`${m.type()} : ${m.text().slice(0, 200)}`);
  });
  page.on('request', (r) => {
    if (r.url().includes('api/reconnaitre-track') && r.method() === 'POST') {
      const corps = r.postDataBuffer();
      reseau.envoye = { octets: corps ? corps.length : 0, type: r.headers()['content-type'] ?? null };
    }
  });
  page.on('response', async (r) => {
    if (r.url().includes('api/reconnaitre-track') && r.request().method() === 'POST') {
      let corps = null;
      try {
        corps = await r.json();
      } catch {
        corps = await r.text().catch(() => null);
      }
      reseau.recu = { statut: r.status(), corps };
    }
  });

  await page.goto(URL_PAGE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.rc-bouton', { timeout: 30_000 });
  /* La sonde GET de disponibilite doit avoir repondu pour que la case du
     morceau existe dans la modale. */
  await attendre(1500);
  await page.click('.rc-bouton');
  await page.waitForSelector('.rc-modale', { timeout: 10_000 });
  const caseMorceau = await page.$('.rc-case input[type=checkbox]');
  const consentement = { casePresente: Boolean(caseMorceau), cochee: false };
  if (caseMorceau) {
    await caseMorceau.check();
    consentement.cochee = await caseMorceau.isChecked();
  }
  await page.click('.rc-accord');

  const debut = Date.now();
  await page.waitForFunction(
    () => document.querySelector('.rc-styles li') || document.querySelector('.rc-erreur'),
    null,
    { timeout: ATTENTE_RESULTAT_MS }
  );
  /* Le morceau arrive apres le style : on laisse la reponse revenir. */
  await page.waitForFunction(
    () => document.querySelector('.rc-morceau, .rc-morceau-titre, .rc-erreur') || !document.querySelector('.rc-bouton-actif'),
    null,
    { timeout: 60_000 }
  ).catch(() => {});
  await attendre(800);
  const duree = Date.now() - debut;

  /* LE MEME FICHIER, SANS LE MICRO : decode et reechantillonne par la page
     elle-meme, puis les memes fenetres et le meme reseau. Si ce chemin donne
     la meme reponse que le chemin du micro, le micro n'est pas en cause. */
  await page.evaluate((b) => {
    window.__b64 = b;
  }, readFileSync(chemin).toString('base64'));
  const lu = await page.evaluate(`(async () => {
    const q = (s) => document.querySelector(s);
    const b64 = window.__b64;
    const texte = (s) => (q(s) ? q(s).textContent.trim() : null);
    const reco = window.__sonaaReco || {};
    const styles = [...document.querySelectorAll('.rc-style')].map((li) => li.textContent.trim().replace(/\\s+/g, ' '));
    const sortie = {
      erreur: texte('.rc-erreur'),
      styles,
      morceauAffiche: q('.rc-morceau') ? q('.rc-morceau').textContent.trim().replace(/\\s+/g, ' ') : texte('.rc-morceau-titre'),
      raisonAffichee: q('.rc-morceau-titre') && !q('.rc-morceau') ? (q('.rc-morceau-titre').nextElementSibling || {}).textContent : null,
      capture: reco.capture ? { ...reco.capture, pcm: undefined } : null,
      morceau: reco.morceau || null,
      etiquettes: null,
      brut: null,
      groupement: null,
    };
    const m = reco.moteur;
    const pcm = reco.capture && reco.capture.pcm;
    if (m && pcm) {
      sortie.etiquettes = { n: m.etiquettes.length, premiere: m.etiquettes[0], derniere: m.etiquettes[m.etiquettes.length - 1] };
      const fen = m.fenetres(pcm);
      const n = fen.length;
      const T = m.tramesParFenetre, B = m.bandes;
      const plat = new Float32Array(n * T * B);
      fen.forEach((f, i) => plat.set(f, i * T * B));
      const groupe = await m.inferer(plat, n);
      const separes = [];
      for (const f of fen) separes.push(await m.inferer(f, 1));
      let ecartMax = 0;
      for (let i = 0; i < n; i += 1) for (let k = 0; k < 400; k += 1) ecartMax = Math.max(ecartMax, Math.abs(groupe[i * 400 + k] - separes[i][k]));
      const moyenne = (src, lire) => { const acc = new Float64Array(400); for (let i = 0; i < n; i += 1) for (let k = 0; k < 400; k += 1) acc[k] += lire(src, i, k) / n; return acc; };
      const mg = moyenne(groupe, (s, i, k) => s[i * 400 + k]);
      const ms = moyenne(separes, (s, i, k) => s[i][k]);
      const top = (acc, nb) => [...acc.keys()].sort((a, b) => acc[b] - acc[a]).slice(0, nb).map((k) => m.etiquettes[k] + ' ' + (acc[k] * 100).toFixed(1) + '%');
      sortie.groupement = { fenetres: n, ecartMax, top3Groupe: top(mg, 3), top3Separes: top(ms, 3) };
      sortie.brut = top(mg, 10);
      /* Les fenetres elles-memes : leur moyenne et leur ecart-type disent si
         le spectrogramme porte du signal ou une constante. */
      const f0 = fen[0]; let s1 = 0, s2 = 0; for (const v of f0) { s1 += v; s2 += v * v; }
      const mu = s1 / f0.length; sortie.fenetre0 = { moyenne: mu, ecartType: Math.sqrt(Math.max(0, s2 / f0.length - mu * mu)), min: Math.min(...f0), max: Math.max(...f0) };

      try {
      const octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
      const ctx = new AudioContext();
      const dec = await ctx.decodeAudioData(octets);
      ctx.close();
      const cible = Math.round(dec.duration * 16000);
      const hors = new OfflineAudioContext(1, cible, 16000);
      const src = hors.createBufferSource(); src.buffer = dec; src.connect(hors.destination); src.start();
      const rendu = await hors.startRendering();
      const pcmF = rendu.getChannelData(0).slice(0, 160000);
      let sq = 0; for (const v of pcmF) sq += v * v;
      const fenF = m.fenetres(pcmF);
      const nF = fenF.length;
      const platF = new Float32Array(nF * T * B);
      fenF.forEach((f, i) => platF.set(f, i * T * B));
      const outF = await m.inferer(platF, nF);
      const mF = new Float64Array(400); for (let i = 0; i < nF; i += 1) for (let k = 0; k < 400; k += 1) mF[k] += outF[i * 400 + k] / nF;
      let ecart = 0; for (let k = 0; k < 400; k += 1) ecart = Math.max(ecart, Math.abs(mF[k] - mg[k]));
      sortie.fichierDirect = { niveau: Math.sqrt(sq / pcmF.length), fenetres: nF, top3: top(mF, 3), ecartMaxAvecMicro: ecart };
      } catch (e) {
        sortie.fichierDirect = { echec: String(e && e.message ? e.message : e) };
      }
    }
    return JSON.stringify(sortie);
  })()`);

  return { fichier, dureeMs: duree, consentement, reseau, console: console_.slice(0, 8), ...JSON.parse(lu) };
  } finally {
    /* LE PROFIL SE LIBERE MEME QUAND LE PASSAGE ECHOUE. Sans cela le fichier
       suivant trouve un Chrome encore vivant sur le meme profil et refuse. */
    await contexte.close().catch(() => {});
  }
}

for (const f of fichiers) {
  console.log(`\n════════ ${f}`);
  try {
    const r = await passer(f);
    console.log(JSON.stringify(r, null, 1));
  } catch (e) {
    console.log('ECHEC :', e instanceof Error ? e.message.split('\n')[0] : String(e));
  }
}
