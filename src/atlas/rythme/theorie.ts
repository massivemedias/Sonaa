/* LA THEORIE DONT LE SYNTHETISEUR A BESOIN, ET RIEN DE PLUS : une gamme, un
   degre dans cette gamme, un accord construit par tierces empilees.

   Les motifs (data/rythmes.json) ecrivent leurs notes en DEGRES et non en
   hauteurs : « 1, 8, 5 » plutot que « fa, fa, do ». C'est la forme qu'un
   producteur lit, et elle survit a un changement de tonique. */

import type { Accord, Gamme } from '../../lib/rythmes.ts';

export const GAMMES: Record<Gamme, readonly number[]> = {
  mineure: [0, 2, 3, 5, 7, 8, 10],
  majeure: [0, 2, 4, 5, 7, 9, 11],
  dorienne: [0, 2, 3, 5, 7, 9, 10],
  phrygienne: [0, 1, 3, 5, 7, 8, 10],
  harmonique: [0, 2, 3, 5, 7, 8, 11],
  pentatonique: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  hirajoshi: [0, 2, 3, 7, 8],
  /* Les styles atonaux gardent une gamme pour leurs accords de quinte : la
     mineure, qui ne s'entend pas sur une quinte a vide. */
  chromatique: [0, 2, 3, 5, 7, 8, 10],
};

const NOTES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

/** La tonique en demi-tons au-dessus de do (0 a 11), la par defaut. */
export function demiTons(tonique: string | undefined): number {
  return tonique && tonique in NOTES ? (NOTES[tonique] ?? 9) : 9;
}

/** Le decalage en demi-tons d'un degre (1 = la tonique, 8 = l'octave pour
    une gamme de sept notes), compte depuis la tonique. */
export function degre(d: number, gamme: Gamme): number {
  const g = GAMMES[gamme];
  const i = Math.max(0, Math.round(d) - 1);
  return (g[i % g.length] ?? 0) + 12 * Math.floor(i / g.length);
}

/** Les decalages d'un accord, depuis la tonique de la gamme. */
export function accord(a: Accord, gamme: Gamme): number[] {
  const base = a.degre;
  switch (a.couleur) {
    case 'quinte':
      return [degre(base, gamme), degre(base + 4, gamme), degre(base, gamme) + 12];
    case 'sus':
      return [degre(base, gamme), degre(base + 3, gamme), degre(base + 4, gamme)];
    case '7':
      return [degre(base, gamme), degre(base + 2, gamme), degre(base + 4, gamme), degre(base + 6, gamme)];
    case '9':
      return [degre(base, gamme), degre(base + 2, gamme), degre(base + 4, gamme), degre(base + 6, gamme), degre(base + 8, gamme)];
    default:
      return [degre(base, gamme), degre(base + 2, gamme), degre(base + 4, gamme)];
  }
}

export const frequence = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
