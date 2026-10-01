/* LE BOUTON « QUELLE EST CETTE TRACK QUI JOUE ? »
 *
 * Mika, le 30 septembre 2026 : « le bouton est mal fait, je voudrais quelque
 * chose de plus attrayant », qui « se dissocie du reste pour attirer le
 * regard » sans sortir du dessin du site. C'est le seul objet du site qui
 * ECOUTE, et il le dit en trois signes : un micro dans une pastille qui
 * respire, la question en clair avec ce qu'on obtient dessous, et un petit
 * egaliseur qui bouge, le meme dessin que le favicon.
 *
 * UN SEUL BOUTON, DEUX FORMES. Sur l'accueil c'est un bouton : la
 * reconnaissance s'ouvre en dessous, dans la page. Sur Styles c'est un lien
 * vers #/reconnaitre/ecouter, qui lance l'ecoute en arrivant. Le dessin est
 * le meme ; seul l'element change, pour que le clavier et le clic du milieu
 * fassent ce qu'on attend de chacun. */

import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from '../atlas/FaIcon.tsx';
import { t } from '../langue/langue.ts';
import './bouton-track.css';

function Contenu() {
  return (
    <>
      <span className="bt-micro" aria-hidden="true">
        <FaIcon icon={faMicrophone} className="bt-micro-icone" />
      </span>
      <span className="bt-mots">
        <span className="bt-titre">{t.quelleTrack}</span>
        <span className="bt-sous">{t.quelleTrackSous}</span>
      </span>
      <span className="bt-egaliseur" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </>
  );
}

type Props =
  | { readonly href: string; readonly onClick?: undefined; readonly ouvert?: undefined }
  | { readonly href?: undefined; readonly onClick: () => void; readonly ouvert: boolean };

export function BoutonTrack(props: Props) {
  if (props.href !== undefined) {
    return (
      <a className="bt" href={props.href}>
        <Contenu />
      </a>
    );
  }
  return (
    <button type="button" className="bt" aria-expanded={props.ouvert} onClick={props.onClick}>
      <Contenu />
    </button>
  );
}
