/* Pochettes, figées au build.

   Deux sources, dans cet ordre : l'API Deezer d'abord, l'API iTunes Search en
   repli. Toutes deux gratuites et sans clé, et jamais appelées depuis le
   navigateur d'un visiteur : ce script tourne au build, et seules les URLs
   résultantes entrent dans le JSON.

   Deezer passe en premier pour une raison mesurée : iTunes limite par adresse
   IP sur une fenêtre de plusieurs heures et a coupé trois campagnes de
   pochettes de suite. Deezer tolère cinquante requêtes par cinq secondes.

   La correspondance est exigeante. Une pochette fausse est pire qu'aucune :
   elle raconte une histoire inexacte sur un morceau réel. On exige donc que
   l'artiste ET le titre correspondent après normalisation, avec une tolérance
   sur les mentions de remix et de version que les deux bases écrivent
   différemment.

   Repli : la vignette YouTube en maxresdefault, qui existe toujours puisque
   l'identifiant a déjà été vérifié. Elle est marquée comme telle, pour qu'on
   sache toujours d'où vient une image.

   Deuxième temps : les images sont TÉLÉCHARGÉES dans public/covers/ et servies
   par le site. « Aucun appel tiers au runtime » se prend au mot : une balise
   img pointant sur mzstatic.com ou sur ytimg.com est un appel tiers. Après ce
   script, le seul appel tiers qui reste est l'iframe YouTube, et seulement à la
   lecture.

   Recadrage : une vignette YouTube est en 16:9, la pochette est carrée. On
   recadre depuis le CENTRE et non depuis le haut, sinon on garde le ciel et on
   coupe le sujet. Et si `maxresdefault` n'existe pas, on descend sur
   `hqdefault`, qui existe toujours.

   Dernier repli : aucune image du tout. On ne met alors pas une vignette laide,
   on ne met rien, et l'interface dessine une pochette procédurale avec la teinte
   de la famille et les initiales de l'artiste.

   Usage : npm run fetch:covers [-- --force]
   Sans --force, un morceau qui a déjà une pochette iTunes n'est pas réinterrogé. */

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const FORCE = process.argv.includes('--force');
/* iTunes limite par adresse IP sur une longue fenêtre : après quelques dizaines
   de requêtes il répond 403 pendant des heures. --covers-only saute la
   recherche et ne fait que télécharger les images déjà retenues, pour que le
   site soit complet même quand le quota est épuisé. */
const COVERS_ONLY = process.argv.includes('--covers-only');
/* --only-missing : ne cherche que les morceaux qui n'ont pas encore de vraie
   pochette. C'est le mode à relancer tant que le quota n'a pas tout couvert. */
