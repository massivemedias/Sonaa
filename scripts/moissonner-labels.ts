/* LA MOISSON DES LABELS : une fiche par label que l'atlas connait.
 *
 * Usage : npm run moissonner:labels                 (tout, en reprenant)
 *         npm run moissonner:labels -- --refaire     (tout, de zero)
 *         npm run moissonner:labels -- --seulement="F Communications"
 *
 * Voir src/lib/labels.ts pour ce que la page en fait.
 *
 * ═══ QUELS LABELS ═══
 *
 * Tous ceux que le corpus cite sur un morceau, et on garde ceux qui ont au
 * moins TROIS morceaux dans l'atlas OU une page Wikipedia. Le nombre seul ne
 * suffisait pas : F Communications, Kompakt et Ostgut Ton n'ont qu'un morceau
 * chacun dans le corpus, et ce sont exactement ceux qu'on cherche.
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
import { cleDeLabel, estSansLabel, type FicheLabel, type SortieConnue } from '../src/lib/labels.ts';
import { slug } from '../src/lib/chemins.ts';
import { nettoyerProfil, sansTirets, variantes } from './lib/labels-moisson.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const SORTIE = fileURLToPath(new URL('../src/data/labels.json', import.meta.url));
const INDEX = fileURLToPath(new URL('../src/data/labels-index.json', import.meta.url));
const AGENT = 'SonaaAtlas/1.0 (https://sonaa.ca; massivemedias@gmail.com)';
const DISCOGS = process.env['DISCOGS_TOKEN'] ?? '';
const REFAIRE = process.argv.includes('--refaire');
const SEULEMENT = process.argv.find((a) => a.startsWith('--seulement='))?.slice('--seulement='.length) ?? null;
const SEUIL_MORCEAUX = 3;

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* ── 1. Les labels du corpus ─────────────────────────────────────────── */

