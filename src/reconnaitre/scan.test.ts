/* LE SEUIL DU SCAN, TENU SUR LES QUATRE MESURES DU BANC. Voir scan.ts. */

import { describe, expect, it } from 'vitest';
import { genreRattachable, scanAEnregistrer, SEUIL_SCAN } from './scan.ts';
import type { MorceauReconnu } from './audd.ts';

const morceau = (titre: string, artiste: string): MorceauReconnu => ({
  titre, artiste, album: null, pochette: null, liens: [], label: null, annee: null, duree: null, position: null, styles: [],
});
const p = (discogs: string, score: number) => ({ discogs, nom: discogs.split('---')[1] ?? discogs, score });

/* Les sorties brutes du banc du 22 septembre 2026, apres la correction des
   etiquettes, sur les quatre extraits. */
const EXTRAWELT = [p('Electronic---Techno', 0.824), p('Electronic---House', 0.666), p('Electronic---Deep Techno', 0.266)];
const BIESMANS = [p('Electronic---Neo Trance', 0.377), p('Electronic---Techno', 0.343), p('Electronic---House', 0.339)];
/* AFFKT a donne 0,365 puis 0,34 a deux passages : le second est retenu ici,
   pour que le test tienne le cas le plus bas mesure. */
const AFFKT = [p('Electronic---Progressive House', 0.34), p('Electronic---House', 0.185), p('Electronic---Neo Trance', 0.085)];
const PARDON_MOI = [p('Electronic---Neo Trance', 0.459), p('Electronic---Progressive House', 0.388), p('Electronic---Techno', 0.347)];

describe('le rattachement d un scan', () => {
  it('ne prend qu un style qui a un genre exact dans l atlas', () => {
    expect(genreRattachable(EXTRAWELT)).toEqual({ genre: 'hypnotictechno', confiance: 0.266 });
    expect(genreRattachable(BIESMANS)).toBeNull();
  });

  it('a 0,30, inscrit AFFKT et Pardon Moi, ecarte Extrawelt et Biesmans', () => {
    expect(SEUIL_SCAN).toBe(0.3);
    expect(scanAEnregistrer(morceau('Roommush', 'AFFKT'), AFFKT)?.genre_slug).toBe('progressivehouse');
    expect(scanAEnregistrer(morceau('Power to the People', 'Pardon Moi'), PARDON_MOI)?.genre_slug).toBe('progressivehouse');
    expect(scanAEnregistrer(morceau('Herz Aus Blech', 'Extrawelt'), EXTRAWELT)).toBeNull();
    expect(scanAEnregistrer(morceau('On The Run', 'Biesmans'), BIESMANS)).toBeNull();
  });

  it('n inscrit rien sans morceau nomme', () => {
    expect(scanAEnregistrer(null, AFFKT)).toBeNull();
  });
});
