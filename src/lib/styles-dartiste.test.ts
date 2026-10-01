/* Le rangement des styles Discogs dans notre vocabulaire, cote site : la
   meme table que la moisson, lue depuis les structures du site. */
import { describe, expect, it } from 'vitest';
import { ciblesDesEtiquettes, stylesVersSonaa } from './styles-dartiste.ts';

describe('stylesVersSonaa', () => {
  it('range Tech House et Deep House sur leurs genres, du plus present au moins', () => {
    expect(stylesVersSonaa({ 'Tech House': 3, 'Deep House': 1 })).toEqual(['techhouse', 'usdeephouse']);
  });
  it('ecarte les modificateurs et ce que l atlas ne nomme pas', () => {
    expect(stylesVersSonaa({ Acid: 4, 'Pop Rock': 2, Techno: 1 })).toEqual(['techno']);
  });
  it('rend vide quand rien ne se range', () => {
    expect(stylesVersSonaa({ Gospel: 2 })).toEqual([]);
  });
});

/* LE STYLE D'UN MORCEAU RECONNU, par ses etiquettes. Le cas qui l'a fait
   naitre, le 1er octobre 2026 : « Tinnies & Ciggies » d'Amoss, de la drum
   and bass que le reseau a l'oreille rangeait en Ambient a 7 %. */
describe('ciblesDesEtiquettes', () => {
  it('range les etiquettes du public dans l atlas, genre avant famille', () => {
    const c = ciblesDesEtiquettes(['Drum & Bass', 'Electronic', 'techstep', 'Drum and bass', 'Dance']);
    expect(c.map((x) => x.id)).toEqual(['drumandbass', 'techstep']);
  });
  it('ne rend rien quand aucune etiquette ne se range', () => {
    expect(ciblesDesEtiquettes(['Electronic', 'Dance', 'seen live'])).toEqual([]);
  });
});
