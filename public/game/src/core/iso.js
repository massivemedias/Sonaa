// Maths isométriques 2:1 — 1 tuile = 64x32 px, 1 unité de hauteur = 32 px
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

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.zoom = 1; this.w = 0; this.h = 0; this.k = 1; }
  apply(ctx, dpr) {
    const o = toScreen(this.x, this.y, 0);
    ctx.setTransform(dpr * this.zoom, 0, 0, dpr * this.zoom,
      dpr * (this.w / 2 - o.x * this.zoom), dpr * (this.h / 2 - o.y * this.zoom));
  }
  // px écran (CSS) -> monde (sol). k = facteur d'agrandissement du tampon.
  unproject(px, py) {
    const o = toScreen(this.x, this.y, 0);
    const bx = px / this.k, by = py / this.k;
    const sx = (bx - this.w / 2) / this.zoom + o.x;
    const sy = (by - this.h / 2) / this.zoom + o.y;
    return toWorld(sx, sy);
  }
}
