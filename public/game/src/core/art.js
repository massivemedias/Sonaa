// =====================================================================
//  PRIMITIVES DE DESSIN ISO — rendu "mini world" : volumes doux,
//  dégradés de lumière, occlusion ambiante, pas de contour dur.
// =====================================================================
import { toScreen, HW, HH, HU } from './iso.js';

export const INK = 'rgba(28,10,46,0.55)';
export const OUT = 1;

// ---------------------------------------------------------------- lumière
// Un seul objet décrit l'éclairage de la scène. Il change avec l'heure :
// couleur du soleil, couleur de l'ombre, direction et longueur des ombres
// portées. Les valeurs sont quantifiées par paliers pour que le cache de
// dégradés ne soit pas jeté à chaque image.
export const LIGHT = {
  sun: '#ffe6b0', shade: '#3b4f96',
  dx: 0.5, dy: 0.75,        // direction de l'ombre par unité de hauteur
  shadowA: 0.28,            // opacité des ombres portées
  warm: 0.16, cool: 0.13,   // dosage du chaud sur les faces éclairées / du froid à l'ombre
  amb: 1,                   // 1 = plein jour, 0 = nuit noire
  key: 'midi',
};

// heures clés : [heure, soleil, ombre, dx, dy, opacité, chaud, froid, ambiance]
const PHASES = [
  [0,  '#8fa6ff', '#232c62', 0.30, 0.50, 0.08, 0.05, 0.26, 0.10],
  [5,  '#9fb6ff', '#28306a', 0.34, 0.55, 0.10, 0.06, 0.24, 0.18],
  [7,  '#ffc98a', '#4a4b9e', 0.95, 0.62, 0.22, 0.20, 0.16, 0.62],
  [10, '#ffe3ad', '#43539b', 0.72, 0.72, 0.27, 0.15, 0.13, 0.92],
  [13, '#fff2d2', '#4a5da8', 0.40, 0.58, 0.30, 0.12, 0.11, 1.00],
  [16, '#ffdca0', '#45509c', 0.42, 0.92, 0.28, 0.17, 0.13, 0.88],
  [19, '#ffb27a', '#4b3f8f', 0.26, 1.15, 0.20, 0.22, 0.18, 0.50],
  [21, '#9aa8f5', '#252d66', 0.30, 0.60, 0.10, 0.07, 0.25, 0.16],
  [24, '#8fa6ff', '#232c62', 0.30, 0.50, 0.08, 0.05, 0.26, 0.10],
];

const q = (v, step) => Math.round(v / step) * step;
function qcol(hex) {   // on arrondit chaque canal pour limiter le nombre de palettes
  const [r, g, b] = hex2rgb(hex);
  return rgb2hex(q(r, 12), q(g, 12), q(b, 12));
}

export function setLight(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < PHASES.length - 2 && PHASES[i + 1][0] <= h) i++;
  const a = PHASES[i], b = PHASES[i + 1];
  const t = q((h - a[0]) / (b[0] - a[0] || 1), 0.2);   // 5 paliers entre deux phases
  const lerpN = (x, y) => x + (y - x) * t;
  LIGHT.sun = qcol(mix(a[1], b[1], t));
  LIGHT.shade = qcol(mix(a[2], b[2], t));
  LIGHT.dx = lerpN(a[3], b[3]);
  LIGHT.dy = lerpN(a[4], b[4]);
  LIGHT.shadowA = lerpN(a[5], b[5]);
  LIGHT.warm = lerpN(a[6], b[6]);
  LIGHT.cool = lerpN(a[7], b[7]);
  LIGHT.amb = lerpN(a[8], b[8]);
  LIGHT.key = i + ':' + t.toFixed(1);
}

