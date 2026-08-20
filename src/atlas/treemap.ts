/* LE PAVAGE SQUARIFIE, l'algorithme de Bruls, Huizing et van Wijk.

   Un treemap naif decoupe en bandes : les pavés deviennent des lamelles de
   trois pixels de large et deux cents de haut, sur lesquelles aucun nom ne
   tient. Le pavage squarifie choisit, a chaque etape, de continuer la rangee
   en cours ou d'en ouvrir une nouvelle, selon celle des deux qui donne le
   moins mauvais rapport largeur sur hauteur.

   C'est exactement ce qui decide si un nom tient dans son rectangle, donc ce
   n'est pas un raffinement : c'est la condition pour que la vue existe. */

export interface Pave<T> {
  readonly item: T;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Le pire rapport de forme d'une rangee, celui qu'on cherche a minimiser. */
const pireRapport = (rangee: number[], cote: number, echelle: number): number => {
  if (rangee.length === 0) return Infinity;
  let somme = 0;
  let mini = Infinity;
  let maxi = 0;
  for (const v of rangee) {
    const a = v * echelle;
    somme += a;
    if (a < mini) mini = a;
    if (a > maxi) maxi = a;
  }
  if (somme <= 0 || cote <= 0) return Infinity;
  const c2 = cote * cote;
  const s2 = somme * somme;
  return Math.max((c2 * maxi) / s2, s2 / (c2 * mini));
};

/**
 * Pave un rectangle par les poids donnes, du plus lourd au plus leger.
 * Les poids nuls ou negatifs sont ecartes : un rectangle d'aire nulle n'est
 * pas un rectangle, et le laisser entrer produirait une division par zero.
 */
export const squarifier = <T>(
  items: readonly T[],
  poidsDe: (t: T) => number,
  x0: number,
  y0: number,
  largeur: number,
  hauteur: number
): Pave<T>[] => {
  const utiles = items.filter((t) => poidsDe(t) > 0);
  if (utiles.length === 0 || largeur <= 0 || hauteur <= 0) return [];

  const tries = [...utiles].sort((a, b) => poidsDe(b) - poidsDe(a));
  const total = tries.reduce((s, t) => s + poidsDe(t), 0);
  const echelle = (largeur * hauteur) / total;

  const sortie: Pave<T>[] = [];
  let x = x0;
  let y = y0;
  let l = largeur;
  let h = hauteur;
  let i = 0;

  while (i < tries.length) {
    const cote = Math.min(l, h);
    const rangee: T[] = [];
    let valeurs: number[] = [];

    /* On allonge la rangee tant que ca AMELIORE le pire rapport. Des que ca
       l'empire, la rangee est close : c'est tout l'algorithme. */
    while (i < tries.length) {
      const candidat = tries[i];
      if (candidat === undefined) break;
      const avec = [...valeurs, poidsDe(candidat)];
      if (rangee.length > 0 && pireRapport(avec, cote, echelle) > pireRapport(valeurs, cote, echelle)) break;
      rangee.push(candidat);
      valeurs = avec;
      i += 1;
    }

    const aireRangee = valeurs.reduce((s, v) => s + v, 0) * echelle;
    const epaisseur = cote > 0 ? aireRangee / cote : 0;

    let curseur = 0;
    for (let k = 0; k < rangee.length; k += 1) {
      const t = rangee[k];
      const v = valeurs[k];
      if (t === undefined || v === undefined) continue;
      const part = aireRangee > 0 ? (v * echelle) / aireRangee : 0;
      if (l >= h) {
        /* Rangee verticale, collee au bord gauche. */
        const hh = h * part;
        sortie.push({ item: t, x, y: y + curseur, w: epaisseur, h: hh });
        curseur += hh;
      } else {
        const ww = l * part;
        sortie.push({ item: t, x: x + curseur, y, w: ww, h: epaisseur });
        curseur += ww;
      }
    }

    if (l >= h) {
      x += epaisseur;
      l -= epaisseur;
    } else {
      y += epaisseur;
      h -= epaisseur;
    }
    if (l <= 0.5 || h <= 0.5) break;
  }

  return sortie;
};
