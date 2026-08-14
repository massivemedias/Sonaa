/* GARDE-FOU : UNE MÊME GRANDEUR ÉCRITE DANS DEUX FICHIERS.
 *
 * LE CONTRÔLE DES DOUBLONS CSS N'A PAS VU CELUI-LÀ, et c'était pourtant le
 * même motif. Il compare deux déclarations de la MÊME propriété dans la MÊME
 * règle. Ici la valeur vivait ailleurs : la hauteur de la feuille mobile était
 * écrite `42dvh` dans atlas.css, pour découper la carte, et `70dvh` dans
 * player-layer.css, pour dimensionner la feuille elle-même. Deux fichiers,
 * deux propriétés différentes, une seule grandeur réelle.
 *
 * Elles ont divergé, et personne ne pouvait le voir : chaque fichier était
 * cohérent avec lui-même. Le résultat était qu'un tiers de la carte vivait
 * derrière la feuille, ce qui a produit tous les défauts signalés sur la
 * capture d'un coup, sans qu'aucun d'eux ne ressemble à sa cause.
 *
 * LA RÈGLE QU'IL IMPOSE : une grandeur de mise en page exprimée en unités de
 * fenêtre (dvh, vh, dvw, vw) n'a pas le droit d'apparaître en clair dans plus
 * d'un fichier. Si deux fichiers ont besoin de la même hauteur, elle doit être
 * une propriété personnalisée nommée, lue par les deux. Une valeur nommée ne
 * peut pas diverger d'elle-même.
 *
 * POURQUOI CE PÉRIMÈTRE ET PAS « TOUT NOMBRE ». Un contrôle qui signale tous
 * les nombres se fait désactiver dans la semaine, et c'est exactement le
 * reproche déjà fait au contrôle du plafond. Les unités de fenêtre sont le bon
 * périmètre parce qu'elles ne servent QU'À découper l'écran : deux fichiers
 * qui découpent le même écran parlent forcément de la même chose.
 *
 * Il couvre aussi le versant TypeScript : une constante en majuscules définie
 * dans deux fichiers avec deux valeurs différentes.
 *
 * Usage : npm run check:constantes
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

const fichiers: string[] = [];
const parcourir = (dossier: string): void => {
  for (const nom of readdirSync(dossier)) {
    if (nom === 'node_modules' || nom === 'dist' || nom.startsWith('.')) continue;
    const chemin = `${dossier}/${nom}`;
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else if (/\.(css|ts|tsx)$/.test(nom)) fichiers.push(chemin);
  }
};
parcourir(`${RACINE}src`);

const court = (f: string): string => f.replace(RACINE, '');

/* --- Versant CSS : les découpes d'écran en clair --------------------------- */

/* Une valeur en unités de fenêtre est une découpe de l'écran. Zéro et cent
   sont exemptés : ils ne sont pas des réglages, ce sont les bords. */
const DECOUPE = /(?<![\w.-])(\d{1,3}(?:\.\d+)?)(dvh|vh|dvw|vw)\b/g;

const parGrandeur = new Map<string, Set<string>>();

for (const f of fichiers) {
  if (!f.endsWith('.css')) continue;
  const texte = readFileSync(f, 'utf8');
  /* On ne lit pas les commentaires : ils citent souvent les valeurs justement
     pour expliquer pourquoi elles ont changé. */
  const sansCommentaires = texte.replace(/\/\*[\s\S]*?\*\//g, '');
  /* Ni les définitions de propriétés personnalisées : c'est LA forme qu'on
     veut encourager, pas celle qu'on veut punir. */
  const sansDefinitions = sansCommentaires.replace(/--[\w-]+\s*:[^;]*;/g, '');

  for (const m of sansDefinitions.matchAll(DECOUPE)) {
    const valeur = Number(m[1]);
    const unite = m[2];
    if (valeur === 0 || valeur === 100) continue;
    /* LA CLE EST LA VALEUR, PAS L'UNITE. Premiere version : on groupait par
       unite, ce qui mettait `4vw` et `60vw` dans le meme sac et rendait un
       rapport illisible ou rien n'etait faux. Ce qui accuse, c'est la MEME
       valeur ecrite dans deux fichiers : elle y designe la meme decoupe, et
       c'est elle qui peut diverger. */
    const cle = `${m[1]}${unite}`;
    if (!parGrandeur.has(cle)) parGrandeur.set(cle, new Set());
    parGrandeur.get(cle)?.add(`${court(f)}  ${m[1]}${unite}`);
  }
}

interface Faute {
  quoi: string;
  ou: string[];
  pourquoi: string;
}

const fautes: Faute[] = [];

for (const [unite, occurrences] of parGrandeur) {
  const fichiersConcernes = new Set([...occurrences].map((o) => o.split('  ')[0]));
  if (fichiersConcernes.size < 2) continue;
  fautes.push({
    quoi: `la découpe ${unite} est écrite en clair dans ${fichiersConcernes.size} fichiers`,
    ou: [...occurrences].sort(),
    pourquoi:
      "Deux fichiers qui découpent le même écran parlent de la même grandeur.\n" +
      '  La nommer une fois en propriété personnalisée, et la lire des deux côtés.'
  });
}

/* --- Versant TypeScript : la même constante, deux valeurs ------------------ */

const constantes = new Map<string, Map<string, string>>();

for (const f of fichiers) {
  if (f.endsWith('.css')) continue;
  const texte = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of texte.matchAll(/^\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]{2,})\s*=\s*(-?\d+(?:\.\d+)?)\s*;/gm)) {
    const nom = m[1] as string;
    if (!constantes.has(nom)) constantes.set(nom, new Map());
    constantes.get(nom)?.set(court(f), m[2] as string);
  }
}

for (const [nom, parFichier] of constantes) {
  if (parFichier.size < 2) continue;
  const valeurs = new Set(parFichier.values());
  if (valeurs.size < 2) continue;
  fautes.push({
    quoi: `la constante ${nom} vaut ${[...valeurs].join(' ici et ')} là`,
    ou: [...parFichier].map(([f, v]) => `${f}  ${nom} = ${v}`),
    pourquoi: "Un même nom qui porte deux valeurs est un piège : chaque fichier a l'air juste."
  });
}

if (fautes.length > 0) {
  console.error(`\nGRANDEURS EN DOUBLE : ${fautes.length} cas.\n`);
  for (const faute of fautes) {
    console.error(`  ${faute.quoi}`);
    for (const ligne of faute.ou) console.error(`      ${ligne}`);
    console.error(`  ${faute.pourquoi}\n`);
  }
  console.error(
    "  Ce controle existe parce que la hauteur de la feuille mobile valait 42 d'un cote\n" +
      "  et 70 de l'autre. Chaque fichier etait coherent avec lui-meme, et un tiers de la\n" +
      "  carte vivait derriere la feuille. Aucun des defauts visibles ne ressemblait a sa\n" +
      '  cause.\n'
  );
  process.exit(1);
}

console.log('Grandeurs : aucune decoupe d ecran ni constante nommee ecrite deux fois.');
