/* CE QUE LA PAGE DEMANDE A LA PASSERELLE.

   Tout le travail delicat est de l'autre cote : la ville vient de Cloudflare,
   les soirees viennent de Resident Advisor par le Worker, et la mise en cache
   aussi. Ici il ne reste que trois appels et la memoire des choix.

   AUCUNE CLE, AUCUN COMPTE, AUCUNE PERMISSION. Le calendrier fonctionne pour
   un visiteur qui n'a jamais rien fait sur le site : c'est la condition pour
   que la page ait un sens des la premiere seconde. */

import { correspondance } from '../data/ra-genres.ts';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';

export interface Soiree {
  readonly id: string;
  readonly titre: string;
  readonly date: string;
  readonly debut: string | null;
  readonly lieu: string | null;
  readonly artistes: string[];
  readonly genres: string[];
  readonly affiche: string | null;
  readonly lien: string;
  readonly interesses: number;
}

export interface Zone {
  readonly id: number;
  readonly nom: string;
  readonly pays: string;
}

export interface OuJeSuis {
  readonly ville: string | null;
  readonly pays: string | null;
  readonly zone: Zone | null;
}

/** La ville d'ou arrive la requete, telle que Cloudflare la voit, et la zone
    Resident Advisor correspondante quand il y en a une. */
export async function ouJeSuis(): Promise<OuJeSuis> {
  try {
    const r = await fetch(`${PASSERELLE}/api/ou`);
    if (!r.ok) return { ville: null, pays: null, zone: null };
    return (await r.json()) as OuJeSuis;
  } catch {
    return { ville: null, pays: null, zone: null };
  }
}

/** Les 639 villes que RA couvre, pour qui veut regarder ailleurs. */
export async function zones(): Promise<Zone[]> {
  try {
    const r = await fetch(`${PASSERELLE}/api/zones`);
    if (!r.ok) return [];
    return (await r.json()) as Zone[];
  } catch {
    return [];
  }
}

/* LA PANNE EST UNE VALEUR, PAS UNE EXCEPTION.

   « Aucune soiree cette semaine » et « la source ne repond plus » sont deux
   phrases differentes a l'ecran, et les confondre serait la seule maniere
   sure de ne jamais s'apercevoir que l'agenda est mort. La fonction rend donc
   `null` quand elle n'a pas pu demander, et une liste vide quand elle a
   demande et qu'il n'y avait rien. */
export async function agenda(opts: {
  zone: number;
  du: Date;
  au: Date;
  genre?: string | undefined;
}): Promise<{ soirees: Soiree[]; total: number } | null> {
  const p = new URLSearchParams({
    zone: String(opts.zone),
    du: opts.du.toISOString(),
    au: opts.au.toISOString(),
  });
  if (opts.genre) p.set('genre', opts.genre);
  try {
    const r = await fetch(`${PASSERELLE}/api/agenda?${p.toString()}`);
    if (!r.ok) return null;
    return (await r.json()) as { soirees: Soiree[]; total: number };
  } catch {
    return null;
  }
}

/* --- Les styles suivis --------------------------------------------------- */

const CLE_STYLES = 'sonaa.calendrier.styles';
const CLE_ZONE = 'sonaa.calendrier.zone';

/** Au plus cinq styles, comme pour les sets : au-dela le filtre ne filtre
    plus rien, et la page redevient l'agenda complet de la ville. */
export const STYLES_MAX = 5;

export function stylesSuivis(): string[] {
  try {
    const brut = localStorage.getItem(CLE_STYLES);
    if (!brut) return [];
    const liste = JSON.parse(brut) as unknown;
    if (!Array.isArray(liste)) return [];
    return liste.filter((x): x is string => typeof x === 'string').slice(0, STYLES_MAX);
  } catch {
    return [];
  }
}

export function noterStyles(ids: string[]): void {
  try {
    localStorage.setItem(CLE_STYLES, JSON.stringify(ids.slice(0, STYLES_MAX)));
  } catch {
    /* Navigation privee, stockage plein, cookies refuses : le calendrier
       marche quand meme, il oublie simplement les styles a la fermeture. */
  }
}

export function zoneChoisie(): Zone | null {
  try {
    const brut = localStorage.getItem(CLE_ZONE);
    if (!brut) return null;
    const z = JSON.parse(brut) as Zone;
    return typeof z?.id === 'number' && typeof z?.nom === 'string' ? z : null;
  } catch {
    return null;
  }
}

export function noterZone(z: Zone | null): void {
  try {
    if (z) localStorage.setItem(CLE_ZONE, JSON.stringify(z));
    else localStorage.removeItem(CLE_ZONE);
  } catch {
    /* Voir ci-dessus. */
  }
}

/* --- Des styles aux mots que RA comprend --------------------------------- */

export interface Traduction {
  readonly valeur: string | null;
  readonly elargi: boolean;
}

export function traduire(genreId: string, familleId: string): Traduction {
  return correspondance(genreId, familleId);
}

/** Le samedi qui vient inclus : un agenda de soirees se lit par week-ends,
    et une semaine qui s'arrete le vendredi coupe la nuit la plus chargée. */
export function prochainsJours(nombre: number): { du: Date; au: Date } {
  const du = new Date();
  du.setHours(0, 0, 0, 0);
  const au = new Date(du);
  au.setDate(au.getDate() + nombre);
  au.setHours(23, 59, 59, 999);
  return { du, au };
}
