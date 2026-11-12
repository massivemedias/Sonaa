/* L'ADAPTATEUR EVENTBRITE : les soirees montrealaises qui ne sont pas chez RA.
 *
 * Usage : npm run ingerer:eventbrite -- --lire        (montre, n'ecrit rien)
 *         SUPABASE_SERVICE_ROLE_KEY=... npm run ingerer:eventbrite
 *         npm run ingerer:eventbrite -- --pages=3       (pour un essai court)
 *         npm run ingerer:eventbrite -- --toutes        (les vingt villes)
 *         npm run ingerer:eventbrite -- --ville=lyon-fr
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
 * ═══ LES VINGT VILLES, ET LE TRI AVANT LA LECTURE (12 novembre 2026) ═══
 *
 * Depuis ADR-118, la moisson couvre les vingt villes du calendrier. La liste
 * porte deja le titre et le debut de l'annonce de chaque fiche : le filtre
 * electronique large y passe une premiere fois, et seules les fiches qui le
 * passent sont lues en entier, puis filtrees par le filtre complet.
 * Sans ce tri, vingt villes feraient plusieurs milliers de lectures.
 *
 * ═══ BLOQUE DEPUIS LES MACHINES DE GITHUB, MESURE DU 12 NOVEMBRE 2026 ═══
 *
 * Depuis la fin d'octobre, Eventbrite rend 405 a toute requete partie d'un
 * runner GitHub, des la premiere page : la moisson de la nuit ecrivait zero
 * soiree sans echouer. La meme requete passe depuis une adresse ordinaire.
 * Le script le dit maintenant en echouant, au lieu de se taire.
 *
 * ═══ IDEMPOTENT, COMME SHOTGUN ═══
 *
 * Upsert sur (source, source_ref), ou source_ref est l'identifiant numerique
 * de la fiche, la fin de son adresse. Relancer ne duplique rien.
 */

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* ── Ce qu'on va chercher ─────────────────────────────────────────────── */

interface Ville {
  readonly sonaa: string;
  /** Le lieu tel qu'Eventbrite l'ecrit dans ses adresses /d/<lieu>/. */
  readonly eventbrite: string;
}

/* Les vingt villes du calendrier (ADR-118). Les lieux ont ete verifies un a
   un le 12 novembre 2026 : chacun rend sa liste, sans redirection. */
const VILLES: readonly Ville[] = [
  { sonaa: 'montreal-ca', eventbrite: 'canada--montreal' },
  { sonaa: 'toronto-ca', eventbrite: 'canada--toronto' },
  { sonaa: 'newyork-us', eventbrite: 'ny--new-york' },
  { sonaa: 'losangeles-us', eventbrite: 'ca--los-angeles' },
  { sonaa: 'chicago-us', eventbrite: 'il--chicago' },
  { sonaa: 'miami-us', eventbrite: 'fl--miami' },
  { sonaa: 'mexico-mx', eventbrite: 'mexico--ciudad-de-mexico' },
  { sonaa: 'saopaulo-br', eventbrite: 'brazil--s%C3%A3o-paulo' },
  { sonaa: 'londres-gb', eventbrite: 'united-kingdom--london' },
  { sonaa: 'paris-fr', eventbrite: 'france--paris' },
  { sonaa: 'lyon-fr', eventbrite: 'france--lyon' },
  { sonaa: 'marseille-fr', eventbrite: 'france--marseille' },
  { sonaa: 'toulouse-fr', eventbrite: 'france--toulouse' },
  { sonaa: 'montpellier-fr', eventbrite: 'france--montpellier' },
  { sonaa: 'berlin-de', eventbrite: 'germany--berlin' },
  { sonaa: 'amsterdam-nl', eventbrite: 'netherlands--amsterdam' },
  { sonaa: 'bruxelles-be', eventbrite: 'belgium--brussel--10471' },
  { sonaa: 'barcelone-es', eventbrite: 'spain--barcelona' },
  { sonaa: 'madrid-es', eventbrite: 'spain--madrid' },
  { sonaa: 'tokyo-jp', eventbrite: 'japan--tokyo' },
];

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
const TOUTES = args.includes('--toutes');
const VILLE_DEMANDEE = opt('ville') ?? 'montreal-ca';

const AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const PAUSE = 400;
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

class Refus extends Error {}

