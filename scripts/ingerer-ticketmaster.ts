/* L'ADAPTATEUR TICKETMASTER : les grandes salles, par l'API et non par la page.
 *
 * Usage : npm run ingerer:ticketmaster -- --lire        (montre, n'ecrit rien)
 *         SUPABASE_SERVICE_ROLE_KEY=... npm run ingerer:ticketmaster
 *         npm run ingerer:ticketmaster -- --ville=montpellier-fr
 *
 * ═══ POURQUOI C'EST LA SEULE SOURCE QU'ON LIT PAR UNE API ═══
 *
 * Shotgun exige un Chrome pilote, Eventbrite se lit en JSON-LD, Lepointdevente
 * se cherche par mot-cle. Ticketmaster est le seul des quatre a publier une
 * API documentee, Discovery v2, avec une cle gratuite : 5000 appels par jour,
 * cinq par seconde. Une ville tient en trois appels. C'est aussi la seule
 * source qui dit LE GENRE par un champ, et non par un mot dans un titre.
 *
 * La cle vient du portail developpeur, developer-account.ticketmaster.com,
 * qui est un compte SEPARE de la billetterie ticketmaster.ca : les
 * identifiants de l'un ne valent rien chez l'autre, et la mesure du 7
 * septembre 2026 lui a coute une soiree. Elle se pose dans .env sous
 * TICKETMASTER_API_KEY et ne s'ecrit nulle part ailleurs.
 *
 * ═══ MESURE DU 7 SEPTEMBRE 2026, QUI A DECIDE DU FILTRE ═══
 *
 * « Montreal, Music » : 416 fiches. Sur les 200 premieres, 27 sont
 * classees Dance/Electronic, par la fiche ou par un de ses artistes. Le reste
 * est du rock, du jazz, de la chanson : Ticketmaster est la billetterie des
 * salles moyennes et grandes, MTELUS, Beanfield, L'Olympia, et ces salles
 * font de tout.
 *
 * On garde une fiche si SON GENRE est Dance/Electronic, ou si celui d'un de
 * ses artistes l'est. Le champ de l'artiste rattrape « Kontravoid & Buzz
 * Kull », que la fiche range sous Rock.
 *
 * PAS DE CHEMIN PAR MOT, ET C'EST MESURE. La premiere version ajoutait le
 * vocabulaire d'Eventbrite en dernier recours : 28 fiches de plus sur 416,
 * et LES 28 ETAIENT FAUSSES. Vingt revues Motown et cabarets « Disco »,
 * « Jungle Rot » pris par jungle, « Uncle Acid » pris par acid. Eventbrite
 * n'a pas de champ de genre, le mot y est le seul indice ; Ticketmaster en a
 * un sur chaque fiche, et quand il dit R&B, c'est du R&B. Le mot ne doit pas
 * donner tort au champ.
 *
 * ═══ LE SOUS-GENRE N'EST PAS ECRIT, ET C'EST MESURE ═══
 *
 * Sur 22 fiches Dance/Electronic, 17 portent le sous-genre « Amapiano » :
 * Channel Tres, BUNT., Tinlicker, Virtual Riot, une soiree annees 80. Ce
 * n'est pas un fait, c'est la valeur par defaut que quelqu'un a laissee. On
 * n'ecrit donc AUCUN sous-genre : un style absent vaut mieux qu'un style
 * faux, et le calendrier sait afficher une soiree sans style.
 *
 * ═══ CE QU'ON LAISSE ═══
 *
 * Le promoteur, « EVENKO CO-PRO NON-LN / LOC / CANADA EAST », est un code
 * interne, pas un nom qu'on affiche. Le « pleaseNote » est un texte legal.
 * La description vient du champ « info », present sur une fiche sur six.
 * Le prix n'est publie que sur deux fiches sur deux cents ; on l'ecrit quand
 * il est la.
 *
 * ═══ IDEMPOTENT, COMME LES TROIS AUTRES ═══
 *
 * Upsert sur (source, source_ref), ou source_ref est l'identifiant Discovery
 * de la fiche. Relancer ne duplique rien.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ── Les cles, lues dans .env et jamais ecrites ici ───────────────────── */

