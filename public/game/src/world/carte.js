// =====================================================================
//  LA CARTE · la grille de la ville, les obstacles, le chemin
//  ---------------------------------------------------------------
//  Quatre rangees de batiments, des rues de deux tuiles entre elles, une
//  place au centre, un parc et une tour au sud. Les portes donnent toutes
//  au sud, sur une rue.
// =====================================================================
import { BATIMENTS, LARGEUR as W, HAUTEUR as H, DEPART } from '../data/monde.js';

export const VIDE = 0, HERBE = 1, RUE = 2, PLACE = 3, TROTTOIR = 4, EAU = 5, FORET = 6, PARC = 7;
export { W, H, DEPART };

const RUES_V = [[8, 9], [14, 15], [20, 21], [26, 27]];
const RUES_H = [[8, 9], [15, 16], [22, 23], [29, 30]];

export class Carte {
  constructor() {
    this.w = W; this.h = H;
    this.tuiles = new Uint8Array(W * H);
    this.bloque = new Uint8Array(W * H);
    this.batiments = BATIMENTS;
    this.construire();
  }
  idx(x, y) { return y * W + x; }
  dedans(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  tuile(x, y) { return this.dedans(x, y) ? this.tuiles[this.idx(x, y)] : VIDE; }
  marchable(x, y) {
    x |= 0; y |= 0;
    if (!this.dedans(x, y)) return false;
    const t = this.tuiles[this.idx(x, y)];
    return t !== VIDE && t !== FORET && t !== EAU && !this.bloque[this.idx(x, y)];
  }

  construire() {
    const rnd = mulberry(4242);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const bord = x < 2 || y < 2 || x > W - 3 || y > H - 3;
      this.tuiles[this.idx(x, y)] = bord ? FORET : HERBE;
    }
    for (const [a, b] of RUES_V) for (let y = 3; y <= 30; y++) for (let x = a; x <= b; x++) this.tuiles[this.idx(x, y)] = RUE;
    for (const [a, b] of RUES_H) for (let x = 3; x <= 32; x++) for (let y = a; y <= b; y++) this.tuiles[this.idx(x, y)] = RUE;
    // la place centrale
    for (let y = 10; y <= 14; y++) for (let x = 14; x <= 19; x++) this.tuiles[this.idx(x, y)] = PLACE;
    // le pre du parc
    for (let y = 24; y <= 28; y++) for (let x = 3; x <= 12; x++) if (this.tuile(x, y) === HERBE) this.tuiles[this.idx(x, y)] = PARC;
    // l'etang, au sud-est de la place, entre le label et la tour
    const ex = 24.5, ey = 26.5;
    for (let y = 24; y <= 28; y++) for (let x = 22; x <= 27; x++) {
      if (this.tuile(x, y) === RUE) continue;
      const dx = (x + 0.5 - ex) / 2.6, dy = (y + 0.5 - ey) / 2.0;
      if (dx * dx + dy * dy <= 1) this.tuiles[this.idx(x, y)] = EAU;
    }
    // trottoirs autour des batiments, puis les batiments bloquent
    for (const b of this.batiments) {
      for (let y = b.y - 1; y <= b.y + b.d; y++) for (let x = b.x - 1; x <= b.x + b.w; x++)
        if (this.dedans(x, y) && this.tuile(x, y) === HERBE) this.tuiles[this.idx(x, y)] = TROTTOIR;
    }
    for (const b of this.batiments) {
      for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++)
        if (this.dedans(x, y)) { this.bloque[this.idx(x, y)] = 1; }
    }