// teinte une couleur selon qu'elle prend la lumière ou qu'elle est à l'ombre
export function lit(color, k = 1) { return mix(color, LIGHT.sun, LIGHT.warm * k); }
export function dim(color, k = 1) { return mix(color, LIGHT.shade, LIGHT.cool * k); }

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
export function hsl(hex, dl = 0, ds = 0) {
  let [r, g, b] = hex2rgb(hex);
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, l = (mx + mn) / 2, sa = 0;
  const d = mx - mn;
  if (d) {
    sa = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  l = Math.max(0, Math.min(1, l + dl));
  sa = Math.max(0, Math.min(1, sa + ds));
  const q = l < .5 ? l * (1 + sa) : l + sa - l * sa, pp = 2 * l - q;
  const cc = t => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  return rgb2hex(cc(h + 1 / 3) * 255, cc(h) * 255, cc(h - 1 / 3) * 255);
}

export function alpha(hex, a) {
  const [r, g, b] = hex2rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// --------------------------------------------------- cache de dégradés
// Les dégradés sont exprimés en coordonnées monde : ils suivent la caméra
// tout seuls, donc on peut les garder d'une image à l'autre.
const gcache = new Map();
function lin(ctx, x0, y0, x1, y1, stops) {
  const k = `${x0 | 0},${y0 | 0},${x1 | 0},${y1 | 0},${stops.map(s => s[0].toFixed(2) + s[1]).join()}`;
  let g = gcache.get(k);
  if (!g) {
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [p, c] of stops) g.addColorStop(p, c);
    if (gcache.size > 4000) gcache.clear();
    gcache.set(k, g);
  }
  return g;
}
export function clearGradientCache() { gcache.clear(); }

// ------------------------------------------------------------ polygones
export function poly(ctx, pts, fill, stroke = null, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.stroke(); }
}
// polygone aux coins adoucis (le secret du look "pâte à modeler")
export function roundPoly(ctx, pts, r, fill) {
  const n = pts.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n], p2 = pts[(i + 2) % n];
    const a = { x: p1.x - p0.x, y: p1.y - p0.y }, b = { x: p2.x - p1.x, y: p2.y - p1.y };
    const la = Math.hypot(a.x, a.y) || 1, lb = Math.hypot(b.x, b.y) || 1;
    const ra = Math.min(r, la / 2, lb / 2);
    const s = { x: p1.x - a.x / la * ra, y: p1.y - a.y / la * ra };
    const e = { x: p1.x + b.x / lb * ra, y: p1.y + b.y / lb * ra };
    if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    ctx.quadraticCurveTo(p1.x, p1.y, e.x, e.y);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
const P = (x, y, z) => toScreen(x, y, z);

// ------------------------------------------------------------ volume
// Boîte isométrique éclairée depuis le haut-gauche, avec occlusion au sol.
export function box(ctx, x, y, z, w, d, h, color, o = {}) {
  const topA = o.top || lit(hsl(color, 0.14 * LIGHT.amb - 0.02, -0.04), 1);
  const topB = lit(hsl(topA, -0.05, 0.01), 0.35);
  const rightA = o.right || lit(hsl(color, 0.04 * LIGHT.amb, 0.02), 0.45);
  const rightB = dim(hsl(rightA, -0.14, 0.04), 0.8);
  const leftA = o.left || dim(hsl(color, -0.08, 0.03), 1);
  const leftB = dim(hsl(leftA, -0.13, 0.03), 1.6);
  const r = o.round ?? 5;

  const A = P(x, y, z + h), B = P(x + w, y, z + h), C = P(x + w, y + d, z + h), D = P(x, y + d, z + h);
  const Br = P(x + w, y, z), Cr = P(x + w, y + d, z), Dr = P(x, y + d, z);

  // silhouette adoucie : sert de liseré sombre autour du volume
  if (r > 0) roundPoly(ctx, [A, B, Br, Cr, Dr, D], r + 1.4, o.rim || dim(hsl(color, -0.20, 0.03), 1.6));

  // face gauche (y max)
  poly(ctx, [D, C, Cr, Dr], lin(ctx, D.x, D.y, Dr.x, Dr.y, [[0, leftA], [1, leftB]]));
  // face droite (x max)
  poly(ctx, [B, C, Cr, Br], lin(ctx, B.x, B.y, Br.x, Br.y, [[0, rightA], [1, rightB]]));
  // dessus
  if (h !== 0 || o.forceTop !== false)
    poly(ctx, [A, B, C, D], lin(ctx, A.x, A.y, C.x, C.y, [[0, topA], [1, topB]]));

  // arête de lumière sur les crêtes tournées vers la lumière
  if (o.rim !== null) {
    ctx.strokeStyle = alpha(mix(shade(color, 0.55), LIGHT.sun, 0.6), 0.3 + 0.35 * LIGHT.amb);
    ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.moveTo(A.x, A.y); ctx.lineTo(D.x, D.y);
    ctx.stroke();
  }
}

