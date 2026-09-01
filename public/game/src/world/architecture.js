// =====================================================================
//  ARCHITECTURE — recettes de dessin des bâtiments et du sol
// =====================================================================
import { toScreen } from '../core/iso.js';
import {
  INK, box, slab, poly, gableRoof, face, awning, signboard, windowRow, doorway,
  plant, tree, acUnit, lantern, crate, flag, shade, shadow, rrect, line2, roundPoly, tileCube,
  smoke, alpha, hsl, castBox, castBlob, pillar, arch, time as artTime, FW, FH
} from '../core/art.js';
import { VOID, PAVE, ROAD, TURF, PLAZA, TILE_Z } from './city.js';

const P = (x, y, z) => toScreen(x, y, z);
const FSIDE = b => b.face === 'right' ? 'right' : 'left';
const span = b => FSIDE(b) === 'right' ? b.d : b.w;
// point sur la façade : u = distance depuis le coin gauche de la devanture
function fp(b, u, z) {
  return FSIDE(b) === 'right' ? [b.x + b.w, b.y + b.d - u, z] : [b.x + u, b.y + b.d, z];
}

// ---------------------------------------------------------------- SOL
// Des tuiles-cubes arrondies, avec du relief : gazon surélevé, rue creusée.
const TILE = {
  [PAVE]:  { top: ['#92d566', '#8acc5e'], side: '#a97645', z: TILE_Z[PAVE] },
  [PLAZA]: { top: ['#f0e5c9', '#e9ddbc'], side: '#b89d76', z: TILE_Z[PLAZA] },
  [ROAD]:  { top: ['#ddd2b6', '#d6cbad'], side: '#a98f68', z: TILE_Z[ROAD] },
  [TURF]:  { top: ['#7cc255', '#74b94e'], side: '#9c6c33', z: TILE_Z[TURF] },
};
const SOIL_TOP = '#b4763e', SOIL_MID = '#8f5c33', SOIL_BOT = '#3e2c4a';
const PLINTH = 2.0;
const INSET = 0.035;      // l'espace entre deux dalles
const CUBE_H = 0.17;      // épaisseur visible d'une dalle (plate, façon TUNIC)

export function elevOf(city, x, y) {
  const t = city.tile(x | 0, y | 0);
  return t === VOID ? 0 : (TILE[t] || TILE[PAVE]).z;
}

export function drawGround(ctx, city, cam) {
  let x0 = 0, y0 = 0, x1 = city.w, y1 = city.h;
  if (cam) {
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for (const [px, py] of [[0, 0], [cam.w, 0], [0, cam.h], [cam.w, cam.h]]) {
      const w = cam.unproject(px, py);
      mnx = Math.min(mnx, w.x); mxx = Math.max(mxx, w.x);
      mny = Math.min(mny, w.y); mxy = Math.max(mxy, w.y);
    }
    x0 = Math.max(0, Math.floor(mnx) - 3); x1 = Math.min(city.w, Math.ceil(mxx) + 4);
    y0 = Math.max(0, Math.floor(mny) - 3); y1 = Math.min(city.h, Math.ceil(mxy) + 5);
  }

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const t = city.tile(x, y);
      if (t === VOID) continue;
      const def = TILE[t] || TILE[PAVE];
      const z = def.z;
      const top = def.top[(x + y) % 2];
      const tr = city.tile(x + 1, y), tl = city.tile(x, y + 1);

      // socle vers le vide
      if (tr === VOID) plinth(ctx, x + 1, y, 'right', z);
      if (tl === VOID) plinth(ctx, x, y + 1, 'left', z);

      drawCube(ctx, x, y, z, top, def.side);

      // petits détails posés sur la tuile
      tileDetail(ctx, x, y, z, t);

      if (t === ROAD && (x + y) % 4 === 0) {
        const p1 = P(x + 0.5, y + 0.25, z + 0.01), p2 = P(x + 0.5, y + 0.75, z + 0.01);
        line2(ctx, p1, p2, 'rgba(255,255,255,.75)', 3.4);
      }
      if ((y > 0 && city.blocked[city.idx(x, y - 1)]) || (x > 0 && city.blocked[city.idx(x - 1, y)])) {
        const a = x + INSET, b = y + INSET, w = 1 - INSET * 2;
        ctx.save(); ctx.globalAlpha = 0.09;
        roundPoly(ctx, [P(a, b, z), P(a + w, b, z), P(a + w, b + w, z), P(a, b + w, z)], 8, '#2a1030');
        ctx.restore();
      }
    }
  }
}

