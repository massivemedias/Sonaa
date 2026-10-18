/* LA MOISSON DES NEWS PAR MARQUE : articles, videos et discussions, rangés
 * par marque et par machine, deux fois par jour.
 *
 * Usage :
 *   npm run moissonner:marques                 une passe ordinaire
 *   npm run moissonner:marques -- --plein      la premiere passe, qui remonte
 *                                              le passe (toutes les machines)
 *   ... -- --sortie=fichier.json               ecrit dans un fichier au lieu
 *                                              de la base
 *
 * Mika, le 18 octobre 2026 : « si je suis fan d'une machine, je vais
 * chercher ses news un peu partout, des videos, des articles, des
 * discussions. J'ai achete une Elektron Analog Rytm, je veux toutes les
 * news la-dessus. » Voir src/data/marques.ts pour le catalogue et la
 * maniere de reconnaitre une machine dans un titre.
 *
 * ═══ D'OU VIENNENT LES LIGNES ═══
 *
 *   ARTICLES : les flux des magazines du materiel et des plugins (ceux de
 *   l'onglet News, et d'autres : Synth Anatomy, Rekkerd, Audiofanzine...),
 *   et, par machine, la recherche que ces sites offrent eux-memes en flux
 *   (WordPress : ?s=<machine>&feed=rss2). Aucun moteur de recherche tiers :
 *   Google News et Bing News interdisent par contrat qu'on republie leurs
 *   resultats ailleurs que dans un lecteur personnel.
 *
 *   VIDEOS : les chaines officielles des marques et celles des testeurs
 *   (Loopop, Sonic State, Red Means Recording...), lues par leur flux, sans
 *   quota ; et, par machine, la recherche de l'API YouTube, avec un budget
 *   par passe (une recherche coute 100 unites sur 10 000 par jour).
 *
 *   DISCUSSIONS : le forum Reddit de chaque marque, les grands forums
 *   generaux (r/synthesizers, r/edmproduction, r/DJs...), la recherche
 *   Reddit par machine, et Elektronauts.
 *
 * ═══ LA ROTATION ═══ Chercher les trois cents machines a chaque passe
 * ferait mille requetes deux fois par jour. Chaque passe en prend une
 * tranche, et la tranche avance avec l'horloge : toutes y passent en
 * quelques jours, sans rien retenir d'une passe a l'autre.
 *
 * ═══ L'ARCHIVE NE PERD RIEN ═══ La base garde tout (actu_marques). Un lien
 * deja connu qui revient par un autre chemin ajoute ses marques et ses
 * machines a celles qu'il avait : voir verser_actu_marques dans
 * supabase/migrations/20261018190000_actu_marques.sql. */

import { writeFileSync } from 'node:fs';
import { imageDePage, lireFlux, resumer, texteNu, type Article } from './lib/flux-rss.ts';
import { sansTirets } from './lib/labels-moisson.ts';
import { SOURCES } from '../src/data/news-sources.ts';
import { MARQUES, reconnaitreMarques, type GroupeMarque, type Marque, type Produit } from '../src/data/marques.ts';

const args = process.argv.slice(2);
const option = (nom: string): string | null => args.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3) ?? null;
/* LA PREMIERE PASSE SE DECIDE SEULE : tant que l'archive est presque vide
   (moins de 3 000 lignes), la passe remonte le passe, sans qu'on ait a la
   demander. Voir main(). */
let PLEIN = args.includes('--plein');
const SORTIE = option('sortie');
let BUDGET_YOUTUBE = 0;
let BUDGET_RECHERCHE = 0;
let BUDGET_REDDIT = 0;
function fixerLesBudgets(): void {
  BUDGET_YOUTUBE = Number(option('youtube') ?? (PLEIN ? 45 : 25));
  BUDGET_RECHERCHE = Number(option('recherches') ?? (PLEIN ? 100000 : 24));
  BUDGET_REDDIT = Number(option('reddit') ?? (PLEIN ? 40 : 12));
}

/* L'adresse du projet est publique (elle est dans le site) : seule la cle
   de service est un secret, et c'est la seule chose a poser dans GitHub. */
