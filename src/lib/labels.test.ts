/* LES LABELS : la cle de comparaison et ce que la recherche montre en
   premier. Voir labels.ts. */

import { describe, expect, it } from 'vitest';
import { cleDeLabel, estMajor, succes, estSansLabel, labelsDuStyle, labelsPourRecherche, nomsDeLabels, nomDuPays, ordreDeNotoriete, type EntreeLabel } from './labels.ts';

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
  it('ne met pas les majors en tete, et range par succes', () => {
    expect(estMajor({ k: ['columbia'] })).toBe(true);
    expect(estMajor({ k: ['sire records'] })).toBe(true);
    expect(estMajor({ k: ['warp records'] })).toBe(false);
    const avecSucces = index.map((e) => ({ ...e, r: e.s === 'r-et-s-records' ? 900 : 100 }));
    expect([...avecSucces].sort(ordreDeNotoriete).map((e) => e.s).slice(0, 2)).toEqual(['r-et-s-records', 'warp-records']);
  });

  it('compte les seules sorties electroniques', () => {
    const sortie = { titre: 't', artiste: 'a', annee: null, image: null, url: '' };
    expect(succes({ sorties: [{ ...sortie, possedee: 10, electronique: true }, { ...sortie, possedee: 99, electronique: false }, { ...sortie, possedee: 5, electronique: true }] })).toBe(15);
  });
});

describe('le pays', () => {
  it('se dit dans la langue du site', () => {
    expect(nomDuPays('Royaume-Uni', 'fr')).toBe('Royaume-Uni');
    expect(nomDuPays('Royaume-Uni', 'en')).toBe('United Kingdom');
    expect(nomDuPays('Atlantide', 'en')).toBe('Atlantide');
  });
});

describe('les labels d un style', () => {
  const idx: EntreeLabel[] = [
    { s: 'warp-records', n: 'Warp Records', k: ['warp records'], c: 40, p: null, a: null, r: 900 },
    { s: 'planet-mu', n: 'Planet Mu', k: ['planet mu'], c: 3, p: null, a: null, r: 300 },
    { s: 'rephlex', n: 'Rephlex', k: ['rephlex'], c: 2, p: null, a: null, r: 500 },
    { s: 'ilian-tape', n: 'Ilian Tape', k: ['ilian tape'], c: 4, p: null, a: null, r: 50 },
    { s: 'wea', n: 'WEA', k: ['wea', 'wea japan'], c: 9, p: null, a: null, r: 9000 },
    { s: 'kompakt', n: 'Kompakt', k: ['kompakt'], c: 9, p: null, a: null, r: 100 },
  ];
  it('met les labels nommes devant, ranges par morceaux du style, et en ajoute hors majors', () => {
    const morceaux = ['Warp Records', 'Warp Records', 'WEA Japan', 'WEA Japan', 'Ilian Tape', 'Kompakt', 'Kompakt', null];
    const r = labelsDuStyle(morceaux, ['Warp', 'Rephlex', 'Skam', 'Planet Mu', 'Ilian Tape (parenté)'], idx);
    expect(r.map((l) => l.nom)).toEqual(['Warp Records', 'Ilian Tape', 'Rephlex', 'Planet Mu', 'Skam', 'Kompakt']);
    expect(r[0]?.n).toBe(2);
    expect(r.find((l) => l.nom === 'Skam')?.entree).toBeNull();
  });
});

describe('les noms d une case de fiche', () => {
  it('retire la nuance, coupe les doubles, ecarte les phrases', () => {
    expect(nomsDeLabels('Ilian Tape (parenté)')).toEqual(['Ilian Tape']);
    expect(nomsDeLabels('Oasis/Casablanca')).toEqual(['Oasis', 'Casablanca']);
    expect(nomsDeLabels('genre éteint ; quelques rééditions et hommages dispersés')).toEqual([]);
  });
});
