/* Récupération des morceaux, AU BUILD UNIQUEMENT.

   Ce script ne tourne jamais côté client. La clé est lue dans
   process.env.YOUTUBE_API_KEY, fournie par un secret GitHub Actions, et rien
   de ce qu'elle sert à obtenir ne la contient : seuls le titre, la chaîne, la
   date de publication et le nombre de vues sont figés dans le JSON.

   Deux listes par genre :
   - ACTUEL     sorties des 5 dernières années, triées par vues décroissantes
   - ESSENTIEL  fondateurs, toutes époques, saisis à la main dans les données

   Usage : YOUTUBE_API_KEY=... npm run fetch:tracks -- [famille]
*/

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENRES_DIR = fileURLToPath(new URL('../src/data/genres', import.meta.url));
const API = 'https://www.googleapis.com/youtube/v3';
const CURRENT_YEARS = 5;
const CURRENT_TARGET = 20;

const key = process.env['YOUTUBE_API_KEY'];
if (!key) {
  console.error('YOUTUBE_API_KEY absente. Ce script ne tourne qu\'au build, jamais côté client.');
  process.exit(1);
}

interface SearchItem {
  id: { videoId?: string };
  snippet: { title: string; channelTitle: string; publishedAt: string };
}

interface StatsItem {
  id: string;
  statistics?: { viewCount?: string };
  status?: { embeddable?: boolean };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const search = async (query: string, publishedAfter: string): Promise<SearchItem[]> => {
  const url =
    `${API}/search?part=snippet&type=video&videoEmbeddable=true&maxResults=50` +
    `&q=${encodeURIComponent(query)}&publishedAfter=${publishedAfter}&key=${key}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`  recherche en échec (${response.status}) pour ${query}`);
    return [];
  }
  const body = (await response.json()) as { items?: SearchItem[] };
  return body.items ?? [];
};

/* Les vues ne sont pas dans la recherche : il faut un second appel sur les
   identifiants, par lots de 50. C'est ce qui permet le tri par popularité. */
const hydrate = async (ids: string[]): Promise<Map<string, { views: number; embeddable: boolean }>> => {
  const out = new Map<string, { views: number; embeddable: boolean }>();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `${API}/videos?part=statistics,status&id=${batch.join(',')}&key=${key}`;
    const response = await fetch(url);
    if (!response.ok) continue;
    const body = (await response.json()) as { items?: StatsItem[] };
    for (const item of body.items ?? []) {
      out.set(item.id, {
        views: Number(item.statistics?.viewCount ?? 0),
        embeddable: item.status?.embeddable !== false
      });
    }
    await sleep(120);
  }
  return out;
};

interface Genre {
  id: string;
  name: string;
  discogsStyles?: string[];
  tracksCurrent?: unknown[];
  [key: string]: unknown;
}

const only = process.argv[2];
const files = readdirSync(GENRES_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f === `${only}.json`);

const since = new Date();
since.setFullYear(since.getFullYear() - CURRENT_YEARS);
const publishedAfter = since.toISOString();

for (const file of files) {
  const path = join(GENRES_DIR, file);
  const genres = JSON.parse(readFileSync(path, 'utf8')) as Genre[];

  for (const genre of genres) {
    const query = `${genre.name} ${(genre.discogsStyles ?? []).slice(0, 2).join(' ')}`.trim();
    console.log(`${genre.id} : recherche « ${query} »`);

    const items = await search(query, publishedAfter);
    const ids = items.map((i) => i.id.videoId).filter((v): v is string => Boolean(v));
    const stats = await hydrate(ids);

    const tracks = items
      .map((item) => {
        const id = item.id.videoId;
        if (!id) return null;
        const s = stats.get(id);
        if (!s || !s.embeddable) return null;
        return {
          youtubeId: id,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          views: s.views,
          // verify-youtube.ts fait autorité sur ce champ, jamais ce script.
          verified: false
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => b.views - a.views)
      .slice(0, CURRENT_TARGET);

    genre.tracksCurrent = tracks;
    console.log(`  ${tracks.length} morceaux retenus`);
    await sleep(200);
  }

  writeFileSync(path, `${JSON.stringify(genres, null, 2)}\n`);
  console.log(`${file} mis à jour.`);
}

console.log('\nRappel : lancer npm run verify:youtube avant tout build de production.');