function lireEnv(): void {
  const chemin = fileURLToPath(new URL('../.env', import.meta.url));
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(ligne.trim());
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '');
  }
}
lireEnv();

const CLE_TICKETMASTER = process.env['TICKETMASTER_API_KEY'] ?? '';

/* ── Ce qu'on va chercher ─────────────────────────────────────────────── */

interface Ville {
  readonly sonaa: string;
  readonly ville: string;
  readonly pays: string;
}

/* Le filtre « city » de Discovery prend « Montreal », « Montréal » et
   « Montreal  » avec une espace : les trois graphies existent chez eux. */
const VILLES: readonly Ville[] = [
  { sonaa: 'montreal-ca', ville: 'Montreal', pays: 'CA' },
  { sonaa: 'montpellier-fr', ville: 'Montpellier', pays: 'FR' },
  { sonaa: 'toulouse-fr', ville: 'Toulouse', pays: 'FR' },
];

const GENRE_ELECTRONIQUE = 'Dance/Electronic';

/* ── La forme des reponses de Discovery, reduite a ce qu'on lit ────────── */

interface Classification {
  readonly segment?: { readonly name?: string };
  readonly genre?: { readonly name?: string };
  readonly subGenre?: { readonly name?: string };
}

interface Image {
  readonly ratio?: string;
  readonly url?: string;
  readonly width?: number;
}

export interface Evenement {
  readonly id: string;
  readonly name: string;
  readonly url?: string;
  readonly test?: boolean;
  readonly info?: string;
  readonly images?: readonly Image[];
  readonly dates?: {
    readonly start?: { readonly dateTime?: string; readonly localDate?: string };
    readonly status?: { readonly code?: string };
  };
  readonly classifications?: readonly Classification[];
  readonly priceRanges?: readonly { readonly min?: number; readonly max?: number; readonly currency?: string }[];
  readonly _embedded?: {
    readonly venues?: readonly {
      readonly name?: string;
      readonly address?: { readonly line1?: string };
    }[];
    readonly attractions?: readonly {
      readonly name?: string;
      readonly classifications?: readonly Classification[];
    }[];
  };
}

interface Page {
  readonly _embedded?: { readonly events?: readonly Evenement[] };
  readonly page?: { readonly totalPages?: number; readonly totalElements?: number };
}

interface Fiche {
  readonly ref: string;
  readonly lien: string;
  readonly titre: string;
  readonly debut: string;
  readonly lieu: string | null;
  readonly adresse: string | null;
  readonly artistes: readonly string[];
  readonly affiche: string | null;
  readonly description: string | null;
  readonly prix: string | null;
}

/* ── La ligne de commande ─────────────────────────────────────────────── */

const args = process.argv.slice(2);
const lire = args.includes('--lire');
const opt = (nom: string): string | null => {
  const t = args.find((a) => a.startsWith(`--${nom}=`));
  return t ? (t.split('=')[1] ?? null) : null;
};
const VILLE_DEMANDEE = opt('ville') ?? 'montreal-ca';

/* Cinq appels par seconde autorises ; on en fait trois. */
const PAUSE = 350;
const PAGES_MAX = 10;
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* ── La decision : garder ou non ──────────────────────────────────────── */

const texte = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

const estDanseElectronique = (cl: readonly Classification[] | undefined): boolean =>
  (cl ?? []).some((c) => c.genre?.name === GENRE_ELECTRONIQUE);

/** Pourquoi une fiche a sa place ici, ou null si elle ne l'a pas. Le champ
    de genre de la fiche d'abord, celui de ses artistes ensuite, et rien
    d'autre : voir l'en-tete pour l'absence du vocabulaire. */
