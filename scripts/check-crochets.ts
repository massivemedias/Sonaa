/* LE CONTROLE DES CROCHETS : aucun filet de couleur colle au bord gauche
 * d'une boite.
 *
 * Usage : npm run check:crochets
 *
 * Mika, le 14 novembre 2026 : « si y a quelque chose que je hais au plus haut
 * point, c'est que mon site ressemble a de l'IA ; le second, c'est ces
 * bordures juste a gauche des boites qui font comme un crochet. Je n'en veux
 * plus sur aucun de mes sites. » Voir DESIGN.md, section 10.
 *
 * Ce controle lit toutes les feuilles de style et refuse :
 * - un `border-left` ou un `border-inline-start` de 2 px ou plus ;
 * - un `border-left-width` de 2 px ou plus ;
 * - une ombre interieure decalee vers la droite (`box-shadow: inset 3px 0 0`),
 *   la meme barre dessinee autrement.
 *
 * Un filet de 1 px entre deux colonnes (les portes de l'accueil, les
 * chiffres d'une mixtape) n'est pas un crochet et passe. Les exceptions
 * nommees ci-dessous sont des reperes de frise, pas des boites. */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = new URL('../src/', import.meta.url).pathname;

/** Des traits verticaux qui ne bordent aucune boite : la graduation d'une
    frise chronologique se pose a cheval sur son axe. */
const PERMIS = new Set(['.chrono-epoque-graduation']);

const fichiers: string[] = [];
const parcourir = (d: string): void => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (n.endsWith('.css')) fichiers.push(p);
  }
};
parcourir(RACINE);

const BORD = /^\s*border-(?:left|inline-start)\s*:\s*([\d.]+)px\s+(?:solid|dashed|double)/;
const LARGEUR = /^\s*border-left-width\s*:\s*([\d.]+)px/;
const OMBRE = /box-shadow\s*:[^;]*\binset\s+([\d.]+)px\s+0(?:px)?\s+0/;

const fautes: string[] = [];
for (const f of fichiers) {
  const lignes = readFileSync(f, 'utf8').split('\n');
  let selecteur = '';
  let commentaire = false;
  lignes.forEach((l, i) => {
    if (commentaire) {
      if (l.includes('*/')) commentaire = false;
      return;
    }
    if (/^\s*\/\*/.test(l) && !l.includes('*/')) {
      commentaire = true;
      return;
    }
    if (l.includes('{')) selecteur = l.replace('{', '').trim();
    const m = BORD.exec(l) ?? LARGEUR.exec(l) ?? OMBRE.exec(l);
    if (!m || Number(m[1]) < 2) return;
    if ([...PERMIS].some((s) => selecteur.includes(s))) return;
    fautes.push(`${f.replace(RACINE, 'src/')}:${i + 1}  ${selecteur}  ->  ${l.trim()}`);
  });
}

if (fautes.length > 0) {
  console.error(`CROCHETS : ${fautes.length} filet(s) colle(s) au bord gauche d'une boite. Mika n'en veut aucun (DESIGN.md, section 10).\n`);
  for (const x of fautes) console.error(`  - ${x}`);
  process.exit(1);
}
console.log(`Crochets : ${fichiers.length} feuilles de style relues, aucun filet colle au bord gauche d'une boite.`);
