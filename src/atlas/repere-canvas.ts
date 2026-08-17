/* LA CONVERSION FENÊTRE VERS CANVAS, DÉFINIE UNE SEULE FOIS.

   TROISIÈME OCCURRENCE DU MÊME DÉFAUT, ET C'EST CE QUI JUSTIFIE CE FICHIER.

   Les rectangles du DOM, rendus par `getBoundingClientRect`, sont en
   coordonnées FENÊTRE. Le moteur, lui, raisonne en coordonnées CANVAS. Les
   deux ont coïncidé pendant toute la vie du projet, parce que le canvas
   occupait l'écran entier. Ils ont cessé de coïncider le jour où le canvas
   mobile a été décalé sous le fil d'Ariane et arrêté au-dessus de la feuille
   du lecteur.

   Depuis, l'écart a faussé trois instruments différents :

     1. `testCadre` a compté cinq débordements imaginaires, tous sous le seuil
        mobile et aucun au-dessus, ce qui a fait passer la suite de sept à
        douze échecs et lancer une enquête sur une régression inexistante.
     2. `testBoites` comparait un instantané du moteur à un rectangle DOM.
     3. La sonde des plaques a rendu « 0 sur 16 cliquables » à 390 px sur un
        produit parfaitement correct.

   Chaque fois, la conversion a été refaite sur place, un peu différemment, et
   chaque fois le défaut est revenu ailleurs. Une règle qu'on réapplique à la
   main est une règle qu'on oubliera : tant que chaque instrument refait la
   conversion à sa manière, il y aura une quatrième occurrence.

   D'OÙ CETTE RÈGLE, POSÉE PAR MIKA ET LA DERNIÈRE DE CE PROJET :

     Aucun instrument ne convertit lui-même. Tous appellent
     `window.__atlas.repereCanvas()`.

   Elle est exposée sur l'objet de diagnostic du moteur précisément pour que
   les sondes extérieures, qui vivent hors du dépôt et disparaissent entre deux
   sessions, ne PUISSENT PAS la réécrire : elles n'ont pas d'autre moyen de
   l'obtenir que de la demander. C'est ce qui distingue une convention d'une
   contrainte. */

export interface RepereCanvas {
  /** Décalage horizontal du canvas dans la fenêtre. */
  x: number;
  /** Décalage vertical : c'est celui qui a menti, à cause du fil d'Ariane. */
  y: number;
  /** Largeur affichée du canvas, en pixels CSS. */
  largeur: number;
  /** Hauteur affichée : bornée par la feuille du lecteur sur téléphone. */
  hauteur: number;
}

/** Le repère du canvas dans la fenêtre. Origine (0,0) si aucun canvas. */
export const repereCanvas = (): RepereCanvas => {
  const c =
    document.querySelector('canvas.atlas-canvas') ?? document.querySelector('canvas');
  if (!c) return { x: 0, y: 0, largeur: 0, hauteur: 0 };
  const r = c.getBoundingClientRect();
  return { x: r.left, y: r.top, largeur: r.width, hauteur: r.height };
};

/** Un point de la fenêtre, ramené dans le repère du canvas. */
export const versCanvas = (px: number, py: number): { x: number; y: number } => {
  const o = repereCanvas();
  return { x: px - o.x, y: py - o.y };
};

/** Le centre d'un rectangle DOM, ramené dans le repère du canvas.
 *  C'est la forme dont les sondes ont besoin neuf fois sur dix : elles
 *  mesurent une boîte de label et demandent au moteur ce qu'il y a dessous. */
export const centreVersCanvas = (r: DOMRect): { x: number; y: number } =>
  versCanvas(r.left + r.width / 2, r.top + r.height / 2);
