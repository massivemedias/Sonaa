// =====================================================================
//  DESSIN PIXEL ART ISOMETRIQUE
//  ---------------------------------------------------------------
//  Tout est dessine dans un tampon basse resolution, puis agrandi au
//  pixel pres par le rendu. Donc ici : aplats de couleur, contours
//  sombres d'un pixel, ombres dures. Aucun degrade, aucun flou.
// =====================================================================
import { toScreen, HW, HH, HU } from './iso.js';

export const INK = '#2b2136';
export const OUT = 1;

// ---------------------------------------------------------------- temps
let T = 0;
export function setTime(t) { T = t; }
export const time = () => T;

// ------------------------------------------------------------- couleurs
export function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgb2hex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
export function shade(hex, amt) {
  const [r, g, b] = hex2rgb(hex);
  if (amt >= 0) return rgb2hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgb2hex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}
export function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function alpha(hex, a) {
  const [r, g, b] = hex2rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function hsl(hex, dl = 0, ds = 0) {   // garde l'ancienne signature
  return shade(hex, dl);
}

// ------------------------------------------------------------- lumiere
// En pixel art on ne calcule pas la lumiere : on choisit une palette par
// moment de la journee, et on teinte le tout d'un aplat en fin de rendu.
export const LIGHT = {
  sun: '#fff3c8', shade: '#3b4f96',
  dx: 0.45, dy: 0.7, shadowA: 0.3,
  warm: 0, cool: 0, amb: 1,
  tint: null, tintA: 0,
};
const PHASES = [
  [0,  '#2a3a7a', 0.42, 0.10],
  [5,  '#3f4f96', 0.34, 0.22],
  [7,  '#ffb46b', 0.20, 0.62],
  [10, '#fff3c8', 0.06, 0.95],
  [14, '#fff8dc', 0.04, 1.00],
  [17, '#ffc27a', 0.16, 0.86],
  [20, '#7a5fb8', 0.30, 0.42],
  [22, '#2f3f86', 0.40, 0.14],
  [24, '#2a3a7a', 0.42, 0.10],
];
export function setLight(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < PHASES.length - 2 && PHASES[i + 1][0] <= h) i++;
  const a = PHASES[i], b = PHASES[i + 1];
  const t = Math.round(((h - a[0]) / (b[0] - a[0] || 1)) * 4) / 4;   // 4 paliers
  LIGHT.tint = mix(a[1], b[1], t);
  LIGHT.tintA = a[2] + (b[2] - a[2]) * t;
  LIGHT.amb = a[3] + (b[3] - a[3]) * t;
  LIGHT.shadowA = 0.12 + LIGHT.amb * 0.2;
}
export function lit(c) { return c; }
export function dim(c) { return c; }


// ------------------------------------------------------- police bitmap
// Le texte du canvas etait la derniere source de flou : une police
// vectorielle dessinee petit puis agrandie, ca bave. Celle-ci est une
// grille de 3x5 pixels allumes ou eteints. Rien a lisser.
const GLYPHS = {
  A:[2,5,7,5,5], B:[6,5,6,5,6], C:[3,4,4,4,3], D:[6,5,5,5,6], E:[7,4,6,4,7],
  F:[7,4,6,4,4], G:[3,4,5,5,3], H:[5,5,7,5,5], I:[7,2,2,2,7], J:[1,1,1,5,2],
  K:[5,5,6,5,5], L:[4,4,4,4,7], M:[5,7,7,5,5], N:[5,7,7,7,5], O:[2,5,5,5,2],
  P:[6,5,6,4,4], Q:[2,5,5,7,3], R:[6,5,6,5,5], S:[3,4,2,1,6], T:[7,2,2,2,2],
  U:[5,5,5,5,7], V:[5,5,5,5,2], W:[5,5,7,7,5], X:[5,5,2,5,5], Y:[5,5,2,2,2],
  Z:[7,1,2,4,7],
  0:[7,5,5,5,7], 1:[2,6,2,2,7], 2:[6,1,2,4,7], 3:[6,1,6,1,6], 4:[5,5,7,1,1],
  5:[7,4,6,1,6], 6:[3,4,7,5,7], 7:[7,1,2,2,2], 8:[7,5,7,5,7], 9:[7,5,7,1,6],
  ' ':[0,0,0,0,0], '!':[2,2,2,0,2], '-':[0,0,7,0,0], '.':[0,0,0,0,2],
  "'":[2,2,0,0,0], ':':[0,2,0,2,0], '&':[6,4,6,5,7], '?':[6,1,2,0,2],
  '/':[1,1,2,4,4], '+':[0,2,7,2,0], '$':[3,6,3,6,2], '%':[5,1,2,4,5],
};
const ACCENTS = { 'É':'E','È':'E','Ê':'E','À':'A','Â':'A','Ô':'O','Û':'U','Ù':'U','Ç':'C','Î':'I','Ï':'I' };

