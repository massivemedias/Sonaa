import { describe, expect, it } from 'vitest';
import { GAMMES, accord, degre, demiTons, frequence } from './theorie.ts';
import { dureeDuPas, etatAu, plan } from './arrangement.ts';
import RYTHMES from '../../data/rythmes.json';
import type { Motif } from '../../lib/rythmes.ts';

describe('la theorie du synthetiseur', () => {
  it('compte les degres dans la gamme, octave comprise', () => {
    expect(degre(1, 'mineure')).toBe(0);
    expect(degre(3, 'mineure')).toBe(3);
    expect(degre(8, 'mineure')).toBe(12);
    expect(degre(6, 'pentatonique')).toBe(12);
    expect(GAMMES.hirajoshi).toHaveLength(5);
  });

  it('empile les tierces de la gamme', () => {
    expect(accord({ degre: 1, couleur: 'triade' }, 'mineure')).toEqual([0, 3, 7]);
    expect(accord({ degre: 1, couleur: '9' }, 'dorienne')).toEqual([0, 3, 7, 10, 14]);
    expect(accord({ degre: 4, couleur: 'triade' }, 'majeure')).toEqual([5, 9, 12]);
    expect(accord({ degre: 1, couleur: 'quinte' }, 'mineure')).toEqual([0, 7, 12]);
  });

  it('lit la tonique et donne le la 440', () => {
    expect(demiTons('F#')).toBe(6);
    expect(demiTons('Eb')).toBe(3);
    expect(demiTons(undefined)).toBe(9);
    expect(frequence(69)).toBe(440);
  });
});

describe('la construction d une ecoute', () => {
  const motif = (RYTHMES as unknown as Record<string, Motif>)['acidhouse'];

  it('fait entrer les pistes une a une, monte sans kick, puis lache le drop', () => {
    if (!motif) throw new Error('acidhouse manque');
    const cycles = plan(motif);
    expect(cycles.map((c) => c.section)).toEqual([
      ...Array(motif.pistes.length - 1).fill('intro'),
      'montee',
      'drop',
      'drop',
    ]);
    expect(cycles[0]?.actives.filter(Boolean)).toHaveLength(1);
    expect(cycles.find((c) => c.section === 'montee')?.actives[0]).toBe(false);
  });

  it('se tait sur le dernier temps de la montee et frappe au premier du drop', () => {
    if (!motif) throw new Error('acidhouse manque');
    const cycles = plan(motif);
    const montee = cycles.findIndex((c) => c.section === 'montee');
    expect(etatAu(motif, cycles, montee * 16 + 15).silence).toBe(true);
    expect(etatAu(motif, cycles, montee * 16 + 11).silence).toBe(false);
    expect(etatAu(motif, cycles, (montee + 1) * 16).impact).toBe(true);
    expect(dureeDuPas(motif)).toBeCloseTo(60 / motif.bpm / 4);
  });
});
