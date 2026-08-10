/* Réparation ponctuelle : ranger dans l'onglet Actuel les morceaux importés
   avec le rôle `actuel` mais tombés dans Essentiel.

   Cause : import-tracks passait le rôle par normalise(), la moulinette de
   matching musical qui translittère « ue » en « u », « actuel » devenait
   « actul » et la comparaison ne passait jamais. Le parseur est corrigé ;
   ce script déplace ce qui a déjà été écrit au mauvais endroit.

   La liste des morceaux à déplacer vient du fichier canon lui-même : toute
   ligne au rôle actuel dont le couple artiste/titre est trouvé dans
   tracks.essentiel du bon genre est déplacée vers tracks.actuel. Aucun
   identifiant n'est touché, aucune donnée n'est perdue : c'est un
   déplacement entre deux listes du même genre, via corpus-store.

   Usage : npx tsx scripts/fix-actuel-lists.ts tracks-canon-3.md */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { transaction } from './lib/corpus-store.ts';
import { normalise } from './lib/match.ts';

const file = process.argv[2];
if (!file) {
  console.error('Usage : npx tsx scripts/fix-actuel-lists.ts <fichier-canon.md>');
  process.exit(1);
}

const key = (artist: string, title: string): string =>
  `${normalise(artist)}|${normalise(title)}`;

/* Lignes TSV au rôle actuel : genre \t artiste \t titre \t année \t rôle. */
const wanted = new Map<string, Set<string>>();
const text = readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
for (const line of text.split('\n')) {
  const parts = line.split('\t').map((p) => p.trim());
  if (parts.length < 5) continue;
  if (parts[4]?.toLowerCase() !== 'actuel') continue;
  const gid = parts[0] ?? '';
  if (!wanted.has(gid)) wanted.set(gid, new Set());
  wanted.get(gid)?.add(key(parts[1] ?? '', parts[2] ?? ''));
}

let moved = 0;
transaction((corpus) => {
  const genres = (corpus as { genres: { id: string; tracks?: { essentiel: unknown[]; actuel: unknown[] } }[] }).genres;
  for (const g of genres) {
    const set = wanted.get(g.id);
    if (!set || !g.tracks) continue;
    const keep: unknown[] = [];
    for (const t of g.tracks.essentiel) {
      const tr = t as { artist: string; title: string };
      if (set.has(key(tr.artist, tr.title))) {
        g.tracks.actuel.push(t);
        moved += 1;
      } else {
        keep.push(t);
      }
    }
    g.tracks.essentiel = keep;
  }
});

console.log(`${moved} morceau(x) déplacé(s) vers l'onglet Actuel.`);
