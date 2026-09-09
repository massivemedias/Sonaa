/* Le rangement des styles Discogs dans notre vocabulaire, cote site : la
   meme table que la moisson, lue depuis les structures du site. */
import { describe, expect, it } from 'vitest';
import { stylesVersSonaa } from './styles-dartiste.ts';

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
