// =====================================================================
//  DECOR PIXEL : sol de clairiere, cabanes, accessoires
// =====================================================================
import { toScreen, HW, HH, HU } from '../core/iso.js';
import {
  box, slab, poly, gableRoof, face, signboard, windowRow, doorway, shadow, castBox,
  tree, bush, rock, flower, grassTuft, crate, px, shade, mix, alpha, line2,
  lantern, smoke, time as artTime, LIGHT, FW, FH, isoTileSprite, pxEllipse, pxText, textWidth,
  billboard, faceRect,
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
const GREEN = ['#5cc23f', '#68cf49', '#74d955'];
const GREEN_LUSH = ['#3fa32b', '#4ab034', '#56bd3e'];
const DIRT = ['#d4b273', '#dfbd7e', '#c9a668'];
const CLEAR_COL = ['#7ec95a', '#8ad465', '#72bd50'];
const FOREST_FLOOR = ['#2b7a1f', '#328526', '#256e1a'];

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
  const plancheCol = alpha(shade(wall, -0.4), 0.5);
  for (let i = 1; i < b.w * 3; i++) {
    const xx = R(i * (b.w * FW) / (b.w * 3));
    faceRect(ctx, b.x, b.y + b.d, wallH, 'left', xx, 0, 1, R(wallH * FH), plancheCol);
  }
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
    // enseigne face camera : c'est la seule facon d'avoir des lettres nettes
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
    // enseigne au neon, face camera pour rester lisible
    const on = Math.sin(artTime() * 3.4) > -0.75;
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
    const porte = fp(b, L / 2 - 0.7, 1.1);
    const pw = R(1.4 * FW), ph = R(1.1 * FH);
    faceRect(ctx, porte[0], porte[1], porte[2], 'left', 0, 0, pw, ph, '#cfd8e4');
    for (let i = 1; i < 5; i++)
      faceRect(ctx, porte[0], porte[1], porte[2], 'left', 1, R(ph * i / 5), pw - 2, 1, '#8f9aa8');
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
  },
};

// Terrain pas encore debloque : une clairiere qui respire, pas un chantier.
// Un rectangle de terre battue avec une pancarte, c'est une verrue dans un
// village ; de l'herbe et quelques buissons, ca ressemble a un endroit ou
// quelque chose poussera.
function construction(ctx, b) {
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
  const g = Math.round(b.x * 7 + b.y * 3);
  bush(ctx, b.x + 0.55, b.y + b.d - 0.5, 0, 0.85, g);
  bush(ctx, b.x + b.w - 0.5, b.y + 0.6, 0, 0.7, g + 2);
  rock(ctx, cx + 0.3, cy + 0.2, 0, 0.7, g + 5);
  bush(ctx, cx - 0.4, cy - 0.35, 0, 0.6, g + 8);
}

// Un batiment ne bouge jamais : on le dessine une fois dans son propre
// tampon, puis on recopie l'image. On ne redessine que si la lumiere change
// de palier, ou si le neon du club clignote.
const HAUTEURS = { hut: 3.2, house: 3.8, big: 5.2, tower: 9, club: 3.2, chantier: 1.6 };
const cacheBatiments = new Map();

function styleDe(b) {
  return b.hut ? 'hut' : b.club ? 'club' : b.big ? 'big' : b.tower ? 'tower' : 'house';
}

function rendreSprite(b, env, style, cle) {
  const H = (HAUTEURS[style] || 3.5) + 1.8;      // + l'enseigne au-dessus du toit
  const marge = 108;
  const ancre = toScreen(b.x, b.y, 0);
  const gauche = Math.ceil(b.d * HW) + marge;
  const haut = Math.ceil(H * HU) + 12;
  const w = gauche + Math.ceil(b.w * HW) + marge;
  const h = haut + Math.ceil((b.w + b.d) * HH) + 28;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const dx = Math.floor(ancre.x) - gauche, dy = Math.floor(ancre.y) - haut;
  g.setTransform(1, 0, 0, 1, -dx, -dy);
  if (style === 'chantier') construction(g, b); else STYLES[style](g, b, env);
  return { canvas: c, dx, dy, cle };
}

