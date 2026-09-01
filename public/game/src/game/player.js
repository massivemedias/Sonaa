// =====================================================================
//  LE PERSONNAGE
// =====================================================================
import { toScreen } from '../core/iso.js';
import { INK, shadow, rrect, poly, shade, alpha, roundPoly } from '../core/art.js';

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
    this.vx = dx; this.vy = dy;
  }

  free(city, x, y, r) {
    return city.isWalkable(x - r, y - r) && city.isWalkable(x + r, y - r) &&
           city.isWalkable(x - r, y + r) && city.isWalkable(x + r, y + r);
  }

  draw(ctx, t, city) {
    const z = city ? city.elev(this.x, this.y) : 0;
    const p = toScreen(this.x, this.y, z);
    shadow(ctx, this.x, this.y, 0.36, z, this.moving ? 0.24 : 0.3);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(this.flip, 1);

    const walk = this.moving ? Math.sin(this.anim) : 0;
    const bob = this.moving ? Math.abs(Math.sin(this.anim)) * 2.4 : Math.sin(t * 2.1) * 1.2;
    const squash = this.moving ? 1 + Math.sin(this.anim * 2) * 0.03 : 1;
    const sk = this.skin, sh = this.shirt, pa = this.pants;
    ctx.scale(1 / squash, squash);

    // ------------------------------------------------ jambes courtes
    for (const side of [-1, 1]) {
      const sw = walk * 3.4 * side;
      const lift = Math.max(0, walk * side) * 2.2;
      ctx.save();
      ctx.translate(side * 3.8 + sw * 0.3, -5 - lift);
      roundPoly(ctx, [{ x: -3.4, y: -3 }, { x: 3.4, y: -3 }, { x: 3.1, y: 5 }, { x: -3.1, y: 5 }], 3,
        grd(ctx, -4, -3, 4, 5, shade(pa, 0.2), shade(pa, -0.24)));
      // chaussure ronde
      roundPoly(ctx, [{ x: -4.2, y: 2.6 }, { x: 4.6, y: 2.6 }, { x: 4.6, y: 7.4 }, { x: -4.2, y: 7.4 }], 3.4,
        grd(ctx, -4, 2, 5, 8, '#ffffff', '#c8d4d0'));
      ctx.restore();
    }

    // ------------------------------------------------ corps trapu
    const by = -19 - bob;
    roundPoly(ctx, [
      { x: -8.4, y: by }, { x: 8.4, y: by },
      { x: 9.2, y: by + 15 }, { x: -9.2, y: by + 15 },
    ], 7.6, grd(ctx, -9, by, 9, by + 15, shade(sh, 0.3), shade(sh, -0.24)));
    // bandoulière
    ctx.strokeStyle = alpha('#b3624f', 0.95); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(5, by + 1); ctx.lineTo(-6.5, by + 12); ctx.stroke();
    // sacoche
    ctx.save();
    ctx.translate(-11.5 + walk * 0.7, by + 9);
    roundPoly(ctx, [{ x: -4.6, y: -4.6 }, { x: 4.6, y: -4.6 }, { x: 5, y: 5 }, { x: -5, y: 5 }], 3.4,
      grd(ctx, -5, -5, 5, 5, shade('#e08a72', 0.25), shade('#e08a72', -0.3)));
    ctx.fillStyle = alpha('#2a1140', 0.4); ctx.fillRect(-3.6, -3, 7.2, 1.6);
    ctx.restore();

    // ------------------------------------------------ bras stubby
    for (const side of [-1, 1]) {
      const sw = -walk * 2.8 * side;
      ctx.save();
      ctx.translate(side * 9.6, by + 4 + sw * 0.5);
      ctx.rotate(sw * 0.06 * side);
      roundPoly(ctx, [{ x: -2.7, y: -2.6 }, { x: 2.7, y: -2.6 }, { x: 2.5, y: 6 }, { x: -2.5, y: 6 }], 2.6,
        grd(ctx, -3, -2, 3, 6, shade(sh, side > 0 ? 0.14 : -0.04), shade(sh, -0.32)));
      ctx.beginPath(); ctx.arc(0, 7, 3.1, 0, Math.PI * 2);
      ctx.fillStyle = grd(ctx, -3, 4, 3, 10, shade(sk, 0.18), shade(sk, -0.18)); ctx.fill();
      ctx.restore();
    }

    // ------------------------------------------------ grosse tête
    const hy = -42 - bob;
    // ombre du cou
    ctx.save(); ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.ellipse(0, hy + 21, 7.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#180a2c'; ctx.fill(); ctx.restore();

    roundPoly(ctx, [
      { x: -11, y: hy }, { x: 11, y: hy },
      { x: 11, y: hy + 21 }, { x: -11, y: hy + 21 },
    ], 10, grd(ctx, -11, hy, 9, hy + 21, shade(sk, 0.22), shade(sk, -0.16)));
    // oreilles
    ctx.fillStyle = shade(sk, -0.1);
    ctx.beginPath(); ctx.arc(-11, hy + 12, 2.6, 0, Math.PI * 2);
    ctx.arc(11, hy + 12, 2.6, 0, Math.PI * 2); ctx.fill();

    // frange
    ctx.beginPath();
    ctx.moveTo(-11.2, hy + 11);
    ctx.quadraticCurveTo(-12.6, hy - 5, 0, hy - 5);
    ctx.quadraticCurveTo(12.6, hy - 5, 11.2, hy + 11);
    ctx.lineTo(11.2, hy + 6);
    ctx.quadraticCurveTo(5, hy + 10.5, 0.5, hy + 7.5);
    ctx.quadraticCurveTo(-5, hy + 4.5, -11.2, hy + 8.5);
    ctx.closePath();
    ctx.fillStyle = grd(ctx, -11, hy - 5, 11, hy + 11, shade(this.hair, 0.3), shade(this.hair, -0.28));
    ctx.fill();

    if (!this.back) {
      // grands yeux
      for (const ex of [-4.2, 4.2]) {
        ctx.beginPath(); ctx.ellipse(ex, hy + 13, 2.5, 2.9, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#2a1533'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 0.9, hy + 12, 1.05, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
      }
      // joues
      ctx.fillStyle = 'rgba(255,120,150,.3)';
      ctx.beginPath(); ctx.ellipse(7.4, hy + 16, 2.6, 1.7, 0, 0, Math.PI * 2);
      ctx.ellipse(-7.4, hy + 16, 2.6, 1.7, 0, 0, Math.PI * 2); ctx.fill();
      // sourire
      ctx.strokeStyle = '#2a1533'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, hy + 15.6, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }

    // ------------------------------------------------ casque
    ctx.strokeStyle = '#2b1440'; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, hy + 10, 13.4, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, hy + 9, 13.4, Math.PI * 1.12, Math.PI * 1.55); ctx.stroke();
    for (const side of [-1, 1]) {
      const cx = side * 12.6;
      roundPoly(ctx, [
        { x: cx - 3.8, y: hy + 7 }, { x: cx + 3.8, y: hy + 7 },
        { x: cx + 3.8, y: hy + 17 }, { x: cx - 3.8, y: hy + 17 },
      ], 3.6, grd(ctx, cx - 4, hy + 7, cx + 4, hy + 17, shade('#ff3ea5', 0.34), shade('#ff3ea5', -0.26)));
    }
    ctx.restore();

    // poussière
    if (this.moving) {
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 2.4 + i / 3) % 1);
        ctx.save();
        ctx.globalAlpha = 0.2 * (1 - ph);
        ctx.fillStyle = '#fff6e2';
        ctx.beginPath();
        ctx.ellipse(p.x - this.flip * (7 + ph * 15), p.y - ph * 4, 3 + ph * 5, (3 + ph * 5) * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

function grd(ctx, x0, y0, x1, y1, c0, c1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}
