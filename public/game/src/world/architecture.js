// =====================================================================
//  DECOR PIXEL : sol de clairiere, cabanes, accessoires
// =====================================================================
import { toScreen, HW, HH, HU } from '../core/iso.js';
import {
  box, slab, poly, gableRoof, face, signboard, windowRow, doorway, shadow, castBox,
  tree, bush, rock, flower, grassTuft, crate, px, shade, mix, alpha, line2,
  lantern, smoke, time as artTime, LIGHT, FW, FH, isoTileSprite, pxEllipse, pxText, textWidth,
  billboard, faceRect, outlineCanvas,
} from '../core/art.js';
import { VOID, GRASS, PATH, LUSH, CLEARING, FOREST, WATER, SAND, emprise } from './city.js';

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
const EAU = ['#2f6ea8', '#3a7fbd', '#28608f'];
const SABLE = ['#d8c48c', '#e2d09a', '#cbb67e'];

function tilePalette(t) {
  switch (t) {
    case PATH: return DIRT;
    case LUSH: return GREEN_LUSH;
    case CLEARING: return CLEAR_COL;
    case FOREST: return FOREST_FLOOR;
    case WATER: return EAU;
    case SAND: return SABLE;
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
      } else if (t === WATER) {
        /* Deux ou trois eclats par tuile, poses toujours au meme endroit :
           une eau qui scintille au hasard a chaque image papillote. */
        if (h1 > 0.55) {
          const q = P(x + 0.3 + hash(x, y, 21) * 0.4, y + 0.3 + hash(x, y, 22) * 0.4, 0);
          px(ctx, R(q.x), R(q.y), h1 > 0.85 ? 3 : 2, 1, '#7fc0e8');
        }
      } else if (t === PATH && h1 > 0.9) {
        px(ctx, P(x + 0.5, y + 0.5, 0).x, P(x + 0.5, y + 0.5, 0).y, 2, 1, shade(pal[0], -0.2));
      }
    }
  }
}

export function elevOf() { return 0; }

// --------------------------------------------------------- ombre portee
export function castBuildingShadow(ctx, b, unlocked) {
  const h = unlocked ? (b.tower ? 3.4 : b.hut ? 1.4 : 2) : 0.5;
  castBox(ctx, b.x, b.y, b.w, b.d, h, LIGHT.shadowA * 0.9);
  // Chaque aile porte la sienne, sinon un quai de dix metres n'a pas d'ombre
  // et l'oeil le lit comme un decalque colle sur l'herbe.
  if (unlocked) for (const a of b.ailes || [])
    castBox(ctx, a.x, a.y, a.w, a.d, Math.min(a.h || 1, 2.4), LIGHT.shadowA * 0.9);
}

