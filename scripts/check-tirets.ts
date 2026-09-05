/* Aucun tiret cadratin ni demi-cadratin, nulle part.

   La règle est typographique et française : le tiret cadratin est un
   usage anglais, et il s'était glissé jusque dans l'interface, entre le nom
   d'artiste et le titre sur la liste des propositions. Elle vaut aussi pour
   les commentaires de code : une règle qui souffre une exception « ce n'est
   pas affiché » se retrouve dans l'affichage au premier copier-coller.

   Ce qui remplace quoi :
     séparateur entre deux valeurs  ->  point médian entouré d'espaces
     incise dans une phrase         ->  virgule
     plage de nombres, années, BPM  ->  trait d'union simple

   AUCUNE EXCEPTION N'EST DÉCLARÉE À CE JOUR. Le corpus a été vérifié : ni
   les 1236 titres de tracks ni les noms d'artistes n'en contiennent. Si un
   titre légitime en portait un un jour, il s'ajouterait ci-dessous avec sa
   justification, et nulle part ailleurs. */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

/* TROIS ZONES NE SUFFISAIENT PAS, ET LE JEU L'A PROUVE.

   Le controle ne regardait que `src`, `scripts` et `index.html`. Le jeu vit
   dans `public/game/`, avec son propre index, ses propres scripts et son
   propre texte : il etait donc hors de portee, et son sous-titre annoncait
   « de la chambre au major (cadratin) un simulateur de label » sur le
   premier ecran que voit un joueur. Mika l'a vu la ou le controle ne
   regardait pas.

   « TOTALEMENT », a-t-il dit. On prend donc le depot entier, moins ce qui ne
   nous appartient pas : les dependances, la construction, les rapports
   engendres par les scripts d'audit, et `_prof`, une documentation importee
   telle quelle dont la typographie n'est pas la notre. Tout le reste est de
   notre main et doit s'y plier, y compris les fichiers de configuration et
   les messages des workflows. */
const ZONES = ['.'];
const EXTENSIONS = /\.(ts|tsx|js|mjs|css|html|json|md|yml|sh|webmanifest)$/;
/* L'EXCLUSION SE FAIT PAR SEGMENT, PAS PAR EXPRESSION SUR LE CHEMIN. Un
   premier jet ecrivait `[/\\]_prof`, ce qui ne rattrapait pas `_prof` a la
   racine, faute de barre devant : cinq mille signalements dans une
   documentation importee. Comparer les segments un a un ne se trompe pas de
   place. */
const DOSSIERS_HORS = new Set([
  'node_modules', 'dist', '.git', '.github_cache',
  /* Documentation importee telle quelle : sa typographie n'est pas la notre. */
  '_prof',
  /* BIBLIOTHEQUES TIERCES. Three.js et ses chargeurs portent des cadratins
     dans leurs propres commentaires. Les corriger reviendrait a modifier le
     source d'une bibliotheque pour une regle de typographie francaise, et a
     refaire la correction a chaque mise a jour. Ce dossier n'est pas de
     notre main. */
  'vendor',
  /* Images et polices : rien a lire dedans. */
  'covers', 'images', 'machines', 'articles', 'fonts', 'splash', 'assets', 'brand',
]);
/* Les rapports engendres par les scripts d'audit se refont a chaque passe :
   ils portent la typographie de leur generateur, qui, lui, est controle. */
const FICHIERS_HORS = (nom: string): boolean =>
  /^audit-.*\.md$/.test(nom) || /cache/.test(nom) || nom === 'package-lock.json';

/** Titres et noms d'artistes où le tiret est dans l'œuvre elle-même. Vide,
    et destiné à le rester : à ne remplir qu'avec une référence précise. */
const EXCEPTIONS: readonly string[] = [];

/* Les deux caracteres sont ecrits en sequences d echappement A DESSEIN :
   ce fichier serait sinon le seul du depot a en contenir, et se signalerait
   lui-meme. Une exception aurait fonctionne, mais un controle qui commence
   par s exempter est un controle qu on finit par ne plus croire.
   \u2014 = cadratin, \u2013 = demi-cadratin. */
const TIRETS = /[\u2014\u2013]/g;

function fichiers(chemin: string): string[] {
  const complet = join(RACINE, chemin);
  let info;
  try {
    info = statSync(complet);
  } catch {
    return [];
  }
  if (!info.isDirectory()) return EXTENSIONS.test(chemin) ? [chemin] : [];
  return readdirSync(complet).flatMap((e) => {
    if (DOSSIERS_HORS.has(e) || FICHIERS_HORS(e)) return [];
    return fichiers(join(chemin, e));
  });
}

const trouves: { fichier: string; ligne: number; extrait: string }[] = [];

for (const f of ZONES.flatMap(fichiers)) {
  if (EXCEPTIONS.includes(f)) continue;
  const lignes = readFileSync(join(RACINE, f), 'utf8').split('\n');
  lignes.forEach((texte, i) => {
    if (!TIRETS.test(texte)) return;
    TIRETS.lastIndex = 0;
    const col = texte.search(TIRETS);
    trouves.push({
      fichier: f,
      ligne: i + 1,
      extrait: texte.slice(Math.max(0, col - 35), col + 35).trim(),
    });
  });
}

if (trouves.length > 0) {
  console.error(
    `Tirets cadratins ou demi-cadratins : ${trouves.length} occurrence(s).\n` +
      "Remplacer par un point médian (séparateur), une virgule (incise) ou un trait d'union (plage).\n"
  );
  for (const t of trouves) console.error(`  ${t.fichier}:${t.ligne}  ${t.extrait}`);
  process.exit(1);
}

console.log(
  `Tirets : aucun cadratin ni demi-cadratin dans ${ZONES.join(', ')}` +
    (EXCEPTIONS.length > 0 ? `, ${EXCEPTIONS.length} exception(s) déclarée(s).` : '.')
);