export function textWidth(str, scale = 1, sp = 1) {
  return (str.length * (3 + sp) - sp) * scale;
}

// dessine du texte pixel : chaque point allume est un carre plein
export function pxText(ctx, str, x, y, color, scale = 1, sp = 1) {
  const S = Math.max(1, Math.round(scale));
  let cx = Math.round(x);
  const cy = Math.round(y);
  ctx.fillStyle = color;
  for (const raw of String(str).toUpperCase()) {
    const ch = ACCENTS[raw] || raw;
    const g = GLYPHS[ch];
    if (g) {
      for (let r = 0; r < 5; r++) {
        const row = g[r];
        for (let c = 0; c < 3; c++) {
          if (row & (4 >> c)) ctx.fillRect(cx + c * S, cy + r * S, S, S);
        }
      }
    }
    cx += (3 + sp) * S;
  }
  return cx - Math.round(x);
}

// ----------------------------------------------------------- primitives
const P = (x, y, z) => toScreen(x, y, z);
const R = Math.round;

// Remplissage par balayage de lignes entieres : aucune diagonale lissee,
// chaque bord tombe pile sur un pixel. C'est ce qui enleve le flou.
export function poly(ctx, pts, fill, stroke = null, lw = 1) {
  if (fill) {
    let ymin = Infinity, ymax = -Infinity;
    for (const p of pts) { if (p.y < ymin) ymin = p.y; if (p.y > ymax) ymax = p.y; }
    const y0 = Math.round(ymin), y1 = Math.round(ymax);
    if (y1 - y0 > 4000) return;
    ctx.fillStyle = fill;
    const n = pts.length;
    for (let y = y0; y < y1; y++) {
      const sy = y + 0.5;
      let xmin = Infinity, xmax = -Infinity;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        if ((a.y <= sy && b.y > sy) || (b.y <= sy && a.y > sy)) {
          const x = a.x + (sy - a.y) / (b.y - a.y) * (b.x - a.x);
          if (x < xmin) xmin = x;
          if (x > xmax) xmax = x;
        }
      }
      if (xmin === Infinity) continue;
      const xa = Math.round(xmin), xb = Math.round(xmax);
      if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1);
    }
  }
  if (stroke) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      pxLine(ctx, a.x, a.y, b.x, b.y, stroke);
    }
  }
}

