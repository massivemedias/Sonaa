/* LES DEUX MEMOIRES LUES ENSEMBLE : celle du compte et celle du navigateur.
   Voir ecoutes-compte.ts. */

import { describe, expect, it } from 'vitest';
import { fusionner } from './ecoutes-compte.ts';
import { MAX_HISTORIQUE, type Reconnaissance } from './historique.ts';

const ecoute = (quand: number, titre?: string): Reconnaissance => ({
  quand,
  styles: [{ discogs: 'Electronic---Techno', score: 0.8 }],
  ...(titre ? { titre, artiste: 'X' } : {}),
});

describe('fusionner', () => {
  it('range la plus recente en tete, quelle que soit la memoire', () => {
    const r = fusionner([ecoute(10), ecoute(30)], [ecoute(20)]);
    expect(r.map((e) => e.quand)).toEqual([30, 20, 10]);
  });

  it('ne montre pas deux fois une ecoute gardee des deux cotes', () => {
    const r = fusionner([ecoute(10, 'compte')], [ecoute(10, 'local')]);
    expect(r).toHaveLength(1);
    expect(r[0]?.titre).toBe('compte');
  });

  it('s arrete a vingt', () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) => ecoute(i));
    expect(fusionner(beaucoup, beaucoup)).toHaveLength(MAX_HISTORIQUE);
  });
});
