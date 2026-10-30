/* L'AFFICHE DE RYTHME, DESSINEE SUR UNE TOILE.

   Une seule fonction dessine tout, a une taille de reference de 1080 x 1350
   (le format portrait d'Instagram) : la page la reduit a sa largeur, l'image
   et la video la prennent telle quelle. Rien n'est donc mesure deux fois, et
   ce qu'on telecharge est exactement ce qu'on voit.

   CE QUE DIT LE CERCLE. Le tour du cercle est une mesure, le haut est le
   premier temps, et on tourne dans le sens des aiguilles d'une montre.
   Chaque piste a son anneau ; ses frappes sont des sommets, reliees dans
   l'ordre du temps, si bien que chaque instrument dessine sa propre figure :
   le kick en quatre temps fait un carre, la clave un polygone boiteux. La
   grille du bas dit la meme chose a plat, pour qui lit mieux une ligne. */

import type { Motif } from '../../lib/rythmes.ts';
import type { Etat } from './arrangement.ts';

export const LARGEUR_RYTHME = 1080;
export const HAUTEUR_RYTHME = 1350;

/* Les cinq teintes de piste, dans l'ordre fixe des jetons --piste-1 a
   --piste-5 (tokens.css). La toile ne lit pas les variables CSS : elles sont
   recopiees ici, et le test du fichier verifie qu'elles n'ont pas diverge. */
export const TEINTES = ['#e9a23b', '#7dc383', '#e2683c', '#e8cf8a', '#a37b55'] as const;
const CREME = '#efe7d8';
const CREME_DOUCE = 'rgba(239, 231, 216, 0.62)';
const CREME_PALE = 'rgba(239, 231, 216, 0.22)';
const VERT = TEINTES[1];
const AMBRE = TEINTES[0];
/* LA POLICE DU SITE, Inter, et non plus un serif : Mika, le 30 octobre
   2026, « le background dans le theme de Sonaa, et les ecritures aussi ».
   Le fond et les textes sont ceux du site ; les pistes gardent les cinq
   teintes de l'outil. */
const SANS = "Inter, system-ui, -apple-system, sans-serif";

/** Les textes de l'affiche, deja dans la langue de la page. */
export interface TextesAffiche {
  readonly titre: string;
  readonly devise: string;
  readonly entete: string;
  readonly resume: string;
  readonly racine: string;
  readonly mesure: string;
  readonly signature: string | null;
  /** La langue des noms de piste. */
  readonly langue: 'fr' | 'en';
  /** Les noms des etapes, dans l'ordre : drop, montee, silence, drop. */
  readonly sections: readonly [string, string, string, string];
}

/** L'etat du dessin a un instant : ou en est la tete de lecture, en pas
    fractionnaires depuis le debut (12,5 = au milieu du treizieme pas). */
export interface Instant {
  readonly position: number;
  /** Ou en est le morceau quand il se construit (rythme/arrangement.ts) ;
      absent, le motif tourne entier, comme au drop. */
  readonly etat?: Etat | null;
}

const rad = (pas: number, n: number): number => -Math.PI / 2 + (pas / n) * Math.PI * 2;

function espace(ctx: CanvasRenderingContext2D, texte: string, x: number, y: number, ecart: number): void {
  /* L'interlettrage a la main : letterSpacing n'existe pas partout sur les
     toiles (Safari avant la 17), et les capitales espacees font l'affiche. */
  const largeurs = [...texte].map((c) => ctx.measureText(c).width);
  const total = largeurs.reduce((a, b) => a + b, 0) + ecart * Math.max(0, largeurs.length - 1);
  let cx = x - total / 2;
  const alignement = ctx.textAlign;
  ctx.textAlign = 'left';
  [...texte].forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += (largeurs[i] ?? 0) + ecart;
  });
  ctx.textAlign = alignement;
}

function ajuster(ctx: CanvasRenderingContext2D, texte: string, police: (taille: number) => string, taille: number, largeur: number): void {
  let t = taille;
  ctx.font = police(t);
  while (t > 12 && ctx.measureText(texte).width > largeur) {
    t -= 2;
    ctx.font = police(t);
  }
}

function pave(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + h, r);
  ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

