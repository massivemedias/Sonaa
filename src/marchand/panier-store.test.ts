// @vitest-environment jsdom
/* LE PANIER SE TESTE SANS REACT, et c'est pour cela qu'il est un module a
   part. Ce qui est verifie ici est ce qui coutera cher plus tard : le compte
   du badge, l'addition, et le fait qu'un stockage illisible rende un panier
   vide au lieu de casser la page. */

import { afterEach, describe, expect, it } from 'vitest';
import {
  CLE_PANIER,
  ajouterAuPanier,
  compterLePanier,
  deviseDuPanier,
  lirePanier,
  retirerDuPanier,
  sousTotal,
  viderLePanier,
  type ArticlePanier,
} from './panier-store.ts';

const morceau = (ref: string, prix: number): ArticlePanier => ({
  sorte: 'track',
  ref,
  titre: `Morceau ${ref}`,
  prix,
  devise: 'CAD',
  quantite: 1,
});

afterEach(() => {
  localStorage.clear();
});

describe('le panier', () => {
  it('part vide', () => {
    expect(lirePanier()).toEqual([]);
    expect(compterLePanier()).toBe(0);
    expect(deviseDuPanier()).toBeNull();
  });

  it('ajoute, puis retrouve ce qui a ete ajoute apres un rechargement', () => {
    ajouterAuPanier(morceau('a', 2.5));
    expect(lirePanier()).toHaveLength(1);
    expect(localStorage.getItem(CLE_PANIER)).toContain('"ref":"a"');
  });

  it('ajoute deux fois la meme chose en augmentant la quantite, pas en doublant la ligne', () => {
    ajouterAuPanier(morceau('a', 2.5));
    ajouterAuPanier(morceau('a', 2.5));
    const articles = lirePanier();
    expect(articles).toHaveLength(1);
    expect(articles[0]?.quantite).toBe(2);
    expect(compterLePanier()).toBe(2);
  });

  it('distingue deux sortes qui porteraient la meme reference', () => {
    ajouterAuPanier(morceau('x', 1));
    ajouterAuPanier({ ...morceau('x', 1), sorte: 'billet' });
    expect(lirePanier()).toHaveLength(2);
  });

  /* LE PIEGE DE LA VIRGULE FLOTTANTE : 1,10 trois fois ne fait pas
     3,3000000000000003 quand on additionne des cents. */
  it('additionne en cents, pas en nombres a virgule', () => {
    ajouterAuPanier(morceau('a', 1.1));
    ajouterAuPanier(morceau('b', 1.1));
    ajouterAuPanier(morceau('c', 1.1));
    expect(sousTotal()).toBe(3.3);
  });

  it('compte les quantites dans le sous-total', () => {
    ajouterAuPanier({ ...morceau('a', 2.5), quantite: 3 });
    expect(sousTotal()).toBe(7.5);
  });

  it('retire une ligne entiere, et vide tout', () => {
    ajouterAuPanier(morceau('a', 1));
    ajouterAuPanier(morceau('b', 2));
    retirerDuPanier('track', 'a');
    expect(lirePanier().map((x) => x.ref)).toEqual(['b']);
    viderLePanier();
    expect(lirePanier()).toEqual([]);
    expect(localStorage.getItem(CLE_PANIER)).toBeNull();
  });

  it('ignore ce qui a ete range par une autre version, sans casser', () => {
    localStorage.setItem(CLE_PANIER, '{"pas":"une liste"}');
    expect(lirePanier()).toEqual([]);
    localStorage.setItem(CLE_PANIER, 'ceci n est pas du json');
    expect(lirePanier()).toEqual([]);
    localStorage.setItem(CLE_PANIER, JSON.stringify([{ ref: 'a' }, morceau('b', 1)]));
    expect(lirePanier().map((x) => x.ref)).toEqual(['b']);
  });
});