// trait trace pixel par pixel : le canvas n'a plus son mot a dire
export function pxLine(ctx, x0, y0, x1, y1, color) {
  let x = Math.round(x0), y = Math.round(y0);
  const X = Math.round(x1), Y = Math.round(y1);
  const dx = Math.abs(X - x), dy = -Math.abs(Y - y);
  const sx = x < X ? 1 : -1, sy = y < Y ? 1 : -1;
  let err = dx + dy, garde = 0;
  ctx.fillStyle = color;
  while (garde++ < 4000) {
    ctx.fillRect(x, y, 1, 1);
    if (x === X && y === Y) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// ellipse en escalier : des lignes pleines, jamais de bord adouci
export function pxEllipse(ctx, cx, cy, rx, ry, color) {
  const X = Math.round(cx), Y = Math.round(cy);
  const RX = Math.max(1, Math.round(rx)), RY = Math.max(1, Math.round(ry));
  ctx.fillStyle = color;
  for (let dy = -RY; dy <= RY; dy++) {
    const w = Math.round(RX * Math.sqrt(Math.max(0, 1 - (dy * dy) / (RY * RY))));
    if (w <= 0) continue;
    ctx.fillRect(X - w, Y + dy, w * 2, 1);
  }
}

// tuile isometrique pre-rendue : dessinee une fois par couleur, puis recopiee
const tileCache = new Map();
export function isoTileSprite(color, w = HW * 2, h = HH * 2) {
  const key = color + ':' + w + 'x' + h;
  let c = tileCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = color;
  const hw = w / 2, hh = h / 2;
  for (let y = 0; y < h; y++) {
    const dy = Math.abs(y + 0.5 - hh);
    const half = Math.round((1 - dy / hh) * hw);
    if (half > 0) g.fillRect(hw - half, y, half * 2, 1);
  }
  if (tileCache.size > 200) tileCache.clear();
  tileCache.set(key, c);
  return c;
}

export function roundPoly(ctx, pts, r, fill) { poly(ctx, pts, fill); }

// rectangle cale sur la grille de pixels
export function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(R(x), R(y), Math.max(1, R(w)), Math.max(1, R(h)));
}
export function rrect(ctx, x, y, w, h, r, fill, stroke = null, lw = 1) {
  if (fill) px(ctx, x, y, w, h, fill);
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(R(x) + .5, R(y) + .5, R(w) - 1, R(h) - 1); }
}

// ------------------------------------------------------------- volumes
// Trois aplats et un contour : c'est tout ce qu'il faut.
export function box(ctx, x, y, z, w, d, h, color, o = {}) {
  const top = o.top || shade(color, 0.22);
  const right = o.right || color;
  const left = o.left || shade(color, -0.24);
  const line = o.line === null ? null : (o.line || shade(color, -0.52));

  const A = P(x, y, z + h), B = P(x + w, y, z + h), C = P(x + w, y + d, z + h), D = P(x, y + d, z + h);
  const Br = P(x + w, y, z), Cr = P(x + w, y + d, z), Dr = P(x, y + d, z);

  poly(ctx, [D, C, Cr, Dr], left);
  poly(ctx, [B, C, Cr, Br], right);
  if (h !== 0 || o.forceTop !== false) poly(ctx, [A, B, C, D], top);
  if (line) {
    const sil = [A, B, Br, Cr, Dr, D];
    for (let i = 0; i < sil.length; i++) {
      const a = sil[i], b = sil[(i + 1) % sil.length];
      pxLine(ctx, a.x, a.y, b.x, b.y, line);
    }
    pxLine(ctx, C.x, C.y, Cr.x, Cr.y, line);   // arete entre les deux faces visibles
  }
}

export function slab(ctx, x, y, z, w, d, color, line = null) {
  poly(ctx, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], color, line);
}

// toit a deux pans, en aplats
export function gableRoof(ctx, x, y, z, w, d, h, color, axis = 'x', ov = 0.18) {
  const X = x - ov, Y = y - ov, W = w + ov * 2, D = d + ov * 2;
  const light = shade(color, 0.16), dark = shade(color, -0.26), edge = shade(color, -0.5);
  if (axis === 'x') {
    const cy = Y + D / 2;
    const r1 = P(X, cy, z + h), r2 = P(X + W, cy, z + h);
    const e1 = P(X, Y + D, z), e2 = P(X + W, Y + D, z);
    const b1 = P(X, Y, z), b2 = P(X + W, Y, z);
    poly(ctx, [b1, b2, r2, r1], dark);
    poly(ctx, [b2, r2, e2], shade(color, -0.4));
    poly(ctx, [r1, r2, e2, e1], light);
    poly(ctx, [b1, r1, e1], shade(color, -0.44));
    tiles(ctx, [r1, r2, e2, e1], shade(color, -0.12), 4);
    poly(ctx, [r1, r2, e2, e1], null, edge);
  } else {
    const cx = X + W / 2;
    const r1 = P(cx, Y, z + h), r2 = P(cx, Y + D, z + h);
    const e1 = P(X + W, Y, z), e2 = P(X + W, Y + D, z);
    const b1 = P(X, Y, z), b2 = P(X, Y + D, z);
    poly(ctx, [b1, r1, r2, b2], dark);
    poly(ctx, [b2, r2, e2], shade(color, -0.4));
    poly(ctx, [r1, e1, e2, r2], light);
    poly(ctx, [b1, r1, e1], shade(color, -0.44));
    tiles(ctx, [r1, r2, e2, e1], shade(color, -0.12), 4);
    poly(ctx, [r1, e1, e2, r2], null, edge);
  }
}
function tiles(ctx, q, color, rows) {
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    const a = { x: q[0].x + (q[3].x - q[0].x) * t, y: q[0].y + (q[3].y - q[0].y) * t };
    const b = { x: q[1].x + (q[2].x - q[1].x) * t, y: q[1].y + (q[2].y - q[1].y) * t };
    pxLine(ctx, a.x, a.y, b.x, b.y, color);
  }
}

