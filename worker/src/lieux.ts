/* LES SALLES SUR LA CARTE. Voir src/atlas/CarteDesSoirees.tsx.

   Resident Advisor donne la position de ses salles ; les soirees versees par
   Facebook, Shotgun, Eventbrite ou un membre n'ont qu'un nom et une adresse.
   Cette route les situe avec Nominatim, le geocodeur d'OpenStreetMap, et
   garde chaque reponse dans KV : une salle ne demenage pas.

   ═══ LA REGLE DE NOMINATIM, ET COMMENT ON LA TIENT ═══

   Une requete par seconde au plus, un agent qui se nomme, et un cache. La
   page n'attend donc jamais le geocodeur : la route rend tout de suite ce
   qu'elle connait, et cherche au plus HUIT inconnues en arriere-plan, une
   toutes les 1,1 s. Une salle absente apparait a la visite suivante.

   UNE CLE KV PAR VILLE, PAS PAR SALLE. Une carte ouverte coute une lecture,
   pas cinquante ; une passe de recherche coute une ecriture. Deux passes
   simultanees peuvent s'ecraser, et la salle perdue sera cherchee une fois
   de plus : c'est le prix d'une lecture unique, et il est faible. */

export interface Lieu {
  readonly nom: string | null;
  readonly adresse: string | null;
}

type Point = readonly [number, number];

/* Ce qui est garde : une position, ou la date d'un echec. Un echec se
   retente apres deux semaines, le temps qu'OpenStreetMap apprenne la salle
   ou que la source corrige l'adresse. */
type Garde = { readonly p: Point } | { readonly echec: number };
type Carnet = Record<string, Garde>;

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const AGENT = 'SONAA/1.0 (carte des soirees; https://sonaa.ca)';
const RECHERCHES_PAR_PASSE = 8;
const PAUSE_MS = 1100;
const RETENTE_MS = 14 * 24 * 3600 * 1000;
/* Au-dela, ce n'est plus la ville : une adresse ambigue a trouve son
   homonyme ailleurs. */
const RAYON_KM = 60;

const sansAccent = (x: string): string =>
  x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function cleDuLieu(l: Lieu): string {
  return sansAccent(`${l.adresse ?? ''}|${l.nom ?? ''}`).slice(0, 300);
}

function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Les formulations a essayer, de la plus precise a la plus vague.
    Facebook ecrit souvent « Club Soda, 1225 boul. Saint-Laurent, Montreal » :
    le nom en tete fait echouer Nominatim, on le retire au second essai. */
function formulations(l: Lieu): string[] {
  const essais: string[] = [];
  const a = l.adresse?.trim();
  if (a) {
    essais.push(a);
    const morceaux = a.split(',');
    if (morceaux.length > 1 && !/\d/.test(morceaux[0] ?? '')) essais.push(morceaux.slice(1).join(',').trim());
  }
  const n = l.nom?.trim();
  if (n) essais.push(n);
  return [...new Set(essais)].filter((x) => x.length >= 3);
}

const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function nominatim(q: string, pays: string, centre: Point): Promise<Point | null> {
  /* La boite de recherche fait environ 45 km de cote autour du centre, et
     elle est STRICTE : « Newspeak » ne doit pas rendre une rue de l'Oregon. */
  const d = 0.4;
  const p = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '1',
    countrycodes: pays.toLowerCase(),
    viewbox: `${centre[1] - d},${centre[0] + d},${centre[1] + d},${centre[0] - d}`,
    bounded: '1',
  });
  try {
    const r = await fetch(`${NOMINATIM}?${p.toString()}`, { headers: { 'user-agent': AGENT, referer: 'https://sonaa.ca/' } });
    if (!r.ok) return null;
    const liste = (await r.json()) as { lat?: string; lon?: string }[];
    const lat = Number(liste[0]?.lat);
    const lon = Number(liste[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const point: Point = [Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5];
    return distanceKm(point, centre) <= RAYON_KM ? point : null;
  } catch {
    return null;
  }
}

export interface DemandeLieux {
  readonly ville: string;
  readonly pays: string;
  readonly centre: Point;
  readonly lieux: readonly Lieu[];
}

/** La demande lue et bornee, ou null si elle ne tient pas debout. */
export function lireDemande(brut: unknown): DemandeLieux | null {
  if (!brut || typeof brut !== 'object') return null;
  const o = brut as Record<string, unknown>;
  const ville = typeof o['ville'] === 'string' ? o['ville'] : '';
  const pays = typeof o['pays'] === 'string' ? o['pays'].toUpperCase() : '';
  const c = Array.isArray(o['centre']) ? o['centre'].map(Number) : [];
  if (!/^[a-z0-9-]{2,40}$/.test(ville) || !/^[A-Z]{2}$/.test(pays)) return null;
  const [lat, lon] = c;
  if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const texte = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x.trim().slice(0, 200) : null);
  const lieux = (Array.isArray(o['lieux']) ? o['lieux'] : [])
    .slice(0, 150)
    .map((x): Lieu => {
      const l = (x ?? {}) as Record<string, unknown>;
      return { nom: texte(l['nom']), adresse: texte(l['adresse']) };
    });
  return { ville, pays, centre: [lat, lon], lieux };
}

/** Les positions connues, dans l'ordre de la demande (null : pas encore, ou
    introuvable), et la passe de recherche a lancer en arriere-plan pour les
    autres, s'il y en a. */
export async function situer(
  d: DemandeLieux,
  kv: KVNamespace
): Promise<{ points: (Point | null)[]; ensuite: (() => Promise<void>) | null }> {
  const cleKv = `lieux:${d.ville}`;
  const carnet = ((await kv.get(cleKv, 'json').catch(() => null)) ?? {}) as Carnet;
  const maintenant = Date.now();
  const inconnus: Lieu[] = [];
  const points = d.lieux.map((l) => {
    const g = carnet[cleDuLieu(l)];
    if (g && 'p' in g) return g.p;
    if (!g || maintenant - g.echec > RETENTE_MS) {
      if (!inconnus.some((x) => cleDuLieu(x) === cleDuLieu(l)) && formulations(l).length > 0) inconnus.push(l);
    }
    return null;
  });
  if (inconnus.length === 0) return { points, ensuite: null };

  const ensuite = async (): Promise<void> => {
    let budget = RECHERCHES_PAR_PASSE;
    let ecrit = false;
    for (const l of inconnus) {
      if (budget <= 0) break;
      let trouve: Point | null = null;
      let essais = 0;
      const toutes = formulations(l);
      for (const q of toutes) {
        if (budget <= 0) break;
        budget -= 1;
        essais += 1;
        trouve = await nominatim(q, d.pays, d.centre);
        await dormir(PAUSE_MS);
        if (trouve) break;
      }
      /* Un echec ne s'ecrit que si toutes les formulations ont ete
         essayees : une salle coupee par le budget reste a chercher. */
      if (trouve) carnet[cleDuLieu(l)] = { p: trouve };
      else if (essais === toutes.length) carnet[cleDuLieu(l)] = { echec: Date.now() };
      else continue;
      ecrit = true;
    }
    if (ecrit) await kv.put(cleKv, JSON.stringify(carnet)).catch(() => undefined);
  };
  return { points, ensuite };
}