// dalle plate
export function slab(ctx, x, y, z, w, d, color, line = null, lw = 1) {
  poly(ctx, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], color, line, lw);
}

// ------------------------------------------------------------ toiture
export function gableRoof(ctx, x, y, z, w, d, h, color, axis = 'x', ov = 0.16) {
  const X = x - ov, Y = y - ov, W = w + ov * 2, D = d + ov * 2;
  const lite = shade(color, 0.26), mid = color, dark = shade(color, -0.26), deep = shade(color, -0.42);
  if (axis === 'x') {
    const cy = Y + D / 2;
    const r1 = P(X, cy, z + h), r2 = P(X + W, cy, z + h);
    const e1 = P(X, Y + D, z), e2 = P(X + W, Y + D, z);
    const b1 = P(X, Y, z), b2 = P(X + W, Y, z);
    roundPoly(ctx, [b1, b2, e2, e1], 3, deep);
    poly(ctx, [b1, b2, r2, r1], shade(color, -0.36));            // pan arrière
    poly(ctx, [b2, r2, e2], lin(ctx, r2.x, r2.y, e2.x, e2.y, [[0, dark], [1, shade(dark, -0.2)]])); // pignon
    const q = [r1, r2, e2, e1];
    poly(ctx, q, lin(ctx, r1.x, r1.y, e1.x, e1.y, [[0, lite], [1, mid]]));
    shingles(ctx, q, alpha(shade(color, -0.4), 0.35), 6);
    poly(ctx, [b1, r1, e1], shade(color, -0.44));
    ridge(ctx, r1, r2, color);
  } else {
    const cx = X + W / 2;
    const r1 = P(cx, Y, z + h), r2 = P(cx, Y + D, z + h);
    const e1 = P(X + W, Y, z), e2 = P(X + W, Y + D, z);
    const b1 = P(X, Y, z), b2 = P(X, Y + D, z);
    roundPoly(ctx, [b1, e1, e2, b2], 3, deep);
    poly(ctx, [b1, r1, r2, b2], shade(color, -0.36));
    poly(ctx, [b2, r2, e2], lin(ctx, r2.x, r2.y, e2.x, e2.y, [[0, dark], [1, shade(dark, -0.2)]]));
    const q = [r1, e1, e2, r2];
    poly(ctx, q, lin(ctx, r1.x, r1.y, e1.x, e1.y, [[0, lite], [1, mid]]));
    shingles(ctx, [r1, r2, e2, e1], alpha(shade(color, -0.4), 0.35), 6);
    poly(ctx, [b1, r1, e1], shade(color, -0.44));
    ridge(ctx, r1, r2, color);
  }
}
function ridge(ctx, a, b, color) {
  ctx.strokeStyle = alpha(shade(color, 0.75), 0.75); ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function shingles(ctx, q, color, rows) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y);
  ctx.closePath(); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = 1.3;
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    const a = { x: q[0].x + (q[3].x - q[0].x) * t, y: q[0].y + (q[3].y - q[0].y) * t };
    const b = { x: q[1].x + (q[2].x - q[1].x) * t, y: q[1].y + (q[2].y - q[1].y) * t };
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

export function line2(ctx, a, b, color, lw = 2) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}

// -------------------------------------------------- dessin sur une face
export function face(ctx, x, y, z, side, fn) {
  const p = toScreen(x, y, z);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (side === 'left') ctx.transform(1, 0.5, 0, 1, 0, 0);
  else ctx.transform(1, -0.5, 0, 1, 0, 0);
  fn(ctx);
  ctx.restore();
}
export const FW = HW, FH = HU;

