/* PASSE SUR LES 219 LISTES : nos morceaux sont-ils les bons ?

   LA QUESTION EST REELLE ET LE CORPUS NE SAIT PAS Y REPONDRE SEUL. Il dit
   qu'un morceau est une reference, il ne dit pas lequel est LE plus ecoute de
   son genre. Mesure : 1216 morceaux portent le role `canon` contre un seul
   `origine`, donc le role ne classe rien a l'interieur d'un genre.

   ON VA DONC CHERCHER LE CLASSEMENT DEHORS. Last.fm expose, pour une
   etiquette donnee, les morceaux les plus ecoutes qui la portent. Ce n'est ni
   une verite ni un jugement esthetique : c'est ce que des millions de gens
   ont ecoute en l'appelant ainsi.

   CE CLASSEMENT EST BRUYANT, ET LE SCRIPT NE LE CACHE PAS. Les etiquettes
   sont posees par les auditeurs : Charli xcx ressort en acid house, Bjork en
   gabber, parce que leurs auditeurs etiquettent tout. Le script ne filtre
   donc pas sur un jugement, il RANGE : ce qu'on a deja, ce qui manque, et il
   laisse Mika trancher. Un filtre automatique sur ce genre de bruit finirait
   par ecarter un vrai morceau sans que personne ne le voie.

   IL N'ECRIT RIEN DANS LE CORPUS. Il produit un rapport a lire.

   Usage :
     npx tsx scripts/audit-tracks.ts               tous les genres
     npx tsx scripts/audit-tracks.ts --only=acid   ceux dont le nom contient
     npx tsx scripts/audit-tracks.ts --limite=30   s'arreter apres n genres
*/

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const RAPPORT = fileURLToPath(new URL('../audit-tracks.md', import.meta.url));
const CACHE = fileURLToPath(new URL('../.audit-tracks-cache.json', import.meta.url));

const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const limiteArg = process.argv.find((a) => a.startsWith('--limite='))?.slice('--limite='.length);
const LIMITE = limiteArg ? Number(limiteArg) : Infinity;

const CLE = (() => {
  const env = fileURLToPath(new URL('../.env', import.meta.url));
  if (!existsSync(env)) return '';
  const m = readFileSync(env, 'utf8').match(/^LASTFM_API_KEY=(.+)$/m);
  return m?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
})();

if (!CLE) {
  console.error("Pas de LASTFM_API_KEY dans .env. Rien n'a ete fait.");
  process.exit(1);
}

/* LA COMPARAISON DE DEUX TITRES EST LE COEUR DU CONTROLE, et c'est la qu'un
   audit se trompe le plus facilement. « Strings of Life » et « Strings Of
   Life » sont le meme morceau ; « Rhythim Is Rhythim » et « Derrick May »
   sont le meme auteur sous deux noms. On normalise donc durement, et on
   compare le TITRE seul en second recours, parce que le nom d'artiste est la
   partie la moins fiable des deux. */
const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(original|radio|extended|club|instrumental|remaster(ed)?|mix|edit|version|vip)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

interface Track {
  artist: string;
  title: string;
  role?: string | null;
}
interface Genre {
  id: string;
  label: string;
  family: string;
  aliases?: string[];
  tracks: Track[];
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  families: { id: string; label: string }[];
  genres: Genre[];
};

const cache: Record<string, { artist: string; name: string }[]> = existsSync(CACHE)
  ? (JSON.parse(readFileSync(CACHE, 'utf8')) as Record<string, { artist: string; name: string }[]>)
  : {};

async function classement(etiquette: string): Promise<{ artist: string; name: string }[]> {
  if (cache[etiquette]) return cache[etiquette];
  const url =
    'https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks' +
    `&tag=${encodeURIComponent(etiquette)}&api_key=${CLE}&format=json&limit=50`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = (await r.json()) as { tracks?: { track?: { name?: string; artist?: { name?: string } }[] } };
  const liste = (d.tracks?.track ?? [])
    .map((t) => ({ artist: t.artist?.name ?? '', name: t.name ?? '' }))
    .filter((t) => t.artist && t.name);
  cache[etiquette] = liste;
  return liste;
}

const familles = new Map(corpus.families.map((f) => [f.id, f.label]));

interface Bilan {
  readonly genre: Genre;
  readonly top: { artist: string; name: string }[];
  readonly artistesCommuns: number;
  readonly titresCommuns: number;
  readonly absents: { artist: string; name: string; rang: number }[];
}

const bilans: Bilan[] = [];
let traites = 0;
let sansClassement = 0;

const cibles = corpus.genres.filter(
  (g) => !only || g.label.toLowerCase().includes(only.toLowerCase()) || g.id.includes(only.toLowerCase())
);

