/* LA CARTE DE RYTHME, DESSINEE SUR UNE TOILE.

   Deux usages, deux densites :
   - Sur la page d'un style (`FormatAffiche = 'page'`, 1080 x 580) : un
     sequenceur minimaliste qui ne repete ni le titre du style, ni la famille,
     ni les machines, ni l'historique (deja dans la fiche a gauche), ni le
     radar circulaire. Il montre uniquement le tempo et la mesure, la grille
     de pas et la progression du morceau.
   - A l'export image/video (`'fil'` 1080 x 1350 ou `'reel'` 1080 x 1920) :
     l'affiche editoriale epuree de SONAA, sans radar circulaire, centree sur
     la typographie, la grille de pas et la signature sonaa.ca. */

import type { Motif } from '../../lib/rythmes.ts';
import type { Etat } from './arrangement.ts';

export const LARGEUR_RYTHME = 1080;
export const HAUTEUR_PAGE = 580;
export const HAUTEUR_RYTHME = 1350;

export type FormatAffiche = 'page' | 'fil' | 'reel';
export const HAUTEUR_REEL = 1920;

/* Les cinq teintes de piste, dans l'ordre fixe des jetons --piste-1 a
   --piste-5 (tokens.css). La toile ne lit pas les variables CSS : elles sont
   recopiees ici, et le test du fichier verifie qu'elles n'ont pas diverge. */
export const TEINTES = ['#e9a23b', '#7dc383', '#e2683c', '#e8cf8a', '#a37b55'] as const;
const CREME = '#efe7d8';
const CREME_DOUCE = 'rgba(239, 231, 216, 0.62)';
const CREME_PALE = 'rgba(239, 231, 216, 0.28)';
const AMBRE = TEINTES[0];
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

function dessinerGrille(
  ctx: CanvasRenderingContext2D,
  motif: Motif,
  textes: TextesAffiche,
  instant: Instant,
  gaucheTexte: number,
  gauchePas: number,
  droitePas: number,
  haut: number,
  ecartLigne: number
): void {
  const n = motif.pas;
  const pasCourant = Math.floor(instant.position) % n;
  const dansLePas = instant.position - Math.floor(instant.position);
  const etat = instant.etat ?? null;
  const pistes = motif.pistes.slice(0, 5);
  const parTemps = n === 12 ? 3 : 4;
  const largeurPas = (droitePas - gauchePas) / n;

  const presence = pistes.map((_, p) => {
    if (!etat) return 1;
    if (etat.silence) return 0.25;
    if (!etat.actives[p]) return 0.14;
    return 1;
  });
  const joue = (p: number): boolean => !etat || (!etat.silence && (etat.actives[p] ?? false));

  /* Numeros des temps au-dessus de la grille, et filets verticaux discrets. */
  ctx.font = `600 15px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  const hGrille = (pistes.length - 1) * ecartLigne;
  for (let b = 0; b < n; b += parTemps) {
    const xb = gauchePas + b * largeurPas;
    const numTemps = Math.floor(b / parTemps) + 1;
    ctx.fillStyle = 'rgba(239, 231, 216, 0.34)';
    ctx.fillText(String(numTemps), xb + largeurPas / 2, haut - 26);
    if (b > 0) {
      ctx.fillStyle = 'rgba(239, 231, 216, 0.06)';
      ctx.fillRect(xb, haut - 16, 1, hGrille + 32);
    }
  }

  /* Lignes de pistes et pas. */
  ctx.textBaseline = 'middle';
  pistes.forEach((piste, p) => {
    const y = haut + p * ecartLigne;
    const teinte = TEINTES[p] ?? CREME;
    const alphaPiste = presence[p] ?? 1;
    const enFrappe = (piste.pas[pasCourant] ?? 0) > 0 && joue(p);

    /* Petit temoin d'activite a gauche du nom de la piste. */
    ctx.fillStyle = teinte;
    ctx.globalAlpha = enFrappe ? Math.max(0.4, 1 - dansLePas * 0.65) : 0.22 * alphaPiste;
    ctx.beginPath();
    ctx.arc(gaucheTexte + 5, y, enFrappe ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fill();

    /* Nom de la piste. */
    ctx.globalAlpha = Math.max(0.36, alphaPiste);
    ctx.textAlign = 'left';
    ctx.fillStyle = enFrappe ? CREME : teinte;
    ctx.font = `600 18px ${SANS}`;
    ctx.fillText(textes.langue === 'fr' ? piste.fr : piste.en, gaucheTexte + 20, y);

    /* Pas de la piste. */
    piste.pas.forEach((v, i) => {
      const x = gauchePas + i * largeurPas + largeurPas / 2;
      if (v === 0) {
        ctx.fillStyle = i % parTemps === 0 ? 'rgba(239, 231, 216, 0.16)' : 'rgba(239, 231, 216, 0.08)';
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        return;
      }
      const l = Math.min(largeurPas - (n === 32 ? 4 : 8), 34);
      const hBarre = v === 2 ? 22 : 12;
      const actif = i === pasCourant && joue(p);
      ctx.fillStyle = teinte;
      ctx.globalAlpha = (v === 2 ? 0.96 : 0.46) * alphaPiste;
      pave(ctx, x - l / 2, y - hBarre / 2, l, hBarre, 3);
      ctx.fill();

      if (actif) {
        ctx.strokeStyle = CREME;
        ctx.globalAlpha = 0.9 * (1 - dansLePas * 0.7);
        ctx.lineWidth = 2;
        pave(ctx, x - l / 2 - 2, y - hBarre / 2 - 2, l + 4, hBarre + 4, 4);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  });

  /* Tete de lecture verticale fine. */
  const xc = gauchePas + ((instant.position % n) + 0.5) * largeurPas;
  ctx.strokeStyle = 'rgba(239, 231, 216, 0.38)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xc, haut - 18);
  ctx.lineTo(xc, haut + hGrille + 18);
  ctx.stroke();
}

function dessinerEtapes(ctx: CanvasRenderingContext2D, textes: TextesAffiche, etat: Etat | null, x: number, y: number): void {
  const courante = etat?.etape ?? 0;
  ctx.font = `600 15px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let cx = x;
  textes.sections.forEach((sec, idx) => {
    if (idx > 0) {
      ctx.fillStyle = CREME_PALE;
      ctx.fillText('·', cx, y);
      cx += ctx.measureText('·').width + 12;
    }
    ctx.fillStyle = idx === courante ? AMBRE : 'rgba(239, 231, 216, 0.34)';
    ctx.fillText(sec, cx, y);
    cx += ctx.measureText(sec).width + 12;
  });
}