export function rrect(ctx, x, y, w, h, r, fill, stroke = null, lw = 1.4) {
  ctx.beginPath();
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

// --------------------------------------------------------------- ombres
// petite flaque sombre au contact du sol : ce qui « pose » vraiment un objet
export function contact(ctx, x, y, rx, z = 0, a = 0.3) {
  const p = P(x, y, z);
  const R = rx * HW;
  ctx.save();
  ctx.translate(p.x, p.y); ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, R);
  g.addColorStop(0, `rgba(24,14,48,${a})`);
  g.addColorStop(0.45, `rgba(24,14,48,${a * 0.42})`);
  g.addColorStop(1, 'rgba(24,14,48,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function shadow(ctx, x, y, rx, z = 0, a = 0.3) {
  const p = P(x, y, z);
  const R = rx * HW * 1.15;
  ctx.save();
  ctx.translate(p.x, p.y); ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
  g.addColorStop(0, `rgba(20,4,38,${a})`);
  g.addColorStop(0.6, `rgba(20,4,38,${a * 0.55})`);
  g.addColorStop(1, 'rgba(20,4,38,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --------------------------------------------------------------- auvent
export function awning(ctx, x, y, z, w, d, a = '#fbf6ea', b = '#4fbf9f', dir = 'y') {
  const drop = 0.40;
  let wallA, wallB, outA, outB;
  if (dir === 'y') {
    wallA = P(x, y, z); wallB = P(x + w, y, z);
    outA = P(x, y + d, z - drop); outB = P(x + w, y + d, z - drop);
  } else {
    wallA = P(x, y, z); wallB = P(x, y + d, z);
    outA = P(x + w, y, z - drop); outB = P(x + w, y + d, z - drop);
  }
  const q = [wallA, wallB, outB, outA];
  poly(ctx, q, lin(ctx, wallA.x, wallA.y, outA.x, outA.y, [[0, shade(a, -0.14)], [1, a]]));
  ctx.save();
  ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y);
  ctx.closePath(); ctx.clip();
  const n = Math.max(4, Math.round((dir === 'y' ? w : d) * 4));
  for (let i = 0; i < n; i += 2) {
    const t0 = i / n, t1 = (i + 1) / n;
    const A = { x: q[0].x + (q[1].x - q[0].x) * t0, y: q[0].y + (q[1].y - q[0].y) * t0 };
    const B = { x: q[0].x + (q[1].x - q[0].x) * t1, y: q[0].y + (q[1].y - q[0].y) * t1 };
    const C = { x: q[3].x + (q[2].x - q[3].x) * t1, y: q[3].y + (q[2].y - q[3].y) * t1 };
    const D = { x: q[3].x + (q[2].x - q[3].x) * t0, y: q[3].y + (q[2].y - q[3].y) * t0 };
    poly(ctx, [A, B, C, D], lin(ctx, A.x, A.y, D.x, D.y, [[0, shade(b, -0.12)], [1, shade(b, 0.12)]]));
  }
  ctx.restore();
  // festons ondulants
  const e0 = q[3], e1 = q[2], seg = 9;
  for (let i = 0; i < seg; i++) {
    const t = i / seg, t2 = (i + 1) / seg;
    const A = { x: e0.x + (e1.x - e0.x) * t, y: e0.y + (e1.y - e0.y) * t };
    const B = { x: e0.x + (e1.x - e0.x) * t2, y: e0.y + (e1.y - e0.y) * t2 };
    const wob = Math.sin(T * 2.2 + i * 0.9) * 0.9;
    ctx.beginPath();
    ctx.arc((A.x + B.x) / 2, (A.y + B.y) / 2 + 1 + wob, Math.hypot(B.x - A.x, B.y - A.y) / 2, 0, Math.PI);
    ctx.fillStyle = i % 2 ? shade(b, 0.05) : a; ctx.fill();
  }
  // ombre portée de l'auvent sur la façade
  ctx.save();
  ctx.globalAlpha = 0.18;
  poly(ctx, [wallA, wallB, { x: wallB.x, y: wallB.y + 9 }, { x: wallA.x, y: wallA.y + 9 }], '#1a0730');
  ctx.restore();
}

// ------------------------------------------------------------ enseignes
export function signboard(ctx, x, y, z, side, wUnits, hUnits, text, bg = '#fbf6ea', fg = '#2e8b73') {
  face(ctx, x, y, z, side, c => {
    const w = wUnits * FW, h = hUnits * FH;
    c.save(); c.globalAlpha = 0.22;
    rrect(c, 2, 3, w, h, 6, '#1a0730'); c.restore();
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(bg, 0.12)); g.addColorStop(1, shade(bg, -0.12));
    rrect(c, 0, 0, w, h, 5, g, alpha(shade(fg, -0.3), 0.5), 1.4);
    c.fillStyle = fg;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const size = Math.min(h * 0.6, w / (text.length * 0.52));
    c.font = `800 ${size}px "Baloo 2", Trebuchet MS, sans-serif`;
    c.fillText(text, w / 2, h / 2 + 1);
  });
}

export function windowRow(ctx, x, y, z, side, wUnits, hUnits, n, glass = '#a9e3d3', frame = '#fbf6ea') {
  face(ctx, x, y, z, side, c => {
    const w = wUnits * FW, h = hUnits * FH;
    const gap = w / n;
    for (let i = 0; i < n; i++) {
      const ww = gap * 0.64, xx = i * gap + (gap - ww) / 2;
      rrect(c, xx, 0, ww, h, 3.5, frame);
      const g = c.createLinearGradient(xx, 0, xx + ww, h);
      g.addColorStop(0, shade(glass, 0.2)); g.addColorStop(0.55, glass); g.addColorStop(1, shade(glass, -0.25));
      rrect(c, xx + 2.5, 2.5, ww - 5, h - 5, 2.5, g);
      c.save(); c.globalAlpha = 0.5;
      c.strokeStyle = '#ffffff'; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(xx + 5, h - 5); c.lineTo(xx + ww - 5, 6); c.stroke();
      c.restore();
    }
  });
}

export function doorway(ctx, x, y, z, side, wUnits, hUnits, color = '#b3624f') {
  face(ctx, x, y, z, side, c => {
    const w = wUnits * FW, h = hUnits * FH;
    rrect(c, 0, 0, w, h, 4, shade(color, 0.1));
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a0f3f'); g.addColorStop(1, '#160724');
    rrect(c, 3, 3, w - 6, h - 3, 3, g);
    c.fillStyle = '#ffc857';
    c.beginPath(); c.arc(w - 8, h * 0.55, 2.2, 0, Math.PI * 2); c.fill();
  });
}

// --------------------------------------------------------------- nature
export function plant(ctx, x, y, z, s = 1, color = '#9b6bd6', pot = '#e08a72', seed = 0) {
  const p = P(x, y, z);
  shadow(ctx, x, y, 0.28 * s, 0, 0.22);
  ctx.save(); ctx.translate(p.x, p.y);
  // pot en volume
  const potTop = shade(pot, 0.2), potBot = shade(pot, -0.3);
  const g = ctx.createLinearGradient(-10 * s, -18 * s, 10 * s, 0);
  g.addColorStop(0, potTop); g.addColorStop(1, potBot);
  roundPoly(ctx, [{ x: -9 * s, y: -16 * s }, { x: 9 * s, y: -16 * s }, { x: 6.5 * s, y: 0 }, { x: -6.5 * s, y: 0 }], 3, g);
  ctx.fillStyle = alpha(shade(pot, 0.35), 0.9);
  ctx.beginPath(); ctx.ellipse(0, -16 * s, 9.4 * s, 3.4 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2f1a44';
  ctx.beginPath(); ctx.ellipse(0, -16 * s, 7 * s, 2.4 * s, 0, 0, Math.PI * 2); ctx.fill();
  // feuilles qui ondulent
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const sway = Math.sin(T * 1.3 + seed + i * 0.7) * 0.09;
    const a = -Math.PI / 2 + (i - (leaves - 1) / 2) * 0.38 + sway;
    const len = (24 + (i % 3) * 9) * s;
    const tipx = Math.cos(a) * len, tipy = Math.sin(a) * len - 15 * s;
    const c0 = i % 2 ? shade(color, 0.14) : color;
    const lg = ctx.createLinearGradient(0, -15 * s, tipx, tipy);
    lg.addColorStop(0, shade(c0, -0.25)); lg.addColorStop(1, shade(c0, 0.18));
    ctx.beginPath();
    ctx.moveTo(0, -15 * s);
    ctx.quadraticCurveTo(tipx * 0.35 - Math.sin(a) * 8 * s, tipy * 0.6, tipx, tipy);
    ctx.quadraticCurveTo(tipx * 0.35 + Math.sin(a) * 8 * s, tipy * 0.6, 0, -15 * s);
    ctx.closePath();
    ctx.fillStyle = lg; ctx.fill();
  }
  ctx.restore();
}

// arbre rond façon maquette
export function tree(ctx, x, y, z, s = 1, seed = 0, leaf = '#5fc9a3') {
  shadow(ctx, x, y, 0.42 * s, 0, 0.26);
  const p = P(x, y, z);
  ctx.save(); ctx.translate(p.x, p.y);
  const sway = Math.sin(T * 1.1 + seed) * 1.6;
  const trunk = ctx.createLinearGradient(-4 * s, 0, 5 * s, 0);
  trunk.addColorStop(0, '#8a5a3f'); trunk.addColorStop(1, '#c78a5f');
  roundPoly(ctx, [{ x: -3.5 * s, y: -22 * s }, { x: 3.5 * s, y: -22 * s }, { x: 4.5 * s, y: 0 }, { x: -4.5 * s, y: 0 }], 2, trunk);
  for (let i = 0; i < 3; i++) {
    const r = (16 - i * 3.2) * s;
    const cy = (-26 - i * 11) * s;
    const cx = sway * (i + 1) * 0.35;
    const g = ctx.createRadialGradient(cx - r * .4, cy - r * .45, r * .1, cx, cy, r * 1.05);
    g.addColorStop(0, shade(leaf, 0.34)); g.addColorStop(0.6, leaf); g.addColorStop(1, shade(leaf, -0.3));
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.88, 0, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.restore();
}

// --------------------------------------------------------------- divers
export function acUnit(ctx, x, y, z, s = 0.5) {
  box(ctx, x, y, z, s, s * 0.8, s * 0.7, '#d6ece5', { round: 2.5 });
  const p = P(x + s, y + s * 0.4, z + s * 0.35);
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#7fa79c'; ctx.fill();
  ctx.save(); ctx.rotate(T * 6);
  ctx.strokeStyle = '#cfe4dd'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 3.6, Math.sin(a) * 3.6); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

export function lantern(ctx, x, y, z, color = '#ffc857') {
  const p = P(x, y, z);
  ctx.save(); ctx.translate(p.x, p.y);
  const sw = Math.sin(T * 1.6 + x) * 1.6;
  ctx.strokeStyle = 'rgba(28,10,46,.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(sw, -6); ctx.stroke();
  const g = ctx.createRadialGradient(sw - 2, -2, 1, sw, 0, 9);
  g.addColorStop(0, shade(color, 0.4)); g.addColorStop(1, shade(color, -0.15));
  rrect(ctx, sw - 5, -6, 10, 13, 4.5, g);
  ctx.restore();
}

export function crate(ctx, x, y, z, s = 0.5, color = '#e0a978') {
  box(ctx, x, y, z, s, s, s * 0.8, color, { round: 2.5 });
  face(ctx, x, y + s, z + s * 0.8, 'left', c => {
    c.strokeStyle = alpha(shade(color, -0.45), 0.5); c.lineWidth = 2;
    const w = s * FW, h = s * 0.8 * FH;
    c.beginPath(); c.moveTo(2, h - 2); c.lineTo(w - 2, 2); c.stroke();
  });
}

export function pole(ctx, x, y, z, h, color = '#b3624f') {
  box(ctx, x, y, z, 0.1, 0.1, h, color, { round: 1.5 });
}

export function flag(ctx, x, y, z, text = 'SO', color = '#4fbf9f') {
  pole(ctx, x, y, z, 2.2, '#f3ece0');
  face(ctx, x, y, z + 2.2, 'left', c => {
    const wob = Math.sin(T * 3) * 2.2;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(24, 2 + wob, 46, 4);
    c.lineTo(40, 15); c.lineTo(46, 26);
    c.quadraticCurveTo(24, 24 - wob, 0, 24);
    c.closePath();
    const g = c.createLinearGradient(0, 0, 46, 26);
    g.addColorStop(0, shade(color, 0.2)); g.addColorStop(1, shade(color, -0.2));
    c.fillStyle = g; c.fill();
    c.fillStyle = '#0d3a2f'; c.font = '800 14px "Baloo 2", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 21, 13);
  });
}

// fumée qui monte (cheminée, food truck…)
export function smoke(ctx, x, y, z, seed = 0, color = 'rgba(230,220,255,') {
  const p = P(x, y, z);
  ctx.save(); ctx.translate(p.x, p.y);
  for (let i = 0; i < 4; i++) {
    const t = ((T * 0.35 + i * 0.25 + seed) % 1);
    const yy = -t * 46;
    const r = 3 + t * 9;
    ctx.beginPath();
    ctx.arc(Math.sin(t * 5 + seed) * 7, yy, r, 0, Math.PI * 2);
    ctx.fillStyle = color + (0.3 * (1 - t)).toFixed(3) + ')';
    ctx.fill();
  }
  ctx.restore();
}


// ---------------------------------------------------------- tuile-cube
// Le sol du jeu : des petits cubes arrondis posés côte à côte, avec une
// bande de terre visible dès qu'il y a une marche ou le vide.
export function tileCube(ctx, x, y, z, top, side, o = {}) {
  const h = o.h ?? 0.34;          // épaisseur visible du cube
  const r = o.round ?? 6;
  const A = P(x, y, z), B = P(x + 1, y, z), C = P(x + 1, y + 1, z), D = P(x, y + 1, z);
  // flancs (seulement ceux tournés vers l'observateur)
  if (o.right) {
    const B2 = P(x + 1, y, z - h), C2 = P(x + 1, y + 1, z - h);
    roundPoly(ctx, [B, C, C2, B2], 3, lin(ctx, B.x, B.y, B2.x, B2.y,
      [[0, shade(side, 0.08)], [1, shade(side, -0.28)]]));
  }
  if (o.left) {
    const D2 = P(x, y + 1, z - h), C2 = P(x + 1, y + 1, z - h);
    roundPoly(ctx, [D, C, C2, D2], 3, lin(ctx, D.x, D.y, D2.x, D2.y,
      [[0, shade(side, -0.06)], [1, shade(side, -0.4)]]));
  }
  // dessus arrondi
  roundPoly(ctx, [A, B, C, D], r, lin(ctx, A.x, A.y, C.x, C.y,
    [[0, shade(top, 0.10)], [1, shade(top, -0.07)]]));
  if (o.shade) {
    ctx.save(); ctx.globalAlpha = o.shade;
    roundPoly(ctx, [A, B, C, D], r, '#1a0f33');
    ctx.restore();
  }
}

// ------------------------------------------------------------- grain
let noisePat = null;
export function noisePattern(ctx) {
  if (noisePat) return noisePat;
  const n = document.createElement('canvas');
  n.width = n.height = 128;
  const nc = n.getContext('2d');
  const img = nc.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nc.putImageData(img, 0, 0);
  noisePat = ctx.createPattern(n, 'repeat');
  return noisePat;
}


// ---------------------------------------------------- ombres portées
// Pas de ctx.filter : beaucoup trop coûteux à l'image. On empile trois
// polygones concentriques à faible opacité, ça suffit à faire un bord doux.
function softPoly(ctx, pts, a, color = '#2b3160') {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length; cy /= pts.length;
  const layers = [[1.07, a * 0.35], [1.0, a * 0.5], [0.9, a * 0.55]];
  ctx.save();
  for (const [k, al] of layers) {
    ctx.globalAlpha = al;
    poly(ctx, pts.map(p => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k })), color);
  }
  ctx.restore();
}

