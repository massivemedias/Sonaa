import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import RYTHMES from '../../data/rythmes.json';
import CORPUS from '../../data/corpus.json';
import type { Motif } from '../../lib/rythmes.ts';
import { accordeDe, fichiersDuMotif, kitDeFamille, plusProche } from './echantillons.ts';

const motifs = RYTHMES as unknown as Record<string, Motif>;

describe('les sons enregistres', () => {
  it('existent tous dans public/sons pour chacun des 219 styles', () => {
    const manquants = new Set<string>();
    for (const g of CORPUS.genres) {
      const m = motifs[g.id];
      if (!m) continue;
      for (const nom of fichiersDuMotif(m, kitDeFamille(g.family))) if (!existsSync(`public/sons/${nom}.wav`)) manquants.add(nom);
    }
    expect([...manquants]).toEqual([]);
  });

  it('donnent leur provenance et leur licence', () => {
    expect(existsSync('public/sons/SOURCES.txt')).toBe(true);
  });

  it('accordent le piano sur la note enregistree la plus proche', () => {
    const piano = accordeDe({ voix: 'piano', fr: 'PIANO', en: 'PIANO', pas: [2] });
    if (!piano) throw new Error('piano');
    expect(plusProche(piano, 62)).toMatchObject({ nom: 'vcsl-piano-c3' });
    expect(plusProche(piano, 72).vitesse).toBe(1);
    expect(plusProche(piano, 67)).toMatchObject({ nom: 'vcsl-piano-c4' });
    expect(plusProche(piano, 67).vitesse).toBeCloseTo(Math.pow(2, -5 / 12));
  });
});
