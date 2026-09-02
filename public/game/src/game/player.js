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
    this.skin = '#f3c9a2';
    this.shirt = '#4fbf9f';
    this.pants = '#3f2a5e';
    this.hair = '#41265e';
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
    shadow(ctx, this.x, this.y, 0.34, 0, 0.3);

    // cycle de marche : quatre poses, comme dans un jeu 16 bits
    const f = this.moving ? (Math.floor(this.anim * 1.6) % 4) : 0;
    const legL = [0, 1, 0, -1][f];       // decalage vertical des jambes
    const legR = [0, -1, 0, 1][f];
    const bob = this.moving ? [0, -1, 0, -1][f] : (Math.sin(t * 2) > 0.6 ? -1 : 0);
    const arm = [0, -1, 0, 1][f];
    const fl = this.flip;                // 1 = tourne vers la droite

    const SKIN = '#f0c088', SKIN_D = '#d19a63';
    const HAIR = '#4a2f63', HAIR_L = '#63407f';
    const COAT = '#3fa88f', COAT_L = '#54c0a4', COAT_D = '#2b7d68';
    const PANT = '#3c3350', PANT_D = '#2b2440';
    const SHOE = '#e8e0cf', BAG = '#d97b4a', BAG_D = '#b35f34';
    const CUP = '#ff5cb4', CUP_D = '#c93a86';

    const parts = [];
    const R = (x, y, w, h, c) => parts.push({ x, y, w, h, c });

    // --- jambes et chaussures
    R(-4, -7 + legL, 3, 5, PANT);
    R(1, -7 + legR, 3, 5, PANT_D);
    R(-5, -2 + legL, 4, 2, SHOE);
    R(1, -2 + legR, 4, 2, SHOE);

    // --- corps : blouson ouvert sur un t-shirt clair
    R(-5, -15 + bob, 10, 9, COAT);
    R(-5, -15 + bob, 3, 9, COAT_L);        // cote eclaire
    R(3, -15 + bob, 2, 9, COAT_D);         // cote a l'ombre
    R(-1, -14 + bob, 2, 6, '#f0e6d2');     // t-shirt
    R(-1, -11 + bob, 1, 1, '#ffd76a');     // tirette

    // --- bras
    R(-7, -14 + bob + arm, 2, 6, COAT_L);
    R(5, -14 + bob - arm, 2, 6, COAT_D);
    R(-7, -8 + bob + arm, 2, 2, SKIN);
    R(5, -8 + bob - arm, 2, 2, SKIN);

    // --- sacoche de disques, du cote oppose au regard
    R(-9, -11 + bob, 4, 5, BAG);
    R(-9, -11 + bob, 4, 1, BAG_D);
    R(-8, -13 + bob, 2, 2, '#2b2136');     // le disque qui depasse
    R(-5, -14 + bob, 5, 1, BAG_D);         // bandouliere

    // --- tete
    R(-6, -24 + bob, 12, 10, SKIN);
    R(3, -24 + bob, 3, 10, SKIN_D);
    R(-6, -26 + bob, 12, 4, HAIR);         // cheveux
    R(-6, -26 + bob, 4, 3, HAIR_L);
    R(-6, -23 + bob, 2, 3, HAIR);          // meche sur la tempe
    R(4, -23 + bob, 2, 3, HAIR);

    // --- casque
    R(-8, -25 + bob, 2, 2, '#2b2136');     // arceau
    R(-6, -27 + bob, 12, 1, '#2b2136');
    R(6, -25 + bob, 2, 2, '#2b2136');
    R(-9, -23 + bob, 3, 6, CUP);           // ecouteurs
    R(-9, -23 + bob, 1, 6, '#ffa8d8');
    R(6, -23 + bob, 3, 6, CUP_D);

    // 1) passe de contour : chaque element grossi d'un pixel
    for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w) - 1, by + q.y - 1, q.w + 2, q.h + 2, INK);
    // 2) passe de couleur
    for (const q of parts) px(ctx, bx + (fl > 0 ? q.x : -q.x - q.w), by + q.y, q.w, q.h, q.c);

    // --- visage, dessine par-dessus (rien si de dos)
    if (!this.back) {
      const ex = fl > 0 ? 0 : -1;
      const eyeY = by - 20 + bob;
      const blink = this.blink > 0;
      if (blink) {
        px(ctx, bx - 4 + ex, eyeY + 1, 2, 1, '#2b2136');
        px(ctx, bx + 2 + ex, eyeY + 1, 2, 1, '#2b2136');
      } else {
        px(ctx, bx - 4 + ex, eyeY, 2, 3, '#ffffff');
        px(ctx, bx + 2 + ex, eyeY, 2, 3, '#ffffff');
        px(ctx, bx - 3 + ex, eyeY + 1, 1, 2, '#2b2136');
        px(ctx, bx + 3 + ex, eyeY + 1, 1, 2, '#2b2136');
      }
      px(ctx, bx - 5 + ex, eyeY + 4, 2, 1, '#e8927f');   // joues
      px(ctx, bx + 3 + ex, eyeY + 4, 2, 1, '#e8927f');
      px(ctx, bx - 1 + ex, eyeY + 5, 2, 1, '#a8654a');   // bouche
    }

    // --- poussiere quand il marche
    if (this.moving && f % 2 === 1) {
      px(ctx, bx - fl * 7, by - 1, 2, 1, '#d9cfa8');
      px(ctx, bx - fl * 9, by - 2, 1, 1, '#d9cfa8');
    }
  }
}
