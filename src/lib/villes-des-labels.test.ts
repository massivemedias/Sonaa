/* LES VILLES DE LA CARTE DES LABELS : un point par ville, jamais par rue.
   Voir villes-des-labels.ts. */

import { describe, expect, it } from 'vitest';
import { lieuxDesLabels } from './villes-des-labels.ts';
import type { EntreeLabel } from './labels.ts';
import INDEX_REEL from '../data/labels-index.json';

const label = (s: string, v: { fr: string; en: string } | null, p: string, g: [number, number] | null, extra: Partial<EntreeLabel> = {}): EntreeLabel => ({
  s,
  n: s,
  k: [s],
  c: 0,
  p,
  a: null,
  ...(v ? { v } : {}),
  ...(g ? { g } : {}),
  ...extra,
});

describe('les villes de la carte des labels', () => {
  it('reunit les labels d une meme ville en un seul lieu, au point median', () => {
    const { villes } = lieuxDesLabels([
      label('a', { fr: 'Montréal', en: 'Montreal' }, 'Canada', [45.5047, -73.5719], { q: 1 }),
      label('b', { fr: 'Montréal, Québec', en: 'Montreal, Quebec' }, 'Canada', [45.4955, -73.5665], { q: 1 }),
      label('c', { fr: 'Montréal', en: 'Montreal' }, 'Canada', [45.5099, -73.5764], { q: 1 }),
    ]);
    expect(villes).toHaveLength(1);
    expect(villes[0]?.ville).toEqual({ fr: 'Montréal', en: 'Montreal' });
    expect(villes[0]?.quebec).toBe(true);
    expect(villes[0]?.centre).toEqual([45.5047, -73.5719]);
    expect(villes[0]?.labels.map((e) => e.s)).toEqual(['a', 'b', 'c']);
  });

  it('ramene un quartier a sa ville et ignore la graphie et la province', () => {
    const { villes } = lieuxDesLabels([
      label('a', { fr: 'New York', en: 'New York' }, 'États-Unis', [40.71, -74.0]),
      label('b', { fr: 'Brooklyn', en: 'Brooklyn' }, 'États-Unis', [40.65, -73.95]),
      label('c', { fr: 'New York, État de New York', en: 'New York City, New York' }, 'États-Unis', [40.72, -74.01]),
      label('d', { fr: 'Détroit', en: 'Detroit' }, 'États-Unis', [42.33, -83.05]),
      label('e', { fr: 'Detroit, Michigan', en: 'Detroit, Michigan' }, 'États-Unis', [42.34, -83.04]),
    ]);
    expect(villes.map((v) => [v.id, v.labels.length])).toEqual([
      ['new-york', 3],
      ['detroit', 2],
    ]);
  });

  it('garde deux villes homonymes eloignees separees', () => {
    const { villes } = lieuxDesLabels([
      label('a', { fr: 'Portland', en: 'Portland' }, 'États-Unis', [45.515, -122.679]),
      label('b', { fr: 'Portland', en: 'Portland' }, 'États-Unis', [43.66, -70.26]),
    ]);
    expect(villes.map((v) => v.id).sort()).toEqual(['portland', 'portland-2']);
  });

  it('range sous son pays, sans point sur la carte, un label sans ville connue', () => {
    const { villes, sansVille } = lieuxDesLabels([
      label('a', null, 'Royaume-Uni', [51.5, -0.12]),
      label('b', { fr: 'Ohio', en: 'Ohio' }, 'États-Unis', [40.5, -82.5]),
      label('f', { fr: 'Belgique', en: 'Belgium' }, 'Belgique', [50.6411, 4.6681]),
      label('c', { fr: 'Québec', en: 'Quebec' }, 'Canada', [52, -72], { q: 1 }),
      label('d', { fr: 'Québec', en: 'Quebec City' }, 'Canada', [46.81, -71.21], { q: 1 }),
      label('e', null, 'France', null),
    ]);
    expect(villes.map((v) => v.ville?.en)).toEqual(['Quebec City']);
    expect(sansVille.map((l) => [l.pays, l.ville, l.labels.length])).toEqual([
      ['Belgique', null, 1],
      ['Canada', null, 1],
      ['États-Unis', null, 1],
      ['Royaume-Uni', null, 1],
    ]);
  });

  it('dessine Montreal en un seul point et un pays par ville sur l index reel', () => {
    const { villes } = lieuxDesLabels(INDEX_REEL as unknown as readonly EntreeLabel[]);
    const montreal = villes.filter((v) => v.ville?.fr === 'Montréal');
    expect(montreal).toHaveLength(1);
    expect(montreal[0]?.labels.length).toBeGreaterThanOrEqual(60);
    expect(montreal[0]?.labels.some((e) => e.s === 'vrstl-records')).toBe(true);
    /* M_nus et Total Black sont a Berlin meme si leur pays moissonne est le Canada. */
    const berlin = villes.find((v) => v.ville?.fr === 'Berlin');
    expect(berlin?.pays).toBe('Allemagne');
    expect(berlin?.labels.some((e) => e.s === 'm-nus')).toBe(true);
    /* Mom + Pop, pose au centre de l'Etat de New York, n'est pas a New York. */
    expect(villes.filter((v) => v.ville?.fr === 'New York')).toHaveLength(1);
    /* Aucune ville en double. */
    const ids = villes.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