    this.decors = [
      { type: 'fontaine', x: 17, y: 12.5 },
      { type: 'banc', x: 15.5, y: 11 }, { type: 'banc', x: 18.5, y: 11 },
      { type: 'banc', x: 15.5, y: 14 }, { type: 'banc', x: 18.5, y: 14 },
      { type: 'kiosque', x: 6, y: 27 },
    ];
    this.bloque[this.idx(17, 12)] = 1; this.bloque[this.idx(16, 12)] = 1;
    // lampadaires aux carrefours
    for (const [a] of RUES_V) for (const [c] of RUES_H) this.decors.push({ type: 'lampe', x: a - 0.35, y: c - 0.35 });
    // caisses devant les disquaires
    for (const b of this.batiments) if (b.kind === 'disquaire') this.decors.push({ type: 'caisses', x: b.x + b.w + 0.5, y: b.y + b.d - 0.5 });
    // arbres : la foret du pourtour, puis un semis dans les pelouses
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.tuile(x, y) !== FORET) continue;
      const r = rnd();
      if (r < 0.6) this.decors.push({ type: 'arbre', x: x + 0.2 + rnd() * 0.6, y: y + 0.2 + rnd() * 0.6, s: 0.85 + rnd() * 0.4, teinte: rnd() });
      else if (r < 0.85) this.decors.push({ type: 'buisson', x: x + 0.3 + rnd() * 0.4, y: y + 0.3 + rnd() * 0.4, s: 0.8 + rnd() * 0.4 });
    }
    for (let i = 0; i < 160; i++) {
      const x = 2 + rnd() * (W - 4), y = 2 + rnd() * (H - 4);
      const t = this.tuile(x | 0, y | 0);
      if ((t !== HERBE && t !== PARC) || this.bloque[this.idx(x | 0, y | 0)]) continue;
      const r = rnd();
      this.decors.push({ type: r < 0.45 ? 'buisson' : r < 0.8 ? 'arbre' : 'fleurs', x, y, s: 0.7 + rnd() * 0.4, teinte: rnd() });
    }
  }

  batimentA(x, y) {
    for (const b of this.batiments) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) return b;
    return null;
  }
  porteProche(px, py, max = 1.5) {
    let best = null, bd = max;
    for (const b of this.batiments) {
      const d = Math.hypot(px - (b.door.x + 0.5), py - (b.door.y + 0.5));
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  pointLibre(rnd = Math.random) {
    for (let i = 0; i < 300; i++) {
      const x = rnd() * W | 0, y = rnd() * H | 0;
      if (this.marchable(x, y)) return { x: x + 0.5, y: y + 0.5 };
    }
    return { ...DEPART };
  }

  /* A* sur la grille, huit directions, tas binaire. */
  chemin(sx, sy, tx, ty) {
    sx |= 0; sy |= 0; tx |= 0; ty |= 0;
    if (!this.marchable(tx, ty)) {
      let best = null, bd = 1e9;
      for (let r = 1; r <= 3 && !best; r++)
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = tx + dx, ny = ty + dy;
          if (!this.marchable(nx, ny)) continue;
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = [nx, ny]; }
        }
      if (!best) return null;
      tx = best[0]; ty = best[1];
    }
    if (sx === tx && sy === ty) return [];
    const N = W * H, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1);
    const cle = this.idx(sx, sy), but = this.idx(tx, ty);
    const hc = (x, y) => Math.abs(x - tx) + Math.abs(y - ty);
    const tas = new Tas();
    g[cle] = 0; tas.push(cle, hc(sx, sy));
    const vu = new Uint8Array(N);
    while (tas.taille) {
      const i = tas.pop();
      if (i === but) break;
      if (vu[i]) continue;
      vu[i] = 1;
      const cx = i % W, cy = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.marchable(nx, ny)) continue;
        if (dx && dy && (!this.marchable(cx + dx, cy) || !this.marchable(cx, cy + dy))) continue;
        const ni = this.idx(nx, ny), cout = dx && dy ? 1.42 : 1;
        if (g[i] + cout < g[ni]) { g[ni] = g[i] + cout; came[ni] = i; tas.push(ni, g[ni] + hc(nx, ny)); }
      }
    }
    if (came[but] === -1 && but !== cle) return null;
    const sortie = [];
    let c = but;
    while (c !== cle && c !== -1) { sortie.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 }); c = came[c]; }
    return sortie.reverse();
  }
}

class Tas {
  constructor() { this.n = []; this.f = []; }
  get taille() { return this.n.length; }
  push(i, f) {
    const n = this.n, F = this.f;
    n.push(i); F.push(f);
    let k = n.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (F[p] <= F[k]) break;
      [n[p], n[k]] = [n[k], n[p]]; [F[p], F[k]] = [F[k], F[p]];
      k = p;
    }
  }
  pop() {
    const n = this.n, F = this.f, top = n[0];
    const li = n.pop(), lf = F.pop();
    if (n.length) {
      n[0] = li; F[0] = lf;
      let k = 0;
      for (;;) {
        const a = k * 2 + 1, b = a + 1;
        let m = k;
        if (a < n.length && F[a] < F[m]) m = a;
        if (b < n.length && F[b] < F[m]) m = b;
        if (m === k) break;
        [n[m], n[k]] = [n[k], n[m]]; [F[m], F[k]] = [F[k], F[m]];
        k = m;
      }
    }
    return top;
  }
}

export function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* LE MARCHEUR : le heros et les passants partagent ce corps. */
export class Marcheur {
  constructor(x, y, vitesse = 3.2) {
    this.x = x; this.y = y; this.vitesse = vitesse;
    this.chemin = null; this.anim = 0; this.sens = 1; this.dos = false; this.bouge = false;
    this.attente = 0;
  }
  allerA(tx, ty, carte) {
    const c = carte.chemin(this.x, this.y, tx, ty);
    if (c && c.length) { this.chemin = c; return true; }
    this.chemin = null; return false;
  }
  update(dt, carte, stick) {
    let dx = 0, dy = 0;
    if (stick && (stick.x || stick.y)) {
      this.chemin = null;
      const sx = stick.x, sy = stick.y;
      dx = (sy * 2 + sx) / 2; dy = (sy * 2 - sx) / 2;
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const mag = Math.min(1, Math.hypot(sx, sy)); dx *= mag; dy *= mag;
    } else if (this.chemin && this.chemin.length) {
      const t = this.chemin[0];
      const ddx = t.x - this.x, ddy = t.y - this.y, d = Math.hypot(ddx, ddy);
      if (d < 0.12) { this.chemin.shift(); if (!this.chemin.length) this.chemin = null; }
      else { dx = ddx / d; dy = ddy / d; }
    }
    this.bouge = !!(dx || dy);
    if (this.bouge) {
      const pas = this.vitesse * dt;
      const nx = this.x + dx * pas, ny = this.y + dy * pas, r = 0.24;
      if (this.libre(carte, nx, this.y, r)) this.x = nx;
      if (this.libre(carte, this.x, ny, r)) this.y = ny;
      const sdx = dx - dy, sdy = dx + dy;
      if (Math.abs(sdx) > 0.08) this.sens = sdx > 0 ? 1 : -1;
      this.dos = sdy < -0.15;
      this.anim += dt * 9;
    } else this.anim += dt * 1.5;
  }
  libre(carte, x, y, r) {
    return carte.marchable(x - r, y - r) && carte.marchable(x + r, y - r) && carte.marchable(x - r, y + r) && carte.marchable(x + r, y + r);
  }
}
