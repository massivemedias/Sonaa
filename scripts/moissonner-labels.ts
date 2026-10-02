/* LA MOISSON DES LABELS : une fiche par label que l'atlas connait.
 *
 * Usage : npm run moissonner:labels                 (tout, en reprenant)
 *         npm run moissonner:labels -- --refaire     (tout, de zero)
 *         npm run moissonner:labels -- --seulement="F Communications"
 *         npm run moissonner:labels -- --tranche     (la nuit : un 28e refait)
 *
 * Voir src/lib/labels.ts pour ce que la page en fait.
 *
 * ═══ QUELS LABELS ═══
 *
 * Tous ceux que le corpus cite sur un morceau, et ceux que les fiches des
 * styles nomment sans qu'aucun morceau les porte (Skam pour l'IDM). Il y en
 * avait d'abord un seuil, trois morceaux ou une page Wikipedia ; Mika a
 * demande les petits aussi, le 1er octobre 2026. Une fiche qui ne trouve
 * rien nulle part (ni morceau, ni Discogs, ni Wikipedia) n'est pas ecrite.
 *
 * ═══ D'OU VIENT CHAQUE CHAMP, ET SOUS QUELLE LICENCE ═══
 *
 * - Wikidata (CC0) : le pays, l'annee de fondation, les fondateurs, le site,
 *   l'identifiant Discogs, les adresses des pages Wikipedia. Interroge par
 *   lots de quarante noms, en exigeant que l'element soit un label (P31,
 *   sous-classe de Q18127) : « Tresor » est aussi un club.
 * - Wikipedia (CC BY-SA) : le resume de la page, en francais et en
 *   anglais. La page cite sa source par un lien, comme la licence le demande.
 * - Discogs : les sorties du label que le plus de gens possedent, triees par
 *   Discogs lui-meme, et la presentation du label quand Wikipedia n'en a pas.
 *   La recherche de Discogs est floue (« F Communications » ramene aussi
 *   F-Beat) : on ne garde que les sorties dont le label est exactement le bon.
 *
 * Aucune cle ne s'ecrit ici : le jeton Discogs vient de .env, lu par Node. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cleDeLabel, nomsDeLabels, succes, estSansLabel, type FicheLabel, type SortieConnue } from '../src/lib/labels.ts';
import { slug } from '../src/lib/chemins.ts';
import { nettoyerProfil, sansTirets, variantes } from './lib/labels-moisson.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const SORTIE = fileURLToPath(new URL('../src/data/labels.json', import.meta.url));
const INDEX = fileURLToPath(new URL('../src/data/labels-index.json', import.meta.url));
const AGENT = 'SonaaAtlas/1.0 (https://sonaa.ca; massivemedias@gmail.com)';
const DISCOGS = process.env['DISCOGS_TOKEN'] ?? '';
const REFAIRE = process.argv.includes('--refaire');
/* LE ROULEMENT DE LA NUIT. Tout refaire le premier du mois prenait plus de
   deux heures avec les petits labels, au-dela des 90 minutes de la moisson
   automatique. Chaque nuit refait donc un vingt-huitieme des fiches, choisi
   par le nom : tout est rafraichi en quatre semaines. Un label nomme par une
   fiche de style et introuvable n'est recherche que dans sa tranche. */
const TRANCHE = process.argv.includes('--tranche');
const dansLaTranche = (cle: string): boolean => {
  let h = 0;
  for (let i = 0; i < cle.length; i += 1) h = (h * 31 + cle.charCodeAt(i)) % 9973;
  return h % 28 === (new Date().getUTCDate() - 1) % 28;
};
const SEULEMENT = process.argv.find((a) => a.startsWith('--seulement='))?.slice('--seulement='.length) ?? null;

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/* UNE ADRESSE QUI RESSEMBLE A UNE CLE N'ENTRE PAS : le controle des secrets
   du deploiement la refuserait (voir scripts/check-secrets-dist.mjs). */
const suspecte = (u: string): boolean => /ghp_|github_pat_|AIza|sk-[A-Za-z0-9]{16}|sb_secret_|eyJhbGciOi/.test(u);

/* ── 1. Les labels du corpus ─────────────────────────────────────────── */

/* LES CORRECTIONS A LA MAIN, relues le 1er octobre 2026 sur la moisson des
   petits labels. Chaque liste dit ce qu'une regle ne pouvait pas deviner. */

/** Ce que le corpus range dans la case « label » et qui n'en est pas un : des
    magazines (leurs mix offerts en couverture) et un studio de mastering. */
