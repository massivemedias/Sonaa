/* LA CONSTRUCTION D'UNE ECOUTE : LES INSTRUMENTS ENTRENT UN PAR UN, ON MONTE,
   UN TEMPS DE SILENCE, PUIS LE DROP.

   Un motif joue en boucle des la premiere seconde ne raconte rien : on a tout
   entendu au bout d'une mesure. Les affiches de rythme qui marchent sur
   Instagram suivent la forme d'un morceau de club, en quinze secondes :
   chaque piste arrive a son tour (on voit son anneau se dessiner), la
   batterie se tait pendant une montee de caisse et de bruit blanc, un temps
   de silence, et tout revient d'un coup.

   UN CYCLE est la longueur du motif : une mesure en 16 ou 12 pas, deux en 32.
   Le plan est une suite de cycles ; chacun dit quelles pistes jouent et dans
   quelle section on est. La page et la video lisent le meme plan. */

import type { Motif } from '../../lib/rythmes.ts';

export type Section = 'intro' | 'montee' | 'drop';

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

/* Au-dela de 3,5 s par cycle (tempo lent, ou motif de deux mesures), les
   pistes entrent deux par deux : sinon l'intro seule durerait vingt
   secondes, et une story n'en a pas tant. */
const CYCLE_LONG = 3.5;

export function plan(motif: Motif): Cycle[] {
  const n = motif.pistes.length;
  const cycle = motif.pas * dureeDuPas(motif);
  const parEntree = cycle > CYCLE_LONG ? 2 : 1;
  const cycles: Cycle[] = [];
  for (let k = parEntree; k < n; k += parEntree) {
    cycles.push({ section: 'intro', actives: motif.pistes.map((_, i) => i < k) });
  }
  /* La montee garde tout sauf le kick : c'est son absence qui fait attendre
     le drop. */
  cycles.push({ section: 'montee', actives: motif.pistes.map((p, i) => i > 0 || p.voix !== 'kick') });
  const tout = motif.pistes.map(() => true);
  cycles.push({ section: 'drop', actives: tout }, { section: 'drop', actives: tout });
  return cycles;
}

export interface Etat {
  readonly cycle: number;
  readonly section: Section;
  readonly actives: readonly boolean[];
  /** Celles qui entrent a ce cycle : le dessin les fait apparaitre. */
  readonly nouvelles: readonly boolean[];
  /** Le pas dans le cycle, 0 a pas - 1. */
  readonly pas: number;
  /** Le dernier temps de la montee : rien ne joue. */
  readonly silence: boolean;
  /** De 0 a 1 sur la montee, pour le bruit blanc et la lumiere. */
  readonly tension: number;
  /** Le premier temps du drop, pour l'impact. */
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
  const montee = cycle.section === 'montee';
  const silence = montee && pas >= n - pasParTemps(motif);
  const premierDrop = cycles.findIndex((x) => x.section === 'drop');
  const avant = c > 0 ? cycles[Math.min(c - 1, cycles.length - 1)]?.actives : undefined;
  return {
    cycle: indice,
    section: cycle.section,
    actives: cycle.actives,
    nouvelles: cycle.actives.map((a, i) => a && cycle.section !== 'drop' && c < cycles.length && !(avant?.[i] ?? false)),
    pas,
    silence,
    tension: montee ? Math.min(1, (p - c * n) / (n - pasParTemps(motif))) : 0,
    impact: c === premierDrop && pas === 0,
  };
}

/** La duree de l'ecoute complete, en secondes, sans la boucle finale. */
export function dureeDuPlan(motif: Motif, cycles: readonly Cycle[]): number {
  return cycles.length * motif.pas * dureeDuPas(motif);
}
