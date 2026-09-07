/* L'ADAPTATEUR EVENTBRITE : les soirees montrealaises qui ne sont pas chez RA.
 *
 * Usage : npm run ingerer:eventbrite -- --lire        (montre, n'ecrit rien)
 *         SUPABASE_SERVICE_ROLE_KEY=... npm run ingerer:eventbrite
 *         npm run ingerer:eventbrite -- --pages=3       (pour un essai court)
 *
 * ═══ POURQUOI EVENTBRITE, ET POURQUOI MAINTENANT ═══
 *
 * Montreal, la ville que Mika lance, n'avait qu'une source : Resident Advisor,
 * plus six soirees saisies a la main. Shotgun, qui a tout donne en France, y
 * rend trois soirees. Eventbrite est la billetterie des petits organisateurs
 * montrealais, ceux qui n'ont ni RA ni Ticketmaster : collectifs, raves de
 * quartier, soirees a theme.
 *
 * ═══ MESURE DU 7 SEPTEMBRE 2026, QUI A DECIDE DE LA FORME ═══
 *
 * Eventbrite se lit SANS NAVIGATEUR. Un simple GET avec un en-tete de
 * navigateur rend 200, et chaque page de liste porte vingt fiches en JSON-LD
 * dans un ItemList. Quatorze pages pour « electronic-music » a Montreal, 277
 * fiches distinctes. C'est l'inverse de Shotgun, qui exige un Chrome pilote :
 * pas de Playwright ici, pas de pause de 650 ms, un fetch et c'est tout.
 *
 * MAIS LA LISTE NE DONNE QUE LA DATE : « 2026-11-06 », sans heure. La fiche,
 * elle, donne « 2026-09-11T21:00:00-04:00 », avec le fuseau, plus la
 * description, l'adresse, l'organisateur, les artistes et la fourchette de
 * prix. On lit donc la liste pour DECOUVRIR, la fiche pour SAVOIR. Une
 * requete par fiche, sans quoi le calendrier afficherait « 00 h 00 » sur
 * toutes les soirees d'un vendredi soir.
 *
 * ═══ LES CATEGORIES SONT UNE UNION, ET « house » N'EN FAIT PAS PARTIE ═══
 *
 * Eventbrite range par categories d'adresse. « electronic-music » ne prend
 * pas tout : « techno », « edm » et « dance-music » en ajoutent. On les
 * reunit et on dedoublonne par adresse de fiche. « house », elle, rend
 * « Financial Open House » et « Loyola High School Open House » : le mot est
 * ambigu en anglais, et la categorie est exclue a dessein. La voir figurer un
 * jour dans cette liste devra s'accompagner d'une mesure.
 *
 * ═══ LA CATEGORIE N'EST PAS UN GENRE, ET LA PREMIERE MOISSON L'A PROUVE ═══
 *
 * Mesure du 7 septembre 2026, sur les 373 fiches versees : 38 surement
 * electroniques, 126 franchement hors sujet, 199 indeterminees. La premiere
 * carte affichee a Montreal etait un concert metal. Dans « electronic-music »
 * a Montreal, Eventbrite range aussi des soirees trivia, des hommages a
 * Ginette Reno dans des eglises de banlieue, Elvis Fever et des tributs aux
 * Beatles : pour cette ville, la categorie veut dire « musique », au sens
 * large, et rien de plus.
 *
 * On ne garde donc qu'une fiche dont le titre, la description ou
 * l'organisateur porte un mot du vocabulaire electronique. C'est un filtre
 * par mots, donc imparfait dans les deux sens : il laissera passer un
 * « DJ » de mariage et rejettera une soiree qui ne dit pas son style. Il
 * est prefere a l'absence de filtre, qui remplissait le calendrier de bruit
 * a plus de trente contre un. Les fiches ecartees sont comptees et dites.
 *
 * ═══ IDEMPOTENT, COMME SHOTGUN ═══
 *
 * Upsert sur (source, source_ref), ou source_ref est l'identifiant numerique
 * de la fiche, la fin de son adresse. Relancer ne duplique rien.
 */

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* ── Ce qu'on va chercher ─────────────────────────────────────────────── */

const VILLE_SONAA = 'montreal-ca';
const VILLE_EVENTBRITE = 'canada--montreal';

/* Les categories reunies. Voir l'en-tete pour l'absence de « house ». */
const CATEGORIES = ['electronic-music', 'techno', 'edm', 'dance-music', 'electronic-music--nightlife'];

interface Fiche {
  readonly ref: string;
  readonly lien: string;
  readonly titre: string;
  readonly debut: string;
  readonly fin: string | null;
  readonly lieu: string | null;
  readonly adresse: string | null;
  readonly artistes: readonly string[];
  readonly genres: readonly string[];
  readonly affiche: string | null;
  readonly description: string | null;
  readonly prix: string | null;
  readonly organisateur: string | null;
}

