// =====================================================================
//  DECOR PIXEL : sol de clairiere, cabanes, accessoires
// =====================================================================
import { toScreen } from '../core/iso.js';
import {
  box, slab, poly, gableRoof, face, signboard, windowRow, doorway, shadow, castBox,
  tree, bush, rock, flower, grassTuft, crate, px, shade, mix, alpha, line2,
  lantern, smoke, time as artTime, LIGHT, FW, FH, isoTileSprite, pxEllipse, pxText, textWidth,
} from '../core/art.js';
import { VOID, GRASS, PATH, LUSH, CLEARING, FOREST } from './city.js';

const P = (x, y, z) => toScreen(x, y, z);
const R = Math.round;
const FSIDE = b => b.face === 'right' ? 'right' : 'left';
const span = b => FSIDE(b) === 'right' ? b.d : b.w;
function fp(b, u, z) {
  return FSIDE(b) === 'right' ? [b.x + b.w, b.y + b.d - u, z] : [b.x + u, b.y + b.d, z];
}

// ------------------------------------------------------------ bruit
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

// ------------------------------------------------------------ palettes
const GREEN = ['#4e8f35', '#5a9e3e', '#6aad48'];
const GREEN_LUSH = ['#3f7a2c', '#4a8a33', '#57993c'];
const DIRT = ['#a3814f', '#b08b57', '#997747'];
const CLEAR_COL = ['#b9a06a', '#c2aa74', '#ae9762'];
const FOREST_FLOOR = ['#2f6124', '#356b29', '#2a5820'];

function tilePalette(t) {
  switch (t) {
    case PATH: return DIRT;
    case LUSH: return GREEN_LUSH;
    case CLEARING: return CLEAR_COL;
    case FOREST: return FOREST_FLOOR;
    default: return GREEN;
  }
}

export function drawGround(ctx, city, cam) {
  let x0 = 0, y0 = 0, x1 = city.w, y1 = city.h;
  if (cam) {
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for (const [sx, sy] of [[0, 0], [cam.w * cam.k, 0], [0, cam.h * cam.k], [cam.w * cam.k, cam.h * cam.k]]) {
      const w = cam.unproject(sx, sy);
      mnx = Math.min(mnx, w.x); mxx = Math.max(mxx, w.x);
      mny = Math.min(mny, w.y); mxy = Math.max(mxy, w.y);
    }
    x0 = Math.max(0, Math.floor(mnx) - 2); x1 = Math.min(city.w, Math.ceil(mxx) + 3);
    y0 = Math.max(0, Math.floor(mny) - 2); y1 = Math.min(city.h, Math.ceil(mxy) + 5);
  }

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const t = city.tile(x, y);
      if (t === VOID) continue;
      const pal = tilePalette(t);
      // taches organiques : un bruit doux decide de la nuance
      const n = vnoise(x / 3.2, y / 3.2, t === PATH ? 3 : 1);
      const shadeIdx = n > 0.62 ? 2 : n < 0.4 ? 0 : 1;
      const A = P(x, y, 0), B = P(x + 1, y, 0), C = P(x + 1, y + 1, 0), D = P(x, y + 1, 0);
      // tuile pre-rendue : bords en escalier, aucun lissage, et c'est rapide
      ctx.drawImage(isoTileSprite(pal[shadeIdx]), Math.round(A.x) - 16, Math.round(A.y));

      // bord de sentier : un lisere plus sombre cote herbe
      if (t === PATH) {
        if (city.tile(x, y - 1) !== PATH) line2(ctx, A, B, shade(pal[0], -0.18), 1);
        if (city.tile(x - 1, y) !== PATH) line2(ctx, A, D, shade(pal[0], -0.18), 1);
      }
      // petits details semes de facon deterministe
      const h1 = hash(x, y, 11);
      if (t === GRASS || t === LUSH) {
        if (h1 > 0.93) flower(ctx, x + 0.3 + h1 * 0.3, y + 0.35 + hash(x, y, 12) * 0.3, 0,
          ['#e8d44a', '#e87a9a', '#f0f0f0'][(h1 * 100 | 0) % 3]);
        else if (h1 > 0.74) grassTuft(ctx, x + 0.25 + hash(x, y, 13) * 0.5, y + 0.3 + hash(x, y, 14) * 0.5, 0, shade(pal[2], 0.08));
      } else if (t === PATH && h1 > 0.9) {
        px(ctx, P(x + 0.5, y + 0.5, 0).x, P(x + 0.5, y + 0.5, 0).y, 2, 1, shade(pal[0], -0.2));
      }
    }
  }
}

