/* LE COMPTEUR DU PANIER, partout le meme. Voir panier-store.ts.
 *
 * Il ne s'affiche que s'il a quelque chose a dire : un zero dans une pastille
 * occupe la place d'une information sans en porter une. Phase 0, il est donc
 * invisible, et c'est normal. */

import { useCompteDuPanier } from './usePanier.ts';

export function BadgePanier() {
  const n = useCompteDuPanier();
  if (n === 0) return null;
  return (
    <span className="badge-panier" aria-hidden="true">
      {n > 99 ? '99+' : n}
    </span>
  );
}
