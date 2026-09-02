// =====================================================================
//  LE PERSONNAGE
// =====================================================================
import { toScreen } from '../core/iso.js';
import { INK, shadow, px, shade, LIGHT } from '../core/art.js';

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.speed = 3.1;           // tuiles / seconde
    this.path = null;
    this.anim = 0;
    this.flip = 1;              // 1 = regarde vers la droite de l'écran
    this.back = false;          // de dos
    this.moving = false;
    this.body = '#6fd8b0';       // la creature du joueur
    this.bodyD = '#48ab88';
    this.shorts = '#4a86d9';
    this.cup = '#ff5cb4';
    this.jacket = '#3f8f7d';      // le blouson, plus sombre que le t-shirt
    this.tee = '#f4ede0';
    this.blink = 0;               // minuteur de clignement
    this.nextBlink = 2 + Math.random() * 3;
  }

  goTo(tx, ty, city) {
    const p = city.path(this.x, this.y, tx, ty);
    if (p && p.length) { this.path = p; return true; }
    this.path = null; return false;
  }

  update(dt, city, stick) {
    let dx = 0, dy = 0;
    if (stick && (stick.x || stick.y)) {
      this.path = null;
      // le stick est en repère écran -> conversion vers le repère iso
      const sx = stick.x, sy = stick.y;
      dx = (sy * 2 + sx) / 2;
      dy = (sy * 2 - sx) / 2;
      const m = Math.hypot(dx, dy) || 1;
      dx /= m; dy /= m;
      const mag = Math.min(1, Math.hypot(sx, sy));
      dx *= mag; dy *= mag;
    } else if (this.path && this.path.length) {
      const t = this.path[0];
      const ddx = t.x - this.x, ddy = t.y - this.y;
      const d = Math.hypot(ddx, ddy);
      if (d < 0.12) { this.path.shift(); if (!this.path.length) this.path = null; }
      else { dx = ddx / d; dy = ddy / d; }
    }

    this.moving = !!(dx || dy);
    if (this.moving) {
      const step = this.speed * dt;
      const nx = this.x + dx * step, ny = this.y + dy * step;
      const r = 0.26;
      if (this.free(city, nx, this.y, r)) this.x = nx;
      if (this.free(city, this.x, ny, r)) this.y = ny;
      // orientation
      const sdx = dx - dy;           // dérivée écran horizontale
      const sdy = dx + dy;           // dérivée écran verticale (bas = +)
      if (Math.abs(sdx) > 0.08) this.flip = sdx > 0 ? 1 : -1;
      this.back = sdy < -0.15;
      this.anim += dt * 9;
    } else {
      this.anim += dt * 1.6;
    }
    // clignement des yeux
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink = 0.13; this.nextBlink = 2.4 + Math.random() * 3.4; }
    if (this.blink > 0) this.blink -= dt;
    this.vx = dx; this.vy = dy;
  }

  free(city, x, y, r) {
    return city.isWalkable(x - r, y - r) && city.isWalkable(x + r, y - r) &&
           city.isWalkable(x - r, y + r) && city.isWalkable(x + r, y + r);
  }

  draw(ctx, t, city) {
    const p = toScreen(this.x, this.y, 0);
    const bx = Math.round(p.x), by = Math.round(p.y);
    shadow(ctx, this.x, this.y, 0.32, 0, 0.32);

    const f = this.moving ? (Math.floor(this.anim * 1.6) % 4) : 0;
    const hop = this.moving ? [0, -2, 0, -1][f] : (Math.sin(t * 2.2) > 0.5 ? -1 : 0);
    const flop = this.moving ? [0, 1, 1, 0][f] : (Math.sin(t * 1.5) > 0 ? 1 : 0);
    const footL = [0, 1, 0, -1][f], footR = [0, -1, 0, 1][f];
    const fl = this.flip;

    const B = this.body, BD = this.bodyD, BL = '#a6f2d5';
    const S = this.shorts, SD = '#356aad';
    const CUP = this.cup;

    const parts = [];
    const R = (x, y, w, h, c) => parts.push({ x, y, w, h, c });

    // pieds
    R(-4, -3 + footL, 4, 3, '#2b2136');
    R(1, -3 + footR, 4, 3, '#2b2136');
    // culotte
    R(-5, -8 + hop, 10, 5, S);
    R(2, -8 + hop, 3, 5, SD);
    R(-5, -8 + hop, 10, 1, '#8fb8e8');

    // corps : une pile de rangees de largeurs differentes, donc arrondi
    const top = -20 + hop;
    R(-3, top, 6, 1, B);
    R(-5, top + 1, 10, 1, B);
    R(-6, top + 2, 12, 2, B);
    R(-7, top + 4, 14, 6, B);
    R(-6, top + 10, 12, 1, B);
    R(-4, top + 11, 8, 1, B);
    // modele : clair a gauche, sombre a droite
    R(-6, top + 2, 3, 8, BL);
    R(-7, top + 4, 2, 6, BL);
    R(4, top + 3, 2, 7, BD);
    R(-5, top + 10, 10, 1, BD);

    // grandes oreilles tombantes, en trois segments qui s'affinent
    R(-10, top + 3 + flop, 3, 3, B);
    R(-11, top + 6 + flop, 3, 3, BD);
    R(-11, top + 9 + flop, 2, 2, BD);
    R(7, top + 3 - flop, 3, 3, B);
    R(8, top + 6 - flop, 3, 3, BD);
    R(9, top + 9 - flop, 2, 2, BD);

    // antenne
    R(-1, top - 3, 1, 3, BD);
    R(-2, top - 5, 3, 2, BL);

    // sacoche de disques
    R(-11, -14 + hop, 4, 5, '#d97b4a');
    R(-11, -14 + hop, 4, 1, '#a85c33');
    R(-10, -16 + hop, 2, 2, '#2b2136');
    R(-7, -17 + hop, 5, 1, '#a85c33');

    for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w) - 1, by + q.y - 1, q.w + 2, q.h + 2, INK);
    for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w), by + q.y, q.w, q.h, q.c);

    // casque : arceau puis coussinets sur les oreilles
    const cy = top + 2;
    px(ctx, bx - 7, cy - 3, 14, 2, INK);
    px(ctx, bx - 6, cy - 3, 12, 1, '#5a5270');
    for (const sx of [-10, 7]) {
      px(ctx, bx + sx - 1, cy, 5, 7, INK);
      px(ctx, bx + sx, cy + 1, 3, 5, sx < 0 ? CUP : '#c93a86');
      px(ctx, bx + sx, cy + 1, 1, 5, '#ffa8d8');
    }

    // visage
    if (!this.back) {
      const ex = fl > 0 ? 0 : -1;
      const ey = by + top + 5;
      if (this.blink > 0) {
        px(ctx, bx - 4 + ex, ey + 1, 3, 1, INK);
        px(ctx, bx + 2 + ex, ey + 1, 3, 1, INK);
      } else {
        px(ctx, bx - 4 + ex, ey, 3, 4, '#ffffff');
        px(ctx, bx + 2 + ex, ey, 3, 4, '#ffffff');
        px(ctx, bx - 3 + ex, ey + 1, 2, 2, INK);
        px(ctx, bx + 3 + ex, ey + 1, 2, 2, INK);
        px(ctx, bx - 3 + ex, ey + 1, 1, 1, '#ffffff');
        px(ctx, bx + 3 + ex, ey + 1, 1, 1, '#ffffff');
      }
      px(ctx, bx - 6 + ex, ey + 5, 2, 1, '#ff9ec4');
      px(ctx, bx + 4 + ex, ey + 5, 2, 1, '#ff9ec4');
      px(ctx, bx - 1 + ex, ey + 6, 2, 1, '#2b2136');
    }

    if (this.moving && f % 2 === 1) {
      px(ctx, bx - fl * 8, by - 1, 2, 1, '#d9cfa8');
      px(ctx, bx - fl * 10, by - 2, 1, 1, '#d9cfa8');
    }
  }
}