export function elevOf() { return 0; }

// --------------------------------------------------------- ombre portee
export function castBuildingShadow(ctx, b, unlocked) {
  castBox(ctx, b.x, b.y, b.w, b.d, unlocked ? (b.tower ? 3.4 : b.hut ? 1.4 : 2) : 0.5, LIGHT.shadowA * 0.9);
}

// ------------------------------------------------------------- cabanes
function hutBody(ctx, b, wallH, roofH) {
  const wall = b.wall || '#c98c4e';
  box(ctx, b.x, b.y, 0, b.w, b.d, wallH, wall, { line: shade(wall, -0.55) });
  // planches verticales sur la facade
  face(ctx, b.x, b.y + b.d, wallH, 'left', c => {
    c.strokeStyle = alpha(shade(wall, -0.4), 0.5); c.lineWidth = 1;
    for (let i = 1; i < b.w * 3; i++) {
      const xx = R(i * (b.w * FW) / (b.w * 3));
      c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, R(wallH * FH)); c.stroke();
    }
  });
  gableRoof(ctx, b.x, b.y, wallH, b.w, b.d, roofH, b.roof || '#4a5b8c', 'x', 0.22);
}

const STYLES = {
  // petite cabane de disquaire
  hut(ctx, b, env) {
    const wallH = 1.05, roofH = 0.6;
    hutBody(ctx, b, wallH, roofH);
    const L = span(b);
    doorway(ctx, ...fp(b, L / 2 - 0.28, 0.82), 'left', 0.56, 0.82, '#6b4426');
    windowRow(ctx, ...fp(b, 0.22, 0.92), 'left', 0.42, 0.34, 1, env.night ? '#ffd76a' : '#9ad9e8');
    // enseigne suspendue sous l'avancee du toit
    signboard(ctx, ...fp(b, 0.12, wallH + roofH * 0.42), 'left', L - 0.24, 0.34, b.sign, '#f0e6d2', '#3a2d4a');
    // un bac de disques dehors
    crate(ctx, b.x + b.w + 0.12, b.y + b.d - 0.55, 0, 0.45, '#b3773c');
    px(ctx, P(b.x + b.w + 0.34, b.y + b.d - 0.33, 0.46).x - 3, P(b.x + b.w + 0.34, b.y + b.d - 0.33, 0.46).y - 2, 6, 2, '#2b2136');
    if (env.night) lantern(ctx, b.x + 0.18, b.y + b.d + 0.05, wallH + 0.1, '#ffc857');
  },

  // maison a un etage
  house(ctx, b, env) {
    const wallH = 1.25, roofH = 0.7;
    hutBody(ctx, b, wallH, roofH);
    const L = span(b);
    doorway(ctx, ...fp(b, L / 2 - 0.32, 0.95), 'left', 0.64, 0.95, '#6b4426');
    windowRow(ctx, ...fp(b, 0.28, 1.06), 'left', L - 1.5, 0.44, Math.max(1, R(L - 1.5)), env.night ? '#ffd76a' : '#9ad9e8');
    signboard(ctx, ...fp(b, 0.14, wallH + roofH * 0.5), 'left', L - 0.28, 0.36, b.sign, '#f0e6d2', '#3a2d4a');
    if (b.chimney) {
      box(ctx, b.x + b.w - 0.75, b.y + 0.35, wallH + roofH * 0.55, 0.32, 0.32, 0.45, '#9a6a4a');
      smoke(ctx, b.x + b.w - 0.6, b.y + 0.5, wallH + roofH * 0.55 + 0.5, b.x);
    }
    if (b.antenna) {
      box(ctx, b.x + 0.45, b.y + 0.45, wallH + roofH, 0.08, 0.08, 0.9, '#e8e0cf');
      const p = P(b.x + 0.5, b.y + 0.5, wallH + roofH + 0.95);
      px(ctx, p.x - 1, p.y - 1, 2, 2, Math.sin(artTime() * 4) > 0 ? '#ff3ea5' : '#8a2a5e');
    }
  },

  // le club : bloc sombre, neon rose
  club(ctx, b, env) {
    const wallH = 1.35;
    box(ctx, b.x, b.y, 0, b.w, b.d, wallH, b.wall, { line: '#221c33' });
    box(ctx, b.x - 0.08, b.y - 0.08, wallH, b.w + 0.16, b.d + 0.16, 0.16, shade(b.roof, -0.1), { line: '#1a1526' });
    const L = span(b);
    doorway(ctx, ...fp(b, L / 2 - 0.34, 1.0), 'left', 0.68, 1.0, '#1a1526');
    // enseigne au neon qui clignote
    const on = Math.sin(artTime() * 3.4) > -0.75;
    face(ctx, ...fp(b, 0.2, wallH + 0.4), 'left', c => {
      const w = R((L - 0.4) * FW), h = R(0.36 * FH);
      px(c, 0, 0, w, h, '#241b33');
      c.strokeStyle = on ? '#ff5cb4' : '#5c2a48'; c.lineWidth = 1;
      c.strokeRect(0.5, 0.5, w - 1, h - 1);
      c.fillStyle = on ? '#ffa8d8' : '#6b3a58';
      c.font = `${Math.max(6, R(h * 0.62))}px "Pixelify Sans", monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(b.sign, R(w / 2), R(h / 2));
    });
    // enceintes
    box(ctx, b.x + 0.15, b.y + b.d + 0.1, 0, 0.4, 0.4, 0.8, '#2b2340', { line: '#191327' });
    box(ctx, b.x + b.w - 0.55, b.y + b.d + 0.1, 0, 0.4, 0.4, 0.8, '#2b2340', { line: '#191327' });
  },

  // entrepot de pressage
  big(ctx, b, env) {
    const wallH = 1.5;
    box(ctx, b.x, b.y, 0, b.w, b.d, wallH, b.wall, { line: shade(b.wall, -0.55) });
    gableRoof(ctx, b.x, b.y, wallH, b.w, b.d, 0.45, b.roof, 'x', 0.25);
    const L = span(b);
    face(ctx, ...fp(b, L / 2 - 0.7, 1.1), 'left', c => {
      const w = R(1.4 * FW), h = R(1.1 * FH);
      px(c, 0, 0, w, h, '#cfd8e4');
      c.strokeStyle = '#8f9aa8'; c.lineWidth = 1;
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(1, R(h * i / 5)); c.lineTo(w - 1, R(h * i / 5)); c.stroke(); }
    });
    signboard(ctx, ...fp(b, 0.16, wallH + 0.5), 'left', L - 0.32, 0.36, b.sign, '#f0e6d2', '#3a2d4a');
    crate(ctx, b.x + b.w + 0.15, b.y + b.d - 0.6, 0, 0.5, '#b3773c');
    crate(ctx, b.x + b.w + 0.15, b.y + b.d - 0.6, 0.4, 0.42, '#c9924e');
  },

  // la tour du major
  tower(ctx, b, env) {
    let z = 0;
    for (let i = 0; i < 5; i++) {
      const ins = i * 0.14;
      box(ctx, b.x + ins, b.y + ins, z, b.w - ins * 2, b.d - ins * 2, 0.72,
        i % 2 ? '#c8d2dc' : b.wall, { line: '#6b7480' });
      windowRow(ctx, b.x + ins + 0.25, b.y + b.d - ins, z + 0.6, 'left',
        b.w - ins * 2 - 0.5, 0.34, Math.max(2, R(b.w - 1)), env.night ? '#ffd76a' : '#8fd6e8');
      z += 0.78;
    }
    box(ctx, b.x + 1.1, b.y + 1.1, z, b.w - 2.2, b.d - 2.2, 0.5, b.roof, { line: '#7a6329' });
    gableRoof(ctx, b.x + 1.1, b.y + 1.1, z + 0.5, b.w - 2.2, b.d - 2.2, 0.5, '#8f5fc9', 'x', 0.2);
    doorway(ctx, b.x + b.w / 2 - 0.4, b.y + b.d, 0.9, 'left', 0.8, 0.9, '#6b5420');
    signboard(ctx, b.x + 0.3, b.y + b.d, 1.35, 'left', b.w - 0.6, 0.4, b.sign, '#e8c86a', '#3a2d0a');
  },
};

// chantier : un bâtiment pas encore débloqué
function construction(ctx, b) {
  slab(ctx, b.x, b.y, 0.02, b.w, b.d, '#8a6b45');
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    box(ctx, b.x + 0.1 + t * (b.w - 0.3), b.y + b.d - 0.14, 0, 0.1, 0.1, 0.75, '#e8c86a', { line: '#8a6b2a' });
  }
  box(ctx, b.x + 0.3, b.y + 0.3, 0, b.w - 0.6, b.d - 0.6, 0.45, '#9a7b55', { line: '#6b5238' });
  crate(ctx, b.x + b.w - 0.8, b.y + b.d - 0.8, 0, 0.45, '#b3773c');
  signboard(ctx, b.x + 0.15, b.y + b.d, 1.1, 'left', Math.max(1, b.w - 0.3), 0.34, 'BIENTOT', '#2b2136', '#e8c86a');
}

export function drawBuilding(ctx, b, env) {
  if (!env.unlocked) { construction(ctx, b); return; }
  const style = b.hut ? 'hut' : b.club ? 'club' : b.big ? 'big' : b.tower ? 'tower' : 'house';
  STYLES[style](ctx, b, env);
}

// ------------------------------------------------------------- decors
export function drawProp(ctx, pr, env) {
  const { x, y } = pr, s = pr.s || 1;
  switch (pr.type) {
    case 'tree': tree(ctx, x, y, 0, s, x * 3 + y); break;
    case 'bush': bush(ctx, x, y, 0, s, x * 5 + y); break;
    case 'rock': rock(ctx, x, y, 0, s, x + y * 3); break;

    case 'totem': {   // un 33 tours plante sur un socle de pierre
      shadow(ctx, x, y, 0.75, 0, 0.36);
      box(ctx, x - 0.6, y - 0.6, 0, 1.2, 1.2, 0.28, '#a89a86', { line: '#6b6255' });
      box(ctx, x - 0.38, y - 0.38, 0.28, 0.76, 0.76, 0.34, '#bdb09c', { line: '#7a7063' });
      const p = P(x, y, 0.62);
      const bx = R(p.x), by = R(p.y);
      ctx.fillStyle = '#241b33';
      ctx.beginPath(); ctx.ellipse(bx, by - 13, 11, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3d3350'; ctx.lineWidth = 1;
      for (let r = 4; r < 11; r += 3) { ctx.beginPath(); ctx.ellipse(bx, by - 13, r, r, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#ff5cb4';
      ctx.beginPath(); ctx.ellipse(bx, by - 13, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
      px(ctx, bx - 1, by - 15, 1, 1, '#ffa8d8');
      break;
    }
    case 'lamp': {
      shadow(ctx, x, y, 0.22, 0, 0.28);
      box(ctx, x - 0.06, y - 0.06, 0, 0.12, 0.12, 1.7, '#6b5a48', { line: '#3f342a' });
      const p = P(x, y, 1.7);
      const on = env.night;
      px(ctx, p.x - 3, p.y - 6, 6, 5, on ? '#ffd76a' : '#c9c2b0');
      px(ctx, p.x - 2, p.y - 5, 4, 3, on ? '#fff0b8' : '#e8e2d2');
      px(ctx, p.x - 4, p.y - 8, 8, 2, '#4a3f33');
      break;
    }
    case 'bench': {
      shadow(ctx, x, y, 0.4, 0, 0.24);
      box(ctx, x - 0.42, y - 0.16, 0, 0.84, 0.32, 0.2, '#a3703f', { line: '#6b4426' });
      box(ctx, x - 0.42, y + 0.08, 0.2, 0.84, 0.08, 0.3, '#b37c47', { line: '#6b4426' });
      break;
    }
    case 'crates':
      crate(ctx, x - 0.3, y - 0.3, 0, 0.48, '#b3773c');
      crate(ctx, x + 0.16, y - 0.22, 0, 0.42, '#c9924e');
      crate(ctx, x - 0.26, y - 0.26, 0.42, 0.4, '#a36a35');
      break;
    case 'truck': {
      shadow(ctx, x + 0.7, y + 0.45, 0.9, 0, 0.3);
      const c = '#3fa88f';
      box(ctx, x, y, 0.16, 1.5, 0.85, 0.4, '#e8e0cf', { line: '#8a8474' });
      box(ctx, x, y, 0.56, 1.5, 0.85, 0.52, c, { line: shade(c, -0.5) });
      face(ctx, x + 0.12, y + 0.85, 1.02, 'left', k => {
        px(k, 0, 0, R(0.5 * FW), R(0.28 * FH), '#9ad9e8');
        px(k, R(0.62 * FW), 0, R(0.42 * FW), R(0.28 * FH), '#9ad9e8');
      });
      for (const wx of [x + 0.3, x + 1.25]) {
        const p = P(wx, y + 0.85, 0.16);
        px(ctx, p.x - 2, p.y - 3, 4, 5, '#241b33');
      }
      crate(ctx, x + 0.3, y + 0.2, 1.08, 0.4, '#b3773c');
      break;
    }
  }
}
