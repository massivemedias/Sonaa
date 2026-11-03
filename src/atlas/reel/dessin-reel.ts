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
import { dessinerAffiche, type TextesAffiche } from '../rythme/dessin.ts';

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

function filet(ctx: CanvasRenderingContext2D, y: number, alpha = 0.16): void {
  ctx.save();
  ctx.fillStyle = `rgba(239, 231, 216, ${alpha})`;
  ctx.fillRect(MARGE_REEL, y, LARGEUR_REEL - 2 * MARGE_REEL, 1);
  ctx.restore();
}

/** Une image recadree pour remplir le cadre, angles nets (3 px) et filet fin,
    comme une pochette ou une affiche imprimee. */
function cadre(ctx: CanvasRenderingContext2D, img: ImageBitmap | null, x: number, y: number, l: number, h: number, r = 3): void {
  ctx.save();
  arrondi(ctx, x, y, l, h, r);
  ctx.clip();
  if (img) {
    const e = Math.max(l / img.width, h / img.height);
    const lw = img.width * e;
    const lh = img.height * e;
    ctx.drawImage(img, x + (l - lw) / 2, y + (h - lh) / 2, lw, lh);
  } else {
    ctx.fillStyle = 'rgba(239, 231, 216, 0.04)';
    ctx.fillRect(x, y, l, h);
  }
  ctx.restore();
  ctx.save();
  arrondi(ctx, x + 0.5, y + 0.5, l - 1, h - 1, r);
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
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

/* --- Le fond, l'en-tete et le pied editoriaux ---------------------------- */

/** Fond mat : l'image de la scene tres assombrie en pleine page quand elle
    existe, sans halo artificiel ni lueur radiale. */
function fond(ctx: CanvasRenderingContext2D, img: ImageBitmap | null): void {
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, LARGEUR_REEL, HAUTEUR_DU_REEL);
  if (img) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    const e = Math.max(LARGEUR_REEL / img.width, HAUTEUR_DU_REEL / img.height);
    const lw = img.width * e;
    const lh = img.height * e;
    ctx.drawImage(img, (LARGEUR_REEL - lw) / 2, (HAUTEUR_DU_REEL - lh) / 2, lw, lh);
    ctx.restore();
    const voile = ctx.createLinearGradient(0, 0, 0, HAUTEUR_DU_REEL);
    voile.addColorStop(0, 'rgba(10, 7, 4, 0.72)');
    voile.addColorStop(0.5, 'rgba(10, 7, 4, 0.86)');
    voile.addColorStop(1, 'rgba(10, 7, 4, 0.96)');
    ctx.fillStyle = voile;
    ctx.fillRect(0, 0, LARGEUR_REEL, HAUTEUR_DU_REEL);
  }
}

/** En-tete de planche : titre en casse normale a gauche, ville ou compteur a
    droite, poses sur un filet fin (aucun surtitre en capitales espacees). */
function entete(ctx: CanvasRenderingContext2D, titre: string, droite: string): void {
  texte(ctx, titre, MARGE_REEL, HAUT_UTILE + 34, 600, 34, CREME, 0.92);
  texte(ctx, droite, LARGEUR_REEL - MARGE_REEL, HAUT_UTILE + 34, 500, 28, CREME, 0.52, 'right');
  filet(ctx, HAUT_UTILE + 54, 0.22);
}

/** Pied de planche : signature a gauche et repere de pas fin a droite, sous
    un filet d'encadrement. */
function piedDuReel(ctx: CanvasRenderingContext2D, motif: Motif, position: number): void {
  const y = 1480;
  filet(ctx, y, 0.18);
  texte(ctx, 'sonaa.ca', MARGE_REEL, y + 48, 600, 30, CREME, 0.72);
  const n = motif.pas;
  const totalLargeur = 280;
  const pas = totalLargeur / n;
  const x0 = LARGEUR_REEL - MARGE_REEL - totalLargeur;
  const courant = Math.floor(position) % n;
  for (let i = 0; i < n; i++) {
    const actif = motif.pistes.some((p) => (p.pas[i] ?? 0) > 0);
    const x = x0 + i * pas;
    ctx.fillStyle = i === courant ? AMBRE : CREME;
    ctx.globalAlpha = i === courant ? 1 : actif ? 0.42 : 0.14;
    ctx.fillRect(x, i === courant ? y + 24 : y + 28, Math.max(2, pas - 4), i === courant ? 22 : 14);
  }
  ctx.globalAlpha = 1;
}

/* --- Les scenes ---------------------------------------------------------- */