const PAS_DES_LABELS = new Set(['alchemy mastering', 'mixmag', 'xlr8r', 'knowledge magazine']);

/** Des noms que les fiches des styles citent, et que Wikidata et Discogs
    attribuent a un homonyme : « Tesco » y est la chaine de supermarches,
    « Wild Bunch » une societe de cinema, « Coyote » un studio de Portland.
    Ils restent ecrits dans la fiche du style, sans page. */
const NOMS_ECARTES = new Set(
  [
    'Acid Test', 'Blackout', 'Coyote', 'Cyber', 'DAT Records', 'Evolution', 'Formation', 'FUSE', 'Guidance', 'Insomniac Records',
    'Jazzanova', 'King Street', 'Les Disques du Soleil', 'Lost & Found', "Movin'", 'Mystic Sound', 'Noise Maker', 'People', 'Polaris',
    'PPU', 'Pure Trance', 'Slip-N-Slide', 'Southern Fried', 'Subculture', 'Sudbeats', 'TCP', 'Tesco', 'Things To Come', 'Transmission',
    'VIM', 'Wild Bunch',
  ].map(cleDeLabel)
);

/** Le meme label sous un autre nom, que la recherche et les fiches des
    styles doivent retrouver : Tidy Trax est Tidy, Play It Again Sam est
    [PIAS]. */
const AUTRES_NOMS: Readonly<Record<string, readonly string[]>> = {
  tidy: ['tidy trax'],
  'd j international records': ['dj international'],
  'pias recordings': ['play it again sam'],
  'esl music': ['eighteenth street lounge'],
};
const DEJA_NOMMES = new Set(Object.values(AUTRES_NOMS).flat());

/** Des labels dont la fiche Discogs trouvee par le nom est celle d'un autre. */
const DISCOGS_HOMONYMES = new Set(['clarity recordings', 'fox']);