// un cube de sol : silhouette, deux flancs saturés, dessus pâle arrondi
export function drawCube(ctx, x, y, z, top, side) {
  const a = x + INSET, b = y + INSET, w = 1 - INSET * 2;
  const A = P(a, b, z), B = P(a + w, b, z), C = P(a + w, b + w, z), D = P(a, b + w, z);
  const Br = P(a + w, b, z - CUBE_H), Cr = P(a + w, b + w, z - CUBE_H), Dr = P(a, b + w, z - CUBE_H);
  roundPoly(ctx, [A, B, Br, Cr, Dr, D], 6, hsl(side, -0.14, 0.03));
  roundPoly(ctx, [B, C, Cr, Br], 3, lgrad(ctx, B, Br, hsl(side, 0.05, 0.03), hsl(side, -0.15, 0.07)));
  roundPoly(ctx, [D, C, Cr, Dr], 3, lgrad(ctx, D, Dr, hsl(side, -0.03, 0.05), hsl(side, -0.20, 0.08)));
  roundPoly(ctx, [A, B, C, D], 6, lgrad(ctx, A, C, hsl(top, 0.06, -0.04), hsl(top, -0.05, 0.02)));
  ctx.strokeStyle = alpha(hsl(top, 0.16, 0), 0.55); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.lineTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
}

// fleurs, cailloux : ce qui donne vie au sol
const FLOWERS = ['#ff7ab8', '#ffd45e', '#ff9a6c', '#f4f0ff'];
function tileDetail(ctx, x, y, z, t) {
  const h = (x * 73856093 ^ y * 19349663) >>> 0;
  if (t === TURF || (t === PAVE && h % 3 === 0)) {
    const n = h % 3;
    for (let i = 0; i <= n; i++) {
      const rx = ((h >> (i * 3 + 2)) % 100) / 100 * 0.6 + 0.2;
      const ry = ((h >> (i * 5 + 4)) % 100) / 100 * 0.6 + 0.2;
      const p = P(x + rx, y + ry, z + 0.01);
      const sw = Math.sin(artTime() * 1.6 + x + y + i) * 0.8;
      ctx.beginPath();
      ctx.ellipse(p.x + sw, p.y - 3, 2.6, 2.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = FLOWERS[(h >> i) % FLOWERS.length]; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x + sw * 0.5, p.y, 1.6, 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3fa83f'; ctx.fill();
    }
  } else if (t === PLAZA && h % 5 === 0) {
    const rx = (h % 60) / 100 + 0.2, ry = ((h >> 7) % 60) / 100 + 0.2;
    const p = P(x + rx, y + ry, z);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 3.2, 1.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,125,90,.28)'; ctx.fill();
  }
}

// flanc de tuile vers le vide : terre + arrondi en bas
function plinth(ctx, ex, ey, dir, z) {
  const a = P(ex, ey, z);
  const b = dir === 'right' ? P(ex, ey + 1, z) : P(ex + 1, ey, z);
  const a2 = P(ex, ey, z - PLINTH);
  const b2 = dir === 'right' ? P(ex, ey + 1, z - PLINTH) : P(ex + 1, ey, z - PLINTH);
  const k = dir === 'right' ? 0 : -0.07;
  poly(ctx, [a, b, b2, a2], lgrad(ctx, a, a2, hsl(SOIL_TOP, k, 0.06), hsl(SOIL_BOT, k, 0)));
  const m = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
  ctx.beginPath();
  ctx.moveTo(a2.x, a2.y - 5);
  ctx.quadraticCurveTo(m.x, m.y + 30, b2.x, b2.y - 5);
  ctx.closePath();
  ctx.fillStyle = hsl(SOIL_BOT, k - 0.04, 0); ctx.fill();
}

function lgrad(ctx, a, b, c0, c1) {
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}

// ------------------------------------------------------------- ÉLÉMENTS
function storefront(ctx, b, env, opts = {}) {
  const s = FSIDE(b), L = span(b), h = opts.h ?? 1.7;
  box(ctx, b.x, b.y, 0, b.w, b.d, h, b.hue);
  // vitrine
  const glass = env.night ? '#ffd98a' : '#9fe0cd';
  windowRow(ctx, ...fp(b, 0.28, 1.05), s, L - 1.45, 0.6, Math.max(1, Math.round(L - 1.5)), glass);
  // porte
  doorway(ctx, ...fp(b, L - 0.92, 1.25), s, 0.6, 1.25, shade(b.hue, -0.35));
  return h;
}