export function line2(ctx, a, b, color) {
  pxLine(ctx, a.x, a.y, b.x, b.y, color);
}


// ------------------------------------------------- rectangle sur une face
// Au lieu de cisailler le contexte (ce qui fait lisser chaque pixel), on
// calcule le parallelogramme et on le remplit ligne par ligne : bords nets.
export function faceRect(ctx, ox, oy, oz, side, x, y, w, h, color) {
  const O = P(ox, oy, oz);
  const k = side === 'left' ? 0.5 : -0.5;
  const pt = (px2, py2) => ({ x: O.x + px2, y: O.y + py2 + px2 * k });
  poly(ctx, [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)], color);
}

// ------------------------------------------------------------ panneau
// Une enseigne lisible se dessine face a la camera, jamais en perspective :
// sinon les lettres sont cisaillees et redeviennent floues.
export function billboard(ctx, wx, wy, wz, text, o = {}) {
  const bg = o.bg || '#f6f0dc';
  const fg = o.fg || '#2b2136';
  const border = o.border || '#2b2136';
  const sc = o.scale || 1;
  const tw = textWidth(text, sc, 1);
  const w = tw + 6, h = 5 * sc + 6;
  const p = P(wx, wy, wz);
  const x = Math.round(p.x - w / 2), y = Math.round(p.y - h);
  if (o.post) {
    px(ctx, Math.round(p.x) - 1, y + h, 2, Math.round(o.post * HU), '#6b4426');
  }
  px(ctx, x, y, w, h, border);
  px(ctx, x + 1, y + 1, w - 2, h - 2, bg);
  if (o.accent) px(ctx, x + 1, y + 1, w - 2, 1, o.accent);
  pxText(ctx, text, x + 3, y + 3, fg, sc, 1);
  return { x, y, w, h };
}

// ------------------------------------------------- dessin sur une face
export function face(ctx, x, y, z, side, fn) {
  const p = toScreen(x, y, z);
  ctx.save();
  ctx.translate(R(p.x), R(p.y));
  if (side === 'left') ctx.transform(1, 0.5, 0, 1, 0, 0);
  else ctx.transform(1, -0.5, 0, 1, 0, 0);
  fn(ctx);
  ctx.restore();
}
export const FW = HW, FH = HU;

