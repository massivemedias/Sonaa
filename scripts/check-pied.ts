/* LE PIED DE PAGE TIENT SUR UNE LIGNE A PARTIR DE 1024 PX, ET C'EST MESURE.
 *
 * ═══ CE QUE CE CONTROLE AURAIT EVITE ═══
 *
 * Le 22 septembre 2026, en francais, a 1240 px : « Mentions legales » passait
 * sur une seconde ligne. Le nom faisait 74 px, la presence 282, les sept
 * liens 804, les deux ecarts 48 : 1208, soit la colonne entiere, au pixel.
 * En anglais, a la meme largeur, tout tenait avec 270 px de reste. Personne
 * ne l'avait vu parce que la page etait relue en anglais, avec deux personnes
 * en ligne et une seule ville.
 *
 * Une rangee flexible qui tient « en general » n'est pas une rangee qui
 * tient. Ce fichier la mesure dans un vrai Chrome, sur le site construit,
 * dans les deux langues, aux largeurs ou la promesse est faite, et avec la
 * presence la plus longue qu'on puisse raisonnablement afficher.
 *
 * ═══ CE QUI EST MESURE ═══
 *
 * A 1024, 1240 et 1440 px, en francais puis en anglais :
 * 1. les sept liens partagent un meme haut : aucun n'est passe dessous ;
 * 2. le nom, la presence et les liens partagent ce meme haut ;
 * 3. la navigation des liens ne fait qu'une hauteur de ligne.
 * A 1023 px, la rangee doit etre repliee en colonne : c'est l'autre moitie
 * de la regle, « sous 1024, replier comme aujourd'hui ».
 *
 * LA PRESENCE EST FORCEE AU PIRE CAS. Elle vient de Supabase en direct et
 * vaut souvent zero dans un Chrome de controle, ce qui la fait disparaitre
 * et rendrait la mesure complaisante. On ecrit donc dans le pied « 99 en
 * ligne · Saint-Jean-sur-Richelieu », c'est-a-dire deux chiffres et la plus
 * longue ville du corpus des soirees, avant de mesurer.
 *
 * Usage : npm run check:pied   (apres npm run build) */

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 4187;
const LARGEURS_UNE_LIGNE = [1024, 1240, 1440] as const;
const LARGEUR_REPLIEE = 1023;
const LANGUES = ['fr', 'en'] as const;
/* La plus longue ville qui puisse arriver en premiere position : celle du
   corpus des soirees qui a le plus de lettres. */
const PIRE_PRESENCE = { n: 99, ville: 'Saint-Jean-sur-Richelieu' };

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

/* UN SERVEUR STATIQUE DE VINGT LIGNES plutot que `vite preview` : le controle
   ne doit dependre que du dossier construit, pas d'un outil qui lit la
   configuration du projet et pourrait en changer le rendu. */
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

interface Mesure {
  readonly lang: string;
  readonly direction: string;
  readonly liens: number;
  readonly hautsLiens: readonly number[];
  readonly hautNom: number;
  readonly hautPresence: number;
  readonly hautLiens: number;
  readonly hauteurLiens: number;
  readonly largeurLiens: number;
  readonly largeurLigne: number;
  readonly presence: string;
}

const erreurs: string[] = [];
const lignes: string[] = [];

try {
  statSync(join(DIST, 'index.html'));
} catch {
  console.error('Pied : dist/index.html manque. Lancer npm run build avant ce controle.');
  process.exit(1);
}

const fermer = await servir();
let navigateur;
try {
  navigateur = await chromium.launch({ channel: 'chrome', headless: true });
} catch (e) {
  fermer();
  console.error(
    'Pied : Google Chrome introuvable pour la mesure. Ce controle ne sait pas\n' +
      `mesurer sans lui, et un controle qui ne mesure pas ne passe pas.\n${(e as Error).message.split('\n')[0]}`
  );
  process.exit(1);
}