// tout ce qui dépasse de la façade : dessiné APRÈS les étages
function storefrontFront(ctx, b, h, opts = {}) {
  const s = FSIDE(b), L = span(b);
  if (opts.awning !== false) {
    if (s === 'left') awning(ctx, b.x + 0.12, b.y + b.d, h - 0.2, b.w - 0.24, 0.45, '#f6f2e7', b.roof, 'y');
    else awning(ctx, b.x + b.w, b.y + 0.12, h - 0.2, 0.45, b.d - 0.24, '#f6f2e7', b.roof, 'x');
  }
  signboard(ctx, ...fp(b, 0.12, h + 0.62), s, L - 0.24, 0.5, b.sign, '#f6f2e7', shade(b.roof, -0.3));
  lantern(ctx, ...fp(b, 0.42, 0).slice(0, 2), h - 0.28, '#ffc857');
  lantern(ctx, ...fp(b, L - 0.42, 0).slice(0, 2), h - 0.28, '#ff9ecb');
}

function upperFloor(ctx, b, z, env, hh = 1.0) {
  const s = FSIDE(b);
  let ux, uy, uw, ud, axis;
  if (s === 'left') { ux = b.x + 0.1; uy = b.y + 0.35; uw = b.w - 0.2; ud = b.d - 0.5; axis = 'x'; }
  else { ux = b.x + 0.35; uy = b.y + 0.1; uw = b.w - 0.5; ud = b.d - 0.2; axis = 'y'; }
  box(ctx, ux, uy, z, uw, ud, hh, shade(b.hue, 0.08));
  const glass = env.night ? '#ffd98a' : '#bfe6f0';
  const sub = { x: ux, y: uy, w: uw, d: ud, face: b.face };
  windowRow(ctx, ...fp(sub, 0.28, z + hh - 0.26), s, span(sub) - 0.56, 0.58,
    Math.max(1, Math.round(span(sub) - 0.5)), glass);
  gableRoof(ctx, ux, uy, z + hh, uw, ud, 0.78, b.roof, axis, 0.13);
  return { ux, uy, uw, ud, top: z + hh };
}

function terraceProps(ctx, b, z, env) {
  const s = FSIDE(b);
  if (s === 'left') { acUnit(ctx, b.x + b.w - 0.9, b.y + b.d - 0.42, z, 0.45); }
  else { acUnit(ctx, b.x + b.w - 0.45, b.y + 0.15, z, 0.45); }
}

