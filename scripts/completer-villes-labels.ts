/* LA VILLE DES LABELS QUI N'EN ONT PAS.
 *
 * Mika, le 24 novembre 2026 : « complète les villes des 671 labels ». La
 * carte des maisons meres (src/atlas/CarteLabels.tsx) ne pose un label que
 * dans sa ville ; sans ville, il etait range sous son pays, avec des
 * coordonnees inventees autour de la capitale.
 *
 * ═══ D'OU VIENT LA VILLE, DANS CET ORDRE ═══
 * 1. Wikidata : le siege du label (P159), puis son lieu de fondation (P740).
 * 2. Discogs : l'adresse de contact du label.
 * 3. MusicBrainz : la zone du label, quand ce n'est pas un pays.
 * 4. Les presentations (Discogs, Wikipedia) : seulement une tournure qui dit
 *    le lieu (« based in Leeds », « basé à Lyon »). Voir lib/villes-labels.ts.
 *
 * ═══ CE QUI COMPTE COMME UNE VILLE ═══
 * Une ville du repertoire GeoNames des localites de plus de 5 000 habitants
 * (cities5000), hors quartiers (code PPLX), dans le pays du label ; a
 * homonymes, la plus peuplee. GeoNames ne sert qu'a reconnaitre le nom : le
 * nom affiche, en francais et en anglais, et les coordonnees viennent de
 * Wikidata (CC0), par l'identifiant GeoNames de la ville (P1566). Une ville
 * que Wikidata ne relie pas a GeoNames n'est pas retenue. Aucune ville n'est
 * devinee : un label sans source reste sans ville, range sous son pays.
 *
 * Les coordonnees du label deviennent celles de la ville, a la place du
 * point invente, et villeSource dit d'ou vient la ville.
 *
 * ═══ LES LIMITES DES SOURCES ═══
 * Discogs sans jeton : 25 requetes par minute. MusicBrainz : une par
 * seconde. Le SPARQL de Wikidata : une par minute le 24 novembre 2026 (regle
 * posee pendant une panne), d'ou trois requetes par gros lots. Tout ce qui
 * est lu est garde dans .villes-labels-cache/ (ignore par git) : une reprise
 * ne redemande rien.
 *
 * Usage : npm run completer:villes-labels
 * Puis relire .villes-labels-cache/revue.tsv, une ligne par ville trouvee. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { codeDuPays, type FicheLabel } from '../src/lib/labels.ts';
import { villeDuLabel } from '../src/lib/villes-des-labels.ts';
import { entreesDeLIndex, nettoyerProfil } from './lib/labels-moisson.ts';
import { choisirVille, lieuxDuContact, lieuxDuTexte, paysDuTexte, type Candidat, type Localite } from './lib/villes-labels.ts';

const SORTIE = fileURLToPath(new URL('../src/data/labels.json', import.meta.url));
const INDEX = fileURLToPath(new URL('../src/data/labels-index.json', import.meta.url));
const DOSSIER = fileURLToPath(new URL('../.villes-labels-cache/', import.meta.url));
const CACHE = `${DOSSIER}cache.json`;
const GEONAMES = `${DOSSIER}cities5000.zip`;
const AGENT = 'SonaaAtlas/1.0 (https://sonaa.ca)';
const DISCOGS = process.env['DISCOGS_TOKEN'] ?? '';

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
mkdirSync(DOSSIER, { recursive: true });

interface VilleWikidata {
  readonly fr: string | null;
  readonly en: string | null;
  readonly lat: number;
  readonly lng: number;
}
interface Cache {
  discogs: Record<string, { contact: string; profil: string } | null>;
  musicbrainz: Record<string, string | null>;
  /** Pour un element Wikidata de label : ses lieux (siege rang 1, fondation rang 2). */
  sieges: Record<string, { rang: number; geonames: string | null }[]>;
  /** Pour un identifiant GeoNames : la ville chez Wikidata, ou null. */
  wikidata: Record<string, VilleWikidata | null>;
  /** Les identifiants GeoNames deja cherches par leur nom (voir plus bas). */
  secours: Record<string, true>;
}
const VIDE: Cache = { discogs: {}, musicbrainz: {}, sieges: {}, wikidata: {}, secours: {} };
const cache: Cache = existsSync(CACHE) ? { ...VIDE, ...JSON.parse(readFileSync(CACHE, 'utf8')) } : VIDE;
const garder = (): void => writeFileSync(CACHE, JSON.stringify(cache));