export function raisonDeGarder(e: Evenement): 'genre' | 'artiste' | null {
  if (e.test) return null;
  if (e.dates?.status?.code === 'cancelled') return null;
  if (estDanseElectronique(e.classifications)) return 'genre';
  const artistes = e._embedded?.attractions ?? [];
  return artistes.some((a) => estDanseElectronique(a.classifications)) ? 'artiste' : null;
}

/** L'image 16:9 la plus petite qui depasse mille pixels de large : assez
    pour une carte, sans le fichier source de deux mille quatre cents. */
export function afficheDe(images: readonly Image[] | undefined): string | null {
  const larges = (images ?? [])
    .filter((i) => i.ratio === '16_9' && typeof i.width === 'number' && i.width >= 1000 && i.url)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return larges[0]?.url ?? null;
}

export function prixDe(gammes: Evenement['priceRanges']): string | null {
  const g = gammes?.[0];
  if (!g || typeof g.min !== 'number' || typeof g.max !== 'number') return null;
  const devise = g.currency ?? 'CAD';
  const s = devise === 'CAD' ? ' $' : devise === 'EUR' ? ' €' : ` ${devise}`;
  if (g.min === 0 && g.max === 0) return 'Gratuit';
  return g.min === g.max ? `${g.min}${s}` : `${g.min} a ${g.max}${s}`;
}

/** La fiche telle qu'on l'ecrit, ou null si la date n'est pas connue :
    une soiree sans heure s'afficherait a minuit, et ce serait un mensonge. */
export function ficheDe(e: Evenement): Fiche | null {
  const debut = texte(e.dates?.start?.dateTime);
  const titre = texte(e.name);
  const lien = texte(e.url);
  if (!debut || !titre || !lien) return null;
  const salle = e._embedded?.venues?.[0];
  return {
    ref: e.id,
    lien,
    titre,
    debut,
    lieu: texte(salle?.name),
    adresse: texte(salle?.address?.line1),
    artistes: (e._embedded?.attractions ?? [])
      .map((a) => texte(a.name))
      .filter((n): n is string => n !== null),
    affiche: afficheDe(e.images),
    description: texte(e.info),
    prix: prixDe(e.priceRanges),
  };
}

/* ── La lecture ───────────────────────────────────────────────────────── */

async function pageDe(ville: Ville, numero: number): Promise<Page> {
  const u = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  u.searchParams.set('apikey', CLE_TICKETMASTER);
  u.searchParams.set('city', ville.ville);
  u.searchParams.set('countryCode', ville.pays);
  u.searchParams.set('classificationName', 'music');
  u.searchParams.set('size', '200');
  u.searchParams.set('sort', 'date,asc');
  /* SANS `locale=*`, LA FRANCE EST VIDE. Mesure du 7 septembre 2026 : la
     locale par defaut est en-us, et Montpellier rend 0 fiche, Toulouse 0.
     Avec l'etoile, 91 et 161, dont Paul Kalkbrenner et Cocoon. Montreal ne
     bouge pas : 416 dans les deux cas. */
  u.searchParams.set('locale', '*');
  u.searchParams.set('page', String(numero));
  const r = await fetch(u);
  if (r.status === 401) throw new Error('clé refusée : vérifiez TICKETMASTER_API_KEY dans .env');
  if (r.status === 429) throw new Error('quota Ticketmaster atteint, réessayez plus tard');
  if (!r.ok) throw new Error(`Discovery ${r.status} sur la page ${numero}`);
  return (await r.json()) as Page;
}

async function lireLaVille(ville: Ville): Promise<readonly Evenement[]> {
  const tous: Evenement[] = [];
  let pages = 1;
  for (let n = 0; n < pages && n < PAGES_MAX; n += 1) {
    const p = await pageDe(ville, n);
    pages = p.page?.totalPages ?? 1;
    if (n === 0) console.log(`  ${p.page?.totalElements ?? 0} fiches musicales chez Ticketmaster, ${pages} page(s)`);
    tous.push(...(p._embedded?.events ?? []));
    await dormir(PAUSE);
  }
  return tous;
}

