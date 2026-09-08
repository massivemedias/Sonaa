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
  faLayerGroup,
  faHeadphones,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { courantDuSite } from './SiteNav.tsx';
import { t } from '../langue/langue.ts';
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

  const onglets = [
    { href: '#/calendrier', id: 'calendrier', label: t.leCalendrier, icone: faCalendarDays },
    { href: '#/news', id: 'news', label: t.leNews, icone: faNewspaper },
    { href: '#/parcourir', id: 'parcourir', label: t.lesStyles, icone: faLayerGroup },
    { href: '#/sets', id: 'sets', label: t.lesSons, icone: faHeadphones },
    { href: '#/profil', id: 'profil', label: t.profilCourt, icone: faUser },
  ] as const;

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
            <FaIcon icon={o.icone} className="barre-bas-icone" />
            <span>{o.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
