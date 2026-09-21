/* LE MENU « PLUS », SUR TELEPHONE SEULEMENT.
 *
 * La barre du bas ne tient que cinq onglets, et la couche marchande en
 * demande deux de plus. Le rapport d'inspection du 17 septembre 2026 l'a dit
 * clairement : sortir Styles et Profil de la barre du bas n'est pas anodin,
 * parce que sous 900 px la barre du bas REMPLACE le menu du haut. Ce qui en
 * sort n'est plus atteignable nulle part.
 *
 * Ce bouton est la reponse. Il vit dans l'en-tete, a cote du logo, il ne
 * s'affiche que sous 900 px, et il porte tout ce que la barre du bas ne peut
 * plus porter : les styles, le profil, a propos, et les trois pages legales,
 * qui doivent etre joignables depuis n'importe quelle page.
 *
 * IL SE FERME QUAND ON CLIQUE AILLEURS ET A LA TOUCHE ECHAP, comme tous les
 * panneaux du site. Un menu qui reste ouvert derriere la page suivante est un
 * menu qu'on a oublie de fermer. */

import { useEffect, useRef, useState } from 'react';
import { t } from '../langue/langue.ts';
import { courantDuSite } from './SiteNav.tsx';
import './menu-plus.css';

export function MenuPlus() {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const courant = courantDuSite(window.location.hash);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent): void => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOuvert(false);
    };
    const fermer = (): void => setOuvert(false);
    document.addEventListener('mousedown', dehors);
    window.addEventListener('keydown', touche);
    window.addEventListener('hashchange', fermer);
    return () => {
      document.removeEventListener('mousedown', dehors);
      window.removeEventListener('keydown', touche);
      window.removeEventListener('hashchange', fermer);
    };
  }, [ouvert]);

  const liens: readonly { href: string; label: string; id?: string }[] = [
    { href: '#/parcourir', label: t.lesStyles, id: 'parcourir' },
    /* LA RECONNAISSANCE SORT D'ICI AUSSI, le 21 septembre 2026, et pour la
       meme raison que de la rangee du bureau : elle entre par le bouton en
       haut de l'atlas, pas par une liste de portes. Voir SiteNav.tsx. */
    { href: '#/profil', label: t.monProfil, id: 'profil' },
    { href: '#/a-propos', label: t.aPropos, id: 'apropos' },
  ];

  const legal: readonly { href: string; label: string }[] = [
    { href: '#/conditions', label: t.conditionsTitre },
    { href: '#/confidentialite', label: t.confidentialiteTitre },
    { href: '#/mentions', label: t.mentionsTitre },
  ];

  return (
    <div className="menu-plus" ref={boite}>
      <button
        type="button"
        className="menu-plus-bouton"
        aria-expanded={ouvert}
        aria-label={ouvert ? t.fermerLeMenu : t.plusDeLiens}
        onClick={() => setOuvert((v) => !v)}
      >
        {t.plusDeLiens}
      </button>
      {ouvert && (
        <nav className="menu-plus-panneau" aria-label={t.plusDeLiens}>
          {liens.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="menu-plus-lien"
              aria-current={l.id === courant ? 'page' : undefined}
              onClick={() => setOuvert(false)}
            >
              {l.label}
            </a>
          ))}
          <span className="menu-plus-filet" aria-hidden="true" />
          {legal.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="menu-plus-lien"
              aria-current={window.location.hash.startsWith(l.href.slice(1)) ? 'page' : undefined}
              onClick={() => setOuvert(false)}
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
