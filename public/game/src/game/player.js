// =====================================================================
//  LE PERSONNAGE
// =====================================================================
import { toScreen } from '../core/iso.js';
import { INK, shadow, contact, rrect, poly, shade, alpha, roundPoly, mix, lit, dim, LIGHT } from '../core/art.js';

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
    const z = city ? city.elev(this.x, this.y) : 0;
    const p = toScreen(this.x, this.y, z);
    contact(ctx, this.x, this.y, 0.42, z, 0.26 + 0.1 * LIGHT.amb);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(this.flip, 1);

    const walk = this.moving ? Math.sin(this.anim) : 0;
    const walk2 = this.moving ? Math.sin(this.anim * 2) : 0;
    const breath = Math.sin(t * 2.1) * 0.9;
    const bob = this.moving ? Math.abs(Math.sin(this.anim)) * 2.4 : breath;
    const squash = this.moving ? 1 + walk2 * 0.03 : 1 + breath * 0.006;
    const sk = this.skin, jk = this.jacket, pa = this.pants;
    // la lumière du moment déteint sur le personnage comme sur le décor
    const L = c => lit(c, 0.7), D = c => dim(c, 0.9);
    ctx.scale(1 / squash, squash);

    // ============================================================ jambes
    for (const side of [-1, 1]) {
      const sw = walk * 3.6 * side;
      const lift = Math.max(0, walk * side) * 2.3;
      ctx.save();
      ctx.translate(side * 3.9 + sw * 0.3, -5 - lift);
      // le pantalon, plus clair devant, plus sombre derrière
      const gp = grd(ctx, -4, -4, 4, 6, L(shade(pa, 0.22)), D(shade(pa, -0.26)));
      roundPoly(ctx, [{ x: -3.5, y: -4 }, { x: 3.5, y: -4 }, { x: 3.2, y: 5.4 }, { x: -3.2, y: 5.4 }], 3, gp);
      // pli du tissu
      ctx.strokeStyle = alpha(shade(pa, -0.4), 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-0.6, -2.5); ctx.lineTo(-0.2, 4); ctx.stroke();
      // ourlet
      roundPoly(ctx, [{ x: -3.4, y: 3.4 }, { x: 3.4, y: 3.4 }, { x: 3.3, y: 5.6 }, { x: -3.3, y: 5.6 }], 1.6,
        alpha(shade(pa, -0.3), 0.55));
      // basket : semelle, tige, lacets
      roundPoly(ctx, [{ x: -4.3, y: 2.4 }, { x: 4.7, y: 2.4 }, { x: 4.7, y: 6.2 }, { x: -4.3, y: 6.2 }], 3,
        grd(ctx, -4, 2, 5, 6, L('#ffffff'), '#cfd8d4'));
      roundPoly(ctx, [{ x: -4.5, y: 5.2 }, { x: 5, y: 5.2 }, { x: 5, y: 7.5 }, { x: -4.5, y: 7.5 }], 2.2,
        grd(ctx, -4, 5, 5, 7.5, '#e8eeeb', '#a9b6b2'));
      ctx.strokeStyle = alpha('#8fa0a8', 0.9); ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-1.6, 3.4); ctx.lineTo(1.6, 4.2); ctx.moveTo(-1.6, 4.4); ctx.lineTo(1.6, 5.2); ctx.stroke();
      ctx.restore();
    }

    const by = -19.5 - bob;

    // ====================================================== bras arrière
    armDraw(ctx, -1, by, walk, jk, sk, L, D);

    // ============================================================= torse
    const body = [
      { x: -8.6, y: by }, { x: 8.6, y: by },
      { x: 9.4, y: by + 15.5 }, { x: -9.4, y: by + 15.5 },
    ];
    roundPoly(ctx, body, 7.8, grd(ctx, -9, by, 9, by + 15.5, L(shade(jk, 0.28)), D(shade(jk, -0.22))));
    // ombre interne du côté à l'ombre
    ctx.save();
    roundPoly(ctx, body, 7.8, null);
    ctx.clip();
    const io = ctx.createRadialGradient(-11, by + 4, 2, -11, by + 4, 22);
    io.addColorStop(0, alpha(shade(jk, -0.5), 0.5)); io.addColorStop(1, alpha(shade(jk, -0.5), 0));
    ctx.fillStyle = io; ctx.fillRect(-12, by - 2, 24, 20);
    // texture du tissu : fines hachures diagonales
    ctx.globalAlpha = 0.07; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8;
    for (let i = -10; i < 12; i += 2.4) {
      ctx.beginPath(); ctx.moveTo(i, by); ctx.lineTo(i - 6, by + 16); ctx.stroke();
    }
    ctx.restore();
    // col en V avec le t-shirt qui dépasse
    ctx.beginPath();
    ctx.moveTo(-4.4, by + 0.6); ctx.lineTo(0, by + 6.4); ctx.lineTo(4.4, by + 0.6);
    ctx.closePath();
    ctx.fillStyle = grd(ctx, -4, by, 4, by + 6, L(this.tee), shade(this.tee, -0.18)); ctx.fill();
    // fermeture éclair
    ctx.strokeStyle = alpha(shade(jk, -0.55), 0.75); ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0.4, by + 6); ctx.lineTo(0.9, by + 14.5); ctx.stroke();
    ctx.fillStyle = alpha('#ffe6b0', 0.9);
    ctx.beginPath(); ctx.arc(0.8, by + 12.6, 0.9, 0, Math.PI * 2); ctx.fill();
    // bord côtelé en bas
    roundPoly(ctx, [{ x: -9.2, y: by + 12.6 }, { x: 9.2, y: by + 12.6 },
      { x: 9.4, y: by + 15.6 }, { x: -9.4, y: by + 15.6 }], 3, alpha(shade(jk, -0.34), 0.75));
    ctx.strokeStyle = alpha(shade(jk, -0.5), 0.4); ctx.lineWidth = 0.7;
    for (let i = -8; i < 9; i += 2) { ctx.beginPath(); ctx.moveTo(i, by + 13); ctx.lineTo(i, by + 15.2); ctx.stroke(); }

    // ===================================================== sacoche + sangle
    ctx.strokeStyle = D('#b3624f'); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(5.4, by + 0.6); ctx.lineTo(-6.8, by + 12); ctx.stroke();
    ctx.strokeStyle = alpha('#ffffff', 0.18); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(5.4, by - 0.2); ctx.lineTo(-6.8, by + 11.2); ctx.stroke();
    ctx.save();
    ctx.translate(-12 + walk * 0.7, by + 10);
    const bagG = grd(ctx, -5, -5, 5, 6, L(shade('#e08a72', 0.24)), D(shade('#e08a72', -0.3)));
    roundPoly(ctx, [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5.4, y: 5.6 }, { x: -5.4, y: 5.6 }], 3.4, bagG);
    // un 33 tours qui dépasse
    roundPoly(ctx, [{ x: -3.4, y: -8.6 }, { x: 3.4, y: -8.6 }, { x: 3.4, y: -4 }, { x: -3.4, y: -4 }], 1.2,
      grd(ctx, -3, -9, 3, -4, '#4a3560', '#241033'));
    ctx.fillStyle = '#ff7ec2';
    ctx.beginPath(); ctx.arc(0, -6.2, 0.9, 0, Math.PI * 2); ctx.fill();
    // rabat
    roundPoly(ctx, [{ x: -5.2, y: -5 }, { x: 5.2, y: -5 }, { x: 5, y: -0.6 }, { x: -5, y: -0.6 }], 2.4,
      alpha(shade('#e08a72', -0.3), 0.9));
    ctx.fillStyle = alpha('#ffe6b0', 0.85);
    ctx.beginPath(); ctx.arc(0, -0.8, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ======================================================= bras avant
    armDraw(ctx, 1, by, walk, jk, sk, L, D);

    // ============================================================== tête
    const hy = -42.5 - bob;
    ctx.save(); ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.ellipse(0, hy + 21.5, 7.8, 2.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#180a2c'; ctx.fill(); ctx.restore();

    const headPts = [
      { x: -11, y: hy }, { x: 11, y: hy },
      { x: 10.4, y: hy + 21 }, { x: -10.4, y: hy + 21 },
    ];
    roundPoly(ctx, headPts, 10, grd(ctx, -11, hy, 9, hy + 21, L(shade(sk, 0.24)), D(shade(sk, -0.18))));
    // modelé du visage : pommette éclairée, mâchoire à l'ombre
    ctx.save(); roundPoly(ctx, headPts, 10, null); ctx.clip();
    const fg = ctx.createRadialGradient(-6, hy + 4, 2, -6, hy + 4, 20);
    fg.addColorStop(0, alpha(shade(sk, 0.35), 0.55)); fg.addColorStop(1, alpha(shade(sk, 0.35), 0));
    ctx.fillStyle = fg; ctx.fillRect(-12, hy - 2, 24, 26);
    const jg = ctx.createRadialGradient(9, hy + 20, 2, 9, hy + 20, 16);
    jg.addColorStop(0, alpha(shade(sk, -0.45), 0.4)); jg.addColorStop(1, alpha(shade(sk, -0.45), 0));
    ctx.fillStyle = jg; ctx.fillRect(-12, hy - 2, 24, 26);
    ctx.restore();
    // oreilles
    ctx.fillStyle = D(shade(sk, -0.08));
    ctx.beginPath(); ctx.arc(-10.8, hy + 12, 2.7, 0, Math.PI * 2);
    ctx.arc(10.8, hy + 12, 2.7, 0, Math.PI * 2); ctx.fill();

    // ---- chevelure : masse, mèches, reflet
    const hairG = grd(ctx, -11, hy - 6, 11, hy + 12, L(shade(this.hair, 0.34)), D(shade(this.hair, -0.3)));
    ctx.beginPath();
    ctx.moveTo(-11.4, hy + 11.5);
    ctx.quadraticCurveTo(-13.2, hy - 6, 0, hy - 5.6);
    ctx.quadraticCurveTo(13.2, hy - 6, 11.4, hy + 11.5);
    ctx.lineTo(11.4, hy + 6);
    ctx.quadraticCurveTo(5.6, hy + 11, 0.6, hy + 7.6);
    ctx.quadraticCurveTo(-5.4, hy + 4.2, -11.4, hy + 8.8);
    ctx.closePath();
    ctx.fillStyle = hairG; ctx.fill();
    // mèches
    ctx.strokeStyle = alpha(shade(this.hair, -0.45), 0.55); ctx.lineWidth = 1;
    for (const mx of [-7, -3.4, 1.2, 5.4]) {
      ctx.beginPath();
      ctx.moveTo(mx, hy - 3.6);
      ctx.quadraticCurveTo(mx + 1.6, hy + 2, mx + 0.6 + (mx > 0 ? 2 : -2), hy + 7.5);
      ctx.stroke();
    }
    // reflet façon satin
    ctx.save(); ctx.globalAlpha = 0.3;
    ctx.strokeStyle = mix(shade(this.hair, 0.6), LIGHT.sun, 0.5); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-1.5, hy + 3.5, 8.4, Math.PI * 1.15, Math.PI * 1.62); ctx.stroke();
    ctx.restore();

    // ---- visage
    if (!this.back) {
      const closed = this.blink > 0;
      // sourcils
      ctx.strokeStyle = alpha(shade(this.hair, -0.2), 0.9); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6.4, hy + 9.4); ctx.quadraticCurveTo(-4.2, hy + 8.2, -2, hy + 9.2);
      ctx.moveTo(2, hy + 9.2); ctx.quadraticCurveTo(4.2, hy + 8.2, 6.4, hy + 9.4);
      ctx.stroke();
      for (const ex of [-4.2, 4.2]) {
        if (closed) {
          ctx.strokeStyle = '#2a1533'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(ex, hy + 12.6, 2.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        } else {
          // blanc, iris, pupille, reflet, paupière
          ctx.beginPath(); ctx.ellipse(ex, hy + 13, 2.9, 3.3, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#fbf7ff'; ctx.fill();
          ctx.beginPath(); ctx.ellipse(ex + 0.3, hy + 13.2, 2.1, 2.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = grd(ctx, ex - 2, hy + 11, ex + 2, hy + 16, '#7a5aa8', '#33204f'); ctx.fill();
          ctx.beginPath(); ctx.arc(ex + 0.3, hy + 13.4, 1.15, 0, Math.PI * 2);
          ctx.fillStyle = '#1a0f2a'; ctx.fill();
          ctx.beginPath(); ctx.arc(ex + 1.2, hy + 11.9, 0.95, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
          ctx.beginPath(); ctx.arc(ex - 0.9, hy + 14.4, 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
          ctx.strokeStyle = alpha('#2a1533', 0.55); ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(ex, hy + 13, 3, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        }
      }
      // nez
      ctx.strokeStyle = alpha(shade(sk, -0.4), 0.6); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(0.4, hy + 14.4); ctx.quadraticCurveTo(1.4, hy + 15.8, 0, hy + 16.2); ctx.stroke();
      // joues
      const bl = ctx.createRadialGradient(7, hy + 16.4, 0.5, 7, hy + 16.4, 3.4);
      bl.addColorStop(0, 'rgba(255,120,150,.38)'); bl.addColorStop(1, 'rgba(255,120,150,0)');
      ctx.fillStyle = bl; ctx.fillRect(3, hy + 13, 8, 7);
      const bl2 = ctx.createRadialGradient(-7, hy + 16.4, 0.5, -7, hy + 16.4, 3.4);
      bl2.addColorStop(0, 'rgba(255,120,150,.38)'); bl2.addColorStop(1, 'rgba(255,120,150,0)');
      ctx.fillStyle = bl2; ctx.fillRect(-11, hy + 13, 8, 7);
      // sourire
      ctx.strokeStyle = '#2a1533'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, hy + 16, 2.9, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
    }

    // ---- casque
    // arceau : coque sombre + filet métallique éclairé
    ctx.strokeStyle = '#241137'; ctx.lineWidth = 4.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, hy + 10, 13.6, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();
    ctx.strokeStyle = alpha(mix('#b9a8d6', LIGHT.sun, 0.4), 0.75); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, hy + 9.2, 13.6, Math.PI * 1.1, Math.PI * 1.56); ctx.stroke();
    for (const side of [-1, 1]) {
      const cx = side * 12.8;
      // coussinet
      roundPoly(ctx, [
        { x: cx - 4.2, y: hy + 6.4 }, { x: cx + 4.2, y: hy + 6.4 },
        { x: cx + 4.2, y: hy + 17.4 }, { x: cx - 4.2, y: hy + 17.4 },
      ], 4, grd(ctx, cx - 4, hy + 6, cx + 4, hy + 17, L(shade('#ff3ea5', 0.36)), D(shade('#ff3ea5', -0.28))));
      // liseré intérieur
      roundPoly(ctx, [
        { x: cx - 2.4, y: hy + 8.4 }, { x: cx + 2.4, y: hy + 8.4 },
        { x: cx + 2.4, y: hy + 15.4 }, { x: cx - 2.4, y: hy + 15.4 },
      ], 2.4, alpha('#2a1140', 0.35));
      ctx.strokeStyle = alpha('#ffffff', 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 2.6, hy + 14.6); ctx.lineTo(cx - 2.6, hy + 9.4); ctx.stroke();
    }
    // câble court, qui rentre dans le col
    ctx.strokeStyle = alpha('#2a1140', 0.7); ctx.lineWidth = 1.3;
    const cw = Math.sin(t * 2.4 + this.anim * 0.3) * 1.2;
    ctx.beginPath();
    ctx.moveTo(-12.4, hy + 16.8);
    ctx.quadraticCurveTo(-14.4 + cw, hy + 20, -11.6 + cw, hy + 23.4);
    ctx.stroke();

    // ---- liseré de lumière général, du côté du soleil
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.3 * LIGHT.amb;
    ctx.strokeStyle = mix('#ffffff', LIGHT.sun, 0.7); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, hy + 10.5, 10.9, Math.PI * 1.12, Math.PI * 1.46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8.4, by + 2); ctx.lineTo(-9.2, by + 12); ctx.stroke();
    ctx.restore();

    ctx.restore();

    // ---- poussière sous les pieds
    if (this.moving) {
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 2.4 + i / 3) % 1);
        ctx.save();
        ctx.globalAlpha = 0.2 * (1 - ph);
        ctx.fillStyle = mix('#fff6e2', LIGHT.sun, 0.5);
        ctx.beginPath();
        ctx.ellipse(p.x - this.flip * (7 + ph * 15), p.y - ph * 4, 3 + ph * 5, (3 + ph * 5) * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

// un bras : manche du blouson, poignet côtelé, main
function armDraw(ctx, side, by, walk, jk, sk, L, D) {
  const sw = -walk * 3 * side;
  ctx.save();
  ctx.translate(side * 10.4, by + 4 + sw * 0.5);
  ctx.rotate(sw * 0.055 * side);
  const g = grd(ctx, -3, -3, 3, 7, L(shade(jk, side > 0 ? 0.18 : 0.02)), D(shade(jk, -0.3)));
  roundPoly(ctx, [{ x: -2.9, y: -3 }, { x: 2.9, y: -3 }, { x: 2.6, y: 6.4 }, { x: -2.6, y: 6.4 }], 2.8, g);
  // poignet
  roundPoly(ctx, [{ x: -2.8, y: 4.6 }, { x: 2.8, y: 4.6 }, { x: 2.6, y: 7 }, { x: -2.6, y: 7 }], 1.6,
    alpha(shade(jk, -0.35), 0.8));
  // main
  ctx.beginPath(); ctx.arc(0, 8.4, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = grd(ctx, -3, 5.5, 3, 11.5, L(shade(sk, 0.2)), D(shade(sk, -0.2)));
  ctx.fill();
  ctx.strokeStyle = alpha(shade(sk, -0.35), 0.5); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-1.4, 9.6); ctx.lineTo(1.4, 9.6); ctx.stroke();
  ctx.restore();
}

function grd(ctx, x0, y0, x1, y1, c0, c1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}
