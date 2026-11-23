/* LES LABELS : la cle de comparaison et ce que la recherche montre en
   premier. Voir labels.ts. */

import { describe, expect, it } from 'vitest';
import { cleDeLabel, estMajor, succes, estSansLabel, labelsDuStyle, labelsPourRecherche, lieuMaisonMere, nomsDeLabels, nomDuPays, ordreDeNotoriete, type EntreeLabel, type FicheLabel } from './labels.ts';
import INDEX_REEL from '../data/labels-index.json';
import FICHES_REELLES from '../data/labels.json';

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

describe('maisons meres et purete 100 % musique electronique', () => {
  it('formate proprement la maison mere en francais et en anglais', () => {
    expect(lieuMaisonMere({ fr: 'Montréal, Québec', en: 'Montreal, Quebec' }, 'Canada', true, 'fr')).toBe(
      'Montréal, Québec, Canada'
    );
    expect(lieuMaisonMere({ fr: 'Montréal, Québec', en: 'Montreal, Quebec' }, 'Canada', true, 'en')).toBe(
      'Montreal, Quebec, Canada'
    );
    expect(lieuMaisonMere({ fr: 'Berlin', en: 'Berlin' }, 'Allemagne', false, 'en')).toBe('Berlin, Germany');
  });

  it('geolocalise VRSTL Records a Montreal (Canada) et exclut les majors hors electronique', () => {
    const entrees = INDEX_REEL as unknown as readonly EntreeLabel[];
    const fiches = FICHES_REELLES as unknown as readonly FicheLabel[];

    expect(entrees.length).toBeGreaterThanOrEqual(1420);
    const geoloc = entrees.filter((e) => Array.isArray(e.g) && e.g.length === 2);
    expect(geoloc.length).toBeGreaterThanOrEqual(1380);

    const vrstlIdx = entrees.find((e) => e.s === 'vrstl-records');
    const vrstlFiche = fiches.find((f) => f.slug === 'vrstl-records');
    expect(vrstlIdx).toBeDefined();
    expect(vrstlIdx?.p).toBe('Canada');
    expect(vrstlIdx?.q).toBe(1);
    expect(vrstlIdx?.v?.fr).toContain('Montréal');
    expect(vrstlIdx?.g?.[0]).toBeCloseTo(45.5017, 1);
    expect(vrstlIdx?.g?.[1]).toBeCloseTo(-73.5673, 1);
    expect(vrstlFiche?.resume.fr).toContain('Amérique du Sud');

    /* Aucun label generaliste hors electronique (Sony, Universal, Columbia, Motown, Blue Note) dans l'index public. */
    for (const horsSlug of ['sony-music', 'universal-music-group', 'columbia', 'motown', 'alligator-records', 'blue-note']) {
      expect(entrees.find((e) => e.s === horsSlug)).toBeUndefined();
      expect(fiches.find((f) => f.slug === horsSlug)?.horsElectronique).toBe(true);
    }
  });
});