interface LabelDuCorpus {
  cle: string;
  nom: string;
  graphies: Map<string, number>;
  n: number;
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: { tracks: { release?: { label?: string } | null }[]; labelsHistoriques?: string[]; labelsActuels?: string[] | null }[];
};
const parCle = new Map<string, LabelDuCorpus>();
for (const g of corpus.genres) {
  for (const t of g.tracks) {
    const nom = t.release?.label?.trim();
    if (!nom || estSansLabel(nom) || PAS_DES_LABELS.has(cleDeLabel(nom))) continue;
    const cle = cleDeLabel(nom);
    const l = parCle.get(cle) ?? { cle, nom, graphies: new Map(), n: 0 };
    l.n += 1;
    l.graphies.set(nom, (l.graphies.get(nom) ?? 0) + 1);
    parCle.set(cle, l);
  }
}
for (const l of parCle.values()) l.nom = [...l.graphies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? l.nom;

/* LES LABELS AJOUTES A LA MAIN, absents du corpus. VRSTL Records, le label
   de Mika : l'atlas ne cite aucun morceau de son auteur (ADR-050), mais la
   galerie est un annuaire, et Mika veut y trouver son label (1er octobre
   2026). Sa fiche vient de Discogs comme celle des autres. */
const AJOUTS: readonly { nom: string; pays: string; fondateurs: string[]; site: string }[] = [
  { nom: 'VRSTL Records', pays: 'Canada', fondateurs: ['Maudite Machine'], site: 'https://vrstlrecords.com' },
];
const AJOUTE = new Map(AJOUTS.map((a) => [cleDeLabel(a.nom), a]));
for (const a of AJOUTS) {
  const cle = cleDeLabel(a.nom);
  if (!parCle.has(cle)) parCle.set(cle, { cle, nom: a.nom, graphies: new Map([[a.nom, 0]]), n: 0 });
}
/* LES LABELS QUE LES FICHES DES STYLES NOMMENT, sans morceau dans l'atlas.
   « Warp » est deja la sous « Warp Records » : un nom qui egale un label du
   corpus, a « Records » pres, n'en cree pas un second. */
const racineDuNom = (cle: string): string => cle.replace(/ (records|recordings|music|label)$/, '');
const racinesDuCorpus = new Set([...parCle.keys()].map(racineDuNom));
const NOMMES = new Set<string>();
for (const g of corpus.genres) {
  for (const nom of [...(g.labelsHistoriques ?? []), ...(g.labelsActuels ?? [])].flatMap(nomsDeLabels)) {
    const cle = cleDeLabel(nom);
    if (!cle || estSansLabel(nom) || parCle.has(cle) || racinesDuCorpus.has(racineDuNom(cle)) || NOMS_ECARTES.has(cle) || DEJA_NOMMES.has(cle)) continue;
    parCle.set(cle, { cle, nom, graphies: new Map([[nom, 0]]), n: 0 });
    racinesDuCorpus.add(racineDuNom(cle));
    NOMMES.add(cle);
  }
}
let labels = [...parCle.values()];
const tousLesNoms = new Set(labels.map((l) => l.cle));
if (SEULEMENT) labels = labels.filter((l) => l.cle === cleDeLabel(SEULEMENT));
console.log(`${labels.length} label(s) : ${labels.length - NOMMES.size - AJOUTS.length} du corpus, ${NOMMES.size} nommes par les fiches des styles.`);

/* ── 2. Wikidata ─────────────────────────────────────────────────────── */

interface Candidat {
  item: string;
  logo: string | null;
  exact: boolean;
  /** Trouve par un autre nom de l'element, pas par son nom. */
  alias: boolean;
  /** Le nom de l'element, en francais ou en anglais. */
  nomWikidata: string;
  pays: string | null;
  annee: number | null;
  site: string | null;
  discogs: string | null;
  enwiki: string | null;
  frwiki: string | null;
}

async function sparql(requete: string): Promise<Record<string, { value: string }>[]> {
  for (let essai = 0; essai < 4; essai += 1) {
    const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(requete)}`, {
      headers: { 'User-Agent': AGENT, Accept: 'application/sparql-results+json' },
    }).catch(() => null);
    if (r?.ok) return ((await r.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
    await pause(3000 * (essai + 1));
  }
  return [];
}

const candidats = new Map<string, Candidat[]>();
for (let i = 0; i < labels.length; i += 40) {
  const lot = labels.slice(i, i + 40);
  const parVariante = new Map<string, { cle: string; exact: boolean }[]>();
  for (const l of lot) {
    for (const v of variantes(l.nom)) {
      const liste = parVariante.get(v) ?? [];
      liste.push({ cle: l.cle, exact: v === l.nom });
      parVariante.set(v, liste);
    }
  }
  const valeurs = [...parVariante.keys()].map((v) => `${JSON.stringify(v)}@en`).join(' ');
  const lignes = await sparql(`SELECT ?nom ?item ?itemLabel ?alias ?paysLabel ?debut ?site ?discogs ?enwiki ?frwiki ?logo WHERE {
    VALUES ?nom { ${valeurs} }
    { ?item rdfs:label ?nom } UNION { ?item skos:altLabel ?nom . BIND(true AS ?alias) }
    ?item wdt:P31/wdt:P279* wd:Q18127 .
    OPTIONAL { ?item wdt:P17 ?pays }
    OPTIONAL { ?item wdt:P571 ?debut }
    OPTIONAL { ?item wdt:P856 ?site }
    OPTIONAL { ?item wdt:P1955 ?discogs }
    OPTIONAL { ?item wdt:P154 ?logo }
    OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL { ?frwiki schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
  }`);
  for (const b of lignes) {
    const nom = b['nom']?.value ?? '';
    for (const { cle, exact } of parVariante.get(nom) ?? []) {
      const liste = candidats.get(cle) ?? [];
      const item = b['item']?.value.split('/').pop() ?? '';
      /* Le meme element peut revenir par plusieurs graphies : il garde la
         meilleure (le nom exact, et son vrai nom plutot qu'un autre). */
      const vu = liste.find((c) => c.item === item);
      if (vu) {
        vu.exact ||= exact;
        vu.alias &&= b['alias']?.value === 'true';
        continue;
      }
      const debut = Number.parseInt((b['debut']?.value ?? '').slice(0, 4), 10);
      const logo = b['logo']?.value ? decodeURIComponent(b['logo'].value.split('/').pop() ?? '') : null;
      liste.push({
        item,
        logo,
        exact,
        alias: b['alias']?.value === 'true',
        nomWikidata: b['itemLabel']?.value ?? '',
        pays: b['paysLabel']?.value ?? null,
        annee: Number.isFinite(debut) && debut > 1800 ? debut : null,
        site: b['site']?.value ?? null,
        discogs: b['discogs']?.value ?? null,
        enwiki: b['enwiki']?.value ?? null,
        frwiki: b['frwiki']?.value ?? null,
      });
      candidats.set(cle, liste);
    }
  }
  process.stdout.write(`\rWikidata : ${Math.min(i + 40, labels.length)}/${labels.length}`);
  await pause(400);
}
console.log('');

/** Le meilleur candidat : le nom exact avant une variante, puis celui qui a
    des pages Wikipedia. */
function choisir(liste: readonly Candidat[] | undefined): Candidat | null {
  if (!liste || liste.length === 0) return null;
  const note = (c: Candidat): number => (c.exact ? 4 : 0) + (c.frwiki ? 2 : 0) + (c.enwiki ? 1 : 0);
  return [...liste].sort((a, b) => note(b) - note(a))[0] ?? null;
}

/* UN NOM DE MOINS DE QUATRE LETTRES SE MEFIE DES AUTRES NOMS : « TME », le
   label hardstyle de Showtek, devenait Tencent Music Entertainment, dont
   c'est un autre nom (constate le 1er octobre 2026). Mais 12k s'appelle
   vraiment ainsi : refuser tous les noms courts le faisait disparaitre. */
const court = (cle: string): boolean => cle.replace(/ /g, '').length < 4;
/* UN ANCIEN NOM N'EST PAS UN AUTRE LABEL : 4AD s'est appele Axis, et le
   Axis de Jeff Mills devenait 4AD (constate le 1er octobre 2026). Un element
   trouve par un autre nom, alors qu'un label du corpus porte son vrai nom,
   appartient a ce label-la. */
const racine = (cle: string): string => cle.replace(/( (records|recordings|music|label|group|entertainment))+$/, '');
/* Un autre nom qui a la meme racine que le vrai (« Skint » pour « Skint
   Records ») est le meme label. Un autre nom sans parente (« Axis » pour
   4AD, « TME » pour Tencent Music Entertainment) n'est cru que si le nom
   est assez long et que le vrai nom n'est pas lui-meme un label du corpus. */
const acceptable = (c: Candidat, cle: string): boolean => {
  if (!c.alias) return true;
  const vrai = cleDeLabel(c.nomWikidata);
  if (racine(vrai) === racine(cle)) return true;
  return !court(cle) && !tousLesNoms.has(vrai);
};
/* LES HOMONYMES : le Wikidata d'un autre label du meme nom. Titanic Records
   y est un label americain de 1973, celui du corpus sort du hardstyle. */
const HOMONYMES = new Set(['titanic records']);
const tousRetenus = labels
  .map((l) => ({
    l,
    wd: HOMONYMES.has(l.cle)
      ? null
      : choisir(candidats.get(l.cle)?.filter((c) => acceptable(c, l.cle))),
  }))
  .filter(({ l, wd }) => l.n >= 1 || wd?.frwiki || wd?.enwiki || AJOUTE.has(l.cle) || NOMMES.has(l.cle));

/* UN LABEL, UNE PAGE. Le corpus ecrit « Armada » et « Armada Music », « Out
   Of Line » et « Out Of Line Music » : deux graphies, un seul element
   Wikidata, et la galerie montrait deux fois le meme logo (vu le 1er octobre
   2026). Les graphies d'un meme element se fondent dans celle qui a le plus
   de morceaux ; les adresses des autres restent, en renvoi vers elle. */
/* Deux paires que Wikidata ne relie pas : Young Turks s'appelle Young depuis
   2021, et V2 n'y est trouve que sous V2 Records. */
const FUSIONS: Readonly<Record<string, string>> = { 'young turks': 'young', young: 'young', v2: 'v2', 'v2 records': 'v2' };
const groupe = (r: (typeof tousRetenus)[number]): string | undefined => (FUSIONS[r.l.cle] ? `fusion:${FUSIONS[r.l.cle]}` : r.wd?.item);
const tete = new Map<string, (typeof tousRetenus)[number]>();
for (const r of tousRetenus) {
  const item = groupe(r);
  if (!item) continue;
  const deja = tete.get(item);
  if (!deja || r.l.n > deja.l.n) tete.set(item, r);
}
const anciens = new Map<string, string[]>();
const retenus = tousRetenus.filter((r) => {
  const g = groupe(r);
  const t = g ? tete.get(g) : undefined;
  if (!t || t === r) return true;
  t.l.n += r.l.n;
  t.wd ??= r.wd;
  for (const [g, k] of r.l.graphies) t.l.graphies.set(g, (t.l.graphies.get(g) ?? 0) + k);
  anciens.set(t.l.cle, [...(anciens.get(t.l.cle) ?? []), slug(r.l.nom) || slug(r.l.cle)]);
  return false;
});
console.log(`${retenus.length} label(s) retenu(s).`);

/* Les fondateurs, en une requete par lot d'elements. */
const fondateurs = new Map<string, string[]>();
const items = retenus.map((r) => r.wd?.item).filter((x): x is string => Boolean(x));
for (let i = 0; i < items.length; i += 80) {
  const lignes = await sparql(`SELECT ?item ?fLabel WHERE {
    VALUES ?item { ${items.slice(i, i + 80).map((q) => `wd:${q}`).join(' ')} }
    ?item wdt:P112 ?f .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
  }`);
  for (const b of lignes) {
    const q = b['item']?.value.split('/').pop() ?? '';
    const n = b['fLabel']?.value ?? '';
    if (!n || /^Q\d+$/.test(n)) continue;
    fondateurs.set(q, [...new Set([...(fondateurs.get(q) ?? []), n])]);
  }
  await pause(400);
}

/* LES IMAGES DE DISCOGS QUE LA GALERIE NE MONTRE PAS, relues une a une le
   1er octobre 2026. Celle d'Industrial Records est une photo du camp
   d'Auschwitz, celle de Cold Meat Industry des carcasses pendues, celle de
   Titanic Records evoque une croix gammee. Vraies, mais pas en vignette :
   le monogramme les remplace. */
const IMAGES_REFUSEES = new Set(['industrial records', 'cold meat industry', 'titanic records']);

/* ── 2 bis. Les logos de Wikimedia Commons ────────────────────────────── */

/* LE LOGO DU LABEL, quand Wikidata en connait un (P154). Il est sur Commons,
   souvent en SVG, donc net a toutes les tailles ; on n'en garde que ceux dont
   la licence est libre (beaucoup sont « PD-textlogo », un logo fait de
   lettres n'etant pas protegeable), et on garde l'auteur et la page pour le
   credit. A defaut, la moisson prend l'image du label chez Discogs. */
const LIBRES = /^(cc0|public domain|pd|cc by|cc-by)/i;
const logosCommons = new Map<string, { url: string; credit: string; page: string }>();
const fichiersLogo = [...new Set(retenus.map((r) => r.wd?.logo).filter((x): x is string => Boolean(x)))];
for (let i = 0; i < fichiersLogo.length; i += 40) {
  const titres = fichiersLogo.slice(i, i + 40).map((f) => `File:${f}`).join('|');
  try {
    const r = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=360&titles=${encodeURIComponent(titres)}`,
      { headers: { 'User-Agent': AGENT } }
    );
    const j = (await r.json()) as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }> };
    };
    for (const page of Object.values(j.query?.pages ?? {})) {
      const ii = page.imageinfo?.[0];
      const licence = (ii?.extmetadata?.['LicenseShortName']?.value ?? '').replace(/<[^>]+>/g, '').trim();
      if (!ii?.thumburl || !LIBRES.test(licence)) continue;
      const auteur = (ii.extmetadata?.['Artist']?.value ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const fichier = (page.title ?? '').replace(/^File:/, '');
      logosCommons.set(fichier, {
        url: ii.thumburl,
        credit: sansTirets(`${auteur && !/^unknown/i.test(auteur) ? `${auteur}, ` : ''}${licence}, Wikimedia Commons`),
        page: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fichier)}`,
      });
    }
  } catch {
    /* Commons muet : les labels prendront l'image de Discogs. */
  }
  await pause(500);
}
console.log(`${logosCommons.size} logo(s) libre(s) sur Commons.`);

/* ── 3. Wikipedia ────────────────────────────────────────────────────── */

/** Le resume de la page, coupe a la fin d'une phrase vers 700 signes. */
async function resume(adresse: string | null): Promise<string | undefined> {
  if (!adresse) return undefined;
  const m = /^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/(.+)$/.exec(adresse);
  if (!m) return undefined;
  try {
    const r = await fetch(`https://${m[1]}.wikipedia.org/api/rest_v1/page/summary/${m[2]}`, { headers: { 'User-Agent': AGENT } });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { extract?: string; type?: string; title?: string };
    if (j.type === 'disambiguation' || !j.extract) return undefined;
    /* UNE PAGE QUI REDIRIGE PARLE D'AUTRE CHOSE : « Gold Mind Records »
       renvoie a la biographie de son fondateur, Norman Harris. On ne garde
       que le resume de la page demandee elle-meme. */
    const demande = decodeURIComponent(m[2] ?? '').replace(/_/g, ' ').toLowerCase();
    if (j.title && j.title.toLowerCase() !== demande) return undefined;
    const texte = sansTirets(j.extract.replace(/\s+/g, ' ').trim());
    if (texte.length <= 700) return texte;
    const coupe = texte.slice(0, 700).lastIndexOf('. ');
    return coupe > 200 ? texte.slice(0, coupe + 1) : `${texte.slice(0, 700)}…`;
  } catch {
    return undefined;
  }
}

