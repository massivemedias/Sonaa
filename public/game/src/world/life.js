// =====================================================================
//  LA VIE DE LA VILLE — passants, véhicules, oiseaux, notes de musique
// =====================================================================
import { toScreen } from '../core/iso.js';
import { shadow, shade, alpha, roundPoly, box, face, rrect, time as artTime, FW, FH } from '../core/art.js';

const P = (x, y, z) => toScreen(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];

const SHIRTS = ['#e8734f', '#f0b56a', '#6c9fd6', '#c96f9e', '#5ec4a9', '#8f5fc9', '#e5556f', '#57b7c9'];
const PANTS = ['#3f2a5e', '#4a3a63', '#2f5b52', '#5a4030'];
const SKINS = ['#f3c9a2', '#e0ab7d', '#c98d63', '#8d5a3c', '#f7d9bb'];
const HAIRS = ['#41265e', '#2b1a1a', '#7a4a2a', '#d8d0c0', '#b03a6a'];

class Walker {
  constructor(city) {
    this.city = city;
    this.skin = pick(SKINS); this.shirt = pick(SHIRTS);
    this.pants = pick(PANTS); this.hair = pick(HAIRS);
    this.scale = rnd(0.78, 0.95);
    this.speed = rnd(1.1, 2.0);
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
    return { x: 10.5, y: 10.5 };
  }
  retarget() {
    const t = this.randomSpot();
    this.path = this.city.path(this.x, this.y, t.x, t.y);
    if (!this.path || !this.path.length) this.wait = rnd(1, 3);
  }
  update(dt) {
    if (this.wait > 0) { this.wait -= dt; this.moving = false; this.anim += dt * 1.5; return; }
    if (!this.path || !this.path.length) { this.retarget(); return; }
    const t = this.path[0];
    const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy);
    if (d < 0.12) {
      this.path.shift();
      if (!this.path.length) { this.wait = rnd(1.5, 5); this.path = null; }
      return;
    }
    const step = this.speed * dt;
    this.x += dx / d * step; this.y += dy / d * step;
    const sdx = dx - dy, sdy = dx + dy;
    if (Math.abs(sdx) > 0.05) this.flip = sdx > 0 ? 1 : -1;
    this.back = sdy < -0.1;
    this.moving = true;
    this.anim += dt * 9;
  }
  draw(ctx) {
    drawMiniPerson(ctx, this.x, this.y, this, this.city.elev(this.x, this.y));
  }
}

