import { describe, expect, it } from 'vitest';
import { ESPACES_A_LOUER, estEspaceALouer } from './espaces-a-louer.ts';
import { LIEUX_ET_FESTIVALS, VILLES_CLUBS } from './lieux-et-festivals.ts';

describe('Espaces a louer pour des soirees (28 novembre 2026)', () => {
  const slugs = new Set(VILLES_CLUBS.map((v) => v.slug));

  it('range chaque espace dans une ville de l’atlas, avec une source lue', () => {
    expect(ESPACES_A_LOUER.length).toBeGreaterThanOrEqual(7);
    const ids = new Set<string>();
    for (const e of ESPACES_A_LOUER) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(slugs.has(e.villeSlug ?? '')).toBe(true);
      expect(estEspaceALouer(e)).toBe(true);
      expect(e.adresse.length).toBeGreaterThan(5);
      expect(e.site).toMatch(/^https:\/\//);
      expect(e.sourceLocation).toMatch(/^https:\/\//);
      if (e.sourceElectro) expect(e.sourceElectro).toMatch(/^https:\/\//);
      expect(e.capacite).toBeGreaterThanOrEqual(0);
      expect(e.styles).toEqual([]);
      expect(e.description.fr.length).toBeGreaterThan(20);
      expect(e.description.en.length).toBeGreaterThan(20);
      expect(Math.abs(e.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(e.longitude)).toBeLessThanOrEqual(180);
    }
  });

  it('pose chaque espace pres du centre de sa ville', () => {
    for (const e of ESPACES_A_LOUER) {
      const v = VILLES_CLUBS.find((x) => x.slug === e.villeSlug)!;
      expect(Math.abs(e.latitude - v.latitude)).toBeLessThan(0.6);
      expect(Math.abs(e.longitude - v.longitude)).toBeLessThan(0.6);
    }
  });

  it('garde Le Livart et les espaces de Montreal demandes par Mika', () => {
    const mtl = ESPACES_A_LOUER.filter((e) => e.villeSlug === 'montreal-ca').map((e) => e.nom);
    expect(mtl).toContain('Le Livart');
    expect(mtl).toContain('Never Apart');
    expect(mtl).toContain('Fonderie Darling');
  });

  it('ne double aucun club : un espace ne porte que l’id d’une ancienne salle', () => {
    for (const e of ESPACES_A_LOUER) {
      const deja = LIEUX_ET_FESTIVALS.find((l) => l.id === e.id);
      if (deja) expect(deja.estSalle).toBe(true);
    }
  });
});

describe('Espaces a louer et clubs', () => {
  it('ne propose aucun espace deja classe comme club dans sa ville', () => {
    const norm = (s: string): string =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const e of ESPACES_A_LOUER) {
      const club = LIEUX_ET_FESTIVALS.find(
        (l) => l.type === 'club' && !l.estSalle && l.villeSlug === e.villeSlug && norm(l.nom) === norm(e.nom)
      );
      expect(club, e.nom).toBeUndefined();
    }
  });
});