/* ── 4. Discogs ──────────────────────────────────────────────────────── */

async function discogs(chemin: string): Promise<unknown> {
  if (!DISCOGS) return null;
  for (let essai = 0; essai < 5; essai += 1) {
    /* UNE COUPURE DU RESEAU N'ARRETE PAS LA MOISSON : le 1er octobre 2026,
       un DNS absent une seconde l'a fait tomber a la fiche 486 sur 1560. On
       attend, et on reessaie. */
    const r = await fetch(`https://api.discogs.com${chemin}`, {
      headers: { 'User-Agent': AGENT, Authorization: `Discogs token=${DISCOGS}` },
    }).catch(() => null);
    if (!r) {
      await pause(15000);
      continue;
    }
    /* SOIXANTE REQUETES A LA MINUTE avec un jeton : une seconde entre deux,
       et une attente plus longue quand Discogs dit que c'est trop. */
    await pause(1100);
    if (r.status === 429) {
      await pause(20000);
      continue;
    }
    return r.ok ? r.json() : null;
  }
  return null;
}

/* LES SORTIES ELECTRONIQUES D'ABORD. Un label generaliste (Columbia,
   Atlantic, Virgin) a pour disques les plus possedes Miles Davis et Bruce
   Springsteen : vrai, mais hors sujet dans un atlas des musiques
   electroniques. On demande donc d'abord a Discogs ses sorties du genre
   « Electronic », et toutes ses sorties seulement s'il y en a moins de
   quatre (un label de house n'a pas toujours le genre ecrit partout). */
