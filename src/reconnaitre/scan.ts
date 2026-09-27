/* CE QU'ON GARDE D'UNE ECOUTE, ET A QUELLE CONDITION.
 *
 * Mika, le 27 septembre 2026 : « le scan n'est enregistre que si le genre
 * estime existe dans l'atlas ET que la confiance depasse un seuil ». Le
 * reseau rend 400 styles Discogs avec, pour chacun, une confiance ; la table
 * discogs-vers-sonaa en ramene 87 a un genre exact de l'atlas, 20 a une
 * famille seulement. On ne rattache qu'a un GENRE : une famille ne dit pas
 * ou ranger un morceau, et la fiche « Entendu recemment » vit sur un genre.
 *
 * ═══ LE SEUIL : 0,30, ET SUR QUOI IL EST FONDE ═══
 *
 * Mesure au banc sur quatre morceaux publies, par le micro, meilleur style
 * qui a un genre dans l'atlas, deux passages a des instants differents :
 *   Extrawelt, Herz Aus Blech       : Deep Techno 0,27 (Techno et House ne
 *                                     sont que des familles)
 *   Biesmans, On The Run            : aucun genre exact (trois familles)
 *   AFFKT, Roommush                 : Progressive House 0,37 puis 0,34
 *   Pardon Moi, Power to the People : Progressive House 0,39
 * Les confiances ne separent pas le juste du faux : Pardon Moi a 0,39 est
 * faux (c'est du dark disco), Extrawelt a 0,27 est juste. Le seuil n'est
 * donc pas un juge, c'est un filtre contre le bruit ; le juge est la
 * moderation, et tout nait « en attente ». A 0,35 AFFKT entrait un passage
 * sur deux : un seuil qui depend de la seconde ou l'on appuie n'en est pas
 * un. A 0,30 il entre a chaque fois, Pardon Moi aussi (la moderation le
 * rejettera), Extrawelt et Biesmans restent dehors. A 0,25 Extrawelt
 * entrerait, et avec lui tout ce que le reseau hesite a nommer.
 *
 * LA PASSERELLE REFAIT CE CALCUL : le seuil est ecrit des deux cotes, ici et
 * dans worker/src/index.ts, et le test ci-contre tient celui-ci. */

import type { Prediction } from './modele.ts';
import type { MorceauReconnu } from './audd.ts';
import { styleDeLEtiquette } from './discogs-vers-sonaa.ts';

export const SEUIL_SCAN = 0.3;

export interface Scan {
  readonly titre: string;
  readonly artiste: string;
  readonly label: string | null;
  readonly annee: number | null;
  readonly pochette_url: string | null;
  readonly genre_slug: string;
  readonly confiance: number;
}

/** Le premier style, par confiance decroissante, qui a un genre exact dans
    l'atlas. Null quand aucun n'en a. */
export function genreRattachable(styles: readonly Prediction[]): { genre: string; confiance: number } | null {
  for (const s of [...styles].sort((a, b) => b.score - a.score)) {
    const entree = styleDeLEtiquette(s.discogs);
    if (entree?.sonaa) return { genre: entree.sonaa, confiance: s.score };
  }
  return null;
}

/** Le scan a enregistrer, ou null si rien ne doit l'etre : pas de morceau,
    pas de genre exact, ou confiance sous le seuil. */
export function scanAEnregistrer(morceau: MorceauReconnu | null, styles: readonly Prediction[]): Scan | null {
  if (!morceau) return null;
  const r = genreRattachable(styles);
  if (!r || r.confiance < SEUIL_SCAN) return null;
  return {
    titre: morceau.titre,
    artiste: morceau.artiste,
    label: morceau.label,
    annee: morceau.annee,
    pochette_url: morceau.pochette,
    genre_slug: r.genre,
    confiance: Math.round(r.confiance * 1000) / 1000,
  };
}