// --------------------------------------------------------------- ombres
// Ombre dure, un seul aplat : la signature du pixel art.
export function shadow(ctx, x, y, rx, z = 0, a = 0.3) {
  const p = P(x, y, z);
  ctx.save();
  ctx.globalAlpha = Math.min(1, a + 0.12);
  pxEllipse(ctx, p.x, p.y, Math.max(2, rx * HW), Math.max(1, rx * HW * 0.5), '#1d2b1a');
  ctx.restore();
}
export const contact = shadow;
export function castBox(ctx, x, y, w, d, h, a = null, zBase = 0) {
  const al = a === null ? LIGHT.shadowA : a;
  if (al < 0.03) return;
  const ox = h * LIGHT.dx, oy = h * LIGHT.dy;
  ctx.save();
  ctx.globalAlpha = al;
  poly(ctx, [
    P(x, y, zBase), P(x + w, y, zBase),
    P(x + w + ox, y + oy, zBase), P(x + w + ox, y + d + oy, zBase),
    P(x + ox, y + d + oy, zBase), P(x, y + d, zBase),
  ], '#1d2b1a');
  ctx.restore();
}
export function castBlob(ctx, x, y, r, h, a = null, zBase = 0) { /* les ombres dures suffisent */ }
export function lightPool(ctx, x, y, r, color = '255,205,120', strength = 0.5, z = 0) {
  if (strength <= 0.05) return;
  const p = P(x, y, z);
  ctx.save();
  ctx.globalAlpha = strength * 0.3;
  pxEllipse(ctx, p.x, p.y, r * HW, r * HW * 0.5, `rgb(${color})`);
  ctx.restore();
}
export function noisePattern() { return null; }

// ---------------------------------------------------------- vegetation
export function tree(ctx, x, y, z, s = 1, seed = 0, leaf = '#3f8a3a') {
  const p = P(x, y, z);
  shadow(ctx, x, y, 0.5 * s, z, 0.34);
  const bx = R(p.x), by = R(p.y);
  const sway = Math.round(Math.sin(T * 0.9 + seed) * 1);
  // tronc
  px(ctx, bx - 2 * s, by - 9 * s, 4 * s, 9 * s, '#7a4f2a');
  px(ctx, bx - 2 * s, by - 9 * s, 1 * s, 9 * s, '#8f5f34');
  px(ctx, bx + 1 * s, by - 9 * s, 1 * s, 9 * s, '#5e3a1d');
  // feuillage : trois paliers d'aplats
  const dark = shade(leaf, -0.26), light = shade(leaf, 0.18);
  const blobs = [
    [0, -19, 9], [-6, -14, 6], [6, -14, 6], [-3, -25, 6], [4, -24, 5],
  ];
  for (const [dx, dy, r] of blobs)
    pxEllipse(ctx, bx + (dx + sway) * s, by + dy * s, r * s, r * 0.85 * s, dark);
  for (const [dx, dy, r] of blobs)
    pxEllipse(ctx, bx + (dx + sway) * s, by + (dy - 1.5) * s, (r - 1.5) * s, (r - 1.5) * 0.85 * s, leaf);
  pxEllipse(ctx, bx + (-2 + sway) * s, by - 23 * s, 4 * s, 3 * s, light);
}

export function bush(ctx, x, y, z, s = 1, seed = 0, leaf = '#3f8a3a') {
  const p = P(x, y, z);
  shadow(ctx, x, y, 0.32 * s, z, 0.3);
  const bx = R(p.x), by = R(p.y);
  const dark = shade(leaf, -0.24), light = shade(leaf, 0.2);
  for (const [dx, dy, r] of [[-4, -3, 5], [4, -3, 5], [0, -6, 6]]) {
    pxEllipse(ctx, bx + dx * s, by + dy * s, r * s, r * 0.8 * s, dark);
    pxEllipse(ctx, bx + dx * s, by + (dy - 1.5) * s, (r - 1.5) * s, (r - 1.5) * 0.8 * s, leaf);
  }
  pxEllipse(ctx, bx - 1 * s, by - 8 * s, 2.5 * s, 1.5 * s, light);
}

