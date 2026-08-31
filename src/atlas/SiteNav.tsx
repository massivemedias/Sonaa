/* LA NAVIGATION DU SITE, une seule, partout.

   Le défaut mesuré sur sonaa.ca : chaque page inventait son propre pied, avec
   un sous-ensemble différent de liens, et le pied de l'atlas mélangeait trois
   choses : un mode d'affichage (3D / colonnes), des vues (chronologie,
   chaleur, arbre, index) et des pages (à propos, crédits). L'index, chemin de
   première classe, se retrouvait après le séparateur, avec les pages annexes.
   La chronologie n'avait aucune sortie. L'index affirmait encore « données
   factices ».

   Ici, deux groupes, toujours les mêmes, dans le même ordre :
   les VUES d'abord (où l'on lit le corpus), les PAGES ensuite (où l'on
   s'informe). L'état actif est un attribut, pas une couleur seule. */

import { useEffect, useState, type ReactNode } from 'react';
import './site-nav.css';

type SiteCourant =
  | 'atlas'
  | 'parcourir'
  | 'chronologie'
  | 'heatmap'
  | 'arbre'
  | 'index'
  | 'apropos'
  | 'credits'
  | 'propositions'
  | 'moderation'
  | 'autre';

/* LE MENU NE PORTE PLUS QUE DEUX VUES.

   La carte en trois dimensions, la chronologie, la carte de chaleur et
   l'arbre en sont retires sur demande de Mika. Ils ne sont pas SUPPRIMES :
   leurs adresses repondent toujours, les fichiers sont intacts, et un lien
   suffit a les faire revenir. Ce qui change est ce que le site PROPOSE, et
   ce qu'il propose maintenant tient en une porte d'entree.

   POURQUOI CE N'EST PAS UNE PERTE : cinq facons de regarder le meme corpus
   demandaient de choisir avant de savoir, et le choix se payait sur
   telephone, ou le menu tenait trois lignes. */
const VUES: readonly { href: string; id: SiteCourant; label: string }[] = [
  { href: '#/parcourir', id: 'parcourir', label: 'Parcourir' },
  { href: '#/index', id: 'index', label: 'Index' }
];

const PAGES: readonly { href: string; id: SiteCourant; label: string }[] = [
  { href: '#/a-propos', id: 'apropos', label: 'À propos' },
  { href: '#/credits', id: 'credits', label: 'Crédits' }
];

function courantOf(hash: string): SiteCourant {
  if (hash.startsWith('#/index')) return 'index';
  if (hash.startsWith('#/credits')) return 'credits';
  if (hash.startsWith('#/a-propos')) return 'apropos';
  if (hash.startsWith('#/propositions')) return 'propositions';
  if (hash.startsWith('#/moderation')) return 'moderation';
  if (hash.startsWith('#/chronologie')) return 'chronologie';
  if (hash.startsWith('#/heatmap')) return 'heatmap';
  if (hash.startsWith('#/arbre')) return 'arbre';
  if (hash.startsWith('#/parcourir')) return 'parcourir';
  if (hash === '' || hash === '#' || hash.startsWith('#/')) return 'atlas';
  return 'autre';
}

interface Props {
  /** overlay : chrome de l'atlas et des vues plein écran.
      page : pied des pages document. */
  variant: 'overlay' | 'page';
  /** Contrôle qui n'est pas une destination, collé aux vues (ex. 3D / colonnes). */
  extra?: ReactNode;
}

export function SiteNav({ variant, extra }: Props) {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const suivre = (): void => setHash(window.location.hash);
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);
  const courant = courantOf(hash);

  const lien = (item: { href: string; id: SiteCourant; label: string }) => {
    const actif = item.id === courant;
    return (
      <a
        key={item.id}
        href={item.href}
        className="sitenav-lien"
        aria-current={actif ? 'page' : undefined}
        data-current={actif}
      >
        {item.label}
      </a>
    );
  };

  return (
    <nav className={`sitenav sitenav-${variant}`} aria-label="Navigation du site">
      {extra}
      {extra ? (
        <span className="sitenav-sep" aria-hidden="true">
          ·
        </span>
      ) : null}
      <span className="sitenav-groupe">
        {VUES.map(lien)}
      </span>
      <span className="sitenav-sep" aria-hidden="true">
        ·
      </span>
      <span className="sitenav-groupe">
        {PAGES.map(lien)}
      </span>
    </nav>
  );
}
