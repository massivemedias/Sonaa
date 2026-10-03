/* LES MORCEAUX DES PLATINES, chez Audius.
 *
 * Mika, le 3 octobre 2026, voulait mixer les morceaux de l'atlas. Ils sont
 * joues par un lecteur YouTube que le navigateur isole : on peut le lancer,
 * l'arreter, regler son volume, mais pas toucher a son son, donc ni pitch
 * fin, ni filtre, ni effet. Audius publie des morceaux entiers, en MP3, que
 * le navigateur a le droit de traiter (CORS ouvert, verifie le 3 octobre
 * 2026), avec pour chacun son genre, son BPM et sa tonalite. Les artistes y
 * deposent pour etre ecoutes partout ; djay s'en sert deja.
 *
 * L'API est publique et gratuite. Elle demande le nom de l'application dans
 * chaque requete (`app_name`) ; on cite l'artiste et on renvoie vers sa
 * page ; on ne garde aucun fichier : la platine lit le son chez Audius. */

export interface MorceauAudius {
  readonly id: string;
  readonly titre: string;
  readonly artiste: string;
  readonly genre: string;
  readonly bpm: number | null;
  readonly tonalite: string | null;
  /** En secondes. */
  readonly duree: number;
  readonly pochette: string | null;
  /** La page du morceau chez Audius. */
  readonly lien: string;
}

const APP = 'sonaa';
const HOTE_PAR_DEFAUT = 'https://api.audius.co';

/* Audius annonce lui-meme le serveur a interroger ; on le demande une fois. */
let hote: Promise<string> | null = null;
function hoteAudius(): Promise<string> {
  hote ??= fetch(HOTE_PAR_DEFAUT)
    .then((r) => (r.ok ? (r.json() as Promise<{ data?: string[] }>) : null))
    .then((d) => d?.data?.[0] ?? HOTE_PAR_DEFAUT)
    .catch(() => HOTE_PAR_DEFAUT);
  return hote;
}

export async function adresseDuSon(id: string): Promise<string> {
  return `${await hoteAudius()}/v1/tracks/${encodeURIComponent(id)}/stream?app_name=${APP}`;
}

interface Brut {
  id?: string;
  title?: string;
  genre?: string;
  bpm?: number | null;
  musical_key?: string | null;
  duration?: number;
  is_streamable?: boolean;
  permalink?: string;
  artwork?: Record<string, string> | null;
  user?: { name?: string; handle?: string };
}

function versMorceau(b: Brut): MorceauAudius | null {
  if (!b.id || !b.title || b.is_streamable === false) return null;
  return {
    id: b.id,
    titre: b.title,
    artiste: b.user?.name ?? b.user?.handle ?? '',
    genre: b.genre ?? '',
    bpm: typeof b.bpm === 'number' && b.bpm > 0 ? Math.round(b.bpm * 10) / 10 : null,
    tonalite: b.musical_key ?? null,
    duree: b.duration ?? 0,
    pochette: b.artwork?.['480x480'] ?? b.artwork?.['150x150'] ?? null,
    lien: `https://audius.co${b.permalink ?? ''}`,
  };
}

async function lire(chemin: string): Promise<MorceauAudius[]> {
  const r = await fetch(`${await hoteAudius()}${chemin}${chemin.includes('?') ? '&' : '?'}app_name=${APP}`);
  if (!r.ok) return [];
  const d = (await r.json()) as { data?: Brut[] };
  return (d.data ?? []).map(versMorceau).filter((m): m is MorceauAudius => m !== null);
}

/* ═══ CE QUE LA PLATINE ACCEPTE ═══ Un morceau, pas un set : une minute au
   moins, douze au plus. Le son est decode en entier pour le jog et la forme
   d'onde ; un mix de deux heures pese plusieurs centaines de mega-octets
   une fois decode, et un telephone ne les a pas. */
export const DUREE_MAX = 12 * 60;
const jouable = (m: MorceauAudius): boolean => m.duree >= 60 && m.duree <= DUREE_MAX;

/* ═══ DU STYLE DE L'ATLAS AU GENRE D'AUDIUS ═══ Audius range ses morceaux
   dans une cinquantaine de genres ; l'atlas en a deux cent dix-neuf. Le nom
   du style le dit souvent (« Deep House », « Liquid Drum and Bass ») ; sinon
   la famille. */
