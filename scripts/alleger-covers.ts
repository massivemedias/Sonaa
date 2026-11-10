/* ALLEGER LES POCHETTES DE public/covers.
 *
 * Mika, le 10 novembre 2026 : « allege les pochettes pour que le deploiement
 * soit plus rapide ». Les 2 464 pochettes pesaient 81 Mo, un tiers du site
 * construit, et l'envoi vers GitHub Pages depassait sa limite de dix minutes.
 *
 * Chaque pochette est reencodee en JPEG progressif, qualite 72 (mozjpeg),
 * sans metadonnees, et plafonnee a 400 px : c'est la taille du plus grand
 * affichage (une tuile de famille a 200 px sur un ecran Retina). A cette
 * qualite, la difference ne se voit pas a l'oeil sur une pochette ; le gain
 * mesure sur un echantillon de 99 fichiers est de 43 %.
 *
 * IDEMPOTENT : un fichier n'est reecrit que s'il y gagne plus de 5 %. Une
 * pochette deja allegee ne bouge plus, et on peut relancer le script apres
 * chaque `npm run fetch:covers` (crop-covers.sh le fait a la fin).
 *
 * Usage : npm run alleger:covers */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DOSSIER = fileURLToPath(new URL('../public/covers', import.meta.url));
const COTE_MAX = 400;
const QUALITE = 72;
const GAIN_MIN = 0.05;

let avant = 0;
let apres = 0;
let reecrites = 0;
let laissees = 0;
let illisibles = 0;

for (const nom of readdirSync(DOSSIER).filter((f) => f.endsWith('.jpg'))) {
  const chemin = `${DOSSIER}/${nom}`;
  const brut = readFileSync(chemin);
  avant += brut.length;
  let leger: Buffer;
  try {
    leger = await sharp(brut)
      .rotate()
      .resize(COTE_MAX, COTE_MAX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITE, mozjpeg: true, progressive: true })
      .toBuffer();
  } catch {
    /* une image que sharp ne lit pas reste telle quelle */
    illisibles += 1;
    apres += brut.length;
    continue;
  }
  if (leger.length < brut.length * (1 - GAIN_MIN)) {
    writeFileSync(chemin, leger);
    apres += leger.length;
    reecrites += 1;
  } else {
    apres += brut.length;
    laissees += 1;
  }
}

const mo = (n: number): string => `${(n / 1024 / 1024).toFixed(1)} Mo`;
console.log(
  `Pochettes : ${reecrites} allegees, ${laissees} laissees, ${illisibles} illisibles. ` +
    `${mo(avant)} -> ${mo(apres)} (${Math.round(100 - (apres / Math.max(avant, 1)) * 100)} %).`
);
