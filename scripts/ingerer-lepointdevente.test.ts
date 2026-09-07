/* LES DEUX SEULES DECISIONS DE CET ADAPTATEUR : lire une date, decouper un titre.
 * Les exemples sont des fiches reelles relevees le 7 septembre 2026. */
import { describe, expect, it } from 'vitest';
import { dateDe, decouperTitre } from './ingerer-lepointdevente.ts';

describe('dateDe', () => {
  it('lit la date encodee dans la reference', () => {
    expect(dateDe('Y7R260923001', '')).toBe('2026-09-23');
    expect(dateDe('2kq260916001', '')).toBe('2026-09-16');
  });
  it('sinon la lit dans le titre', () => {
    expect(dateDe('volleyballets-30oct', 'ÉTS reçoit l’UQTR - 30 octobre 2026 - Montréal')).toBe('2026-10-30');
    expect(dateDe('nightcalll-back-to-the-90s-rave', 'Back to the 90s - 1er novembre 2026')).toBe('2026-11-01');
  });
  it('rend null quand rien ne la porte', () => {
    expect(dateDe('lpvamy1', 'Une soirée sans date')).toBeNull();
  });
});

describe('decouperTitre', () => {
  it('separe organisateur, titre, lieu et ville', () => {
    const d = decouperTitre('Slam Disques présente Basterds, Blank et Seagrave @ Xeroz Arcade - 16 septembre 2026 - Xeroz Arcade, Montréal, QC - Lepointdevente.com');
    expect(d.organisateur).toBe('Slam Disques');
    expect(d.titre).toBe('Basterds, Blank et Seagrave @ Xeroz Arcade');
    expect(d.lieu).toBe('Xeroz Arcade');
    expect(d.ville).toBe('Montréal');
  });
  it('tient sans organisateur et sans lieu', () => {
    const d = decouperTitre('Soirée d’ouverture Invasion Cocktail - 23 septembre 2026 - Les Entrepôts Dominion, Montréal, QC - Lepointdevente.com');
    expect(d.organisateur).toBeNull();
    expect(d.titre).toBe('Soirée d’ouverture Invasion Cocktail');
    expect(d.ville).toBe('Montréal');
  });
  /* QUATRE FICHES SUR CINQ N'ONT PAS DE VILLE : la fonction doit le dire, pas
     inventer. */
  it('rend une ville nulle quand le titre ne la porte pas', () => {
    const d = decouperTitre('Bibliothèques de Lachine présente Club techno Saul-Bellow - Du 26 septembre au 19 décembre - Lepointdevente.com');
    expect(d.ville).toBeNull();
    expect(d.organisateur).toBe('Bibliothèques de Lachine');
  });
});
