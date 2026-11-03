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

/* DEUX FORMATS. Le fil d'Instagram prend le portrait 4:5, 1080 x 1350 ; les
   Reels et les Stories prennent l'ecran entier, 9:16, 1080 x 1920. En 9:16,
   l'interface d'Instagram couvre le haut (environ 220 px) et surtout le bas
   (la legende et les boutons, environ 420 px) : l'affiche y est reduite a
   94 % et posee dans la bande qui reste visible, sur un fond qui, lui, couvre
   tout l'ecran. Mika, le 30 octobre 2026 : « ajoute aussi la version 9:16
   pour les reels ». */
export type FormatAffiche = 'fil' | 'reel';
export const HAUTEUR_REEL = 1920;
const CADRAGE: Record<FormatAffiche, { hauteur: number; echelle: number; haut: number }> = {
  fil: { hauteur: HAUTEUR_RYTHME, echelle: 1, haut: 0 },
  reel: { hauteur: HAUTEUR_REEL, echelle: 0.94, haut: 230 },
};

/* Les cinq teintes de piste, dans l'ordre fixe des jetons --piste-1 a
   --piste-5 (tokens.css). La toile ne lit pas les variables CSS : elles sont
   recopiees ici, et le test du fichier verifie qu'elles n'ont pas diverge. */
export const TEINTES = ['#e9a23b', '#7dc383', '#e2683c', '#e8cf8a', '#a37b55'] as const;
const CREME = '#efe7d8';
const CREME_DOUCE = 'rgba(239, 231, 216, 0.62)';
const CREME_PALE = 'rgba(239, 231, 216, 0.22)';
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

