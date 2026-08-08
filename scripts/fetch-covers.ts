/* Récupération des pochettes, AU BUILD UNIQUEMENT.

   L'API iTunes Search est gratuite et sans clé. On l'interroge sur artiste
   plus titre, on récupère l'artwork carré en 600 pixels, et on FIGE l'URL dans
   le JSON. Repli sur la miniature YouTube quand aucune correspondance ne
   ressort, ce qui arrive souvent sur les sorties de niche.

   Aucun appel tiers ne subsiste au runtime, hormis l'iframe YouTube.

   Usage : npm run fetch:covers -- [famille]
*/

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENRES_DIR = fileURLToPath(new URL('../src/data/genres', import.meta.url));
const ITUNES = 'https://itunes.apple.com/search';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface ItunesResult {
  artistName: string;
  trackName: string;
  artworkUrl100?: string;
}

/* iTunes renvoie du 100 pixels. L'URL se réécrit en 600, c'est documenté et
   stable depuis des années, et ça évite une seconde requête. */
const upscale = (url: string): string => url.replace(/\/100x100bb\./, '/600x600bb.');

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const lookup = async (artist: string, title: string): Promise<string | null> => {
  const term = `${artist} ${title}`;
  const url = `${ITUNES}?term=${encodeURIComponent(term)}&entity=song&limit=8`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const body = (await response.json()) as { results?: ItunesResult[] };
  const wantedArtist = norm(artist);
  const wantedTitle = norm(title);

  for (const result of body.results ?? []) {
    if (!result.artworkUrl100) continue;
    const a = norm(result.artistName);
    const t = norm(result.trackName);
    // Correspondance exigeante : une pochette fausse est pire qu'aucune.
    if ((a.includes(wantedArtist) || wantedArtist.includes(a)) && (t.includes(wantedTitle) || wantedTitle.includes(t))) {
      return upscale(result.artworkUrl100);
    }
  }
  return null;
};

interface Track {
  youtubeId: string;
  artist?: string;
  title?: string;
  cover?: string;
  coverSource?: 'itunes' | 'youtube';
}

interface Genre {
  id: string;
  tracksCurrent?: Track[];
  tracksEssential?: Track[];
  [key: string]: unknown;
}

const only = process.argv[2];
const files = readdirSync(GENRES_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f === `${only}.json`);

let found = 0;
let fallback = 0;

for (const file of files) {
  const path = join(GENRES_DIR, file);
  const genres = JSON.parse(readFileSync(path, 'utf8')) as Genre[];

  for (const genre of genres) {
    for (const track of [...(genre.tracksCurrent ?? []), ...(genre.tracksEssential ?? [])]) {
      if (track.cover) continue;

      const artwork = track.artist && track.title ? await lookup(track.artist, track.title) : null;

      if (artwork) {
        track.cover = artwork;
        track.coverSource = 'itunes';
        found += 1;
      } else if (track.youtubeId) {
        track.cover = `https://i.ytimg.com/vi/${track.youtubeId}/hqdefault.jpg`;
        track.coverSource = 'youtube';
        fallback += 1;
      }

      // L'API iTunes tolère mal les rafales : on reste poli.
      await sleep(320);
    }
  }

  writeFileSync(path, `${JSON.stringify(genres, null, 2)}\n`);
  console.log(`${file} mis à jour.`);
}

console.log(`\n${found} pochettes iTunes, ${fallback} replis sur la miniature YouTube.`);