function ouverture(ctx: CanvasRenderingContext2D, c: ContenuReel): void {
  entete(ctx, 'sonaa.ca', c.mots.ouverture);
  const taille = ajuster(ctx, c.ville, 700, 152, 76, LARGEUR_REEL - 2 * MARGE_REEL);
  texte(ctx, c.ville, MARGE_REEL, HAUT_UTILE + 210, 700, taille, CREME);
  texte(ctx, c.dates, MARGE_REEL, HAUT_UTILE + 280, 500, 44, AMBRE);
  filet(ctx, HAUT_UTILE + 330, 0.18);

  /* Si une soiree a une affiche, on la met en vitrine ; sinon on dresse
     l'index typographique des premieres soirees, sans carre vide. */
  const vedette = c.soirees.find((s) => s.image !== null);
  if (vedette) {
    cadre(ctx, vedette.image, MARGE_REEL, HAUT_UTILE + 370, LARGEUR_REEL - 2 * MARGE_REEL, 640, 3);
    texte(ctx, `${vedette.jour}${vedette.lieu ? ` · ${vedette.lieu}` : ''}`, MARGE_REEL, HAUT_UTILE + 1066, 600, 30, AMBRE);
    ctx.font = police(700, 46);
    const l = couper(ctx, vedette.titre, LARGEUR_REEL - 2 * MARGE_REEL, 2);
    l.forEach((ligne, idx) => texte(ctx, ligne, MARGE_REEL, HAUT_UTILE + 1122 + idx * 54, 700, 46, CREME));
  } else {
    const largeur = LARGEUR_REEL - 2 * MARGE_REEL;
    c.soirees.slice(0, 4).forEach((s, idx) => {
      const y = HAUT_UTILE + 392 + idx * 204;
      if (idx > 0) filet(ctx, y - 42, 0.12);
      texte(ctx, `${s.jour}${s.lieu ? ` · ${s.lieu}` : ''}`, MARGE_REEL, y, 600, 28, AMBRE);
      ctx.font = police(700, 44);
      const l = couper(ctx, s.titre, largeur, 2);
      l.forEach((ligne, j) => texte(ctx, ligne, MARGE_REEL, y + 54 + j * 50, 700, 44, CREME));
    });
  }
}

function soirees(ctx: CanvasRenderingContext2D, c: ContenuReel, paquet: number): void {
  const totalPaquets = Math.ceil(c.soirees.length / PAR_SCENE);
  const compteur = totalPaquets > 1 ? `${c.ville} · ${paquet + 1}/${totalPaquets}` : c.ville;
  entete(ctx, c.mots.soirees, compteur);
  const liste = c.soirees.slice(paquet * PAR_SCENE, paquet * PAR_SCENE + PAR_SCENE);
  liste.forEach((s, k) => {
    const y = HAUT_UTILE + 92 + k * 372;
    if (k > 0) filet(ctx, y - 28, 0.12);
    if (s.image) {
      cadre(ctx, s.image, MARGE_REEL, y, 288, 288, 3);
    }
    const x = s.image ? MARGE_REEL + 324 : MARGE_REEL;
    const largeur = LARGEUR_REEL - x - MARGE_REEL;
    texte(ctx, s.jour, x, y + 36, 600, 29, AMBRE);
    ctx.font = police(700, 46);
    const lignes = couper(ctx, s.titre, largeur, 3);
    lignes.forEach((l, i) => texte(ctx, l, x, y + 98 + i * 54, 700, 46, CREME));
    if (s.lieu) {
      ctx.font = police(500, 32);
      const lieu = couper(ctx, s.lieu, largeur, 1)[0] ?? '';
      texte(ctx, lieu, x, y + 98 + lignes.length * 54 + 14, 500, 32, CREME, 0.62);
    }
  });
}

function news(ctx: CanvasRenderingContext2D, c: ContenuReel, i: number): void {
  const n = c.news[i];
  if (!n) return;
  entete(ctx, c.mots.news, n.source);
  cadre(ctx, n.image, MARGE_REEL, HAUT_UTILE + 92, LARGEUR_REEL - 2 * MARGE_REEL, 580, 3);
  texte(ctx, n.source, MARGE_REEL, HAUT_UTILE + 736, 600, 32, AMBRE);
  ctx.font = police(700, 58);
  couper(ctx, n.titre, LARGEUR_REEL - 2 * MARGE_REEL, 5).forEach((l, k) =>
    texte(ctx, l, MARGE_REEL, HAUT_UTILE + 814 + k * 70, 700, 58, CREME),
  );
}

