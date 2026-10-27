import { describe, expect, it } from 'vitest';
import type { Soiree } from './agenda.ts';
import { lieuxASituer, nomDeSalle, salles } from './carte.ts';

const MONTREAL: readonly [number, number] = [45.5033, -73.5868];

function soiree(id: string, extra: Partial<Soiree>): Soiree {
  return { id, titre: id, date: '2026-10-31T22:00:00', debut: null, lieu: null, artistes: [], genres: [], affiche: null, lien: '', interesses: 0, ...extra };
}

describe('la carte des soirees', () => {
  it('compare les salles sans article, casse ni accent', () => {
    expect(nomDeSalle('Le Belmont')).toBe(nomDeSalle('BELMONT'));
    expect(nomDeSalle('Société des arts technologiques')).toBe('societe des arts technologiques');
  });

  it('range les soirees par salle, la plus chargee en tete', () => {
    const r = salles(
      [
        soiree('a', { lieu: 'Stereo', lat: 45.517, lon: -73.558 }),
        soiree('b', { lieu: 'Newspeak', lat: 45.521, lon: -73.567 }),
        soiree('c', { lieu: 'Stereo', lat: 45.517, lon: -73.558 }),
      ],
      [],
      [],
      MONTREAL
    );
    expect(r.salles.map((s) => [s.nom, s.soirees.length])).toEqual([
      ['Stereo', 2],
      ['Newspeak', 1],
    ]);
    expect(r.sansLieu).toBe(0);
  });

  it('place une soiree Facebook dans une salle que RA connait, sans rien demander', () => {
    const liste = [soiree('ra', { lieu: 'Le Belmont', lat: 45.52, lon: -73.58 }), soiree('fb', { lieu: 'Belmont', origine: 'main' })];
    expect(lieuxASituer(liste)).toEqual([]);
    const r = salles(liste, [], [], MONTREAL);
    expect(r.salles).toHaveLength(1);
    expect(r.salles[0]?.soirees).toHaveLength(2);
  });

  it('demande une fois chaque salle inconnue, et se sert de la reponse', () => {
    const liste = [
      soiree('x', { lieu: 'Bain Mathieu', adresse: '2915 rue Ontario Est' }),
      soiree('y', { lieu: 'Bain Mathieu', adresse: '2915 rue Ontario Est' }),
      soiree('z', { lieu: 'Salle perdue' }),
    ];
    const demande = lieuxASituer(liste);
    expect(demande).toEqual([
      { nom: 'Bain Mathieu', adresse: '2915 rue Ontario Est' },
      { nom: 'Salle perdue', adresse: null },
    ]);
    const r = salles(liste, demande, [[45.54, -73.55], null], MONTREAL);
    expect(r.salles).toHaveLength(1);
    expect(r.salles[0]?.soirees).toHaveLength(2);
    expect(r.sansLieu).toBe(1);
  });

  it('ecarte une salle a plus de quatre-vingts kilometres de la ville', () => {
    const r = salles([soiree('loin', { lieu: 'Mont-Tremblant', lat: 46.21, lon: -74.58 })], [], [], MONTREAL);
    expect(r.salles).toHaveLength(0);
    expect(r.sansLieu).toBe(1);
  });
});
