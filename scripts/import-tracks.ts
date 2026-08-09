/* Injection d'un corpus de morceaux sourcé à la main.

   Le corpus automatique plafonne sur les scènes de niche : suomisaundi, cosmic
   disco, indie dance, dark disco, nitzhonot, techno body music. Sur ces genres,
   la recherche YouTube ne trouve pas parce que les morceaux n'y sont pas sous ce
   nom, pas parce que le matcher est trop strict. La réponse est humaine : une
   liste écrite et sourcée, que ce script se contente de vérifier.

   Ce script NE FAIT JAMAIS CONFIANCE au fichier d'entrée sur les identifiants.
   Il lit des noms, cherche lui-même, et n'écrit que ce qui passe le matcher
   partagé de scripts/lib/match.ts. Un identifiant présent dans le fichier
   d'entrée serait quand même revérifié. Aucun identifiant inventé, jamais.

   Format attendu de tracks-canon.md, à la racine. DEUX formes acceptées, parce
   qu'un tableau collé depuis un tableur arrive séparé par des tabulations et
   avec le genre en colonne, pas en titre de section.

   Forme 1, une section par genre :

     ## `suomisaundi`

     | artiste        | titre         | annee | role       |
     |----------------|---------------|-------|------------|
     | Texas Faggott  | Konnichi Wa   | 1999  | fondateur  |

   Forme 2, un seul tableau avec une colonne genre, séparé par des tabulations
   ou par des barres verticales :

     Genre	Artiste	Titre	Année	Rôle
     suomisaundi	Texas Faggott	Konnichi Wa	1999	origine

   Les colonnes sont repérées par leur en-tête, l'ordre est libre, la casse et
   les accents indifférents.

   Le nom de genre est résolu contre l'identifiant, puis contre le nom affiché,
   puis contre les alias, en ignorant espaces et ponctuation. « deephouse »
   trouve donc `usdeephouse` par son nom « Deep House », et « psytrance » trouve
   `psychedelictrance` par son alias.

   `role` est facultatif et documentaire : il dit pourquoi le morceau est là.
   Les valeurs reconnues sont `fondateur`, `essentiel` et `actuel`. Seul
   `actuel` change quelque chose, il range le morceau dans l'onglet Actuel.

   Fusion : un morceau déjà présent dans le corpus, identifié par son couple
   artiste et titre normalisé, n'est jamais réécrit. On ajoute, on ne remplace
   pas. Le corpus vérifié fait foi.

   FICHIER PARTIEL, c'est le cas normal. On ne remplira jamais 68 genres d'un
   coup : le fichier ne contient que les genres qu'on traite ce jour-là. Un
   genre absent du fichier n'est pas touché, et le script termine en rappelant
   lesquels restent sous la cible de trois morceaux.

   Usage :
     npm run import:tracks                    vérifie et écrit
     npm run import:tracks -- --dry-run       vérifie sans rien écrire
     npm run import:tracks -- --only=suomisaundi,darkdisco

   Sortie : un rapport `tracks-canon-report.md` qui liste les lignes non
   résolues avec ce que YouTube a proposé et pourquoi ça a été refusé, pour
   qu'une correction à la main soit possible sans deviner. */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { normalise, resolveTrack, sleep, type Resolution } from './lib/match.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
/* --file= permet une source alternative, par exemple un canon des fondateurs
   propose par la machine et distinct du fichier de Mika. */
const fileArg = process.argv.find((a) => a.startsWith('--file='));
const CANON = fileArg
  ? fileURLToPath(new URL(`../${fileArg.slice('--file='.length)}`, import.meta.url))
  : fileURLToPath(new URL('../tracks-canon.md', import.meta.url));
const REPORT = fileURLToPath(new URL('../tracks-canon-report.md', import.meta.url));

const DRY = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null;

