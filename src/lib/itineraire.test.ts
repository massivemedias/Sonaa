/* L'ITINERAIRE DANS LE SITE : la lecture de la reponse d'OSRM et ce qu'on en
   affiche. Le reseau n'est pas teste ici, la forme de sa reponse l'est. */

import { describe, expect, it } from 'vitest';
import { distanceLisible, dureeLisible, lireReponse, modeParDefaut } from './itineraire.ts';

const REPONSE = {
  code: 'Ok',
  routes: [
    {
      distance: 1432.6,
      duration: 1090.2,
      geometry: { coordinates: [[-73.5673, 45.5017], [-73.57, 45.505], [-73.58, 45.523]] },
      legs: [
        {
          steps: [
            { distance: 300, name: 'Rue Sainte-Catherine', maneuver: { type: 'depart' } },
            { distance: 1100, name: 'Boulevard Saint-Laurent', maneuver: { type: 'turn', modifier: 'left' } },
            { distance: 0, name: '', maneuver: { type: 'arrive' } },
          ],
        },
      ],
    },
  ],
};

describe('lireReponse', () => {
  it('lit la duree, la distance, le trace et les etapes', () => {
    const r = lireReponse(REPONSE);
    expect(r?.duree).toBeCloseTo(1090.2);
    expect(r?.ligne).toHaveLength(3);
    expect(r?.etapes.map((e) => e.type)).toEqual(['depart', 'turn', 'arrive']);
    expect(r?.etapes[1]).toMatchObject({ sens: 'left', rue: 'Boulevard Saint-Laurent' });
    expect(r?.etapes[2]?.rue).toBeNull();
  });

  it('rend null quand il n y a pas de trajet', () => {
    expect(lireReponse({ code: 'NoRoute', routes: [] })).toBeNull();
    expect(lireReponse(null)).toBeNull();
    expect(lireReponse({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: { coordinates: [[0, 0]] } }] })).toBeNull();
  });
});

describe('ce qu on affiche', () => {
  it('ecrit les durees et les distances', () => {
    expect(dureeLisible(20)).toBe('1 min');
    expect(dureeLisible(1090)).toBe('18 min');
    expect(dureeLisible(3900)).toBe('1 h 05');
    expect(distanceLisible(844, 'fr-CA')).toBe('840 m');
    expect(distanceLisible(1432, 'fr-CA')).toBe('1,4 km');
    expect(distanceLisible(1432, 'en-CA')).toBe('1.4 km');
  });

  it('propose la marche pres de la salle et la voiture au-dela', () => {
    expect(modeParDefaut([45.5017, -73.5673], [45.512, -73.57])).toBe('pied');
    expect(modeParDefaut([45.5017, -73.5673], [45.45, -73.75])).toBe('auto');
  });
});