// projette l'empreinte d'un volume au sol, dans la direction du soleil
export function castBox(ctx, x, y, w, d, h, a = null, zBase = 0) {
  a = a === null ? LIGHT.shadowA : a * (LIGHT.shadowA / 0.26);
  if (a < 0.02) return;
  const ox = h * LIGHT.dx, oy = h * LIGHT.dy;
  softPoly(ctx, [
    P(x, y, zBase), P(x + w, y, zBase),
    P(x + w + ox, y + oy, zBase), P(x + w + ox, y + d + oy, zBase),
    P(x + ox, y + d + oy, zBase), P(x, y + d, zBase),
  ], a);
}

// ombre allongée d'un petit objet (arbre, personnage, lampadaire)
export function castBlob(ctx, x, y, r, h, a = null, zBase = 0) {
  a = a === null ? LIGHT.shadowA * 0.9 : a * (LIGHT.shadowA / 0.26);
  if (a < 0.02) return;
  const ox = h * LIGHT.dx * 0.5, oy = h * LIGHT.dy * 0.5;
  const p0 = P(x, y, zBase), p1 = P(x + ox * 2, y + oy * 2, zBase);
  ctx.save();
  ctx.strokeStyle = '#2b3160'; ctx.lineCap = 'round';
  for (const [k, al] of [[1.6, a * 0.3], [1.15, a * 0.45], [0.75, a * 0.5]]) {
    ctx.globalAlpha = al;
    ctx.lineWidth = r * HW * k;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }
  ctx.restore();
}