interface LabelDuCorpus {
  cle: string;
  nom: string;
  graphies: Map<string, number>;
  n: number;
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: { tracks: { release?: { label?: string } | null }[] }[];
};
const parCle = new Map<string, LabelDuCorpus>();
for (const g of corpus.genres) {
  for (const t of g.tracks) {
    const nom = t.release?.label?.trim();
    if (!nom || estSansLabel(nom)) continue;
    const cle = cleDeLabel(nom);
    const l = parCle.get(cle) ?? { cle, nom, graphies: new Map(), n: 0 };
    l.n += 1;
    l.graphies.set(nom, (l.graphies.get(nom) ?? 0) + 1);
    parCle.set(cle, l);
  }
}
for (const l of parCle.values()) l.nom = [...l.graphies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? l.nom;
let labels = [...parCle.values()];
if (SEULEMENT) labels = labels.filter((l) => l.cle === cleDeLabel(SEULEMENT));
console.log(`${labels.length} label(s) dans le corpus.`);

/* ── 2. Wikidata ─────────────────────────────────────────────────────── */

interface Candidat {
  item: string;
  exact: boolean;
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
    });
    if (r.ok) return ((await r.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
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
  const lignes = await sparql(`SELECT ?nom ?item ?paysLabel ?debut ?site ?discogs ?enwiki ?frwiki WHERE {
    VALUES ?nom { ${valeurs} }
    ?item rdfs:label|skos:altLabel ?nom .
    ?item wdt:P31/wdt:P279* wd:Q18127 .
    OPTIONAL { ?item wdt:P17 ?pays }
    OPTIONAL { ?item wdt:P571 ?debut }
    OPTIONAL { ?item wdt:P856 ?site }
    OPTIONAL { ?item wdt:P1955 ?discogs }
    OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL { ?frwiki schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
  }`);
  for (const b of lignes) {
    const nom = b['nom']?.value ?? '';
    for (const { cle, exact } of parVariante.get(nom) ?? []) {
      const liste = candidats.get(cle) ?? [];
      const item = b['item']?.value.split('/').pop() ?? '';
      if (liste.some((c) => c.item === item)) continue;
      const debut = Number.parseInt((b['debut']?.value ?? '').slice(0, 4), 10);
      liste.push({
        item,
        exact,
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

/* UN NOM DE MOINS DE QUATRE LETTRES NE SE CHERCHE PAS DANS WIKIDATA :
   « TME », le label hardstyle de Showtek, y devenait Tencent Music
   Entertainment (constate le 1er octobre 2026). Trop court pour etre
   reconnu sans le reste. */
const retenus = labels
  .map((l) => ({ l, wd: l.cle.replace(/ /g, '').length < 4 ? null : choisir(candidats.get(l.cle)) }))
  .filter(({ l, wd }) => l.n >= SEUIL_MORCEAUX || wd?.frwiki || wd?.enwiki);
console.log(`${retenus.length} label(s) retenu(s) (au moins ${SEUIL_MORCEAUX} morceaux, ou une page Wikipedia).`);

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
  for (let essai = 0; essai < 3; essai += 1) {
    const r = await fetch(`https://api.discogs.com${chemin}`, {
      headers: { 'User-Agent': AGENT, Authorization: `Discogs token=${DISCOGS}` },
    });
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
  const electroniques = await sortiesDuGenre(nomDiscogs, cle, 'Electronic');
  return electroniques.length >= 4 ? electroniques : sortiesDuGenre(nomDiscogs, cle, null);
}

async function sortiesDuGenre(nomDiscogs: string, cle: string, genre: string | null): Promise<SortieConnue[]> {
  const j = (await discogs(
    `/database/search?label=${encodeURIComponent(nomDiscogs)}&type=master&per_page=40&sort=have&sort_order=desc${genre ? `&genre=${encodeURIComponent(genre)}` : ''}`
  )) as { results?: { title?: string; year?: string; label?: string[]; community?: { have?: number }; cover_image?: string; uri?: string }[] } | null;
  const sorties: SortieConnue[] = [];
  for (const x of j?.results ?? []) {
    /* LE LABEL EXACT, ou on passe : voir l'en-tete. */
    if (!(x.label ?? []).some((l) => cleDeLabel(l) === cle || cleDeLabel(l) === cleDeLabel(nomDiscogs))) continue;
    const [artiste, ...reste] = (x.title ?? '').split(' - ');
    if (!artiste || reste.length === 0) continue;
    const annee = Number.parseInt(x.year ?? '', 10);
    /* UNE ADRESSE QUI RESSEMBLE A UNE CLE N'ENTRE PAS : le controle des
       secrets du deploiement la refuserait, et il a raison de ne rien
       laisser passer (voir scripts/check-secrets-dist.mjs). */
    const suspecte = (u: string): boolean => /ghp_|github_pat_|AIza|sk-[A-Za-z0-9]{16}|sb_secret_|eyJhbGciOi/.test(u);
    const image = x.cover_image && !x.cover_image.includes('spacer.gif') && !suspecte(x.cover_image) ? x.cover_image : null;
    sorties.push({
      titre: sansTirets(reste.join(' - ').trim()),
      artiste: artiste.replace(/\*$/, '').replace(/\s\(\d+\)$/, '').trim(),
      annee: Number.isFinite(annee) && annee > 1900 ? annee : null,
      possedee: x.community?.have ?? 0,
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
const slugsPris = new Set<string>();
let faits = 0;

for (const { l, wd } of retenus) {
  let s = slug(l.nom) || slug(l.cle);
  while (slugsPris.has(s)) s = `${s}-2`;
  slugsPris.add(s);
  const avant = deja.get(s);
  if (avant && !SEULEMENT) {
    fiches.set(s, { ...avant, n: l.n, cles: [...new Set([l.cle, ...[...l.graphies.keys()].map(cleDeLabel)])] });
    continue;
  }

  let nomDiscogs = l.nom;
  let profil: string | null = null;
  let urlDiscogs: string | null = null;
  if (DISCOGS) {
    const fiche = wd?.discogs
      ? ((await discogs(`/labels/${wd.discogs}`)) as { name?: string; profile?: string; uri?: string } | null)
      : null;
    if (fiche?.name) {
      nomDiscogs = fiche.name;
      profil = fiche.profile ? sansTirets(nettoyerProfil(fiche.profile)).slice(0, 900) || null : null;
      urlDiscogs = fiche.uri ?? null;
    } else {
      const r = (await discogs(`/database/search?type=label&q=${encodeURIComponent(l.nom)}&per_page=5`)) as {
        results?: { id?: number; title?: string; uri?: string }[];
      } | null;
      const exact = (r?.results ?? []).find((x) => cleDeLabel(x.title ?? '') === l.cle);
      if (exact?.title) {
        nomDiscogs = exact.title;
        urlDiscogs = exact.uri ? `https://www.discogs.com${exact.uri}` : null;
      }
    }
  }
  const sorties = DISCOGS ? await sortiesConnues(nomDiscogs, l.cle) : [];
  const [resumeFr, resumeEn] = await Promise.all([resume(wd?.frwiki ?? null), resume(wd?.enwiki ?? null)]);

  fiches.set(s, {
    slug: s,
    nom: l.nom,
    cles: [...new Set([l.cle, ...[...l.graphies.keys()].map(cleDeLabel)])],
    n: l.n,
    pays: wd?.pays ?? null,
    annee: wd?.annee ?? null,
    fondateurs: wd ? (fondateurs.get(wd.item) ?? []) : [],
    site: wd?.site ?? null,
    wiki: { ...(wd?.frwiki ? { fr: wd.frwiki } : {}), ...(wd?.enwiki ? { en: wd.enwiki } : {}) },
    resume: { ...(resumeFr ? { fr: resumeFr } : {}), ...(resumeEn ? { en: resumeEn } : {}) },
    profil: resumeFr || resumeEn ? null : profil,
    discogs: urlDiscogs,
    sorties,
  });
  faits += 1;
  process.stdout.write(`\r${faits} fiche(s) faite(s) : ${l.nom.slice(0, 40).padEnd(40)}`);
  /* On ecrit en chemin : une moisson coupee reprend ou elle en etait. */
  if (faits % 10 === 0) writeFileSync(SORTIE, `${JSON.stringify([...fiches.values()].sort((a, b) => a.nom.localeCompare(b.nom)), null, 1)}\n`);
}

const tout = [...fiches.values()].sort((a, b) => a.nom.localeCompare(b.nom));
writeFileSync(SORTIE, `${JSON.stringify(tout, null, 1)}\n`);
/* L'INDEX DE LA RECHERCHE, a part et minuscule : la recherche le charge a
   chaque ouverture, et n'a besoin que du nom, des cles et de l'adresse. La
   fiche entiere ne se charge que sur la page du label. */
writeFileSync(INDEX, `${JSON.stringify(tout.map((f) => ({ s: f.slug, n: f.nom, k: f.cles, c: f.n, p: f.pays, a: f.annee })))}\n`);
const avecResume = tout.filter((f) => f.resume.fr || f.resume.en || f.profil).length;
const avecSorties = tout.filter((f) => f.sorties.length > 0).length;
console.log(`\n${tout.length} fiche(s) ecrite(s) dans src/data/labels.json : ${avecResume} avec une presentation, ${avecSorties} avec des sorties connues.`);