export function dessinerAffiche(ctx: CanvasRenderingContext2D, motif: Motif, textes: TextesAffiche, instant: Instant, format: FormatAffiche = 'fil'): void {
  const W = LARGEUR_RYTHME;
  const n = motif.pas;
  const pasCourant = Math.floor(instant.position) % n;
  const dansLePas = instant.position - Math.floor(instant.position);

  const etat = instant.etat ?? null;
  const eclat = etat?.impact ? 1 - dansLePas : 0;

  /* LE FOND : mat et sobre, le brun presque noir de SONAA, sans halo ni lueur
     radiale. Une planche de releve ou chaque trait porte une donnee. */
  const cadre = CADRAGE[format];
  const H = cadre.hauteur;
  const cx = W / 2;
  const cy = 548;
  const M = 84;
  ctx.fillStyle = '#0a0704';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate((W * (1 - cadre.echelle)) / 2, cadre.haut);
  ctx.scale(cadre.echelle, cadre.echelle);

  const filet = (y: number, alpha = 0.14): void => {
    ctx.fillStyle = `rgba(239, 231, 216, ${alpha})`;
    ctx.fillRect(M, y, W - 2 * M, 1);
  };

  /* L'EN-TETE DE PLANCHE : la famille et les machines en haut, le titre du
     style et sa devise poses au-dessus d'un filet fin. */
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = CREME_DOUCE;
  ajuster(ctx, textes.entete, (t) => `500 ${t}px ${SANS}`, 20, W - 2 * M - 180);
  ctx.fillText(textes.entete, M, 84);
  if (textes.signature) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(239, 231, 216, 0.42)';
    ctx.font = `600 19px ${SANS}`;
    ctx.fillText(textes.signature.toLowerCase(), W - M, 84);
  }
  filet(104, 0.16);

  ctx.textAlign = 'left';
  ctx.fillStyle = CREME;
  ajuster(ctx, textes.titre, (t) => `700 ${t}px ${SANS}`, 74, W - 2 * M);
  ctx.fillText(textes.titre, M, 184);
  ctx.fillStyle = AMBRE;
  ajuster(ctx, textes.devise, (t) => `500 ${t}px ${SANS}`, 30, W - 2 * M);
  ctx.fillText(textes.devise, M, 226);
  filet(252, 0.12);

  /* LE CADRAN : un anneau par piste active, graduations fines des pas sur la
     couronne exterieure, chiffres des quatre temps. */
  const pistes = motif.pistes.slice(0, 5);
  const R = 216;
  const rayons = [1, 0.81, 0.63, 0.46, 0.31];

  /* Couronne exterieure et graduations des pas. */
  const rCouronne = R * 1.1;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.12)';
  ctx.beginPath();
  ctx.arc(cx, cy, rCouronne, 0, Math.PI * 2);
  ctx.stroke();

  const parTemps = n === 12 ? 3 : 4;
  for (let i = 0; i < n; i += 1) {
    const a = rad(i, n);
    const temps = i % parTemps === 0;
    const rInterne = rCouronne - (temps ? 10 : 5);
    const rExterne = rCouronne + (temps ? 4 : 1);
    ctx.strokeStyle = temps ? 'rgba(239, 231, 216, 0.48)' : 'rgba(239, 231, 216, 0.18)';
    ctx.lineWidth = temps ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rInterne, cy + Math.sin(a) * rInterne);
    ctx.lineTo(cx + Math.cos(a) * rExterne, cy + Math.sin(a) * rExterne);
    ctx.stroke();
  }

  /* Les chiffres des temps, discrets et nets. */
  ctx.font = `500 21px ${SANS}`;
  ctx.fillStyle = 'rgba(239, 231, 216, 0.45)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nTemps = n / parTemps;
  for (let b = 0; b < nTemps; b += 1) {
    const a = rad(b * parTemps, n);
    ctx.fillText(String((b % 4) + 1), cx + Math.cos(a) * R * 1.21, cy + Math.sin(a) * R * 1.21);
  }

  /* Un anneau capillaire pour chaque piste du motif. */
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.07)';
  for (let p = 0; p < pistes.length; p += 1) {
    const r = R * (rayons[p] ?? 0.31);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* LA PRESENCE DE CHAQUE PISTE. */
  const presence = pistes.map((_, p) => {
    if (!etat) return 1;
    if (etat.silence) return 0.25;
    if (!etat.actives[p]) return 0.12;
    return 1;
  });
  const joue = (p: number): boolean => !etat || (!etat.silence && (etat.actives[p] ?? false));

  /* LES FIGURES GEOMETRIQUES, de la piste la plus interieure a la plus
     exterieure, tracees au trait fin sans halo flou. */
  for (let p = pistes.length - 1; p >= 0; p -= 1) {
    const piste = pistes[p];
    if (!piste) continue;
    const r = R * (rayons[p] ?? 0.31);
    const teinte = TEINTES[p] ?? CREME;
    const a = presence[p] ?? 1;
    const sommets = piste.pas.flatMap((v, i) => (v > 0 ? [{ i, v, x: cx + Math.cos(rad(i, n)) * r, y: cy + Math.sin(rad(i, n)) * r }] : []));
    if (sommets.length >= 2) {
      ctx.beginPath();
      sommets.forEach((s, k) => (k === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y)));
      ctx.closePath();
      ctx.globalAlpha = 0.045 * a;
      ctx.fillStyle = teinte;
      ctx.fill();
      ctx.globalAlpha = 0.72 * a;
      ctx.strokeStyle = teinte;
      ctx.lineWidth = 1.75;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const s of sommets) {
      const frappe = s.i === pasCourant && joue(p);
      const taille = (s.v === 2 ? 6.5 : 4.5) * (frappe ? 1.35 : 1);
      ctx.fillStyle = teinte;
      ctx.globalAlpha = (s.v === 2 ? 1 : 0.72) * a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, taille, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (frappe) {
        ctx.strokeStyle = teinte;
        ctx.globalAlpha = 0.75 * (1 - dansLePas);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, taille + 4 + dansLePas * 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  /* L'AIGUILLE DE LECTURE : un rayon fin et un repere net sur la couronne,
     sans boule lumineuse verte. */
  const aTete = rad(instant.position % n, n);
  const tx = cx + Math.cos(aTete) * rCouronne;
  const ty = cy + Math.sin(aTete) * rCouronne;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.32)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(aTete) * 80, cy + Math.sin(aTete) * 80);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = CREME;
  ctx.beginPath();
  ctx.arc(tx, ty, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = AMBRE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(tx, ty, 9 + eclat * 6, 0, Math.PI * 2);
  ctx.stroke();

  /* LE CENTRE : disque mat encadre d'un filet fin, tempo et tonalite. */
  ctx.fillStyle = '#0a0704';
  ctx.beginPath();
  ctx.arc(cx, cy, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = CREME;
  ctx.font = `600 72px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(motif.bpm), cx, cy + 12);
  ctx.fillStyle = CREME_DOUCE;
  const sousCentre = `${motif.mesure}${motif.tonalite ? ` · ${motif.tonalite}` : ''}`;
  ctx.font = `600 15px ${SANS}`;
  espace(ctx, sousCentre, cx, cy + 40, 2);

  /* LA GRILLE DE SEQUENCAGE : barres franches a coins nets (2 px), repere de
     temps tous les 4 pas, curseur capillaire. */
  filet(836, 0.12);
  const hautGrille = 874;
  const ligne = pistes.length > 4 ? 38 : 42;
  const gauche = 292;
  const droite = W - M;
  const largeurPas = (droite - gauche) / n;

  /* Reperes verticaux des temps dans la grille. */
  for (let b = 0; b < n; b += parTemps) {
    const xb = gauche + b * largeurPas;
    ctx.fillStyle = 'rgba(239, 231, 216, 0.06)';
    ctx.fillRect(xb, hautGrille - 16, 1, (pistes.length - 1) * ligne + 32);
  }

  ctx.textBaseline = 'middle';
  pistes.forEach((piste, p) => {
    const y = hautGrille + p * ligne;
    const teinte = TEINTES[p] ?? CREME;
    ctx.globalAlpha = Math.max(0.35, presence[p] ?? 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = teinte;
    ctx.font = `600 19px ${SANS}`;
    ctx.fillText(textes.langue === 'fr' ? piste.fr : piste.en, M, y);
    piste.pas.forEach((v, i) => {
      const x = gauche + i * largeurPas + largeurPas / 2;
      if (v === 0) {
        ctx.fillStyle = 'rgba(239, 231, 216, 0.16)';
        ctx.fillRect(x - 1, y - 1, 2, 2);
        return;
      }
      const l = Math.min(largeurPas - (n === 32 ? 3 : 7), 32);
      const hBarre = v === 2 ? 18 : 12;
      ctx.fillStyle = teinte;
      ctx.globalAlpha = (v === 2 ? 0.95 : 0.48) * (presence[p] ?? 1);
      pave(ctx, x - l / 2, y - hBarre / 2, l, hBarre, 2);
      ctx.fill();
      ctx.globalAlpha = Math.max(0.35, presence[p] ?? 1);
      if (i === pasCourant && joue(p)) {
        ctx.strokeStyle = CREME;
        ctx.globalAlpha = 0.85 * (1 - dansLePas);
        ctx.lineWidth = 1.5;
        pave(ctx, x - l / 2 - 2, y - hBarre / 2 - 2, l + 4, hBarre + 4, 3);
        ctx.stroke();
        ctx.globalAlpha = Math.max(0.35, presence[p] ?? 1);
      }
    });
    ctx.globalAlpha = 1;
  });

  /* Le curseur de la grille. */
  const xc = gauche + (instant.position % n) * largeurPas;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xc, hautGrille - 18);
  ctx.lineTo(xc, hautGrille + (pistes.length - 1) * ligne + 18);
  ctx.stroke();

  /* LES ETAPES DU MORCEAU ET LE PIED EDITORIAL. */
  filet(1068, 0.12);
  ctx.textBaseline = 'alphabetic';
  const courante = etat?.etape ?? 0;
  ctx.font = `600 16px ${SANS}`;
  ctx.textAlign = 'left';
  let xEtape = M;
  textes.sections.forEach((sec, idx) => {
    if (idx > 0) {
      ctx.fillStyle = CREME_PALE;
      ctx.fillText('·', xEtape, 1104);
      xEtape += ctx.measureText('·').width + 14;
    }
    ctx.fillStyle = idx === courante ? AMBRE : 'rgba(239, 231, 216, 0.38)';
    ctx.fillText(sec, xEtape, 1104);
    xEtape += ctx.measureText(sec).width + 14;
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = CREME;
  ajuster(ctx, textes.resume, (t) => `600 ${t}px ${SANS}`, 23, W - 2 * M);
  ctx.fillText(textes.resume, M, 1164);

  ctx.fillStyle = CREME_DOUCE;
  ajuster(ctx, textes.racine, (t) => `400 ${t}px ${SANS}`, 25, W - 2 * M);
  ctx.fillText(textes.racine, M, 1212);

  filet(1254, 0.14);
  if (textes.signature) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(239, 231, 216, 0.55)';
    ctx.font = `600 18px ${SANS}`;
    ctx.fillText(textes.signature.toLowerCase(), M, 1292);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(239, 231, 216, 0.42)';
  ctx.font = `500 18px ${SANS}`;
  ctx.fillText(`${motif.bpm} BPM · ${motif.mesure}${motif.tonalite ? ` · ${motif.tonalite}` : ''}`, W - M, 1292);

  ctx.restore();
}