// petit personnage simplifié, même langage graphique que le héros
export function drawMiniPerson(ctx, wx, wy, o, z = 0) {
  const p = P(wx, wy, z);
  const s = o.scale || 0.85;
  shadow(ctx, wx, wy, 0.28 * s, z, 0.24);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(o.flip * s, s);
  const walk = o.moving ? Math.sin(o.anim) : 0;
  const bob = o.moving ? Math.abs(Math.sin(o.anim)) * 2.2 : Math.sin(artTime() * 2 + wx) * 0.8;
  // jambes
  for (const side of [-1, 1]) {
    const sw = walk * 3.6 * side;
    ctx.save(); ctx.translate(side * 3 + sw * 0.3, -6 - Math.max(0, walk * side) * 2);
    roundPoly(ctx, [{ x: -2.6, y: -2 }, { x: 2.6, y: -2 }, { x: 2.3, y: 9 }, { x: -2.3, y: 9 }], 2.2,
      grad(ctx, -3, -2, 3, 9, shade(o.pants, 0.15), shade(o.pants, -0.25)));
    roundPoly(ctx, [{ x: -3.4, y: 7.5 }, { x: 3.6, y: 7.5 }, { x: 3.6, y: 11.5 }, { x: -3.4, y: 11.5 }], 2, '#eef2f0');
    ctx.restore();
  }
  const by = -21 - bob;
  // bras
  for (const side of [-1, 1]) {
    const sw = -walk * 3 * side;
    ctx.save(); ctx.translate(side * 8.6, by + 3 + sw * 0.5);
    roundPoly(ctx, [{ x: -2, y: -2 }, { x: 2, y: -2 }, { x: 1.9, y: 9 }, { x: -1.9, y: 9 }], 2,
      grad(ctx, -2, 0, 2, 9, shade(o.shirt, 0.05), shade(o.shirt, -0.3)));
    ctx.beginPath(); ctx.arc(0, 10, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = shade(o.skin, -0.05); ctx.fill();
    ctx.restore();
  }
  // corps
  roundPoly(ctx, [{ x: -6.4, y: by }, { x: 6.4, y: by }, { x: 7.2, y: by + 15 }, { x: -7.2, y: by + 15 }], 5.6,
    grad(ctx, -7, by, 7, by + 15, shade(o.shirt, 0.24), shade(o.shirt, -0.26)));
  // tête
  const hy = -35 - bob;
  roundPoly(ctx, [{ x: -6.8, y: hy + 1 }, { x: 6.8, y: hy + 1 }, { x: 6.8, y: hy + 13 }, { x: -6.8, y: hy + 13 }], 6.4,
    grad(ctx, -7, hy, 7, hy + 13, shade(o.skin, 0.18), shade(o.skin, -0.16)));
  // cheveux
  ctx.beginPath();
  ctx.moveTo(-7.1, hy + 7);
  ctx.quadraticCurveTo(-8, hy - 3.6, 0, hy - 3.6);
  ctx.quadraticCurveTo(8, hy - 3.6, 7.1, hy + 7);
  ctx.lineTo(7.1, hy + 4);
  ctx.quadraticCurveTo(0, hy + 6.4, -7.1, hy + 4.6);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -7, hy - 3, 7, hy + 7, shade(o.hair, 0.2), shade(o.hair, -0.3));
  ctx.fill();
  if (!o.back) {
    ctx.fillStyle = '#2a1533';
    ctx.beginPath(); ctx.ellipse(2.6, hy + 8, 1.2, 1.5, 0, 0, Math.PI * 2);
    ctx.ellipse(-2.6, hy + 8, 1.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------ véhicules
class Car {
  constructor(axis, lane, color, speed, offset) {
    this.axis = axis; this.lane = lane; this.color = color;
    this.speed = speed; this.t = offset;
  }
  update(dt) { this.t = (this.t + dt * this.speed) % 30; }
  pos() {
    const p = this.t - 4;                      // -4 -> 26 puis recommence
    return this.axis === 'x' ? { x: p, y: this.lane } : { x: this.lane, y: p };
  }
  get sort() { const p = this.pos(); return p.x + p.y; }
  draw(ctx) {
    const { x, y } = this.pos();
    if (this.axis === 'x') drawCarX(ctx, x, y, this.color);
    else drawCarY(ctx, x, y, this.color);
  }
}

function wheels(ctx, pts, z) {
  for (const [wx, wy] of pts) {
    const p = P(wx, wy, z);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 6.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1533'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 2.6, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#cfd8d4'; ctx.fill();
  }
}
function drawCarX(ctx, x, y, c) {
  const W = 1.55, D = 0.8, Z = -0.10;
  shadow(ctx, x + W / 2, y + D / 2, 0.7, Z, 0.24);
  wheels(ctx, [[x + 0.3, y + D], [x + W - 0.3, y + D]], Z + 0.16);
  box(ctx, x, y, Z + 0.13, W, D, 0.34, c, { round: 4 });
  box(ctx, x + 0.3, y + 0.05, Z + 0.47, 0.85, D - 0.1, 0.3, shade(c, 0.12), { round: 4 });
  face(ctx, x + 0.34, y + D - 0.05, Z + 0.74, 'left', k => {
    rrect(k, 0, 0, 0.76 * FW, 0.2 * FH, 3, '#cfeef7');
  });
  const p = P(x + W, y + D * 0.5, Z + 0.3);
  ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#ffe08a'; ctx.fill();
}
function drawCarY(ctx, x, y, c) {
  const W = 0.8, D = 1.55, Z = -0.10;
  shadow(ctx, x + W / 2, y + D / 2, 0.7, Z, 0.24);
  wheels(ctx, [[x + W, y + 0.3], [x + W, y + D - 0.3]], Z + 0.16);
  box(ctx, x, y, Z + 0.13, W, D, 0.34, c, { round: 4 });
  box(ctx, x + 0.05, y + 0.3, Z + 0.47, W - 0.1, 0.85, 0.3, shade(c, 0.12), { round: 4 });
  face(ctx, x + W, y + D - 0.34, Z + 0.74, 'right', k => {
    rrect(k, 0, 0, 0.76 * FW, 0.2 * FH, 3, '#cfeef7');
  });
}

// -------------------------------------------------------------- oiseaux
class Bird {
  constructor(i) { this.reset(i * 7); }
  reset(off = 0) {
    this.x = -6 - Math.random() * 6 + off * 0;
    this.y = 4 + Math.random() * 14;
    this.z = 6 + Math.random() * 4;
    this.sp = 1.4 + Math.random() * 1.2;
    this.ph = Math.random() * 6;
  }
  update(dt) { this.x += this.sp * dt; this.y -= this.sp * 0.35 * dt; if (this.x > 30) this.reset(); }
  draw(ctx) {
    const t = artTime();
    const p = P(this.x, this.y, this.z + Math.sin(t * 1.3 + this.ph) * 0.4);
    const flap = Math.sin(t * 9 + this.ph);
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.strokeStyle = 'rgba(40,18,64,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-3, -3 - flap * 2.5, 0, 0);
    ctx.quadraticCurveTo(3, -3 - flap * 2.5, 6, 0);
    ctx.stroke();
    ctx.restore();
  }
}

// ------------------------------------------------- notes de musique
function musicNotes(ctx, x, y, z, seed, color = 'rgba(255,120,200,') {
  const t = artTime();
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 0.32 + i * 0.33 + seed) % 1);
    const p = P(x, y, z + ph * 1.6);
    ctx.save();
    ctx.translate(p.x + Math.sin(ph * 6 + seed * 4) * 12, p.y);
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
    ctx.fillStyle = color + '1)';
    ctx.font = '700 15px serif';
    ctx.fillText(i % 2 ? '♪' : '♫', 0, 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- monde
export class Life {
  constructor(city) {
    this.city = city;
    this.walkers = Array.from({ length: 7 }, () => new Walker(city));
    this.cars = [
      new Car('x', 10.35, '#e8734f', 1.1, 2),
      new Car('x', 10.35, '#5ec4a9', 0.95, 16),
      new Car('y', 10.35, '#f0b56a', 1.0, 9),
      new Car('y', 10.35, '#8f5fc9', 0.85, 22),
    ];
    this.birds = Array.from({ length: 4 }, (_, i) => new Bird(i));
  }
  update(dt) {
    for (const w of this.walkers) w.update(dt);
    for (const c of this.cars) c.update(dt);
    for (const b of this.birds) b.update(dt);
  }
  entities(out, ctx) {
    for (const w of this.walkers) out.push({ k: w.x + w.y, draw: () => w.draw(ctx) });
    for (const c of this.cars) out.push({ k: c.sort, draw: () => c.draw(ctx) });
  }
  drawSky(ctx) { for (const b of this.birds) b.draw(ctx); }
  drawNotes(ctx, city, night) {
    const club = city.buildings.find(b => b.id === 'club');
    const bar = city.buildings.find(b => b.id === 'bar');
    if (club) musicNotes(ctx, club.x + club.w / 2, club.y + club.d + 0.3, 2.1, 0.1, 'rgba(255,120,200,');
    if (bar) musicNotes(ctx, bar.x + bar.w / 2, bar.y + bar.d + 0.3, 2.6, 0.6, 'rgba(120,235,200,');
  }
}

function grad(ctx, x0, y0, x1, y1, c0, c1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}
