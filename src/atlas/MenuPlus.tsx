/* LE CINQUIEME ONGLET DE LA BARRE DU BAS : « Plus ».
 *
 * ═══ IL A VECU DANS L'EN-TETE, ET IL S'Y COGNAIT ═══
 *
 * Il etait pose dans la pilule du haut, a cote du logo. Mesure sur un ecran
 * de 375 px le 22 septembre 2026 : le bouton occupait 96 a 156 px, et les
 * controles fixes, loupe, langue, theme et compte, commencaient a 154. Ils se
 * recouvraient, sur toutes les pages document. La pilule n'a pas la largeur
 * pour les deux, et lui en donner aurait fait un en-tete sur deux rangees.
 *
 * ═══ IL MANQUAIT AUSSI A L'ATLAS ═══
 *
 * L'atlas dessine son propre en-tete et n'a jamais rendu ce bouton : sur
 * telephone, /styles/ n'avait donc aucun acces au profil ni aux pages
 * legales. En descendant dans la barre, qui est rendue sur toutes les pages
 * qui defilent, il repare ce trou par la meme occasion.
 *
 * ═══ POURQUOI LA BARRE ET PAS UNE DEUXIEME RANGEE ═══
 *
 * La barre du bas est a portee du pouce, l'en-tete non, et c'est la raison
 * pour laquelle la navigation y vit deja. Le reproche qu'on lui faisait,
 * deux portes vers le meme menu a deux endroits de l'ecran, tombe : il n'y
 * a plus qu'une porte, et elle est en bas.
 *
 * Le panneau s'ouvre donc VERS LE HAUT. Voir menu-plus.css. */


import { useEffect, useRef, useState } from 'react';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { t } from '../langue/langue.ts';
import { MARCHAND_ACTIF } from '../config.ts';
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
    /* STYLES N'EST ICI QUE QUAND LA BARRE DU BAS N'A PLUS DE PLACE POUR LUI.
       Il y avait ete range le 17 septembre 2026, chasse de la barre par
       Tracks et le Panier. Tant que ces deux-la ne s'annoncent pas, il est
       revenu dans la barre, et le redire ici ferait deux portes vers la meme
       page a deux endroits du meme ecran. Voir BarreBas.tsx et
       src/config.ts. */
    ...(MARCHAND_ACTIF ? [{ href: '#/parcourir', label: t.lesStyles, id: 'parcourir' }] : []),
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
      {/* LA MEME FORME QUE LES QUATRE AUTRES ONGLETS : une icone dans sa
          pastille, un mot dessous. Un cinquieme onglet qui ne ressemblerait
          pas aux autres se lirait comme un intrus. */}
      <button
        type="button"
        className="menu-plus-bouton"
        aria-expanded={ouvert}
        aria-label={ouvert ? t.fermerLeMenu : t.plusDeLiens}
        onClick={() => setOuvert((v) => !v)}
      >
        <span className="barre-bas-pastille">
          <FaIcon icon={faEllipsis} className="barre-bas-icone" />
        </span>
        <span>{t.plusDeLiens}</span>
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