const URL_BASE = (process.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'] || 'https://pqgapyfqkjzvwkulxnhv.supabase.co').replace(/\/$/, '');
const CLE_SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const CLE_YOUTUBE = process.env['YOUTUBE_API_KEY'] ?? '';

const AGENT = 'SONAA/1.0 (+https://sonaa.ca ; news par marque, deux fois par jour)';
const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const DELAI_MS = 15_000;

type Genre = 'article' | 'video' | 'discussion';

interface Ligne {
  lien: string;
  genre: Genre;
  titre: string;
  source: string;
  date: string | null;
  image: string | null;
  resume: string;
  marques: string[];
  produits: string[];
}

const pannes: string[] = [];
const lignes = new Map<string, Ligne>();
let requetes = 0;

/* ═══ LES SOURCES ═══ */

interface Flux {
  readonly nom: string;
  readonly url: string;
  /** WordPress : le flux se pagine (?paged=2) et se cherche (?s=). */
  readonly wp: boolean;
}

/* Les sources de l'onglet News qui parlent de materiel, et quelques autres
   qui n'en parlent que : la page News est un journal, ceci est un rayon. */
const WP_DE_NEWS = new Set(['attack', 'musictech', 'cdm', 'bpb', 'synthtopia', 'gearnews', 'djtechtools', 'digitaldjtips']);
const FLUX_ARTICLES: readonly Flux[] = [
  ...SOURCES.filter((s) => s.flux && (s.categorie === 'production' || s.categorie === 'djing')).map((s) => ({
    nom: s.nom,
    url: s.flux ?? '',
    wp: WP_DE_NEWS.has(s.id),
  })),
  { nom: 'Synth Anatomy', url: 'https://synthanatomy.com/feed/', wp: true },
  { nom: 'Rekkerd', url: 'https://rekkerd.org/feed/', wp: true },
  { nom: 'Audio News Room', url: 'https://audionewsroom.net/feed', wp: true },
  { nom: 'MATRIXSYNTH', url: 'https://www.matrixsynth.com/feeds/posts/default?alt=rss&max-results=100', wp: false },
  { nom: 'Audiofanzine', url: 'https://fr.audiofanzine.com/news/a.rss.xml', wp: false },
  { nom: 'Magnetic Magazine', url: 'https://www.magneticmag.com/feed/', wp: true },
  { nom: 'Production Expert', url: 'https://www.production-expert.com/production-expert-1?format=rss', wp: false },
  { nom: 'Splice', url: 'https://splice.com/blog/feed/', wp: true },
];

/* La recherche par machine, sur les sites qui parlent de ce rayon. */
const RECHERCHE_PAR_GROUPE: Record<GroupeMarque, readonly { nom: string; site: string }[]> = {
  synthes: [
    { nom: 'Synthtopia', site: 'https://www.synthtopia.com/' },
    { nom: 'Gearnews', site: 'https://www.gearnews.com/' },
    { nom: 'Synth Anatomy', site: 'https://synthanatomy.com/' },
    { nom: 'Create Digital Music', site: 'https://cdm.link/' },
  ],
  dj: [
    { nom: 'DJ TechTools', site: 'https://djtechtools.com/' },
    { nom: 'Digital DJ Tips', site: 'https://www.digitaldjtips.com/' },
    { nom: 'Gearnews', site: 'https://www.gearnews.com/' },
  ],
  logiciels: [
    { nom: 'Gearnews', site: 'https://www.gearnews.com/' },
    { nom: 'Create Digital Music', site: 'https://cdm.link/' },
    { nom: 'Rekkerd', site: 'https://rekkerd.org/' },
    { nom: 'MusicTech', site: 'https://musictech.com/' },
  ],
  plugins: [
    { nom: 'Rekkerd', site: 'https://rekkerd.org/' },
    { nom: 'Bedroom Producers Blog', site: 'https://bedroomproducersblog.com/' },
    { nom: 'Audio News Room', site: 'https://audionewsroom.net/' },
    { nom: 'Gearnews', site: 'https://www.gearnews.com/' },
  ],
};

/* Les testeurs : leurs videos ne comptent que si elles nomment une marque
   ou une machine du catalogue. Chaines verifiees le 18 octobre 2026. */
const TESTEURS: readonly { nom: string; id: string }[] = [
  { nom: 'Loopop', id: 'UC-RA5BzE_BnZhf5iVdNF1hA' },
  { nom: 'Sonic State', id: 'UCW64y2tidRL5njv0JrQdvbA' },
  { nom: 'Starsky Carr', id: 'UCvqGJkKHb-VHgxJmuBbIfIQ' },
  { nom: 'Red Means Recording', id: 'UChnxLLvzviaR5NeKOevB8iQ' },
  { nom: 'Andrew Huang', id: 'UCdcemy56JtVTrsFIOoqvV8g' },
  { nom: 'Bonedo Synthesizers', id: 'UCbe1EaOzuPTQ5ygQ9Vce1Gg' },
  { nom: 'DivKid', id: 'UC1zIiKvJIi7aYl2N68pWF8g' },
  { nom: 'Benn Jordan', id: 'UCshObcm-nLhbu8MY50EZ5Ng' },
  { nom: 'Ricky Tinez', id: 'UC4OAAbxtB6QEKaTDb-SEe-Q' },
  { nom: 'Mylar Melodies', id: 'UCz0l5LJhNQkktxKWcGUtWxg' },
  { nom: 'In The Mix', id: 'UCIcCXe3iWo6lq-iWKV40Oug' },
  { nom: 'You Suck at Producing', id: 'UCapo4XcpVOlTLkbKIDL0WlA' },
  { nom: 'Venus Theory', id: 'UCzsd4-oyHhNbAXfceOQ5HTw' },
  { nom: 'Busy Works Beats', id: 'UCHzcS9Hm5dieyRWDMY-earw' },
  { nom: 'Point Blank', id: 'UCIWNozFjO8yVdJFsGKVmPgg' },
  { nom: 'Production Music Live', id: 'UCkL_BZn7BoVGDa_OBi16hIw' },
  { nom: 'Sadowick Production', id: 'UCj0-W75RL3AS_psDlWBqu1w' },
  { nom: 'Digital DJ Tips', id: 'UCcGypazPypWJ2K5ig_c7LyQ' },
  { nom: 'DJ TechTools', id: 'UCkZQQVgNUToyz5bocyA-cog' },
  { nom: 'Ellaskins', id: 'UCr3_EE6O_eA71X2quaKvziw' },
  { nom: 'Sweetwater', id: 'UC1kdsZUTDSW1BtsHEoYx4WQ' },
  { nom: 'Perfect Circuit', id: 'UCJP2E6KQ48y9dpQGg9_z8fA' },
];

/* Les forums generaux : on n'y garde que ce qui nomme le catalogue. */
const FORUMS_GENERAUX = ['synthesizers', 'edmproduction', 'DJs', 'drummachine', 'modular', 'AudioProductionDeals', 'Beatmatch', 'WeAreTheMusicMakers'];

/* ═══ LES OUTILS ═══ */

async function lire(url: string, agent = AGENT): Promise<string> {
  requetes += 1;
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': agent, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(minuteur);
  }
}

