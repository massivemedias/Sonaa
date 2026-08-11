/* Projection de l'arbre du corpus, pour la vérification serveur du jeu.

   POURQUOI CETTE TABLE EXISTE, alors que la règle du projet est que le
   corpus vit dans le dépôt et jamais en base. Parce qu'il y a un prix.
   Vérifier qu'une partie gagnée est cohérente, le parent détruit avant
   l'enfant, le bon nombre de fragments, aucun genre inventé, suppose que
   le SERVEUR connaisse l'arbre. Un serveur qui ne connaît pas l'arbre ne
   peut rien vérifier du tout, et l'anti-triche se réduit à croire le
   client sur parole.

   Ce n'est PAS une seconde source de vérité : c'est une projection en
   lecture seule, régénérée depuis corpus.json, jamais éditée à la main, et
   sans aucune donnée éditoriale : ni description, ni tracks, ni labels.
   Quatre colonnes : l'identifiant, sa famille, son parent, sa profondeur.

   Usage : npx tsx scripts/build-game-tree.ts        (écrit le SQL)
           npx tsx scripts/build-game-tree.ts --check (compare, échoue si écart) */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const CORPUS = `${RACINE}src/data/corpus.json`;
const SORTIE = `${RACINE}supabase/game-tree.sql`;

interface GenreBrut {
  id: string;
  family: string;
  parents?: { id: string; family: string }[];
}
interface FamilleBrute {
  id: string;
  label: string;
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  families: FamilleBrute[];
  genres: GenreBrut[];
};

/* LE PARENT DE JEU est le premier parent DE LA MÊME FAMILLE. Les greffes
   (parents d'une autre famille) sont ignorées ici : un astéroïde appartient
   à un seul arbre, sinon un genre serait libéré deux fois et le compte de
   218 destructions ne tomberait jamais juste. */
const parentDeJeu = (g: GenreBrut): string | null =>
  g.parents?.find((p) => p.family === g.family)?.id ?? null;

const parId = new Map(corpus.genres.map((g) => [g.id, g]));

const profondeur = (g: GenreBrut): number => {
  let n = 0;
  let courant: GenreBrut | undefined = g;
  const vus = new Set<string>([g.id]);
  while (courant) {
    const p = parentDeJeu(courant);
    if (!p || vus.has(p)) break;
    vus.add(p);
    courant = parId.get(p);
    if (courant) n += 1;
  }
  return n;
};

/* Contrôles de forme AVANT d'écrire quoi que ce soit : une projection
   fausse produirait des victoires légitimes refusées. */
const problemes: string[] = [];
for (const g of corpus.genres) {
  const p = parentDeJeu(g);
  if (p && !parId.has(p)) problemes.push(`${g.id} : parent « ${p} » introuvable`);
  if (p && parId.get(p)?.family !== g.family) problemes.push(`${g.id} : parent hors famille`);
  if (!corpus.families.some((f) => f.id === g.family)) problemes.push(`${g.id} : famille inconnue`);
}
if (problemes.length > 0) {
  console.error('Projection impossible :\n  ' + problemes.join('\n  '));
  process.exit(1);
}

const lignes = corpus.genres
  .map((g) => ({
    id: g.id,
    famille: g.family,
    parent: parentDeJeu(g),
    profondeur: profondeur(g)
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

const echappe = (v: string | null): string => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);

const sql =
  `-- GÉNÉRÉ PAR scripts/build-game-tree.ts, NE PAS ÉDITER À LA MAIN.\n` +
  `-- Projection de l'arbre du corpus pour la vérification serveur du jeu.\n` +
  `-- ${lignes.length} genres, ${corpus.families.length} familles.\n\n` +
  `delete from public.game_genres;\n` +
  `insert into public.game_genres (id, famille, parent, profondeur) values\n` +
  lignes
    .map((l) => `  (${echappe(l.id)}, ${echappe(l.famille)}, ${echappe(l.parent)}, ${l.profondeur})`)
    .join(',\n') +
  ';\n\n' +
  `delete from public.game_familles;\n` +
  `insert into public.game_familles (id, label) values\n` +
  corpus.families
    .map((f) => `  (${echappe(f.id)}, ${echappe(f.label)})`)
    .join(',\n') +
  ';\n';

if (process.argv.includes('--check')) {
  let existant = '';
  try {
    existant = readFileSync(SORTIE, 'utf8');
  } catch {
    console.error(
      `${SORTIE} est absent. Lancer : npm run build:game-tree`
    );
    process.exit(1);
  }
  if (existant !== sql) {
    console.error(
      'La projection de l\'arbre du jeu ne correspond plus au corpus.\n' +
        'Régénérer : npx tsx scripts/build-game-tree.ts, puis appliquer le SQL.'
    );
    process.exit(1);
  }
  console.log(`Projection du jeu : à jour, ${lignes.length} genres.`);
} else {
  writeFileSync(SORTIE, sql);
  const parProfondeur = lignes.reduce<Record<number, number>>((acc, l) => {
    acc[l.profondeur] = (acc[l.profondeur] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`${SORTIE} écrit : ${lignes.length} genres, ${corpus.families.length} familles.`);
  console.log('Répartition par profondeur :', parProfondeur);
}
