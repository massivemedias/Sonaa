/* LA CORRESPONDANCE EST LE SEUL ENDROIT OU L'ON DECIDE, DONC LE SEUL A TESTER.
 *
 * Le reste de la chaine transporte : Last.fm classe, Discogs compte, on ecrit.
 * Ici on tranche, nom par nom, ce qui devient un genre de l'atlas et ce qui
 * n'en devient rien. Une erreur y est invisible et se propage a des milliers
 * de fiches, ce qui est exactement la definition d'un endroit a tester. */

import { describe, expect, it } from 'vitest';
import { aplatir, ranger, vocabulaire, MODIFICATEURS, TROUS } from './lib/correspondance-styles.ts';
import { genresDuCorpus } from './lib/genres-du-corpus.ts';

const GENRES = genresDuCorpus();
const FAMILLES = [
  'disco','house','techno','minimal','trance','psy','industrial',
  'roots','breaks','bass','electro','hardcore','ambient','downtempo',
].map((id) => ({ id, label: id }));
const VOC = vocabulaire(GENRES, [
  { id: 'disco', label: 'Disco' }, { id: 'house', label: 'House' },
  { id: 'techno', label: 'Techno' }, { id: 'minimal', label: 'Minimal' },
  { id: 'trance', label: 'Trance' }, { id: 'psy', label: 'Psy' },
  { id: 'industrial', label: 'Industrial' }, { id: 'roots', label: 'Roots' },
  { id: 'breaks', label: 'Breaks' }, { id: 'bass', label: 'Bass' },
  { id: 'electro', label: 'Electro' }, { id: 'hardcore', label: 'Hardcore' },
  { id: 'ambient', label: 'Ambient' }, { id: 'downtempo', label: 'Downtempo' },
  ...FAMILLES.slice(0, 0),
]);

describe('aplatir', () => {
  it('rend la meme forme pour les ecritures d un meme nom', () => {
    expect(aplatir('Hi-NRG')).toBe(aplatir('Hi NRG'));
    expect(aplatir('Hi-NRG')).toBe(aplatir('hinrg'));
    expect(aplatir('Musique concrète')).toBe('musiqueconcrete');
  });
});

describe('ranger : ce qui tombe sur un genre', () => {
  it('reconnait un libelle ecrit comme le notre', () => {
    expect(ranger('Detroit Techno', VOC)).toEqual({ sorte: 'genre', id: 'detroittechno' });
    expect(ranger('Deep House', VOC)).toEqual({ sorte: 'genre', id: 'deephouse' });
  });

  it('reconnait les orthographes de Discogs', () => {
    expect(ranger('Italo-Disco', VOC)).toEqual({ sorte: 'genre', id: 'italodisco' });
    expect(ranger('Drum n Bass', VOC)).toEqual({ sorte: 'genre', id: 'drumandbass' });
    expect(ranger('Psy-Trance', VOC)).toEqual({ sorte: 'genre', id: 'psychedelictrance' });
  });
});

describe('ranger : ce qui tombe sur une famille', () => {
  /* SANS CE CAS, LA COUVERTURE PLAFONNE A 55 %. Discogs etiquette « House »
     tout court quatorze mille fois ; nous n'avons pas de genre de ce nom. */
  it('accepte un nom plus grossier que le notre', () => {
    expect(ranger('House', VOC)).toEqual({ sorte: 'famille', id: 'house' });
    expect(ranger('Techno', VOC)).toEqual({ sorte: 'famille', id: 'techno' });
  });

  it('range un nom qui porte sa famille', () => {
    expect(ranger('Euro House', VOC)).toEqual({ sorte: 'famille', id: 'house' });
    expect(ranger('Deep Techno', VOC)).toEqual({ sorte: 'famille', id: 'techno' });
  });
});

describe('ranger : ce qu on refuse de ranger', () => {
  /* « ACID » N'EST LE SEUL STYLE D'AUCUN DES 455 ARTISTES OU IL APPARAIT, et
     Discogs a par ailleurs « Acid House ». C'est un adjectif. */
  it('ecarte les modificateurs plutot que de les ranger de force', () => {
    expect(ranger('Acid', VOC)).toBeNull();
    expect(ranger('Experimental', VOC)).toBeNull();
    expect(ranger('Leftfield', VOC)).toBeNull();
  });

  /* « Minimal » est ecarte alors qu'une famille porte ce nom : Discogs
     l'emploie pour la techno minimale, le minimalisme savant et la synth-pop
     depouillee. Le test protege cet ordre : modificateur d'abord, recherche
     ensuite. */
  it('ecarte « Minimal » meme si une famille s appelle ainsi', () => {
    expect(MODIFICATEURS.has('Minimal')).toBe(true);
    expect(ranger('Minimal', VOC)).toBeNull();
    expect(ranger('Minimal Techno', VOC)).toEqual({ sorte: 'genre', id: 'minimaltechno' });
  });

  it('ne range rien de ce qui n est pas electronique', () => {
    for (const n of ['Pop Rock', 'Gospel', 'Thrash', 'Country', 'Soul', 'Ballad']) {
      expect(ranger(n, VOC)).toBeNull();
    }
  });

  /* LES TROUS SONT DES TROUS, PAS DES ERREURS. Les ranger sur une famille
     approchante prendrait a la place de Mika une decision d'auteur. */
  it('laisse de cote les genres que l atlas n a pas', () => {
    for (const n of TROUS) expect(ranger(n, VOC)).toBeNull();
  });
});