export function dessinerAffiche(ctx: CanvasRenderingContext2D, motif: Motif, textes: TextesAffiche, instant: Instant): void {
  const W = LARGEUR_RYTHME;
  const H = HAUTEUR_RYTHME;
  const n = motif.pas;
  const pasCourant = Math.floor(instant.position) % n;
  const dansLePas = instant.position - Math.floor(instant.position);

  const etat = instant.etat ?? null;
  /* LA LUMIERE suit le morceau : elle monte avec la tension, s'eteint au
     silence, et eclate au premier temps du drop qui revient. */
  const eclat = etat?.impact ? 1 - dansLePas : 0;
  const lumiere = etat?.silence ? 0.35 : 1 + (etat?.tension ?? 0) * 0.6 + eclat * 0.8;

  /* LE FOND, CELUI DU SITE : le brun presque noir de SONAA, et la lueur
     ambre de ses pages, ici derriere le cercle. */
  ctx.fillStyle = '#0a0704';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = 580;
  const lueur = ctx.createRadialGradient(cx, cy, 0, cx, cy, 600);
  lueur.addColorStop(0, `rgba(233, 162, 59, ${(0.17 * lumiere).toFixed(3)})`);
  lueur.addColorStop(0.45, `rgba(233, 162, 59, ${(0.05 * lumiere).toFixed(3)})`);
  lueur.addColorStop(1, 'rgba(233, 162, 59, 0)');
  ctx.fillStyle = lueur;
  ctx.fillRect(0, 0, W, H);
  const haut = ctx.createRadialGradient(cx, 0, 0, cx, 0, 700);
  haut.addColorStop(0, 'rgba(233, 162, 59, 0.08)');
  haut.addColorStop(1, 'rgba(233, 162, 59, 0)');
  ctx.fillStyle = haut;
  ctx.fillRect(0, 0, W, H * 0.5);

  /* LE HAUT : le nom, la devise, la ligne technique, en Inter comme le site. */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CREME;
  ajuster(ctx, textes.titre, (t) => `700 ${t}px ${SANS}`, 88, W - 120);
  ctx.fillText(textes.titre, cx, 116);
  ctx.fillStyle = AMBRE;
  ajuster(ctx, textes.devise, (t) => `500 ${t}px ${SANS}`, 38, W - 160);
  ctx.fillText(textes.devise, cx, 170);
  ctx.fillStyle = CREME_DOUCE;
  ajuster(ctx, textes.entete, (t) => `600 ${t}px ${SANS}`, 22, W - 220);
  espace(ctx, textes.entete, cx, 216, 4);

  /* LE CERCLE, assez bas pour que le « 1 » du premier temps ne touche plus
     la ligne technique, assez petit pour que le « 3 » ne touche pas la
     grille. */
  const R = 235;
  const rayons = [1, 0.8, 0.62, 0.46, 0.32];
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.10)';
  for (const k of [1.12, 1, 0.62, 0.32]) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  /* Les pas en pointille autour, les temps en chiffres. */
  /* Un temps vaut quatre doubles croches, ou trois croches en 12/8 ; sur
     deux mesures, les temps se comptent deux fois de 1 a 4. */
  const parTemps = n === 12 ? 3 : 4;
  for (let i = 0; i < n; i += 1) {
    const a = rad(i, n);
    const temps = i % parTemps === 0;
    ctx.fillStyle = temps ? 'rgba(239, 231, 216, 0.55)' : CREME_PALE;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * 1.12, temps ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `500 30px ${SANS}`;
  ctx.fillStyle = CREME_DOUCE;
  ctx.textBaseline = 'middle';
  const nTemps = n / parTemps;
  for (let b = 0; b < nTemps; b += 1) {
    const a = rad(b * parTemps, n);
    ctx.fillText(String((b % 4) + 1), cx + Math.cos(a) * R * 1.24, cy + Math.sin(a) * R * 1.24);
  }

  /* LA PRESENCE DE CHAQUE PISTE. Pendant l'intro, une piste qui n'est pas
     encore entree reste en fil tres pale, et celle qui entre se dessine sur
     son premier temps. Au silence, tout baisse. */
  const pistes = motif.pistes.slice(0, 5);
  const presence = pistes.map((_, p) => {
    if (!etat) return 1;
    if (etat.silence) return 0.3;
    if (!etat.actives[p]) return 0.12;
    return 1;
  });
  const joue = (p: number): boolean => !etat || (!etat.silence && (etat.actives[p] ?? false));

  /* LES FIGURES, de la piste la plus interieure a la plus exterieure, pour
     que le kick soit dessine par-dessus. */
  for (let p = pistes.length - 1; p >= 0; p -= 1) {
    const piste = pistes[p];
    if (!piste) continue;
    const r = R * (rayons[p] ?? 0.3);
    const teinte = TEINTES[p] ?? CREME;
    const a = presence[p] ?? 1;
    const sommets = piste.pas.flatMap((v, i) => (v > 0 ? [{ i, v, x: cx + Math.cos(rad(i, n)) * r, y: cy + Math.sin(rad(i, n)) * r }] : []));
    if (sommets.length >= 2) {
      ctx.beginPath();
      sommets.forEach((s, k) => (k === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y)));
      ctx.closePath();
      ctx.globalAlpha = 0.07 * a;
      ctx.fillStyle = teinte;
      ctx.fill();
      ctx.globalAlpha = 0.6 * a;
      ctx.strokeStyle = teinte;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const s of sommets) {
      const frappe = s.i === pasCourant && joue(p);
      const taille = (s.v === 2 ? 8 : 5.5) * (frappe ? 1.5 : 1);
      ctx.fillStyle = teinte;
      ctx.globalAlpha = (s.v === 2 ? 1 : 0.7) * a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, taille, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (frappe) {
        /* L'onde de la frappe : un anneau qui s'ouvre et s'eteint pendant
           la duree du pas. */
        ctx.strokeStyle = teinte;
        ctx.globalAlpha = 0.85 * (1 - dansLePas);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, taille + 6 + dansLePas * 46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  /* LA TETE DE LECTURE : un rayon, et un point lumineux sur le bord. */
  const aTete = rad(instant.position % n, n);
  const tx = cx + Math.cos(aTete) * R * 1.12;
  const ty = cy + Math.sin(aTete) * R * 1.12;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  const halo = ctx.createRadialGradient(tx, ty, 0, tx, ty, 54);
  halo.addColorStop(0, 'rgba(125, 195, 131, 0.55)');
  halo.addColorStop(1, 'rgba(125, 195, 131, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(tx, ty, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbf6ea';
  ctx.beginPath();
  ctx.arc(tx, ty, 8, 0, Math.PI * 2);
  ctx.fill();

  /* LE CENTRE : le tempo, et la mesure dessous. */
  ctx.fillStyle = 'rgba(11, 8, 5, 0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CREME;
  ctx.font = `600 96px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(motif.bpm), cx, cy + 22);
  ctx.fillStyle = VERT;
  ctx.font = `700 20px ${SANS}`;
  espace(ctx, textes.mesure, cx, cy + 58, 3);

  /* LA GRILLE. */
  const hautGrille = 906;
  const ligne = pistes.length > 4 ? 36 : 40;
  const gauche = 300;
  const droite = W - 120;
  const largeurPas = (droite - gauche) / n;
  ctx.textBaseline = 'middle';
  pistes.forEach((piste, p) => {
    const y = hautGrille + p * ligne;
    const teinte = TEINTES[p] ?? CREME;
    ctx.globalAlpha = Math.max(0.35, presence[p] ?? 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = teinte;
    ctx.font = `700 22px ${SANS}`;
    ctx.fillText(textes.langue === 'fr' ? piste.fr : piste.en, 120, y);
    piste.pas.forEach((v, i) => {
      const x = gauche + i * largeurPas + largeurPas / 2;
      if (v === 0) {
        ctx.fillStyle = CREME_PALE;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const l = Math.min(largeurPas - (n === 32 ? 3 : 8), 34);
      ctx.fillStyle = teinte;
      ctx.globalAlpha = (v === 2 ? 0.95 : 0.5) * (presence[p] ?? 1);
      pave(ctx, x - l / 2, y - 11, l, 22, 5);
      ctx.fill();
      ctx.globalAlpha = Math.max(0.35, presence[p] ?? 1);
      if (i === pasCourant && joue(p)) {
        ctx.strokeStyle = '#fbf6ea';
        ctx.globalAlpha = 0.7 * (1 - dansLePas);
        ctx.lineWidth = 2;
        pave(ctx, x - l / 2 - 3, y - 14, l + 6, 28, 7);
        ctx.stroke();
        ctx.globalAlpha = Math.max(0.35, presence[p] ?? 1);
      }
    });
    ctx.globalAlpha = 1;
  });
  /* Le curseur de la grille. */
  const xc = gauche + (instant.position % n) * largeurPas;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xc, hautGrille - 24);
  ctx.lineTo(xc, hautGrille + (pistes.length - 1) * ligne + 24);
  ctx.stroke();

  /* LES ETAPES du morceau, la courante allumee ; au repos, le premier drop. */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const courante = etat?.etape ?? 0;
  ctx.font = `700 18px ${SANS}`;
  const morceaux = textes.sections.flatMap((x, i) => (i === 0 ? [x] : ['·', x]));
  const ecart = 3;
  const largeurDe = (x: string): number => [...x].reduce((t, c) => t + ctx.measureText(c).width + ecart, -ecart);
  const blanc = 18;
  const total = morceaux.reduce((t, x) => t + largeurDe(x), 0) + blanc * (morceaux.length - 1);
  let x0 = cx - total / 2;
  morceaux.forEach((x, k) => {
    const l = largeurDe(x);
    ctx.fillStyle = k % 2 === 1 ? CREME_PALE : k / 2 === courante ? AMBRE : 'rgba(239, 231, 216, 0.38)';
    espace(ctx, x, x0 + l / 2, 1112, ecart);
    x0 += l + blanc;
  });

  /* LE BAS : le resume en vert, l'origine en italique, la signature. */
  ctx.fillStyle = VERT;
  ajuster(ctx, textes.resume, (t) => `700 ${t}px ${SANS}`, 24, W - 200);
  espace(ctx, textes.resume, cx, 1170, 4);
  ctx.fillStyle = 'rgba(239, 231, 216, 0.78)';
  ajuster(ctx, textes.racine, (t) => `400 ${t}px ${SANS}`, 28, W - 140);
  ctx.fillText(textes.racine, cx, 1232);
  if (textes.signature) {
    ctx.fillStyle = 'rgba(239, 231, 216, 0.45)';
    ctx.font = `600 20px ${SANS}`;
    espace(ctx, textes.signature, cx, 1304, 5);
  }
}