/* ── Les labels sans ville ─────────────────────────────────────────────── */

const fiches = JSON.parse(readFileSync(SORTIE, 'utf8')) as FicheLabel[];
const point = (f: FicheLabel): readonly [number, number] | null =>
  f.latitude != null && f.longitude != null ? [f.latitude, f.longitude] : null;
const cibles = fiches.filter((f) => !f.horsElectronique && !villeDuLabel(f.ville, point(f)));
const idDiscogs = (f: FicheLabel): string | null => /\/label\/(\d+)/.exec(f.discogs ?? '')?.[1] ?? null;
console.log(`${cibles.length} label(s) sans ville.`);

/* ── Le repertoire des villes ──────────────────────────────────────────── */

if (!existsSync(GEONAMES)) {
  console.log('  GeoNames : telechargement de cities5000.zip');
  const r = await fetch('https://download.geonames.org/export/dump/cities5000.zip', { headers: { 'User-Agent': AGENT } });
  if (!r.ok) throw new Error(`GeoNames : reponse ${r.status}`);
  writeFileSync(GEONAMES, Buffer.from(await r.arrayBuffer()));
}

/** Le seul fichier d'une archive zip, lu par son repertoire central. */
function lireZipUnique(zip: Buffer): Buffer {
  const fin = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const central = zip.readUInt32LE(fin + 16);
  const methode = zip.readUInt16LE(central + 10);
  const taille = zip.readUInt32LE(central + 20);
  const local = zip.readUInt32LE(central + 42);
  const debut = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
  const donnees = zip.subarray(debut, debut + taille);
  return methode === 8 ? inflateRawSync(donnees) : donnees;
}

const cleDeNom = (nom: string): string =>
  nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9Ͱ-῿぀-鿿]+/g, ' ')
    .trim();

const villesParCle = new Map<string, Localite[]>();
const villesParId = new Map<string, Localite>();
const indexer = (cle: string, l: Localite): void => {
  const liste = villesParCle.get(cle) ?? [];
  liste.push(l);
  villesParCle.set(cle, liste);
};
/* LES QUARTIERS (PPLX) comptent pour la ville qui les contient : la plus
   peuplee a moins de 15 km. « Hollywood » est Los Angeles, pas Hollywood en
   Floride. */
