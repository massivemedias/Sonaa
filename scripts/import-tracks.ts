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

import { normalise, resolveTrack, sleep, tauxEchecReseau, reseau, type Resolution,
  estGenreReserve
} from './lib/match.ts';
import { transaction, type AnyCorpus } from './lib/corpus-store.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
/* --file= permet une source alternative, par exemple un canon des fondateurs
   propose par la machine et distinct du fichier de Mika. */
const fileArg = process.argv.find((a) => a.startsWith('--file='));
const NOM_SOURCE = fileArg ? fileArg.slice('--file='.length) : 'tracks-canon.md';
const CANON = fileURLToPath(new URL(`../${NOM_SOURCE}`, import.meta.url));

/* UN FICHIER PASSE EN POSITIONNEL EST UNE ERREUR, PAS UN DEFAUT.
   `import:tracks -- tracks-lot7.md` a deja tourne sans rien dire : l'argument
   etant ignore, le script a relu tracks-canon.md et rendu un rapport
   parfaitement normal, "102 deja presents, tous les genres atteignent la
   cible". Le lot demande n'avait pas ete lu du tout. Un argument qu'on ne
   comprend pas doit arreter le travail, jamais le laisser continuer sur une
   autre source. */
const positionnel = process.argv.slice(2).find((a) => !a.startsWith('--') && a.endsWith('.md'));
if (positionnel) {
  console.error(
    `Fichier passe en positionnel : « ${positionnel} ».\n` +
      `Ce script attend --file=${positionnel}, et sans cela il lirait ` +
      `tracks-canon.md en silence. Arret.`
  );
  process.exit(1);
}
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
  /** Le ROLE dans le genre, jamais une date. Absent sur la plupart. */
  role?: 'origine' | 'canon';
  album?: string;
  cover?: { url: string; source: 'deezer' | 'itunes' | 'youtube'; local: string };
  shared?: string[];
}
interface Genre {
  id: string;
  label: string;
  aliases?: string[];
  tracks: Track[];
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
      /* PAS normalise() ici : c'est la moulinette de matching musical, qui
         translittère les umlauts (ue devient u) et transformait « actuel »
         en « actul », le rôle ne valait alors JAMAIS 'actuel' et tout
         partait dans l'onglet Essentiel. Un mot-clé se compare en clair. */
      role: at('role', 'rôle').trim().toLowerCase(),
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
/* Le nom AFFICHE doit etre le nom LU. Il etait ecrit en dur, si bien qu'un
   import sur une autre source annoncait quand meme tracks-canon.md. */
console.log(`${rows.length} lignes lues dans ${NOM_SOURCE}`);
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
/* Journal des écritures, rejoué sur le corpus FRAIS à la fin : le script
   tourne longtemps, et écrire son instantané de départ écraserait ce qu'une
   autre passe a posé entre-temps (c'est arrivé deux fois). */
const additions: { genreId: string; track: Track }[] = [];
const linkIds = new Set<string>();
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
    genre.tracks.map((t) => key(t.artist, t.title))
  );
  if (present.has(key(row.artist, row.title))) {
    skippedExisting += 1;
    continue;
  }

  /* GENRE RESERVE : on ne cherche pas. Le psy attend une selection humaine,
     et la chercher automatiquement produit des erreurs, pas des trous. */
  if (estGenreReserve(row.genreId)) {
    failures.push({
      row,
      reason: `genre reserve a une selection humaine, aucune recherche lancee`,
      rejected: []
    });
    console.log(`  reserve  ${row.genreId.padEnd(18)} ${row.artist} - ${row.title}`);
    continue;
  }

  const { hit, rejected, ambigu } = await resolveTrack(row.artist, row.title);

  /* NOM D'ARTISTE TROP COURANT. Ce n'est pas un refus, c'est un renvoi vers
     une verification humaine : « Final », « Tandem » ou « Ocelot » cherches
     seuls ramenent du golf, un velo et un documentaire animalier, avec un
     score de couverture parfait. Seize entrees ont ete retirees du corpus
     pour ce motif. Le distinguer du refus ordinaire evite de croire que la
     proposition etait mauvaise : elle n'a simplement pas ete cherchee. */
  if (ambigu) {
    failures.push({
      row,
      reason:
        `nom d'artiste trop courant, recherche automatique desactivee : ` +
        `verifier « ${row.artist} , ${row.title} » a la main et fournir l'identifiant`,
      rejected: []
    });
    console.log(`  a la main ${row.genreId.padEnd(17)} ${row.artist} - ${row.title}`);
    continue;
  }
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
    g.tracks.some((t) => t.youtubeId === hit.videoId)
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

  // Réciprocité : chaque côté déclare tous les autres. La liaison réelle se
  // recalcule au moment de l'écriture, sur l'état frais du disque.
  if (holders.length > 0) {
    track.shared = holders.map((h) => h.id);
    for (const holder of holders) {
      for (const t of holder.tracks) {
        if (t.youtubeId !== hit.videoId) continue;
        const set = new Set([...(t.shared ?? []), genre.id, ...holders.map((h) => h.id)]);
        set.delete(holder.id);
        t.shared = [...set].sort();
      }
    }
    linkIds.add(hit.videoId);
    console.log(`  charnière avec ${holders.map((h) => h.id).join(', ')}`);
  }

  /* LA COLONNE `role` DU FICHIER DESIGNAIT UNE LISTE, elle designe desormais
     un ATTRIBUT. Le vocabulaire des fichiers deja ecrits est conserve pour
     qu'ils restent importables : `essentiel` pose le role `canon`, `actuel`
     n'en pose aucun. Les deux nouveaux mots sont acceptes tels quels.

     `origine` n'est PAS refuse ici, mais il ne franchira la validation que
     s'il est seul dans son genre : c'est la regle du schema, et elle vaut
     aussi pour ce qu'un import apporte. */
  const role =
    row.role === 'origine' ? 'origine'
    : row.role === 'canon' || row.role === 'essentiel' ? 'canon'
    : undefined;
  if (role) track.role = role;
  genre.tracks.push(track);
  additions.push({ genreId: genre.id, track });
  added += 1;
  console.log(
    `  ok     ${row.genreId.padEnd(20)} ${row.artist} - ${row.title}  ` +
      `[${hit.videoId}] titre ${hit.verdict.titleScore.toFixed(2)} artiste ${hit.verdict.artistScore.toFixed(2)}`
  );
}