/* ── La ligne de commande ─────────────────────────────────────────────── */

const args = process.argv.slice(2);
const lire = args.includes('--lire');
const opt = (nom: string): string | null => {
  const t = args.find((a) => a.startsWith(`--${nom}=`));
  return t ? (t.split('=')[1] ?? null) : null;
};
/* Vingt pages par categorie : la mesure en a compte quatorze pour la plus
   grosse. On s'arrete de toute facon des qu'une page n'apporte rien. */
const PAGES_MAX = Number(opt('pages') ?? 20);

const AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const PAUSE = 400;
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function page(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'User-Agent': AGENT, 'Accept-Language': 'fr-CA,fr;q=0.9' } });
  if (!r.ok) throw new Error(`${r.status} sur ${url}`);
  return r.text();
}

/* ── Lire le JSON-LD d'une page ───────────────────────────────────────── */

type Objet = Record<string, unknown>;

/** Tous les objets Event d'une page, qu'ils soient a la racine, dans un
    tableau ou dans un ItemList. Eventbrite emploie les trois formes. */
function evenements(html: string): Objet[] {
  const out: Objet[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let lu: unknown;
    try {
      lu = JSON.parse(m[1] ?? '');
    } catch {
      continue;
    }
    for (const x of Array.isArray(lu) ? lu : [lu]) {
      const o = x as Objet;
      if (typeof o?.['@type'] === 'string' && (o['@type'] as string).includes('Event')) out.push(o);
      const liste = o?.['itemListElement'];
      if (Array.isArray(liste)) {
        for (const it of liste) {
          const y = ((it as Objet)['item'] ?? it) as Objet;
          if (typeof y?.['@type'] === 'string' && (y['@type'] as string).includes('Event')) out.push(y);
        }
      }
    }
  }
  return out;
}

const texte = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

/** Les mots qui font qu'une fiche a sa place dans un atlas des musiques
    electroniques. Volontairement larges du cote electronique (« disco »,
    « dj », « remix ») et sans aucun mot d'exclusion : un mot d'exclusion
    rejetterait « techno-metal » pour le mot metal. On ne juge que sur la
    presence, jamais sur l'absence. */
export const MOTS_ELECTRONIQUES =
  /(techno|house|rave|\bdj\b|electro|trance|drum|bass|dubstep|garage|club night|afterhours|after-hours|boiler|warehouse|minimal|acid|disco|dance party|soirée dansante|synth|ambient|breakbeat|jungle|hardstyle|edm|remix|\bset\b|b2b|live set|dance floor|dancefloor|nightclub)/i;

export const estElectronique = (titre: string, description: string | null, organisateur: string | null): boolean =>
  MOTS_ELECTRONIQUES.test(`${titre} ${description ?? ''} ${organisateur ?? ''}`);

/* ── Etape 1 : decouvrir les adresses de fiches ───────────────────────── */

async function decouvrir(): Promise<Map<string, string>> {
  /* ref -> url. La ref est le nombre en fin d'adresse : c'est la seule partie
     stable, le slug qui la precede change quand l'organisateur renomme. */
  const refs = new Map<string, string>();
  for (const cat of CATEGORIES) {
    let neuvesCat = 0;
    for (let p = 1; p <= PAGES_MAX; p += 1) {
      let html: string;
      try {
        html = await page(`https://www.eventbrite.ca/d/${VILLE_EVENTBRITE}/${cat}/?page=${p}`);
      } catch (e) {
        console.log(`  ${cat} page ${p} : ${(e as Error).message}`);
        break;
      }
      let neuves = 0;
      for (const e of evenements(html)) {
        const url = texte(e['url']);
        const ref = url?.match(/-(\d+)\/?$/)?.[1] ?? url?.match(/(\d{8,})/)?.[1];
        if (!url || !ref || refs.has(ref)) continue;
        refs.set(ref, url);
        neuves += 1;
      }
      neuvesCat += neuves;
      if (neuves === 0) break;
      await dormir(PAUSE);
    }
    console.log(`  ${cat.padEnd(28)} +${neuvesCat} fiches nouvelles`);
  }
  return refs;
}

/* ── Etape 2 : lire chaque fiche ──────────────────────────────────────── */

/** LE PRIX EST UNE FOURCHETTE. Eventbrite donne un AggregateOffer avec
    lowPrice et highPrice ; a zero des deux cotes c'est gratuit. */
function prixDe(offres: unknown): string | null {
  const o = (Array.isArray(offres) ? offres[0] : offres) as Objet | undefined;
  if (!o) return null;
  const bas = Number(o['lowPrice'] ?? o['price']);
  const haut = Number(o['highPrice'] ?? o['price']);
  if (!Number.isFinite(bas) || !Number.isFinite(haut)) return null;
  const devise = texte(o['priceCurrency']) ?? 'CAD';
  const s = devise === 'CAD' ? ' $' : devise === 'EUR' ? ' €' : ` ${devise}`;
  if (bas === 0 && haut === 0) return 'Gratuit';
  return bas === haut ? `${bas}${s}` : `${bas} a ${haut}${s}`;
}

