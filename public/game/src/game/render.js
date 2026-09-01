// =====================================================================
//  RENDU — fond, sol, tri en profondeur, étiquettes
// =====================================================================
import { toScreen, Camera } from '../core/iso.js';
import { drawGround, drawBuilding, drawProp, castBuildingShadow } from '../world/architecture.js';
import { INK, rrect, setTime, alpha, noisePattern, castBlob } from '../core/art.js';

export class Renderer {
  constructor(canvas, city) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = city;
    this.cam = new Camera();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.stars = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, a: Math.random()
    }));
    this.clouds = Array.from({ length: 7 }, () => {
      const n = 3 + (Math.random() * 3 | 0);
      return {
        x: Math.random(), y: Math.random() * 0.5, sp: 0.004 + Math.random() * 0.008,
        a: 0.5 + Math.random() * 0.5,
        blobs: Array.from({ length: n }, (_, i) => [i * 26 - n * 10, (Math.random() - .5) * 12, 16 + Math.random() * 18]),
      };
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.cam.w = w; this.cam.h = h;
    // zoom : on veut voir ~9 tuiles de large sur mobile
    const target = Math.min(w, h) < 520 ? 10 : 13;
    this.cam.zoom = Math.max(0.55, Math.min(1.9, w / (target * 64)));
  }

  background(t, game) {
    const { ctx } = this, w = this.canvas.width, h = this.canvas.height;
    const hour = game ? game.hour : 12;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // couleur du ciel selon l'heure
    const k = dayCurve(hour);                       // 0 = nuit, 1 = plein jour
    const top = mixHex('#0c1740', '#4b86cf', k);
    const mid = mixHex('#0a1234', '#6ba3dd', k);
    const bot = mixHex('#060b20', '#2f5f9e', k);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // halo derrière l'îlot
    const glow = ctx.createRadialGradient(w * .5, h * .52, 10, w * .5, h * .52, Math.max(w, h) * .55);
    glow.addColorStop(0, `rgba(${k > .5 ? '120,190,255' : '110,90,220'},${0.10 + k * 0.12})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

    // étoiles (nuit)
    if (k < 0.75) {
      ctx.save();
      for (const s of this.stars) {
        const tw = .35 + .65 * Math.abs(Math.sin(t * 1.4 + s.a * 9));
        ctx.globalAlpha = (0.75 - k) * 1.3 * tw;
        ctx.fillStyle = '#efe2ff';
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r * this.dpr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // nuages qui dérivent
    ctx.save();
    for (const c of this.clouds) {
      const x = ((c.x + t * c.sp) % 1.4 - 0.2) * w;
      const y = c.y * h;
      const col = k > .5 ? '210,232,255' : '130,140,225';
      ctx.globalAlpha = (0.10 + k * 0.14) * c.a;
      for (const b of c.blobs) {
        const bx = x + b[0] * this.dpr, by = y + b[1] * this.dpr, r = b[2] * this.dpr;
        const g2 = ctx.createRadialGradient(bx, by, r * 0.1, bx, by, r);
        g2.addColorStop(0, `rgba(${col},.85)`); g2.addColorStop(0.55, `rgba(${col},.45)`);
        g2.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(bx, by, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  frame(game, player, t, life) {
    const { ctx } = this;
    const night = game.isNight;
    setTime(t);
    this.background(t, game);

    // caméra suit le joueur
    this.cam.x += (player.x - this.cam.x) * 0.12;
    this.cam.y += (player.y - this.cam.y) * 0.12;
    this.cam.apply(ctx, this.dpr);

    drawGround(ctx, this.city, this.cam);

    // passe d'ombres portées : tout le monde projette au sol avant d'être dessiné
    for (const b of this.city.buildings) castBuildingShadow(ctx, b, game.unlocked(b));
    for (const p of this.city.props) {
      const H = { tree: 2.4, lamp: 2.2, statue: 1.9, plant: 0.9, crates: 0.7,
                  bench: 0.5, truck: 1.4, arch: 2.2, ruin: 1.3 }[p.type] || 0.8;
      castBlob(ctx, p.x, p.y, 0.34, H, 0.2, p.z || 0);
    }
    castBlob(ctx, player.x, player.y, 0.3, 1.4, 0.22, this.city.elev(player.x, player.y));
    if (life) for (const w of life.walkers) castBlob(ctx, w.x, w.y, 0.24, 1.1, 0.16, this.city.elev(w.x, w.y));

    // entités triées par profondeur
    const ents = [];
    for (const b of this.city.buildings)
      ents.push({ k: b.x + b.w / 2 + b.y + b.d / 2, draw: () => drawBuilding(ctx, b, { t, night, unlocked: game.unlocked(b) }) });
    for (const p of this.city.props)
      ents.push({ k: p.x + p.y, draw: () => drawProp(ctx, p, { t, night }) });
    ents.push({ k: player.x + player.y, draw: () => player.draw(ctx, t, this.city) });
    if (life) life.entities(ents, ctx);
    ents.sort((a, b) => a.k - b.k);
    for (const e of ents) e.draw();

    if (life) { life.drawNotes(ctx, this.city, night); life.drawSky(ctx); }

    // balise dorée sur l'objectif courant
    const target = game.quest && game.quest.step && game.quest.step.target;
    if (target) {
      const tb = this.city.buildings.find(b => b.id === target);
      if (tb) {
        const d = Math.hypot(player.x - (tb.door.x + .5), player.y - (tb.door.y + .5));
        if (d > 1.6) this.beacon(tb, t);
      }
    }

    // marqueur de porte : seulement le bâtiment le plus proche
    let best = null, bd = 3.2;
    for (const b of this.city.buildings) {
      const d = Math.hypot(player.x - (b.door.x + .5), player.y - (b.door.y + .5));
      if (d < bd) { bd = d; best = b; }
    }
    if (best) this.marker(best, Math.min(1, (3.2 - bd) / 1.2), t, game.unlocked(best), bd < 1.4);
    if (night) this.nightVeil();
    this.haze(game);
    this.grain();
  }

  beacon(b, t) {
    const { ctx } = this;
    const p = toScreen(b.door.x + .5, b.door.y + .5, 0);
    const bounce = Math.abs(Math.sin(t * 2.4)) * 10;
    ctx.save();
    ctx.translate(p.x, p.y - 74 - bounce);
    // halo
    const g = ctx.createRadialGradient(0, 30 + bounce, 2, 0, 30 + bounce, 46);
    g.addColorStop(0, 'rgba(255,200,87,.34)'); g.addColorStop(1, 'rgba(255,200,87,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 30 + bounce, 46, 23, 0, 0, Math.PI * 2); ctx.fill();
    // flèche
    ctx.beginPath();
    ctx.moveTo(0, 20); ctx.lineTo(-11, 2); ctx.lineTo(-5, 2); ctx.lineTo(-5, -12);
    ctx.lineTo(5, -12); ctx.lineTo(5, 2); ctx.lineTo(11, 2); ctx.closePath();
    const gg = ctx.createLinearGradient(0, -12, 0, 20);
    gg.addColorStop(0, '#ffe6a8'); gg.addColorStop(1, '#f0a81f');
    ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,0,.5)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }

  marker(b, alpha, t, unlocked, near) {
    const { ctx } = this;
    const p = toScreen(b.door.x + .5, b.door.y + .5, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y - 46 - Math.sin(t * 3) * 4);
    const label = unlocked ? b.name : '🔒 ' + b.name;
    ctx.font = '800 14px "Baloo 2", sans-serif';
    const w = ctx.measureText(label).width + 22;
    rrect(ctx, -w / 2, -15, w, 27, 13, near ? '#4fbf9f' : 'rgba(32,13,51,.88)', INK, 2.4);
    ctx.fillStyle = near ? '#08251c' : '#dff2e9';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.beginPath();
    ctx.moveTo(-6, 11); ctx.lineTo(6, 11); ctx.lineTo(0, 19); ctx.closePath();
    ctx.fillStyle = near ? '#4fbf9f' : 'rgba(32,13,51,.88)'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }

  // brume atmosphérique : le lointain se fond dans le ciel
  haze(game) {
    const { ctx } = this, w = this.canvas.width, h = this.canvas.height;
    const k = dayCurve(game ? game.hour : 12);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    const c = k > .5 ? '175,205,240' : '60,70,140';
    g.addColorStop(0, `rgba(${c},${0.16 + (1 - k) * 0.14})`);
    g.addColorStop(0.5, `rgba(${c},0.05)`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.62);
    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(6,10,30,.26)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }

  grain() {
    const { ctx } = this, w = this.canvas.width, h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pat = noisePattern(ctx);
    if (!pat) return;
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  nightVeil() {
    const { ctx } = this, w = this.canvas.width, h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(10,20,60,.26)';
    ctx.fillRect(0, 0, w, h);
  }
}

// 0 la nuit, 1 en plein jour, avec des transitions douces à l'aube et au crépuscule
function dayCurve(h) {
  if (h >= 9 && h <= 17) return 1;
  if (h > 17 && h < 21) return 1 - (h - 17) / 4;
  if (h >= 21 || h < 5) return 0;
  return (h - 5) / 4;
}
function mixHex(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = i => Math.round(pa[i] + (pb[i] - pa[i]) * t).toString(16).padStart(2, '0');
  return '#' + c(0) + c(1) + c(2);
}