for (const lang of LANGUES) {
  for (const largeur of [...LARGEURS_UNE_LIGNE, LARGEUR_REPLIEE]) {
    const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 900 } });
    /* La langue rangee a la main : c'est le premier choix que lit langue.ts,
       avant l'adresse et avant le navigateur. */
    await contexte.addInitScript(`localStorage.setItem('sonaa-langue', '${lang}')`);
    const page = await contexte.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.pied-liens a', { timeout: 15000 });
    await page.evaluate('document.fonts.ready');

    /* LE SCRIPT DE MESURE EST UNE CHAINE, PAS UNE FONCTION. tsx compile ce
       fichier avec esbuild, qui enveloppe chaque fonction nommee d'un
       `__name(...)` ; envoyee dans la page, la fonction appelle un `__name`
       qui n'y existe pas. Une chaine part telle quelle. */
    const m: Mesure = JSON.parse(
      await page.evaluate(`(() => {
        const pire = ${JSON.stringify(PIRE_PRESENCE)};
        const q = (s) => document.querySelector(s);
        const ligne = q('.pied-ligne');
        const nom = q('.pied-nom');
        const liens = q('.pied-liens');
        if (!ligne || !nom || !liens) throw new Error('le pied n est pas rendu');
        /* LA PRESENCE, FORCEE AU PIRE CAS. Si elle est absente (personne en
           ligne), on la pose telle que PiedDePage.tsx la rend. */
        let presence = q('.pied-presence');
        if (!presence) {
          presence = document.createElement('p');
          presence.className = 'pied-presence';
          nom.after(presence);
        }
        const mot = document.documentElement.lang === 'fr' ? 'en ligne' : 'online';
        presence.innerHTML = '<span class="pied-pouls"></span>' + pire.n + ' ' + mot + '<span class="pied-villes">' + pire.ville + '</span>';
        void ligne.offsetHeight;
        const haut = (e) => Math.round(e.getBoundingClientRect().top);
        const a = [...liens.querySelectorAll('a')];
        return JSON.stringify({
          lang: document.documentElement.lang,
          direction: getComputedStyle(ligne).flexDirection,
          liens: a.length,
          hautsLiens: a.map(haut),
          hautNom: haut(nom),
          hautPresence: haut(presence),
          hautLiens: haut(liens),
          hauteurLiens: Math.round(liens.getBoundingClientRect().height),
          largeurLiens: Math.round(liens.getBoundingClientRect().width),
          largeurLigne: Math.round(ligne.getBoundingClientRect().width),
          presence: presence.textContent || '',
        });
      })()`)
    );
    await contexte.close();

    const ou = `${lang} a ${largeur} px`;
    if (m.lang !== lang) erreurs.push(`${ou} : la page est en « ${m.lang} », la langue rangee n a pas ete lue`);
    if (m.liens !== 7) erreurs.push(`${ou} : ${m.liens} liens au lieu de 7`);

    if (largeur === LARGEUR_REPLIEE) {
      if (m.direction !== 'column') erreurs.push(`${ou} : la rangee devrait etre repliee en colonne, elle est en « ${m.direction} »`);
      lignes.push(`  ${ou} : repliee (${m.direction})`);
      continue;
    }

    /* A QUATRE PIXELS PRES, et pas au pixel : les liens du legal font 12 px
       quand les autres en font 13, et la rangee les centre, donc leur haut
       est un pixel plus bas. Un passage a la ligne, lui, decale de vingt-deux.
       La tolerance est la moitie de la plus petite hauteur de ligne, ce qui
       ne peut confondre les deux. */
    const TOLERANCE = 4;
    const ecartLiens = Math.max(...m.hautsLiens) - Math.min(...m.hautsLiens);
    const unSeulHaut = ecartLiens <= TOLERANCE;
    const ecartRangee = Math.max(m.hautNom, m.hautPresence, m.hautLiens) - Math.min(m.hautNom, m.hautPresence, m.hautLiens);
    const memeRangee = ecartRangee <= TOLERANCE;
    const uneLigne = m.hauteurLiens <= 30;
    if (!unSeulHaut) erreurs.push(`${ou} : les liens sont sur deux lignes, ${ecartLiens} px entre le plus haut et le plus bas (hauts ${m.hautsLiens.join(', ')})`);
    if (!memeRangee) erreurs.push(`${ou} : nom ${m.hautNom}, presence ${m.hautPresence}, liens ${m.hautLiens} ne sont pas sur la meme rangee`);
    if (!uneLigne) erreurs.push(`${ou} : la navigation fait ${m.hauteurLiens} px de haut`);
    lignes.push(`  ${ou} : liens ${m.largeurLiens} px sur ${m.largeurLigne}, une ligne ${unSeulHaut && memeRangee && uneLigne ? 'oui' : 'NON'} (${m.presence})`);
  }
}

await navigateur.close();
fermer();

if (erreurs.length > 0) {
  console.error('PIED SUR DEUX LIGNES :\n' + erreurs.map((e) => `  ${e}`).join('\n') + '\n\nMesures :\n' + lignes.join('\n'));
  process.exit(1);
}
console.log(`Pied : une ligne de 1024 a 1440 px dans les deux langues, repliee a ${LARGEUR_REPLIEE}.\n${lignes.join('\n')}`);
