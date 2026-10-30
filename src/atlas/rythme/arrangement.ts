/* LA CONSTRUCTION D'UNE ECOUTE : LE DROP D'ABORD, PUIS LA MONTEE, UN TEMPS DE
   SILENCE, ET LE DROP QUI REVIENT.

   Un motif joue en boucle des la premiere seconde ne raconte rien : on a tout
   entendu au bout d'une mesure. La forme d'un morceau de club tient en
   quinze secondes : la batterie se tait pendant une montee de caisse et de
   bruit blanc, un temps de silence, et tout revient d'un coup.

   LE DROP D'ABORD. La premiere version faisait entrer les pistes une a une ;
   Mika, le 30 octobre 2026 : « des que je clique sur play j'entends juste le
   kick, je veux quelque chose de complet ». On ouvre donc sur le motif
   entier, et la tension vient apres.

   UN CYCLE est la longueur du motif : une mesure en 16 ou 12 pas, deux en 32.
   Le plan est une suite de cycles ; chacun dit quelles pistes jouent et dans
   quelle section on est. La page et la video lisent le meme plan. */

import type { Motif } from '../../lib/rythmes.ts';

export type Section = 'montee' | 'drop';

export interface Cycle {
  readonly section: Section;
  /** Les pistes qui jouent pendant ce cycle, dans l'ordre du motif. */
  readonly actives: readonly boolean[];
}

/** La duree d'un pas, en secondes : un double-croche en 16 et 32 pas, un
    croche de mesure ternaire en 12. */
export function dureeDuPas(motif: Motif): number {
  const noire = 60 / motif.bpm;
  return motif.pas === 12 ? noire / 3 : noire / 4;
}

/** Le nombre de pas d'un temps : quatre doubles croches, ou trois croches. */
export const pasParTemps = (motif: Motif): number => (motif.pas === 12 ? 3 : 4);

/* Au-dela de 3,5 s par cycle (tempo lent, ou motif de deux mesures), chaque
   drop ne dure qu'un cycle : sinon l'ecoute passerait vingt secondes, et
   une story n'en a pas tant. */
const CYCLE_LONG = 3.5;

export function plan(motif: Motif): Cycle[] {
  const tout = motif.pistes.map(() => true);
  /* La montee garde tout sauf le kick : c'est son absence qui fait attendre
     le drop. */
  const montee: Cycle = { section: 'montee', actives: motif.pistes.map((p, i) => i > 0 || p.voix !== 'kick') };
  const drop: Cycle = { section: 'drop', actives: tout };
  const long = motif.pas * dureeDuPas(motif) > CYCLE_LONG;
  return long ? [drop, montee, drop] : [drop, drop, montee, drop, drop];
}

export interface Etat {
  readonly cycle: number;
  readonly section: Section;
  /** L'etape affichee sous la grille : 0 le premier drop, 1 la montee, 2 le
      silence, 3 le drop qui revient (et tourne ensuite). */
  readonly etape: 0 | 1 | 2 | 3;
  readonly actives: readonly boolean[];
  /** Le pas dans le cycle, 0 a pas - 1. */
  readonly pas: number;
  /** Le dernier temps de la montee : rien ne joue. */
  readonly silence: boolean;
  /** De 0 a 1 sur la montee, pour le bruit blanc et la lumiere. */
  readonly tension: number;
  /** Le premier temps du drop qui suit la montee, pour l'impact. */
  readonly impact: boolean;
}

/** Ou en est l'ecoute au pas global `p`. Apres le dernier cycle, le drop
    tourne en boucle. */
export function etatAu(motif: Motif, cycles: readonly Cycle[], p: number): Etat {
  const n = motif.pas;
  const c = Math.floor(p / n);
  const pas = Math.floor(p) % n;
  const indice = Math.min(c, cycles.length - 1);
  const cycle = cycles[indice] ?? { section: 'drop' as const, actives: motif.pistes.map(() => true) };
  const indiceMontee = cycles.findIndex((x) => x.section === 'montee');
  const montee = cycle.section === 'montee';
  const silence = montee && pas >= n - pasParTemps(motif);
  const etape = montee ? (silence ? 2 : 1) : indice < indiceMontee ? 0 : 3;
  return {
    cycle: indice,
    section: cycle.section,
    etape,
    actives: cycle.actives,
    pas,
    silence,
    tension: montee ? Math.min(1, (p - c * n) / (n - pasParTemps(motif))) : 0,
    impact: c === indiceMontee + 1 && pas === 0,
  };
}

/** La duree de l'ecoute complete, en secondes, sans la boucle finale. */
export function dureeDuPlan(motif: Motif, cycles: readonly Cycle[]): number {
  return cycles.length * motif.pas * dureeDuPas(motif);
}
