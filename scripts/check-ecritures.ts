/* GARDE-FOU : UNE SEULE ÉCRITURE PAR VALEUR DANS LA BOUCLE DE RENDU.
 *
 * LE SEUL MOTIF DE CE PROJET QUI RÉSISTE À LA DOCUMENTATION.
 *
 * Trois occurrences en une seule session, et la règle était écrite avant la
 * deuxième :
 *
 *   1. deux corrections continues sur la caméra, chacune vers son idée du bon
 *      cadrage ; la carte dérivait à chaque clic ;
 *   2. deux règles CSS pour le même sélecteur ; la zone de saisie de la barre
 *      annonçait 44 px et en mesurait 24 ;
 *   3. les bornes de rayon écrivaient `sphereRadii` APRÈS le calcul du survol
 *      et l'écrasaient ; survoler une sphère ne l'agrandissait plus.
 *
 * Toujours la même forme : deux endroits écrivent la même valeur, le dernier
 * gagne, et RIEN ne le signale. Ni le compilateur, ni la relecture, ni les
 * tests, parce que chaque écriture est correcte prise seule. Ce qui est faux
 * n'est dans aucune des deux lignes, il est dans leur ORDRE, et l'ordre ne
 * s'écrit nulle part.
 *
 * D'où ce contrôle. Il ne juge pas la valeur écrite, il compte les écrivains.
 * Deux écrivains sur la même valeur doivent DÉCLARER leur ordre, ce qui oblige
 * à se demander lequel doit gagner, et donc à voir le conflit.
 *
 * Usage : npm run check:ecritures
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MOTEUR = fileURLToPath(new URL('../src/atlas/webgl-orbit.ts', import.meta.url));
const source = readFileSync(MOTEUR, 'utf8');

const debut = source.indexOf('const avancer = (now: number): void => {');
if (debut < 0) {
  console.error('ECRITURES : la boucle de rendu est introuvable.');
  process.exit(1);
}
const fin = source.indexOf('\n  };', debut);
const lignes = source.slice(debut, fin > 0 ? fin : source.length).split('\n');
const ligneDepart = source.slice(0, debut).split('\n').length;

/* Les valeurs surveillées : celles dont une écriture concurrente se voit à
   l'écran. Les compteurs et les accumulateurs locaux n'y sont pas, ils sont
   faits pour être écrits plusieurs fois. */
const SURVEILLEES = [
  'sphereRadii',
  'sphereState',
  'sphereCenters',
  'rayonClic',
  'defocus',
  'labelled',
  'linkMeta'
];

/* Une écriture peut être déclarée comme venant APRÈS une autre, ce qui rend
   l'ordre explicite et donc défendable. Le marqueur se pose en commentaire,
   au-dessus du bloc, et il doit dire ce qui gagne. */
const MARQUEUR = /APRES\s+(?:LES|LE|LA)\b|s'applique APRES|ORDRE EXPLICITE/i;

interface Ecriture {
  cible: string;
  ligne: number;
  texte: string;
  declaree: boolean;
}

const ecritures: Ecriture[] = [];

lignes.forEach((ligne, i) => {
  const nu = ligne.trim();
  if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) return;

  for (const cible of SURVEILLEES) {
    /* `x[i] = `, `x[i * 4 + 2] = `, `x.fill(`, `x.set(` : toutes les formes
       d'ecriture sur un tableau typé. La lecture, elle, n'a pas de signe
       d'affectation apres le crochet fermant. */
    const affectation = new RegExp(`\\b${cible}\\s*\\[[^\\]]*\\]\\s*(=[^=]|\\+=|-=|\\*=)`);
    const methode = new RegExp(`\\b${cible}\\.(fill|set|copyWithin)\\s*\\(`);
    if (!affectation.test(nu) && !methode.test(nu)) continue;

    /* LA CASE, PAS LE TABLEAU. `sphereState[i * 4]` et `sphereState[i * 4 + 1]`
       sont deux valeurs distinctes rangees cote a cote : les compter comme un
       conflit rendrait le controle bavard, et un controle bavard se fait
       ignorer. On distingue donc par l'EXPRESSION D'INDEX, normalisee. */
    const index = new RegExp(`\\b${cible}\\s*\\[([^\\]]*)\\]`).exec(nu)?.[1] ?? 'entier';
    const case_ = `${cible}[${index.replace(/\s+/g, '')}]`;

    const contexte = lignes.slice(Math.max(0, i - 14), i + 1).join('\n');
    ecritures.push({
      cible: case_,
      ligne: ligneDepart + i,
      texte: nu.length > 90 ? `${nu.slice(0, 88)}…` : nu,
      declaree: MARQUEUR.test(contexte)
    });
  }
});

/* Deux écritures VOISINES, dans le même bloc, sont une seule intention : le
   remplissage d'un tableau champ par champ n'est pas un conflit. On regroupe
   donc les écritures separees de moins de six lignes. */
const parCible = new Map<string, Ecriture[][]>();
for (const cible of [...new Set(ecritures.map((e) => e.cible))]) {
  const siennes = ecritures.filter((e) => e.cible === cible).sort((a, b) => a.ligne - b.ligne);
  const groupes: Ecriture[][] = [];
  for (const e of siennes) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && e.ligne - (dernier[dernier.length - 1]?.ligne ?? 0) <= 6) dernier.push(e);
    else groupes.push([e]);
  }
  if (groupes.length > 0) parCible.set(cible, groupes);
}

const conflits: string[] = [];

for (const [cible, groupes] of parCible) {
  if (groupes.length < 2) continue;
  const declares = groupes.filter((g) => g.some((e) => e.declaree)).length;
  /* Un seul écrivain non déclaré est le maître ; tous les autres doivent dire
     qu'ils passent après lui. */
  if (declares >= groupes.length - 1) continue;
  conflits.push(
    `${cible} : ${groupes.length} endroits distincts l'ecrivent, ${declares} declare(nt) leur ordre.\n` +
      groupes
        .map((g) => {
          const t = g[0];
          return `      ligne ${t?.ligne} ${t?.declaree ? '[ordre declare]' : '[ORDRE NON DECLARE]'} : ${t?.texte}`;
        })
        .join('\n')
  );
}

if (conflits.length > 0) {
  console.error(`\nECRITURES CONCURRENTES : ${conflits.length} valeur(s) ecrite(s) depuis plusieurs endroits.\n`);
  for (const c of conflits) console.error('  - ' + c + '\n');
  console.error(
    "  C'est le motif le plus frequent de ce projet : deux ecritures, la derniere gagne,\n" +
      "  et rien ne le signale parce que chaque ligne est correcte prise seule. Ce qui est\n" +
      "  faux est dans leur ORDRE.\n\n" +
      "  Pour chaque valeur ci-dessus : decider lequel doit gagner, et l'ECRIRE au-dessus du\n" +
      "  bloc qui passe en dernier, avec les mots « s'applique APRES ». Si aucun ne doit\n" +
      '  gagner, il y en a un de trop.\n'
  );
  process.exit(1);
}

console.log(
  `Ecritures : ${lignes.length} lignes de boucle, ${ecritures.length} ecriture(s) surveillee(s), ` +
    `aucune valeur ecrite depuis plusieurs endroits sans ordre declare.`
);