/** Fait tourner `travail` sur chaque element, `largeur` a la fois. */
async function enParallele<T>(elements: readonly T[], largeur: number, travail: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  const ouvriers = Array.from({ length: Math.min(largeur, elements.length) }, async () => {
    while (i < elements.length) {
      const x = elements[i];
      i += 1;
      if (x !== undefined) await travail(x);
    }
  });
  await Promise.all(ouvriers);
}

const pause = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms));

/** Une adresse sans le bruit qui la rend differente d'elle-meme. */
function lienPropre(lien: string): string {
  try {
    const u = new URL(lien);
    for (const p of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|share$)/i.test(p)) u.searchParams.delete(p);
    u.hash = '';
    return u.toString();
  } catch {
    return lien;
  }
}

/** Range une ligne, en reunissant ce qu'on sait deja de ce lien. */
function garder(l: Ligne): void {
  if (l.marques.length === 0) return;
  /* Aucun tiret long sur le site, meme dans un titre venu d'ailleurs. */
  /* Le resume repasse au nettoyage : certains flux (Discourse) echappent
     leur HTML, et la premiere passe ne fait qu'en decoder les balises. */
  l = { ...l, titre: sansTirets(l.titre), resume: resumer(sansTirets(texteNu(l.resume))), source: sansTirets(l.source) };
  const lien = lienPropre(l.lien);
  const image = l.image && l.image.startsWith('https://') ? l.image : null;
  const deja = lignes.get(lien);
  if (!deja) {
    lignes.set(lien, { ...l, lien, image, titre: l.titre.slice(0, 400), resume: l.resume.slice(0, 400) });
    return;
  }
  deja.marques = [...new Set([...deja.marques, ...l.marques])];
  deja.produits = [...new Set([...deja.produits, ...l.produits])];
  deja.image ??= image;
  deja.date ??= l.date;
}

