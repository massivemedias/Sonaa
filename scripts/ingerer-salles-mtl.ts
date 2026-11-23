/* L'ADAPTATEUR DES SALLES DE MONTREAL : les calendriers directs en JSON.
 *
 * Usage : npm run ingerer:salles-mtl -- --lire   (montre, n'ecrit rien)
 *         SUPABASE_SERVICE_ROLE_KEY=... npm run ingerer:salles-mtl
 *
 * ═══ POURQUOI CET ADAPTATEUR ═══
 *
 * Audit du 23 novembre 2026 sur 33 clubs et salles electro de Montreal :
 * plusieurs lieux majeurs ne passent ni par Resident Advisor ni par
 * Ticketmaster ni par Eventbrite, ou publient sur des billetteries (Universe,
 * Dice, Tixr) que SONAA ne lit pas. En revanche, leurs propres sites exposent
 * un flux JSON public, propre et sans defi anti-robot :
 *   - Newspeak           (Squarespace ?format=json, 100 % electro)
 *   - New City Gas       (WordPress REST /wp-json/wp/v2/ncgevent, 100 % electro)
 *   - Ausgang Plaza      (Squarespace ?format=json, filtre estElectronique)
 *   - Bar Le Ritz PDB    (Squarespace ?format=json, filtre estElectronique)
 *   - Theatre Fairmount  (Squarespace ?format=json, filtre estElectronique)
 *
 * ═══ IDEMPOTENT ═══
 *
 * Chaque soiree est versee en upsert sur (source, source_ref) avec
 * source = 'salles-mtl' et source_ref = '<salle>:<id>'. Relancer le script
 * ne cree jamais de doublon et met a jour une horaire ou une affiche modifiee.
 */

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { estElectronique } from './ingerer-eventbrite.ts';

const VILLE_SONAA = 'montreal-ca';
const AGENT = 'SonaaAtlas/1.0 (https://sonaa.ca; massivemedias@gmail.com)';
const HORIZON_JOURS = 120;

export interface SalleSquarespace {
  readonly id: string;
  readonly nom: string;
  readonly adresse: string;
  readonly baseUrl: string;
  readonly fluxUrl: string;
  readonly toutElectronique: boolean;
}

export const SALLES_SQUARESPACE: readonly SalleSquarespace[] = [
  {
    id: 'newspeak',
    nom: 'Newspeak',
    adresse: '1403 rue Sainte-Elisabeth, Montreal, QC',
    baseUrl: 'https://www.newspeakmtl.com',
    fluxUrl: 'https://www.newspeakmtl.com/evenements?format=json',
    toutElectronique: true,
  },
  {
    id: 'ausgang',
    nom: 'Ausgang Plaza',
    adresse: '6524 rue Saint-Hubert, Montreal, QC',
    baseUrl: 'https://ausgangplaza.com',
    fluxUrl: 'https://ausgangplaza.com/evenements?format=json',
    toutElectronique: false,
  },
  {
    id: 'ritz',
    nom: 'Bar Le Ritz PDB',
    adresse: '179 rue Jean-Talon Ouest, Montreal, QC',
    baseUrl: 'https://barleritzpdb.com',
    fluxUrl: 'https://barleritzpdb.com/?format=json',
    toutElectronique: false,
  },
  {
    id: 'fairmount',
    nom: 'Théâtre Fairmount',
    adresse: '5240 avenue du Parc, Montreal, QC',
    baseUrl: 'https://theatrefairmount.com',
    fluxUrl: 'https://theatrefairmount.com/?format=json',
    toutElectronique: false,
  },
];

export interface FicheSalle {
  readonly ref: string;
  readonly lien: string;
  readonly titre: string;
  readonly debut: string;
  readonly fin: string | null;
  readonly lieu: string;
  readonly adresse: string;
  readonly artistes: readonly string[];
  readonly affiche: string | null;
  readonly description: string | null;
  readonly organisateur: string | null;
  readonly prix: string | null;
}

