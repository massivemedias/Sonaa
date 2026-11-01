/* LE REEL DU JEUDI, IMAGE PAR IMAGE (ADR-115).
 *
 * Une video verticale de 1080 x 1920, d'une quarantaine de secondes, dans le
 * theme du site : fond brun presque noir, lueur ambre qui bat avec le kick,
 * Inter, creme et ambre. Les scenes se suivent : l'ouverture (la ville et
 * les dates), les soirees trois par trois, une news par scene, les
 * mixtapes, le label de la semaine, puis l'affiche de rythme de son style,
 * celle des pages de style, qui joue la musique du reel depuis le debut.
 *
 * LA BANDE QU'INSTAGRAM NE COUVRE PAS. Le haut (environ 250 px) porte le
 * nom du compte, le bas (environ 400 px) la legende et les boutons : le
 * texte vit entre les deux, et seuls le fond et la grille de pas debordent.
 *
 * Ce fichier ne charge rien : les images arrivent deja decodees, les mots
 * deja traduits (langue.ts). */

import type { Motif } from '../../lib/rythmes.ts';
import type { Etat } from '../rythme/arrangement.ts';
import { pasParTemps } from '../rythme/arrangement.ts';
import { dessinerAffiche, TEINTES, type TextesAffiche } from '../rythme/dessin.ts';

export const LARGEUR_REEL = 1080;
export const HAUTEUR_DU_REEL = 1920;

const SANS = 'Inter, system-ui, -apple-system, sans-serif';
const FOND = '#0a0704';
const CREME = '#efe7d8';
const AMBRE = '#e9a23b';
const MARGE_REEL = 72;
const HAUT_UTILE = 270;

export interface SoireeDuReel {
  readonly jour: string;
  readonly titre: string;
  readonly lieu: string;
  readonly image: ImageBitmap | null;
}

export interface NewsDuReel {
  readonly source: string;
  readonly titre: string;
  readonly image: ImageBitmap | null;
}

export interface MixtapeDuReel {
  readonly titre: string;
  readonly artiste: string;
  readonly image: ImageBitmap | null;
}

export interface ContenuReel {
  readonly ville: string;
  readonly dates: string;
  readonly soirees: readonly SoireeDuReel[];
  readonly news: readonly NewsDuReel[];
  readonly mixtapes: readonly MixtapeDuReel[];
  readonly label: { readonly nom: string; readonly logo: ImageBitmap | null; readonly style: string } | null;
  readonly motif: Motif;
  readonly affiche: TextesAffiche;
  /** Les mots du reel, deja dans la langue du site. */
  readonly mots: {
    readonly ouverture: string;
    readonly soirees: string;
    readonly news: string;
    readonly mixtapes: string;
    readonly label: string;
    readonly style: string;
    readonly fin: string;
    readonly finSous: string;
  };
}

type Sorte = 'ouverture' | 'soirees' | 'news' | 'mixtapes' | 'label' | 'affiche' | 'fin';

export interface Scene {
  readonly sorte: Sorte;
  readonly debut: number;
  readonly duree: number;
  /** Le paquet de soirees, ou la news, que la scene montre. */
  readonly indice: number;
}

const DUREES: Record<Sorte, number> = { ouverture: 3, soirees: 4.5, news: 4, mixtapes: 4, label: 4, affiche: 6, fin: 3 };
const PAR_SCENE = 3;

/** Les scenes du reel, dans l'ordre, et quand chacune commence. Une
    rubrique vide n'a pas de scene. */
export function scenesDu(c: ContenuReel): Scene[] {
  const sortes: { sorte: Sorte; indice: number }[] = [{ sorte: 'ouverture', indice: 0 }];
  for (let i = 0; i < c.soirees.length; i += PAR_SCENE) sortes.push({ sorte: 'soirees', indice: i / PAR_SCENE });
  c.news.forEach((_, i) => sortes.push({ sorte: 'news', indice: i }));
  if (c.mixtapes.length) sortes.push({ sorte: 'mixtapes', indice: 0 });
  if (c.label) sortes.push({ sorte: 'label', indice: 0 }, { sorte: 'affiche', indice: 0 });
  sortes.push({ sorte: 'fin', indice: 0 });
  let t = 0;
  return sortes.map(({ sorte, indice }) => {
    const s = { sorte, indice, debut: t, duree: DUREES[sorte] };
    t += s.duree;
    return s;
  });
}

export const dureeDesScenes = (scenes: readonly Scene[]): number => scenes.reduce((n, s) => n + s.duree, 0);

/* --- Les outils de dessin ------------------------------------------------ */

const borne = (x: number): number => Math.max(0, Math.min(1, x));
const sortie = (x: number): number => 1 - Math.pow(1 - borne(x), 3);