export function drawBuilding(ctx, b, env) {
  const style = env.unlocked ? styleDe(b) : 'chantier';
  const neon = b.club ? (Math.sin(artTime() * 3.4) > -0.75 ? 1 : 0) : 0;
  const cle = style + '|' + LIGHT.key + '|' + neon;
  let sp = cacheBatiments.get(b.id);
  if (!sp || sp.cle !== cle) {
    sp = rendreSprite(b, env, style, cle);
    cacheBatiments.set(b.id, sp);
  }
  ctx.drawImage(sp.canvas, sp.dx, sp.dy);
}

// ------------------------------------------------------------- decors
// Meme principe que les batiments : un arbre ne bouge pas, on le dessine
// une fois par variante et on recopie l'image ensuite.
const cacheDecors = new Map();
const AX = 56, AY = 88, DW = 112, DH = 116;   // ancre et taille du tampon

export function drawProp(ctx, pr, env) {
  const s = pr.s || 1;
  const graine = Math.round(pr.type === 'tree' ? pr.x * 3 + pr.y
    : pr.type === 'bush' ? pr.x * 5 + pr.y
    : pr.x + pr.y * 3);
  const cle = pr.type + '|' + s.toFixed(2) + '|' + graine + '|' + LIGHT.key + '|' + (env && env.night ? 1 : 0);
  let sp = cacheDecors.get(cle);
  if (!sp) {
    const c = document.createElement('canvas');
    c.width = DW; c.height = DH;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const ancre = toScreen(pr.x, pr.y, 0);
    g.setTransform(1, 0, 0, 1, AX - Math.floor(ancre.x), AY - Math.floor(ancre.y));
    dessinerDecor(g, pr, s, graine, env);
    sp = { canvas: c };
    if (cacheDecors.size > 400) cacheDecors.clear();
    cacheDecors.set(cle, sp);
  }
  const p = toScreen(pr.x, pr.y, 0);
  ctx.drawImage(sp.canvas, Math.floor(p.x) - AX, Math.floor(p.y) - AY);
}

function dessinerDecor(ctx, pr, s, graine, env) {
  const { x, y } = pr;
  switch (pr.type) {
    case 'tree': tree(ctx, x, y, 0, s, graine); break;
    case 'bush': bush(ctx, x, y, 0, s, graine); break;
    case 'rock': rock(ctx, x, y, 0, s, graine); break;

    case 'totem': {   // un 33 tours plante sur un socle de pierre
      shadow(ctx, x, y, 0.75, 0, 0.36);
      box(ctx, x - 0.6, y - 0.6, 0, 1.2, 1.2, 0.28, '#a89a86', { line: '#6b6255' });
      box(ctx, x - 0.38, y - 0.38, 0.28, 0.76, 0.76, 0.34, '#bdb09c', { line: '#7a7063' });
      const p = P(x, y, 0.62);
      const bx = R(p.x), by = R(p.y);
      // disque et sillons : des anneaux pleins emboites, aucun contour adouci
      pxEllipse(ctx, bx, by - 13, 11, 11, '#241b33');
      for (let r = 10; r >= 4; r -= 3) {
        pxEllipse(ctx, bx, by - 13, r, r, '#3d3350');
        pxEllipse(ctx, bx, by - 13, r - 1, r - 1, '#241b33');
      }
      pxEllipse(ctx, bx, by - 13, 3, 3, '#ff5cb4');
      px(ctx, bx - 1, by - 15, 1, 1, '#ffa8d8');
      break;
    }
    case 'lamp': {
      shadow(ctx, x, y, 0.22, 0, 0.28);
      box(ctx, x - 0.06, y - 0.06, 0, 0.12, 0.12, 1.7, '#6b5a48', { line: '#3f342a' });
      const p = P(x, y, 1.7);
      const on = env && env.night;
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
