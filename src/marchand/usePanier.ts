/* LE PANIER, VU PAR REACT. Le magasin (panier-store.ts) ne connait pas React
 * et se teste sans lui ; ce crochet est le seul point ou les deux se
 * rencontrent. Il relit le panier a chaque evenement, et rien d'autre ne doit
 * lire `localStorage` directement. */

import { useEffect, useState } from 'react';
import { EVENEMENT_PANIER, compterLePanier, lirePanier, type ArticlePanier } from './panier-store.ts';

export function usePanier(): readonly ArticlePanier[] {
  const [articles, setArticles] = useState<readonly ArticlePanier[]>(() => lirePanier());
  useEffect(() => {
    const relire = (): void => setArticles(lirePanier());
    window.addEventListener(EVENEMENT_PANIER, relire);
    /* UN AUTRE ONGLET COMPTE AUSSI. `storage` ne se declenche que dans les
       autres onglets, jamais dans celui qui ecrit : les deux ecoutes ne font
       donc pas double emploi. */
    window.addEventListener('storage', relire);
    return () => {
      window.removeEventListener(EVENEMENT_PANIER, relire);
      window.removeEventListener('storage', relire);
    };
  }, []);
  return articles;
}

/** Le nombre porte par le badge. Zero quand le panier est vide. */
export function useCompteDuPanier(): number {
  return compterLePanier(usePanier());
}