// ================================================================
//  LES AILES · ce qui casse le carre
//  ---------------------------------------------------------------
//  Tous les batiments etaient des boites : un rectangle de tuiles, quatre
//  murs, un toit. Vu de dessus en isometrie, une boite de trois sur trois
//  et une boite de quatre sur quatre se ressemblent, et l'on ne reconnait
//  un lieu qu'a la couleur de son toit.
//
//  Une aile est un volume annexe declare dans city.js, en coordonnees de
//  tuile comme le corps. Elle bloque le passage comme lui et se dessine
//  dans la meme image. Cinq formes suffisent a rendre dix-sept batiments
//  distincts de loin : l'appentis adosse, l'aile basse a deux pentes, la
//  cage d'escalier, le silo, le quai de chargement.
// ================================================================
function aile(ctx, b, a, env) {
  const mur = a.col || shade(b.wall || '#c98c4e', -0.05);
  const toit = a.toit || b.roof || '#4a5b8c';
  const h = a.h || 1;
  const nuit = env && env.night;

  switch (a.type) {
    // ------------------------------------------------ appentis : une seule pente
    case 'appentis': {
      box(ctx, a.x, a.y, 0, a.w, a.d, h, mur, { line: shade(mur, -0.55) });
      // le toit deborde et retombe : c'est ce debord qui le rend lisible
      box(ctx, a.x - 0.1, a.y - 0.1, h, a.w + 0.2, a.d + 0.2, 0.13, toit, { line: shade(toit, -0.5) });
      box(ctx, a.x - 0.1, a.y + a.d, h - 0.12, a.w + 0.2, 0.1, 0.12, shade(toit, -0.2), { line: shade(toit, -0.5) });
      if (h > 0.75)
        windowRow(ctx, a.x + 0.18, a.y + a.d, h - 0.28, 'left', a.w - 0.36, 0.28, 1,
          nuit ? '#ffd76a' : '#9ad9e8');
      break;
    }

    // ------------------------------------------------ aile : un corps plus bas
    case 'aile': {
      box(ctx, a.x - 0.06, a.y - 0.06, 0, a.w + 0.12, a.d + 0.12, 0.14, '#9a9182', { line: '#5f5a50' });
      box(ctx, a.x, a.y, 0, a.w, a.d, h, mur, { line: shade(mur, -0.55) });
      gableRoof(ctx, a.x, a.y, h, a.w, a.d, 0.44, toit, a.w >= a.d ? 'x' : 'y', 0.2);
      const large = Math.max(1, Math.round(a.w - 0.6));
      windowRow(ctx, a.x + 0.25, a.y + a.d, h - 0.42, 'left', a.w - 0.5, 0.34, large,
        nuit ? '#ffd76a' : '#9ad9e8');
      break;
    }

    // ------------------------------------------------ cage d'escalier
    // Haute et etroite, ses fenetres empilees en font une verticale : c'est
    // elle qui donne a un immeuble sa silhouette d'immeuble.
    case 'tour': {
      box(ctx, a.x, a.y, 0, a.w, a.d, h, shade(mur, 0.08), { line: shade(mur, -0.55) });
      box(ctx, a.x - 0.09, a.y - 0.09, h, a.w + 0.18, a.d + 0.18, 0.16, shade(toit, -0.08),
        { line: shade(toit, -0.5) });
      const n = Math.max(2, Math.floor(h / 0.55));
      for (let i = 0; i < n; i++)
        windowRow(ctx, a.x + 0.2, a.y + a.d, 0.42 + i * (h - 0.5) / n, 'left',
          a.w - 0.4, 0.26, 1, nuit ? '#ffd76a' : '#9ad9e8');
      break;
    }

    // ------------------------------------------------ silo de beton
    case 'silo': {
      const beton = a.col || '#7f7a86';
      box(ctx, a.x - 0.1, a.y - 0.1, 0, a.w + 0.2, a.d + 0.2, 0.2, shade(beton, -0.28),
        { line: shade(beton, -0.6) });
      box(ctx, a.x, a.y, 0.2, a.w, a.d, h, beton, { line: shade(beton, -0.55) });
      // cerclages : trois bandes horizontales, la signature du silo
      for (let i = 1; i <= 3; i++)
        faceRect(ctx, a.x, a.y + a.d, 0.2 + h * i / 4, 'left', 0, 0,
          R(a.w * FW), 2, shade(beton, -0.25));
      box(ctx, a.x - 0.12, a.y - 0.12, h + 0.2, a.w + 0.24, a.d + 0.24, 0.18,
        shade(beton, 0.12), { line: shade(beton, -0.55) });
      break;
    }

    // ------------------------------------------------ quai de chargement
    case 'quai': {
      box(ctx, a.x, a.y, 0, a.w, a.d, h, '#8f8a80', { line: '#4f4a44' });
      // bordure jaune, comme sur un quai de halle
      slab(ctx, a.x, a.y, h + 0.01, a.w, a.d, '#a39d92');
      faceRect(ctx, a.x, a.y + a.d, h, 'left', 0, 0, R(a.w * FW), 2, '#e8c25a');
      for (let i = 0; i * 1.2 < a.w; i++)
        box(ctx, a.x + 0.1 + i * 1.2, a.y + a.d - 0.12, h, 0.12, 0.12, 0.5, '#c9c2b0',
          { line: '#5f5a50' });
      break;
    }
  }
}

