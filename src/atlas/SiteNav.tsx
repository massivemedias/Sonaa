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
import { t } from '../langue/langue.ts';
import { BadgePanier } from '../marchand/BadgePanier.tsx';
import './site-nav.css';

type SiteCourant =
  | 'atlas'
  | 'parcourir'
  | 'mixtapes'
  | 'tracks'
  | 'reconnaitre'
  | 'panier'
  | 'legal'
  | 'chronologie'
  | 'heatmap'
  | 'arbre'
  | 'index'
  | 'apropos'
  | 'credits'
  | 'propositions'
  | 'moderation'
  | 'calendrier'
  | 'news'
  | 'profil'
  | 'autre';

/* ═══ DES MOTS, PLUS DES ICONES ═══
 *
 * Le menu du bureau a porte des icones avec le nom au survol, du 14 au
 * 17 septembre 2026. Il revient aux mots avec l'ouverture de la couche
 * marchande, et la raison est la : cinq portes se devinent en icones, sept ne
 * se devinent plus, et deux des nouvelles, Tracks et Panier, sont exactement
 * celles qu'un visiteur ne cherchera pas s'il doit deviner ce que le dessin
 * veut dire. Un panier se reconnait ; une section de vente qui s'appelle
 * Tracks, non.
 *
 * L'ordre suit ce qu'on vient chercher : ce qui se joue ce soir, ce qui se
 * dit aujourd'hui, d'ou ca vient, ce qui s'ecoute, ce qui s'achete. Puis, a
 * part, ce qui appartient au visiteur : son panier et son compte.
 *
 * SUR TELEPHONE, CETTE RANGEE N'EXISTE PAS. Sous 900 px c'est la barre du bas
 * qui porte la navigation, et ce menu est cache par la feuille de style. Les
 * portes qui ne tiennent pas dans les cinq onglets sont dans le bouton
 * « Plus » de l'en-tete. Voir BarreBas.tsx et MenuPlus.tsx. */
const VUES: readonly { href: string; id: SiteCourant; label: string }[] = [
  { href: '#/calendrier', id: 'calendrier', label: t.leCalendrier },
  { href: '#/news', id: 'news', label: t.leNews },
  { href: '#/parcourir', id: 'parcourir', label: t.lesStyles },
  { href: '#/mixtapes', id: 'mixtapes', label: t.lesMixtapes },
  { href: '#/tracks', id: 'tracks', label: t.lesTracks },
];

/* ═══ LA RECONNAISSANCE N'EST PLUS UNE PORTE DU MENU ═══
 *
 * Elle y a ete du 19 au 21 septembre 2026, entre Mixtapes et Tracks. Ce
 * n'est pas une section du site, c'est un geste : on ne la cherche pas en
 * arrivant, on y pense quand on entend quelque chose qu'on ne nomme pas.
 * Une septieme entree la mettait au meme rang que les six sections, qui,
 * elles, portent du contenu.
 *
 * ELLE ENTRE PAR L'ATLAS, ou la question se pose. Un bouton large en haut de
 * /styles/ demande « Quel style joue la ? » et ouvre la meme page. Voir
 * ParcourirView.tsx.
 *
 * LA ROUTE RESTE VIVANTE, et c'est le point : #/reconnaitre et /reconnaitre/
 * repondent comme avant, les liens partages tiennent, l'historique local du
 * visiteur aussi, et `courantOf` reconnait toujours l'adresse pour que la
 * page s'allume quand on y est. Seule l'annonce a bouge. */

/* CE QUI APPARTIENT AU VISITEUR, apres le separateur : son panier, son
   compte. « A propos » a quitte la rangee en meme temps que les icones : a
   sept mots la ligne est pleine, et cette page se rejoint depuis le pied,
   ou elle a toujours ete. */