async function lireLaFiche(ref: string, url: string): Promise<Fiche | null> {
  const e = evenements(await page(url))[0];
  if (!e) return null;
  const titre = texte(e['name']);
  const debut = texte(e['startDate']);
  if (!titre || !debut) return null;

  const lieu = e['location'] as Objet | undefined;
  const adr = lieu?.['address'] as Objet | undefined;
  const rue = texte(adr?.['streetAddress']);

  const perf = e['performer'];
  const artistes = (Array.isArray(perf) ? perf : perf ? [perf] : [])
    .map((p) => texte((p as Objet)['name']))
    .filter((n): n is string => n !== null);

  const orga = e['organizer'] as Objet | undefined;
  const image = e['image'];

  return {
    ref,
    lien: url,
    titre,
    debut,
    fin: texte(e['endDate']),
    lieu: texte(lieu?.['name']),
    adresse: rue,
    artistes,
    /* EVENTBRITE NE DIT PAS LE STYLE. Ses fiches n'ont pas de champ de genre,
       et la categorie d'adresse est trop large pour etre ecrite comme un
       style (« electronic-music » couvre une rave emo-anime). On ne pose
       rien : un style absent vaut mieux qu'un style faux. */
    genres: [],
    affiche: typeof image === 'string' ? image : Array.isArray(image) ? texte(image[0]) : null,
    description: texte(e['description']),
    prix: prixDe(e['offers']),
    organisateur: texte(orga?.['name']),
  };
}

/* ── L'ecriture ───────────────────────────────────────────────────────── */

const URL_BASE = process.env['VITE_SUPABASE_URL'] ?? 'https://pqgapyfqkjzvwkulxnhv.supabase.co';
const CLE_SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

async function identifiantDeVille(): Promise<string | null> {
  const cle = process.env['VITE_SUPABASE_ANON_KEY'] ?? CLE_SERVICE;
  const r = await fetch(`${URL_BASE}/rest/v1/villes?slug=eq.${VILLE_SONAA}&select=id`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
  });
  if (!r.ok) return null;
  return ((await r.json()) as { id: string }[])[0]?.id ?? null;
}

async function verser(villeId: string, fiches: readonly Fiche[]): Promise<number> {
  const lignes = fiches.map((f) => ({
    ville_id: villeId, titre: f.titre, debut: f.debut, fin: f.fin, lieu: f.lieu, adresse: f.adresse,
    artistes: f.artistes, genres: f.genres, lien: f.lien, affiche: f.affiche,
    description: f.description, prix: f.prix, organisateur: f.organisateur,
    source: 'eventbrite', source_ref: f.ref, publiee: true,
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
  console.log('MONTRÉAL, Eventbrite');
  const refs = await decouvrir();
  console.log(`  ${refs.size} fiches distinctes à lire\n`);

  const fiches: Fiche[] = [];
  let n = 0;
  let ecartees = 0;
  for (const [ref, url] of refs) {
    n += 1;
    try {
      const f = await lireLaFiche(ref, url);
      if (!f) console.log(`  ${n}/${refs.size} ${ref} : pas de JSON-LD, ignorée`);
      else if (!estElectronique(f.titre, f.description, f.organisateur)) ecartees += 1;
      else fiches.push(f);
    } catch (e) {
      console.log(`  ${n}/${refs.size} ${ref} : ${(e as Error).message}`);
    }
    if (n % 25 === 0) console.log(`  ${n}/${refs.size} lues`);
    await dormir(PAUSE);
  }
  console.log(`  ${fiches.length} soirées retenues, ${ecartees} écartées faute de mot électronique`);

  const releve = { fait: new Date().toISOString(), [VILLE_SONAA]: fiches };
  if (lire || !CLE_SERVICE) {
    const chemin = 'scripts/donnees/eventbrite-releve.json';
    writeFileSync(chemin, JSON.stringify(releve, null, 2), 'utf8');
    console.log(`\n${fiches.length} soirées écrites dans ${chemin}.`);
    if (!CLE_SERVICE && !lire) {
      console.log('Rien versé en base : posez SUPABASE_SERVICE_ROLE_KEY dans l’environnement pour écrire.');
    }
    return;
  }
  const id = await identifiantDeVille();
  if (!id) throw new Error(`${VILLE_SONAA} absente de la table villes.`);
  console.log(`\n${await verser(id, fiches)} soirées versées.`);
}

const pointDentree = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (pointDentree === import.meta.url) {
  main().catch((e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
