// =====================================================================
//  RENDU PIXEL ART
//  ---------------------------------------------------------------
//  On dessine tout dans un tampon basse resolution, puis on l'agrandit
//  d'un facteur entier sans lissage : c'est ce qui donne des pixels
//  carres et nets, comme dans un jeu de l'epoque 16 bits.
// =====================================================================
import { toScreen, Camera } from '../core/iso.js';
import { drawGround, drawBuilding, drawProp, castBuildingShadow } from '../world/architecture.js';
import { setTime, setLight, LIGHT, px, alpha } from '../core/art.js';

export class Renderer {
  constructor(canvas, city) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = city;
    this.cam = new Camera();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // tampon basse resolution
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(), a: Math.random(),
    }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    // facteur d'agrandissement entier : 3 sur telephone, 4 sur grand ecran
    const k = Math.max(2, Math.min(3, Math.round(Math.min(w, h) / 300)));
    this.k = k;
    this.buf.width = Math.ceil(w / k);
    this.buf.height = Math.ceil(h / k);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.cam.w = this.buf.width;
    this.cam.h = this.buf.height;
    this.cam.k = k;
    // le monde est deja dessine a l'echelle du tampon : pas de zoom
    this.cam.zoom = 1;
    this.bctx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
  }

  frame(game, player, t, life) {
    const ctx = this.bctx;
    const W = this.buf.width, H = this.buf.height;
    setTime(t);
    setLight(game.hour);

    // ---- ciel
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = LIGHT.amb > 0.5 ? '#1b2b4a' : '#0e1730';
    ctx.fillRect(0, 0, W, H);
    if (LIGHT.amb < 0.6) {
      for (const s of this.stars) {
        if (Math.sin(t * 1.2 + s.a * 9) < -0.2) continue;
        px(ctx, s.x * W, s.y * H * 0.7, 1, 1, '#cfd8ff');
      }
    }

    // ---- camera
    this.cam.x += (player.x - this.cam.x) * 0.14;
    this.cam.y += (player.y - this.cam.y) * 0.14;
    this.cam.apply(ctx, 1);

    drawGround(ctx, this.city, this.cam);
    for (const b of this.city.buildings) castBuildingShadow(ctx, b, game.unlocked(b));

    // ---- tri en profondeur
    const ents = [];
    for (const b of this.city.buildings)
      ents.push({ k: b.x + b.w / 2 + b.y + b.d / 2, draw: () => drawBuilding(ctx, b, { t, night: game.isNight, unlocked: game.unlocked(b) }) });
    for (const p of this.city.props)
      ents.push({ k: p.x + p.y, draw: () => drawProp(ctx, p, { t, night: game.isNight }) });
    if (life) for (const e of life.entities(ctx)) ents.push(e);
    ents.push({ k: player.x + player.y, draw: () => player.draw(ctx, t, this.city) });
    ents.sort((a, b) => a.k - b.k);
    for (const e of ents) e.draw();

    if (life) life.drawAbove(ctx, this.city, game.isNight);

    // ---- marqueur de porte
    let best = null, bd = 3.2;
    for (const b of this.city.buildings) {
      const d = Math.hypot(player.x - (b.door.x + .5), player.y - (b.door.y + .5));
      if (d < bd) { bd = d; best = b; }
    }
    if (best) this.marker(ctx, best, t, game.unlocked(best), bd < 1.4);

    // ---- teinte du moment, en aplat
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (LIGHT.tintA > 0.02) {
      ctx.save();
      ctx.globalAlpha = LIGHT.tintA;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = LIGHT.tint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ---- agrandissement au pixel pres
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.drawImage(this.buf, 0, 0, W * this.k * this.dpr, H * this.k * this.dpr);
  }

  // petite bulle facon jeu 16 bits au-dessus de la porte
  marker(ctx, b, t, unlocked, near) {
    const p = toScreen(b.door.x + .5, b.door.y + .5, 0);
    const label = (unlocked ? '' : '! ') + b.name;
    ctx.font = '8px "Pixelify Sans", monospace';
    const w = Math.ceil(ctx.measureText(label).width) + 8;
    const bob = Math.round(Math.sin(t * 3) * 2);
    const x = Math.round(p.x - w / 2), y = Math.round(p.y) - 30 + bob;
    const bg = near ? '#f6f0dc' : '#2b2136';
    const fg = near ? '#2b2136' : '#f6f0dc';
    px(ctx, x, y, w, 12, '#151022');
    px(ctx, x + 1, y + 1, w - 2, 10, bg);
    px(ctx, x + w / 2 - 2, y + 12, 4, 2, '#151022');
    px(ctx, x + w / 2 - 1, y + 14, 2, 1, '#151022');
    ctx.fillStyle = fg;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, Math.round(x + w / 2), y + 6);
  }
}