export function rock(ctx, x, y, z, s = 1, seed = 0) {
  const p = P(x, y, z);
  shadow(ctx, x, y, 0.34 * s, z, 0.36);
  const bx = R(p.x), by = R(p.y);
  const light = '#b3bcc2', mid = '#8f989e', dark = '#6a7378', line = '#4a5257';
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.moveTo(bx - 8 * s, by - 1 * s);
  ctx.lineTo(bx - 5 * s, by - 9 * s);
  ctx.lineTo(bx + 1 * s, by - 11 * s);
  ctx.lineTo(bx + 7 * s, by - 6 * s);
  ctx.lineTo(bx + 7 * s, by - 1 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(bx - 5 * s, by - 9 * s);
  ctx.lineTo(bx + 1 * s, by - 11 * s);
  ctx.lineTo(bx + 2 * s, by - 7 * s);
  ctx.lineTo(bx - 3 * s, by - 5 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(bx + 2 * s, by - 7 * s);
  ctx.lineTo(bx + 7 * s, by - 6 * s);
  ctx.lineTo(bx + 7 * s, by - 1 * s);
  ctx.lineTo(bx + 1 * s, by - 1 * s);
  ctx.closePath(); ctx.fill();
  const cont = [[bx - 8 * s, by - 1 * s], [bx - 5 * s, by - 9 * s], [bx + 1 * s, by - 11 * s],
                [bx + 7 * s, by - 6 * s], [bx + 7 * s, by - 1 * s]];
  for (let i = 0; i < cont.length; i++) {
    const a = cont[i], b = cont[(i + 1) % cont.length];
    pxLine(ctx, a[0], a[1], b[0], b[1], line);
  }
}

export function flower(ctx, x, y, z, color = '#e8d44a') {
  const p = P(x, y, z);
  px(ctx, p.x, p.y - 3, 1, 3, '#3f7a2c');
  px(ctx, p.x - 1, p.y - 5, 3, 2, color);
  px(ctx, p.x, p.y - 4, 1, 1, shade(color, 0.4));
}
export function grassTuft(ctx, x, y, z, color = '#6aad48') {
  const p = P(x, y, z);
  px(ctx, p.x - 2, p.y - 2, 1, 2, color);
  px(ctx, p.x, p.y - 3, 1, 3, color);
  px(ctx, p.x + 2, p.y - 2, 1, 2, color);
}

// ------------------------------------------------------------- anciens
// Conserves pour que le reste du code continue de tourner.
export function plant(ctx, x, y, z, s = 1) { bush(ctx, x, y, z, s * 0.7, x + y); }
export function pillar(ctx, x, y, z, h, color = '#b3bcc2') { box(ctx, x, y, z, 0.42, 0.42, h, color); }
export function arch(ctx, x, y, z, span = 2.2, color = '#b3bcc2') {
  pillar(ctx, x, y, z, 1.4, color);
  pillar(ctx, x, y + span - 0.42, z, 1.4, color);
  box(ctx, x - 0.04, y - 0.06, z + 1.4, 0.5, span + 0.12, 0.3, color);
}
export function acUnit(ctx, x, y, z, s = 0.5) { box(ctx, x, y, z, s, s * 0.8, s * 0.7, '#c8d2d6'); }
export function crate(ctx, x, y, z, s = 0.5, color = '#c9924e') {
  box(ctx, x, y, z, s, s, s * 0.8, color);
}
export function pole(ctx, x, y, z, h, color = '#8f5f34') { box(ctx, x, y, z, 0.12, 0.12, h, color); }
export function smoke(ctx, x, y, z, seed = 0) {
  const p = P(x, y, z);
  for (let i = 0; i < 3; i++) {
    const t = ((T * 0.3 + i * 0.33 + seed) % 1);
    ctx.globalAlpha = 0.4 * (1 - t);
    px(ctx, p.x + Math.sin(t * 5 + seed) * 3, p.y - t * 16, 2 + t * 2, 2 + t * 2, '#dfe6ea');
  }
  ctx.globalAlpha = 1;
}
export function tileCube() { }
export function lantern(ctx, x, y, z, color = '#ffc857') {
  const p = P(x, y, z);
  px(ctx, p.x - 1, p.y - 8, 1, 4, '#5e3a1d');
  px(ctx, p.x - 2, p.y - 5, 4, 4, color);
  px(ctx, p.x - 1, p.y - 4, 1, 1, shade(color, 0.4));
}
export function flag(ctx, x, y, z, text = 'SO', color = '#4fbf9f') {
  const p = P(x, y, z);
  px(ctx, p.x, p.y - 18, 1, 18, '#e8e0cf');
  const w = Math.round(Math.sin(T * 3) * 1);
  px(ctx, p.x + 1, p.y - 18 + w, 9, 6, color);
  px(ctx, p.x + 1, p.y - 18 + w, 9, 1, shade(color, 0.25));
}
export function awning(ctx, x, y, z, w, d, a = '#f0e6d2', b = '#4fbf9f', dir = 'y') {
  const drop = 0.3;
  let q;
  if (dir === 'y') q = [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z - drop), P(x, y + d, z - drop)];
  else q = [P(x, y, z), P(x, y + d, z), P(x + w, y + d, z - drop), P(x + w, y, z - drop)];
  poly(ctx, q, a);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(R(q[0].x), R(q[0].y));
  for (let i = 1; i < 4; i++) ctx.lineTo(R(q[i].x), R(q[i].y));
  ctx.closePath(); ctx.clip();
  const n = 6;
  for (let i = 0; i < n; i += 2) {
    const t0 = i / n, t1 = (i + 1) / n;
    const A = { x: q[0].x + (q[1].x - q[0].x) * t0, y: q[0].y + (q[1].y - q[0].y) * t0 };
    const B = { x: q[0].x + (q[1].x - q[0].x) * t1, y: q[0].y + (q[1].y - q[0].y) * t1 };
    const C = { x: q[3].x + (q[2].x - q[3].x) * t1, y: q[3].y + (q[2].y - q[3].y) * t1 };
    const D = { x: q[3].x + (q[2].x - q[3].x) * t0, y: q[3].y + (q[2].y - q[3].y) * t0 };
    poly(ctx, [A, B, C, D], b);
  }
  ctx.restore();
  poly(ctx, q, null, shade(b, -0.45));
}
export function signboard(ctx, x, y, z, side, wUnits, hUnits, text, bg = '#f0e6d2', fg = '#3a2d4a') {
  face(ctx, x, y, z, side, c => {
    const w = Math.round(wUnits * FW), h = Math.round(hUnits * FH);
    px(c, 0, 0, w, h, bg);
    px(c, 0, 0, w, 1, shade(bg, 0.3));
    px(c, 0, h - 1, w, 1, shade(bg, -0.3));
    // on reduit le texte jusqu'a ce qu'il tienne, sans jamais l'etirer
    let sc = 2, sp = 1;
    while (sc > 1 && textWidth(text, sc, sp) > w - 4) sc--;
    let str = text;
    while (textWidth(str, sc, sp) > w - 3 && str.length > 1) str = str.slice(0, -1);
    pxText(c, str, (w - textWidth(str, sc, sp)) / 2, (h - 5 * sc) / 2, fg, sc, sp);
  });
}

export function windowRow(ctx, x, y, z, side, wUnits, hUnits, n, glass = '#9ad9e8', frame = '#f0e6d2') {
  const w = wUnits * FW, h = hUnits * FH, gap = w / n;
  for (let i = 0; i < n; i++) {
    const ww = Math.round(gap * 0.62), xx = Math.round(i * gap + (gap - ww) / 2);
    faceRect(ctx, x, y, z, side, xx, 0, ww, h, frame);
    faceRect(ctx, x, y, z, side, xx + 1, 1, ww - 2, h - 2, glass);
    faceRect(ctx, x, y, z, side, xx + 1, 1, Math.max(1, (ww - 2) / 2), Math.max(1, (h - 2) / 2), shade(glass, 0.3));
  }
}

export function doorway(ctx, x, y, z, side, wUnits, hUnits, color = '#8f5f34') {
  const w = Math.round(wUnits * FW), h = Math.round(hUnits * FH);
  faceRect(ctx, x, y, z, side, 0, 0, w, h, shade(color, 0.15));
  faceRect(ctx, x, y, z, side, 1, 1, w - 2, h - 1, shade(color, -0.35));
  faceRect(ctx, x, y, z, side, 1, 1, w - 2, 1, shade(color, -0.1));
  faceRect(ctx, x, y, z, side, w - 4, Math.round(h * 0.5), 2, 2, '#ffd76a');
}