const PAGES: readonly { href: string; id: SiteCourant; label: string }[] = [
  { href: '#/panier', id: 'panier', label: t.lePanier },
  { href: '#/profil', id: 'profil', label: t.monProfil },
];

/* ═══ LE JEU N'EST PLUS DANS LE MENU ═══
 *
 * Il y a ete, en fin de rangee, avec cette particularite d'etre la seule
 * entree qui QUITTE l'application pour une autre page du meme site.
 *
 * Il en sort a la demande de Mika. Ce n'est pas une suppression : le jeu
 * vit toujours dans public/game/ et repond toujours a sonaa.ca/game/. Il
 * n'est simplement plus annonce depuis l'atlas, le temps que son graphisme
 * soit a la hauteur du reste du site. Remettre le lien tient en une ligne
 * ici et une dans le pied de page.
 *
 * Rien d'autre n'a bouge : `courantOf` ne l'a jamais reconnu, puisqu'une
 * adresse n'est pas une route, et le menu n'est de toute facon pas rendu
 * quand on est dans le jeu. */

/** Quelle porte du site une adresse ouvre. Exporte pour la barre du bas, qui
    doit allumer le meme onglet que ce menu : une seule lecture des adresses. */
export function courantDuSite(hash: string): SiteCourant {
  if (hash.startsWith('#/index')) return 'index';
  if (hash.startsWith('#/profil')) return 'profil';
  /* La page des credits allume « A propos », d'ou l'on y arrive. */
  if (hash.startsWith('#/credits')) return 'apropos';
  if (hash.startsWith('#/a-propos')) return 'apropos';
  if (hash.startsWith('#/propositions')) return 'propositions';
  if (hash.startsWith('#/moderation')) return 'moderation';
  if (hash.startsWith('#/chronologie')) return 'chronologie';
  if (hash.startsWith('#/heatmap')) return 'heatmap';
  if (hash.startsWith('#/arbre')) return 'arbre';
  if (hash.startsWith('#/calendrier')) return 'calendrier';
  if (hash.startsWith('#/news')) return 'news';
  if (hash.startsWith('#/mixtapes')) return 'mixtapes';
  if (hash.startsWith('#/sets')) return 'mixtapes';
  if (hash.startsWith('#/tracks')) return 'tracks';
  if (hash.startsWith('#/reconnaitre')) return 'reconnaitre';
  if (hash.startsWith('#/panier')) return 'panier';
  if (hash.startsWith('#/conditions')) return 'legal';
  if (hash.startsWith('#/confidentialite')) return 'legal';
  if (hash.startsWith('#/mentions')) return 'legal';
  if (hash.startsWith('#/parcourir')) return 'parcourir';
  if (hash.startsWith('#/carte')) return 'atlas';
  /* La racine est le Calendar, comme dans main.tsx : les deux doivent dire
     la meme chose, sinon le menu allume « Styles » sur la page d'accueil. */
  if (hash === '' || hash === '#') return 'calendrier';
  if (hash.startsWith('#/')) return 'parcourir';
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
  const courant = courantDuSite(hash);

  /* LE PANIER PORTE SON COMPTE, les autres non : c'est la seule porte dont
     l'etat change sans qu'on la traverse. */
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
        {item.id === 'panier' && <BadgePanier />}
      </a>
    );
  };

  return (
    <nav className={`sitenav sitenav-${variant}`} aria-label={t.navigationDuSite}>
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
      {/* LA LANGUE ET LE THEME ONT QUITTE CETTE RANGEE.
          Ils y etaient apres le separateur, ce qui etait juste sur le fond :
          ce sont des reglages, pas des destinations. Mais la rangee est celle
          des liens, et sur un ecran etroit ils tombaient a la ligne, seuls,
          sous le menu : deux reglages orphelins sur leur propre ligne, loin du
          seul autre reglage de la page, le compte. Ils sont maintenant a cote
          de lui, dans le coin haut droit. Voir AuthButton. */}
    </nav>
  );
}