function mixtapes(ctx: CanvasRenderingContext2D, c: ContenuReel): void {
  entete(ctx, c.mots.mixtapes, 'sonaa.ca');
  const seule = c.mixtapes.length === 1;
  c.mixtapes.slice(0, 2).forEach((m, k) => {
    if (seule) {
      const cote = 640;
      cadre(ctx, m.image, MARGE_REEL, HAUT_UTILE + 96, cote, cote, 3);
      texte(ctx, m.artiste, MARGE_REEL, HAUT_UTILE + 800, 600, 36, AMBRE);
      ctx.font = police(700, 56);
      const lignes = couper(ctx, m.titre, LARGEUR_REEL - 2 * MARGE_REEL, 3);
      lignes.forEach((l, i) => texte(ctx, l, MARGE_REEL, HAUT_UTILE + 868 + i * 66, 700, 56, CREME));
    } else {
      const y = HAUT_UTILE + 96 + k * 536;
      if (k > 0) filet(ctx, y - 34, 0.12);
      cadre(ctx, m.image, MARGE_REEL, y, 420, 420, 3);
      const x = MARGE_REEL + 456;
      texte(ctx, m.artiste, x, y + 44, 600, 34, AMBRE);
      ctx.font = police(700, 48);
      const lignes = couper(ctx, m.titre, LARGEUR_REEL - x - MARGE_REEL, 4);
      lignes.forEach((l, i) => texte(ctx, l, x, y + 108 + i * 58, 700, 48, CREME));
    }
  });
}

function label(ctx: CanvasRenderingContext2D, c: ContenuReel): void {
  const l = c.label;
  if (!l) return;
  entete(ctx, c.mots.label, l.style);
  const cote = 420;
  const x = MARGE_REEL;
  const y = HAUT_UTILE + 104;
  ctx.save();
  arrondi(ctx, x, y, cote, cote, 3);
  ctx.fillStyle = l.logo ? 'rgba(239, 231, 216, 0.94)' : 'rgba(239, 231, 216, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (l.logo) contenir(ctx, l.logo, x + 40, y + 40, cote - 80, cote - 80);
  else texte(ctx, l.nom.slice(0, 2).toUpperCase(), x + cote / 2, y + cote / 2 + 54, 700, 150, CREME, 0.85, 'center');
  ctx.restore();

  const taille = ajuster(ctx, l.nom, 700, 104, 52, LARGEUR_REEL - 2 * MARGE_REEL);
  texte(ctx, l.nom, MARGE_REEL, HAUT_UTILE + 640 + taille * 0.4, 700, taille, CREME);
  filet(ctx, HAUT_UTILE + 720, 0.16);
  texte(ctx, `${c.mots.style} ${l.style}`, MARGE_REEL, HAUT_UTILE + 784, 500, 42, AMBRE);
}

function fin(ctx: CanvasRenderingContext2D, c: ContenuReel): void {
  entete(ctx, c.mots.fin, c.ville);
  texte(ctx, 'sonaa.ca', MARGE_REEL, 820, 700, 148, CREME);
  filet(ctx, 868, 0.22);
  texte(ctx, `${c.ville} · ${c.dates}`, MARGE_REEL, 938, 600, 42, AMBRE);
  texte(ctx, c.mots.finSous, MARGE_REEL, 1004, 500, 36, CREME, 0.68);
}

function imageDeFond(c: ContenuReel, scene: Scene): ImageBitmap | null {
  if (scene.sorte === 'ouverture') return c.soirees.find((s) => s.image !== null)?.image ?? null;
  if (scene.sorte === 'soirees') {
    return c.soirees.slice(scene.indice * PAR_SCENE, (scene.indice + 1) * PAR_SCENE).find((s) => s.image !== null)?.image ?? null;
  }
  if (scene.sorte === 'news') return c.news[scene.indice]?.image ?? null;
  if (scene.sorte === 'mixtapes') return c.mixtapes.find((m) => m.image !== null)?.image ?? null;
  return null;
}

/** Dessine l'image de l'instant `t` (en secondes depuis le debut du reel).
    `position` est la tete de lecture du rythme, en pas, et `etat` son
    arrangement (montee, silence, drop), pour l'affiche. */
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
    fond(ctx, imageDeFond(c, scene));
    /* Coupe franche, fondu tres court (120 ms) sans glissement vertical. */
    const fondu = Math.min(sortie(u / 0.12), sortie((scene.duree - u) / 0.12));
    ctx.save();
    ctx.globalAlpha = fondu;
    if (scene.sorte === 'ouverture') ouverture(ctx, c);
    else if (scene.sorte === 'soirees') soirees(ctx, c, scene.indice);
    else if (scene.sorte === 'news') news(ctx, c, scene.indice);
    else if (scene.sorte === 'mixtapes') mixtapes(ctx, c);
    else if (scene.sorte === 'label') label(ctx, c);
    else fin(ctx, c);
    ctx.restore();
    piedDuReel(ctx, c.motif, position);
  }
  ctx.restore();
}