// flaque de lumière projetée au sol par une source ponctuelle
export function lightPool(ctx, x, y, r, color = '255,205,120', strength = 0.5, z = 0) {
  if (strength <= 0.01) return;
  const p = P(x, y, z);
  const R = r * HW;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(p.x, p.y); ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, R);
  g.addColorStop(0, `rgba(${color},${0.34 * strength})`);
  g.addColorStop(0.5, `rgba(${color},${0.13 * strength})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --------------------------------------------------------- ruines
export function pillar(ctx, x, y, z, h, color = '#ded3b6', broken = false) {
  castBlob(ctx, x + 0.2, y + 0.2, 0.42, h, 0.22, z);
  box(ctx, x, y, z, 0.42, 0.42, 0.12, shade(color, -0.06), { round: 4 });
  const n = Math.max(1, Math.round(h / 0.34));
  for (let i = 0; i < n; i++) {
    const hh = (i === n - 1 && broken) ? 0.18 : 0.32;
    const ins = 0.05 + (i % 2) * 0.012;
    box(ctx, x + ins, y + ins, z + 0.12 + i * 0.34, 0.42 - ins * 2, 0.42 - ins * 2, hh, color, { round: 4 });
  }
  if (!broken) box(ctx, x - 0.03, y - 0.03, z + 0.12 + n * 0.34, 0.48, 0.48, 0.12, shade(color, 0.05), { round: 4 });
}

export function arch(ctx, x, y, z, span = 2.2, color = '#ded3b6') {
  pillar(ctx, x, y, z, 1.5, color);
  pillar(ctx, x, y + span - 0.42, z, 1.5, color);
  const top = z + 1.86;
  box(ctx, x - 0.04, y - 0.06, top, 0.5, span + 0.12, 0.3, shade(color, 0.03), { round: 5 });
  box(ctx, x + 0.02, y + 0.16, top + 0.3, 0.38, span - 0.32, 0.16, shade(color, -0.05), { round: 4 });
}
