/* LES ARTISTES D'UN STYLE, LIVRES AVEC LE SITE.
 *
 * ═══ POURQUOI CE FICHIER EST EMBARQUE ET NON DEMANDE ═══
 *
 * La question « qui joue ce style » se pose sur chacune des 219 fiches, sa
 * reponse ne change qu'a la moisson suivante, et elle doit s'afficher sans
 * attendre le reseau. Quatre-vingt-un kilo-octets pour 5 253 noms : c'est le
 * poids d'une seule pochette, et ca supprime une requete par fiche ouverte.
 *
 * LA QUESTION INVERSE N'EST PAS ICI. « Quels sont les styles de cet
 * artiste » se pose sur un nom quelconque, y compris un nom que la moisson
 * n'a jamais vu ; elle se resout en direct chez Discogs. Embarquer dix mille
 * artistes pour rater quand meme les petits serait lourd ET incomplet.
 */

import donnees from '../data/artistes.json';

interface Livre {
  readonly fait: string;
  readonly parGenre: Record<string, string[]>;
}

const LIVRE = donnees as Livre;

/** Les artistes d'un genre, du plus ecoute au moins. Vide quand la moisson
    n'a rien trouve pour ce style, ce qui arrive et se dit. */
export function artistesDuGenre(genreId: string): readonly string[] {
  return LIVRE.parGenre[genreId] ?? [];
}

/** Quand la moisson a ete faite. Une liste d'artistes sans date se lit comme
    une verite intemporelle, alors que c'est un releve. */
export const moissonFaiteLe: string = LIVRE.fait;