// ------------------------------------------------------------- cabanes
function hutBody(ctx, b, wallH, roofH) {
  const wall = b.wall || '#c98c4e';
  /* SOUBASSEMENT DE PIERRE. Un mur qui sort du gazon a l'air pose dessus ;
     une assise qui deborde de sept centimetres a l'air fondee dedans. Trois
     pixels, et le batiment cesse de flotter. */
  box(ctx, b.x - 0.07, b.y - 0.07, 0, b.w + 0.14, b.d + 0.14, 0.17, '#9a9182', { line: '#5f5a50' });
  box(ctx, b.x, b.y, 0.1, b.w, b.d, wallH - 0.1, wall, { line: shade(wall, -0.55) });
  // planches verticales sur la facade
  const plancheCol = alpha(shade(wall, -0.4), 0.5);
  for (let i = 1; i < b.w * 3; i++) {
    const xx = R(i * (b.w * FW) / (b.w * 3));
    faceRect(ctx, b.x, b.y + b.d, wallH, 'left', xx, 0, 1, R(wallH * FH), plancheCol);
  }
  /* POTEAUX D'ANGLE ET SABLIERE. Une ossature de bois apparente : deux
     montants aux extremites de la facade, une piece horizontale sous le
     toit. C'est ce qui distingue une cabane charpentee d'un aplat de
     couleur. */
  const L = span(b), ombre = shade(wall, -0.42), clair = shade(wall, 0.16);
  for (const u of [0, L - 0.14]) {
    const o = fp(b, u, wallH);
    faceRect(ctx, o[0], o[1], o[2], 'left', 0, 0, R(0.14 * FW), R(wallH * FH), ombre);
  }
  const sab = fp(b, 0, wallH);
  faceRect(ctx, sab[0], sab[1], sab[2], 'left', 0, 0, R(L * FW), 2, clair);
  gableRoof(ctx, b.x, b.y, wallH, b.w, b.d, roofH, b.roof || '#4a5b8c', 'x', 0.22);
}


// ---------------------------------------------- ce qui distingue un metier
// Toutes les cabanes partageaient la meme silhouette : seul le toit changeait
// de couleur. Chaque metier a maintenant son element propre, visible de loin.
function appentis(ctx, b, colToit) {
  const x = b.x + b.w, y = b.y + b.d - 1.05;
  box(ctx, x, y, 0, 0.75, 0.9, 0.72, '#b3854f', { line: '#5c4128' });
  box(ctx, x - 0.08, y - 0.08, 0.72, 0.91, 1.06, 0.16, colToit, { line: shade(colToit, -0.5) });
}

function perron(ctx, b, wallH) {
  const x0 = b.x + 0.3, w = b.w - 0.6;
  box(ctx, x0, b.y + b.d, 0, w, 0.55, 0.16, '#b3854f', { line: '#5c4128' });
  for (const px2 of [x0 + 0.04, x0 + w - 0.14]) {
    box(ctx, px2, b.y + b.d + 0.4, 0.16, 0.1, 0.1, wallH - 0.2, '#c9a06a', { line: '#5c4128' });
    box(ctx, px2, b.y + b.d + 0.4, 0.62, 0.1, 0.1, 0.06, '#e8d4a8', { line: '#5c4128' });
  }
}

function signature(ctx, b, wallH, roofH, env) {
  switch (b.kind) {
    case 'records':   // des bacs a disques devant la porte
      crate(ctx, b.x + b.w + 0.12, b.y + b.d - 0.6, 0, 0.46, '#b3773c');
      crate(ctx, b.x + b.w + 0.12, b.y + b.d - 0.6, 0.42, 0.38, '#c9924e');
      crate(ctx, b.x + b.w + 0.1, b.y + b.d + 0.05, 0, 0.4, '#a06a34');
      break;
    case 'bar':       // deux lanternes et un tonneau
      lantern(ctx, b.x + 0.28, b.y + b.d + 0.12, wallH - 0.15, '#ffc857');
      lantern(ctx, b.x + b.w - 0.28, b.y + b.d + 0.12, wallH - 0.15, '#ffc857');
      box(ctx, b.x + b.w + 0.1, b.y + b.d - 0.5, 0, 0.42, 0.42, 0.5, '#9a6a3c', { line: '#4a3018' });
      box(ctx, b.x + b.w + 0.06, b.y + b.d - 0.54, 0.5, 0.5, 0.5, 0.07, '#c9924e', { line: '#4a3018' });
      break;
    case 'snack':     // un comptoir et un tabouret
      box(ctx, b.x + 0.35, b.y + b.d + 0.05, 0, b.w - 0.7, 0.3, 0.62, '#c9924e', { line: '#5c4128' });
      box(ctx, b.x + 0.28, b.y + b.d - 0.02, 0.62, b.w - 0.56, 0.42, 0.09, '#f0e6d2', { line: '#5c4128' });
      box(ctx, b.x + b.w - 0.5, b.y + b.d + 0.55, 0, 0.24, 0.24, 0.38, '#8a6a45', { line: '#4a3524' });
      break;
    case 'gear':      // un appentis colle au flanc
      appentis(ctx, b, b.roof || '#4fbf9f');
      break;
    case 'home':      // un perron avec ses deux poteaux
      perron(ctx, b, wallH);
      break;
  }
}

