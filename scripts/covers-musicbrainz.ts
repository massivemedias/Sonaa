/* POCHETTES DE DERNIER RECOURS, chez MusicBrainz et Cover Art Archive.

   Mika, le 3 octobre 2026 : « cherche les pochettes manquantes ». Deezer,
   iTunes et Discogs (voir covers-discogs.ts) en laissaient 152 sans pochette :
   la vignette YouTube, qui n'est pas une pochette, est ecartee a l'affichage,
   et le morceau montre un carre dessine.

   MusicBrainz est une encyclopedie libre des enregistrements, et Cover Art
   Archive y range les pochettes de chaque sortie. Les deux sont publics, sans
   cle ; MusicBrainz demande une requete par seconde au plus et un nom de
   logiciel dans l'entete, ce qu'on respecte.

   LA CORRESPONDANCE RESTE AUSSI EXIGEANTE QU'AILLEURS. Une pochette fausse
   raconte une histoire inexacte sur un morceau reel, et c'est pire qu'un
   carre dessine qui n'affirme rien. On exige :
   - que le titre de l'enregistrement egale celui du morceau apres
     normalisation (une parenthese de version, « Original Mix », est toleree) ;
   - que l'artiste credite egale celui du morceau apres normalisation ;
   - quand le corpus connait l'annee, que la sortie tombe a deux ans pres.
   Parmi les sorties retenues, la plus ancienne passe devant : c'est la
   pochette d'origine, pas celle d'une compilation de 2015.

   LES COMPILATIONS NE PASSENT QU'EN DERNIER, ET DE LA MEME ANNEE. Une
   premiere passe, le 3 octobre 2026, a pris « Best of Hot Mix 5 '88 » pour
   Ralphi Rosario et « Night Queens » pour Yazoo : vraies sorties, mauvaises
   pochettes. Un single, un EP ou un album passent devant ; une compilation
   n'est prise que si elle sort l'annee meme du morceau, comme Montreal Smoked
   Meat (2002), ou ont paru pour la premiere fois Akufen et Deadbeat.

   BASSE DEFINITION ASSUMEE, comme pour Discogs : l'image de 250 px. A 48 px
   dans une liste, la difference ne se voit pas, et le depot ne grossit pas.

   L'ECRITURE PASSE PAR LE MAGASIN DE CORPUS (champ `cover` seulement).

   Usage : npx tsx scripts/covers-musicbrainz.ts [--limite=N] [--dry-run] */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalise, sleep } from './lib/match.ts';
import { patchTracks } from './lib/corpus-store.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const DOSSIER = fileURLToPath(new URL('../public/covers/', import.meta.url));
const DRY = process.argv.includes('--dry-run');
const limiteArg = process.argv.find((a) => a.startsWith('--limite='));
const LIMITE = limiteArg ? Number(limiteArg.slice('--limite='.length)) : Infinity;
const AGENT = 'SonaaAtlas/1.0 ( https://sonaa.ca )';

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
  genres: { id: string; tracks: Track[] }[];
}

interface Sortie {
  id: string;
  date?: string;
  status?: string;
  'release-group'?: { id: string; 'primary-type'?: string; 'secondary-types'?: string[] };
}
interface Enregistrement {
  title: string;
  score?: number;
  'artist-credit'?: { name: string; artist?: { name: string } }[];
  releases?: Sortie[];
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Corpus;
const vus = new Set<string>();
const cibles: Track[] = [];
for (const g of corpus.genres) {
  for (const t of g.tracks) {
    if (vus.has(t.youtubeId)) continue;
    vus.add(t.youtubeId);
    if (!t.cover?.local || t.cover.source === 'youtube') cibles.push(t);
  }
}
console.log(`${cibles.length} morceau(x) sans vraie pochette.\n`);

/* La parenthese de version (« Original Mix », « Remastered ») n'est pas le
   titre : on la retire des deux cotes avant de comparer. */
const titreNu = (s: string): string => normalise(s.replace(/\s*[([].*?[)\]]\s*/g, ' '));
/* SANS ESPACES NI PONCTUATION : « Gehts Noch » et « Geht's noch? » sont le
   meme titre. */
const serre = (s: string): string => s.replace(/\s+/g, '');
/* « Fluegel » est « Flügel » ecrit sans trema : on compare les deux formes. */
const translit = (s: string): string => s.replace(/ü/g, 'ue').replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/Ü/g, 'Ue').replace(/Ö/g, 'Oe').replace(/Ä/g, 'Ae').replace(/ß/g, 'ss');
/* L'ARTISTE PRINCIPAL : avant « feat. », « & » ou une virgule, et sans le
   numero que Discogs ajoute aux homonymes (« Maddix (4) »). */
const principal = (s: string): string =>
  serre(normalise(s.replace(/\s*\(\d+\)/g, '').split(/\s+(?:feat\.?|ft\.?|featuring|&|and|x|vs\.?)\s+|,/i)[0] ?? s));
