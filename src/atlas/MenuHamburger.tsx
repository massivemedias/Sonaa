/* MENU HAMBURGER MOBILE, INSPIRE DE MAUDITEMACHINE.COM.
 *
 * Sur telephone (sous 900 px), le bouton hamburger a trois barres dans
 * l'en-tete se transforme en croix a l'ouverture et deploie vers le bas,
 * sous la barre de 56 px, un panneau plein ecran numerote (01 a 07) qui
 * rassemble toutes les portes de SONAA d'un seul coup d'oeil :
 * Calendrier, Styles, Labels, Atlas, Mixtapes, News, Track ID, ainsi que
 * l'espace membre, la recherche, le selecteur de langue et les pages legales.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  faArrowRight,
  faCircleInfo,
  faMagnifyingGlass,
  faMicrophone,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { ChoixLangue } from './ChoixLangue.tsx';
import { courantDuSite } from './SiteNav.tsx';
import { EVENEMENT_RECHERCHE } from './RechercheGlobale.tsx';
import { ADRESSE_ECOUTER } from '../reconnaitre/adresses.ts';
import { MARCHAND_ACTIF } from '../config.ts';
import { t } from '../langue/langue.ts';
import './menu-hamburger.css';

export const EVENEMENT_BASCULER_MENU = 'sonaa:basculer-menu';

export function MenuHamburger() {
  const [ouvert, setOuvert] = useState(false);
  const boutonRef = useRef<HTMLButtonElement | null>(null);
  const courant = courantDuSite(window.location.hash);

  const fermer = useCallback((rendreFocus = false): void => {
    setOuvert(false);
    if (rendreFocus) boutonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const basculer = (): void => setOuvert((v) => !v);
    window.addEventListener(EVENEMENT_BASCULER_MENU, basculer);
    return () => window.removeEventListener(EVENEMENT_BASCULER_MENU, basculer);
  }, []);

  useEffect(() => {
    if (!ouvert) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const surTouche = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fermer(true);
      }
    };
    const surHash = (): void => setOuvert(false);
    window.addEventListener('keydown', surTouche, true);
    window.addEventListener('hashchange', surHash);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', surTouche, true);
      window.removeEventListener('hashchange', surHash);
    };
  }, [ouvert, fermer]);

  const pagesPrincipales: readonly { id: string; label: string; href: string }[] = [
    { id: 'calendrier', label: t.leCalendrier, href: '#/calendrier' },
    { id: 'parcourir', label: t.lesStyles, href: '#/parcourir' },
    { id: 'labels', label: t.navLabels, href: '#/labels' },
    { id: 'clubs', label: t.clubsMenu, href: '#/clubs' },
    { id: 'mixtapes', label: t.lesMixtapes, href: '#/mixtapes' },
    ...(MARCHAND_ACTIF ? [{ id: 'tracks', label: t.lesTracks, href: '#/tracks' }] : []),
    { id: 'news', label: t.leNews, href: '#/news' },
    { id: 'reconnaitre', label: t.trackId, href: ADRESSE_ECOUTER },
  ];

  const pastilles: readonly {
    id: string;
    label: string;
    href?: string;
    icone: typeof faUser;
    action?: () => void;
  }[] = [
    { id: 'profil', label: t.monProfil, href: '#/profil', icone: faUser },
    { id: 'apropos', label: t.aPropos, href: '#/a-propos', icone: faCircleInfo },
    {
      id: 'recherche',
      label: t.menuRechercher,
      icone: faMagnifyingGlass,
      action: () => {
        setOuvert(false);
        window.dispatchEvent(new Event(EVENEMENT_RECHERCHE));
      },
    },
  ];

  const liensLegaux: readonly { href: string; label: string }[] = [
    { href: '#/conditions', label: t.conditionsTitre },
    { href: '#/confidentialite', label: t.confidentialiteTitre },
    { href: '#/mentions', label: t.mentionsTitre },
  ];

  const n = pagesPrincipales.length;

  return (
    <>
      <button
        ref={boutonRef}
        id="sonaa-burger-top"
        type="button"
        className="authb-bouton sonaa-burger"
        data-open={ouvert ? '1' : '0'}
        aria-expanded={ouvert}
        aria-controls="sonaa-mmenu"
        aria-label={ouvert ? t.menuHamburgerFermer : t.menuHamburgerOuvrir}
        onClick={() => setOuvert((v) => !v)}
      >
        <span className="sonaa-burger-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {ouvert &&
        typeof document !== 'undefined' &&
        createPortal(
          <nav
            id="sonaa-mmenu"
            className="sonaa-mmenu"
            aria-label={t.navigationDuSite}
          >
            <div className="sonaa-mm-top">
              <ChoixLangue />
              <a
                href={ADRESSE_ECOUTER}
                className="sonaa-mm-track-cta"
                onClick={() => setOuvert(false)}
              >
                <FaIcon icon={faMicrophone} className="sonaa-mm-track-icone" />
                <span>{t.trackId}</span>
              </a>
            </div>

            <ol className="sonaa-mm-pages">
              {pagesPrincipales.map((p, i) => {
                const actif = p.id === courant;
                return (
                  <li key={p.id} style={{ '--i': i + 1 } as CSSProperties}>
                    <a
                      href={p.href}
                      className="sonaa-mm-page"
                      data-active={actif ? '1' : '0'}
                      aria-current={actif ? 'page' : undefined}
                      onClick={() => setOuvert(false)}
                    >
                      <span className="sonaa-mm-num" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="sonaa-mm-label">{p.label}</span>
                      <FaIcon icon={faArrowRight} className="sonaa-mm-go" />
                    </a>
                  </li>
                );
              })}
            </ol>

            <div className="sonaa-mm-hood" style={{ '--i': n + 1 } as CSSProperties}>
              <p className="sonaa-mm-kicker">{t.menuSectionEspace}</p>
              <ul className="sonaa-mm-pills">
                {pastilles.map((item) => {
                  const actif = item.id === courant;
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="sonaa-mm-pill"
                          data-active={actif ? '1' : '0'}
                          aria-current={actif ? 'page' : undefined}
                          onClick={() => setOuvert(false)}
                        >
                          <FaIcon icon={item.icone} className="sonaa-mm-pill-icone" />
                          <span>{item.label}</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="sonaa-mm-pill"
                          onClick={item.action}
                        >
                          <FaIcon icon={item.icone} className="sonaa-mm-pill-icone" />
                          <span>{item.label}</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="sonaa-mm-foot" style={{ '--i': n + 2 } as CSSProperties}>
              <p className="sonaa-mm-kicker">{t.menuSectionLegal}</p>
              <div className="sonaa-mm-legal">
                {liensLegaux.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="sonaa-mm-legal-lien"
                    aria-current={window.location.hash.startsWith(l.href.slice(1)) ? 'page' : undefined}
                    onClick={() => setOuvert(false)}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </nav>,
          document.body
        )}
    </>
  );
}