const quartiers: { noms: string[]; lat: number; lng: number; pop: number; iso: string }[] = [];
for (const ligne of lireZipUnique(readFileSync(GEONAMES)).toString('utf8').split('\n')) {
  const c = ligne.split('\t');
  if (c.length < 15) continue;
  if (c[7] === 'PPLX') {
    quartiers.push({ noms: [c[1] ?? '', c[2] ?? ''], lat: Number(c[4]), lng: Number(c[5]), pop: Number(c[14]) || 0, iso: c[8] ?? '' });
    continue;
  }
  const l: Localite = {
    id: c[0] ?? '',
    fr: null,
    en: c[1] ?? null,
    lat: Number(c[4]),
    lng: Number(c[5]),
    pop: Number(c[14]) || 0,
    iso: c[8] ?? null,
    region: c[10] ?? null,
  };
  villesParId.set(l.id, l);
  /* Le nom, sa forme sans accents, et les autres noms, sauf les codes
     (« LON », « NYC ») qui seraient pris pour des sigles d'adresse. */
  const noms = [c[1] ?? '', c[2] ?? '', ...(c[3] ?? '').split(',').filter((n) => n.length >= 3 && n !== n.toUpperCase())];
  for (const cle of new Set(noms.map(cleDeNom).filter(Boolean))) indexer(cle, l);
}
/* Une grille d'un degre pour trouver vite la ville d'un quartier. */
const grille = new Map<string, Localite[]>();
const case_ = (lat: number, lng: number): string => `${Math.floor(lat)},${Math.floor(lng)}`;
for (const l of villesParId.values()) {
  const k = case_(l.lat, l.lng);
  const liste = grille.get(k) ?? [];
  liste.push(l);
  grille.set(k, liste);
}
const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  return Math.hypot(x, (b.lat - a.lat) * r) * 6371;
};
let rattaches = 0;
for (const q of quartiers) {
  let ville: Localite | null = null;
  for (let dl = -1; dl <= 1; dl += 1) {
    for (const v of [-1, 0, 1].flatMap((dg) => grille.get(case_(q.lat + dl, q.lng + dg)) ?? [])) {
      if (v.iso !== q.iso || v.pop <= q.pop || distanceKm(v, q) > 15) continue;
      if (!ville || v.pop > ville.pop) ville = v;
    }
  }
  if (!ville) continue;
  rattaches += 1;
  for (const cle of new Set(q.noms.map(cleDeNom).filter(Boolean))) indexer(cle, { ...ville, alias: q.noms[0] ?? '' });
}
console.log(`  GeoNames : ${villesParId.size} villes de plus de 5 000 habitants, ${rattaches} quartiers rattaches a leur ville.`);

/* ── Discogs et MusicBrainz, chacun a son rythme, en meme temps ────────── */

async function lireDiscogs(id: string): Promise<{ contact: string; profil: string } | null> {
  for (let essai = 0; essai < 5; essai += 1) {
    const r = await fetch(`https://api.discogs.com/labels/${id}`, {
      headers: { 'User-Agent': AGENT, ...(DISCOGS ? { Authorization: `Discogs token=${DISCOGS}` } : {}) },
    }).catch(() => null);
    if (r?.status === 404) return null;
    if (r?.ok) {
      const j = (await r.json()) as { contact_info?: string; profile?: string };
      return { contact: j.contact_info ?? '', profil: nettoyerProfil(j.profile ?? '') };
    }
    await pause(r?.status === 429 ? 60_000 : 5_000);
  }
  return null;
}

async function lireMusicBrainz(id: string): Promise<string | null> {
  const demander = async (chemin: string): Promise<unknown> => {
    for (let essai = 0; essai < 4; essai += 1) {
      await pause(1_100);
      const r = await fetch(`https://musicbrainz.org/ws/2/${chemin}`, { headers: { 'User-Agent': AGENT } }).catch(() => null);
      if (r?.status === 404) return null;
      if (r?.ok) return r.json();
      await pause(5_000);
    }
    return null;
  };
  const url = (await demander(`url?resource=${encodeURIComponent(`https://www.discogs.com/label/${id}`)}&inc=label-rels&fmt=json`)) as {
    relations?: { label?: { id: string } }[];
  } | null;
  const mbid = url?.relations?.find((r) => r.label)?.label?.id;
  if (!mbid) return null;
  const label = (await demander(`label/${mbid}?fmt=json`)) as { area?: { name?: string } } | null;
  return label?.area?.name ?? null;
}

const avecDiscogs = cibles.map(idDiscogs).filter((x): x is string => Boolean(x));
await Promise.all([
  (async () => {
    let n = 0;
    for (const id of avecDiscogs) {
      if (id in cache.discogs) continue;
      cache.discogs[id] = await lireDiscogs(id);
      n += 1;
      if (n % 25 === 0) {
        garder();
        console.log(`  Discogs : ${n} lus`);
      }
      await pause(DISCOGS ? 1_100 : 2_600);
    }
  })(),
  (async () => {
    let n = 0;
    for (const id of avecDiscogs) {
      if (id in cache.musicbrainz) continue;
      cache.musicbrainz[id] = await lireMusicBrainz(id);
      n += 1;
      if (n % 25 === 0) {
        garder();
        console.log(`  MusicBrainz : ${n} lus`);
      }
    }
  })(),
]);
garder();

/* ── Wikidata, par gros lots : une requete par minute ──────────────────── */

let derniereRequete = 0;
async function sparql(requete: string): Promise<Record<string, { value: string }>[]> {
  for (let essai = 0; essai < 6; essai += 1) {
    const attente = derniereRequete + 62_000 - Date.now();
    if (attente > 0) await pause(attente);
    derniereRequete = Date.now();
    const r = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: {
        'User-Agent': AGENT,
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ query: requete }).toString(),
    }).catch(() => null);
    if (r?.ok) return ((await r.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
    console.log(`  Wikidata : reponse ${r?.status ?? 'absente'}, nouvel essai dans une minute`);
  }
  throw new Error('Wikidata ne repond pas.');
}
const valeur = (b: Record<string, { value: string }>, cle: string): string | null => b[cle]?.value ?? null;

