/* POCHETTES DE REPLI, chez Discogs.

   POURQUOI UN TROISIEME OUTIL. Deezer et iTunes couvrent le catalogue
   commercial et laissent de cote exactement ce que cet atlas contient de plus
   precieux : les 12 pouces de niche, les pressages de label, les disques qui
   n'ont jamais ete numerises pour la vente. 318 morceaux affichaient donc une
   pochette DESSINEE a partir des initiales de l'artiste, ce qui est propre
   mais ce n'est pas la pochette du disque.

   Discogs, lui, est une base de PRESSAGES : c'est precisement la ou vivent
   ces disques. Et le corpus connait deja la sortie originale de 197 d'entre
   eux, relevee par fetch-release-data.ts, ce qui rend la recherche fiable.

   LA CORRESPONDANCE RESTE EXIGEANTE. Une pochette fausse raconte une histoire
   inexacte sur un morceau reel, et c'est pire qu'une image dessinee qui
   n'affirme rien. On exige donc que l'artiste corresponde apres
   normalisation, et quand le corpus connait la sortie originale on exige en
   plus que l'annee tombe a deux ans pres : sans cela, une reedition de 2018
   fournirait la pochette d'un morceau de 1977.

   BASSE DEFINITION ASSUMEE, comme demande : on prend l'image de 150 px de
   Discogs plutot que la grande. A 48 px dans une liste, la difference ne se
   voit pas, et le depot ne grossit pas de trente mega-octets.

   L'ECRITURE PASSE PAR LE MAGASIN DE CORPUS, jamais par un instantane.
   Ce script chargeait le corpus au demarrage et le reecrivait a la fin :
   c'est exactement la classe d'erreur qui a deja ecrase des donnees deux
   fois dans ce projet, et qu'un controle interdit depuis. Il ne declare que
   le champ `cover`, track par track, et le magasin relit le disque au moment
   d'ecrire. Une autre passe qui tourne en meme temps survit.

   Jeton dans DISCOGS_TOKEN.
   Usage : npx tsx scripts/covers-discogs.ts [--limite=N] [--dry-run] */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalise, sleep } from './lib/match.ts';
import { patchTracks } from './lib/corpus-store.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const DOSSIER = fileURLToPath(new URL('../public/covers/', import.meta.url));

const DRY = process.argv.includes('--dry-run');
const limiteArg = process.argv.find((a) => a.startsWith('--limite='));
const LIMITE = limiteArg ? Number(limiteArg.slice('--limite='.length)) : Infinity;

const TOKEN = (() => {
  if (process.env['DISCOGS_TOKEN']) return process.env['DISCOGS_TOKEN'];
  const env = fileURLToPath(new URL('../.env', import.meta.url));
  if (!existsSync(env)) return '';
  const m = readFileSync(env, 'utf8').match(/^DISCOGS_TOKEN=(.+)$/m);
  return m?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
})();

if (!TOKEN) {
  console.error("Pas de DISCOGS_TOKEN. Rien n'a ete fait.");
  process.exit(1);
}

const AGENT = 'SonaaAtlas/1.0 +https://sonaa.ca';

interface Cover {
  url: string;
  source: string;
  local: string;
}
interface Track {
  artist: string;
  title: string;
  year: number | null;
  youtubeId: string;
  cover?: Cover | null;
  release?: { year: number | null } | null;
}
interface Corpus {
  genres: { id: string; label: string; tracks: Track[] }[];
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;

const aBesoin = (t: Track): boolean => !t.cover?.local || t.cover.source === 'youtube';

const cibles: Track[] = [];
for (const g of corpus.genres) for (const t of g.tracks) if (aBesoin(t)) cibles.push(t);

console.log(`${cibles.length} morceau(x) sans vraie pochette.\n`);

interface Resultat {
  cover_image?: string;
  thumb?: string;
  title?: string;
  year?: string | number;
}

async function chercher(t: Track): Promise<Resultat | null> {
  const url =
    'https://api.discogs.com/database/search?type=release&per_page=8' +
    `&artist=${encodeURIComponent(t.artist)}&track=${encodeURIComponent(t.title)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': AGENT, Authorization: `Discogs token=${TOKEN}` }
  });
  if (!r.ok) return null;
  const d = (await r.json()) as { results?: Resultat[] };
  const attendue = t.release?.year ?? t.year;
  const nomArtiste = normalise(t.artist);

  for (const x of d.results ?? []) {
    const image = x.cover_image ?? x.thumb;
    if (!image) continue;
    /* Discogs sert un carre gris quand il n'a pas d'image : il porte
       « spacer » dans son adresse. Le prendre reviendrait a poser un vide. */
    if (/spacer/.test(image)) continue;
    const titre = normalise(String(x.title ?? ''));
    if (nomArtiste && !titre.includes(nomArtiste)) continue;
    if (attendue) {
      const an = Number(x.year);
      if (Number.isFinite(an) && Math.abs(an - attendue) > 2) continue;
    }
    return x;
  }
  return null;
}

const patches = new Map<string, { cover: Cover }>();
let trouves = 0;
let refuses = 0;
let echecs = 0;
let faits = 0;

for (const t of cibles) {
  if (faits >= LIMITE) break;
  faits += 1;

  let x: Resultat | null = null;
  try {
    x = await chercher(t);
  } catch {
    echecs += 1;
    continue;
  }
  /* Discogs autorise soixante requetes par minute pour un jeton. */
  await sleep(1100);

  if (!x) {
    console.log(`  aucune  ${t.artist} - ${t.title}`);
    refuses += 1;
    continue;
  }

  const image = (x.cover_image ?? x.thumb) as string;
  const fichier = `${t.youtubeId}.jpg`;
  if (!DRY) {
    const rep = await fetch(image, { headers: { 'User-Agent': AGENT } });
    if (!rep.ok) {
      console.log(`  echec   ${t.artist} - ${t.title} (${rep.status})`);
      echecs += 1;
      continue;
    }
    writeFileSync(`${DOSSIER}${fichier}`, Buffer.from(await rep.arrayBuffer()));
    patches.set(t.youtubeId, { cover: { url: image, source: 'discogs', local: `covers/${fichier}` } });
  }
  console.log(`  ok      ${t.artist} - ${t.title}  [${String(x.year ?? '?')}]`);
  trouves += 1;
}

if (!DRY && patches.size > 0) {
  const { appliques, orphelins } = patchTracks(['cover'], patches);
  console.log(`\n${appliques} pochette(s) ecrite(s) dans le corpus.`);
  if (orphelins.length > 0) {
    console.log(`${orphelins.length} morceau(x) disparu(s) du corpus pendant la passe, ignore(s).`);
  }
}

console.log(`\n${trouves} trouvee(s), ${refuses} sans correspondance, ${echecs} en echec.`);
if (DRY) console.log("Essai a blanc : rien n'a ete ecrit.");