const echapper = (s: string): string => s.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1');

async function mb(url: string): Promise<unknown> {
  for (let essai = 0; essai < 3; essai += 1) {
    const r = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: 'application/json' } }).catch(() => null);
    await sleep(1100);
    if (r?.ok) return r.json();
    if (r && r.status !== 503) return null;
  }
  return null;
}

/** Les sorties qui portent ce morceau, de la plus ancienne a la plus recente. */
async function sorties(t: Track): Promise<Sortie[]> {
  /* SANS GUILLEMETS : une phrase exacte ne trouvait pas « Geht's noch? »
     pour « Gehts Noch ». La recherche est large ; le tri, lui, est strict. */
  const titreRequete = t.title.replace(/\s*[([].*?[)\]]\s*/g, ' ').trim() || t.title;
  const requete = `recording:(${echapper(titreRequete)}) AND artist:(${echapper(t.artist.replace(/\s*\(\d+\)/g, ''))})`;
  const d = (await mb(`https://musicbrainz.org/ws/2/recording/?fmt=json&limit=15&query=${encodeURIComponent(requete)}`)) as {
    recordings?: Enregistrement[];
  } | null;
  const titre = serre(titreNu(t.title));
  const artiste = principal(t.artist);
  const attendue = t.release?.year ?? t.year;
  const retenues: Sortie[] = [];
  for (const r of d?.recordings ?? []) {
    if ((r.score ?? 0) < 80 || serre(titreNu(r.title)) !== titre) continue;
    const brut = (r['artist-credit'] ?? []).map((c) => c.name).join(' ');
    const formes = [serre(normalise(brut)), serre(normalise(translit(brut)))];
    if (!artiste || !formes.some((credit) => credit && (credit.includes(artiste) || artiste.includes(credit)))) continue;
    for (const s of r.releases ?? []) {
      const an = Number((s.date ?? '').slice(0, 4));
      if (attendue && Number.isFinite(an) && an > 0 && Math.abs(an - attendue) > 2) continue;
      retenues.push(s);
    }
  }
  const compilation = (s: Sortie): boolean =>
    (s['release-group']?.['secondary-types'] ?? []).some((x) => /compilation|dj-mix|live/i.test(x));
  const parDate = (a: Sortie, b: Sortie): number => (a.date || '9999').localeCompare(b.date || '9999');
  const disques = retenues.filter((s) => !compilation(s)).sort(parDate);
  const compilationsDuMemeAn = retenues.filter((s) => compilation(s) && attendue !== null && attendue !== undefined && Number((s.date ?? '').slice(0, 4)) === attendue).sort(parDate);
  return [...disques, ...compilationsDuMemeAn];
}

/** La premiere pochette disponible, par groupe de sortie puis par sortie. */
async function pochette(liste: readonly Sortie[]): Promise<{ url: string; image: ArrayBuffer } | null> {
  const essais: string[] = [];
  for (const s of liste) {
    const groupe = s['release-group']?.id;
    if (groupe) essais.push(`https://coverartarchive.org/release-group/${groupe}/front-250`);
    essais.push(`https://coverartarchive.org/release/${s.id}/front-250`);
  }
  for (const url of [...new Set(essais)].slice(0, 6)) {
    const r = await fetch(url, { headers: { 'User-Agent': AGENT }, redirect: 'follow' }).catch(() => null);
    await sleep(200);
    if (r?.ok && (r.headers.get('content-type') ?? '').startsWith('image/')) return { url, image: await r.arrayBuffer() };
  }
  return null;
}

const patches = new Map<string, { cover: Cover }>();
let trouves = 0;
let faits = 0;

for (const t of cibles) {
  if (faits >= LIMITE) break;
  faits += 1;
  const liste = await sorties(t);
  const p = liste.length > 0 ? await pochette(liste) : null;
  if (!p) {
    console.log(`  aucune  ${t.artist} - ${t.title}`);
    continue;
  }
  const fichier = `${t.youtubeId}.jpg`;
  if (!DRY) {
    writeFileSync(`${DOSSIER}${fichier}`, Buffer.from(p.image));
    patches.set(t.youtubeId, { cover: { url: p.url, source: 'musicbrainz', local: `covers/${fichier}` } });
  }
  console.log(`  ok      ${t.artist} - ${t.title}`);
  trouves += 1;
}

if (!DRY && patches.size > 0) {
  const { appliques, orphelins } = patchTracks(['cover'], patches);
  console.log(`\n${appliques} pochette(s) ecrite(s) dans le corpus.`);
  if (orphelins.length > 0) console.log(`${orphelins.length} morceau(x) disparu(s) du corpus pendant la passe, ignore(s).`);
}
console.log(`\n${trouves} trouvee(s) sur ${faits} cherchee(s).`);
if (DRY) console.log("Essai a blanc : rien n'a ete ecrit.");