export function dessinerAffiche(ctx: CanvasRenderingContext2D, motif: Motif, textes: TextesAffiche, instant: Instant, format: FormatAffiche = 'fil'): void {
  const W = LARGEUR_RYTHME;
  const etat = instant.etat ?? null;
  const pistes = motif.pistes.slice(0, 5);

  if (format === 'page') {
    const H = HAUTEUR_PAGE;
    const M = 52;
    ctx.fillStyle = '#0a0704';
    ctx.fillRect(0, 0, W, H);

    const filet = (y: number, alpha = 0.1): void => {
      ctx.fillStyle = `rgba(239, 231, 216, ${alpha})`;
      ctx.fillRect(M, y, W - 2 * M, 1);
    };

    /* En-tete minimaliste : tempo et tonalite a gauche, devise a droite. */
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = CREME;
    ctx.font = `700 44px ${SANS}`;
    const tempoTxt = `${motif.bpm}`;
    ctx.fillText(tempoTxt, M, 76);
    const lTempo = ctx.measureText(tempoTxt).width;

    ctx.fillStyle = CREME_DOUCE;
    ctx.font = `600 17px ${SANS}`;
    const metaTxt = `BPM · ${motif.mesure}${motif.tonalite ? ` · ${motif.tonalite}` : ''}`;
    ctx.fillText(metaTxt, M + lTempo + 14, 72);

    ctx.textAlign = 'right';
    ctx.fillStyle = AMBRE;
    ajuster(ctx, textes.devise, (t) => `500 ${t}px ${SANS}`, 21, 440);
    ctx.fillText(textes.devise, W - M, 72);

    filet(104, 0.12);

    /* Grille de sequencage epuree au centre. */
    const ecartLigne = pistes.length > 4 ? 64 : 74;
    const hautGrille = pistes.length > 4 ? 174 : 182;
    dessinerGrille(ctx, motif, textes, instant, M, 260, W - M, hautGrille, ecartLigne);

    /* Pied minimal : progression a gauche, signature rythmique a droite. */
    filet(492, 0.12);
    dessinerEtapes(ctx, textes, etat, M, 536);

    ctx.textAlign = 'right';
    ctx.fillStyle = CREME_DOUCE;
    ajuster(ctx, textes.resume, (t) => `500 ${t}px ${SANS}`, 16, 520);
    ctx.fillText(textes.resume, W - M, 536);
    return;
  }

  /* FORMAT EXPORT ('fil' 1080 x 1350 ou 'reel' 1080 x 1920) :
     planche editoriale minimaliste sans radar circulaire. */
  const H = format === 'reel' ? HAUTEUR_REEL : HAUTEUR_RYTHME;
  const M = 84;
  ctx.fillStyle = '#0a0704';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (format === 'reel') {
    ctx.translate(0, 260);
  }

  const filet = (y: number, alpha = 0.14): void => {
    ctx.fillStyle = `rgba(239, 231, 216, ${alpha})`;
    ctx.fillRect(M, y, W - 2 * M, 1);
  };

  /* Surtitre : famille et machines, signature discretes. */
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = CREME_DOUCE;
  ajuster(ctx, textes.entete, (t) => `500 ${t}px ${SANS}`, 20, W - 2 * M - 180);
  ctx.fillText(textes.entete, M, 108);
  if (textes.signature) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(239, 231, 216, 0.42)';
    ctx.font = `600 19px ${SANS}`;
    ctx.fillText(textes.signature.toLowerCase(), W - M, 108);
  }
  filet(134, 0.14);

  /* Titre du style, devise et grand chiffre de tempo aligne a droite. */
  ctx.textAlign = 'left';
  ctx.fillStyle = CREME;
  ajuster(ctx, textes.titre, (t) => `700 ${t}px ${SANS}`, 82, W - 2 * M - 260);
  ctx.fillText(textes.titre, M, 246);

  ctx.fillStyle = AMBRE;
  ajuster(ctx, textes.devise, (t) => `500 ${t}px ${SANS}`, 30, W - 2 * M - 260);
  ctx.fillText(textes.devise, M, 294);

  ctx.textAlign = 'right';
  ctx.fillStyle = CREME;
  ctx.font = `700 76px ${SANS}`;
  ctx.fillText(String(motif.bpm), W - M, 246);
  ctx.fillStyle = CREME_DOUCE;
  ctx.font = `600 18px ${SANS}`;
  ctx.fillText(`BPM · ${motif.mesure}${motif.tonalite ? ` · ${motif.tonalite}` : ''}`, W - M, 292);

  filet(344, 0.12);

  /* Grande grille de sequencage aerienne au coeur de l'affiche. */
  const ecartLigne = pistes.length > 4 ? 102 : 118;
  const hautGrille = 456;
  dessinerGrille(ctx, motif, textes, instant, M, 304, W - M, hautGrille, ecartLigne);

  filet(988, 0.12);

  /* Etapes du morceau et resume. */
  dessinerEtapes(ctx, textes, etat, M, 1044);

  ctx.textAlign = 'left';
  ctx.fillStyle = CREME;
  ajuster(ctx, textes.resume, (t) => `600 ${t}px ${SANS}`, 25, W - 2 * M);
  ctx.fillText(textes.resume, M, 1118);

  ctx.fillStyle = CREME_DOUCE;
  ajuster(ctx, textes.racine, (t) => `400 ${t}px ${SANS}`, 25, W - 2 * M);
  ctx.fillText(textes.racine, M, 1172);

  filet(1224, 0.14);
  if (textes.signature) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(239, 231, 216, 0.55)';
    ctx.font = `600 18px ${SANS}`;
    ctx.fillText(textes.signature.toLowerCase(), M, 1268);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(239, 231, 216, 0.42)';
  ctx.font = `500 18px ${SANS}`;
  ctx.fillText(`${motif.bpm} BPM · ${motif.mesure}${motif.tonalite ? ` · ${motif.tonalite}` : ''}`, W - M, 1268);

  ctx.restore();
}