function police(poids: number, taille: number): string {
  return `${poids} ${taille}px ${SANS}`;
}

/** Le texte coupe a la largeur, au plus `max` lignes, la derniere
    terminee par des points de suspension si elle deborde. */
function couper(ctx: CanvasRenderingContext2D, texte: string, largeur: number, max: number): string[] {
  const mots = texte.replace(/\s+/g, ' ').trim().split(' ');
  const out: string[] = [];
  let ligne = '';
  let i = 0;
  for (; i < mots.length; i++) {
    const essai = ligne ? `${ligne} ${mots[i]}` : (mots[i] ?? '');
    if (ctx.measureText(essai).width <= largeur || !ligne) ligne = essai;
    else {
      out.push(ligne);
      ligne = mots[i] ?? '';
      if (out.length === max) break;
    }
  }
  if (out.length < max && ligne) out.push(ligne);
  if (i < mots.length || out.length > max) {
    out.length = Math.min(out.length, max);
    let d = out[out.length - 1] ?? '';
    while (d && ctx.measureText(`${d}…`).width > largeur) d = d.slice(0, -1);
    out[out.length - 1] = `${d.trimEnd()}…`;
  }
  return out;
}

/** La plus grande taille, de `max` a `min`, ou le texte tient sur une ligne. */
function ajuster(ctx: CanvasRenderingContext2D, texte: string, poids: number, max: number, min: number, largeur: number): number {
  let taille = max;
  ctx.font = police(poids, taille);
  while (taille > min && ctx.measureText(texte).width > largeur) {
    taille -= 4;
    ctx.font = police(poids, taille);
  }
  return taille;
}

function arrondi(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + h, r);
  ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

/** Une image recadree pour remplir le cadre, coins arrondis ; un cadre
    vide et doux si l'image manque. */
function cadre(ctx: CanvasRenderingContext2D, img: ImageBitmap | null, x: number, y: number, l: number, h: number, r = 18): void {
  ctx.save();
  arrondi(ctx, x, y, l, h, r);
  ctx.clip();
  if (img) {
    const e = Math.max(l / img.width, h / img.height);
    const lw = img.width * e;
    const lh = img.height * e;
    ctx.drawImage(img, x + (l - lw) / 2, y + (h - lh) / 2, lw, lh);
  } else {
    ctx.fillStyle = 'rgba(239, 231, 216, 0.06)';
    ctx.fillRect(x, y, l, h);
  }
  ctx.restore();
}

/** Une image entiere dans le cadre, sans la couper (un logo). */
function contenir(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, l: number, h: number): void {
  const e = Math.min(l / img.width, h / img.height);
  ctx.drawImage(img, x + (l - img.width * e) / 2, y + (h - img.height * e) / 2, img.width * e, img.height * e);
}

function texte(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, poids: number, taille: number, couleur: string, alpha = 1, align: CanvasTextAlign = 'left'): void {
  ctx.save();
  ctx.font = police(poids, taille);
  ctx.fillStyle = couleur;
  ctx.globalAlpha *= alpha;
  ctx.textAlign = align;
  ctx.fillText(t, x, y);
  ctx.restore();
}

/** L'apparition d'un element : opacite et glissement, decales de `retard`. */
function entree(ctx: CanvasRenderingContext2D, u: number, retard: number, dessiner: () => void): void {
  const p = sortie((u - retard) / 0.45);
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha *= p;
  ctx.translate(0, (1 - p) * 46);
  dessiner();
  ctx.restore();
}

/* --- Le fond, la grille du bas, la signature ----------------------------- */

function fond(ctx: CanvasRenderingContext2D, battement: number): void {
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, LARGEUR_REEL, HAUTEUR_DU_REEL);
  const lueur = ctx.createRadialGradient(LARGEUR_REEL / 2, 760, 0, LARGEUR_REEL / 2, 760, 980);
  lueur.addColorStop(0, `rgba(233, 162, 59, ${(0.13 + 0.07 * battement).toFixed(3)})`);
  lueur.addColorStop(0.5, `rgba(233, 162, 59, ${(0.04 + 0.02 * battement).toFixed(3)})`);
  lueur.addColorStop(1, 'rgba(233, 162, 59, 0)');
  ctx.fillStyle = lueur;
  ctx.fillRect(0, 0, LARGEUR_REEL, HAUTEUR_DU_REEL);
}

/** Une ligne de pas : allumee quand une piste y frappe, la tete de lecture
    en ambre. C'est le rythme qu'on entend. */