// --------------------------------------------------------------------- types

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  year: number | null;
  verified: true;
  album?: string;
  cover?: { url: string; source: 'deezer' | 'itunes' | 'youtube'; local: string };
  shared?: string[];
}
interface Genre {
  id: string;
  label: string;
  aliases?: string[];
  tracks: { essentiel: Track[]; actuel: Track[] };
}
interface Corpus {
  version: number;
  families: unknown[];
  genres: Genre[];
}

interface CanonRow {
  genreId: string;
  artist: string;
  title: string;
  year: number | null;
  role: string;
  /** Partage déclaré : les autres genres qui revendiquent ce morceau. */
  sharedWith: string[];
  line: number;
}

// ------------------------------------------------------------------- lecture

/** Découpe une ligne de tableau markdown en cellules nettoyées. */
const cells = (line: string): string[] =>
  line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

const isSeparator = (line: string): boolean =>
  /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line) || /^[\s|:-]{4,}$/.test(line);

/** Découpe une ligne séparée par des tabulations. */
const tabCells = (line: string): string[] => line.split('\t').map((c) => c.trim());

/** Sans espaces ni ponctuation : « Deep House » et « deephouse » se rejoignent. */
const squash = (s: string): string => normalise(s).replace(/ /g, '');

const parseCanon = (text: string): { rows: CanonRow[]; problems: string[] } => {
  const rows: CanonRow[] = [];
  const problems: string[] = [];
  const lines = text.split('\n');

  let genreId = '';
  let header: string[] | null = null;

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const line = raw.trimEnd();

    // Titre de section : l'identifiant du genre entre accents graves.
    const section = /^#{1,6}\s+.*`([a-z0-9]+)`/.exec(line);
    if (section?.[1]) {
      genreId = section[1];
      header = null;
      return;
    }

    const isPipe = line.trim().startsWith('|');
    const isTabbed = line.includes('\t');
    if (!isPipe && !isTabbed) {
      if (line.trim() === '') header = null;
      return;
    }
    if (isSeparator(line)) return;

    const parts = isPipe ? cells(line) : tabCells(line);
    if (!header) {
      header = parts.map((h) => normalise(h));
      return;
    }

    const at = (...names: string[]): string => {
      for (const name of names) {
        const idx = header?.indexOf(name) ?? -1;
        if (idx >= 0) return parts[idx] ?? '';
      }
      return '';
    };

    // Colonne genre, s'il y en a une : elle l'emporte sur le titre de section.
    const inline = at('genre', 'famille');
    const which = inline || genreId;
    if (!which) {
      problems.push(`ligne ${lineNo} : ni colonne genre ni identifiant de section`);
      return;
    }

    const artist = at('artiste', 'artist');
    const title = at('titre', 'title');
    if (!artist || !title) {
      problems.push(`ligne ${lineNo} : artiste ou titre manquant`);
      return;
    }

    const yearRaw = at('annee', 'année', 'year');
    const yearNum = Number.parseInt(yearRaw, 10);

    rows.push({
      genreId: which,
      artist,
      title,
      year: Number.isFinite(yearNum) && yearNum >= 1960 && yearNum <= 2100 ? yearNum : null,
      role: normalise(at('role', 'rôle')),
      // Colonne facultative : les autres genres qui revendiquent le morceau,
      // séparés par des espaces. Le partage se déclare, il ne se déduit pas.
      sharedWith: at('partage', 'shared').split(/[\s,]+/).filter(Boolean),
      line: lineNo
    });
  });

  return { rows, problems };
};

// --------------------------------------------------------------------- corpus

