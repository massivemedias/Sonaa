/* L'ORDRE DU MODELE ET LA TABLE PORTENT LES MEMES 400 NOMS.
 *
 * Le 22 septembre 2026, ils ne les portaient pas : la table suivait l'ordre
 * d'un autre modele d'Essentia, et 268 sorties sur 400 etaient nommees avec
 * le nom d'une autre classe. Ce test rend cette divergence impossible a
 * reintroduire sans qu'on le sache. */

import { describe, expect, it } from 'vitest';
import { ETIQUETTES_MODELE } from './etiquettes-modele.ts';
import { STYLES_RECONNUS } from './discogs-vers-sonaa.ts';

describe('les etiquettes du modele', () => {
  it('sont quatre cents, sans doublon', () => {
    expect(ETIQUETTES_MODELE).toHaveLength(400);
    expect(new Set(ETIQUETTES_MODELE).size).toBe(400);
  });

  it('sont exactement celles de la table, ni plus ni moins', () => {
    const modele = new Set(ETIQUETTES_MODELE);
    const table = new Set(STYLES_RECONNUS.map((s) => s.discogs));
    expect([...modele].filter((e) => !table.has(e))).toEqual([]);
    expect([...table].filter((e) => !modele.has(e))).toEqual([]);
  });

  /* LES INDEX QUI ONT TROMPE MIKA, FIGES : si quelqu'un remet un jour un
     ordre alphabetique « propre », ce test dit lequel des deux est le vrai. */
  it('gardent l ordre de la demonstration d origine', () => {
    expect(ETIQUETTES_MODELE[88]).toBe('Electronic---House');
    expect(ETIQUETTES_MODELE[47]).toBe('Electronic---Deep House');
    expect(ETIQUETTES_MODELE[127]).toBe('Electronic---Techno');
    expect(ETIQUETTES_MODELE[12]).toBe("Children's---Educational");
  });
});
