/* LES ADRESSES LISIBLES DU SITE, POUR LES MOTEURS DE RECHERCHE ET POUR LES
 * GENS QUI PARTAGENT UN LIEN.
 *
 * Mika, le 14 septembre 2026 : « fais du referencement de fou, je veux du
 * monde sur le site ». Le site vivait sur des ancres (#/parcourir/2/12) :
 * pour un moteur de recherche, tout le site etait UNE page, la racine, et
 * rien de ce qui fait sa valeur (219 fiches de styles, les cours, les
 * soirees, les sets) n'existait.
 *
 * Chaque style a donc un chemin, /styles/techno/dub-techno/, que la
 * construction du site rend en vraie page HTML (scripts/prerender.ts) avec
 * son contenu. Quand l'app demarre sur ce chemin sans ancre, elle traduit
 * le chemin en ancre et continue comme avant : le chemin reste dans la
 * barre d'adresse, l'ancre le suit. Une seule table de correspondance, ici,
 * partagee par l'app et par le pre-rendu : un slug qui differerait entre
 * les deux ferait des pages que l'app ne saurait pas ouvrir. */

import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';

export const ORIGINE = 'https://sonaa.ca';

/** « Dub Techno » devient « dub-techno » : minuscules, sans accent, un tiret
    entre les mots, rien d'autre. */
export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CheminStyle {
  readonly chemin: string;
  readonly hash: string;
  readonly fi: number;
  readonly gl: number | null;
}

/** Tous les chemins de styles : les familles puis chaque genre. */
export function cheminsDesStyles(): CheminStyle[] {
  const out: CheminStyle[] = [];
  FAMILIES.forEach((f, fi) => {
    out.push({ chemin: `/styles/${slug(f.label)}/`, hash: `#/parcourir/${fi}`, fi, gl: null });
    (STRUCTURES[fi]?.genres ?? []).forEach((g, gl) => {
      out.push({ chemin: `/styles/${slug(f.label)}/${slug(g.label)}/`, hash: `#/parcourir/${fi}/${gl}`, fi, gl });
    });
  });
  return out;
}

/** L'ancre qui correspond a un chemin, ou null si le chemin n'est pas un
    chemin du site. Le pre-rendu ecrit ces chemins ; l'app les relit. */
export function hashDuChemin(chemin: string): string | null {
  const c = chemin.replace(/\/+$/, '/');
  if (c === '/styles/') return '#/parcourir';
  const style = cheminsDesStyles().find((x) => x.chemin === c);
  if (style) return style.hash;
  const soiree = c.match(/^\/soirees\/([a-z-]+)\/$/);
  if (soiree) return `#/calendrier?city=${soiree[1]}`;
  if (c.startsWith('/soirees/')) return '#/calendrier';
  const son = c.match(/^\/sons\/([0-9a-f-]{36})\/$/);
  if (son) return `#/sets/${son[1]}`;
  if (c === '/sons/') return '#/sets';
  if (c === '/news/') return '#/news';
  return null;
}
