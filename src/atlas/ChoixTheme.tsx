/* LE SELECTEUR DE THEME : un bouton, deux etats, aucune ambiguite.
 *
 * ═══ IL NOMME LE THEME QU'IL DONNE, PAS CELUI OU L'ON EST ═══
 *
 * C'est l'inverse du selecteur de langue voisin, et la difference est
 * deliberee. La langue a deux valeurs egales, qu'on montre cote a cote. Le
 * theme est une bascule : montrer les deux prendrait la place de deux
 * boutons pour une decision binaire, dans une barre ou chaque mot coute.
 *
 * Un seul bouton, donc, et il porte le SOLEIL quand on est dans le sombre :
 * l'icone annonce ou l'on va. C'est la convention que suivent les systemes,
 * et l'etiquette lue par les lecteurs d'ecran la dit en toutes lettres,
 * puisqu'une icone seule ne se lit pas.
 */

import { useState } from 'react';
import { appliquerTheme, choisirTheme, themeActuel, type Theme } from '../lib/theme.ts';
import { t } from '../langue/langue.ts';
import './choix-theme.css';

/* Deux dessins, poses ici et non dans un fichier d'images : ils font quarante
   octets chacun, ils heritent de la couleur du texte, et une requete reseau
   pour deux traits serait une requete de trop. */
function Soleil() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="3.1" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6" />
        <path d="M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" />
      </g>
    </svg>
  );
}

function Lune() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M13.4 10.1A5.9 5.9 0 0 1 5.9 2.6a5.9 5.9 0 1 0 7.5 7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChoixTheme() {
  const [theme, setTheme] = useState<Theme>(() => themeActuel());

  const basculer = (): void => {
    const voulu: Theme = theme === 'clair' ? 'sombre' : 'clair';
    choisirTheme(voulu);
    setTheme(voulu);
  };

  /* L'ATTRIBUT EST DEJA POSE PAR index.html AVANT LA PREMIERE PEINTURE. On le
     repose ici au montage pour le seul cas ou le fragment n'aurait pas tourne,
     par exemple si un bloqueur a mange le script en ligne : mieux vaut un
     theme correct arrive tard qu'un theme faux garde toute la visite. */
  if (typeof document !== 'undefined') appliquerTheme(theme);

  const libelle = theme === 'clair' ? t.passerAuSombre : t.passerAuClair;

  return (
    <button
      type="button"
      className="choixtheme"
      onClick={basculer}
      title={libelle}
      aria-label={libelle}
    >
      {theme === 'clair' ? <Lune /> : <Soleil />}
    </button>
  );
}