const PAR_MOT: readonly (readonly [RegExp, string])[] = [
  [/jungle/i, 'Jungle'],
  [/drum|liquid|neuro|darkstep|techstep|jump.?up|halftime|drumfunk/i, 'Drum & Bass'],
  [/dubstep|riddim|brostep|tearout|deathstep/i, 'Dubstep'],
  [/trap|phonk/i, 'Trap'],
  [/deep house/i, 'Deep House'],
  [/tech house/i, 'Tech House'],
  [/progressive house/i, 'Progressive House'],
  [/future house/i, 'Future House'],
  [/tropical/i, 'Tropical House'],
  [/future bass/i, 'Future Bass'],
  [/hardstyle|hardcore|gabber|frenchcore|terror|speedcore|uptempo|rawstyle/i, 'Hardstyle'],
  [/trance|goa|psy|nitzhonot|suomi/i, 'Trance'],
  [/disco|boogie|italo|hi-?nrg/i, 'Disco'],
  [/glitch hop/i, 'Glitch Hop'],
  [/moombah/i, 'Moombahton'],
  [/jersey/i, 'Jersey Club'],
  [/vaporwave/i, 'Vaporwave'],
  [/hyperpop/i, 'Hyperpop'],
  [/lo-?fi/i, 'Lo-Fi'],
  [/electro/i, 'Electro'],
  [/ambient|drone|new age|isolation/i, 'Ambient'],
  [/downtempo|trip.?hop|chill|lounge/i, 'Downtempo'],
  [/techno|minimal|acid|schranz|ebm/i, 'Techno'],
  [/house|garage/i, 'House'],
];
const PAR_FAMILLE: Readonly<Record<string, string>> = {
  disco: 'Disco', house: 'House', techno: 'Techno', minimal: 'Techno', trance: 'Trance', psy: 'Trance',
  industrial: 'Techno', roots: 'Electronic', breaks: 'Electronic', bass: 'Dubstep', electro: 'Electro',
  hardcore: 'Hardstyle', ambient: 'Ambient', downtempo: 'Downtempo',
};

export function genreAudius(famille: string, style: string): string {
  for (const [motif, genre] of PAR_MOT) if (motif.test(style)) return genre;
  return PAR_FAMILLE[famille] ?? 'Electronic';
}

/* Les genres d'Audius qui sont de la musique electronique : une recherche
   par nom de style ramene aussi du rock ou du podcast, qu'on ecarte. */
const ELECTRONIQUES = new Set([
  'Electronic', 'Techno', 'House', 'Tech House', 'Deep House', 'Disco', 'Electro', 'Jungle', 'Progressive House', 'Hardstyle',
  'Glitch Hop', 'Trance', 'Future Bass', 'Future House', 'Tropical House', 'Downtempo', 'Drum & Bass', 'Dubstep', 'Jersey Club',
  'Vaporwave', 'Moombahton', 'Ambient', 'Lo-Fi', 'Experimental', 'Trap', 'Hyperpop',
]);

/** Les morceaux d'un style de l'atlas : ceux qui portent son nom d'abord,
    puis les plus ecoutes de son genre chez Audius. */
export async function morceauxDuStyle(famille: string, style: string): Promise<readonly MorceauAudius[]> {
  const genre = genreAudius(famille, style);
  const [parNom, tendances] = await Promise.all([
    lire(`/v1/tracks/search?query=${encodeURIComponent(style)}&limit=40`),
    lire(`/v1/tracks/trending?genre=${encodeURIComponent(genre)}&time=month`),
  ]);
  const vus = new Set<string>();
  return [...parNom.filter((m) => ELECTRONIQUES.has(m.genre)), ...tendances]
    .filter((m) => jouable(m) && !vus.has(m.id) && (vus.add(m.id), true))
    .slice(0, 60);
}

/** Une recherche libre, pour choisir son morceau soi-meme. */
export async function chercherAudius(requete: string): Promise<readonly MorceauAudius[]> {
  const q = requete.trim();
  if (q.length < 2) return [];
  return (await lire(`/v1/tracks/search?query=${encodeURIComponent(q)}&limit=40`)).filter(jouable);
}
