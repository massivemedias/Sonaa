/* Données de la sortie ORIGINALE, relevées sur Discogs.

   Pour chaque track : label, numéro de catalogue, pays, année, format. La
   correspondance est EXIGEANTE, parce qu'une donnée fausse est pire
   qu'aucune :

   1. Recherche par artiste ET titre de track (paramètre track=), type
      release, triée par année croissante : la première sortie plausible est
      la sortie originale.
   2. L'artiste du résultat doit correspondre (même normalisation que le
      matcher YouTube, scripts/lib/match.ts).
   3. La sortie candidate est relue en détail et sa liste de titres doit
      CONTENIR la track, titre normalisé : une compilation du même artiste
      sans la track ne passe pas.

   Un échec à n'importe quelle étape laisse le champ absent. Le champ album
   (iTunes) est REMPLACÉ par ces données quand elles existent.

   PROPRIÉTÉ DE CHAMP : le script relit le corpus au moment d'écrire et ne
   touche qu'au champ release (et à la suppression d'album quand release le
   remplace). Un import ou une passe de pochettes qui tourne en parallèle
   n'est jamais écrasé.

   Jeton dans DISCOGS_TOKEN. S'il manque, le script le dit et s'arrête sans
   bloquer le reste : c'est un chantier qui se saute, pas qui casse.

   Usage : DISCOGS_TOKEN=... npx tsx scripts/fetch-release-data.ts [--limit=N] */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { normalise, sleep } from './lib/match.ts';
import { patchTracks } from './lib/corpus-store.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const TOKEN = process.env['DISCOGS_TOKEN'];
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : Infinity;

const UA = 'SONAA/1.0 +https://massivemedias.github.io/Sonaa/';

interface Release {
  label: string | null;
  catno: string | null;
  country: string | null;
  year: number | null;
  format: string | null;
}

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  album?: string;
  release?: Release;
}
interface Corpus {
  genres: { id: string; tracks: { essentiel: Track[]; actuel: Track[] } }[];
}

if (!TOKEN) {
  console.error(
    'DISCOGS_TOKEN absent : chantier Discogs SAUTÉ. Fournir un jeton personnel ' +
      '(discogs.com/settings/developers) puis relancer ce script, seul.'
  );
  process.exit(0);
}

/* 60 requêtes par minute avec jeton : on reste dessous, et on respecte les
   entêtes de ratelimit quand Discogs le demande. */
const discogs = async (url: string): Promise<unknown | null> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Authorization: `Discogs token=${TOKEN}` }
    });
    if (res.status === 429) {
      await sleep(12_000);
      continue;
    }
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  }
  return null;
};

const sameArtist = (a: string, b: string): boolean => {
  const na = normalise(a);
  const nb = normalise(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

/* Replis de correspondance, dans l'ordre : tel quel, puis titre sans le
   suffixe de mix entre parenthèses, puis artiste sans la créditation
   multiple (feat, and, vs). L'analyse des 112 échecs de la première passe
   montrait exactement ces deux classes. La correspondance en aval reste
   aussi exigeante : le repli élargit la RECHERCHE, pas l'acceptation. */
const variants = (artist: string, title: string): [string, string][] => {
  const out: [string, string][] = [[artist, title]];
  const bareTitle = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (bareTitle && bareTitle !== title) out.push([artist, bareTitle]);
  const bareArtist = artist.split(/\s+(?:feat\.?|featuring|and|&|vs\.?)\s+/i)[0]?.trim() ?? artist;
  if (bareArtist && bareArtist !== artist) {
    out.push([bareArtist, title]);
    if (bareTitle && bareTitle !== title) out.push([bareArtist, bareTitle]);
  }
  return out;
};

const resolveRelease = async (artist: string, title: string): Promise<Release | null> => {
  for (const [tryArtist, tryTitle] of variants(artist, title)) {
    const found = await resolveReleaseOnce(tryArtist, tryTitle);
    if (found) return found;
  }
  return null;
};

const resolveReleaseOnce = async (artist: string, title: string): Promise<Release | null> => {
  const search = (await discogs(
    'https://api.discogs.com/database/search?type=release&per_page=12&sort=year&sort_order=asc' +
      `&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}`
  )) as { results?: { id: number; title: string; year?: string; country?: string }[] } | null;
  await sleep(1100);
  if (!search?.results) return null;

  for (const hit of search.results.slice(0, 4)) {
    // Le titre d'un résultat Discogs est « Artiste - Titre de la sortie ».
    const [hitArtist] = hit.title.split(' - ');
    if (!hitArtist || !sameArtist(hitArtist, artist)) continue;

    const detail = (await discogs(`https://api.discogs.com/releases/${hit.id}`)) as {
      year?: number;
      country?: string;
      labels?: { name?: string; catno?: string }[];
      formats?: { name?: string; descriptions?: string[] }[];
      tracklist?: { title?: string }[];
      artists?: { name?: string }[];
    } | null;
    await sleep(1100);
    if (!detail) continue;

    const wanted = normalise(title);
    const inTracklist = (detail.tracklist ?? []).some((t) => {
      const got = normalise(t.title ?? '');
      return got === wanted || got.includes(wanted) || wanted.includes(got);
    });
    if (!inTracklist) continue;

    const label = detail.labels?.[0];
    const format = detail.formats?.[0];
    return {
      label: label?.name?.replace(/ \(\d+\)$/, '') ?? null,
      catno: label?.catno && label.catno !== 'none' ? label.catno : null,
      country: detail.country ?? null,
      year: typeof detail.year === 'number' && detail.year > 0 ? detail.year : null,
      format: format
        ? [format.name, ...(format.descriptions ?? []).slice(0, 2)].filter(Boolean).join(', ')
        : null
    };
  }
  return null;
};

/* Écriture par le SEUL module autorisé. La sortie remplace l'album : deux
   champs qui disent presque la même chose seraient une source de confusion. */
const remember = new Map<string, Release>();
const writeCorpus = (): void => {
  const patches = new Map<string, { release?: unknown; album?: unknown }>();
  for (const [videoId, release] of remember) {
    patches.set(videoId, { release, album: undefined });
  }
  patchTracks(['release', 'album'], patches);
};

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;

const queue: Track[] = [];
const seen = new Set<string>();
for (const genre of corpus.genres) {
  for (const list of [genre.tracks.essentiel, genre.tracks.actuel]) {
    for (const track of list) {
      if (track.release || seen.has(track.youtubeId)) continue;
      seen.add(track.youtubeId);
      queue.push(track);
    }
  }
}

let done = 0;
let found = 0;
for (const track of queue) {
  if (done >= LIMIT) break;
  done += 1;
  const release = await resolveRelease(track.artist, track.title);
  if (release) {
    remember.set(track.youtubeId, release);
    found += 1;
    console.log(
      `  ok    ${track.artist} - ${track.title} : ${release.label ?? '?'} ${release.catno ?? ''} ` +
        `${release.country ?? ''} ${release.year ?? ''}`
    );
  } else {
    console.log(`  sans  ${track.artist} - ${track.title}`);
  }
  if (done % 25 === 0) {
    writeCorpus();
    console.log(`-- ${done}/${queue.length}, ${found} sorties trouvées, corpus écrit`);
  }
}

writeCorpus();
console.log(
  `\n${done} tracks interrogées : ${found} sorties originales trouvées ` +
    `(${done > 0 ? Math.round((found / done) * 100) : 0} %).`
);
