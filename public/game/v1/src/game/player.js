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
    this.body = '#f2b33d';       // la creature du joueur, jaune orange
    this.bodyD = '#c98a22';
    this.shorts = '#4a86d9';
    
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

    const B = this.body, BD = this.bodyD, BL = '#ffd98a';
    const S = this.shorts, SD = '#356aad';

    const parts = [];
    const R = (x, y, w, h, c) => parts.push({ x, y, w, h, c });
    const NOIR = '#2b2136';

    // ---- pieds : surtout pas la couleur du contour, sinon pied et contour
    //      fusionnent en un pave noir illisible sous la creature
    const PIED = '#6a5f7d', PIED_D = '#4e4560';
    R(-5, -3 + footL, 4, 3, PIED);
    R(-5, -1 + footL, 4, 1, PIED_D);
    R(1, -3 + footR, 4, 3, PIED);
    R(1, -1 + footR, 4, 1, PIED_D);

    // ---- petit corps, sous la tete
    const cy = -10 + hop;
    R(-5, cy, 10, 7, B);
    R(-5, cy, 10, 1, BL);
    R(3, cy, 2, 7, BD);
    // culotte
    R(-5, cy + 3, 10, 4, S);
    R(3, cy + 3, 2, 4, SD);
    R(-5, cy + 3, 10, 1, '#8fb8e8');

    // ---- grosse tete : c'est elle qui porte tout le caractere
    const ty = -22 + hop;
    R(-4, ty, 8, 1, B);
    R(-6, ty + 1, 12, 1, B);
    R(-7, ty + 2, 14, 8, B);
    R(-6, ty + 10, 12, 1, B);
    R(-4, ty + 11, 8, 1, B);
    // modele : la lumiere vient de la gauche
    R(-7, ty + 2, 3, 8, BL);
    R(4, ty + 2, 3, 8, BD);

    // ---- oreilles tombantes, de chaque cote de la tete
    R(-11, ty + 3 + flop, 4, 4, B);
    R(-12, ty + 7 + flop, 3, 3, BD);
    R(7, ty + 3 - flop, 4, 4, B);
    R(9, ty + 7 - flop, 3, 3, BD);

    // ---- antenne
    R(-1, ty - 4, 2, 4, BD);
    R(-2, ty - 6, 4, 2, BL);

    // ---- sacoche de disques
    R(-11, cy - 2, 5, 6, '#d97b4a');
    R(-11, cy - 2, 5, 1, '#a85c33');
    R(-10, cy - 4, 3, 2, NOIR);

    for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w) - 1, by + q.y - 1, q.w + 2, q.h + 2, INK);
    for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w), by + q.y, q.w, q.h, q.c);

    // visage
    if (!this.back) {
      const ex = fl > 0 ? 0 : -1;
      const ey = by + ty + 4;
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
