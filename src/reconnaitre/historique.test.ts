// @vitest-environment jsdom
/* L'historique tient une promesse faite a l'utilisateur dans la modale : rien
   ne part, vingt au plus, et le bouton efface vraiment. */

import { afterEach, describe, expect, it } from 'vitest';
import {
  CLE_HISTORIQUE,
  MAX_HISTORIQUE,
  ajouterAlHistorique,
  lireHistorique,
  viderHistorique,
} from './historique.ts';

const une = (quand: number) => ({ quand, styles: [{ discogs: 'Electronic---Techno', score: 0.5 }] });

afterEach(() => localStorage.clear());

describe('l historique local', () => {
  it('part vide', () => {
    expect(lireHistorique()).toEqual([]);
  });

  it('range la derniere en tete', () => {
    ajouterAlHistorique(une(1));
    ajouterAlHistorique(une(2));
    expect(lireHistorique().map((r) => r.quand)).toEqual([2, 1]);
  });

  it('ne garde que vingt entrees', () => {
    for (let i = 0; i < 25; i += 1) ajouterAlHistorique(une(i));
    const liste = lireHistorique();
    expect(liste).toHaveLength(MAX_HISTORIQUE);
    expect(liste[0]?.quand).toBe(24);
  });

  it('s efface vraiment', () => {
    ajouterAlHistorique(une(1));
    expect(viderHistorique()).toEqual([]);
    expect(localStorage.getItem(CLE_HISTORIQUE)).toBeNull();
  });

  it('ignore un contenu illisible au lieu de casser la page', () => {
    localStorage.setItem(CLE_HISTORIQUE, 'pas du json');
    expect(lireHistorique()).toEqual([]);
    localStorage.setItem(CLE_HISTORIQUE, JSON.stringify([{ rien: true }, une(3)]));
    expect(lireHistorique().map((r) => r.quand)).toEqual([3]);
  });
});