// --------------------------------------------------------------------- sortie

if (!DRY && added > 0) {
  /* Rejoué sur le disque FRAIS : les préconditions (doublon même genre)
     sont revérifiées, et la réciprocité des charnières est recalculée sur
     l'état réel au moment de l'écriture. */
  transaction((fresh: AnyCorpus) => {
    for (const op of additions) {
      const g = fresh.genres.find((x) => x.id === op.genreId);
      if (!g) continue;
      const already = g.tracks.some(
        (t) => key(String(t['artist'] ?? ''), String(t['title'] ?? '')) === key(op.track.artist, op.track.title)
      );
      if (already) continue;
      g.tracks.push(op.track as unknown as (typeof g.tracks)[number]);
    }
    for (const videoId of linkIds) {
      const holding = fresh.genres.filter((g) =>
        g.tracks.some((t) => t.youtubeId === videoId)
      );
      for (const holder of holding) {
        for (const t of holder.tracks) {
          if (t.youtubeId !== videoId) continue;
          const others = holding.map((h) => h.id).filter((id) => id !== holder.id).sort();
          if (others.length > 0) t['shared'] = others;
          else delete t['shared'];
        }
      }
    }
  });
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

/* « NON RÉSOLU » NE DOIT PAS COUVRIR « RÉSEAU EN PANNE ».

   Une recherche qui ne rend rien et une recherche qu'on nous a refusée
   produisaient le même « non résolu ». Un blocage complet de YouTube
   ressemblait donc à un fichier de candidats douteux, et le rapport final
   restait rassurant. On regarde maintenant le compteur, et on refuse de
   conclure au-delà d'un quart de requêtes perdues. */
const tauxEchec = tauxEchecReseau();
if (reseau.requetes > 0 && tauxEchec > 0.25) {
  console.error(
    `\nRÉSEAU : ${reseau.echecs} requêtes perdues sur ${reseau.requetes} ` +
      `(${Math.round(tauxEchec * 100)} %). Les « non résolus » ci-dessus ne veulent ` +
      `rien dire : ils peuvent être des refus de YouTube et non des candidats ` +
      `douteux. Relancer plus tard avant de conclure quoi que ce soit sur ce lot.`
  );
  process.exit(1);
}

/* Un fichier partiel est la norme. On rappelle donc ce qui manque encore, pour
   que la prochaine passe sache quoi viser sans relire tout le corpus. */
const CIBLE = 3;
const count = (g: Genre): number => g.tracks.length;
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
/* Le nom AFFICHE vient de la constante REELLE. Ecrire « tracks-canon-report.md »
   en dur marcherait aujourd'hui et mentirait le jour ou REPORT changerait. */
console.log(`Rapport écrit dans ${REPORT.split('/').pop()}`);
