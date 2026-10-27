/* LA CARTE DES SOIREES : de la liste du calendrier aux salles sur un plan.
 *
 * Mika, le 27 octobre 2026 : « une carte avec OpenStreetMap, un truc simple
 * mais cool, une carte des events ». Une soiree n'a pas d'adresse a elle,
 * c'est la SALLE qui en a une : la carte montre donc des salles, chacune
 * avec ses soirees de la tranche regardee.
 *
 * ═══ D'OU VIENNENT LES POSITIONS ═══
 *
 *   1. Resident Advisor donne celle de ses salles (lat, lon sur la soiree).
 *   2. Une soiree d'une autre source, dans une salle que RA connait, prend
 *      la position de RA : meme nom, meme endroit, sans rien demander.
 *   3. Le reste passe par la passerelle, qui interroge Nominatim et garde
 *      la reponse. Voir worker/src/lieux.ts.
 *
 * Ce qui reste sans position n'est pas place au hasard : la page dit
 * combien de soirees manquent a la carte. */

import type { Soiree } from './agenda.ts';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';

export type Point = readonly [number, number];

export interface Salle {
  readonly cle: string;
  readonly nom: string | null;
  readonly adresse: string | null;
  readonly point: Point;
  readonly soirees: readonly Soiree[];
}

const sansAccent = (x: string): string =>
  x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Le nom d'une salle tel qu'on le compare : « Le Belmont » et « BELMONT »
    sont la meme salle, l'article et la casse ne comptent pas. */
export function nomDeSalle(lieu: string | null | undefined): string {
  if (!lieu) return '';
  return sansAccent(lieu).replace(/^(le|la|les|l|the)\s+/, '');
}

function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/* Au-dela, la salle n'est plus dans la ville regardee : une zone RA deborde
   parfois sur la province, et une seule soiree a cent kilometres reduirait
   toute la ville a un point. */
const RAYON_KM = 80;

/** Ce qu'il faut demander a la passerelle : les soirees sans position dont
    la salle n'est pas deja connue par RA, une fois par salle. */
export function lieuxASituer(soirees: readonly Soiree[]): { nom: string | null; adresse: string | null }[] {
  const connus = new Set(soirees.filter((s) => s.lat !== undefined).map((s) => nomDeSalle(s.lieu)));
  const vus = new Set<string>();
  const demande: { nom: string | null; adresse: string | null }[] = [];
  for (const s of soirees) {
    if (s.lat !== undefined) continue;
    const n = nomDeSalle(s.lieu);
    if (n && connus.has(n)) continue;
    const cle = `${n}|${s.adresse ?? ''}`;
    if (vus.has(cle) || (!n && !s.adresse)) continue;
    vus.add(cle);
    demande.push({ nom: s.lieu ?? null, adresse: s.adresse ?? null });
  }
  return demande;
}

/** Les soirees rangees par salle, avec leur position, et celles qui n'en
    ont pas. `situes` repond a `lieuxASituer`, dans le meme ordre. */
export function salles(
  soirees: readonly Soiree[],
  demande: readonly { nom: string | null; adresse: string | null }[],
  situes: readonly (Point | null)[],
  centre: Point | null
): { salles: Salle[]; sansLieu: number } {
  const parNom = new Map<string, Point>();
  for (const s of soirees) {
    if (s.lat !== undefined && s.lon !== undefined && nomDeSalle(s.lieu)) parNom.set(nomDeSalle(s.lieu), [s.lat, s.lon]);
  }
  const parDemande = new Map<string, Point>();
  demande.forEach((l, i) => {
    const p = situes[i];
    if (p) parDemande.set(`${nomDeSalle(l.nom)}|${l.adresse ?? ''}`, p);
  });

  const groupes = new Map<string, { nom: string | null; adresse: string | null; point: Point; soirees: Soiree[] }>();
  let sansLieu = 0;
  for (const s of soirees) {
    const n = nomDeSalle(s.lieu);
    const point: Point | undefined =
      s.lat !== undefined && s.lon !== undefined ? [s.lat, s.lon] : (parNom.get(n) ?? parDemande.get(`${n}|${s.adresse ?? ''}`));
    if (!point || (centre && distanceKm(point, centre) > RAYON_KM)) {
      sansLieu += 1;
      continue;
    }
    /* Une salle sans nom se range a sa position, arrondie a dix metres. */
    const cle = n || `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
    const g = groupes.get(cle);
    if (g) {
      g.soirees.push(s);
      if (!g.adresse && s.adresse) g.adresse = s.adresse;
    } else {
      groupes.set(cle, { nom: s.lieu ?? null, adresse: s.adresse ?? null, point, soirees: [s] });
    }
  }
  const liste = [...groupes.entries()]
    .map(([cle, g]) => ({ cle, ...g, soirees: [...g.soirees].sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.soirees.length - a.soirees.length);
  return { salles: liste, sansLieu };
}

/** Les positions que la passerelle connait, dans l'ordre de la demande.
    Une panne rend une liste de null : la carte montre alors RA seul. */
export async function situerLesLieux(
  ville: { slug: string; country_code: string },
  centre: Point,
  lieux: readonly { nom: string | null; adresse: string | null }[]
): Promise<(Point | null)[]> {
  if (lieux.length === 0) return [];
  try {
    const r = await fetch(`${PASSERELLE}/api/lieux`, {
      method: 'POST',
      /* En texte simple : pas de requete prealable, un aller-retour de moins. */
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ ville: ville.slug, pays: ville.country_code, centre, lieux }),
    });
    if (!r.ok) return lieux.map(() => null);
    const { points } = (await r.json()) as { points?: (Point | null)[] };
    return lieux.map((_, i) => points?.[i] ?? null);
  } catch {
    return lieux.map(() => null);
  }
}