for (const g of cibles) {
  if (traites >= LIMITE) break;
  traites += 1;

  const top = await classement(g.label);
  if (!cache[g.label]) await new Promise((r) => setTimeout(r, 260));
  if (top.length === 0) {
    sansClassement += 1;
    continue;
  }

  const nosArtistes = new Set(g.tracks.map((t) => norm(t.artist)));
  for (const a of g.aliases ?? []) nosArtistes.add(norm(a));
  const nosTitres = new Set(g.tracks.map((t) => norm(t.title)));

  /* DEUX MESURES DIFFERENTES, ET C'EST TOUTE LA METHODE.

     Le TITRE commun dit qu'on a deja le morceau. L'ARTISTE commun dit que
     l'etiquette parle bien du meme sujet que nous.

     Sans la seconde, le rapport est inutilisable. Mesure faite : la mediane
     des titres communs est de 1 sur 50, et 93 genres sur 213 sont a zero. On
     pourrait en conclure que 93 listes sont mauvaises. Ce serait faux : les
     moins alignes sont Hypnotic Techno, Zenonesque, Twilight Psy, c'est-a-
     dire les genres les plus pointus, dont l'etiquette est peu utilisee et
     donc peu fiable ; les mieux alignes sont Italo Disco, Acid House,
     Chicago House, c'est-a-dire les plus connus. Le score brut mesure la
     NOTORIETE DU GENRE, pas la qualite de la liste.

     Le croisement, lui, mesure ce qu'on cherche : beaucoup d'artistes communs
     et peu de titres communs, c'est une liste qui a les bons auteurs sans
     avoir leurs morceaux les plus ecoutes. C'est la seule situation ou une
     proposition vaut la peine d'etre lue. */
  const artistesCommuns = new Set(
    top
      .map((x) => norm(x.artist))
      .filter((a) => a && [...nosArtistes].some((n) => n && (n === a || n.includes(a) || a.includes(n))))
  ).size;
  const titresCommuns = top.filter((x) => nosTitres.has(norm(x.name))).length;

  const absents = top
    .map((x, i) => ({ ...x, rang: i + 1 }))
    .filter((x) => !nosTitres.has(norm(x.name)))
    .slice(0, 10);

  bilans.push({ genre: g, top, artistesCommuns, titresCommuns, absents });
}

/* On range par ce qui merite d'etre lu en premier : l'etiquette est sur le
   sujet, et pourtant nos morceaux ne sont pas ceux qu'on ecoute. */
const score = (b: Bilan): number => b.artistesCommuns * 2 - b.titresCommuns;
const surSujet = bilans.filter((b) => b.artistesCommuns >= 3).sort((a, b) => score(b) - score(a));
const horsSujet = bilans.filter((b) => b.artistesCommuns === 0);
const entreDeux = bilans.filter((b) => b.artistesCommuns > 0 && b.artistesCommuns < 3);

const lignes: string[] = [
  '# Passe sur les listes de morceaux',
  '',
  "Comparaison entre les morceaux du corpus et les cinquante titres les plus",
  "ecoutes de l'etiquette correspondante chez Last.fm.",
  '',
  '## Comment lire ce fichier, et ce qu\'il ne dit pas',
  '',
  "Le classement dit ce que les gens ecoutent en appelant la musique ainsi. Il",
  'ne dit pas ce qui est bon, et il est bruyant : les etiquettes sont posees',
  'par les auditeurs, ce qui fait ressortir Charli xcx en acid house et Bjork',
  'en gabber.',
  '',
  "SURTOUT : le nombre de titres communs ne mesure PAS la qualite d'une liste.",
  'Sa mediane est de 1 sur 50, et les genres les plus alignes sont simplement',
  'les plus connus. On croise donc avec les ARTISTES communs, qui disent si',
  "l'etiquette parle bien du meme sujet que nous.",
  '',
  'Les genres sont ranges par ce croisement : beaucoup d\'artistes en commun et',
  "peu de titres, c'est une liste qui a les bons auteurs sans avoir leurs",
  'morceaux les plus ecoutes. C\'est la seule situation ou la proposition vaut',
  "d'etre lue.",
  '',
  "RIEN N'A ETE CHARGE.",
  '',
  '---',
  ''
];

lignes.push(`## Bilan`);
lignes.push('');
lignes.push(`- ${bilans.length} genres examines, ${sansClassement} sans classement chez Last.fm.`);
lignes.push(`- **${surSujet.length}** ou l'etiquette est clairement sur le sujet (3 artistes communs ou plus).`);
lignes.push(`- ${entreDeux.length} au signal faible, 1 ou 2 artistes communs.`);
lignes.push(`- ${horsSujet.length} ou aucun de nos artistes n'apparait : l'etiquette parle d'autre chose, ou le genre est trop pointu pour Last.fm. A ignorer.`);
lignes.push('');
lignes.push('---');
lignes.push('');

for (const b of surSujet) {
  lignes.push(
    `## ${b.genre.label}  (${familles.get(b.genre.family) ?? b.genre.family}, ${b.genre.tracks.length} morceaux)`
  );
  lignes.push('');
  lignes.push(
    `${b.artistesCommuns} artistes en commun, ${b.titresCommuns} titres deja presents sur ${b.top.length}.`
  );
  lignes.push('');
  lignes.push('| rang | artiste | titre |');
  lignes.push('|---|---|---|');
  for (const x of b.absents) lignes.push(`| ${x.rang} | ${x.artist} | ${x.name} |`);
  lignes.push('');
}

if (horsSujet.length > 0) {
  lignes.push('---');
  lignes.push('');
  lignes.push("## Etiquettes hors sujet, non detaillees");
  lignes.push('');
  lignes.push(horsSujet.map((b) => b.genre.label).join(', '));
  lignes.push('');
}

writeFileSync(CACHE, JSON.stringify(cache));
writeFileSync(RAPPORT, lignes.join('\n') + '\n');

console.log(`${bilans.length} genre(s) examine(s), ${sansClassement} sans classement.`);
console.log(`${surSujet.length} sur sujet, ${entreDeux.length} au signal faible, ${horsSujet.length} hors sujet.`);
console.log('Rapport : audit-tracks.md');