async function page(url: string): Promise<string> {
  /* 429 : trop vite. On attend et on reessaie trois fois, de plus en plus
     longtemps, au lieu d'abandonner la categorie entiere. */
  for (const attente of [5000, 15000, 40000, 0]) {
    const r = await fetch(url, { headers: { 'User-Agent': AGENT, 'Accept-Language': 'fr-CA,fr;q=0.9' } });
    /* 403 et 405 : la porte est fermee a cette machine, pas a cette page. */
    if (r.status === 403 || r.status === 405) throw new Refus(`${r.status} sur ${url}`);
    if (r.status === 429 && attente > 0) {
      await dormir(attente);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} sur ${url}`);
    return r.text();
  }
  throw new Error(`429 sur ${url}`);
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
    electroniques.

    BORNES DE MOT PARTOUT, ET C'EST UNE LECON. La premiere version ecrivait
    `techno` nu : « Conference on Information Technology » est passee, et
    s'est affichee en troisieme carte a Montreal. Sans borne, « trance »
    prend « entrance », « disco » prend « discount », « rave » prend
    « travel », « edm » prend « Edmonton ». Chaque mot est donc borne, et
    « technolog » est exclu a part parce que la borne ne suffit pas : le mot
    commence bien par techno.

    Sans mot d'exclusion musical, a dessein : rejeter sur « metal »
    rejetterait « techno-metal ». On ne juge que sur la presence. Le filtre
    reste imparfait dans les deux sens, et il le dit : un tournoi de golf
    avec DJ passe, une soiree qui tait son style ne passe pas. Il est prefere
    a l'absence de filtre, qui donnait 373 fiches dont 38 surement
    electroniques. */
/* ═══ CE QUI COMPTE COMME ELECTRONIQUE, ET CE QUI NE COMPTE PAS ═══

   LA PREMIERE VERSION ETAIT UNE LISTE DE MOTS, ET UN SEUL SUFFISAIT. Elle a
   laisse passer un cirque, un hommage a Ginette Reno et un quartet de jazz,
   parce que leurs annonces disaient « DJ » ou « disco » quelque part. Mika
   les a vus en tete du calendrier de Montreal le 7 septembre 2026 : « les
   trucs sur Eventbrite c'est pas de la musique electro du tout, fais
   attention a ce que tu rajoutes ».

   Il y a donc maintenant TROIS SORTES DE MOTS, et un ordre.

   Les MOTS FORTS nomment un genre electronique ou une forme qui lui est
   propre : techno, house music, drum and bass, un DJ set, un b2b. Un mot
   fort dans le TITRE suffit, quoi qu'il y ait a cote : « Techno-Metal
   Night » et « Cirque Du Rave » sont bien ce qu'ils disent.

   Les MOTS BLOQUANTS nomment une autre scene ou une autre sorte de soiree :
   un hommage, un quartet, du hip-hop, du salsa, un brunch, un tournoi de
   golf. Un bloquant dans le titre ou chez l'organisateur, sans mot fort
   dans le titre, ecarte la fiche : on ne va pas lire son annonce pour y
   trouver le mot « DJ » qui y est presque toujours.

   Les MOTS MOYENS nomment une forme sans nommer un genre : un DJ set, un
   live set, un b2b. Ils comptent comme forts, sauf face a un bloquant :
   une degustation de vins « avec DJ set » reste une degustation.

   Les MOTS FAIBLES (« DJ », « disco », « remix », « nightclub ») ne
   decident jamais seuls. Un roller disco et un DJ de mariage en portent.

   L'ANNONCE, EN DERNIER. Un genre fort dans l'annonce suffit, sauf si elle
   nomme aussi DEUX autres scenes : « pop 80/90, rock indie, latin, electro,
   musiques des Caraibes » est une soiree dansante generaliste ou l'electro
   passe entre deux autres choses, pas une soiree electronique. Un seul
   bloquant a cote ne suffit pas a ecarter : « Afro House, Amapiano,
   Afrobeats » est bien une soiree afro house. */

const FRONTIERE_GAUCHE = '(?<![a-zà-ü])';
const FRONTIERE_DROITE = '(?![a-zà-ü])';
const motif = (mots: readonly string[]): RegExp =>
  new RegExp(`${FRONTIERE_GAUCHE}(?:${mots.join('|')})${FRONTIERE_DROITE}`, 'i');

/* LA BORNE EST « PAS UNE LETTRE », PAS « PAS UN MOT ». `\b` compte un chiffre
   comme une lettre : « Down2Techno » ne passait pas, alors que c'est la
   soiree la plus pertinente de toute la moisson Lepointdevente. On borne donc
   sur les lettres seulement, accents compris : « Technology » reste exclu
   par la regle a part, « Sunset » reste exclu parce qu'un n precede set. */
export const MOTS_FORTS = motif([
  'techno', 'tech house', 'house music', 'deep house', 'afro house', 'afrohouse',
  'progressive house', 'acid house', 'minimal techno', 'electro', 'électro',
  'electronic music', 'electronic', 'électronique', 'electronica', 'electronik',
  'électronik', 'trance', 'psytrance', 'drum and bass', 'drum & bass', 'drum n bass',
  'dnb', 'dubstep', 'uk garage', 'boiler room', 'hardstyle', 'hardcore techno',
  'breakbeat', 'edm', 'italo', 'nu-disco', 'nu disco', 'synthwave', 'rave',
  'ambient', 'idm', 'bass music', 'amapiano', 'gqom', 'jersey club', 'footwork',
]);

export const MOTS_MOYENS = motif([
  'dj set', 'dj sets', 'live set', 'b2b', 'afterhours', 'after hours',
  'warehouse party', 'open format', 'aux platines',
]);

export const MOTS_BLOQUANTS = motif([
  'hommage', 'tribute', 'jazz', 'quartet', 'quatuor', '4tet', 'trio', 'orchestr[ea]',
  'symphoni[eq]?u?e?', 'symphony', 'chorale', 'choir', 'gospel', 'opéra', 'opera',
  'théâtre', 'theatre', 'theater', 'comedy', 'comédie', 'humour', 'stand-up', 'karaoke',
  'karaoké', 'trivia', 'quiz', 'yoga', 'conférence', 'conference', 'workshop',
  'atelier', 'kids?', 'enfants?', 'salsa', 'bachata', 'kizomba', 'zouk', 'semba',
  'country', 'folk', 'blues', 'punk', 'chanson', 'classique', 'classical', 'piano',
  'violon', 'gala', 'magie', 'magic', 'brunch', 'golf', 'real estate', 'immobilier',
  'marimba', 'hip-hop', 'hip hop', 'rap', 'afrobeats?', 'reggaeton', 'dancehall',
  'mariachi', 'cirque', 'circus', 'cabaret', 'burlesque', 'drag', 'bingo', 'wine',
  'vins?', 'dégustation', 'tasting', 'roller', 'anniversaire', 'birthday', 'yacht',
  'boat', 'bateau', 'croisière', 'cruise', 'throwback', '80s', '90s', '2000s',
  'rock', 'pop', 'latin', 'latino', 'reggae', 'rnb', 'r&b', 'soul', 'métal', 'metal',
]);
/* La meme liste, en global, pour COMPTER les scenes nommees dans une annonce. */
const BLOQUANTS_TOUS = new RegExp(MOTS_BLOQUANTS.source, 'gi');

/* Garde pour les tests et la lecture : ce sont les mots qui ne decident pas. */
export const MOTS_FAIBLES = motif([
  'dj', 'djs', 'disco', 'remix', 'dancefloor', 'dance floor', 'nightclub',
  'club night', 'party', 'soirée dansante',
]);

/** Le mot « techno » enclave dans « technology » n'est pas un mot. */
const PAS_UN_GENRE = /technolog/i;

export const estElectronique = (titre: string, description: string | null, organisateur: string | null): boolean => {
  const fort = (s: string): boolean => MOTS_FORTS.test(s.replace(PAS_UN_GENRE, ''));
  if (fort(titre)) return true;
  if (MOTS_BLOQUANTS.test(`${titre} ${organisateur ?? ''}`)) return false;
  if (MOTS_MOYENS.test(titre)) return true;
  const annonce = description ?? '';
  const autresScenes = new Set([...annonce.matchAll(BLOQUANTS_TOUS)].map((m) => m[0].toLowerCase())).size;
  if (fort(annonce)) return autresScenes < 2;
  return autresScenes === 0 && MOTS_MOYENS.test(annonce);
};

/** LE PREMIER TRI, SUR LA LISTE, EST PLUS LARGE QUE LE SECOND. La liste ne
    montre qu'un resume de l'annonce, ou le mot qui decide manque souvent :
    le filtre complet y rejetait 336 fiches montrealaises sur 344, dont des
    soirees que la fiche entiere aurait gardees. On n'ecarte donc ici que ce
    qui ne porte aucun mot de la nuit, ou dont le titre nomme une autre scene
    sans nommer un genre electronique. Le filtre complet passe ensuite. */
export const peutEtreElectronique = (titre: string, resume: string | null): boolean => {
  const t = titre.replace(PAS_UN_GENRE, '');
  if (MOTS_FORTS.test(t)) return true;
  if (MOTS_BLOQUANTS.test(t)) return false;
  const tout = `${t} ${resume ?? ''}`.replace(PAS_UN_GENRE, '');
  return MOTS_FORTS.test(tout) || MOTS_MOYENS.test(tout) || MOTS_FAIBLES.test(tout);
};

/* ── Etape 1 : decouvrir les adresses de fiches ───────────────────────── */

async function decouvrir(ville: Ville): Promise<{ refs: Map<string, string>; triees: number }> {
  /* ref -> url. La ref est le nombre en fin d'adresse : c'est la seule partie
     stable, le slug qui la precede change quand l'organisateur renomme. */
  const refs = new Map<string, string>();
  const vues = new Set<string>();
  let triees = 0;
  for (const cat of CATEGORIES) {
    let neuvesCat = 0;
    for (let p = 1; p <= PAGES_MAX; p += 1) {
      let html: string;
      try {
        html = await page(`https://www.eventbrite.ca/d/${ville.eventbrite}/${cat}/?page=${p}`);
      } catch (e) {
        if (e instanceof Refus) throw e;
        console.log(`  ${cat} page ${p} : ${(e as Error).message}`);
        break;
      }
      let neuves = 0;
      for (const e of evenements(html)) {
        const url = texte(e['url']);
        const ref = url?.match(/-(\d+)\/?$/)?.[1] ?? url?.match(/(\d{8,})/)?.[1];
        if (!url || !ref || vues.has(ref)) continue;
        vues.add(ref);
        neuves += 1;
        /* Le premier tri, sur ce que la liste montre deja. */
        if (!peutEtreElectronique(texte(e['name']) ?? '', texte(e['description']))) {
          triees += 1;
          continue;
        }
        refs.set(ref, url);
      }
      neuvesCat += neuves;
      if (neuves === 0) break;
      await dormir(PAUSE);
    }
    console.log(`  ${cat.padEnd(28)} +${neuvesCat} fiches nouvelles`);
  }
  return { refs, triees };
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
  const SIGNES: Record<string, string> = { CAD: ' $', EUR: ' €', USD: ' $ US', GBP: ' £' };
  const s = SIGNES[devise] ?? ` ${devise}`;
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
  if (!TOUTES) {
    const ville = VILLES.find((v) => v.sonaa === VILLE_DEMANDEE);
    if (!ville) throw new Error(`Ville inconnue : ${VILLE_DEMANDEE}. Connues : ${VILLES.map((v) => v.sonaa).join(', ')}`);
    await moissonner(ville);
    return;
  }
  const ratees: string[] = [];
  for (const v of VILLES) {
    try {
      await moissonner(v);
    } catch (e) {
      /* Un refus vaut pour toutes les villes : inutile d'insister. */
      if (e instanceof Refus) throw new Error(`Eventbrite refuse cette machine (${e.message}).`);
      ratees.push(v.sonaa);
      console.error(`  ${v.sonaa} : ${(e as Error).message}`);
    }
  }
  if (ratees.length > 0) console.log(`\nVilles sans moisson : ${ratees.join(', ')}.`);
}

async function moissonner(ville: Ville): Promise<void> {
  console.log(`\n${ville.sonaa.toUpperCase()}, Eventbrite`);
  const { refs, triees } = await decouvrir(ville);
  console.log(`  ${refs.size} fiches à lire, ${triees} écartées dès la liste\n`);

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

  const releve = { fait: new Date().toISOString(), [ville.sonaa]: fiches };
  if (lire || !CLE_SERVICE) {
    const chemin = TOUTES || ville.sonaa !== 'montreal-ca'
      ? `scripts/donnees/eventbrite-releve-${ville.sonaa}.json`
      : 'scripts/donnees/eventbrite-releve.json';
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
