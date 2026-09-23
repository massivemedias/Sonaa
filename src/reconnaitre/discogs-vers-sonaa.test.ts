/* CE QU'UNE MACHINE PEUT VERIFIER SUR UNE TABLE ECRITE A LA MAIN : que rien
   n'y designe un genre qui n'existe pas. Le jour ou un identifiant du corpus
   change, ce test tombe ici, et pas a l'ecran devant un lien mort. */

import { describe, expect, it } from 'vitest';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import {
  STYLES_RECONNUS,
  familleSonaa,
  nomCourt,
  styleDeLEtiquette,
} from './discogs-vers-sonaa.ts';

const IDS = new Set(STRUCTURES.flatMap((s) => s.genres.map((g) => g.id)));
const FAMILLES = new Set(FAMILIES.map((f) => f.id));

describe('la table des 400 styles', () => {
  it('porte les 400 etiquettes du modele, sans doublon', () => {
    expect(STYLES_RECONNUS).toHaveLength(400);
    expect(new Set(STYLES_RECONNUS.map((s) => s.discogs)).size).toBe(400);
  });

  it('ne designe que des genres qui existent dans le corpus', () => {
    const inconnus = STYLES_RECONNUS.filter((s) => s.sonaa !== null && !IDS.has(s.sonaa));
    expect(inconnus.map((s) => `${s.discogs} vers ${s.sonaa ?? ''}`)).toEqual([]);
  });

  it('donne a chaque genre cite la famille qui est vraiment la sienne', () => {
    const faux = STYLES_RECONNUS.filter((s) => {
      if (!s.sonaa) return false;
      const genre = STRUCTURES.flatMap((x, i) => x.genres.map((g) => ({ g, i }))).find(
        (x) => x.g.id === s.sonaa
      );
      return !genre || FAMILIES[genre.i]?.id !== s.famille;
    });
    expect(faux.map((s) => s.discogs)).toEqual([]);
  });

  it('couvre les 107 styles electroniques, dont 87 par un genre exact', () => {
    const elec = STYLES_RECONNUS.filter((s) => s.discogs.startsWith('Electronic---'));
    expect(elec).toHaveLength(107);
    expect(elec.filter((s) => s.sonaa !== null)).toHaveLength(87);
  });

  /* LE POINT DELICAT DE LA TABLE : `famille` ne veut pas dire la meme chose
     selon les lignes, et c'est `familleSonaa` qui tranche. */
  it('rend une famille ouvrable pour un style electronique, rien pour le reste', () => {
    const maison = styleDeLEtiquette('Electronic---House');
    expect(maison?.sonaa).toBeNull();
    expect(familleSonaa(maison!)).toBe('house');

    const grunge = styleDeLEtiquette('Rock---Grunge');
    expect(grunge?.sonaa).toBeNull();
    expect(familleSonaa(grunge!)).toBeNull();
    expect(grunge?.famille).toBe('Rock');
  });

  it('laisse toute famille SONAA citee exister vraiment', () => {
    const fautives = STYLES_RECONNUS.map(familleSonaa).filter((f): f is string => f !== null && !FAMILLES.has(f));
    expect(fautives).toEqual([]);
  });

  it('coupe le prefixe de famille pour l affichage', () => {
    expect(nomCourt('Electronic---Deep House')).toBe('Deep House');
    expect(nomCourt('Sans prefixe')).toBe('Sans prefixe');
  });

  it('retrouve une etiquette, et rend null pour une inconnue', () => {
    expect(styleDeLEtiquette('Electronic---Dub Techno')?.sonaa).toBe('dubtechno');
    expect(styleDeLEtiquette('Electronic---Inexistant')).toBeNull();
  });
});
