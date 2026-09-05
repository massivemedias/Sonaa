// =====================================================================
//  LE DESSIN · tout ce qui fabrique une image
//  ---------------------------------------------------------------
//  Style « petit monde en volume » : des cubes arrondis, des faces en
//  degrade, des contours epais et sombres, des couleurs saturees, des
//  reflets blancs. Tout est dessine en canvas 2D une seule fois, puis
//  Phaser affiche les images en WebGL.
//
//  Rien n'est en pixel art : les formes sont lissees, les coins ronds,
//  les ombres douces. C'est le rendu des jeux de gestion mobiles, celui
//  qui donne envie de tapoter.
// =====================================================================
export const HW = 32, HH = 16, HU = 26;
export const ENCRE = '#2a1d33';
export const versEcran = (x, y, z = 0) => ({ x: (x - y) * HW, y: (x + y) * HH - z * HU });
export const versMonde = (sx, sy) => ({ x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 });

// ------------------------------------------------------------- couleurs
export function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function teinte(hex, amt) {
  const [r, g, b] = hex2rgb(hex);
  if (amt >= 0) return rgb2hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgb2hex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}
export function melange(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const alpha = (hex, a) => { const [r, g, b] = hex2rgb(hex); return `rgba(${r},${g},${b},${a})`; };
export const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;

export function toile(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round';
  return { c, g };
}

// ------------------------------------------------------------ primitives
function trace(g, pts) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
}
export function poly(g, pts, fill, stroke = null, lw = 2.5) {
  trace(g, pts);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
export function arrondi(g, x, y, w, h, r, fill, stroke = null, lw = 2.5) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
export function ellipse(g, x, y, rx, ry, fill, stroke = null, lw = 2.5) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function degrade(g, a, b, c1, c2) {
  const gr = g.createLinearGradient(a.x, a.y, b.x, b.y);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  return gr;
}

/* LE CUBE ARRONDI, la brique de tout le decor. Trois faces en degrade, un
   contour epais autour de la silhouette, une arete de lumiere sur le
   dessus. `o.rayon` arrondit la silhouette (les coins de l'image). */
export function cube(g, x, y, z, w, d, h, couleur, o = {}) {
  const P = versEcran;
  const A = P(x, y, z + h), B = P(x + w, y, z + h), C = P(x + w, y + d, z + h), D = P(x, y + d, z + h);
  const Br = P(x + w, y, z), Cr = P(x + w, y + d, z), Dr = P(x, y + d, z);
  const dessus = o.dessus || teinte(couleur, 0.32);
  const droite = o.droite || couleur;
  const gauche = o.gauche || teinte(couleur, -0.22);
  const contour = o.contour === null ? null : (o.contour || ENCRE);
  // silhouette d'abord : un trait epais qui fait le contour arrondi
  if (contour) { poly(g, [A, B, Br, Cr, Dr, D], null, contour, o.lw || 5); }
  poly(g, [D, C, Cr, Dr], degrade(g, D, Dr, teinte(gauche, 0.08), teinte(gauche, -0.18)));
  poly(g, [B, C, Cr, Br], degrade(g, B, Br, teinte(droite, 0.1), teinte(droite, -0.16)));
  poly(g, [A, B, C, D], dessus);
  if (o.brillant !== false && h > 0.2) {
    // le reflet sur le dessus
    g.save(); g.globalAlpha = 0.35;
    poly(g, [A, { x: A.x + (B.x - A.x) * 0.55, y: A.y + (B.y - A.y) * 0.55 }, { x: A.x + (C.x - A.x) * 0.3, y: A.y + (C.y - A.y) * 0.3 }, { x: A.x + (D.x - A.x) * 0.55, y: A.y + (D.y - A.y) * 0.55 }], '#ffffff');
    g.restore();
  }
  if (contour) {
    g.strokeStyle = alpha(contour, 0.55); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(Cr.x, Cr.y); g.stroke();
    g.beginPath(); g.moveTo(D.x, D.y); g.lineTo(C.x, C.y); g.lineTo(B.x, B.y); g.stroke();
  }
}
export function ombre(g, x, y, rx, ry = rx * 0.5, a = 0.22, z = 0) {
  const p = versEcran(x, y, z);
  g.save(); g.globalAlpha = a;
  ellipse(g, p.x, p.y, rx, ry, '#1a1030');
  g.restore();
}
/* Un rectangle pose sur une face verticale (fenetre, porte, enseigne). */
function surFace(g, ox, oy, oz, cote, u, v, w, h, fn) {
  const O = versEcran(ox, oy, oz);
  g.save();
  g.translate(O.x, O.y);
  if (cote === 'gauche') g.transform(1, 0.5, 0, 1, 0, 0); else g.transform(1, -0.5, 0, 1, 0, 0);
  fn(g, u, v, w, h);
  g.restore();
}
function fenetre(g, u, v, w, h, verre = '#8fdcff') {
  arrondi(g, u, v, w, h, 3, '#fff6e0', ENCRE, 2);
  arrondi(g, u + 2, v + 2, w - 4, h - 4, 2, degrade(g, { x: u, y: v }, { x: u, y: v + h }, teinte(verre, 0.35), teinte(verre, -0.1)));
  g.save(); g.globalAlpha = 0.6; g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(u + 3, v + h - 4); g.lineTo(u + w * 0.5, v + 3); g.lineTo(u + w * 0.62, v + 3); g.lineTo(u + 3, v + h - 2); g.closePath(); g.fill();
  g.restore();
}
function porte(g, u, v, w, h, couleur = '#8f5f34') {
  arrondi(g, u, v, w, h, [w / 2, w / 2, 3, 3], couleur, ENCRE, 2.5);
  arrondi(g, u + 3, v + 4, w - 6, h - 6, [w / 2 - 3, w / 2 - 3, 2, 2], teinte(couleur, -0.25));
  ellipse(g, u + w - 5, v + h * 0.55, 1.8, 1.8, '#ffd76a');
}
function panneau(g, u, v, w, h, texte, fond, encre = '#2a1d33', taille = 11) {
  arrondi(g, u, v, w, h, 5, fond, ENCRE, 2.5);
  g.fillStyle = encre; g.font = `900 ${taille}px Nunito, Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texte, u + w / 2, v + h / 2 + 1);
}
function auvent(g, x, y, z, w, d, a, b, dir = 'y') {
  const P = versEcran, chute = 0.28;
  const q = dir === 'y'
    ? [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z - chute), P(x, y + d, z - chute)]
    : [P(x, y, z), P(x, y + d, z), P(x + w, y + d, z - chute), P(x + w, y, z - chute)];
  poly(g, q, a, ENCRE, 3);
  g.save(); trace(g, q); g.clip();
  const n = 7;
  for (let i = 0; i < n; i += 2) {
    const t0 = i / n, t1 = (i + 1) / n;
    const A = { x: q[0].x + (q[1].x - q[0].x) * t0, y: q[0].y + (q[1].y - q[0].y) * t0 };
    const B = { x: q[0].x + (q[1].x - q[0].x) * t1, y: q[0].y + (q[1].y - q[0].y) * t1 };
    const C = { x: q[3].x + (q[2].x - q[3].x) * t1, y: q[3].y + (q[2].y - q[3].y) * t1 };
    const D = { x: q[3].x + (q[2].x - q[3].x) * t0, y: q[3].y + (q[2].y - q[3].y) * t0 };
    poly(g, [A, B, C, D], b);
  }
  g.restore();
  // festons
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const px = q[3].x + (q[2].x - q[3].x) * t, py = q[3].y + (q[2].y - q[3].y) * t;
    ellipse(g, px, py + 2, 3.5, 3, i % 2 ? a : b, ENCRE, 2);
  }
}

// ---------------------------------------------------------------- sol
const HERBE = ['#7ed957', '#84df5d', '#78d351'], PARC = ['#8fe36a', '#95e970', '#89dd64'];
const RUE = ['#d9c6a1', '#dfcca7', '#d3c09b'], PLACE = ['#f2e2c4', '#f6e8cc', '#eddcbe'], TROTTOIR = ['#e9dcc0', '#efe2c6', '#e3d6ba'];
const EAU = '#4fb8ff', FORET = ['#4faa3a', '#55b040', '#49a434'];
export function cuireSol(carte) {
  const w = (carte.w + carte.h) * HW + 8, h = (carte.w + carte.h) * HH + HU * 3 + 40;
  const ox = carte.h * HW + 4, oy = HU * 2 + 4;
  const { c, g } = toile(w, h);
  g.setTransform(1, 0, 0, 1, ox, oy);
  const P = versEcran;
  const T = { 1: HERBE, 2: RUE, 3: PLACE, 4: TROTTOIR, 6: FORET, 7: PARC };
  /* Le socle de l'ile : la terre sous la pelouse, visible sur les bords. */
  const coins = [P(0, 0, 0), P(carte.w, 0, 0), P(carte.w, carte.h, 0), P(0, carte.h, 0)];
  const socle = coins.map((p) => ({ x: p.x, y: p.y + HU * 1.6 }));
  poly(g, [coins[1], socle[1], socle[2], coins[2]], degrade(g, coins[1], socle[1], '#b98b52', '#7a5533'), ENCRE, 4);
  poly(g, [coins[3], socle[3], socle[2], coins[2]], degrade(g, coins[3], socle[3], '#a3773f', '#6a4626'), ENCRE, 4);
  for (let y = 0; y < carte.h; y++) for (let x = 0; x < carte.w; x++) {
    const t = carte.tuile(x, y);
    const pts = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
    if (t === 5) { poly(g, pts, EAU); continue; }
    const pal = T[t] || HERBE;
    poly(g, pts, pal[(x * 7 + y * 3) % 3]);
    if (t === 2) {
      // la rue est creusee d'un cheveu : un liseret clair au nord, sombre au sud
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5;
      if (carte.tuile(x, y - 1) !== 2) { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); g.lineTo(pts[1].x, pts[1].y); g.stroke(); }
      if (carte.tuile(x - 1, y) !== 2) { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); g.lineTo(pts[3].x, pts[3].y); g.stroke(); }
    }
    if (t === 1 || t === 7) {
      // touffes et paquerettes, a graine fixe
      const r = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if (r % 7 === 0) { const p = P(x + 0.3 + (r % 5) / 10, y + 0.3 + (r % 3) / 10); ellipse(g, p.x, p.y, 2.2, 1.4, '#fff3a6'); ellipse(g, p.x, p.y, 0.9, 0.7, '#ff9a3d'); }
      if (r % 11 === 0) { const p = P(x + 0.6, y + 0.5); g.strokeStyle = '#5fbf3c'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - 3, p.y); g.lineTo(p.x - 1, p.y - 5); g.moveTo(p.x, p.y); g.lineTo(p.x + 1, p.y - 6); g.moveTo(p.x + 3, p.y); g.lineTo(p.x + 4, p.y - 4); g.stroke(); }
    }
  }
  // l'etang : un liseret de sable et des reflets
  for (let y = 0; y < carte.h; y++) for (let x = 0; x < carte.w; x++) {
    if (carte.tuile(x, y) !== 5) continue;
    const pts = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
    for (let i = 0; i < 4; i++) {
      const nx = x + [0, 1, 0, -1][i], ny = y + [-1, 0, 1, 0][i];
      if (carte.tuile(nx, ny) !== 5) { g.strokeStyle = '#f2e2b0'; g.lineWidth = 5; g.beginPath(); g.moveTo(pts[i].x, pts[i].y); g.lineTo(pts[(i + 1) % 4].x, pts[(i + 1) % 4].y); g.stroke(); }
    }
    const p = P(x + 0.5, y + 0.5);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - 8, p.y + 2); g.lineTo(p.x + 2, p.y + 2); g.stroke();
  }
  return { canvas: c, ox, oy };
}

// ------------------------------------------------------------ batiments
const HAUTEURS = { boutique: 2.2, bunker: 2.0, atelier: 2.4, radio: 3.2, maison: 2.0, snack: 2.0, bar: 2.2, club: 2.6, bureau: 4.2, temple: 2.2, scene: 1.0, tour: 8 };
export function cuireBatiment(b, ouvert) {
  const marge = 90, haut = (HAUTEURS[b.style] || 2.5) * HU + 130;
  const ancre = versEcran(b.x, b.y, 0);
  const gauche = Math.ceil((b.d + 2) * HW) + marge;
  const w = gauche + Math.ceil((b.w + 2) * HW) + marge;
  const h = haut + Math.ceil((b.w + b.d + 3) * HH) + 60;
  const { c, g } = toile(w, h);
  const dx = Math.floor(ancre.x) - gauche, dy = Math.floor(ancre.y) - haut;
  g.setTransform(1, 0, 0, 1, -dx, -dy);
  if (ouvert) dessinerBatiment(g, b); else dessinerChantier(g, b);
  return { canvas: c, dx, dy };
}

function ombreBatiment(g, b, h) {
  const P = versEcran, sx = 0.35, sy = 0.5;
  const pts = [P(b.x, b.y), P(b.x + b.w, b.y), P(b.x + b.w + h * sx, b.y + h * sy), P(b.x + b.w + h * sx, b.y + b.d + h * sy), P(b.x + h * sx, b.y + b.d + h * sy), P(b.x, b.y + b.d)];
  g.save(); g.globalAlpha = 0.18; g.filter = 'blur(3px)'; poly(g, pts, '#1a1030'); g.restore();
}

function dessinerBatiment(g, b) {
  const st = b.style, H = HAUTEURS[st] || 2.5;
  const mur = b.mur, toit = b.toit;
  ombreBatiment(g, b, H * 0.9);
  // le parvis
  const P = versEcran;
  poly(g, [P(b.x - 0.5, b.y - 0.5), P(b.x + b.w + 0.5, b.y - 0.5), P(b.x + b.w + 0.5, b.y + b.d + 0.5), P(b.x - 0.5, b.y + b.d + 0.5)], 'rgba(255,255,255,0.18)');

  const cote = 'droite';        // la facade avec la porte regarde le sud-est
  const fw = b.w * HW * 2 * 0.5;    // largeur de la face droite en unites de face

  switch (st) {
    case 'maison': {
      cube(g, b.x, b.y, 0, b.w, b.d, 1.7, mur);
      toitPignon(g, b.x, b.y, 1.7, b.w, b.d, 1.1, toit);
      // cheminee
      cube(g, b.x + 0.4, b.y + 0.4, 2.4, 0.5, 0.5, 0.7, '#c9755a');
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        fenetre(g2, 8, -1.45 * HU, 22, 22);
        porte(g2, b.d * HW - 30, -1.35 * HU, 20, 34, '#5fa87f');
      });
      // un vinyle sur la porte, la marque du DJ
      break;
    }
    case 'boutique': case 'temple': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur);
      if (st === 'temple') {
        cube(g, b.x + 0.5, b.y + 0.5, H, b.w - 1, b.d - 1, 0.5, teinte(mur, -0.1));
        cube(g, b.x + 1, b.y + 1, H + 0.5, b.w - 2, b.d - 2, 0.5, teinte(mur, 0.1));
        cube(g, b.x + b.w / 2 - 0.3, b.y + b.d / 2 - 0.3, H + 1, 0.6, 0.6, 0.8, '#ffd23d');
      } else {
        cube(g, b.x - 0.05, b.y - 0.05, H, b.w + 0.1, b.d + 0.1, 0.25, toit);
        cube(g, b.x + 0.6, b.y + 0.6, H + 0.25, 0.7, 0.7, 0.4, '#c8d2d6');
      }
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        fenetre(g2, 8, -1.7 * HU, b.d * HW - 52, 1.1 * HU, '#a6e8ff');
        porte(g2, b.d * HW - 34, -1.45 * HU, 24, 1.45 * HU, teinte(toit, -0.15));
      });
      auvent(g, b.x + b.w, b.y - 0.02, 1.55, 0.6, b.d + 0.04, '#fff6e0', toit, 'x');
      break;
    }
    case 'bunker': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur, { dessus: teinte(mur, 0.2) });
      cube(g, b.x + b.w - 1, b.y, H, 1, 1, 0.8, teinte(mur, -0.15));
      antenne(g, b.x + b.w - 0.5, b.y + 0.5, H + 0.8, 1.6);
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        for (let i = 0; i < 3; i++) fenetre(g2, 8 + i * 22, -1.55 * HU, 14, 12, '#ffd23d');
        porte(g2, b.d * HW - 34, -1.45 * HU, 24, 1.45 * HU, '#4a4260');
      });
      break;
    }
    case 'atelier': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur);
      toitPignon(g, b.x, b.y, H, b.w, b.d, 0.7, toit, 'y');
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        // la porte de garage
        arrondi(g2, 10, -1.9 * HU, b.d * HW - 20, 1.9 * HU, 6, '#d9dee6', ENCRE, 2.5);
        for (let i = 1; i < 5; i++) { g2.strokeStyle = 'rgba(42,29,51,0.35)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(12, -1.9 * HU + i * 0.38 * HU); g2.lineTo(b.d * HW - 12, -1.9 * HU + i * 0.38 * HU); g2.stroke(); }
        arrondi(g2, 18, -1.6 * HU, 16, 16, 3, '#4fbf9f', ENCRE, 2);
      });
      break;
    }
    case 'radio': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur);
      cube(g, b.x, b.y, H, b.w, b.d, 0.2, toit);
      antenne(g, b.x + b.w / 2, b.y + b.d / 2, H + 0.2, 3.2, true);
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) fenetre(g2, 8 + i * 34, -(2.9 - r * 1.1) * HU, 24, 18);
        porte(g2, b.d * HW - 32, -1.45 * HU, 22, 1.45 * HU, '#3a5fa8');
      });
      break;
    }
    case 'snack': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur);
      cube(g, b.x - 0.05, b.y - 0.05, H, b.w + 0.1, b.d + 0.1, 0.25, toit);
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        fenetre(g2, 8, -1.7 * HU, b.d * HW - 48, 1.0 * HU, '#ffe9a6');
        porte(g2, b.d * HW - 32, -1.45 * HU, 22, 1.45 * HU, '#e0705c');
      });
      auvent(g, b.x + b.w, b.y - 0.02, 1.55, 0.6, b.d + 0.04, '#fff6e0', '#e0705c', 'x');
      cube(g, b.x + 0.4, b.y + 0.4, H + 0.25, 0.6, 0.6, 0.35, '#c8d2d6');
      break;
    }
    case 'bar': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur);
      cube(g, b.x - 0.05, b.y - 0.05, H, b.w + 0.1, b.d + 0.1, 0.3, toit);
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        fenetre(g2, 10, -1.75 * HU, 40, 22, '#ffb347');
        porte(g2, b.d * HW - 34, -1.45 * HU, 24, 1.45 * HU, '#3a2a1c');
        // le neon
        g2.strokeStyle = '#ff5cb4'; g2.lineWidth = 3; g2.shadowColor = '#ff5cb4'; g2.shadowBlur = 8;
        g2.beginPath(); g2.roundRect(58, -1.75 * HU, 26, 20, 4); g2.stroke(); g2.shadowBlur = 0;
      });
      break;
    }
    case 'club': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur, { dessus: '#4a4260' });
      cube(g, b.x + 0.3, b.y + 0.3, H, b.w - 0.6, b.d - 0.6, 0.3, '#2a2440');
      for (let i = 0; i < 3; i++) cube(g, b.x + 0.6 + i * 1.3, b.y + b.d - 0.9, H + 0.3, 0.5, 0.5, 0.5, '#5a5070');
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        porte(g2, b.d * HW - 40, -1.6 * HU, 30, 1.6 * HU, '#1c1528');
        g2.strokeStyle = '#ff5cb4'; g2.lineWidth = 4; g2.shadowColor = '#ff5cb4'; g2.shadowBlur = 12;
        g2.beginPath(); g2.moveTo(12, -2.2 * HU); g2.lineTo(b.d * HW - 12, -2.2 * HU); g2.stroke();
        g2.strokeStyle = '#5fd6c8'; g2.shadowColor = '#5fd6c8';
        g2.beginPath(); g2.moveTo(12, -2.0 * HU); g2.lineTo(b.d * HW - 50, -2.0 * HU); g2.stroke();
        g2.shadowBlur = 0;
      });
      break;
    }
    case 'bureau': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur);
      cube(g, b.x, b.y, H, b.w, b.d, 0.2, toit);
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) fenetre(g2, 8 + i * 28, -(3.9 - r * 1.15) * HU, 20, 18, '#a6e8ff');
        porte(g2, b.d * HW - 34, -1.45 * HU, 24, 1.45 * HU, '#e08a72');
      });
      surFace(g, b.x, b.y + b.d, 0, 'gauche', 0, 0, 0, 0, (g2) => {
        for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) fenetre(g2, 8 + i * 36, -(3.9 - r * 1.15) * HU, 22, 18, '#a6e8ff');
      });
      break;
    }
    case 'scene': {
      // une scene de plein air : plancher, deux tours de son, une bache
      cube(g, b.x, b.y, 0, b.w, b.d, 0.5, '#8f6b45');
      cube(g, b.x, b.y, 0.5, 0.6, 0.6, 2.4, '#3a3350');
      cube(g, b.x + b.w - 0.6, b.y, 0.5, 0.6, 0.6, 2.4, '#3a3350');
      const P2 = versEcran;
      poly(g, [P2(b.x, b.y, 2.9), P2(b.x + b.w, b.y, 2.9), P2(b.x + b.w, b.y + b.d * 0.8, 2.3), P2(b.x, b.y + b.d * 0.8, 2.3)], toit, ENCRE, 3);
      for (let i = 0; i < 3; i++) cube(g, b.x + 0.8 + i * 1.3, b.y + 0.4, 0.5, 0.8, 0.5, 0.6, '#1c1528');
      break;
    }
    case 'tour': {
      cube(g, b.x, b.y, 0, b.w, b.d, H, mur, { dessus: '#dbe6f2' });
      cube(g, b.x + 1, b.y + 1, H, b.w - 2, b.d - 2, 0.6, toit);
      antenne(g, b.x + b.w / 2, b.y + b.d / 2, H + 0.6, 2, true);
      surFace(g, b.x + b.w, b.y + b.d, 0, 'droite', 0, 0, 0, 0, (g2) => {
        for (let r = 0; r < 7; r++) for (let i = 0; i < 4; i++) fenetre(g2, 8 + i * 36, -(7.6 - r * 1.05) * HU, 26, 18, r % 2 ? '#a6e8ff' : '#ffe9a6');
        porte(g2, b.d * HW - 44, -1.7 * HU, 34, 1.7 * HU, '#3a5fa8');
      });
      surFace(g, b.x, b.y + b.d, 0, 'gauche', 0, 0, 0, 0, (g2) => {
        for (let r = 0; r < 7; r++) for (let i = 0; i < 4; i++) fenetre(g2, 8 + i * 36, -(7.6 - r * 1.05) * HU, 26, 18, '#a6e8ff');
      });
      break;
    }
    default: cube(g, b.x, b.y, 0, b.w, b.d, H, mur);
  }
  // l'enseigne, posee au-dessus de la porte, tournee vers le joueur
  enseigne(g, b, H);
  // le drapeau de couleur sur le toit : la famille du disquaire, ou la teinte du lieu
  if (st !== 'scene' && st !== 'tour') drapeau(g, b.x + 0.25, b.y + b.d - 0.25, H + (st === 'maison' ? 1.1 : 0.25), toit);
}

function enseigne(g, b, H) {
  if (!b.enseigne) return;
  const p = versEcran(b.x + b.w + 0.02, b.y + b.d / 2, Math.min(H, 2.2) + 0.55);
  g.font = '900 12px Nunito, Arial, sans-serif';
  const tw = Math.ceil(g.measureText(b.enseigne).width) + 22, th = 22;
  g.save(); g.translate(p.x, p.y);
  const sombre = b.style === 'club' || b.style === 'bunker';
  panneau(g, -tw / 2, -th / 2, tw, th, b.enseigne, sombre ? '#241b33' : '#fff6e0', sombre ? '#ff5cb4' : '#2a1d33', 12);
  g.restore();
}
function drapeau(g, x, y, z, couleur) {
  const p = versEcran(x, y, z);
  g.strokeStyle = ENCRE; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 30); g.stroke();
  g.strokeStyle = '#fff6e0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 30); g.stroke();
  g.beginPath(); g.moveTo(p.x, p.y - 30); g.lineTo(p.x + 18, p.y - 25); g.lineTo(p.x, p.y - 19); g.closePath();
  g.fillStyle = couleur; g.fill(); g.strokeStyle = ENCRE; g.lineWidth = 2.5; g.stroke();
}
function antenne(g, x, y, z, h, grande = false) {
  const a = versEcran(x, y, z), b = versEcran(x, y, z + h);
  g.strokeStyle = ENCRE; g.lineWidth = 5; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  g.strokeStyle = '#d9dee6'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  if (grande) {
    for (let i = 1; i <= 2; i++) { const y2 = b.y + i * (a.y - b.y) / 3; g.strokeStyle = '#d9dee6'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x - 6 * i, y2); g.lineTo(b.x + 6 * i, y2); g.stroke(); }
  }
  ellipse(g, b.x, b.y, 4, 4, '#ff5b3d', ENCRE, 2);
}
function toitPignon(g, x, y, z, w, d, h, couleur, axe = 'x') {
  const P = versEcran, ov = 0.22;
  const X = x - ov, Y = y - ov, Wd = w + ov * 2, D = d + ov * 2;
  if (axe === 'x') {
    const cy = Y + D / 2;
    const r1 = P(X, cy, z + h), r2 = P(X + Wd, cy, z + h);
    const e1 = P(X, Y + D, z), e2 = P(X + Wd, Y + D, z), b1 = P(X, Y, z), b2 = P(X + Wd, Y, z);
    poly(g, [b1, b2, r2, r1], teinte(couleur, -0.2), ENCRE, 4);
    poly(g, [b2, r2, e2], teinte(couleur, -0.35), ENCRE, 4);
    poly(g, [r1, r2, e2, e1], degrade(g, r1, e1, teinte(couleur, 0.2), teinte(couleur, -0.05)), ENCRE, 4);
  } else {
    const cx = X + Wd / 2;
    const r1 = P(cx, Y, z + h), r2 = P(cx, Y + D, z + h);
    const e1 = P(X + Wd, Y, z), e2 = P(X + Wd, Y + D, z), b1 = P(X, Y, z), b2 = P(X, Y + D, z);
    poly(g, [b1, r1, r2, b2], teinte(couleur, -0.2), ENCRE, 4);
    poly(g, [b2, r2, e2], teinte(couleur, -0.35), ENCRE, 4);
    poly(g, [r1, e1, e2, r2], degrade(g, r1, e1, teinte(couleur, 0.2), teinte(couleur, -0.05)), ENCRE, 4);
  }
}

/* LE CHANTIER : ce qu'on voit d'un lieu pas encore ouvert. Une palissade,
   une grue, un tas de briques et un panneau qui dit le niveau. C'est ce
   qui dit au joueur « continue, ca arrive ». */
function dessinerChantier(g, b) {
  ombreBatiment(g, b, 0.5);
  const P = versEcran;
  poly(g, [P(b.x, b.y), P(b.x + b.w, b.y), P(b.x + b.w, b.y + b.d), P(b.x, b.y + b.d)], '#c9a86e', ENCRE, 3);
  // palissade
  for (let i = 0; i < b.w * 2; i++) cube(g, b.x + i * 0.5, b.y + b.d - 0.12, 0, 0.5, 0.12, 0.55, i % 2 ? '#ffd23d' : '#ffe27a', { brillant: false, lw: 3 });
  for (let i = 0; i < b.d * 2; i++) cube(g, b.x + b.w - 0.12, b.y + i * 0.5, 0, 0.12, 0.5, 0.55, i % 2 ? '#ffd23d' : '#ffe27a', { brillant: false, lw: 3 });
  // materiaux
  cube(g, b.x + 0.4, b.y + 0.4, 0, 1, 0.7, 0.5, '#c9755a');
  cube(g, b.x + 0.5, b.y + 0.5, 0.5, 0.8, 0.5, 0.4, '#d98a6a');
  cube(g, b.x + b.w - 1.4, b.y + 0.5, 0, 0.8, 0.8, 0.35, '#b3bcc2');
  // la grue
  const gx = b.x + b.w / 2, gy = b.y + 0.6;
  cube(g, gx - 0.15, gy - 0.15, 0, 0.3, 0.3, 3.2, '#ffb347', { brillant: false });
  const a = P(gx, gy, 3.2), c = P(gx + 2.2, gy + 1.4, 3.1);
  g.strokeStyle = ENCRE; g.lineWidth = 5; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
  g.strokeStyle = '#ffb347'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
  const cr = { x: a.x + (c.x - a.x) * 0.7, y: a.y + (c.y - a.y) * 0.7 };
  g.strokeStyle = ENCRE; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cr.x, cr.y); g.lineTo(cr.x, cr.y + 34); g.stroke();
  arrondi(g, cr.x - 7, cr.y + 34, 14, 10, 2, '#c9755a', ENCRE, 2);
  // le panneau
  const p = P(b.x + b.w + 0.1, b.y + b.d / 2, 1.3);
  g.save(); g.translate(p.x, p.y);
  panneau(g, -46, -14, 92, 28, `NIVEAU ${b.niveau}`, '#ffd23d', '#2a1d33', 13);
  g.font = '900 10px Nunito, Arial, sans-serif';
  const nom = (b.nom || '').toUpperCase(), tw = Math.ceil(g.measureText(nom).width) + 16;
  panneau(g, -tw / 2, 16, tw, 18, nom, '#fff6e0', '#2a1d33', 10);
  g.restore();
}

// -------------------------------------------------------------- decors
export function cuireDecor(d) {
  const AX = 80, AY = 120, W = 160, H = 150;
  const { c, g } = toile(W, H);
  const a = versEcran(d.x, d.y, 0);
  g.setTransform(1, 0, 0, 1, AX - a.x, AY - a.y);
  dessinerDecor(g, d);
  return { canvas: c, ax: AX, ay: AY };
}
function dessinerDecor(g, d) {
  const s = d.s || 1, p = versEcran(d.x, d.y, 0);
  switch (d.type) {
    case 'arbre': {
      ombre(g, d.x, d.y, 16 * s, 8 * s, 0.2);
      const feuille = d.teinte > 0.66 ? '#4fbf5a' : d.teinte > 0.33 ? '#5fc95a' : '#43b04f';
      arrondi(g, p.x - 4 * s, p.y - 22 * s, 8 * s, 22 * s, 3, '#8f5f34', ENCRE, 3);
      for (const [dx, dy, r] of [[0, -40, 20], [-13, -30, 14], [13, -30, 14], [0, -54, 12]])
        ellipse(g, p.x + dx * s, p.y + dy * s, r * s, r * 0.9 * s, feuille, ENCRE, 3.5);
      for (const [dx, dy, r] of [[0, -40, 20], [-13, -30, 14], [13, -30, 14], [0, -54, 12]])
        ellipse(g, p.x + dx * s, p.y + dy * s, r * s, r * 0.9 * s, feuille);
      g.save(); g.globalAlpha = 0.45; ellipse(g, p.x - 6 * s, p.y - 50 * s, 7 * s, 4 * s, '#ffffff'); g.restore();
      break;
    }
    case 'buisson': {
      ombre(g, d.x, d.y, 11 * s, 5 * s, 0.18);
      for (const [dx, dy, r] of [[-7, -7, 9], [7, -7, 9], [0, -13, 10]]) ellipse(g, p.x + dx * s, p.y + dy * s, r * s, r * 0.85 * s, '#5fc95a', ENCRE, 3);
      for (const [dx, dy, r] of [[-7, -7, 9], [7, -7, 9], [0, -13, 10]]) ellipse(g, p.x + dx * s, p.y + dy * s, r * s, r * 0.85 * s, '#5fc95a');
      g.save(); g.globalAlpha = 0.4; ellipse(g, p.x - 3 * s, p.y - 17 * s, 4 * s, 2.5 * s, '#fff'); g.restore();
      break;
    }
    case 'fleurs': {
      for (let i = 0; i < 4; i++) { const x = p.x + (i - 1.5) * 8, y = p.y - 4 + (i % 2) * 3; g.strokeStyle = '#4fa83a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y - 4); g.stroke(); ellipse(g, x, y - 6, 4, 4, ['#ff5cb4', '#ffd23d', '#ff8a3d', '#a6e8ff'][i], ENCRE, 2); ellipse(g, x, y - 6, 1.5, 1.5, '#fff6e0'); }
      break;
    }
    case 'lampe': {
      ombre(g, d.x, d.y, 6, 3, 0.2);
      arrondi(g, p.x - 2.5, p.y - 52, 5, 52, 2, '#3a3350', ENCRE, 3);
      arrondi(g, p.x - 8, p.y - 62, 16, 12, 4, '#ffe27a', ENCRE, 3);
      g.save(); g.globalAlpha = 0.25; ellipse(g, p.x, p.y - 56, 16, 10, '#ffe27a'); g.restore();
      break;
    }
    case 'banc': {
      cube(g, d.x - 0.5, d.y - 0.18, 0.25, 1, 0.36, 0.12, '#c98c4e');
      cube(g, d.x - 0.45, d.y - 0.15, 0, 0.1, 0.3, 0.25, '#3a3350', { brillant: false });
      cube(g, d.x + 0.35, d.y - 0.15, 0, 0.1, 0.3, 0.25, '#3a3350', { brillant: false });
      break;
    }
    case 'caisses': {
      cube(g, d.x - 0.35, d.y - 0.3, 0, 0.7, 0.6, 0.5, '#c9924e');
      cube(g, d.x - 0.25, d.y - 0.2, 0.5, 0.5, 0.4, 0.15, '#241b33');
      const q = versEcran(d.x, d.y, 0.65);
      ellipse(g, q.x - 6, q.y - 4, 7, 4, '#241b33', ENCRE, 2); ellipse(g, q.x - 6, q.y - 4, 2, 1.2, '#ff5cb4');
      break;
    }
    case 'fontaine': {
      ombre(g, d.x, d.y, 30, 15, 0.15);
      const q = versEcran(d.x, d.y, 0);
      ellipse(g, q.x, q.y, 34, 17, '#d9dee6', ENCRE, 3.5);
      ellipse(g, q.x, q.y - 2, 27, 13, '#4fb8ff', ENCRE, 2.5);
      ellipse(g, q.x, q.y - 6, 9, 5, '#d9dee6', ENCRE, 3);
      arrondi(g, q.x - 4, q.y - 30, 8, 24, 3, '#d9dee6', ENCRE, 3);
      // un vinyle qui tourne au sommet : la statue de la ville
      ellipse(g, q.x, q.y - 34, 13, 13, '#241b33', ENCRE, 3); ellipse(g, q.x, q.y - 34, 4, 4, '#ff5cb4', ENCRE, 2);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(q.x - 12, q.y + 1); g.lineTo(q.x - 2, q.y + 1); g.stroke();
      break;
    }
    case 'kiosque': {
      cube(g, d.x - 0.9, d.y - 0.9, 0, 1.8, 1.8, 0.2, '#e9dcc0');
      for (const [ox, oy] of [[-0.8, -0.8], [0.7, -0.8], [-0.8, 0.7], [0.7, 0.7]]) cube(g, d.x + ox, d.y + oy, 0.2, 0.12, 0.12, 1.6, '#fff6e0', { brillant: false });
      toitPignon(g, d.x - 0.9, d.y - 0.9, 1.8, 1.8, 1.8, 0.7, '#ff5cb4');
      break;
    }
  }
}

// ---------------------------------------------------------- personnages
/* LA CREATURE DU JOUEUR : grosse tete ronde, oreilles tombantes, antenne,
   sacoche de disques. Les passants sont de la meme espece dans d'autres
   couleurs. C'est le personnage que Mika a invente : on le garde, on le
   grossit, on l'arrondit. */
export function cuirePoses(look) {
  const AX = 48, AY = 100, W = 96, H = 110;
  const poses = {};
  const faire = (nom, f, sens, dos, bouge) => {
    const { c, g } = toile(W, H);
    g.translate(AX, AY);
    dessinerPersonnage(g, { ...look, f, sens, dos, bouge });
    poses[nom] = c;
  };
  for (let f = 0; f < 4; f++) {
    faire(`marche_d_${f}`, f, 1, false, true);
    faire(`marche_g_${f}`, f, -1, false, true);
    faire(`dos_${f}`, f, 1, true, true);
  }
  faire('repos_d', 0, 1, false, false);
  faire('repos_g', 0, -1, false, false);
  faire('repos_dos', 0, 1, true, false);
  return { poses, ax: AX, ay: AY };
}
export function dessinerPersonnage(g, o) {
  const f = o.bouge ? o.f % 4 : 0;
  const saut = o.bouge ? [0, -3, 0, -2][f] : 0;
  const flop = o.bouge ? [0, 2, 2, 0][f] : 0;
  const jambeG = [0, 3, 0, -3][f], jambeD = [0, -3, 0, 3][f];
  const B = o.corps || '#f2b33d', BD = teinte(B, -0.25), BL = teinte(B, 0.3);
  const S = o.short || '#4a86d9';
  const sens = o.sens || 1;
  g.save();
  g.scale(sens, 1);
  ellipse(g, 0, 2, 16, 7, 'rgba(26,16,48,0.22)');
  // pieds
  arrondi(g, -13, -8 + jambeG, 11, 9, 4, '#6a5f7d', ENCRE, 3);
  arrondi(g, 2, -8 + jambeD, 11, 9, 4, '#6a5f7d', ENCRE, 3);
  // corps et culotte
  const cy = -30 + saut;
  arrondi(g, -13, cy, 26, 22, 8, B, ENCRE, 3.5);
  arrondi(g, -13, cy + 11, 26, 11, [2, 2, 8, 8], S, ENCRE, 3);
  // sacoche
  arrondi(g, -24, cy + 2, 12, 15, 4, '#d97b4a', ENCRE, 3);
  g.strokeStyle = ENCRE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-18, cy + 2); g.lineTo(-4, cy - 4); g.stroke();
  ellipse(g, -18, cy + 9, 3.5, 3.5, '#241b33'); ellipse(g, -18, cy + 9, 1.2, 1.2, '#ff5cb4');
  // tete
  const ty = -58 + saut;
  ellipse(g, 0, ty, 24, 21, B, ENCRE, 3.5);
  // oreilles
  ellipse(g, -25, ty + 4 + flop, 7, 9, BD, ENCRE, 3);
  ellipse(g, 25, ty + 4 - flop, 7, 9, BD, ENCRE, 3);
  // modele : lumiere a gauche
  g.save(); g.globalAlpha = 0.5; ellipse(g, -9, ty - 8, 8, 6, BL); g.restore();
  g.save(); g.globalAlpha = 0.25; ellipse(g, 12, ty + 10, 10, 8, BD); g.restore();
  // antenne
  g.strokeStyle = ENCRE; g.lineWidth = 4; g.beginPath(); g.moveTo(0, ty - 20); g.lineTo(2, ty - 32); g.stroke();
  g.strokeStyle = BD; g.lineWidth = 2; g.beginPath(); g.moveTo(0, ty - 20); g.lineTo(2, ty - 32); g.stroke();
  ellipse(g, 2, ty - 34, 4.5, 4.5, BL, ENCRE, 2.5);
  if (!o.dos) {
    // yeux
    ellipse(g, -8, ty + 2, 6.5, 7.5, '#ffffff', ENCRE, 2.5);
    ellipse(g, 9, ty + 2, 6.5, 7.5, '#ffffff', ENCRE, 2.5);
    ellipse(g, -6.5, ty + 3, 3.2, 3.8, ENCRE); ellipse(g, 10.5, ty + 3, 3.2, 3.8, ENCRE);
    ellipse(g, -5.5, ty + 1.5, 1.2, 1.2, '#fff'); ellipse(g, 11.5, ty + 1.5, 1.2, 1.2, '#fff');
    // joues et bouche
    g.save(); g.globalAlpha = 0.55; ellipse(g, -16, ty + 10, 4, 2.5, '#ff9ec4'); ellipse(g, 17, ty + 10, 4, 2.5, '#ff9ec4'); g.restore();
    g.strokeStyle = ENCRE; g.lineWidth = 2.5; g.beginPath(); g.arc(1, ty + 11, 4, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    // le casque, si on en a un
    if (o.casque) {
      g.strokeStyle = ENCRE; g.lineWidth = 7; g.beginPath(); g.arc(0, ty + 2, 25, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.strokeStyle = '#3a3350'; g.lineWidth = 4; g.beginPath(); g.arc(0, ty + 2, 25, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      arrondi(g, -30, ty - 4, 9, 14, 4, '#3a3350', ENCRE, 2.5); arrondi(g, 21, ty - 4, 9, 14, 4, '#3a3350', ENCRE, 2.5);
    }
  } else {
    g.save(); g.globalAlpha = 0.3; ellipse(g, 0, ty + 4, 12, 8, BD); g.restore();
  }
  g.restore();
}

// -------------------------------------------------------------- studio
/* LA CHAMBRE, PUIS LE STUDIO. Une piece vue en coin : deux murs, un sol,
   et le materiel qui apparait piece par piece, la ou on l'installerait
   vraiment. C'est la recompense visible de chaque achat. */
export function dessinerStudio(g, W, H, materiel, t = 0) {
  const a = (id) => materiel.includes(id);
  g.save();
  g.clearRect(0, 0, W, H);
  const k = Math.min(W / 520, H / 400);
  g.translate(W / 2, H * 0.6);
  g.scale(k, k);
  const P = (x, y, z = 0) => versEcran(x, y, z);
  const S = 6;  // la piece fait 6 x 6
  // murs
  const murG = a('acoustique') ? '#4a4260' : '#ffd9a0', murD = a('acoustique') ? '#3a3350' : '#ffe6b8';
  const mh = 4.2;
  poly(g, [P(0, 0, mh), P(S, 0, mh), P(S, 0, 0), P(0, 0, 0)], degrade(g, P(0, 0, mh), P(0, 0, 0), teinte(murD, 0.08), teinte(murD, -0.12)), ENCRE, 5);
  poly(g, [P(0, 0, mh), P(0, S, mh), P(0, S, 0), P(0, 0, 0)], degrade(g, P(0, 0, mh), P(0, 0, 0), teinte(murG, 0.05), teinte(murG, -0.14)), ENCRE, 5);
  // plinthes
  g.strokeStyle = teinte(murG, -0.35); g.lineWidth = 4;
  g.beginPath(); g.moveTo(P(0, 0, 0.12).x, P(0, 0, 0.12).y); g.lineTo(P(S, 0, 0.12).x, P(S, 0, 0.12).y); g.stroke();
  g.beginPath(); g.moveTo(P(0, 0, 0.12).x, P(0, 0, 0.12).y); g.lineTo(P(0, S, 0.12).x, P(0, S, 0.12).y); g.stroke();
  // sol
  const sol = a('acoustique') ? ['#5a5070', '#615778'] : ['#d9a05e', '#e0a866'];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) poly(g, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], sol[(x + y) % 2]);
  poly(g, [P(0, 0), P(S, 0), P(S, S), P(0, S)], null, ENCRE, 4);
  // tapis
  poly(g, [P(2.2, 2.6), P(5.2, 2.6), P(5.2, 5.4), P(2.2, 5.4)], '#c9564a', teinte('#c9564a', -0.4), 3);
  poly(g, [P(2.5, 2.9), P(4.9, 2.9), P(4.9, 5.1), P(2.5, 5.1)], null, '#ffd9a0', 2);
  // fenetre sur le mur droit, affiche sur le mur gauche
  surFace(g, 0, 0, 0, 'gauche', 0, 0, 0, 0, (g2) => {
    fenetre(g2, 2.2 * HW - 20, -3.5 * HU, 64, 46, '#8fdcff');
  });
  surFace(g, 0, S, 0, 'droite', 0, 0, 0, 0, (g2) => {
    arrondi(g2, 40, -3.7 * HU, 44, 58, 3, '#241b33', ENCRE, 2.5);
    ellipse(g2, 62, -3.7 * HU + 24, 14, 14, '#ff5cb4'); ellipse(g2, 62, -3.7 * HU + 24, 5, 5, '#241b33');
    g2.fillStyle = '#fff6e0'; g2.font = '900 9px Nunito, Arial'; g2.textAlign = 'center'; g2.fillText('SONAA', 62, -3.7 * HU + 50);
    if (a('acoustique')) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) arrondi(g2, 100 + i * 34, -3.8 * HU + j * 34, 28, 28, 3, j % 2 ? '#3a3350' : '#4a4260', ENCRE, 2);
    if (a('mastering')) arrondi(g2, 200, -2.9 * HU, 60, 40, 4, '#ffd23d', ENCRE, 2.5);
  });
  if (a('acoustique')) surFace(g, 0, 0, 0, 'gauche', 0, 0, 0, 0, (g2) => { for (let i = 0; i < 3; i++) arrondi(g2, 110 + i * 34, -3.9 * HU, 28, 28, 3, i % 2 ? '#3a3350' : '#4a4260', ENCRE, 2); });

  // le lit, dans le coin gauche : il retrecit a mesure que le studio grandit
  cube(g, 0.3, 3.6, 0, 1.4, 2.2, 0.45, '#8f5fc9');
  cube(g, 0.35, 3.65, 0.45, 1.3, 2.1, 0.25, '#fff6e0');
  cube(g, 0.4, 3.7, 0.7, 1.2, 0.6, 0.2, '#ffd9a0');
  // la plante
  ombre(g, 5.4, 0.7, 10, 5, 0.15);
  cube(g, 5.15, 0.45, 0, 0.5, 0.5, 0.45, '#c9755a');
  { const q = P(5.4, 0.7, 0.45); for (const [dx, dy] of [[-10, -14], [10, -12], [0, -22], [-4, -8], [6, -4]]) ellipse(g, q.x + dx, q.y + dy, 8, 10, '#5fc95a', ENCRE, 2.5); }

  // LA TABLE, contre le mur du fond, des qu'on a la premiere platine
  const table = a('platine1') ? { x: 1.2, y: 0.35, w: 3.6, d: 1.2, h: 0.95 } : null;
  if (table) {
    cube(g, table.x, table.y, 0, table.w, table.d, table.h, a('console') ? '#3a3350' : '#c98c4e');
    cube(g, table.x + 0.1, table.y + 0.1, 0, 0.15, 0.15, table.h, '#5a4a3a', { brillant: false, contour: null });
  }
  const zt = table ? table.h : 0;
  const platine = (x, y, aiguille, tourne) => {
    cube(g, x, y, zt, 0.95, 0.95, 0.14, '#d9dee6');
    const q = P(x + 0.47, y + 0.47, zt + 0.14);
    ellipse(g, q.x, q.y, 13, 6.5, '#241b33', ENCRE, 2);
    const ang = tourne ? t * 2.5 : 0;
    ellipse(g, q.x, q.y, 4, 2, '#ff5cb4');
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(q.x, q.y, 9, 4.5, 0, ang, ang + 1.2); g.stroke();
    if (aiguille) { g.strokeStyle = ENCRE; g.lineWidth = 3.5; g.beginPath(); g.moveTo(q.x + 15, q.y - 9); g.lineTo(q.x + 4, q.y - 1); g.stroke(); g.strokeStyle = '#d9dee6'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(q.x + 15, q.y - 9); g.lineTo(q.x + 4, q.y - 1); g.stroke(); ellipse(g, q.x + 15, q.y - 9, 2.5, 2.5, '#3a3350', ENCRE, 1.5); }
    ellipse(g, q.x - 10, q.y + 6, 1.6, 1.6, tourne ? '#4fe08a' : '#8a8a8a');
  };
  if (a('platine1')) platine(table.x + 0.15, table.y + 0.15, a('aiguille'), a('aiguille') && a('cables'));
  if (a('platine2')) platine(table.x + 2.5, table.y + 0.15, true, a('cables'));
  if (a('table')) {
    cube(g, table.x + 1.3, table.y + 0.25, zt, 1.0, 0.75, 0.12, '#3a3350');
    const q = P(table.x + 1.8, table.y + 0.62, zt + 0.12);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ellipse(g, q.x - 8 + i * 8, q.y - 6 + j * 4, 1.8, 1.8, ['#ff5cb4', '#5fd6c8', '#ffd23d'][i]);
    arrondi(g, q.x - 9, q.y + 3, 18, 3, 1.5, '#d9dee6', ENCRE, 1.5);
  }
  if (a('cables')) {
    g.strokeStyle = '#241b33'; g.lineWidth = 2.2;
    const c1 = P(table.x + 0.6, table.y + 1.2, 0.02), c2 = P(table.x + 2.9, table.y + 1.2, 0.02);
    g.beginPath(); g.moveTo(c1.x, c1.y); g.bezierCurveTo(c1.x + 20, c1.y + 20, c2.x - 30, c2.y + 14, c2.x, c2.y); g.stroke();
    g.strokeStyle = '#ff5b3d'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(c1.x + 6, c1.y + 2); g.bezierCurveTo(c1.x + 20, c1.y + 26, c2.x - 30, c2.y + 20, c2.x - 8, c2.y + 4); g.stroke();
  }
  const enceinte = (x, y, z, h, w, pulse) => {
    cube(g, x, y, z, w, w, h, '#241b33', { dessus: '#3a3350' });
    const q = P(x + w / 2, y + w, z + h * 0.42);
    const r = 1 + (pulse ? Math.abs(Math.sin(t * 6)) * 0.12 : 0);
    surFaceCercle(g, q, 9 * w / 0.7 * r, '#3a3350', '#5a5070');
    surFaceCercle(g, { x: q.x, y: q.y - h * HU * 0.4 }, 5 * w / 0.7, '#3a3350', '#5a5070');
  };
  if (a('enceintes')) { enceinte(0.25, 1.2, 0, 1.3, 0.55, a('cables')); enceinte(5.1, 1.8, 0, 1.3, 0.55, a('cables')); }
  if (a('moniteurs')) { enceinte(table.x - 0.05, table.y + 0.05, zt, 0.55, 0.35, true); enceinte(table.x + table.w - 0.3, table.y + 0.05, zt, 0.55, 0.35, true); }
  if (a('casque')) {
    const q = P(0, 2.2, 2.6);
    g.strokeStyle = ENCRE; g.lineWidth = 6; g.beginPath(); g.arc(q.x + 14, q.y + 10, 12, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.strokeStyle = a('casque_pro') ? '#ff5cb4' : '#3a3350'; g.lineWidth = 3; g.beginPath(); g.arc(q.x + 14, q.y + 10, 12, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    arrondi(g, q.x, q.y + 6, 6, 10, 3, '#3a3350', ENCRE, 2); arrondi(g, q.x + 22, q.y + 6, 6, 10, 3, '#3a3350', ENCRE, 2);
  }
  if (a('laptop')) {
    cube(g, table.x + 1.25, table.y - 0.02 + 1.0, zt, 0.8, 0.12, 0.5, '#d9dee6', { brillant: false });
    const q = P(table.x + 1.65, table.y + 1.0, zt + 0.28);
    surFace(g, table.x + 2.05, table.y + 1.0, zt, 'gauche', 0, 0, 0, 0, () => {});
    ellipse(g, q.x, q.y, 6, 4, '#5fd6c8');
    cube(g, table.x + 1.25, table.y + 1.0, zt, 0.8, 0.5, 0.04, '#b3bcc2');
  }
  if (a('controleur')) { cube(g, table.x + 2.15, table.y + 1.05, zt, 0.8, 0.4, 0.08, '#3a3350'); const q = P(table.x + 2.55, table.y + 1.25, zt + 0.08); for (let i = 0; i < 6; i++) arrondi(g, q.x - 14 + i * 5, q.y - 3, 3, 6, 1, i % 2 ? '#fff6e0' : '#241b33'); }
  if (a('boite')) { cube(g, table.x + 0.15, table.y + 1.05, zt, 0.9, 0.4, 0.1, '#b3bcc2'); const q = P(table.x + 0.6, table.y + 1.25, zt + 0.1); for (let i = 0; i < 8; i++) ellipse(g, q.x - 14 + i * 4, q.y + (i % 2) * 2, 1.4, 1.4, i === (Math.floor(t * 8) % 8) ? '#ff5b3d' : '#ffd23d'); }
  if (a('synthe')) { cube(g, 3.2, 4.6, 0, 1.6, 0.5, 0.6, '#c98c4e'); cube(g, 3.25, 4.62, 0.6, 1.5, 0.46, 0.06, '#fff6e0'); const q = P(4.0, 4.85, 0.66); for (let i = 0; i < 9; i++) arrondi(g, q.x - 20 + i * 5, q.y - 4, 3, 7, 1, i % 3 === 1 ? '#241b33' : '#fff6e0'); for (let i = 0; i < 5; i++) ellipse(g, q.x - 16 + i * 8, q.y - 9, 1.6, 1.6, '#ff5cb4'); }
  if (a('carte_son')) cube(g, table.x + 3.0, table.y + 1.05, zt, 0.5, 0.35, 0.12, '#ff5b3d');
  if (a('cdj')) { cube(g, table.x + 0.15, table.y + 0.15, zt + 0.14, 0.95, 0.95, 0.06, '#241b33', { contour: null }); cube(g, table.x + 2.5, table.y + 0.15, zt + 0.14, 0.95, 0.95, 0.06, '#241b33', { contour: null }); const q1 = P(table.x + 0.62, table.y + 0.62, zt + 0.2), q2 = P(table.x + 2.97, table.y + 0.62, zt + 0.2); for (const q of [q1, q2]) { ellipse(g, q.x, q.y, 11, 5.5, '#3a3350', ENCRE, 2); ellipse(g, q.x, q.y, 3, 1.5, '#5fd6c8'); arrondi(g, q.x - 8, q.y - 10, 16, 5, 2, '#5fd6c8'); } }
  if (a('modulaire')) { cube(g, 5.0, 3.2, 0, 0.7, 1.4, 1.5, '#3a3350'); const q = P(5.35, 4.6, 0.75); for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) ellipse(g, q.x - 6 + i * 4, q.y - 24 + j * 8 + i * 2, 1.4, 1.4, [(i + j + Math.floor(t * 3)) % 3 ? '#ffd23d' : '#5fd6c8', '#ff5cb4'][j % 2]); }
  if (a('console')) { cube(g, table.x + 0.9, table.y + 0.9, zt, 1.9, 0.3, 0.08, '#2a2440'); const q = P(table.x + 1.85, table.y + 1.05, zt + 0.08); for (let i = 0; i < 14; i++) { arrondi(g, q.x - 28 + i * 4, q.y - 4 - (i % 3), 2, 6, 1, '#fff6e0'); } }
  if (a('mastering')) { cube(g, 4.3, 0.3, 0, 1.2, 0.5, 1.6, '#3a3350'); const q = P(4.9, 0.8, 0.8); for (let j = 0; j < 6; j++) { arrondi(g, q.x - 14, q.y - 20 + j * 7, 28, 4, 1.5, j % 2 ? '#5a5070' : '#4a4260'); ellipse(g, q.x + 10, q.y - 18 + j * 7, 1.2, 1.2, '#4fe08a'); } }
  g.restore();
}
function surFaceCercle(g, q, r, fond, bord) {
  ellipse(g, q.x, q.y, r * 0.55, r * 0.75, fond, ENCRE, 2);
  ellipse(g, q.x, q.y, r * 0.28, r * 0.4, bord);
}

// ------------------------------------------------------------ icones UI
/* Une pochette de secours, dessinee : quand l'image n'est pas encore la. */
export function pochetteProcedurale(taille, hue, titre) {
  const { c, g } = toile(taille, taille);
  g.fillStyle = hsl(hue, 70, 45); g.fillRect(0, 0, taille, taille);
  g.fillStyle = hsl((hue + 40) % 360, 80, 60); g.beginPath(); g.arc(taille * 0.7, taille * 0.35, taille * 0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#241b33'; g.beginPath(); g.arc(taille * 0.35, taille * 0.65, taille * 0.28, 0, Math.PI * 2); g.fill();
  g.fillStyle = hsl(hue, 70, 45); g.beginPath(); g.arc(taille * 0.35, taille * 0.65, taille * 0.08, 0, Math.PI * 2); g.fill();
  return c;
}
