/* LA GARDE EST LA SEULE DECISION DE CET ADAPTATEUR, DONC LA SEULE A TESTER.
 * Les exemples sont des titres reels de la premiere moisson montrealaise. */
import { describe, expect, it } from 'vitest';
import { estElectronique } from './ingerer-eventbrite.ts';

describe('estElectronique', () => {
  it('garde ce qui se dit electronique', () => {
    expect(estElectronique('Alex Kade: The EMO x ANIME RAVE', null, null)).toBe(true);
    expect(estElectronique('WEBZ- Syncopath Collective Launch Party', 'techno et bass', null)).toBe(true);
    expect(estElectronique('Soirée', 'DJ set toute la nuit', null)).toBe(true);
  });
  /* CE QUI ETAIT AFFICHE EN PREMIER A MONTREAL. */
  it('ecarte ce qui ne le dit nulle part', () => {
    expect(estElectronique('VOID, DESOLUS avec STREGONERIA, POSTLUVEN', 'Concert Métal / Metal Concert', 'Les Productions Dungeon Works')).toBe(false);
    expect(estElectronique("TRIVIA NIGHT AT HURLEY'S", null, null)).toBe(false);
    expect(estElectronique('Montréal : Vendredi 11 septembre 2026 - 19h30 : Hommage à Ginette Reno', null, null)).toBe(false);
  });
  /* LA TROISIEME CARTE DE MONTREAL, AVANT LES BORNES DE MOT. « techno » nu
     attrapait « Technology ». */
  it('ne prend pas « techno » dans « technology », ni les autres mots enclaves', () => {
    expect(estElectronique('Conference on Information Technology and Computing', null, null)).toBe(false);
    expect(estElectronique('Grand entrance gala', 'discount travel to Edmonton', null)).toBe(false);
  });
  /* PAS DE MOT D'EXCLUSION : un mot electronique suffit, quoi qu'il y ait a cote. */
  it('ne rejette pas sur la presence d un mot etranger', () => {
    expect(estElectronique('Techno-Metal Night', 'metal', null)).toBe(true);
  });
  /* UN CHIFFRE COLLE AU MOT N'EST PAS UNE LETTRE : « Down2Techno » doit passer. */
  it('accepte un mot electronique colle a un chiffre', () => {
    expect(estElectronique('Down2Techno: FEL!, Pinch, POM', null, null)).toBe(true);
    expect(estElectronique('#LeCypher #404 - Live Hip-Hop', 'dj set', null)).toBe(true);
  });
  it('ne prend pas « set » ni « dj » a l interieur d un autre mot', () => {
    expect(estElectronique('Sunset Yoga', 'settle in', 'Adjust Co')).toBe(false);
  });
});
