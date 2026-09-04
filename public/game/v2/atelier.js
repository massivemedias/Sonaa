// =====================================================================
//  L'ATELIER · fabrique des textures a partir du dessin existant
//  ---------------------------------------------------------------
//  Le passage a Phaser ne jette pas une ligne du dessin. Tout ce qui
//  fabrique l'image : art.js, architecture.js, player.js, travaille dans
//  un contexte canvas 2D et ne sait rien de qui l'affiche. On s'en sert
//  donc tel quel pour cuire des textures, une fois, et Phaser les affiche
//  ensuite en WebGL.
//
//  C'est le seul rapport honnete entre un moteur et un jeu deja ecrit : le
//  moteur prend en charge l'affichage, la camera, les entrees et les
//  effets ; il ne dessine pas a votre place, et il ne rendra pas joli ce
//  qui ne l'est pas.
// =====================================================================
import { toScreen, HW, HH, HU } from '../src/core/iso.js';
import { drawGround, drawBuilding, drawProp, castBuildingShadow, styleDe } from '../src/world/architecture.js';
import { setTime, setLight } from '../src/core/art.js';

const R = Math.round;

function toile(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

/* LE SOL ENTIER EN UNE SEULE IMAGE.

   Le rendu canvas redessinait chaque tuile visible a chaque image : mille
   deux cents appels par frame pour un sol qui ne bouge jamais. Toute la
   clairiere tient dans 1296 par 700 pixels, soit moins d'un million : on la
   cuit une fois et Phaser affiche UNE image. Les fleurs et les touffes
   semees par drawGround sont dedans, elles sont deterministes. */
export function cuireLeSol(city) {
  const w = (city.w + city.h) * HW;
  const h = (city.w + city.h) * HH + 64;
  const ox = city.h * HW;          // la tuile (0, h) est le point le plus a gauche
  const oy = 32;
  const { c, g } = toile(w, h);
  g.setTransform(1, 0, 0, 1, ox, oy);
  drawGround(g, city, null);
  return { canvas: c, ox, oy };
}

/* UN BATIMENT, AILES ET OMBRE COMPRISES. On reprend la logique de cadrage
   de l'ancien renderer : le tampon doit contenir tout ce qui deborde du
   pied du batiment, vers le haut comme sur les cotes. */
export function cuireBatiment(b, env) {
  const marge = 120, haut = 12 * HU;
  const ancre = toScreen(b.x, b.y, 0);
  const gauche = Math.ceil((b.d + 4) * HW) + marge;
  const w = gauche + Math.ceil((b.w + 4) * HW) + marge;
  const h = haut + Math.ceil((b.w + b.d + 6) * HH) + 64;
  const { c, g } = toile(w, h);
  const dx = Math.floor(ancre.x) - gauche, dy = Math.floor(ancre.y) - haut;
  g.setTransform(1, 0, 0, 1, -dx, -dy);
  castBuildingShadow(g, b, env.unlocked);
  drawBuilding(g, b, env);
  return { canvas: c, dx, dy };
}

export function cuireDecor(pr, env) {
  const AX = 72, AY = 104, W = 144, H = 148;
  const { c, g } = toile(W, H);
  const a = toScreen(pr.x, pr.y, 0);
  g.setTransform(1, 0, 0, 1, AX - Math.floor(a.x), AY - Math.floor(a.y));
  drawProp(g, pr, env);
  return { canvas: c, ax: AX, ay: AY };
}

/* LES IMAGES DU PERSONNAGE, CUITES UNE FOIS PAR POSE.

   Player.draw() dessine a une position du monde et lit son propre etat.
   On le place a l'origine, on lui impose la pose voulue, et l'on capture.
   Huit poses suffisent : quatre temps de marche, deux orientations, plus
   le dos. Phaser les joue ensuite comme une animation, ce que le rendu
   canvas faisait a la main a chaque image. */
export function cuirePersonnage(p, city) {
  const AX = 48, AY = 72, W = 96, H = 96;
  const poses = {};
  const etatSauve = { anim: p.anim, flip: p.flip, back: p.back, moving: p.moving, blink: p.blink };
  const faire = (nom, { f, flip, back, moving }) => {
    const { c, g } = toile(W, H);
    const a = toScreen(0, 0, 0);
    g.setTransform(1, 0, 0, 1, AX - Math.floor(a.x), AY - Math.floor(a.y));
    const sx = p.x, sy = p.y;
    p.x = 0; p.y = 0;
    p.anim = f / 1.6; p.flip = flip; p.back = back; p.moving = moving; p.blink = 0;
    p.draw(g, 0, city);
    p.x = sx; p.y = sy;
    poses[nom] = { canvas: c, ax: AX, ay: AY };
  };
  for (let f = 0; f < 4; f++) {
    faire(`marche_d_${f}`, { f, flip: 1, back: false, moving: true });
    faire(`marche_g_${f}`, { f, flip: -1, back: false, moving: true });
    faire(`dos_${f}`, { f, flip: 1, back: true, moving: true });
  }
  faire('repos_d', { f: 0, flip: 1, back: false, moving: false });
  faire('repos_g', { f: 0, flip: -1, back: false, moving: false });
  faire('repos_dos', { f: 0, flip: 1, back: true, moving: false });
  Object.assign(p, etatSauve);
  return poses;
}

export { setTime, setLight, styleDe, R };