if (!existsSync(CANON)) {
  console.error(
    `Aucun fichier ${CANON}.\n` +
      "Écrire un tableau markdown par genre, en-têtes artiste, titre, annee, role,\n" +
      "chaque section précédée d'un titre portant l'identifiant du genre entre accents graves."
  );
  process.exit(1);
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;

/* Résolution d'un nom de genre. On accepte l'identifiant, le nom affiché ou un
   alias, en ignorant espaces et ponctuation : un fichier écrit à la main dit
   « deephouse » ou « Deep House », pas `usdeephouse`. */
const byId = new Map(corpus.genres.map((g) => [g.id, g]));
const resolveGenre = (name: string): Genre | undefined => {
  const direct = byId.get(name);
  if (direct) return direct;
  const key = squash(name);
  for (const g of corpus.genres) {
    if (squash(g.id) === key || squash(g.label) === key) return g;
  }
  for (const g of corpus.genres) {
    if ((g.aliases ?? []).some((a) => squash(a) === key)) return g;
  }
  return undefined;
};

const { rows, problems } = parseCanon(readFileSync(CANON, 'utf8'));
console.log(`${rows.length} lignes lues dans tracks-canon.md`);
for (const p of problems) console.warn(`AVERTISSEMENT ${p}`);

/** Clé de doublon : le couple artiste et titre, normalisé. */
const key = (artist: string, title: string): string => `${normalise(artist)}|${normalise(title)}`;

interface Failure {
  row: CanonRow;
  reason: string;
  rejected: Resolution[];
}

const failures: Failure[] = [];
let added = 0;
let skippedExisting = 0;
let unknownGenre = 0;

for (const row of rows) {
  if (ONLY && !ONLY.has(row.genreId) && !ONLY.has(squash(row.genreId))) continue;

  const genre = resolveGenre(row.genreId);
  if (!genre) {
    unknownGenre += 1;
    failures.push({ row, reason: `genre inconnu dans le corpus : ${row.genreId}`, rejected: [] });
    continue;
  }

  // Les deux listes comptent pour le dédoublonnage : un morceau déjà vérifié
  // n'est pas rejoué, quel que soit l'onglet où il se trouve.
  const present = new Set(
    [...genre.tracks.essentiel, ...genre.tracks.actuel].map((t) => key(t.artist, t.title))
  );
  if (present.has(key(row.artist, row.title))) {
    skippedExisting += 1;
    continue;
  }

  const { hit, rejected } = await resolveTrack(row.artist, row.title);
  await sleep(200);

  if (!hit) {
    failures.push({
      row,
      reason: rejected.length === 0 ? 'aucun résultat YouTube' : 'aucun candidat ne passe le matcher',
      rejected
    });
    console.log(`  refus  ${row.genreId.padEnd(20)} ${row.artist} - ${row.title}`);
    continue;
  }

  /* Un identifiant déjà utilisé ailleurs n'est plus un refus sec : c'est un
     MORCEAU CHARNIÈRE si le partage est déclaré dans la colonne partage, des
     compilations ou des mixes pris pour un morceau sinon. Le partage se
     déclare, il ne se tolère pas en silence. */
  const holders = corpus.genres.filter((g) =>
    [...g.tracks.essentiel, ...g.tracks.actuel].some((t) => t.youtubeId === hit.videoId)
  );
  const declared = new Set(
    row.sharedWith.map((name) => resolveGenre(name)?.id).filter((x): x is string => Boolean(x))
  );
  const undeclared = holders.filter((h) => !declared.has(h.id));
  if (undeclared.length > 0) {
    failures.push({
      row,
      reason:
        `identifiant déjà utilisé par ${undeclared.map((h) => h.id).join(', ')} sans ` +
        `déclaration de partage. Ajouter une colonne partage si c'est un morceau charnière.`,
      rejected
    });
    console.log(`  doublon ${row.genreId.padEnd(19)} ${row.artist} - ${row.title}`);
    continue;
  }

  const track: Track = {
    youtubeId: hit.videoId,
    artist: row.artist,
    title: row.title,
    year: row.year,
    verified: true
  };

  // Réciprocité : chaque côté déclare tous les autres.
  if (holders.length > 0) {
    track.shared = holders.map((h) => h.id);
    for (const holder of holders) {
      for (const t of [...holder.tracks.essentiel, ...holder.tracks.actuel]) {
        if (t.youtubeId !== hit.videoId) continue;
        const set = new Set([...(t.shared ?? []), genre.id, ...holders.map((h) => h.id)]);
        set.delete(holder.id);
        t.shared = [...set].sort();
      }
    }
    console.log(`  charnière avec ${holders.map((h) => h.id).join(', ')}`);
  }

  const list = row.role === 'actuel' ? genre.tracks.actuel : genre.tracks.essentiel;
  list.push(track);
  added += 1;
  console.log(
    `  ok     ${row.genreId.padEnd(20)} ${row.artist} - ${row.title}  ` +
      `[${hit.videoId}] titre ${hit.verdict.titleScore.toFixed(2)} artiste ${hit.verdict.artistScore.toFixed(2)}`
  );
}

// --------------------------------------------------------------------- sortie

if (!DRY && added > 0) {
  writeFileSync(CORPUS, `${JSON.stringify(corpus, null, 1)}\n`, 'utf8');
  console.log(`\nCorpus écrit : ${added} morceaux ajoutés.`);
} else if (DRY) {
  console.log(`\nEssai à blanc : ${added} morceaux auraient été ajoutés, rien n'est écrit.`);
} else {
  console.log('\nAucun morceau ajouté, corpus inchangé.');
}

console.log(
  `${skippedExisting} déjà présents et laissés en place, ${failures.length} non résolus, ` +
    `${unknownGenre} sur un genre inconnu.`
);

/* Un fichier partiel est la norme. On rappelle donc ce qui manque encore, pour
   que la prochaine passe sache quoi viser sans relire tout le corpus. */
const CIBLE = 3;
const count = (g: Genre): number => g.tracks.essentiel.length + g.tracks.actuel.length;
const touched = new Set(rows.map((r) => resolveGenre(r.genreId)?.id).filter(Boolean));
const remaining = corpus.genres
  .filter((g) => count(g) < CIBLE)
  .sort((a, b) => count(a) - count(b));

if (remaining.length === 0) {
  console.log(`\nTous les genres atteignent la cible de ${CIBLE} morceaux.`);
} else {
  console.log(`\n${remaining.length} genre(s) encore sous la cible de ${CIBLE} :`);
  for (const g of remaining) {
    const mark = touched.has(g.id) ? ' (traité dans ce fichier, encore incomplet)' : '';
    console.log(`  ${g.id.padEnd(20)} ${count(g)}/${CIBLE}${mark}`);
  }
  const untouched = remaining.filter((g) => !touched.has(g.id));
  if (untouched.length > 0) {
    console.log(`\nAbsents du fichier : ${untouched.map((g) => g.id).join(', ')}`);
  }
}

const report: string[] = [
  '# Lignes non résolues de tracks-canon.md',
  '',
  `${failures.length} lignes sur ${rows.length}.`,
  '',
  "Pour chacune : ce que YouTube a proposé, et les deux scores du matcher. Un",
  'score de titre bas veut dire que la vidéo trouvée est un autre morceau ; un',
  "score d'artiste bas veut dire que c'est une reprise ou une autre version.",
  'Corriger l\'orthographe dans tracks-canon.md, ou retirer la ligne.',
  ''
];

for (const f of failures) {
  report.push(`## ${f.row.genreId} · ${f.row.artist} - ${f.row.title}`);
  report.push('');
  report.push(`- ligne ${f.row.line} de tracks-canon.md`);
  report.push(`- motif : ${f.reason}`);
  if (f.rejected.length > 0) {
    report.push('- candidats refusés :');
    for (const r of f.rejected) {
      report.push(
        `  - \`${r.videoId}\` « ${r.candidate.title} » sur ${r.candidate.channel} ` +
          `(titre ${r.verdict.titleScore.toFixed(2)}, artiste ${r.verdict.artistScore.toFixed(2)})`
      );
    }
  }
  report.push('');
}

if (failures.length === 0) report.push('Aucune. Toutes les lignes ont été résolues.');

writeFileSync(REPORT, `${report.join('\n')}\n`, 'utf8');
console.log(`Rapport écrit dans tracks-canon-report.md`);