async function sortiesConnues(nomDiscogs: string, cle: string): Promise<SortieConnue[]> {
  const electroniques = await sortiesDuGenre(nomDiscogs, cle, 'Electronic', 'master');
  if (electroniques.length >= 4) return electroniques;
  const toutes = await sortiesDuGenre(nomDiscogs, cle, null, 'master');
  if (toutes.length >= 4) return toutes;
  /* UN PETIT LABEL NUMERIQUE N'A SOUVENT PAS DE « MASTER » chez Discogs, ses
     disques n'existant qu'en une edition : on prend alors ses sorties. */
  const editions = await sortiesDuGenre(nomDiscogs, cle, null, 'release');
  return editions.length > toutes.length ? editions : toutes;
}

async function sortiesDuGenre(nomDiscogs: string, cle: string, genre: string | null, type: 'master' | 'release'): Promise<SortieConnue[]> {
  const j = (await discogs(
    `/database/search?label=${encodeURIComponent(nomDiscogs)}&type=${type}&per_page=40&sort=have&sort_order=desc${genre ? `&genre=${encodeURIComponent(genre)}` : ''}`
  )) as {
    results?: { title?: string; year?: string; label?: string[]; genre?: string[]; community?: { have?: number }; cover_image?: string; uri?: string }[];
  } | null;
  const sorties: SortieConnue[] = [];
  for (const x of j?.results ?? []) {
    /* LE LABEL EXACT, ou on passe : voir l'en-tete. */
    if (!(x.label ?? []).some((l) => cleDeLabel(l) === cle || cleDeLabel(l) === cleDeLabel(nomDiscogs))) continue;
    const [artiste, ...reste] = (x.title ?? '').split(' - ');
    if (!artiste || reste.length === 0) continue;
    /* Une edition revient sous plusieurs formats : une fois suffit. */
    if (sorties.some((s) => s.url === `https://www.discogs.com${x.uri ?? ''}` || x.title === `${s.artiste} - ${s.titre}`)) continue;
    const annee = Number.parseInt(x.year ?? '', 10);
    /* UNE ADRESSE QUI RESSEMBLE A UNE CLE N'ENTRE PAS : le controle des
       secrets du deploiement la refuserait, et il a raison de ne rien
       laisser passer (voir scripts/check-secrets-dist.mjs). */
    const image = x.cover_image && !x.cover_image.includes('spacer.gif') && !suspecte(x.cover_image) ? x.cover_image : null;
    sorties.push({
      titre: sansTirets(reste.join(' - ').trim()),
      artiste: artiste.replace(/\*$/, '').replace(/\s\(\d+\)$/, '').trim(),
      annee: Number.isFinite(annee) && annee > 1900 ? annee : null,
      possedee: x.community?.have ?? 0,
      electronique: genre === 'Electronic' || (x.genre ?? []).includes('Electronic'),
      image,
      url: `https://www.discogs.com${x.uri ?? ''}`,
    });
    if (sorties.length >= 8) break;
  }
  return sorties;
}

