/* LES LABELS : la cle de comparaison et ce que la recherche montre en
   premier. Voir labels.ts. */

import { describe, expect, it } from 'vitest';
import { cleDeLabel, estMajor, estSansLabel, labelsPourRecherche, nomDuPays, ordreDeNotoriete, type EntreeLabel } from './labels.ts';

const index: EntreeLabel[] = [
  { s: 'f-communications', n: 'F Communications', k: ['f communications'], c: 1, p: 'France', a: 1994 },
  { s: 'klf-communications', n: 'KLF Communications', k: ['klf communications'], c: 2, p: null, a: null },
  { s: 'warp-records', n: 'Warp Records', k: ['warp records'], c: 40, p: 'Royaume-Uni', a: 1989 },
  { s: 'r-et-s-records', n: 'R & S Records', k: ['r and s records'], c: 8, p: 'Belgique', a: 1984 },
];

describe('cleDeLabel', () => {
  it('lit l esperluette et oublie la ponctuation', () => {
    expect(cleDeLabel('R & S Records')).toBe(cleDeLabel('R&S Records'));
    expect(cleDeLabel('Éditions Mego')).toBe('editions mego');
  });
  it('reconnait un disque sans label', () => {
    expect(estSansLabel('Not On Label (Goreshit Self-released)')).toBe(true);
    expect(estSansLabel('Warp Records')).toBe(false);
  });
});

describe('labelsPourRecherche', () => {
  it('montre le label que la recherche nomme, avant ceux qui lui ressemblent', () => {
    expect(labelsPourRecherche('F communications', index).map((e) => e.s)).toEqual(['f-communications']);
  });
  it('trouve un label sans son suffixe, et attend trois lettres', () => {
    expect(labelsPourRecherche('warp', index).map((e) => e.s)).toEqual(['warp-records']);
    expect(labelsPourRecherche('wa', index)).toEqual([]);
    expect(labelsPourRecherche('r&s', index).map((e) => e.s)).toEqual(['r-et-s-records']);
  });
});

describe('la galerie', () => {
  it('ne met pas les majors en tete, et range par presence dans l atlas', () => {
    expect(estMajor({ k: ['columbia'] })).toBe(true);
    expect(estMajor({ k: ['warp records'] })).toBe(false);
    const tries = [...index].sort(ordreDeNotoriete).map((e) => e.s);
    expect(tries[0]).toBe('warp-records');
  });
});

describe('le pays', () => {
  it('se dit dans la langue du site', () => {
    expect(nomDuPays('Royaume-Uni', 'fr')).toBe('Royaume-Uni');
    expect(nomDuPays('Royaume-Uni', 'en')).toBe('United Kingdom');
    expect(nomDuPays('Atlantide', 'en')).toBe('Atlantide');
  });
});