/* ================================================================
   L'ENSEIGNE · le nom sur la facade
   ---------------------------------------------------------------
   `signboard` existait dans art.js, avec sa reduction automatique et son
   centrage, et n'a jamais ete appelee : aucun batiment ne portait son nom.
   On ne l'appelle pas davantage aujourd'hui, et c'est deliberé : elle
   dessine dans le plan de la facade, donc dans le cisaillement isometrique,
   et les lettres y bavent, c'est exactement le flou dont Mika ne voulait
   plus. `billboard` peint un rectangle face a la camera, chaque lettre sur
   des pixels entiers.

   L'echelle est 2, jamais 1. La police fait trois pixels de large : a
   l'echelle 1 un O et un U ne se distinguent pas, et une enseigne qu'il
   faut dechiffrer ne sert a rien.

   La nuit, le panneau s'allume au lieu de s'assombrir : c'est ainsi qu'on
   repere un commerce ouvert, et cela evite que la clairiere devienne
   illisible des dix-neuf heures. La cle du cache porte la nuit, sinon le
   panneau resterait eteint jusqu'au prochain changement de lumiere.
   ================================================================ */
/* LA HAUTEUR, ET LE MAT.

   Le panneau ne peut pas descendre sur la facade : il est centre en
   largeur, et la porte l'est aussi, donc il la couvrirait. Il est centre
   parce que c'est ce qui le rend lisible d'un coup d'oeil. Il vit donc
   au-dessus du toit.

   Pose la, sans rien, il flotte : on lit une etiquette de carte, pas une
   enseigne. Un mat de quelques pixels descend du panneau dans le toit et
   suffit a le planter. Sur les batiments hauts (immeuble, tour, bunker)
   le panneau tombe deja contre le mur : pas de mat, il serait absurde. */
const ENSEIGNE = {
  hut:      { z: 1.16, mat: 0.5 },
  house:    { z: 1.42, mat: 0.55 },
  club:     { z: 1.58, mat: 0.4 },
  big:      { z: 1.66, mat: 0.45 },
  bunker:   { z: 1.86, mat: 0.4 },
  immeuble: { z: 1.28, mat: 0 },
  tower:    { z: 1.3,  mat: 0 },
};

function enseigne(ctx, b, style, env) {
  if (!b.sign) return;
  const e = ENSEIGNE[style] || { z: 1.3, mat: 0 };
  const nuit = !!(env && env.night);
  const cx = b.x + b.w / 2, cy = b.y + b.d + 0.02;
  if (style === 'club') {
    // au neon : fond sombre, lettres roses, et il clignote avec le reste
    const on = env.neon !== 0;
    billboard(ctx, cx, cy, e.z, b.sign, {
      scale: 2, bg: '#241b33', fg: on ? '#ff5cb4' : '#7a2a58',
      border: on ? '#ff5cb4' : '#3d2b44', post: e.mat,
    });
    return;
  }
  billboard(ctx, cx, cy, e.z, b.sign, {
    scale: 2,
    bg: nuit ? '#ffdc8a' : '#f6f0dc',
    fg: '#2b2136',
    border: '#2b2136',
    accent: b.roof || '#c9924e',
    post: e.mat,
  });
}