/** Ce qu'un texte nomme, plus ce que le contexte impose (la chaine ou le
    forum d'une marque est sur cette marque, quoi qu'il dise). */
function reconnu(texte: string, imposee?: Marque): { marques: string[]; produits: string[] } {
  const r = reconnaitreMarques(texte);
  if (imposee && !r.marques.includes(imposee.id)) r.marques.push(imposee.id);
  return r;
}

function depuisArticle(a: Article, source: string, genre: Genre, imposee?: Marque): void {
  const { marques, produits } = reconnu(`${a.titre} ${a.resume} ${(a.etiquettes ?? []).join(' ')}`, imposee);
  garder({ lien: a.lien, genre, titre: a.titre, source, date: a.date, image: a.image, resume: a.resume, marques, produits });
}

/* ═══ 1. LES ARTICLES ═══ */

async function articlesDesFlux(): Promise<void> {
  const adresses = FLUX_ARTICLES.flatMap((f) => {
    const pages = PLEIN && f.wp ? [1, 2, 3, 4, 5, 6] : [1];
    return pages.map((n) => ({ f, url: n === 1 ? f.url : `${f.url}${f.url.includes('?') ? '&' : '?'}paged=${n}` }));
  });
  await enParallele(adresses, 6, async ({ f, url }) => {
    try {
      for (const a of lireFlux(await lire(url), f.nom)) depuisArticle(a, f.nom, 'article');
    } catch (e) {
      pannes.push(`flux ${f.nom} ${url} : ${(e as Error).message}`);
    }
  });
}

interface Machine {
  readonly marque: Marque;
  readonly produit: Produit;
}

const TOUTES: readonly Machine[] = MARQUES.flatMap((marque) => marque.produits.map((produit) => ({ marque, produit })));

/** La tranche de cette passe : elle avance de `n` toutes les douze heures. */
function tranche(n: number, decalage: number): readonly Machine[] {
  if (n >= TOUTES.length) return TOUTES;
  const pas = Math.floor(Date.now() / (12 * 3600 * 1000));
  const debut = ((pas * n + decalage) % TOUTES.length + TOUTES.length) % TOUTES.length;
  return Array.from({ length: n }, (_, i) => TOUTES[(debut + i) % TOUTES.length]).filter((x): x is Machine => x !== undefined);
}

/** Ce qu'on tape pour chercher une machine : son nom, precede de la marque
    quand le nom seul est un mot courant. */
const requeteDe = (x: Machine): string => (x.produit.avecMarque ? `${x.marque.nom} ${x.produit.nom}` : x.produit.nom);

async function articlesParRecherche(): Promise<void> {
  const travaux = tranche(BUDGET_RECHERCHE, 0).flatMap((x) => RECHERCHE_PAR_GROUPE[x.marque.groupe].map((s) => ({ x, s })));
  await enParallele(travaux, 6, async ({ x, s }) => {
    const url = `${s.site}?s=${encodeURIComponent(requeteDe(x))}&feed=rss2`;
    try {
      for (const a of lireFlux(await lire(url), s.nom)) depuisArticle(a, s.nom, 'article');
    } catch (e) {
      pannes.push(`recherche ${s.nom} « ${requeteDe(x)} » : ${(e as Error).message}`);
    }
  });
}

/* ═══ 2. LES VIDEOS ═══ */

interface Video {
  readonly id: string;
  readonly titre: string;
  readonly chaine: string;
  readonly date: string | null;
  readonly description: string;
}

/** Les videos d'un flux de chaine YouTube (Atom, quinze dernieres). */
function lireChaine(xml: string): Video[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap((m) => {
    const b = m[1] ?? '';
    const id = b.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const titre = texteNu(b.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
    if (!id || !titre) return [];
    return [{
      id,
      titre,
      chaine: texteNu(b.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1]),
      date: b.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
      description: texteNu(b.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]),
    }];
  });
}

function depuisVideo(v: Video, imposee?: Marque): void {
  const { marques, produits } = reconnu(`${v.titre} ${v.description.slice(0, 600)}`, imposee);
  garder({
    lien: `https://www.youtube.com/watch?v=${v.id}`,
    genre: 'video',
    titre: v.titre,
    source: v.chaine || 'YouTube',
    date: v.date ? new Date(v.date).toISOString() : null,
    image: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    resume: resumer(v.description),
    marques,
    produits,
  });
}