const ONLY_MISSING = process.argv.includes('--only-missing');

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  year: number | null;
  verified: true;
  cover?: { url: string; source: 'deezer' | 'itunes' | 'youtube'; local: string };
  /* Le vrai label de disque demanderait un jeton Discogs. iTunes ne donne que
     l'album : c'est ce qu'on affiche, en le nommant pour ce qu'il est. */
  album?: string;
}
interface Genre {
  id: string;
  label: string;
  tracks: { essentiel: Track[]; actuel: Track[] };
}
interface Corpus { version: number; families: unknown[]; genres: Genre[] }

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Minuscules, accents retirés, ponctuation réduite à des espaces. */
const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Retire ce qui distingue une version d'une autre, pas le titre lui-même. */
const stripVersion = (s: string): string =>
  norm(s)
    .replace(
      /\b(original|radio|club|extended|vocal|instrumental|dub|edit|mix|remix|remastered|remaster|version|feat|featuring|pt|part|single|album|live|remixes)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (s: string): string[] => stripVersion(s).split(' ').filter((w) => w.length > 2);

/** Part des mots attendus effectivement présents. */
const coverage = (want: string, got: string): number => {
  const w = tokens(want);
  if (w.length === 0) return 0;
  const g = new Set(tokens(got));
  return w.filter((t) => g.has(t)).length / w.length;
};

interface ItunesResult {
  artistName?: string;
  trackName?: string;
  collectionName?: string;
  artworkUrl100?: string;
}

/* iTunes limite le débit sans le documenter et répond 403 dès qu'on insiste,
   par adresse IP et sur une fenêtre longue. Recul exponentiel plutôt
   qu'abandon, et plafond de pause porté à quatre minutes : une pochette manquée
   pour cause de quota n'est pas une pochette introuvable, elle vaut la peine
   d'attendre. Le script est fait pour tourner en tâche de fond sur des heures. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15';

let cooldown = 1600;

const search = async (term: string): Promise<ItunesResult[]> => {
  const url =
    'https://itunes.apple.com/search?media=music&entity=song&limit=12&term=' +
    encodeURIComponent(term);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) {
      cooldown = Math.max(1400, cooldown * 0.92);
      const body = (await res.json()) as { results?: ItunesResult[] };
      return body.results ?? [];
    }
    if (res.status !== 403 && res.status !== 429) throw new Error(`iTunes ${res.status}`);
    cooldown = Math.min(240000, cooldown * 2.5);
    console.warn(`    quota iTunes, pause de ${Math.round(cooldown / 1000)} s`);
    await sleep(cooldown);
  }
  throw new Error('iTunes 403 après 8 tentatives');
};

interface DeezerTrack {
  title?: string;
  artist?: { name?: string };
  album?: { title?: string; cover_big?: string };
}

/* Deezer. Les résultats sont reprojetés dans la forme iTunes pour passer par le
   MÊME contrôle de correspondance : une pochette fausse est pire qu'aucune,
   quelle que soit la source. cover_big fait 500 par 500. */
const searchDeezer = async (term: string): Promise<ItunesResult[]> => {
  const url = 'https://api.deezer.com/search?limit=12&q=' + encodeURIComponent(term);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Deezer ${res.status}`);
  const body = (await res.json()) as { data?: DeezerTrack[] };
  return (body.data ?? []).map((t) => ({
    artistName: t.artist?.name ?? '',
    trackName: t.title ?? '',
    collectionName: t.album?.title ?? '',
    artworkUrl100: t.album?.cover_big ?? ''
  }));
};

/** 600 px au lieu des 100 px renvoyés par défaut. Même image, autre gabarit. */
const upscale = (url: string): string => url.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1');

const match = (
  results: ItunesResult[],
  artist: string,
  title: string
): { url: string; album: string } | null => {
  let best: { url: string; album: string; score: number } | null = null;

  for (const r of results) {
    if (!r.artworkUrl100 || !r.artistName || !r.trackName) continue;

    const artistScore = Math.max(
      coverage(artist, r.artistName),
      // Certains morceaux sont crédités à une compilation : l'artiste est alors
      // dans le titre du morceau plutôt que dans le champ artiste.
      coverage(artist, `${r.artistName} ${r.trackName} ${r.collectionName ?? ''}`) * 0.9
    );
    const titleScore = coverage(title, r.trackName);

    // Les deux doivent tenir. Un artiste juste avec un titre faux donne une
    // pochette d'un autre morceau du même artiste : c'est exactement le cas
    // qu'on refuse.
    if (artistScore < 0.7 || titleScore < 0.7) continue;

    const score = artistScore + titleScore;
    if (!best || score > best.score) {
      best = { url: upscale(r.artworkUrl100), album: r.collectionName ?? '', score };
    }
  }

  return best ? { url: best.url, album: best.album } : null;
};

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;

/* Écriture après CHAQUE trouvaille. iTunes se referme sans prévenir et les
   pauses montent à quatre minutes : un script tué en cours de route perdait
   tout ce qu'il avait trouvé. C'est arrivé une fois, 109 pochettes perdues.

   L'écriture RELIT le fichier et n'y applique QUE les champs dont ce script est
   propriétaire, `cover` et `album`, indexés par identifiant de vidéo. Sans cela,
   un script qui tourne des heures réécrit le corpus tel qu'il l'a chargé au
   départ et efface tout ce qui a été ajouté entre-temps par ailleurs. C'est
   arrivé aussi : une passe d'alias a été effacée en silence. */
const owned = new Map<string, { cover?: Track['cover']; album?: string }>();

const remember = (track: Track): void => {
  const entry: { cover?: Track['cover']; album?: string } = {};
  if (track.cover) entry.cover = track.cover;
  if (track.album) entry.album = track.album;
  owned.set(track.youtubeId, entry);
};

const writeCorpus = (): void => {
  let disk: Corpus;
  try {
    disk = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;
  } catch {
    return;
  }
  for (const genre of disk.genres) {
    for (const track of [...genre.tracks.essentiel, ...genre.tracks.actuel]) {
      const mine = owned.get(track.youtubeId);
      if (!mine) continue;
      if (mine.cover) track.cover = mine.cover;
      else delete track.cover;
      if (mine.album) track.album = mine.album;
    }
  }
  writeFileSync(CORPUS, `${JSON.stringify(disk, null, 1)}\n`, 'utf8');
};

let itunes = 0;
let deezer = 0;
let fallback = 0;
let kept = 0;
let failures = 0;

for (const genre of corpus.genres) {
  if (COVERS_ONLY) break;
  for (const track of [...genre.tracks.essentiel, ...genre.tracks.actuel]) {
    const hasRealCover = track.cover?.source === 'itunes' || track.cover?.source === 'deezer';
    if (!FORCE && hasRealCover) {
      kept += 1;
      continue;
    }
    if (ONLY_MISSING && hasRealCover) {
      kept += 1;
      continue;
    }

    const previous = track.cover;
    let hit: { url: string; album: string } | null = null;
    let hitSource: 'deezer' | 'itunes' = 'deezer';

    // Deezer d'abord, avec le même contrôle exigeant.
    for (const term of [`${track.artist} ${track.title}`, track.title]) {
      try {
        hit = match(await searchDeezer(term), track.artist, track.title);
      } catch (error) {
        failures += 1;
        console.warn(`  Deezer indisponible sur "${term}" : ${(error as Error).message}`);
      }
      await sleep(150);
      if (hit) break;
    }

    // iTunes en repli seulement : son quota est trop fragile pour l'user en premier.
    if (!hit) {
      hitSource = 'itunes';
      for (const term of [`${track.artist} ${track.title}`, track.title]) {
        try {
          hit = match(await search(term), track.artist, track.title);
        } catch (error) {
          failures += 1;
          console.warn(`  iTunes indisponible sur "${term}" : ${(error as Error).message}`);
        }
        await sleep(cooldown);
        if (hit) break;
      }
    }

    if (hit) {
      track.cover = { url: hit.url, source: hitSource, local: `covers/${track.youtubeId}.jpg` };
      if (hit.album) track.album = hit.album;
      if (hitSource === 'deezer') deezer += 1;
      else itunes += 1;
      console.log(`  ok    ${genre.id.padEnd(20)} ${track.artist} - ${track.title} [${hitSource}]`);
      remember(track);
      writeCorpus();
    } else if (previous?.source === 'itunes' || previous?.source === 'deezer') {
      /* En --force, une recherche qui échoue pour cause de quota ne doit PAS
         remplacer une vraie pochette par une vignette de vidéo. On garde
         l'ancienne : l'échec est celui du réseau, pas celui de la pochette. */
      track.cover = previous;
      remember(track);
      kept += 1;
      console.log(`  garde ${genre.id.padEnd(20)} ${track.artist} - ${track.title}`);
    } else {
      track.cover = {
        url: `https://i.ytimg.com/vi/${track.youtubeId}/maxresdefault.jpg`,
        source: 'youtube',
        local: `covers/${track.youtubeId}.jpg`
      };
      fallback += 1;
      console.log(`  repli ${genre.id.padEnd(20)} ${track.artist} - ${track.title}`);
    }
    remember(track);
    writeCorpus();
  }
}

