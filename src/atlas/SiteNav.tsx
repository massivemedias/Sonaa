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
import './site-nav.css';

type SiteCourant =
  | 'atlas'
  | 'parcourir'
  | 'sets'
  | 'chronologie'
  | 'heatmap'
  | 'arbre'
  | 'index'
  | 'apropos'
  | 'credits'
  | 'propositions'
  | 'moderation'
  | 'calendrier'
  | 'autre';

/* LE MENU NE PORTE PLUS QUE DEUX VUES.

   La carte en trois dimensions, la chronologie, la carte de chaleur et
   l'arbre en sont retires sur demande de Mika. Ils ne sont pas SUPPRIMES :
   leurs adresses repondent toujours, les fichiers sont intacts, et un lien
   suffit a les faire revenir. Ce qui change est ce que le site PROPOSE, et
   ce qu'il propose maintenant tient en une porte d'entree.

   POURQUOI CE N'EST PAS UNE PERTE : cinq facons de regarder le meme corpus
   demandaient de choisir avant de savoir, et le choix se payait sur
   telephone, ou le menu tenait trois lignes.

   L'INDEX SORT A SON TOUR. Il listait les 219 genres a plat, ce que Parcourir
   fait desormais mieux : par famille, avec un texte, une photo et les
   morceaux. Deux portes vers la meme piece, dont l'une est plus etroite.
   L'adresse #/index repond toujours, la page n'est pas supprimee. */
const VUES: readonly { href: string; id: SiteCourant; label: string }[] = [
  /* DEUX PORTES VERS LE MEME CORPUS, ET ELLES SE NOMMENT PAR CE QU'ON Y
     TROUVE. « Parcourir » decrivait un geste, pas une destination : on ne
     sait pas ce qu'on va parcourir avant d'avoir clique. « Styles » et
     « Artistes » disent l'un et l'autre ce qu'il y a derriere. */
  { href: '#/parcourir', id: 'parcourir', label: t.lesStyles },
  /* LES SETS SONT UNE DESTINATION, PAS UN REGLAGE DE COMPTE. On peut les
     ecouter sans compte et sans en deposer un seul : les cacher derriere le
     menu du profil les rendrait invisibles a exactement les gens a qui ils
     s'adressent. */
  /* « ARTISTES » NOMMAIT LES GENS, PAS CE QU'ON VIENT CHERCHER. Le jour ou
     ils seront cent, le mot decrira une liste de noms alors qu'on vient
     ecouter. « Sons » repond a « Styles » comme une porte repond a l'autre :
     d'un cote l'histoire des genres, de l'autre ce qui se depose aujourd'hui.
     La page garde ses artistes, en section nommee. */
  { href: '#/sets', id: 'sets', label: t.lesSons },
  /* LE CALENDRIER EST UNE VUE, PAS UNE PAGE. On y lit ce qui se joue, comme
     on lit les styles et les sons ailleurs : c'est la troisieme porte sur le
     meme sujet, et elle regarde vers ce soir plutot que vers 1988. */
  { href: '#/calendrier', id: 'calendrier', label: t.leCalendrier }
];

/* QUATRE ENTREES, PLUS CINQ. Le menu tient desormais sur la meme rangee que
   le logo et le titre d'une page : chaque mot de plus y coute directement.
   « Credits » est la page qu'on ouvre une fois ; elle se rejoint depuis
   « A propos », qui la nomme, et depuis le pied de page. Elle garde son
   adresse et ses sept sections. */
const PAGES: readonly { href: string; id: SiteCourant; label: string }[] = [
  { href: '#/a-propos', id: 'apropos', label: t.aPropos }
];

/* ═══ LE JEU N'EST PAS UNE ROUTE, C'EST UNE ADRESSE ═══
 *
 * SONAA Label Tycoon vit dans public/game/, en page a part : son propre
 * index.html, ses propres polices, son propre canevas plein ecran. Ce n'est
 * pas un caprice d'organisation, c'est ce qui lui permet d'exister sans
 * charger l'atlas, et a l'atlas d'exister sans charger un moteur de jeu.
 *
 * Le lien pointe donc sur « /game/ » et non sur un « #/ » : on QUITTE
 * l'application d'une page pour une autre page du meme site. Deux
 * consequences assumees.
 *
 * D'abord `courantOf` ne le reconnaitra jamais, et n'a pas a le faire : quand
 * on est dans le jeu, ce menu n'est pas rendu du tout.
 *
 * Ensuite il ne porte pas `target="_blank"`. Une nouvelle fenetre se justifie
 * quand on veut garder sa place ; ici on va jouer, on ne consulte pas une
 * reference a cote. Le bouton retour ramene a l'atlas, ce qui est le geste
 * attendu. */
const JEU = { href: '/game/', label: t.leJeu };

function courantOf(hash: string): SiteCourant {
  if (hash.startsWith('#/index')) return 'index';
  /* La page des credits allume « A propos », d'ou l'on y arrive. */
  if (hash.startsWith('#/credits')) return 'apropos';
  if (hash.startsWith('#/a-propos')) return 'apropos';
  if (hash.startsWith('#/propositions')) return 'propositions';
  if (hash.startsWith('#/moderation')) return 'moderation';
  if (hash.startsWith('#/chronologie')) return 'chronologie';
  if (hash.startsWith('#/heatmap')) return 'heatmap';
  if (hash.startsWith('#/arbre')) return 'arbre';
  if (hash.startsWith('#/calendrier')) return 'calendrier';
  if (hash.startsWith('#/sets')) return 'sets';
  if (hash.startsWith('#/parcourir')) return 'parcourir';
  if (hash.startsWith('#/carte')) return 'atlas';
  if (hash === '' || hash === '#' || hash.startsWith('#/')) return 'parcourir';
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
        {/* Le jeu ferme la rangee : c'est la seule entree qui quitte
            l'application, elle n'a rien a faire au milieu des autres. */}
        <a className="sitenav-lien" href={JEU.href}>
          {JEU.label}
        </a>
      </span>
    </nav>
  );
}
