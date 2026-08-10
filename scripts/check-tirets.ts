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

const ZONES = ['src', 'scripts', 'index.html'];
const EXTENSIONS = /\.(ts|tsx|css|html|json)$/;
const IGNORES = /node_modules|[/\\]dist[/\\]|\.git/;

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
    const sous = join(chemin, e);
    return IGNORES.test(sous) ? [] : fichiers(sous);
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