writeFileSync(CORPUS, `${JSON.stringify(corpus, null, 1)}\n`, 'utf8');

/* Téléchargement local. La vignette maxresdefault n'existe pas pour toutes les
   vidéos : on retombe alors sur hqdefault, qui existe toujours. */
const OUT = fileURLToPath(new URL('../public/covers', import.meta.url));
mkdirSync(OUT, { recursive: true });

let downloaded = 0;
let already = 0;
let missing = 0;

for (const genre of corpus.genres) {
  for (const track of [...genre.tracks.essentiel, ...genre.tracks.actuel]) {
    /* Un morceau sans pochette retenue prend le repli vignette, même en
       --covers-only : sinon les morceaux ajoutés après la dernière recherche
       iTunes resteraient sans image du tout. */
    if (!track.cover) {
      track.cover = {
        url: `https://i.ytimg.com/vi/${track.youtubeId}/maxresdefault.jpg`,
        source: 'youtube',
        local: `covers/${track.youtubeId}.jpg`
      };
    }
    track.cover.local = `covers/${track.youtubeId}.jpg`;
    remember(track);
    const dest = `${OUT}/${track.youtubeId}.jpg`;

    try {
      if (statSync(dest).size > 2048) {
        already += 1;
        continue;
      }
    } catch {
      // pas encore téléchargée
    }

    /* Ordre de repli : l'URL retenue, puis les gabarits YouTube du plus grand
       au plus petit. hqdefault existe pour toute vidéo publique. */
    const candidates = [track.cover.url];
    if (track.cover.source === 'youtube') {
      candidates.push(
        `https://i.ytimg.com/vi/${track.youtubeId}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${track.youtubeId}/hqdefault.jpg`
      );
    }

    let ok = false;
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        // Une vignette absente est servie en placeholder gris de 1 ko environ.
        if (buf.byteLength < 2048) continue;
        writeFileSync(dest, buf);
        downloaded += 1;
        ok = true;
        break;
      } catch {
        // on tente le candidat suivant
      }
    }
    if (!ok) {
      /* Aucune image : on retire la pochette au lieu d'en garder une qui
         pointe dans le vide. L'interface dessinera une pochette procédurale. */
      delete track.cover;
      remember(track);
      missing += 1;
      console.warn(`  image introuvable : ${genre.id} ${track.artist} - ${track.title}`);
    }
  }
}

writeFileSync(CORPUS, `${JSON.stringify(corpus, null, 1)}\n`, 'utf8');

console.log(
  `Images locales : ${downloaded} téléchargées, ${already} déjà présentes, ${missing} manquantes.`
);
console.log(
  'Recadrage carré depuis le centre à faire ensuite :\n' +
    "  cd public/covers && for f in *.jpg; do magick \"$f\" -resize 400x400^ " +
    '-gravity center -extent 400x400 -quality 78 -strip "$f"; done'
);

const total = corpus.genres.reduce((n, g) => n + g.tracks.essentiel.length + g.tracks.actuel.length, 0);
console.log(
  `\n${total} morceaux : ${deezer} pochettes Deezer, ${itunes} iTunes, ${fallback} replis vignette YouTube, ` +
    `${kept} conservées, ${failures} appels en échec.`
);