function grilleDuBas(ctx: CanvasRenderingContext2D, motif: Motif, position: number): void {
  const n = motif.pas;
  const ecart = n > 16 ? 6 : 10;
  const l = (LARGEUR_REEL - 2 * MARGE_REEL - (n - 1) * ecart) / n;
  const courant = Math.floor(position) % n;
  for (let i = 0; i < n; i++) {
    const piste = motif.pistes.findIndex((p) => (p.pas[i] ?? 0) > 0);
    const x = MARGE_REEL + i * (l + ecart);
    ctx.fillStyle = i === courant ? AMBRE : piste >= 0 ? (TEINTES[piste % TEINTES.length] ?? AMBRE) : 'rgba(239, 231, 216, 0.10)';
    ctx.globalAlpha = i === courant ? 1 : piste >= 0 ? 0.55 : 1;
    arrondi(ctx, x, 1462, l, 16, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function signature(ctx: CanvasRenderingContext2D): void {
  texte(ctx, 'sonaa.ca', LARGEUR_REEL / 2, 1560, 700, 40, AMBRE, 1, 'center');
}

function rubrique(ctx: CanvasRenderingContext2D, t: string): void {
  ctx.save();
  ctx.letterSpacing = '6px';
  texte(ctx, t.toUpperCase(), MARGE_REEL, HAUT_UTILE + 40, 700, 30, AMBRE);
  ctx.restore();
}

/* --- Les scenes ---------------------------------------------------------- */

function ouverture(ctx: CanvasRenderingContext2D, c: ContenuReel, u: number): void {
  entree(ctx, u, 0, () => texte(ctx, c.mots.ouverture, MARGE_REEL, 640, 600, 64, CREME, 0.8));
  entree(ctx, u, 0.15, () => {
    const taille = ajuster(ctx, c.ville, 700, 170, 80, LARGEUR_REEL - 2 * MARGE_REEL);
    texte(ctx, c.ville, MARGE_REEL - 6, 640 + 40 + taille, 700, taille, CREME);
  });
  entree(ctx, u, 0.3, () => texte(ctx, c.dates, MARGE_REEL, 960, 600, 54, AMBRE));
}

function soirees(ctx: CanvasRenderingContext2D, c: ContenuReel, u: number, paquet: number): void {
  rubrique(ctx, c.mots.soirees);
  const liste = c.soirees.slice(paquet * PAR_SCENE, paquet * PAR_SCENE + PAR_SCENE);
  liste.forEach((s, k) => {
    const y = HAUT_UTILE + 110 + k * 370;
    entree(ctx, u, 0.12 * k, () => {
      cadre(ctx, s.image, MARGE_REEL, y, 300, 300, 20);
      const x = MARGE_REEL + 340;
      const largeur = LARGEUR_REEL - x - MARGE_REEL;
      texte(ctx, s.jour, x, y + 44, 700, 32, AMBRE);
      ctx.font = police(700, 50);
      const lignes = couper(ctx, s.titre, largeur, 3);
      lignes.forEach((l, i) => texte(ctx, l, x, y + 112 + i * 60, 700, 50, CREME));
      ctx.font = police(500, 34);
      const lieu = couper(ctx, s.lieu, largeur, 1)[0] ?? '';
      texte(ctx, lieu, x, y + 112 + lignes.length * 60 + 16, 500, 34, CREME, 0.62);
    });
  });
}

function news(ctx: CanvasRenderingContext2D, c: ContenuReel, u: number, i: number): void {
  const n = c.news[i];
  if (!n) return;
  rubrique(ctx, c.mots.news);
  entree(ctx, u, 0, () => cadre(ctx, n.image, MARGE_REEL, HAUT_UTILE + 100, LARGEUR_REEL - 2 * MARGE_REEL, 560, 24));
  entree(ctx, u, 0.15, () => {
    texte(ctx, n.source, MARGE_REEL, HAUT_UTILE + 740, 700, 34, AMBRE);
    ctx.font = police(700, 62);
    couper(ctx, n.titre, LARGEUR_REEL - 2 * MARGE_REEL, 5).forEach((l, k) => texte(ctx, l, MARGE_REEL, HAUT_UTILE + 830 + k * 76, 700, 62, CREME));
  });
}

function mixtapes(ctx: CanvasRenderingContext2D, c: ContenuReel, u: number): void {
  rubrique(ctx, c.mots.mixtapes);
  const seule = c.mixtapes.length === 1;
  c.mixtapes.slice(0, 2).forEach((m, k) => {
    entree(ctx, u, 0.15 * k, () => {
      if (seule) {
        const cote = 620;
        cadre(ctx, m.image, (LARGEUR_REEL - cote) / 2, HAUT_UTILE + 110, cote, cote, 24);
        ctx.font = police(700, 60);
        const lignes = couper(ctx, m.titre, LARGEUR_REEL - 2 * MARGE_REEL, 2);
        lignes.forEach((l, i) => texte(ctx, l, LARGEUR_REEL / 2, HAUT_UTILE + 820 + i * 72, 700, 60, CREME, 1, 'center'));
        texte(ctx, m.artiste, LARGEUR_REEL / 2, HAUT_UTILE + 820 + lignes.length * 72 + 20, 600, 42, AMBRE, 1, 'center');
      } else {
        const y = HAUT_UTILE + 110 + k * 520;
        cadre(ctx, m.image, MARGE_REEL, y, 440, 440, 22);
        const x = MARGE_REEL + 480;
        ctx.font = police(700, 50);
        const lignes = couper(ctx, m.titre, LARGEUR_REEL - x - MARGE_REEL, 4);
        lignes.forEach((l, i) => texte(ctx, l, x, y + 70 + i * 60, 700, 50, CREME));
        texte(ctx, m.artiste, x, y + 70 + lignes.length * 60 + 24, 600, 38, AMBRE);
      }
    });
  });
}

function label(ctx: CanvasRenderingContext2D, c: ContenuReel, u: number): void {
  const l = c.label;
  if (!l) return;
  rubrique(ctx, c.mots.label);
  entree(ctx, u, 0, () => {
    const cote = 480;
    const x = (LARGEUR_REEL - cote) / 2;
    const y = HAUT_UTILE + 130;
    ctx.fillStyle = 'rgba(239, 231, 216, 0.92)';
    arrondi(ctx, x, y, cote, cote, 32);
    ctx.fill();
    if (l.logo) contenir(ctx, l.logo, x + 50, y + 50, cote - 100, cote - 100);
    else texte(ctx, l.nom.slice(0, 1).toUpperCase(), LARGEUR_REEL / 2, y + cote / 2 + 70, 700, 200, FOND, 1, 'center');
  });
  entree(ctx, u, 0.18, () => {
    const taille = ajuster(ctx, l.nom, 700, 120, 56, LARGEUR_REEL - 2 * MARGE_REEL);
    texte(ctx, l.nom, LARGEUR_REEL / 2, HAUT_UTILE + 780 + taille * 0.4, 700, taille, CREME, 1, 'center');
  });
  entree(ctx, u, 0.34, () => texte(ctx, `${c.mots.style} ${l.style}`, LARGEUR_REEL / 2, HAUT_UTILE + 960, 600, 46, AMBRE, 1, 'center'));
}

function fin(ctx: CanvasRenderingContext2D, c: ContenuReel, u: number): void {
  entree(ctx, u, 0, () => texte(ctx, c.mots.fin, LARGEUR_REEL / 2, 760, 600, 60, CREME, 0.8, 'center'));
  entree(ctx, u, 0.15, () => texte(ctx, 'sonaa.ca', LARGEUR_REEL / 2, 940, 700, 170, AMBRE, 1, 'center'));
  entree(ctx, u, 0.3, () => texte(ctx, c.mots.finSous, LARGEUR_REEL / 2, 1060, 500, 44, CREME, 0.7, 'center'));
}

/** Dessine l'image de l'instant `t` (en secondes depuis le debut du reel).
    `position` est la tete de lecture du rythme, en pas, et `etat` son
    arrangement (montee, silence, drop), pour l'affiche et la pulsation. */
export function dessinerReel(ctx: CanvasRenderingContext2D, c: ContenuReel, scenes: readonly Scene[], t: number, position: number, etat: Etat | null): void {
  const scene = scenes.find((s) => t >= s.debut && t < s.debut + s.duree) ?? scenes[scenes.length - 1];
  if (!scene) return;
  const u = t - scene.debut;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
  if (scene.sorte === 'affiche') {
    dessinerAffiche(ctx, c.motif, c.affiche, { position, etat }, 'reel');
  } else {
    const ppt = pasParTemps(c.motif);
    const battement = etat && !etat.silence && etat.actives[0] ? Math.exp(-((position % ppt) / ppt) * 4) : 0;
    fond(ctx, battement);
    /* La scene apparait et s'efface ; le fond, la grille et la signature
       restent. */
    const fondu = Math.min(sortie(u / 0.3), sortie((scene.duree - u) / 0.25));
    ctx.save();
    ctx.globalAlpha = fondu;
    if (scene.sorte === 'ouverture') ouverture(ctx, c, u);
    else if (scene.sorte === 'soirees') soirees(ctx, c, u, scene.indice);
    else if (scene.sorte === 'news') news(ctx, c, u, scene.indice);
    else if (scene.sorte === 'mixtapes') mixtapes(ctx, c, u);
    else if (scene.sorte === 'label') label(ctx, c, u);
    else fin(ctx, c, u);
    ctx.restore();
    grilleDuBas(ctx, c.motif, position);
    if (scene.sorte !== 'fin') signature(ctx);
  }
  ctx.restore();
}