const sansTiretsLongs = (s: string): string => s.replace(/[\u2013\u2014]/g, '-');

/** Retire les balises style/script, decode les entites courantes et nettoie les espaces. */
export function nettoyerHtml(html: string): string {
  return sansTiretsLongs(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|h1|h2|h3|h4|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;|&#8217;|&rsquo;/gi, "'")
      .replace(/&#8211;|&#8212;/gi, '-')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim()
  );
}

const EST_UNE_DATE_SEULE =
  /^\d{1,2}\s+(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i;

export interface ItemSquarespace {
  readonly id?: string;
  readonly title?: string;
  readonly startDate?: number;
  readonly endDate?: number;
  readonly fullUrl?: string;
  readonly assetUrl?: string;
  readonly excerpt?: string;
  readonly body?: string;
}

/** Sur Bar Le Ritz PDB et Theatre Fairmount, le champ `title` porte parfois la
    date (« 26 NOVEMBRE 2026 ») et le vrai nom du spectacle est la premiere
    ligne lisible du corps HTML. */
export function extraireTitreSquarespace(item: ItemSquarespace): string {
  const brut = nettoyerHtml(item.title ?? '');
  if (brut && !EST_UNE_DATE_SEULE.test(brut)) return brut;
  const corps = nettoyerHtml(item.excerpt || item.body || '');
  const premiere = corps
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length >= 2 && !/^pr[ée]sent[ée] par|^portes|^doors|^spectacle|^18\+/i.test(l));
  if (premiere) return premiere.slice(0, 140);
  return brut;
}

/** Formate un timestamp Unix (ms) en ISO local de Montreal (-05:00 ou -04:00 selon l'heure d'ete). */
export function isoMontrealDepuisMs(ms: number): string {
  const d = new Date(ms);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  }).formatToParts(d);
  const g = (t: string): string => parts.find((p) => p.type === t)?.value ?? '00';
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tz);
  const offset = m ? `${m[1]}${m[2]!.padStart(2, '0')}:${m[3] ?? '00'}` : '-05:00';
  const hh = g('hour') === '24' ? '00' : g('hour');
  return `${g('year')}-${g('month')}-${g('day')}T${hh}:${g('minute')}:${g('second')}${offset}`;
}

export function parserSquarespace(
  payload: { upcoming?: ItemSquarespace[]; items?: ItemSquarespace[] },
  salle: SalleSquarespace,
  maintenantMs: number = Date.now()
): FicheSalle[] {
  const items = payload.upcoming ?? payload.items ?? [];
  const borneMin = maintenantMs - 6 * 3600 * 1000;
  const borneMax = maintenantMs + HORIZON_JOURS * 86400 * 1000;
  const out: FicheSalle[] = [];

  for (const it of items) {
    if (!it.id || typeof it.startDate !== 'number') continue;
    if (it.startDate < borneMin || it.startDate > borneMax) continue;
    const titre = extraireTitreSquarespace(it);
    if (!titre) continue;
    const description = nettoyerHtml(it.excerpt || it.body || '').slice(0, 600) || null;
    if (!salle.toutElectronique && !estElectronique(titre, description, salle.nom)) continue;

    const lien = it.fullUrl ? new URL(it.fullUrl, salle.baseUrl).href : salle.baseUrl;
    out.push({
      ref: `${salle.id}:${it.id}`,
      lien,
      titre,
      debut: isoMontrealDepuisMs(it.startDate),
      fin: typeof it.endDate === 'number' && it.endDate > it.startDate ? isoMontrealDepuisMs(it.endDate) : null,
      lieu: salle.nom,
      adresse: salle.adresse,
      artistes: [],
      affiche: it.assetUrl && /^https?:\/\//.test(it.assetUrl) ? it.assetUrl : null,
      description,
      organisateur: salle.nom,
      prix: null,
    });
  }
  return out;
}

