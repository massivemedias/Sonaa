/* LA BARRE D'ECOUTE, EN BAS, TANT QU'UN SET EST CHARGE.
 *
 * Elle est le visage du lecteur unique de lib/lecture-set.ts : pochette,
 * titre, artiste, un bouton, un filet de progression. Elle vit hors des
 * routes, dans App, et c'est pour cela qu'on peut lancer un set, aller lire
 * le calendrier, et l'entendre encore.
 *
 * Elle se pose AU-DESSUS de la barre du bas sur telephone, et au bas de
 * l'ecran ailleurs. Le titre mene a la page du set, ou vit le grand lecteur
 * avec sa forme d'onde : cette barre ne cherche pas a tout faire, elle tient
 * le son et rend le chemin.
 */

import { useEffect } from 'react';
import { FaIcon } from './FaIcon.tsx';
import { faPlay, faPause, faXmark } from '@fortawesome/free-solid-svg-icons';
import { arreterLeSet, basculerLeSet, useLectureSet } from '../lib/lecture-set.ts';
import { urlAvatar, urlPochette } from '../lib/sets.ts';
import { useLecteurPartage } from '../lecture/LecteurContexte.tsx';
import { FAMILIES, STRUCTURES } from './structures.ts';
import { t } from '../langue/langue.ts';
import './mini-lecteur.css';

/* Meme mecanisme que la barre du bas : le corps de page porte une classe
   tant que la barre est la, et la feuille de style reserve la place. */
export const CLASSE_AVEC_MINI = 'avec-mini-lecteur';

/* L'ADRESSE DE LA PAGE DU GENRE, depuis l'identifiant de sa liste. */
function cheminDuGenre(id: string | null): string {
  if (!id) return '#/parcourir';
  for (let fi = 0; fi < FAMILIES.length; fi += 1) {
    const gl = STRUCTURES[fi]?.genres.findIndex((g) => g.id === id) ?? -1;
    if (gl >= 0) return `#/parcourir/${fi}/${gl}`;
  }
  return '#/parcourir';
}

export function MiniLecteur() {
  const lecture = useLectureSet();
  const set = lecture.set;
  const genre = useLecteurPartage();
  const piste = set ? null : genre.pisteCourante;
  const visible = Boolean(set) || Boolean(piste);

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add(CLASSE_AVEC_MINI);
    return () => document.body.classList.remove(CLASSE_AVEC_MINI);
  }, [visible]);

  /* LE MORCEAU D'UN GENRE, HORS DE SA PAGE. Mika, le 23 septembre 2026 : la
     navigation ne coupe plus la lecture, donc il faut pouvoir la voir et
     l'arreter d'ailleurs. Meme barre que pour un set, meme geste. */
  if (piste) {
    const joue = genre.lecture.etat === 'joue' || genre.lecture.etat === 'chargement';
    const avancee = genre.lecture.duree > 0 ? Math.min(1, genre.lecture.position / genre.lecture.duree) : 0;
    const chemin = cheminDuGenre(genre.lecture.listeId);
    return (
      <div className="mini" role="region" aria-label={t.lectureEnCours}>
        <div className="mini-filet" aria-hidden="true">
          <span style={{ width: `${avancee * 100}%` }} />
        </div>
        <a className="mini-pochette" href={chemin} aria-hidden="true" tabIndex={-1}>
          {piste.cover ? <img src={piste.cover} alt="" /> : <span className="mini-pochette-vide" />}
        </a>
        <a className="mini-texte" href={chemin}>
          <strong>{piste.title}</strong>
          <span>{piste.artist}</span>
        </a>
        <button type="button" className="mini-bouton" onClick={genre.basculer} aria-label={joue ? t.pause : t.ecouter}>
          <FaIcon icon={joue ? faPause : faPlay} />
        </button>
        <button type="button" className="mini-fermer" onClick={genre.arreter} aria-label={t.fermerLecteur}>
          <FaIcon icon={faXmark} />
        </button>
      </div>
    );
  }

  if (!set) return null;

  const image = urlPochette(set.cover_path) ?? urlAvatar(set.artiste_avatar);
  const avancee = lecture.duree > 0 ? Math.min(1, lecture.position / lecture.duree) : 0;

  return (
    <div className="mini" role="region" aria-label={t.lectureEnCours}>
      <div className="mini-filet" aria-hidden="true">
        <span style={{ width: `${avancee * 100}%` }} />
      </div>
      <a className="mini-pochette" href={`#/mixtapes/${set.id}`} aria-hidden="true" tabIndex={-1}>
        {image ? <img src={image} alt="" /> : <span className="mini-pochette-vide" />}
      </a>
      <a className="mini-texte" href={`#/mixtapes/${set.id}`}>
        <strong>{set.titre}</strong>
        <span>{set.artiste_nom ?? t.artisteSansNom}</span>
      </a>
      <button
        type="button"
        className="mini-bouton"
        onClick={basculerLeSet}
        aria-label={lecture.joue ? t.pause : t.ecouter}
      >
        <FaIcon icon={lecture.joue ? faPause : faPlay} />
      </button>
      <button
        type="button"
        className="mini-fermer"
        onClick={arreterLeSet}
        aria-label={t.fermerLecteur}
      >
        <FaIcon icon={faXmark} />
      </button>
    </div>
  );
}
