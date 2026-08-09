/* Tonalité des tracks, relevée sur GetSongKey. JAMAIS déduite, JAMAIS
   inventée : une tonalité vient d'une base qui l'a mesurée, ou elle
   n'existe pas. L'interface n'affiche le champ que quand il existe, sans
   gabarit vide (mission tonalité, taux attendu sous 30 pour cent).

   L'API demande une clé (GETSONGKEY_KEY). Sans clé, le script le dit et
   s'arrête sans bloquer : chantier sauté, taux non mesurable.

   Correspondance exigeante : artiste ET titre normalisés doivent
   correspondre au résultat, même normalisation que le matcher YouTube.

   PROPRIÉTÉ DE CHAMP : relecture du corpus à l'écriture, seul le champ key
   des tracks visées est touché.

   Usage : GETSONGKEY_KEY=... npx tsx scripts/fetch-key.ts [--limit=N] */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { normalise, sleep } from './lib/match.ts';
import { patchTracks } from './lib/corpus-store.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));

/* Jeton depuis l'environnement OU un fichier .env à la racine (gitignoré).
   Sans dépendance : trois lignes de parseur suffisent, et le script marche
   que le jeton soit exporté dans le shell ou posé dans le fichier. */
const envToken = (name: string): string | undefined => {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(fileURLToPath(new URL('../.env', import.meta.url)), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') || undefined;
  } catch {
    return undefined;
  }
};
const KEY = envToken('GETSONGKEY_KEY');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : Infinity;

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  key?: string;
}
interface Corpus {
  genres: { id: string; tracks: { essentiel: Track[]; actuel: Track[] } }[];
}

if (!KEY) {
  console.error(
    'GETSONGKEY_KEY absente : chantier tonalité SAUTÉ, taux non mesurable. ' +
      'Créer une clé sur getsongbpm.com/api puis relancer ce script, seul. ' +
      "L'interface n'affiche déjà la tonalité que quand elle existe."
  );
  process.exit(0);
}

/** Cherche la track et rend la tonalité SEULEMENT sur correspondance exacte. */
const resolveKey = async (artist: string, title: string): Promise<string | null> => {
  const url =
    `https://api.getsong.co/search/?api_key=${encodeURIComponent(KEY)}` +
    `&type=both&lookup=${encodeURIComponent(`song:${title} artist:${artist}`)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      search?: { title?: string; artist?: { name?: string }; key_of?: string }[];
    };
    const wantedTitle = normalise(title);
    const wantedArtist = normalise(artist);
    for (const hit of data.search ?? []) {
      if (normalise(hit.title ?? '') !== wantedTitle) continue;
      if (normalise(hit.artist?.name ?? '') !== wantedArtist) continue;
      const key = hit.key_of?.trim();
      if (key) return key;
    }
    return null;
  } catch {
    return null;
  }
};

const remember = new Map<string, string>();
// Écriture par le SEUL module autorisé : champ key uniquement.
const writeCorpus = (): void => {
  const patches = new Map<string, { key?: unknown }>();
  for (const [videoId, key] of remember) patches.set(videoId, { key });
  patchTracks(['key'], patches);
};

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;
const queue: Track[] = [];
const seen = new Set<string>();
for (const genre of corpus.genres) {
  for (const list of [genre.tracks.essentiel, genre.tracks.actuel]) {
    for (const track of list) {
      if (track.key || seen.has(track.youtubeId)) continue;
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
  const key = await resolveKey(track.artist, track.title);
  await sleep(650);
  if (key) {
    remember.set(track.youtubeId, key);
    found += 1;
    console.log(`  ok    ${track.artist} - ${track.title} : ${key}`);
  }
  if (done % 50 === 0) {
    writeCorpus();
    console.log(`-- ${done}/${queue.length}, ${found} tonalités`);
  }
}

writeCorpus();
const rate = done > 0 ? Math.round((found / done) * 100) : 0;
console.log(`\n${done} tracks interrogées : ${found} tonalités relevées (${rate} %).`);
if (rate < 30) {
  console.log(
    'Taux sous 30 % : le champ ne s\'affiche que quand il existe, sans gabarit vide. ' +
      "C'est déjà le comportement de l'interface."
  );
}