export interface ItemNewCityGas {
  readonly id?: number;
  readonly link?: string;
  readonly title?: { readonly rendered?: string };
  readonly acf?: {
    readonly ncgev_id?: string;
    readonly ncgev_status?: string;
    readonly ncgev_title?: string;
    readonly ncgev_subtitle?: string;
    readonly ncgev_support?: string;
    readonly ncgev_description?: string;
    readonly ncgev_description_fr?: string;
    readonly ncgev_datestart?: string;
    readonly ncgev_dateend?: string;
    readonly ncgev_ticketprice?: number | string;
  };
  readonly _embedded?: {
    readonly 'wp:featuredmedia'?: readonly { readonly source_url?: string }[];
  };
}

/** Convertit « 2026-12-19 21:00:00 » (heure locale Montreal) en ISO avec decalage reel. */
function isoMontrealDepuisChaine(s: string | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  const mois = Number(m[2]);
  const offset = mois >= 4 && mois <= 10 ? '-04:00' : '-05:00';
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}${offset}`;
}

export function parserNewCityGas(
  items: readonly ItemNewCityGas[],
  maintenantMs: number = Date.now()
): FicheSalle[] {
  const borneMin = maintenantMs - 6 * 3600 * 1000;
  const borneMax = maintenantMs + HORIZON_JOURS * 86400 * 1000;
  const out: FicheSalle[] = [];
  const vus = new Set<string>();

  for (const it of items) {
    const acf = it.acf;
    if (!it.id || !acf) continue;
    if (acf.ncgev_status && acf.ncgev_status !== 'public') continue;
    const ref = `ncg:${acf.ncgev_id || it.id}`;
    if (vus.has(ref)) continue;
    const debut = isoMontrealDepuisChaine(acf.ncgev_datestart);
    if (!debut) continue;
    const debutMs = Date.parse(debut);
    if (!Number.isFinite(debutMs) || debutMs < borneMin || debutMs > borneMax) continue;

    const titreBrut = acf.ncgev_title || nettoyerHtml(it.title?.rendered ?? '');
    const titre = nettoyerHtml(titreBrut);
    if (!titre) continue;

    vus.add(ref);
    const fin = isoMontrealDepuisChaine(acf.ncgev_dateend);
    const descBrute = acf.ncgev_description_fr || acf.ncgev_description || '';
    const description = nettoyerHtml(descBrute).slice(0, 600) || null;
    const support = (acf.ncgev_support ?? '')
      .split(/[,&+]/)
      .map((x) => nettoyerHtml(x))
      .filter((x) => x.length >= 2);
    const artistes = [...new Set([titre, ...support])];
    const prixNum = typeof acf.ncgev_ticketprice === 'number' ? acf.ncgev_ticketprice : Number(acf.ncgev_ticketprice);
    const prix = Number.isFinite(prixNum) && prixNum > 0 ? `${prixNum} $` : null;
    const affiche = it._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null;

    out.push({
      ref,
      lien: it.link ?? 'https://newcitygas.com/evenements/',
      titre,
      debut,
      fin,
      lieu: 'New City Gas',
      adresse: '950 rue Ottawa, Montreal, QC',
      artistes,
      affiche: affiche && /^https?:\/\//.test(affiche) ? affiche : null,
      description,
      organisateur: 'Produkt / New City Gas',
      prix,
    });
  }
  return out;
}

/* ── La moisson reseau ────────────────────────────────────────────────── */

async function collecter(): Promise<FicheSalle[]> {
  const toutes: FicheSalle[] = [];
  const vus = new Set<string>();

  for (const salle of SALLES_SQUARESPACE) {
    try {
      const r = await fetch(salle.fluxUrl, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(15_000) });
      if (!r.ok) {
        console.log(`  ${salle.nom} : HTTP ${r.status}`);
        continue;
      }
      const j = (await r.json()) as { upcoming?: ItemSquarespace[]; items?: ItemSquarespace[] };
      const fiches = parserSquarespace(j, salle);
      for (const f of fiches) {
        if (!vus.has(f.ref)) {
          vus.add(f.ref);
          toutes.push(f);
        }
      }
      console.log(`  ${salle.nom.padEnd(20)} : ${fiches.length} soiree(s) retenue(s)`);
    } catch (e) {
      console.log(`  ${salle.nom} : ${(e as Error).message}`);
    }
  }

  try {
    const r = await fetch('https://newcitygas.com/wp-json/wp/v2/ncgevent?per_page=40&_embed=1', {
      headers: { 'User-Agent': AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (r.ok) {
      const j = (await r.json()) as ItemNewCityGas[];
      const fiches = parserNewCityGas(Array.isArray(j) ? j : []);
      for (const f of fiches) {
        if (!vus.has(f.ref)) {
          vus.add(f.ref);
          toutes.push(f);
        }
      }
      console.log(`  ${'New City Gas'.padEnd(20)} : ${fiches.length} soiree(s) retenue(s)`);
    } else {
      console.log(`  New City Gas : HTTP ${r.status}`);
    }
  } catch (e) {
    console.log(`  New City Gas : ${(e as Error).message}`);
  }

  return toutes;
}

/* ── L'ecriture dans Supabase ─────────────────────────────────────────── */

const URL_BASE = process.env['VITE_SUPABASE_URL'] ?? 'https://pqgapyfqkjzvwkulxnhv.supabase.co';
const CLE_SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

async function verser(fiches: readonly FicheSalle[]): Promise<number> {
  if (fiches.length === 0) return 0;
  const cle = process.env['VITE_SUPABASE_ANON_KEY'] ?? CLE_SERVICE;
  const r0 = await fetch(`${URL_BASE}/rest/v1/villes?slug=eq.${VILLE_SONAA}&select=id`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
  });
  const villeId = ((await r0.json()) as { id: string }[])[0]?.id;
  if (!villeId) throw new Error(`${VILLE_SONAA} absente de la table villes.`);

  const lignes = fiches.map((f) => ({
    ville_id: villeId,
    titre: f.titre,
    debut: f.debut,
    fin: f.fin,
    lieu: f.lieu,
    adresse: f.adresse,
    artistes: f.artistes,
    genres: [],
    lien: f.lien,
    affiche: f.affiche,
    description: f.description,
    organisateur: f.organisateur,
    prix: f.prix,
    source: 'salles-mtl',
    source_ref: f.ref,
    publiee: true,
  }));

  const r = await fetch(`${URL_BASE}/rest/v1/soirees_manuelles?on_conflict=source,source_ref`, {
    method: 'POST',
    headers: {
      apikey: CLE_SERVICE,
      Authorization: `Bearer ${CLE_SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(lignes),
  });
  if (!r.ok) throw new Error(`ecriture refusee : ${r.status} ${await r.text()}`);
  return lignes.length;
}

async function main(): Promise<void> {
  const lire = process.argv.includes('--lire');
  console.log('MONTRÉAL, calendriers directs des salles (Squarespace + WordPress)');
  const fiches = await collecter();
  console.log(`\n  Total : ${fiches.length} soiree(s) retenue(s).`);

  if (lire || !CLE_SERVICE) {
    const chemin = 'scripts/donnees/salles-mtl-releve.json';
    writeFileSync(chemin, JSON.stringify({ fait: new Date().toISOString(), [VILLE_SONAA]: fiches }, null, 2), 'utf8');
    console.log(`\n${fiches.length} soirees ecrites dans ${chemin}.`);
    return;
  }
  console.log(`\n${await verser(fiches)} soirees versees dans Supabase.`);
}

const pointDentree = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (pointDentree === import.meta.url) {
  main().catch((e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
