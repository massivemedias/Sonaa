import { describe, expect, it } from 'vitest';
import { dateLongue, quandEnLettres } from './date-soiree.ts';

describe('dateLongue', () => {
  it("ecrit le jour en toutes lettres, en francais et en anglais", () => {
    expect(dateLongue('2026-10-03T00:00:00.000', 'America/Toronto', 'fr-CA')).toBe('samedi 3 octobre 2026');
    expect(dateLongue('2026-10-03T00:00:00.000', 'America/Toronto', 'en-CA')).toBe('Saturday, October 3, 2026');
  });

  it("lit une heure de Resident Advisor au mur, sans la convertir", () => {
    expect(dateLongue('2026-10-03T23:30:00.000', 'Europe/Berlin', 'fr-CA')).toBe('samedi 3 octobre 2026');
  });

  it('ramene un vrai instant au jour de la ville', () => {
    expect(dateLongue('2026-10-04T02:00:00+00:00', 'America/Toronto', 'fr-CA')).toBe('samedi 3 octobre 2026');
  });

  it("peut se passer de l'annee", () => {
    expect(dateLongue('2026-10-03', 'America/Toronto', 'fr-CA', false)).toBe('samedi 3 octobre');
  });
});

describe('quandEnLettres', () => {
  it('donne la forme demandee par Mika : le jour, un trait, l heure', () => {
    const s = { date: '2026-10-03T00:00:00.000', debut: '2026-10-03T15:00:00.000' };
    expect(quandEnLettres(s, '15 h 00', 'America/Toronto', 'fr-CA')).toBe('samedi 3 octobre 2026 - 15 h 00');
  });

  it("s'en tient au jour quand l'heure manque", () => {
    expect(quandEnLettres({ date: '2026-01-05', debut: null }, null, 'America/Toronto', 'fr-CA')).toBe('lundi 5 janvier 2026');
  });
});