/* ── L'ecriture ───────────────────────────────────────────────────────── */

const URL_BASE = process.env['VITE_SUPABASE_URL'] ?? 'https://pqgapyfqkjzvwkulxnhv.supabase.co';
const CLE_SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

async function identifiantDeVille(slug: string): Promise<string | null> {
  const cle = process.env['VITE_SUPABASE_ANON_KEY'] ?? CLE_SERVICE;
  const r = await fetch(`${URL_BASE}/rest/v1/villes?slug=eq.${slug}&select=id`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
  });
  if (!r.ok) return null;
  return ((await r.json()) as { id: string }[])[0]?.id ?? null;
}

async function verser(villeId: string, fiches: readonly Fiche[]): Promise<number> {
  const lignes = fiches.map((f) => ({
    ville_id: villeId, titre: f.titre, debut: f.debut, fin: null, lieu: f.lieu, adresse: f.adresse,
    artistes: f.artistes, genres: [], lien: f.lien, affiche: f.affiche,
    description: f.description, prix: f.prix, organisateur: null,
    source: 'ticketmaster', source_ref: f.ref, publiee: true,
  }));
  const r = await fetch(`${URL_BASE}/rest/v1/soirees_manuelles?on_conflict=source,source_ref`, {
    method: 'POST',
    headers: {
      apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}`, 'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(lignes),
  });
  if (!r.ok) throw new Error(`ecriture refusee : ${r.status} ${await r.text()}`);
  return lignes.length;
}

/* ── Le parcours ──────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  if (!CLE_TICKETMASTER) {
    throw new Error('TICKETMASTER_API_KEY absente de .env : la clé se lit sur developer-account.ticketmaster.com.');
  }
  const ville = VILLES.find((v) => v.sonaa === VILLE_DEMANDEE);
  if (!ville) throw new Error(`Ville inconnue : ${VILLE_DEMANDEE}. Connues : ${VILLES.map((v) => v.sonaa).join(', ')}`);

  console.log(`${ville.ville.toUpperCase()}, Ticketmaster`);
  const tous = await lireLaVille(ville);

  const fiches: Fiche[] = [];
  const raisons = { genre: 0, artiste: 0 };
  let sansDate = 0;
  for (const e of tous) {
    const raison = raisonDeGarder(e);
    if (!raison) continue;
    const f = ficheDe(e);
    if (!f) {
      sansDate += 1;
      continue;
    }
    raisons[raison] += 1;
    fiches.push(f);
  }
  console.log(
    `  ${fiches.length} soirées retenues : ${raisons.genre} par le genre de la fiche, ${raisons.artiste} par celui d’un artiste`
  );
  if (sansDate > 0) console.log(`  ${sansDate} écartée(s) faute d’heure annoncée`);

  const releve = { fait: new Date().toISOString(), [ville.sonaa]: fiches };
  if (lire || !CLE_SERVICE) {
    const chemin = 'scripts/donnees/ticketmaster-releve.json';
    writeFileSync(chemin, JSON.stringify(releve, null, 2), 'utf8');
    console.log(`\n${fiches.length} soirées écrites dans ${chemin}.`);
    if (!CLE_SERVICE && !lire) {
      console.log('Rien versé en base : posez SUPABASE_SERVICE_ROLE_KEY dans l’environnement pour écrire.');
    }
    return;
  }
  const id = await identifiantDeVille(ville.sonaa);
  if (!id) throw new Error(`${ville.sonaa} absente de la table villes.`);
  console.log(`\n${await verser(id, fiches)} soirées versées.`);
}

const pointDentree = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (pointDentree === import.meta.url) {
  main().catch((e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