/* 1. Le siege et le lieu de fondation, par l'identifiant GeoNames du lieu. */
const items = cibles.map((f) => f.wikidata).filter((x): x is string => Boolean(x) && !(x! in cache.sieges));
if (items.length > 0) {
  console.log(`  Wikidata : sieges de ${items.length} labels`);
  const lignes = await sparql(`SELECT ?item ?rang ?gn WHERE {
    VALUES ?item { ${items.map((i) => `wd:${i}`).join(' ')} }
    VALUES (?p ?rang) { (wdt:P159 1) (wdt:P740 2) }
    ?item ?p ?lieu .
    OPTIONAL { ?lieu wdt:P1566 ?gn }
  }`);
  for (const i of items) cache.sieges[i] = [];
  for (const b of lignes) {
    const item = valeur(b, 'item')?.split('/').pop() ?? '';
    cache.sieges[item]?.push({ rang: Number(valeur(b, 'rang')), geonames: valeur(b, 'gn') });
  }
  garder();
}

/* 2. Les candidats de chaque label, et la ville que chacun designe. */
const choix = new Map<string, { localite: Localite; source: NonNullable<FicheLabel['villeSource']>; via: string }>();
for (const f of cibles) {
  const idD = idDiscogs(f);
  /* Sans pays sur la fiche, celui que l'adresse ecrit (« ..., Canada »). */
  const iso = codeDuPays(f.pays) ?? paysDuTexte((idD ? cache.discogs[idD]?.contact : null) ?? '');
  for (const { geonames } of [...(f.wikidata ? (cache.sieges[f.wikidata] ?? []) : [])].sort((a, b) => a.rang - b.rang)) {
    const l = geonames ? villesParId.get(geonames) : undefined;
    if (l) {
      choix.set(f.slug, { localite: l, source: 'wikidata', via: `geonames ${geonames}` });
      break;
    }
  }
  if (choix.has(f.slug)) continue;

  const id = idDiscogs(f);
  const d = id ? cache.discogs[id] : null;
  const zone = id ? cache.musicbrainz[id] : null;
  const candidats: Candidat[] = [
    ...(d?.contact ? lieuxDuContact(d.contact) : []),
    ...(zone ? [{ nom: zone, rang: 2, force: 1 }] : []),
    ...lieuxDuTexte([d?.profil, f.profil, f.resume.en, f.resume.fr].filter(Boolean).join('\n')),
  ];
  const localites = new Map(
    candidats.map((c) => [
      c.nom,
      (villesParCle.get(cleDeNom(c.nom)) ?? []).map((l) => ({ ...l, exact: cleDeNom(l.alias ?? l.en ?? '') === cleDeNom(c.nom) })),
    ])
  );
  const r = choisirVille(candidats, localites, iso);
  if (r) {
    const source = r.candidat.rang === 1 ? 'discogs' : r.candidat.rang === 2 ? 'musicbrainz' : 'presentation';
    choix.set(f.slug, { localite: r.localite, source, via: r.candidat.nom });
  }
}