/* ── 5. L'ecriture, en reprenant ce qui est deja fait ─────────────────── */

const deja: Map<string, FicheLabel> = new Map(
  !REFAIRE && existsSync(SORTIE) ? (JSON.parse(readFileSync(SORTIE, 'utf8')) as FicheLabel[]).map((f) => [f.slug, f]) : []
);
const fiches = new Map<string, FicheLabel>(SEULEMENT ? deja : []);
/* En mode --seulement, un label qui n'est plus retenu sort du fichier. */
if (SEULEMENT && retenus.length === 0) for (const [s, f] of fiches) if (f.cles.includes(cleDeLabel(SEULEMENT))) fiches.delete(s);
const slugsPris = new Set<string>();
let faits = 0;

for (const { l, wd } of retenus) {
  let s = slug(l.nom) || slug(l.cle);
  while (slugsPris.has(s)) s = `${s}-2`;
  slugsPris.add(s);
  const avant = deja.get(s);
  /* Une fiche se reprend telle quelle, sauf si son element Wikidata a change
     depuis : les regles de reconnaissance ont pu la corriger. */
  if (avant && !SEULEMENT && (avant.wikidata ?? null) === (wd?.item ?? null) && !(TRANCHE && dansLaTranche(l.cle))) {
    fiches.set(s, { ...avant, n: l.n, cles: [...new Set([l.cle, ...[...l.graphies.keys()].map(cleDeLabel), ...(AUTRES_NOMS[l.cle] ?? [])])], anciens: anciens.get(l.cle) ?? [] });
    continue;
  }
  if (TRANCHE && !avant && l.n === 0 && NOMMES.has(l.cle) && !dansLaTranche(l.cle)) continue;

  let nomDiscogs = l.nom;
  let profil: string | null = null;
  let urlDiscogs: string | null = null;
  let imageDiscogs: string | null = null;
  if (DISCOGS && !DISCOGS_HOMONYMES.has(l.cle)) {
    const fiche = wd?.discogs
      ? ((await discogs(`/labels/${wd.discogs}`)) as { name?: string; profile?: string; uri?: string; images?: { type?: string; uri?: string }[] } | null)
      : null;
    if (fiche?.name) {
      nomDiscogs = fiche.name;
      imageDiscogs = (fiche.images ?? []).find((i) => i.type === 'primary')?.uri ?? fiche.images?.[0]?.uri ?? null;
      profil = fiche.profile ? sansTirets(nettoyerProfil(fiche.profile)).slice(0, 900) || null : null;
      urlDiscogs = fiche.uri ?? null;
    } else {
      const r = (await discogs(`/database/search?type=label&q=${encodeURIComponent(l.nom)}&per_page=5`)) as {
        results?: { id?: number; title?: string; uri?: string; cover_image?: string }[];
      } | null;
      const exact = (r?.results ?? []).find((x) => cleDeLabel(x.title ?? '') === l.cle);
      if (exact?.title) {
        nomDiscogs = exact.title;
        imageDiscogs = exact.cover_image && !exact.cover_image.includes('spacer.gif') ? exact.cover_image : null;
        urlDiscogs = exact.uri ? `https://www.discogs.com${exact.uri}` : null;
        /* Sans Wikipedia, la presentation de Discogs est la seule : on la
           demande aussi pour un label trouve par son nom. */
        const detail = exact.id ? ((await discogs(`/labels/${exact.id}`)) as { profile?: string } | null) : null;
        profil = detail?.profile ? sansTirets(nettoyerProfil(detail.profile)).slice(0, 900) || null : null;
      }
    }
  }
  const sorties = DISCOGS ? await sortiesConnues(nomDiscogs, l.cle) : [];
  const [resumeFr, resumeEn] = await Promise.all([resume(wd?.frwiki ?? null), resume(wd?.enwiki ?? null)]);
  /* Un label nomme qu'on ne trouve nulle part n'a rien a montrer. */
  if (l.n === 0 && !urlDiscogs && !resumeFr && !resumeEn && !AJOUTE.has(l.cle)) continue;

  fiches.set(s, {
    slug: s,
    nom: l.nom,
    cles: [...new Set([l.cle, ...[...l.graphies.keys()].map(cleDeLabel), ...(AUTRES_NOMS[l.cle] ?? [])])],
    anciens: anciens.get(l.cle) ?? [],
    n: l.n,
    pays: wd?.pays ?? AJOUTE.get(l.cle)?.pays ?? null,
    annee: wd?.annee ?? null,
    fondateurs: wd ? (fondateurs.get(wd.item) ?? []) : (AJOUTE.get(l.cle)?.fondateurs ?? []),
    site: wd?.site ?? AJOUTE.get(l.cle)?.site ?? null,
    wiki: { ...(wd?.frwiki ? { fr: wd.frwiki } : {}), ...(wd?.enwiki ? { en: wd.enwiki } : {}) },
    resume: { ...(resumeFr ? { fr: resumeFr } : {}), ...(resumeEn ? { en: resumeEn } : {}) },
    profil: resumeFr || resumeEn ? null : profil,
    discogs: urlDiscogs,
    wikidata: wd?.item ?? null,
    logo: (() => {
      const commons = wd?.logo ? logosCommons.get(wd.logo) : undefined;
      if (commons) return { url: commons.url, source: 'commons' as const, credit: commons.credit, page: commons.page };
      if (imageDiscogs && !suspecte(imageDiscogs) && !IMAGES_REFUSEES.has(l.cle)) return { url: imageDiscogs, source: 'discogs' as const, credit: null, page: urlDiscogs };
      return null;
    })(),
    sorties,
  });
  faits += 1;
  process.stdout.write(`\r${faits} fiche(s) faite(s) : ${l.nom.slice(0, 40).padEnd(40)}`);
  /* On ecrit en chemin : une moisson coupee reprend ou elle en etait. */
  if (faits % 10 === 0) writeFileSync(SORTIE, `${JSON.stringify([...fiches.values()].sort((a, b) => a.nom.localeCompare(b.nom)), null, 1)}\n`);
}

