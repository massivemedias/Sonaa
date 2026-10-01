/* LES PETITES LECTURES DE LA MOISSON DES LABELS. Voir labels-moisson.ts. */

import { describe, expect, it } from 'vitest';
import { nettoyerProfil, sansTirets, variantes } from './labels-moisson.ts';

describe('variantes', () => {
  it('propose le nom sans « Records » et l esperluette collee', () => {
    expect(variantes('R & S Records')).toEqual(expect.arrayContaining(['R & S Records', 'R & S', 'R&S Records', 'R and S Records']));
    expect(variantes('Warp Records')).toContain('Warp');
  });
});

describe('nettoyerProfil', () => {
  it('retire le balisage de Discogs et garde le texte', () => {
    expect(nettoyerProfil('Founded by [a=Laurent Garnier] in [b]1994[/b]. See [url=http://x.fr]the site[/url]. Sub-label of [l123].')).toBe(
      'Founded by Laurent Garnier in 1994. See the site. Sub-label of .'
    );
  });
});

describe('sansTirets', () => {
  it('remplace les tirets longs par un trait d union ou une virgule', () => {
    const long = String.fromCharCode(0x2013);
    const cadratin = String.fromCharCode(0x2014);
    expect(sansTirets(`New York${long}based`)).toBe('New York-based');
    expect(sansTirets(`un label ${cadratin} fonde en 1994`)).toBe('un label, fonde en 1994');
  });
});
