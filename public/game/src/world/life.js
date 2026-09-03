// =====================================================================
//  LA VIE DE LA CLAIRIERE — passants et oiseaux
//  Chaque passant porte une identite : on peut lui parler.
//  Tout en pixel, a l'echelle de la tuile 32x16.
// =====================================================================
import { toScreen } from '../core/iso.js';
import { toutLeMonde } from '../game/dialogue.js';
import { shadow, px, shade, INK, time as artTime } from '../core/art.js';

const P = (x, y, z) => toScreen(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const melange = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = a => a[Math.random() * a.length | 0];

// la meme espece que le heros, dans d'autres couleurs
const BODIES = ['#f2cf4c', '#e88f4a', '#e8709a', '#7fb8f0', '#b98fe8', '#8fe0a8', '#f0a8c0'];
const SHORTS = ['#4a86d9', '#d9564a', '#4ac9a8', '#e8a93a', '#8f5fc9'];

class Walker {
  constructor(city, identite) {
    this.city = city;
    this.identite = identite || null;   // qui est cette personne
    this.body = pick(BODIES);
    this.shorts = pick(SHORTS);
    this.speed = rnd(1.0, 1.8);
    this.anim = Math.random() * 10;
    this.flip = 1; this.back = false; this.moving = true;
    this.wait = 0;
    const s = this.randomSpot();
    this.x = s.x; this.y = s.y;
    this.path = null;
    this.retarget();
  }
  randomSpot() {
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.city.w | 0, y = Math.random() * this.city.h | 0;
      if (this.city.isWalkable(x, y)) return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: 14.5, y: 9.5 };
  }
  retarget() {
    const t = this.randomSpot();
    this.path = this.city.path(this.x, this.y, t.x, t.y);
    if (!this.path || !this.path.length) this.path = null;
  }
  update(dt) {
    if (this.wait > 0) { this.wait -= dt; this.moving = false; return; }
    if (!this.path || !this.path.length) {
      if (Math.random() < 0.02) this.retarget();
      else { this.wait = rnd(0.5, 2.5); }
      this.moving = false;
      return;
    }
    const t = this.path[0];
    const dx = t.x - this.x, dy = t.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.12) { this.path.shift(); if (!this.path.length) { this.path = null; this.wait = rnd(0.6, 3); } return; }
    const step = this.speed * dt;
    this.x += dx / d * step; this.y += dy / d * step;
    const sdx = dx - dy, sdy = dx + dy;
    if (Math.abs(sdx) > 0.05) this.flip = sdx > 0 ? 1 : -1;
    this.back = sdy < -0.1;
    this.moving = true;
    this.anim += dt * 8;
  }
  draw(ctx) { drawMiniPerson(ctx, this.x, this.y, this); }
}

// petit passant : la meme grammaire que le heros, en plus simple
export function drawMiniPerson(ctx, wx, wy, o, z = 0) {
  const p = P(wx, wy, z);
  const bx = Math.round(p.x), by = Math.round(p.y);
  shadow(ctx, wx, wy, 0.28, z, 0.28);

  const f = o.moving ? (Math.floor(o.anim * 1.4) % 4) : 0;
  const hop = o.moving ? [0, -2, 0, -1][f] : 0;
  const flop = o.moving ? [0, 1, 1, 0][f] : 0;
  const footL = [0, 1, 0, -1][f], footR = [0, -1, 0, 1][f];
  const fl = o.flip;
  const B = o.body, BD = shade(o.body, -0.26), BL = shade(o.body, 0.26);
  const S = o.shorts, SD = shade(o.shorts, -0.24);

  const parts = [];
  const R = (x, y, w, h, c) => parts.push({ x, y, w, h, c });
  R(-4, -3 + footL, 3, 3, '#2b2136');
  R(1, -3 + footR, 3, 3, '#2b2136');
  R(-5, -8 + hop, 10, 5, S);
  R(2, -8 + hop, 3, 5, SD);

  const top = -19 + hop;
  R(-3, top, 6, 1, B);
  R(-5, top + 1, 10, 1, B);
  R(-6, top + 2, 12, 7, B);
  R(-5, top + 9, 10, 1, B);
  R(-3, top + 10, 6, 1, B);
  R(-6, top + 2, 3, 7, BL);
  R(3, top + 2, 3, 7, BD);
  R(-5, top + 9, 10, 1, BD);
  R(-9, top + 3 + flop, 3, 3, B);
  R(-10, top + 6 + flop, 2, 3, BD);
  R(6, top + 3 - flop, 3, 3, B);
  R(8, top + 6 - flop, 2, 3, BD);
  R(-1, top - 3, 1, 3, BD);
  R(-2, top - 5, 3, 2, BL);

  for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w) - 1, by + q.y - 1, q.w + 2, q.h + 2, INK);
  for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w), by + q.y, q.w, q.h, q.c);

  if (!o.back) {
    const ex = fl > 0 ? 0 : -1;
    const ey = by + top + 4;
    px(ctx, bx - 4 + ex, ey, 3, 3, '#ffffff');
    px(ctx, bx + 2 + ex, ey, 3, 3, '#ffffff');
    px(ctx, bx - 3 + ex, ey + 1, 2, 2, INK);
    px(ctx, bx + 3 + ex, ey + 1, 2, 2, INK);
    px(ctx, bx - 1 + ex, ey + 5, 2, 1, INK);
  }
}

class Bird {
  constructor(i) { this.reset(i * 3); }
  reset(d = 0) {
    this.x = -4 - Math.random() * 8; this.y = rnd(2, 22);
    this.z = rnd(3.5, 6); this.sp = rnd(1.4, 2.6); this.ph = Math.random() * 6; this.delay = d;
  }
  update(dt) {
    if (this.delay > 0) { this.delay -= dt; return; }
    this.x += this.sp * dt; this.y += this.sp * 0.3 * dt;
    this.ph += dt * 9;
    if (this.x > 34) this.reset(rnd(2, 10));
  }
  draw(ctx) {
    if (this.delay > 0) return;
    const p = P(this.x, this.y, this.z);
    const up = Math.sin(this.ph) > 0;
    const bx = Math.round(p.x), by = Math.round(p.y);
    px(ctx, bx, by, 1, 1, '#2b2136');
    px(ctx, bx - 2, by + (up ? -1 : 1), 2, 1, '#2b2136');
    px(ctx, bx + 1, by + (up ? -1 : 1), 2, 1, '#2b2136');
  }
}

// petites notes qui montent au-dessus du club et du bar

export class Life {
  constructor(city) {
    this.city = city;
    // chaque passant est quelqu'un : un rival ou un habitant du quartier
    const cast = melange(toutLeMonde()).slice(0, 8);
    this.walkers = cast.map(p => new Walker(city, p));
    this.birds = Array.from({ length: 4 }, (_, i) => new Bird(i));
  }
  update(dt) {
    for (const w of this.walkers) w.update(dt);
    for (const b of this.birds) b.update(dt);
  }
  entities(ctx) {
    return this.walkers.map(w => ({ k: w.x + w.y, draw: () => w.draw(ctx) }));
  }
  drawAbove(ctx, city, night) {
    for (const b of this.birds) b.draw(ctx);
    const club = city.buildings.find(b => b.id === 'club');
    const bar = city.buildings.find(b => b.id === 'bar');
  }
}

// le passant a portee de voix, s'il y en a un
export function passantProche(life, x, y, portee = 1.5) {
  if (!life) return null;
  let best = null, bd = portee;
  for (const w of life.walkers) {
    if (!w.identite) continue;
    const d = Math.hypot(w.x - x, w.y - y);
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}