// ------------------------------------------------------------ STYLES
const STYLES = {
  shop(ctx, b, env) {
    const h = storefront(ctx, b, env);
    terraceProps(ctx, b, h, env);
    upperFloor(ctx, b, h, env, 1.2);
    storefrontFront(ctx, b, h);
    const s = FSIDE(b);
    if (b.van) drawVan(ctx, s === 'left' ? b.x + b.w + 0.5 : b.x + 0.3,
      s === 'left' ? b.y + b.d + 0.2 : b.y + b.d + 0.7);
  },

  house(ctx, b, env) {
    const h = storefront(ctx, b, env, { awning: false });
    // petit perron
    const s = FSIDE(b);
    if (s === 'left') {
      box(ctx, b.x + b.w - 1.4, b.y + b.d, 0, 1.1, 0.5, 0.22, '#c8836b');
      box(ctx, b.x + b.w - 1.5, b.y + b.d + 0.5, 0, 1.3, 0.35, 0.1, '#b3624f');
    } else {
      box(ctx, b.x + b.w, b.y + 0.3, 0, 0.5, 1.1, 0.22, '#c8836b');
      box(ctx, b.x + b.w + 0.5, b.y + 0.2, 0, 0.35, 1.3, 0.1, '#b3624f');
    }
    terraceProps(ctx, b, h, env);
    const up = upperFloor(ctx, b, h, env, 1.0);
    storefrontFront(ctx, b, h, { awning: false });
    // balcon
    if (s === 'left') {
      box(ctx, b.x + 0.15, b.y + b.d - 0.45, h, b.w - 0.3, 0.42, 0.06, '#c8836b');
      for (let i = 0; i < 5; i++)
        box(ctx, b.x + 0.2 + i * (b.w - 0.5) / 4, b.y + b.d - 0.12, h, 0.06, 0.06, 0.34, '#f6f2e7');
    }
    plant(ctx, ...(s === 'left' ? [b.x + 0.35, b.y + b.d + 0.4] : [b.x + b.w + 0.4, b.y + b.d - 0.3]), 0, 0.85);
  },

  tower2(ctx, b, env) {
    const glass = env.night ? '#ffd98a' : '#bfe6f0';
    let z = 0;
    const floors = 3;
    for (let i = 0; i < floors; i++) {
      const ins = i * 0.12;
      const fb = { x: b.x + ins, y: b.y + ins, w: b.w - ins * 2, d: b.d - ins * 2, face: b.face };
      const hh = i === 0 ? 1.3 : 1.05;
      box(ctx, fb.x, fb.y, z, fb.w, fb.d, hh, i % 2 ? shade(b.hue, 0.1) : b.hue);
      windowRow(ctx, ...fp(fb, 0.3, z + hh - 0.2), FSIDE(b), span(fb) - 0.6, 0.62,
        Math.max(2, Math.round(span(fb) - 0.6)), glass);
      // corniche
      box(ctx, fb.x - 0.06, fb.y - 0.06, z + hh, fb.w + 0.12, fb.d + 0.12, 0.1, shade(b.roof, -0.05));
      z += hh + 0.1;
    }
    // toit terrasse
    const tb = { x: b.x + 0.3, y: b.y + 0.3, w: b.w - 0.6, d: b.d - 0.6, face: b.face };
    box(ctx, tb.x, tb.y, z, tb.w, tb.d, 0.12, shade(b.roof, -0.2));
    acUnit(ctx, b.x + b.w - 0.9, b.y + 0.35, z + 0.12, 0.42);
    if (b.antenna) {
      box(ctx, b.x + 0.55, b.y + 0.55, z, 0.1, 0.1, 1.5, '#f6f2e7');
      const p = P(b.x + 0.6, b.y + 0.6, z + 1.55);
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3ea5'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    }
    doorway(ctx, ...fp(b, span(b) - 1.1, 1.05), FSIDE(b), 0.7, 1.05, shade(b.hue, -0.38));
    signboard(ctx, ...fp(b, 0.2, 1.28), FSIDE(b), span(b) - 0.4, 0.46, b.sign, '#f6f2e7', shade(b.roof, -0.35));
    flag(ctx, ...(FSIDE(b) === 'left' ? [b.x + b.w + 0.25, b.y + b.d - 0.2] : [b.x + b.w - 0.2, b.y + b.d + 0.25]), 0);
  },

  tower(ctx, b, env) {
    // la tour du major : verre + or
    let z = 0;
    const floors = 6;
    for (let i = 0; i < floors; i++) {
      const ins = i * 0.16;
      const fb = { x: b.x + ins, y: b.y + ins, w: b.w - ins * 2, d: b.d - ins * 2, face: b.face };
      box(ctx, fb.x, fb.y, z, fb.w, fb.d, 1.0, i % 2 ? '#cdd8ee' : b.hue);
      windowRow(ctx, ...fp(fb, 0.25, z + 0.82), FSIDE(b), span(fb) - 0.5, 0.6,
        Math.max(2, Math.round((span(fb) - 0.5) * 1.4)), env.night ? '#ffd98a' : '#8fd6e8');
      box(ctx, fb.x - 0.08, fb.y - 0.08, z + 1.0, fb.w + 0.16, fb.d + 0.16, 0.09, '#ffc857');
      z += 1.09;
    }
    const tb = { x: b.x + 1.0, y: b.y + 1.0, w: b.w - 2, d: b.d - 2 };
    box(ctx, tb.x, tb.y, z, tb.w, tb.d, 0.8, '#ffc857');
    gableRoof(ctx, tb.x, tb.y, z + 0.8, tb.w, tb.d, 0.7, '#8f5fc9', 'x');
    doorway(ctx, ...fp(b, span(b) / 2 - 0.5, 1.0), FSIDE(b), 1.0, 1.0, '#7a5a20');
    signboard(ctx, ...fp(b, 0.3, 1.62), FSIDE(b), span(b) - 0.6, 0.48, b.sign, '#ffc857', '#3a2400');
  },

  club(ctx, b, env) {
    const s = FSIDE(b), L = span(b);
    box(ctx, b.x, b.y, 0, b.w, b.d, 1.85, b.hue);
    // bande de néon qui court sur la façade
    face(ctx, ...fp(b, 0.1, 0.55), s, c => {
      c.shadowColor = 'rgba(79,191,159,.9)'; c.shadowBlur = 12;
      c.strokeStyle = '#4fbf9f'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(0, 0); c.lineTo((L - 0.2) * FW, 0); c.stroke();
      c.shadowBlur = 0;
    });
    box(ctx, b.x - 0.1, b.y - 0.1, 1.85, b.w + 0.2, b.d + 0.2, 0.22, shade(b.roof, -0.05));
    // porte d'acier + marquise
    doorway(ctx, ...fp(b, L / 2 - 0.5, 1.3), s, 1.0, 1.3, '#20182f');
    if (s === 'left') awning(ctx, b.x + L / 2 - 0.75, b.y + b.d, 1.55, 1.5, 0.42, '#2a1140', '#ff3ea5', 'y');
    else awning(ctx, b.x + b.w, b.y + L / 2 - 0.75, 1.55, 0.42, 1.5, '#2a1140', '#ff3ea5', 'x');
    // enseigne néon
    const flick = 0.7 + 0.3 * Math.abs(Math.sin(env.t * 3.1)) * (Math.sin(env.t * 11) > -0.85 ? 1 : 0.15);
    face(ctx, ...fp(b, 0.3, 2.32), s, c => {
      const w = (L - 0.6) * FW, h = 0.52 * FH;
      c.shadowColor = 'rgba(255,62,165,.9)'; c.shadowBlur = 20 * flick;
      rrect(c, 0, 0, w, h, 7, '#2a1140', '#ff3ea5', 3);
      c.shadowBlur = 0;
      c.fillStyle = `rgba(255,150,210,${flick})`;
      c.font = `800 ${h * 0.66}px "Baloo 2", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(b.sign, w / 2, h / 2 + 1);
    });
    // enceintes de part et d'autre
    const outX = s === 'left' ? b.x + 0.3 : b.x + b.w + 0.35;
    const outY = s === 'left' ? b.y + b.d + 0.35 : b.y + 0.3;
    for (const k of [0, 1]) {
      const ox = outX + (s === 'left' ? k * (L - 1.1) : 0);
      const oy = outY + (s === 'left' ? 0 : k * (L - 1.1));
      box(ctx, ox, oy, 0, 0.5, 0.5, 1.0, '#2b2140');
      box(ctx, ox + 0.03, oy + 0.03, 1.0, 0.44, 0.44, 0.06, '#3b2d56');
      face(ctx, ox, oy + 0.5, 0.9, 'left', c => {
        c.fillStyle = '#151024';
        c.beginPath(); c.arc(0.25 * FW, 0.28 * FH, 6, 0, Math.PI * 2); c.fill();
        c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
      });
    }
    // faisceaux au toit la nuit
    if (env.night) {
      const p = P(b.x + b.w / 2, b.y + b.d / 2, 2.1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = env.t * 0.7 + i * 2.1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(a) * 190, p.y - 120 + Math.sin(a) * 40);
        ctx.lineTo(p.x + Math.cos(a + 0.22) * 190, p.y - 120 + Math.sin(a + 0.22) * 40);
        ctx.closePath();
        ctx.fillStyle = ['rgba(255,62,165,.13)', 'rgba(79,191,159,.13)', 'rgba(155,107,214,.13)'][i];
        ctx.fill();
      }
      ctx.restore();
    }
  },

  ware(ctx, b, env) {
    box(ctx, b.x, b.y, 0, b.w, b.d, 1.7, b.hue);
    gableRoof(ctx, b.x, b.y, 1.7, b.w, b.d, 0.55, b.roof, FSIDE(b) === 'left' ? 'x' : 'y', 0.2);
    const s = FSIDE(b), L = span(b);
    // porte de garage
    face(ctx, ...fp(b, L / 2 - 0.75, 1.25), s, c => {
      const w = 1.5 * FW, h = 1.25 * FH;
      rrect(c, 0, 0, w, h, 4, '#cfd8e4', INK, 2.4);
      c.strokeStyle = '#93a3b8'; c.lineWidth = 2;
      for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(3, h * i / 6); c.lineTo(w - 3, h * i / 6); c.stroke(); }
    });
    signboard(ctx, ...fp(b, 0.2, 1.95), s, L - 0.4, 0.46, b.sign, '#f6f2e7', shade(b.roof, -0.3));
    const cx = s === 'left' ? b.x + 0.35 : b.x + b.w + 0.35;
    const cy = s === 'left' ? b.y + b.d + 0.35 : b.y + 0.4;
    crate(ctx, cx, cy, 0, 0.5); crate(ctx, cx + 0.55, cy + 0.1, 0, 0.45);
    crate(ctx, cx + 0.1, cy + 0.08, 0.4, 0.4);
  },
};

// chantier (bâtiment pas encore débloqué)
function construction(ctx, b) {
  const T = artTime();
  // terrassement
  slab(ctx, b.x, b.y, 0.02, b.w, b.d, '#8a6a4f');
  ctx.save(); ctx.globalAlpha = 0.3;
  slab(ctx, b.x + 0.2, b.y + 0.2, 0.03, b.w - 0.4, b.d - 0.4, '#6d5240');
  ctx.restore();

  // fondations : un liseré de béton et quelques amorces de murs
  const ix = b.x + 0.5, iy = b.y + 0.5, iw = b.w - 1.0, id = b.d - 1.0;
  box(ctx, ix, iy, 0, iw, 0.22, 0.3, '#cfc6d6', { round: 3 });
  box(ctx, ix, iy + id - 0.22, 0, iw, 0.22, 0.3, '#c6bccd', { round: 3 });
  box(ctx, ix, iy, 0, 0.22, id, 0.3, '#c6bccd', { round: 3 });
  box(ctx, ix + iw - 0.22, iy, 0, 0.22, id, 0.3, '#cfc6d6', { round: 3 });
  // amorces de poteaux + ferraillage
  for (const [ox, oy] of [[0, 0], [iw - 0.24, 0], [0, id - 0.24], [iw - 0.24, id - 0.24]]) {
    box(ctx, ix + ox, iy + oy, 0.3, 0.24, 0.24, 0.55, '#bdb2cc', { round: 2 });
    box(ctx, ix + ox + 0.08, iy + oy + 0.08, 0.85, 0.05, 0.05, 0.32, '#e0b45f', { round: 1 });
  }
  // tas de sable
  const sp = P(ix + iw * 0.5, iy + id * 0.55, 0.02);
  ctx.beginPath();
  ctx.moveTo(sp.x - 26, sp.y); ctx.quadraticCurveTo(sp.x, sp.y - 26, sp.x + 26, sp.y);
  ctx.closePath();
  const sg = ctx.createLinearGradient(sp.x - 26, sp.y - 20, sp.x + 26, sp.y);
  sg.addColorStop(0, '#e3c893'); sg.addColorStop(1, '#b3915f');
  ctx.fillStyle = sg; ctx.fill();

  // grue
  const cx = b.x + b.w - 0.55, cy = b.y + 0.45;
  box(ctx, cx - 0.1, cy - 0.1, 0, 0.2, 0.2, 3.1, '#e0b45f', { round: 1.5 });
  box(ctx, cx - 0.08, cy - 0.08, 3.1, 0.16, 0.16, 0.12, '#c99b4e', { round: 1 });
  const jibLen = Math.min(2.6, b.w + 0.6);
  box(ctx, cx - jibLen, cy - 0.07, 3.22, jibLen + 0.2, 0.14, 0.12, '#e0b45f', { round: 1 });
  const hook = cx - jibLen * (0.55 + 0.2 * Math.sin(T * 0.6));
  const a = P(hook, cy, 3.22), h2 = P(hook, cy, 1.5 + Math.sin(T * 0.9) * 0.35);
  ctx.strokeStyle = 'rgba(40,20,60,.6)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(h2.x, h2.y); ctx.stroke();
  box(ctx, hook - 0.16, cy - 0.16, 1.15 + Math.sin(T * 0.9) * 0.35, 0.32, 0.32, 0.3, '#b98a63', { round: 2 });

  // matériel au sol
  crate(ctx, b.x + 0.3, b.y + b.d - 0.95, 0, 0.5, '#b98a63');
  crate(ctx, b.x + 0.75, b.y + b.d - 0.7, 0, 0.42, '#cf9c6e');
  box(ctx, b.x + b.w - 1.3, b.y + b.d - 0.9, 0, 0.5, 0.5, 0.42, '#e0705c', { round: 4 });

  // palissade + panneau
  const px = b.x + 0.2, py = b.y + b.d + 0.04;
  box(ctx, px, py, 0, 0.08, 0.08, 1.0, '#a98a5e', { round: 1 });
  box(ctx, px + Math.max(1.0, b.w - 0.8), py, 0, 0.08, 0.08, 1.0, '#a98a5e', { round: 1 });
  signboard(ctx, px, py + 0.06, 1.05, 'left', Math.max(1.1, b.w - 0.7), 0.5, 'BIENTÔT', '#f0d9a8', '#8a5a20');
  face(ctx, px, py + 0.06, 1.3, 'left', c => {
    const w = Math.max(1.1, b.w - 0.7) * FW;
    c.strokeStyle = 'rgba(60,35,20,.45)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(w / 2, 6 + Math.sin(T * 2) * 2, w, 0); c.stroke();
    for (let i = 1; i < 6; i++) {
      const t = i / 6, xx = t * w, yy = 4 * Math.sin(Math.PI * t) + 1 + Math.sin(T * 2) * 1.4;
      c.beginPath(); c.moveTo(xx - 3, yy); c.lineTo(xx + 3, yy); c.lineTo(xx, yy + 6); c.closePath();
      c.fillStyle = ['#ff9ecb', '#ffd67a', '#7fe3c0'][i % 3]; c.fill();
    }
  });
}

export function castBuildingShadow(ctx, b, unlocked) {
  const h = unlocked ? buildingHeight(b) : 0.6;
  castBox(ctx, b.x, b.y, b.w, b.d, h, 0.24);
}
function buildingHeight(b) {
  switch (b.style) {
    case 'tower': return 7.5;
    case 'tower2': return 4.4;
    case 'club': return 2.1;
    case 'ware': return 2.3;
    case 'house': return 3.4;
    default: return 3.6;
  }
}

export function drawBuilding(ctx, b, env) {
  shadow(ctx, b.x + b.w / 2, b.y + b.d / 2, Math.max(b.w, b.d) * 0.42, 0, 0.22);
  if (!env.unlocked) { construction(ctx, b); return; }
  (STYLES[b.style] || STYLES.shop)(ctx, b, env);
}

// ------------------------------------------------------------- PROPS
function drawVan(ctx, x, y) {
  const c = '#3fb69a', W = 1.7, D = 0.95;
  shadow(ctx, x + W / 2, y + D / 2, 0.75, 0, 0.26);
  // roues
  for (const wx of [x + 0.3, x + W - 0.3]) {
    const p = P(wx, y + D, 0.17);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 7.5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#241033'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 3, 3.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#cfe8e0'; ctx.fill();
  }
  // caisse basse (crème) + caisse haute (teal)
  box(ctx, x, y, 0.14, W, D, 0.42, '#efe6d2');
  box(ctx, x, y, 0.56, W, D, 0.62, c);
  // pare-brise et vitres latérales
  face(ctx, x + 0.1, y + D, 1.06, 'left', k => {
    rrect(k, 0, 0, 0.62 * FW, 0.34 * FH, 3, '#bfe6f0', INK, 2);
    rrect(k, 0.72 * FW, 0, 0.52 * FW, 0.34 * FH, 3, '#bfe6f0', INK, 2);
  });
  face(ctx, x + W, y + D - 0.12, 1.06, 'right', k => {
    rrect(k, 0, 0, 0.7 * FW, 0.36 * FH, 3, '#d9f2f7', INK, 2);
  });
  // bande de séparation + phare
  face(ctx, x + 0.06, y + D, 0.58, 'left', k => {
    k.fillStyle = '#efe6d2';
    k.fillRect(0, 0, (W - 0.12) * FW, 3);
    k.fillStyle = '#ffc857';
    k.beginPath(); k.arc(0.16 * FW, 0.16 * FH, 3.4, 0, Math.PI * 2); k.fill();
    k.strokeStyle = INK; k.lineWidth = 1.4; k.stroke();
  });
  // caisses de disques sur le toit
  box(ctx, x + 0.25, y + 0.2, 1.18, 0.5, 0.5, 0.3, '#d9a86f');
  box(ctx, x + 0.85, y + 0.28, 1.18, 0.45, 0.42, 0.26, '#c08d5c');
}

export function drawProp(ctx, pr, env) {
  const { x, y } = pr;
  const z0 = pr.z || 0;
  const T = artTime();
  switch (pr.type) {
    case 'statue': {
      shadow(ctx, x, y, 0.9, z0, 0.3);
      box(ctx, x - 0.62, y - 0.62, z0, 1.24, 1.24, 0.3, '#cbbce8', { round: 4 });
      box(ctx, x - 0.42, y - 0.42, z0 + 0.3, 0.84, 0.84, 0.26, '#b8a4dd', { round: 4 });
      box(ctx, x - 0.2, y - 0.2, z0 + 0.56, 0.4, 0.4, 0.5, '#9c85c9', { round: 3 });
      // le vinyle tourne lentement
      const p = P(x, y, z0 + 1.06);
      ctx.save(); ctx.translate(p.x, p.y - 24);
      const tilt = 0.22;
      ctx.rotate(-tilt);
      const R = 34;
      const g = ctx.createRadialGradient(-R * .35, -R * .4, 2, 0, 0, R);
      g.addColorStop(0, '#4a3560'); g.addColorStop(.5, '#241033'); g.addColorStop(1, '#140a20');
      ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.98, 0, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.rotate(T * 0.55);
      ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1.1;
      for (let r = 9; r < R - 3; r += 4) { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.98, 0, 0, Math.PI * 2); ctx.stroke(); }
      // reflet qui balaye
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, R * .72, R * .7, 0, -0.5, 0.5); ctx.stroke();
      ctx.restore();
      const gc = ctx.createRadialGradient(-2, -3, 1, 0, 0, 9);
      gc.addColorStop(0, '#ff7ec2'); gc.addColorStop(1, '#e01f7e');
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 8.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = gc; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fillStyle = '#2a1140'; ctx.fill();
      ctx.restore();
      break;
    }
    case 'lamp': {
      shadow(ctx, x, y, 0.26, z0, 0.24);
      box(ctx, x - 0.12, y - 0.12, z0, 0.24, 0.24, 0.14, '#cfc4dd', { round: 2 });
      box(ctx, x - 0.055, y - 0.055, z0 + 0.14, 0.11, 0.11, 1.95, '#efe7dc', { round: 1.5 });
      const p = P(x, y, z0 + 2.09);
      ctx.save(); ctx.translate(p.x, p.y);
      const lit = env.night ? 1 : 0.15;
      if (lit > .5) {
        const g = ctx.createRadialGradient(0, -4, 2, 0, -4, 70);
        g.addColorStop(0, 'rgba(255,205,120,.38)'); g.addColorStop(1, 'rgba(255,205,120,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -4, 70, 0, Math.PI * 2); ctx.fill();
      }
      // abat-jour
      const gs = ctx.createLinearGradient(-11, -14, 11, -2);
      gs.addColorStop(0, '#fdf7ea'); gs.addColorStop(1, '#d8cbb8');
      roundPoly(ctx, [{ x: -10, y: -13 }, { x: 10, y: -13 }, { x: 7, y: -2 }, { x: -7, y: -2 }], 3, gs);
      const gb = ctx.createRadialGradient(0, -3, 1, 0, -3, 8);
      gb.addColorStop(0, lit > .5 ? '#fff3cf' : '#e8eef0'); gb.addColorStop(1, lit > .5 ? '#ffcf72' : '#c3ccd2');
      ctx.beginPath(); ctx.ellipse(0, -2.5, 7, 3.4, 0, 0, Math.PI); ctx.fillStyle = gb; ctx.fill();
      ctx.restore();
      break;
    }
    case 'bench': {
      shadow(ctx, x, y, 0.46, z0, 0.22);
      for (const dx of [-0.34, 0.34]) box(ctx, x + dx - 0.05, y - 0.12, z0, 0.1, 0.26, 0.2, '#8a7a9e', { round: 1.5 });
      box(ctx, x - 0.46, y - 0.16, z0 + 0.2, 0.92, 0.34, 0.07, '#d98d6f', { round: 2.5 });
      box(ctx, x - 0.46, y + 0.1, z0 + 0.27, 0.92, 0.08, 0.32, '#c8735a', { round: 2.5 });
      break;
    }
    case 'arch': arch(ctx, x, y, z0, 2.2); break;
    case 'ruin':
      pillar(ctx, x, y, z0, 0.9 + ((x * 7 + y) % 3) * 0.3, '#ded3b6', true);
      break;
    case 'plant': plant(ctx, x, y, z0, 1.0, '#9b6bd6', '#e08a72', x * 1.7 + y); break;
    case 'tree': tree(ctx, x, y, z0, pr.s || 1, x + y * 2, pr.leaf); break;
    case 'crates':
      crate(ctx, x - 0.3, y - 0.3, z0, 0.5, '#c98f63');
      crate(ctx, x + 0.2, y - 0.2, z0, 0.42, '#e0a978');
      crate(ctx, x - 0.25, y - 0.25, z0 + 0.4, 0.42, '#b98a63');
      break;
    case 'truck': {
      drawVan(ctx, x, y);
      break;
    }
  }
}

export function propSort(pr) {
  return pr.x + pr.y;
}