const STYLES = {
  // petite cabane de disquaire
  hut(ctx, b, env) {
    // la pente du toit varie d'une cabane a l'autre : sinon elles sont clonees
    const pente = 0.52 + ((Math.round(b.x * 3 + b.y) % 3) * 0.13);
    const wallH = 1.05, roofH = pente;
    hutBody(ctx, b, wallH, roofH);
    const L = span(b);
    doorway(ctx, ...fp(b, L / 2 - 0.28, 0.82), 'left', 0.56, 0.82, '#6b4426');
    windowRow(ctx, ...fp(b, 0.22, 0.92), 'left', 0.42, 0.34, 1, env.night ? '#ffd76a' : '#9ad9e8');
    signature(ctx, b, wallH, roofH, env);
    if (env.night) lantern(ctx, b.x + 0.18, b.y + b.d + 0.05, wallH + 0.1, '#ffc857');
  },

  // maison a un etage
  house(ctx, b, env) {
    const wallH = 1.25, roofH = 0.7;
    hutBody(ctx, b, wallH, roofH);
    const L = span(b);
    doorway(ctx, ...fp(b, L / 2 - 0.32, 0.95), 'left', 0.64, 0.95, '#6b4426');
    windowRow(ctx, ...fp(b, 0.28, 1.06), 'left', L - 1.5, 0.44, Math.max(1, R(L - 1.5)), env.night ? '#ffd76a' : '#9ad9e8');
    signature(ctx, b, wallH, roofH, env);
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

  /* LE CLUB. C'etait un pave sombre : quatre murs, une casquette, deux
     enceintes, et pas une seule chose a regarder. Un bloc noir de cinq
     tuiles sur quatre est la plus grande surface vide de la clairiere.

     Ce qui fait un club, ce n'est pas le batiment, c'est son entree : un
     auvent, une file, un videur, et de la lumiere qui sort par la porte
     quand elle s'ouvre. On ajoute donc ce qui se voit depuis la rue, et
     rien sur les faces qu'on ne verra jamais. */
  club(ctx, b, env) {
    const wallH = 1.35, mur = b.wall;
    const on = env.neon !== 0;
    // socle de beton, puis le corps
    box(ctx, b.x - 0.1, b.y - 0.1, 0, b.w + 0.2, b.d + 0.2, 0.18, '#3a3448', { line: '#1d1729' });
    box(ctx, b.x, b.y, 0.18, b.w, b.d, wallH, mur, { line: '#221c33' });
    box(ctx, b.x - 0.1, b.y - 0.1, wallH + 0.18, b.w + 0.2, b.d + 0.2, 0.18,
      shade(b.roof, -0.1), { line: '#1a1526' });

    const L = span(b), z = 0.18;
    /* PAREMENT DE BETON : des joints horizontaux tous les tiers de hauteur.
       Sans eux la facade est un aplat, et un aplat de cette taille n'a pas
       d'echelle : on ne sait pas si le mur fait trois metres ou dix. */
    for (let i = 1; i <= 3; i++)
      faceRect(ctx, ...fp(b, 0, z + wallH * i / 4), 'left', 0, 0, R(L * FW), 1, shade(mur, -0.3));

    // ---- l'entree : un renfoncement, l'auvent, et la lumiere qui en sort
    const px0 = L / 2 - 0.55;
    faceRect(ctx, ...fp(b, px0, z + 1.12), 'left', 0, 0, R(1.1 * FW), R(1.12 * FH), '#241d33');
    doorway(ctx, ...fp(b, L / 2 - 0.34, z + 0.98), 'left', 0.68, 0.98, '#1a1526');
    // le rai de lumiere sous la porte, seul signe qu'il y a quelqu'un dedans
    faceRect(ctx, ...fp(b, L / 2 - 0.32, z + 0.1), 'left', 0, 0, R(0.64 * FW), 2,
      on ? '#ff8ecb' : '#5e2545');
    // auvent en tole, sur deux poteaux
    box(ctx, b.x + b.w / 2 - 0.85, b.y + b.d, z + 1.16, 1.7, 0.75, 0.12, '#2f2743', { line: '#171223' });
    for (const ox of [-0.78, 0.66])
      box(ctx, b.x + b.w / 2 + ox, b.y + b.d + 0.6, 0, 0.1, 0.1, z + 1.16, '#3d3455', { line: '#171223' });

    // ---- la file : trois poteaux et leur cordon
    for (let i = 0; i < 3; i++) {
      const cx = b.x + b.w / 2 + 0.95 + i * 0.62;
      box(ctx, cx, b.y + b.d + 0.5, 0, 0.09, 0.09, 0.42, '#8f7a4a', { line: '#4a3d24' });
      const p1 = P(cx + 0.045, b.y + b.d + 0.545, 0.42);
      if (i < 2) {
        const p2 = P(cx + 0.665, b.y + b.d + 0.545, 0.42);
        line2(ctx, p1, p2, '#9a3350', 2);
      }
    }

    // ---- enceintes de part et d'autre, empilees
    for (const ox of [0.2, b.w - 0.6]) {
      box(ctx, b.x + ox, b.y + b.d + 0.12, 0, 0.4, 0.4, 0.52, '#2b2340', { line: '#191327' });
      box(ctx, b.x + ox, b.y + b.d + 0.12, 0.52, 0.4, 0.4, 0.42, '#332a4d', { line: '#191327' });
      const q = P(b.x + ox + 0.2, b.y + b.d + 0.52, 0.78);
      pxEllipse(ctx, R(q.x), R(q.y), 3, 2, '#1a1526');
    }

    // ---- sur le toit : la gaine d'extraction et deux caissons
    const zt = wallH + 0.36;
    box(ctx, b.x + 0.5, b.y + 0.45, zt, 0.42, 0.42, 0.55, '#4a4260', { line: '#221c33' });
    box(ctx, b.x + 0.4, b.y + 0.35, zt + 0.55, 0.62, 0.62, 0.12, '#3a3350', { line: '#221c33' });
    box(ctx, b.x + b.w - 1.1, b.y + 0.5, zt, 0.55, 0.5, 0.28, '#57506e', { line: '#221c33' });

    /* LE HALO. Un club se repere de loin a ce qui deborde de lui : ici deux
       bandes roses sur l'acrotere, allumees au rythme de l'enseigne. */
    faceRect(ctx, ...fp(b, 0.15, wallH + z + 0.3), 'left', 0, 0, R((L - 0.3) * FW), 2,
      on ? '#ff5cb4' : '#7a2a58');
  },

  // entrepot de pressage

  // ---------------------------------------------------- le bunker
  // Beton brut, pas de toit en pente, une porte blindee et des aerations.
  // C'est le contraire de la cabane : anguleux, ferme, un peu inquietant.
  bunker(ctx, b, env) {
    const beton = b.wall || '#8f8a94', wallH = 1.35;
    // socle plus large, comme une dalle coulee
    box(ctx, b.x - 0.12, b.y - 0.12, 0, b.w + 0.24, b.d + 0.24, 0.22, shade(beton, -0.3),
      { line: shade(beton, -0.6) });
    box(ctx, b.x, b.y, 0.22, b.w, b.d, wallH, beton, { line: shade(beton, -0.55) });
    // acrotere : le muret qui depasse en haut, signature du toit plat
    box(ctx, b.x - 0.1, b.y - 0.1, wallH + 0.22, b.w + 0.2, b.d + 0.2, 0.22,
      shade(beton, 0.08), { line: shade(beton, -0.55) });
    box(ctx, b.x + 0.12, b.y + 0.12, wallH + 0.22, b.w - 0.24, b.d - 0.24, 0.1,
      shade(beton, -0.22), { line: null });

    const L = span(b), z = 0.22;
    // porte blindee, encastree
    faceRect(ctx, ...fp(b, L / 2 - 0.42, z + 1.0), 'left', 0, 0, R(0.84 * FW), R(1.0 * FH), shade(beton, -0.42));
    doorway(ctx, ...fp(b, L / 2 - 0.34, z + 0.92), 'left', 0.68, 0.92, '#4a4652');
    // deux grilles d'aeration
    for (const u of [0.3, L - 0.62]) {
      const o = fp(b, u, z + 1.16);
      faceRect(ctx, o[0], o[1], o[2], 'left', 0, 0, R(0.32 * FW), R(0.26 * FH), shade(beton, -0.35));
      for (let i = 0; i < 3; i++)
        faceRect(ctx, o[0], o[1], o[2], 'left', 1, 1 + i * 2, R(0.32 * FW) - 2, 1, shade(beton, 0.2));
    }
    // bande lumineuse au-dessus de la porte
    const allume = env.night || Math.sin(artTime() * 2.2) > -0.4;
    faceRect(ctx, ...fp(b, L / 2 - 0.5, z + 1.12), 'left', 0, 0, R(1.0 * FW), 2,
      allume ? '#ff5cb4' : '#7a2a58');
    // cheminee d'extraction sur le toit
    const zt = wallH + 0.44;
    box(ctx, b.x + b.w - 0.7, b.y + 0.28, zt, 0.34, 0.34, 0.5, '#6f6a75', { line: '#3f3b46' });
    box(ctx, b.x + b.w - 0.78, b.y + 0.2, zt + 0.5, 0.5, 0.5, 0.12, '#5a5661', { line: '#3f3b46' });
    if (b.antenna) {
      box(ctx, b.x + 0.4, b.y + 0.4, zt, 0.08, 0.08, 1.1, '#cfcad4', { line: '#4a4652' });
      const p = P(b.x + 0.44, b.y + 0.44, zt + 1.15);
      px(ctx, R(p.x) - 1, R(p.y) - 1, 2, 2, Math.sin(artTime() * 4) > 0 ? '#ff3ea5' : '#7a2a58');
    }
  },

  // -------------------------------------------------- l'immeuble
  // Plusieurs etages empiles avec de legers retraits, des balcons sur la
  // facade et un toit encombre : chateau d'eau, antenne, climatiseurs.
  immeuble(ctx, b, env) {
    const mur = b.wall || '#c9a06a';
    const etages = b.etages || 3;
    const hE = 1.0;
    let z = 0;
    for (let i = 0; i < etages; i++) {
      const r = i * 0.1;
      const x = b.x + r, y = b.y + r, w = b.w - r * 2, d = b.d - r * 2;
      const teinte = i % 2 ? shade(mur, 0.06) : mur;
      box(ctx, x, y, z, w, d, hE, teinte, { line: shade(mur, -0.55) });
      // bandeau entre les etages
      box(ctx, x - 0.06, y - 0.06, z + hE, w + 0.12, d + 0.12, 0.12,
        shade(b.roof || '#8f5fc9', -0.1), { line: shade(mur, -0.55) });
      // fenetres, et un balcon un etage sur deux
      const sub = { x, y, w, d };
      const nF = Math.max(2, R(span(sub) - 0.7));
      windowRow(ctx, ...fp(sub, 0.34, z + hE - 0.22), 'left', span(sub) - 0.68, 0.4, nF,
        env.night ? '#ffd76a' : '#9ad9e8');
      if (i % 2 === 1) {
        box(ctx, x + 0.18, y + d, z + 0.12, w - 0.36, 0.3, 0.07, shade(mur, -0.2),
          { line: shade(mur, -0.55) });
        for (let k = 0; k <= 3; k++)
          box(ctx, x + 0.2 + k * (w - 0.4) / 3, y + d + 0.22, z + 0.19, 0.06, 0.06, 0.28,
            '#e8e0cf', { line: shade(mur, -0.5) });
      }
      z += hE + 0.12;
    }
    // rez : la porte
    doorway(ctx, ...fp(b, span(b) / 2 - 0.34, 0.92), 'left', 0.68, 0.92, '#6b4426');
    // toit encombre
    box(ctx, b.x + 0.3, b.y + 0.3, z, b.w - 0.6, b.d - 0.6, 0.1, shade(mur, -0.28),
      { line: shade(mur, -0.55) });
    // chateau d'eau sur pieds
    const cx = b.x + b.w - 0.85, cy2 = b.y + 0.35;
    for (const [ox, oy] of [[0, 0], [0.4, 0], [0, 0.4], [0.4, 0.4]])
      box(ctx, cx + ox, cy2 + oy, z + 0.1, 0.08, 0.08, 0.3, '#6b5a48', { line: '#3f342a' });
    box(ctx, cx - 0.06, cy2 - 0.06, z + 0.4, 0.6, 0.6, 0.45, '#a8724a', { line: '#5c3a24' });
    box(ctx, cx - 0.1, cy2 - 0.1, z + 0.85, 0.68, 0.68, 0.1, '#8a5a38', { line: '#5c3a24' });
    // climatiseurs
    box(ctx, b.x + 0.35, b.y + b.d - 0.8, z + 0.1, 0.4, 0.4, 0.25, '#cfcad4', { line: '#5a5661' });
    if (b.antenna) {
      box(ctx, b.x + 0.5, b.y + 0.5, z + 0.1, 0.07, 0.07, 1.2, '#e8e0cf', { line: '#4a4652' });
      const p = P(b.x + 0.53, b.y + 0.53, z + 1.35);
      px(ctx, R(p.x) - 1, R(p.y) - 1, 2, 2, Math.sin(artTime() * 4) > 0 ? '#ff3ea5' : '#7a2a58');
    }
  },

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
const HAUTEURS = { hut: 3.2, house: 3.8, big: 5.2, tower: 9, club: 3.2, chantier: 1.6,
  bunker: 3.4, immeuble: 6.4 };
const cacheBatiments = new Map();

function styleDe(b) {
  return b.bunker ? 'bunker' : b.immeuble ? 'immeuble' : b.hut ? 'hut'
    : b.club ? 'club' : b.big ? 'big' : b.tower ? 'tower' : 'house';
}

/* L'ORDRE DE DESSIN DES AILES. Une aile plus proche de la camera doit
   couvrir le corps, une aile plus lointaine doit etre couverte par lui. En
   isometrie la profondeur se lit sur x + y : on trie les ailes autour de la
   cle du corps, on peint celles de derriere, puis le corps et tout son
   detail, puis celles de devant. Le meme tri que le rendu general, applique
   a l'interieur d'un seul batiment. */
function corpsEtAiles(g, b, env, style) {
  const ailes = b.ailes || [];
  const kb = b.x + b.w / 2 + b.y + b.d / 2;
  const arriere = [], avant = [];
  for (const a of ailes) (a.x + a.w / 2 + a.y + a.d / 2 < kb ? arriere : avant).push(a);
  for (const a of arriere) aile(g, b, a, env);
  STYLES[style](g, b, env);
  for (const a of avant) aile(g, b, a, env);
  enseigne(g, b, style, env);
}

function rendreSprite(b, env, style, cle) {
  // Le tampon doit contenir le corps ET ses ailes : une aile qui deborde de
  // l'ancien cadre serait tout simplement coupee.
  const e = emprise(b);
  let Hm = HAUTEURS[style] || 3.5;
  for (const a of b.ailes || []) Hm = Math.max(Hm, (a.h || 1) + 0.6);
  const H = Hm + 1.8;                            // + l'enseigne au-dessus du toit
  const marge = 108;
  const ancre = toScreen(e.x, e.y, 0);
  const gauche = Math.ceil(e.d * HW) + marge;
  const haut = Math.ceil(H * HU) + 12;
  const w = gauche + Math.ceil(e.w * HW) + marge;
  const h = haut + Math.ceil((e.w + e.d) * HH) + 28;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const dx = Math.floor(ancre.x) - gauche, dy = Math.floor(ancre.y) - haut;
  g.setTransform(1, 0, 0, 1, -dx, -dy);
  if (style === 'chantier') construction(g, b); else corpsEtAiles(g, b, env, style);
  outlineCanvas(c, '#2a1d33');
  return { canvas: c, dx, dy, cle };
}

export function drawBuilding(ctx, b, env) {
  const style = env.unlocked ? styleDe(b) : 'chantier';
  const neon = b.club ? (Math.sin(artTime() * 3.4) > -0.75 ? 1 : 0) : 0;
  env = { ...env, neon };
  // La nuit entre dans la cle : elle allume les enseignes et les fenetres,
  // et elle ne change pas forcement au meme instant que le palier de lumiere.
  const cle = style + '|' + LIGHT.key + '|' + neon + '|' + (env.night ? 1 : 0);
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
/* LE CACHE SE PURGE SUR LA LUMIERE, PAS SUR SA TAILLE.

   Il se vidait au-dela de quatre cents entrees. Tant que la clairiere
   comptait deux cent cinquante decors, le plafond n'etait jamais atteint.
   A cinq cent quatre-vingt-douze, il l'etait au milieu de chaque image :
   le cache se vidait, les decors suivants redessinaient leur arbre et son
   contour, et l'image d'apres recommencait. Mesure a 325 millisecondes par
   image, soit trois images par seconde, contre une avant l'agrandissement
   du terrain.

   La taille n'etait pas le bon critere. Ce qui perime une image d'arbre,
   c'est le changement de lumiere : on vide donc quand le palier change, et
   le cache contient alors exactement les decors de l'heure courante. */
const cacheDecors = new Map();
let cleDecors = '';
const AX = 56, AY = 88, DW = 112, DH = 116;   // ancre et taille du tampon

export function drawProp(ctx, pr, env) {
  const s = pr.s || 1;
  const graine = Math.round(pr.type === 'tree' ? pr.x * 3 + pr.y
    : pr.type === 'bush' ? pr.x * 5 + pr.y
    : pr.x + pr.y * 3);
  const lumiere = LIGHT.key + '|' + (env && env.night ? 1 : 0);
  if (lumiere !== cleDecors) { cacheDecors.clear(); cleDecors = lumiere; }
  const cle = pr.type + '|' + s.toFixed(2) + '|' + graine;
  let sp = cacheDecors.get(cle);
  if (!sp) {
    const c = document.createElement('canvas');
    c.width = DW; c.height = DH;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const ancre = toScreen(pr.x, pr.y, 0);
    g.setTransform(1, 0, 0, 1, AX - Math.floor(ancre.x), AY - Math.floor(ancre.y));
    dessinerDecor(g, pr, s, graine, env);
    outlineCanvas(c, '#2a1d33');
    sp = { canvas: c };
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
    case 'ponton': {
      /* Un ponton de planches, avance de deux tuiles sur l'eau. Il donne a
         l'etang une echelle : sans rien de bati au bord, on ne sait pas si
         l'on regarde une mare ou un lac. */
      for (let i = 0; i < 5; i++)
        box(ctx, x - 0.55, y + i * 0.42, 0.06, 1.1, 0.36, 0.07, i % 2 ? '#b3854f' : '#a87b47',
          { line: '#5c4128' });
      for (const [ox, oy] of [[-0.5, 0.1], [0.44, 0.1], [-0.5, 1.72], [0.44, 1.72]])
        box(ctx, x + ox, y + oy, -0.24, 0.1, 0.1, 0.3, '#6b4426', { line: '#3f2a18' });
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
