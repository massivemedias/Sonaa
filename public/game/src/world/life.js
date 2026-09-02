// =====================================================================
//  LA VIE DE LA CLAIRIERE — passants, oiseaux, notes de musique
//  Tout en pixel, a l'echelle de la tuile 32x16.
// =====================================================================
import { toScreen } from '../core/iso.js';
import { shadow, px, shade, INK, time as artTime } from '../core/art.js';

const P = (x, y, z) => toScreen(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];

const SHIRTS = ['#e8734f', '#f0b56a', '#6c9fd6', '#c96f9e', '#5ec4a9', '#8f5fc9', '#e5556f'];
const PANTS = ['#3f2a5e', '#4a3a63', '#2f5b52', '#5a4030'];
const SKINS = ['#f0c088', '#e0ab7d', '#c98d63', '#8d5a3c', '#f7d9bb'];
const HAIRS = ['#4a2f63', '#2b1a1a', '#7a4a2a', '#d8d0c0', '#b03a6a'];

class Walker {
  constructor(city) {
    this.city = city;
    this.skin = pick(SKINS); this.shirt = pick(SHIRTS);
    this.pants = pick(PANTS); this.hair = pick(HAIRS);
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
  shadow(ctx, wx, wy, 0.26, z, 0.26);
  const f = o.moving ? (Math.floor(o.anim * 1.4) % 4) : 0;
  const legL = [0, 1, 0, -1][f], legR = [0, -1, 0, 1][f];
  const bob = o.moving ? [0, -1, 0, -1][f] : 0;
  const fl = o.flip;
  const parts = [];
  const R = (x, y, w, h, c) => parts.push({ x, y, w, h, c });

  R(-3, -6 + legL, 2, 4, o.pants);
  R(1, -6 + legR, 2, 4, shade(o.pants, -0.15));
  R(-4, -2 + legL, 3, 2, '#e8e0cf');
  R(1, -2 + legR, 3, 2, '#e8e0cf');
  R(-4, -13 + bob, 8, 8, o.shirt);
  R(-4, -13 + bob, 2, 8, shade(o.shirt, 0.18));
  R(2, -13 + bob, 2, 8, shade(o.shirt, -0.2));
  R(-6, -12 + bob, 2, 5, shade(o.shirt, 0.1));
  R(4, -12 + bob, 2, 5, shade(o.shirt, -0.22));
  R(-5, -21 + bob, 10, 8, o.skin);
  R(2, -21 + bob, 3, 8, shade(o.skin, -0.14));
  R(-5, -23 + bob, 10, 3, o.hair);
  R(-5, -23 + bob, 3, 2, shade(o.hair, 0.22));

  for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w) - 1, by + q.y - 1, q.w + 2, q.h + 2, INK);
  for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w), by + q.y, q.w, q.h, q.c);

  if (!o.back) {
    const ex = fl > 0 ? 0 : -1;
    px(ctx, bx - 3 + ex, by - 18 + bob, 1, 2, '#2b2136');
    px(ctx, bx + 2 + ex, by - 18 + bob, 1, 2, '#2b2136');
    px(ctx, bx - 1 + ex, by - 15 + bob, 2, 1, '#a8654a');
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
function musicNotes(ctx, x, y, z, seed, color) {
  for (let i = 0; i < 3; i++) {
    const t = ((artTime() * 0.4 + i * 0.33 + seed) % 1);
    const p = P(x, y, z + t * 1.6);
    const dx = Math.round(Math.sin(t * 6 + seed * 9) * 4);
    if (t > 0.85) continue;
    px(ctx, p.x + dx, p.y, 2, 2, color);
    px(ctx, p.x + dx + 2, p.y - 3, 1, 3, color);
  }
}

export class Life {
  constructor(city) {
    this.city = city;
    this.walkers = Array.from({ length: 8 }, () => new Walker(city));
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
    if (club) musicNotes(ctx, club.x + club.w / 2, club.y + club.d + 0.2, 1.8, 0.1, '#ff8ecb');
    if (bar) musicNotes(ctx, bar.x + bar.w / 2, bar.y + bar.d + 0.2, 2.0, 0.6, '#8fe8c8');
  }
}
