/* LA BARRE DU BAS, SUR TELEPHONE SEULEMENT.
 *
 * ═══ POURQUOI EN BAS ═══
 *
 * Le menu du haut est a l'endroit que le pouce n'atteint pas. Sur un ecran
 * de 375 px, tenu d'une main, on navigue avec le bas de l'ecran : c'est ce
 * que SoundCloud, Instagram et toutes les applications de poche ont fini par
 * faire, et c'est ce que Mika a demande le 7 septembre 2026 en montrant
 * SoundCloud.
 *
 * ═══ CINQ ONGLETS, DES MOTS COURTS ═══
 *
 * Calendar, News, Styles, Sons, Profil. « A propos » sort de la barre : c'est
 * une page qu'on lit une fois, elle reste dans le pied de page. Cinq mots de
 * six lettres au plus tiennent sous cinq icones sur 375 px ; c'est la
 * limite, et News est arrive en dernier (Mika, 7 septembre 2026).
 *
 * ═══ ELLE REMPLACE LE MENU DU HAUT, ELLE NE S'Y AJOUTE PAS ═══
 *
 * Quand elle est la, le menu du haut disparait (voir barre-bas.css). Deux
 * navigations pour les memes quatre portes, c'est une de trop, et l'ecran
 * d'un telephone n'a pas la hauteur pour les deux.
 *
 * Elle n'est rendue que sur les pages qui defilent comme un document ou
 * comme Parcourir. Les vues plein ecran (la carte 3D, la chronologie, la
 * carte de chaleur, l'arbre) gardent leur propre chrome : elles ne sont plus
 * dans le menu, et une barre par-dessus une scene WebGL serait un corps
 * etranger.
 */

import { useEffect } from 'react';
import { FaIcon } from './FaIcon.tsx';
import {
  faCalendarDays,
  faNewspaper,
  faHeadphones,
  faCartShopping,
  faRecordVinyl,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import { courantDuSite } from './SiteNav.tsx';
import { BadgePanier } from '../marchand/BadgePanier.tsx';
import { t } from '../langue/langue.ts';
import { MARCHAND_ACTIF } from '../config.ts';
import './barre-bas.css';

/* La classe posee sur `body` quand la barre est rendue. C'est elle que les
   feuilles de style lisent pour cacher le menu du haut et reserver la place
   en bas ; le composant ne mesure rien, il DIT qu'il est la. */
export const CLASSE_AVEC_BARRE = 'avec-barre-bas';

export function BarreBas() {
  useEffect(() => {
    document.body.classList.add(CLASSE_AVEC_BARRE);
    return () => document.body.classList.remove(CLASSE_AVEC_BARRE);
  }, []);

  const courant = courantDuSite(window.location.hash);

  /* CINQ ONGLETS AU MAXIMUM, ET PAS SIX. Au-dela, chaque onglet descend sous
     la largeur d'un pouce sur un telephone etroit, et les libelles se
     coupent.

     ═══ STYLES REVIENT QUAND LA COUCHE MARCHANDE SE TAIT ═══

     Styles et Profil etaient sortis de la barre le 17 septembre 2026 pour
     faire place a Tracks et au Panier, et ADR-084 l'avait ecrit comme une
     contrepartie assumee, en disant que la decision se rouvrirait si les
     visites de Styles s'effondraient sur telephone.

     Elle se rouvre plus tot, et pour une autre raison : Tracks et le Panier
     ne s'annoncent plus tant que rien ne se vend (voir src/config.ts), donc
     la place qu'ils occupaient est libre et la contrepartie n'a plus d'objet.
     Styles reprend la sienne. C'est la section qui porte les 219 genres et
     presque tout le referencement ; la laisser dans le bouton « Plus » alors
     que la barre a de la place serait garder le prix apres avoir rendu
     l'achat.

     QUATRE ONGLETS ET NON CINQ, ET « PLUS » N'ENTRE PAS DANS LA BARRE. Il vit
     deja dans l'en-tete sur telephone : deux portes vers le meme menu, a deux
     endroits de l'ecran, se cherchent au lieu de se trouver. Quatre onglets
     sont aussi plus larges que cinq, donc plus faciles a viser. */
  const onglets = MARCHAND_ACTIF
    ? ([
        { href: '#/calendrier', id: 'calendrier', label: t.leCalendrier, icone: faCalendarDays },
        { href: '#/tracks', id: 'tracks', label: t.lesTracks, icone: faRecordVinyl },
        { href: '#/mixtapes', id: 'mixtapes', label: t.lesMixtapes, icone: faHeadphones },
        { href: '#/news', id: 'news', label: t.leNews, icone: faNewspaper },
        { href: '#/panier', id: 'panier', label: t.lePanier, icone: faCartShopping },
      ] as const)
    : ([
        { href: '#/calendrier', id: 'calendrier', label: t.leCalendrier, icone: faCalendarDays },
        { href: '#/parcourir', id: 'parcourir', label: t.lesStyles, icone: faLayerGroup },
        { href: '#/mixtapes', id: 'mixtapes', label: t.lesMixtapes, icone: faHeadphones },
        { href: '#/news', id: 'news', label: t.leNews, icone: faNewspaper },
      ] as const);

  return (
    <nav className="barre-bas" aria-label={t.navigationDuSite}>
      {onglets.map((o) => {
        const actif = o.id === courant;
        return (
          <a
            key={o.id}
            href={o.href}
            className="barre-bas-onglet"
            aria-current={actif ? 'page' : undefined}
          >
            <span className="barre-bas-pastille">
              <FaIcon icon={o.icone} className="barre-bas-icone" />
              {MARCHAND_ACTIF && o.id === 'panier' && <BadgePanier />}
            </span>
            <span>{o.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
