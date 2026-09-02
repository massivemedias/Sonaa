/* L'EN-TETE DES PAGES DOCUMENT, CALQUE SUR CELUI DE PARCOURIR.

   Les deux mondes du site n'avaient pas la meme tete. Parcourir portait une
   barre : logo, menu, filet en bas, fond plus sombre que la page. Les pages
   de sons et de texte portaient le menu nu, sans logo et sans barre. On
   changeait de site en changeant de page, et c'est ce que Mika a vu.

   POURQUOI IL EST HORS DE `main` ET NON DEDANS. La barre doit couvrir toute
   la largeur de l'ecran pendant que son CONTENU s'aligne sur la colonne du
   texte. Dans `main`, qui est centre et borne, elle se serait arretee a la
   colonne ; il aurait fallu la faire deborder avec des marges negatives en
   `100vw`, ce qui compte la barre de defilement et cree un debordement
   horizontal. Posee a cote, elle est pleine largeur sans calcul, et c'est son
   retrait interieur qui aligne le contenu, avec la meme formule que
   Parcourir. */

import { SiteNav } from './SiteNav.tsx';
import { t } from '../langue/langue.ts';
import './entete.css';

export function EnTeteSite() {
  return (
    <header className="entete-site">
      <a className="entete-logo" href="#/parcourir" aria-label={t.retourAtlas}>
        <img
          src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`}
          alt="SONAA"
          draggable={false}
        />
      </a>
      <SiteNav variant="overlay" />
    </header>
  );
}
