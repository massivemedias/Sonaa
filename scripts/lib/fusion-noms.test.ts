import { describe, expect, it } from 'vitest';
import { aplatirNom, fusionnerDoublons, sansPrefixes } from './fusion-noms.ts';

describe('aplatirNom', () => {
  it('ignore casse, accents et ponctuation', () => {
    expect(aplatirNom('Hernán Cattáneo')).toBe('hernancattaneo');
    expect(aplatirNom("Lil' Louis")).toBe(aplatirNom('Lil Louis'));
  });
});

describe('fusionnerDoublons', () => {
  it('additionne les styles et garde le nom le plus documente', () => {
    const r = fusionnerDoublons({
      'Boney M': { disco: 2 },
      'Boney M.': { disco: 5, funk: 1 },
      Chic: { disco: 3 },
    });
    expect(Object.keys(r)).toEqual(['Boney M.', 'Chic']);
    expect(r['Boney M.']).toEqual({ disco: 7, funk: 1 });
  });
  it('a poids egal, la premiere forme rencontree reste', () => {
    const r = fusionnerDoublons({ 'Louis the Child': { house: 2 }, 'Louis The Child': { house: 2 } });
    expect(Object.keys(r)).toEqual(['Louis the Child']);
  });
  it('ecarte un nom qui ne contient aucune lettre latine ni chiffre, sans le confondre avec un autre', () => {
    const r = fusionnerDoublons({ '⣎⡇': { ambient: 1 }, 'Сто': { techno: 1 } });
    expect(Object.keys(r)).toEqual([]);
  });
});

describe('sansPrefixes', () => {
  it('enleve les frappes en cours', () => {
    expect(sansPrefixes(['Digital c', 'Digital com', 'Digital committee', 'House d', 'Lealtica', 'Lealtica zz'])).toEqual([
      'Digital committee',
      'House d',
      'Lealtica zz',
    ]);
  });
});