/** « Point(6.9577 50.9422) » : la longitude d'abord. */
function lirePoint(brut: string | null): { lat: number; lng: number } | null {
  const [lng, lat] = (/Point\(([-\d.]+) ([-\d.]+)\)/.exec(brut ?? '') ?? []).slice(1).map(Number);
  return lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/* 3. Le nom francais et anglais et les coordonnees des villes retenues.
   PLUSIEURS ELEMENTS PEUVENT PORTER LE MEME IDENTIFIANT GEONAMES : la ville,
   son aire urbaine (« Tampere urban area »), un element cree par un robot
   (« lsjbot Duisburg »). On ne garde qu'un element qui porte le nom de la
   ville chez GeoNames, le plus peuple ; sinon la ville est cherchee par son
   nom (etape 4). */
const aNommer = [...new Set([...choix.values()].map((c) => c.localite.id))].filter((gn) => !(gn in cache.wikidata));
for (let i = 0; i < aNommer.length; i += 300) {
  const lot = aNommer.slice(i, i + 300);
  console.log(`  Wikidata : noms de ${lot.length} villes`);
  const lignes = await sparql(`SELECT ?gn ?lieu ?coord ?pop ?fr ?en ?memeNom WHERE {
    hint:Query hint:optimizer "None" .
    VALUES (?gn ?nomGn) { ${lot.map((gn) => `(${JSON.stringify(gn)} ${JSON.stringify(villesParId.get(gn)?.en ?? '')})`).join(' ')} }
    ?lieu wdt:P1566 ?gn .
    ?lieu wdt:P625 ?coord .
    OPTIONAL { ?lieu wdt:P1082 ?pop }
    OPTIONAL { ?lieu rdfs:label ?fr FILTER(LANG(?fr) = "fr") }
    OPTIONAL { ?lieu rdfs:label ?en FILTER(LANG(?en) = "en") }
    BIND(EXISTS { ?lieu rdfs:label ?l . FILTER(STR(?l) = ?nomGn) } AS ?memeNom)
  }`);
  for (const gn of lot) {
    let meilleure: { w: VilleWikidata; nom: boolean; pop: number } | null = null;
    for (const b of lignes.filter((x) => valeur(x, 'gn') === gn)) {
      const p = lirePoint(valeur(b, 'coord'));
      if (!p) continue;
      const nom = valeur(b, 'memeNom') === 'true';
      const pop = Number(valeur(b, 'pop') ?? 0) || 0;
      if (!nom) continue;
      if (!meilleure || pop > meilleure.pop) {
        meilleure = { w: { fr: valeur(b, 'fr'), en: valeur(b, 'en'), ...p }, nom, pop };
      }
    }
    cache.wikidata[gn] = meilleure?.w ?? null;
  }
  garder();
}

/* 4. LA VILLE QUE WIKIDATA RATTACHE A UN AUTRE IDENTIFIANT GEONAMES. Pour
   Cologne, Barcelone ou Hanovre, Wikidata pointe la commune administrative
   de GeoNames, pas le lieu habite : on les cherche alors par leur nom, dans
   leur pays, et on ne garde qu'un element peuple a moins de 25 km du point
   GeoNames, le plus peuple (pas l'arrondissement ni la circonscription du
   meme nom). */
const LANGUES: Readonly<Record<string, string>> = {
  DE: 'de', AT: 'de', CH: 'de', NL: 'nl', BE: 'nl', IT: 'it', ES: 'es', MX: 'es', AR: 'es', CL: 'es', CO: 'es',
  BR: 'pt', PT: 'pt', SE: 'sv', NO: 'nb', DK: 'da', FI: 'fi', PL: 'pl', RU: 'ru', RO: 'ro', GR: 'el', HU: 'hu',
  CZ: 'cs', JP: 'ja', IL: 'he', UA: 'uk', SI: 'sl', RS: 'sr', LT: 'lt', BG: 'bg', TR: 'tr', IS: 'is',
};
const parSecours = [...new Set([...choix.values()].map((c) => c.localite.id))].filter(
  (gn) => cache.wikidata[gn] === null && !cache.secours[gn]
);
if (parSecours.length > 0) {
  console.log(`  Wikidata : ${parSecours.length} villes cherchees par leur nom`);
  const tuples = parSecours.flatMap((gn) => {
    const l = villesParId.get(gn);
    if (!l?.en || !l.iso) return [];
    const langues = new Set(['en', 'fr', ...(LANGUES[l.iso] ? [LANGUES[l.iso]] : [])]);
    return [...langues].map((lg) => `(${JSON.stringify(gn)} ${JSON.stringify(l.en)}@${lg} ${JSON.stringify(l.iso)})`);
  });
  /* L'ordre impose (le nom d'abord) : laisse a lui-meme, l'optimiseur de
     Wikidata partait des pays et depassait le delai (504, le 24 novembre). */
  const lignes = await sparql(`SELECT ?gn ?lieu ?coord ?pop ?fr ?en WHERE {
    hint:Query hint:optimizer "None" .
    VALUES (?gn ?nom ?iso) { ${tuples.join(' ')} }
    ?lieu rdfs:label ?nom .
    ?lieu wdt:P17 ?pays .
    ?pays wdt:P297 ?iso .
    ?lieu wdt:P625 ?coord .
    ?lieu wdt:P1082 ?pop .
    OPTIONAL { ?lieu rdfs:label ?fr FILTER(LANG(?fr) = "fr") }
    OPTIONAL { ?lieu rdfs:label ?en FILTER(LANG(?en) = "en") }
  }`);
  for (const gn of parSecours) {
    cache.secours[gn] = true;
    const g = villesParId.get(gn);
    if (!g) continue;
    let meilleure: { w: VilleWikidata; pop: number } | null = null;
    for (const b of lignes.filter((x) => valeur(x, 'gn') === gn)) {
      const p = lirePoint(valeur(b, 'coord'));
      if (!p) continue;
      const w = { fr: valeur(b, 'fr'), en: valeur(b, 'en'), ...p };
      const pop = Number(valeur(b, 'pop') ?? 0) || 0;
      if (pop <= 0 || distanceKm(w, g) > 25) continue;
      if (!meilleure || pop > meilleure.pop) meilleure = { w, pop };
    }
    cache.wikidata[gn] = meilleure?.w ?? null;
  }
  garder();
}

/* ── L'ecriture ────────────────────────────────────────────────────────── */

const arrondi = (x: number): number => Number(x.toFixed(4));
const parSource: Record<string, number> = {};
const revue: string[] = ['slug\tpays du label\tsource\tlu\tville\tpays de la ville\tgeonames'];
const completees = new Map<string, FicheLabel>();
let sansWikidata = 0;

for (const f of cibles) {
  const c = choix.get(f.slug);
  if (!c) continue;
  const w = cache.wikidata[c.localite.id];
  const fr = w?.fr ?? w?.en;
  const en = w?.en ?? w?.fr;
  if (!w || !fr || !en) {
    sansWikidata += 1;
    continue;
  }
  parSource[c.source] = (parSource[c.source] ?? 0) + 1;
  revue.push([f.slug, f.pays ?? '', c.source, c.via, fr, c.localite.iso ?? '', c.localite.id].join('\t'));
  completees.set(f.slug, {
    ...f,
    ville: { fr, en },
    latitude: arrondi(w.lat),
    longitude: arrondi(w.lng),
    villeSource: c.source,
  });
}

const toutes = fiches.map((f) => completees.get(f.slug) ?? f);
writeFileSync(SORTIE, `${JSON.stringify(toutes, null, 1)}\n`);
writeFileSync(INDEX, `${JSON.stringify(entreesDeLIndex(toutes))}\n`);
writeFileSync(`${DOSSIER}revue.tsv`, `${revue.join('\n')}\n`);
console.log(
  `\n${completees.size} ville(s) trouvee(s) sur ${cibles.length} : ${Object.entries(parSource)
    .map(([s, n]) => `${n} par ${s}`)
    .join(', ')}. ${sansWikidata} ecartee(s) faute de fiche Wikidata, ${cibles.length - completees.size} label(s) restent sans ville.`
);
