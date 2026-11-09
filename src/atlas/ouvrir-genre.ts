/* OUVRIR UN STYLE DEPUIS UNE VUE SECONDAIRE (index, chronologie, chaleur,
   arbre).

   Ces vues renvoyaient vers la carte en trois dimensions, qui ouvrait la
   fiche du genre a l'arrivee. La carte est supprimee depuis le 9 novembre
   2026 (Mika : « je veux plus la voir ») : le genre s'ouvre maintenant dans
   sa page de style, #/parcourir/<famille>/<genre>, la meme que /styles/. */

/** Ouvre la page du style : la famille `familyIndex`, son genre `genreLocal`. */
export function ouvrirLeStyle(familyIndex: number, genreLocal: number): void {
  window.location.hash = `#/parcourir/${familyIndex}/${genreLocal}`;
}
