/* Onglet Actuel : les sorties récentes d'un genre, triées par écoutes.

   C'est le seul script du projet qui demande une clé. Elle est lue dans
   l'environnement, jamais écrite dans le dépôt, jamais dans le bundle : elle
   vient d'un secret d'intégration continue, et ce script ne tourne qu'au build.

   Usage :
     YOUTUBE_API_KEY=... npm run fetch:tracks
     YOUTUBE_API_KEY=... npm run fetch:tracks -- --only=techno,house
     YOUTUBE_API_KEY=... npm run fetch:tracks -- --dry-run

   Ce que fait la Data API que oEmbed ne peut pas faire : chercher par date et
   par nombre de vues. Ce qu'elle ne dispense pas de faire : vérifier. Les
   résultats passent par le MÊME matcher que tout le reste, plus le contrôle
   d'intégrabilité, parce qu'une vidéo trouvée par l'API peut très bien refuser
   l'iframe, et qu'une recherche par mot-clé rapporte beaucoup de bruit.

   Rien n'est jamais écrasé : on ajoute à `tracks` ce qui n'y est pas déjà,
   SANS ROLE. Les rôles `origine` et `canon` relèvent d'un choix éditorial,
   jamais d'une récolte, et ce script ne les pose ni ne les retire. */

import { readFileSync } from 'node:fs';

import { transaction } from './lib/corpus-store.ts';
import { fileURLToPath } from 'node:url';

import { judge, normalise, oembed, sleep } from './lib/match.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));

const KEY = process.env['YOUTUBE_API_KEY'];
const DRY = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null;

/** Combien de morceaux récents par genre, et sur quelle fenêtre. */
const PER_GENRE = 6;
const YEARS_BACK = 5;

if (!KEY) {
  console.error(
    "YOUTUBE_API_KEY absente de l'environnement.\n" +
      "Ce script ne tourne qu'au build, avec un secret d'intégration continue.\n" +
      "Sans clé, l'onglet Actuel reste vide et ne s'affiche pas : c'est un état valide."
  );
  process.exit(1);
}

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  year: number | null;
  verified: true;
  album?: string;
  cover?: { url: string; source: 'itunes' | 'youtube'; local: string };
}
interface Genre {
  id: string;
  label: string;
  family: string;
  tracks: Track[];
}
interface Corpus { version: number; families: unknown[]; genres: Genre[] }

interface SearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
}

const search = async (query: string): Promise<SearchItem[]> => {
  const after = new Date();
  after.setFullYear(after.getFullYear() - YEARS_BACK);

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('key', KEY);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '25');
  url.searchParams.set('order', 'viewCount');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('publishedAfter', `${after.toISOString().slice(0, 19)}Z`);
  url.searchParams.set('q', query);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube Data API ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { items?: SearchItem[] };
  return body.items ?? [];
};

/* Un titre de vidéo est presque toujours « Artiste - Titre ». On coupe sur le
   premier tiret, et on abandonne la ligne si on n'en trouve pas : deviner
   l'artiste produirait des métadonnées fausses. */
const split = (videoTitle: string): { artist: string; title: string } | null => {
  const cleaned = videoTitle
    .replace(/\s*[[(](official|video|audio|clip|hd|4k|lyrics?)[^)\]]*[)\]]/gi, '')
    .replace(/\s*\|.*$/, '')
    .trim();
  const m = /^(.{2,60}?)\s+[-, ]\s+(.{2,90})$/.exec(cleaned);
  if (!m?.[1] || !m[2]) return null;
  return { artist: m[1].trim(), title: m[2].trim() };
};

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;

let added = 0;
const actuelAdditions: { genreId: string; tracks: { youtubeId: string }[] }[] = [];
let examined = 0;
const empty: string[] = [];

for (const genre of corpus.genres) {
  if (ONLY && !ONLY.has(genre.id) && !ONLY.has(genre.family)) continue;

  const known = new Set(
    genre.tracks.map((t) => t.youtubeId)
  );
  const knownPairs = new Set(
    genre.tracks.map(
      (t) => `${normalise(t.artist)}|${normalise(t.title)}`
    )
  );

  let items: SearchItem[] = [];
  try {
    items = await search(`${genre.label} track`);
  } catch (error) {
    console.error(`  ${genre.id} : ${(error as Error).message}`);
    continue;
  }

  const found: Track[] = [];
  for (const item of items) {
    if (found.length >= PER_GENRE) break;
    const videoId = item.id?.videoId;
    const videoTitle = item.snippet?.title;
    if (!videoId || !videoTitle || known.has(videoId)) continue;

    const parsed = split(videoTitle);
    if (!parsed) continue;

    const pair = `${normalise(parsed.artist)}|${normalise(parsed.title)}`;
    if (knownPairs.has(pair)) continue;

    examined += 1;

    /* Le matcher, sur ce que l'API a renvoyé contre ce qu'on en a déduit. Cela
       écarte les titres qu'on a mal découpés et les vidéos hors sujet. */
    const verdict = judge(
      { title: videoTitle, channel: item.snippet?.channelTitle ?? '' },
      parsed.artist,
      parsed.title
    );
    if (!verdict.ok) continue;

    // videoEmbeddable=true ne suffit pas : on confirme par oEmbed, seule source
    // qui dit vraiment si l'iframe acceptera la vidéo.
    const candidate = await oembed(videoId);
    await sleep(120);
    if (!candidate) continue;

    const year = item.snippet?.publishedAt
      ? Number.parseInt(item.snippet.publishedAt.slice(0, 4), 10)
      : null;

    found.push({
      youtubeId: videoId,
      artist: parsed.artist,
      title: parsed.title,
      year: Number.isFinite(year) ? year : null,
      verified: true
    });
    known.add(videoId);
    knownPairs.add(pair);
  }

  if (found.length === 0) empty.push(genre.id);
  genre.tracks.push(...found);
  actuelAdditions.push({ genreId: genre.id, tracks: found });
  added += found.length;
  console.log(`  ${genre.id.padEnd(20)} ${found.length} sortie(s) récente(s) retenue(s)`);
}

if (!DRY && added > 0) {
  // Rejoué sur le disque frais : jamais l'instantané de départ.
  transaction((fresh) => {
    for (const op of actuelAdditions) {
      const g = fresh.genres.find((x) => x.id === op.genreId);
      if (!g) continue;
      const knownIds = new Set(
        g.tracks.map((t) => t.youtubeId)
      );
      for (const track of op.tracks) {
        if (knownIds.has(track.youtubeId)) continue;
        g.tracks.push(track as unknown as (typeof g.tracks)[number]);
      }
    }
  });
  console.log(`\n${added} morceaux ajoutés sans rôle sur ${examined} candidats examinés.`);
} else {
  console.log(`\n${DRY ? 'Essai à blanc. ' : ''}${added} morceaux retenus, corpus inchangé.`);
}
if (empty.length > 0) {
  console.log(`Aucune sortie récente retenue pour : ${empty.join(', ')}`);
}
console.log("Penser à lancer npm run fetch:covers ensuite, pour les pochettes des nouveaux morceaux.");
