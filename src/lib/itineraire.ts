/* L'ITINERAIRE JUSQU'A UNE SALLE, CALCULE SANS QUITTER LE SITE.
 *
 * Mika, le 27 octobre 2026 : « un bouton ou on peut avoir la direction mais
 * que nous restions directement dans le site ! je veux pas que les gens
 * sortent du site ». Le lien vers Google Maps est donc remplace par un trajet
 * trace sur la carte de SONAA.
 *
 * LE CALCUL EST CELUI D'OPENSTREETMAP.ORG : les serveurs OSRM de FOSSGIS,
 * que le site d'OpenStreetMap appelle lui-meme pour ses itineraires a pied,
 * a velo et en voiture. Sans cle, ouverts aux navigateurs, pour un usage
 * modere : un trajet par mode demande, et rien d'autre. Pas de transport en
 * commun : aucun service libre ne le calcule pour toutes les villes. */

import type { Point } from './carte.ts';

export type Mode = 'pied' | 'velo' | 'auto';
export const MODES: readonly Mode[] = ['pied', 'velo', 'auto'];

const PROFILS: Record<Mode, string> = { pied: 'routed-foot', velo: 'routed-bike', auto: 'routed-car' };
const SERVEUR = 'https://routing.openstreetmap.de';

export interface Etape {
  /** Le type de manoeuvre d'OSRM : depart, turn, roundabout, arrive... */
  readonly type: string;
  /** right, slight left, straight, uturn... ou null. */
  readonly sens: string | null;
  readonly rue: string | null;
  /** Les metres a parcourir APRES cette manoeuvre. */
  readonly distance: number;
  readonly sortie: number | null;
}

export interface Itineraire {
  /** En metres. */
  readonly distance: number;
  /** En secondes. */
  readonly duree: number;
  /** [longitude, latitude], l'ordre de GeoJSON. */
  readonly ligne: readonly (readonly [number, number])[];
  readonly etapes: readonly Etape[];
}

/** La reponse d'OSRM lue et bornee, ou null si elle ne contient pas de
    trajet. Separee du reseau pour etre testee. */
export function lireReponse(brut: unknown): Itineraire | null {
  const o = brut as { code?: string; routes?: unknown[] } | null;
  if (!o || o.code !== 'Ok' || !Array.isArray(o.routes) || o.routes.length === 0) return null;
  const r = o.routes[0] as {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: unknown[] };
    legs?: { steps?: { distance?: number; name?: string; maneuver?: { type?: string; modifier?: string; exit?: number } }[] }[];
  };
  const ligne = (r.geometry?.coordinates ?? [])
    .filter((c): c is [number, number] => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => [c[0], c[1]] as const);
  if (ligne.length < 2 || !Number.isFinite(r.distance) || !Number.isFinite(r.duration)) return null;
  const etapes = (r.legs ?? []).flatMap((l) => l.steps ?? []).map(
    (e): Etape => ({
      type: e.maneuver?.type ?? 'continue',
      sens: e.maneuver?.modifier ?? null,
      rue: e.name?.trim() ? e.name.trim() : null,
      distance: Number.isFinite(e.distance) ? Number(e.distance) : 0,
      sortie: Number.isFinite(e.maneuver?.exit) ? Number(e.maneuver?.exit) : null,
    })
  );
  return { distance: Number(r.distance), duree: Number(r.duration), ligne, etapes };
}

export async function calculerItineraire(de: Point, a: Point, mode: Mode, signal?: AbortSignal): Promise<Itineraire | null> {
  const url = `${SERVEUR}/${PROFILS[mode]}/route/v1/driving/${de[1]},${de[0]};${a[1]},${a[0]}?overview=full&geometries=geojson&steps=true`;
  try {
    const r = await fetch(url, signal ? { signal } : {});
    if (!r.ok) return null;
    return lireReponse(await r.json());
  } catch {
    return null;
  }
}

export function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** A pied jusqu'a deux kilometres et demi a vol d'oiseau, en voiture au-dela :
    c'est ce qu'on choisirait soi-meme un soir de sortie. */
export function modeParDefaut(de: Point, a: Point): Mode {
  return distanceKm(de, a) <= 2.5 ? 'pied' : 'auto';
}

/** « 4 min », « 1 h 05 ». */
export function dureeLisible(secondes: number): string {
  const min = Math.max(1, Math.round(secondes / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

/** « 850 m », « 1,4 km » (ou « 1.4 km » en anglais). */
export function distanceLisible(metres: number, locale: string): string {
  if (metres < 950) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  return `${(metres / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}
