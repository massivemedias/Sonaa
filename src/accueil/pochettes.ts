/* LES POCHETTES DE L'ACCUEIL, TIREES DE L'ATLAS.
 *
 * Les 2 388 morceaux de l'atlas ont chacun leur pochette, servie par le site
 * (public/covers, 400 px). Le mur de l'ouverture et les tuiles des familles
 * en piochent : de vraies pochettes de vrais morceaux, pas des images
 * d'ambiance. */

import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';

/** La pochette du premier morceau d'un genre qui en a une. */
function pochetteDuGenre(fi: number, gl: number): string | null {
  return STRUCTURES[fi]?.genres[gl]?.tracks.find((tr) => tr.cover)?.cover ?? null;
}

/** `n` pochettes, une par genre, les familles entremelees pour que le mur
    melange les couleurs au lieu de les ranger par bandes. */
export function pochettesDuMur(n: number): string[] {
  const parFamille = FAMILIES.map((_, fi) =>
    (STRUCTURES[fi]?.genres ?? []).map((_g, gl) => pochetteDuGenre(fi, gl)).filter((x): x is string => Boolean(x))
  );
  const out: string[] = [];
  const vues = new Set<string>();
  for (let rang = 0; out.length < n && parFamille.some((l) => l.length > rang); rang += 1) {
    for (const liste of parFamille) {
      const p = liste[rang];
      if (p && !vues.has(p)) {
        vues.add(p);
        out.push(p);
        if (out.length >= n) break;
      }
    }
  }
  return out;
}

/** La pochette qui represente une famille : celle de son genre majeur le
    plus ancien, ou de son premier genre a defaut. */
export function pochetteDeLaFamille(fi: number): string | null {
  const genres = STRUCTURES[fi]?.genres ?? [];
  const majeurs = genres.map((g, gl) => ({ g, gl })).filter((x) => x.g.major);
  const choix = [...majeurs, ...genres.map((g, gl) => ({ g, gl }))];
  for (const x of choix) {
    const p = pochetteDuGenre(fi, x.gl);
    if (p) return p;
  }
  return null;
}
