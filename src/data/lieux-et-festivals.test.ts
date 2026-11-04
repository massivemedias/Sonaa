import { describe, expect, it } from 'vitest';
import { LIEUX_ET_FESTIVALS, PAYS_LIEUX, VILLES_CLUBS } from './lieux-et-festivals.ts';

describe('Atlas des clubs et festivals', () => {
  it('couvre au moins 60 villes électroniques (dont les 23 villes du calendrier SONAA), 18 salles à Montréal et 235 clubs au total', () => {
    const clubs = LIEUX_ET_FESTIVALS.filter((l) => l.type === 'club');
    expect(VILLES_CLUBS.length).toBeGreaterThanOrEqual(60);
    expect(VILLES_CLUBS.filter((v) => v.aCalendrier).length).toBe(23);
    expect(clubs.length).toBeGreaterThanOrEqual(235);

    const montreal = clubs.filter((c) => c.villeSlug === 'montreal-ca');
    expect(montreal.length).toBeGreaterThanOrEqual(18);
    const nomsMtl = montreal.map((c) => c.nom);
    expect(nomsMtl).toContain('Stereo');
    expect(nomsMtl).toContain('StereoBar');
    expect(nomsMtl).toContain('Bar Datcha');
    expect(nomsMtl).toContain('Système');
    expect(nomsMtl).toContain('Le Belmont');
    expect(nomsMtl).toContain('Le Red Room');
    expect(nomsMtl).toContain('New City Gas');
    expect(nomsMtl).toContain('MTELUS');

    for (const v of VILLES_CLUBS) {
      const deLaVille = clubs.filter((c) => c.villeSlug === v.slug);
      expect(deLaVille.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('recense au moins 290 festivals de 1 000+ places dans 33 pays, dont le Suti Festival au Portugal', () => {
    const festivals = LIEUX_ET_FESTIVALS.filter((l) => l.type === 'festival');
    expect(PAYS_LIEUX.length).toBeGreaterThanOrEqual(33);
    expect(festivals.length).toBeGreaterThanOrEqual(290);

    const suti = festivals.find((f) => f.id === 'suti-festival-portugal');
    expect(suti).toBeDefined();
    expect(suti?.nom).toBe('Suti Festival');
    expect(suti?.paysCode).toBe('PT');

    const timeless = festivals.find((f) => f.id === 'timeless-festival-quebec');
    expect(timeless).toBeDefined();
    expect(timeless?.nom).toBe('Timeless Festival');

    const futureForest = festivals.find((f) => f.id === 'future-forest-canada');
    expect(futureForest).toBeDefined();
    expect(futureForest?.nom).toBe('Future Forest');

    const grooveBass = festivals.find((f) => f.id === 'groove-and-bass-festival-quebec');
    expect(grooveBass).toBeDefined();
    expect(grooveBass?.nom).toBe('Groove & Bass Festival');

    for (const f of festivals) {
      expect(f.capacite).toBeGreaterThanOrEqual(1000);
      expect(f.latitude).toBeGreaterThanOrEqual(-45);
      expect(f.latitude).toBeLessThanOrEqual(60);
      expect(f.longitude).toBeGreaterThanOrEqual(-130);
      expect(f.longitude).toBeLessThanOrEqual(155);
    }
  });
});