async function videosDesChaines(): Promise<void> {
  const chaines = [
    ...MARQUES.filter((m) => m.youtube).map((m) => ({ id: m.youtube ?? '', marque: m as Marque | undefined, nom: m.nom })),
    ...TESTEURS.map((x) => ({ id: x.id, marque: undefined, nom: x.nom })),
  ];
  await enParallele(chaines, 6, async (c) => {
    try {
      const xml = await lire(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`, NAVIGATEUR);
      for (const v of lireChaine(xml)) depuisVideo(v, c.marque);
    } catch (e) {
      pannes.push(`chaine ${c.nom} : ${(e as Error).message}`);
    }
  });
}

/* La recherche YouTube, par machine. En passe ordinaire, le dernier mois
   par date ; en premiere passe, les deux dernieres annees par pertinence :
   ce qu'on veut d'abord voir d'une machine, ce sont ses meilleures videos. */
async function videosParRecherche(): Promise<void> {
  if (!CLE_YOUTUBE || BUDGET_YOUTUBE <= 0) return;
  const depuis = new Date(Date.now() - (PLEIN ? 730 : 30) * 86400_000).toISOString();
  for (const x of tranche(BUDGET_YOUTUBE, 7)) {
    const q = x.produit.avecMarque ? `${x.marque.nom} ${x.produit.nom}` : `"${x.produit.nom}" ${x.marque.nom}`;
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25` +
      `&order=${PLEIN ? 'relevance' : 'date'}&publishedAfter=${encodeURIComponent(depuis)}` +
      `&q=${encodeURIComponent(q)}&key=${CLE_YOUTUBE}`;
    try {
      requetes += 1;
      const r = await fetch(url);
      const j = (await r.json()) as {
        items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; publishedAt?: string; description?: string } }[];
        error?: { message?: string };
      };
      if (!r.ok) throw new Error(j.error?.message ?? `HTTP ${r.status}`);
      for (const it of j.items ?? []) {
        const id = it.id?.videoId;
        if (!id) continue;
        depuisVideo({
          id,
          titre: texteNu(it.snippet?.title),
          chaine: texteNu(it.snippet?.channelTitle),
          date: it.snippet?.publishedAt ?? null,
          description: texteNu(it.snippet?.description),
        });
      }
    } catch (e) {
      pannes.push(`youtube « ${q} » : ${(e as Error).message}`);
      /* Quota epuise : inutile d'insister. */
      if (/quota/i.test((e as Error).message)) return;
    }
  }
}

/* ═══ 3. LES DISCUSSIONS ═══

   LES FORUMS DES MARQUES d'abord (Elektronauts, op-forums, celui d'Arturia,
   de Steinberg...) : tout ce qui s'y dit concerne la marque. Puis les
   forums generaux, ou l'on ne garde que ce qui nomme le catalogue.

   REDDIT LIMITE LES LECTURES ANONYMES (429 apres une rafale, mesure le
   18 octobre 2026) : une lecture toutes les quatre secondes, avec un nom
   d'agent qui dit qui lit, et on s'arrete apres trois refus de suite plutot
   que d'insister. */

const FORUMS_LIBRES: readonly { nom: string; flux: string }[] = [
  { nom: 'Elektronauts', flux: 'https://www.elektronauts.com/latest.rss' },
  { nom: 'Audiofanzine', flux: 'https://fr.audiofanzine.com/forums/a.rss.xml' },
];

let refusReddit = 0;
async function lireReddit(url: string, source: string, imposee?: Marque): Promise<void> {
  if (refusReddit >= 3) return;
  try {
    /* Le resume d'un fil Reddit n'est que du balisage (« submitted by... ») :
       le titre suffit. */
    for (const a of lireFlux(await lire(url), source)) depuisArticle({ ...a, image: null, resume: '' }, source, 'discussion', imposee);
    refusReddit = 0;
  } catch (e) {
    const m = (e as Error).message;
    if (/429|403/.test(m)) refusReddit += 1;
    pannes.push(`reddit ${source} : ${m}${refusReddit >= 3 ? ' (Reddit abandonne pour cette passe)' : ''}`);
  }
  await pause(4000);
}

async function discussions(): Promise<void> {
  const forums = [
    ...MARQUES.flatMap((m) => (m.forum ? [{ ...m.forum, marque: m as Marque | undefined }] : [])),
    ...FORUMS_LIBRES.map((f) => ({ ...f, marque: undefined })),
  ];
  await enParallele(forums, 4, async (f) => {
    try {
      for (const a of lireFlux(await lire(f.flux, NAVIGATEUR), f.nom)) depuisArticle({ ...a, image: null }, f.nom, 'discussion', f.marque);
    } catch (e) {
      pannes.push(`forum ${f.nom} : ${(e as Error).message}`);
    }
  });
  for (const m of MARQUES.filter((x) => x.reddit)) {
    await lireReddit(`https://www.reddit.com/r/${m.reddit}/new/.rss?limit=50`, `r/${m.reddit}`, m);
  }
  for (const f of FORUMS_GENERAUX) await lireReddit(`https://www.reddit.com/r/${f}/new/.rss?limit=50`, `r/${f}`);
  for (const x of tranche(BUDGET_REDDIT, 13)) {
    await lireReddit(`https://www.reddit.com/search.rss?q=${encodeURIComponent(`"${requeteDe(x)}"`)}&sort=new&limit=25`, 'Reddit');
  }
}

/* ═══ 4. LES IMAGES MANQUANTES ═══ Un article sans image dans son flux a
   souvent la sienne dans sa page (og:image). On va la chercher pour les
   articles seulement : une discussion n'en a pas besoin. */
async function completerImages(): Promise<void> {
  const sans = [...lignes.values()].filter((l) => l.genre === 'article' && !l.image).slice(0, PLEIN ? 1500 : 250);
  await enParallele(sans, 8, async (l) => {
    try {
      const img = imageDePage(await lire(l.lien, NAVIGATEUR));
      if (img?.startsWith('https://')) l.image = img;
    } catch {
      /* Pas d'image : la ligne reste, avec l'icone de son genre. */
    }
  });
}

/* ═══ 5. L'ECRITURE ═══ */

async function verser(toutes: readonly Ligne[]): Promise<void> {
  for (let i = 0; i < toutes.length; i += 400) {
    const lot = toutes.slice(i, i + 400);
    const r = await fetch(`${URL_BASE}/rest/v1/rpc/verser_actu_marques`, {
      method: 'POST',
      headers: { apikey: CLE_SERVICE, authorization: `Bearer ${CLE_SERVICE}`, 'content-type': 'application/json' },
      body: JSON.stringify({ lignes: lot }),
    });
    if (!r.ok) throw new Error(`verser : HTTP ${r.status} ${await r.text()}`);
  }
}

/** Le nombre de lignes de l'archive, ou null sans acces a la base. */
async function tailleDeLArchive(): Promise<number | null> {
  if (!CLE_SERVICE || !URL_BASE || SORTIE) return null;
  const r = await fetch(`${URL_BASE}/rest/v1/actu_marques?select=lien&limit=1`, {
    headers: { apikey: CLE_SERVICE, authorization: `Bearer ${CLE_SERVICE}`, prefer: 'count=exact' },
  });
  const total = r.headers.get('content-range')?.split('/')[1];
  return total && /^\d+$/.test(total) ? Number(total) : null;
}

async function main(): Promise<void> {
  const debut = Date.now();
  const taille = await tailleDeLArchive();
  if (taille !== null && taille < 3000 && !PLEIN) {
    PLEIN = true;
    console.log(`Archive de ${taille} lignes : premiere passe complete.`);
  }
  fixerLesBudgets();
  await Promise.all([articlesDesFlux(), videosDesChaines(), discussions()]);
  await articlesParRecherche();
  await videosParRecherche();
  await completerImages();

  const toutes = [...lignes.values()];
  const parGenre = (g: Genre): number => toutes.filter((l) => l.genre === g).length;
  console.log(
    `Moisson des marques : ${toutes.length} lignes (${parGenre('article')} articles, ${parGenre('video')} videos, ` +
      `${parGenre('discussion')} discussions), ${requetes} requetes, ${Math.round((Date.now() - debut) / 1000)} s.`
  );
  if (pannes.length > 0) console.log(`${pannes.length} panne(s) :\n  ${pannes.slice(0, 40).join('\n  ')}`);

  if (SORTIE || !CLE_SERVICE || !URL_BASE) {
    const chemin = SORTIE ?? 'actu-marques.json';
    writeFileSync(chemin, JSON.stringify(toutes));
    console.log(`Ecrit dans ${chemin} (${SORTIE ? 'demande' : 'pas de cle de service'}).`);
    return;
  }
  await verser(toutes);
  console.log('Verse dans actu_marques.');
}

await main();