/* DEUX NOMS, UNE MEME FICHE DISCOGS : « Upsetter » et « Upsetter Records »
   n'ont pas d'element Wikidata pour les reunir, mais Discogs les donne pour
   un seul label. Ils se fondent comme les graphies d'un meme element. */
const parDiscogs = new Map<string, FicheLabel[]>();
for (const f of fiches.values()) if (f.discogs) parDiscogs.set(f.discogs, [...(parDiscogs.get(f.discogs) ?? []), f]);
for (const groupe of parDiscogs.values()) {
  if (groupe.length < 2) continue;
  const [t, ...autres] = [...groupe].sort((a, b) => b.n - a.n);
  if (!t) continue;
  fiches.set(t.slug, {
    ...t,
    n: groupe.reduce((somme, f) => somme + f.n, 0),
    cles: [...new Set(groupe.flatMap((f) => f.cles))],
    anciens: [...new Set([...(t.anciens ?? []), ...autres.flatMap((f) => [f.slug, ...(f.anciens ?? [])])])],
  });
  for (const f of autres) fiches.delete(f.slug);
}

const tout = [...fiches.values()].sort((a, b) => a.nom.localeCompare(b.nom));
writeFileSync(SORTIE, `${JSON.stringify(tout, null, 1)}\n`);
/* L'INDEX DE LA RECHERCHE, a part et minuscule : la recherche le charge a
   chaque ouverture, et n'a besoin que du nom, des cles et de l'adresse. La
   fiche entiere ne se charge que sur la page du label. */
writeFileSync(
  INDEX,
  `${JSON.stringify(tout.map((f) => ({ s: f.slug, n: f.nom, k: f.cles, c: f.n, p: f.pays, a: f.annee, l: f.logo?.url ?? null, r: succes(f) })))}\n`
);
const avecResume = tout.filter((f) => f.resume.fr || f.resume.en || f.profil).length;
const avecSorties = tout.filter((f) => f.sorties.length > 0).length;
const avecLogo = tout.filter((f) => f.logo).length;
console.log(`\n${tout.length} fiche(s) ecrite(s) dans src/data/labels.json : ${avecResume} avec une presentation, ${avecSorties} avec des sorties connues, ${avecLogo} avec un logo.`);
