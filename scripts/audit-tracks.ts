/* Revérification des tracks en place contre le filtre de parution complète.

   Le matcher refuse désormais les albums entiers, mais les identifiants déjà
   dans le corpus ont été retenus avant la règle. Ce script relit chacun sur sa
   page de lecture, qui donne le titre ET la durée sans clé, applique le
   filtre, et remplace ce qui tombe par une vraie track via le matcher durci.
   Un remplacement introuvable retire l'entrée plutôt que de garder l'album.

   Usage : npx tsx scripts/audit-tracks.ts [--dry-run] */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { isDurationExempt, isFullRelease, resolveTrack, sleep } from './lib/match.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const DRY = process.argv.includes('--dry-run');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

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
  tracks: { essentiel: Track[]; actuel: Track[] };
}
interface Corpus {
  version: number;
  families: unknown[];
  genres: Genre[];
}

/** Titre et durée depuis la page de lecture. Null si la page ne répond pas. */
const inspect = async (
  videoId: string
): Promise<{ title: string; seconds: number | null } | null> => {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = /"videoDetails":\{(?:[^{}]|\{[^{}]*\})*?"title":"((?:[^"\\]|\\.)*)"/.exec(
      html
    )?.[1];
    const seconds = /"lengthSeconds":"(\d+)"/.exec(html)?.[1];
    if (!title) return null;
    return {
      title: JSON.parse(`"${title}"`) as string,
      seconds: seconds ? Number.parseInt(seconds, 10) : null
    };
  } catch {
    return null;
  }
};

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;

let scanned = 0;
let flagged = 0;
let replaced = 0;
let removed = 0;
let unreachable = 0;

for (const genre of corpus.genres) {
  for (const list of [genre.tracks.essentiel, genre.tracks.actuel]) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const track = list[i];
      if (!track) continue;
      scanned += 1;

      const page = await inspect(track.youtubeId);
      await sleep(300);
      if (!page) {
        unreachable += 1;
        continue;
      }
      if (!isFullRelease(page.title, page.seconds, isDurationExempt(track.artist, track.title))) continue;

      flagged += 1;
      const mins = page.seconds ? `${Math.round(page.seconds / 60)} min` : 'durée inconnue';
      console.log(
        `  PARUTION ${genre.id.padEnd(20)} ${track.artist} - ${track.title} (${mins}) ` +
          `« ${page.title.slice(0, 60)} »`
      );

      const { hit } = await resolveTrack(track.artist, track.title);
      if (hit) {
        track.youtubeId = hit.videoId;
        delete track.cover; // la pochette était liée à l'ancien identifiant
        delete track.shared; // un partage éventuel se redéclare, pas ne se devine
        replaced += 1;
        console.log(`    remplacé par ${hit.videoId} « ${hit.candidate.title.slice(0, 50)} »`);
      } else {
        list.splice(i, 1);
        removed += 1;
        console.log('    aucune vraie track trouvée, entrée retirée');
      }
    }
  }
}

if (!DRY) writeFileSync(CORPUS, `${JSON.stringify(corpus, null, 1)}\n`, 'utf8');
console.log(
  `\n${scanned} tracks relues : ${flagged} parutions complètes, ${replaced} remplacées, ` +
    `${removed} retirées, ${unreachable} pages injoignables.${DRY ? ' (essai à blanc)' : ''}`
);
