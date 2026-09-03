// Maths isométriques 2:1 · 1 tuile = 64x32 px, 1 unité de hauteur = 32 px
// Une tuile fait 32x16 pixels dans le tampon basse resolution, et une
// unite de hauteur vaut 16 pixels : tout est dessine au pixel pres.
export const HW = 16, HH = 8, HU = 16;

export function toScreen(x, y, z = 0) {
  return { x: (x - y) * HW, y: (x + y) * HH - z * HU };
}
// inverse (au niveau du sol z = 0)
export function toWorld(sx, sy) {
  return { x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 };
}

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;

// =====================================================================
//  LA CAMERA N'A PLUS DE ZOOM, ET C'EST LA CORRECTION.
//
//  Elle en avait un, continu, entre 0,5 et 2,4, applique DANS la
//  transformation du tampon. Or le tampon est deja une image basse
//  resolution : le monde y est dessine a un tiers de la taille de l'ecran,
//  puis agrandi d'un facteur entier. Multiplier encore par 0,5 la-dedans
//  divisait la definition par six, et le resultat etait exactement ce que
//  Mika a decrit, « en dezoomant ca devient vraiment tres pixellise ».
//
//  Le zoom vit desormais dans le FACTEUR D'AGRANDISSEMENT, cote Renderer,
//  et il est entier. Dezoomer diminue ce facteur : les pixels du jeu
//  deviennent plus petits a l'ecran, on voit plus de ville, et l'image reste
//  nette parce que chaque pixel du tampon tombe toujours sur un nombre
//  entier de pixels d'ecran. C'est l'inverse exact de l'ancien
//  comportement, ou dezoomer degradait.
// =====================================================================
export class Camera {
  constructor() { this.x = 0; this.y = 0; this.w = 0; this.h = 0; this.k = 1; }
  apply(ctx, dpr) {
    const o = toScreen(this.x, this.y, 0);
    // La camera suit le joueur en douceur, donc sa position est fractionnaire.
    // Si on laisse ce demi pixel dans la transformation, chaque forme dessinee
    // sur un pixel entier retombe entre deux pixels d'ecran et le canvas la
    // lisse : c'est le flou qui n'apparait qu'en mouvement. On cale donc le
    // decalage sur des pixels entiers du tampon.
    const tx = Math.round(this.w / 2 - o.x);
    const ty = Math.round(this.h / 2 - o.y);
    ctx.setTransform(dpr, 0, 0, dpr, dpr * tx, dpr * ty);
  }
  // px écran (CSS) -> monde (sol). k = facteur d'agrandissement du tampon.
  unproject(px, py) {
    const o = toScreen(this.x, this.y, 0);
    const bx = px / this.k, by = py / this.k;
    return toWorld(bx - this.w / 2 + o.x, by - this.h / 2 + o.y);
  }
}
