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

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { FaIcon } from './FaIcon.tsx';
import { faPlay, faPause, faXmark, faBackwardStep, faForwardStep } from '@fortawesome/free-solid-svg-icons';
import { arreterLeSet, basculerLeSet, chercherDansLeSet, useLectureSet } from '../lib/lecture-set.ts';
import { mmss, urlAvatar, urlPochette } from '../lib/sets.ts';
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

/* ═══ LE FILET SE TIRE ═══

   Mika, le 30 septembre 2026 : « rends le filet de progression cliquable ».
   La barre de lecture de Parcourir, partie le meme jour, etait la seule a
   permettre d'avancer dans un morceau ; le filet du mini lecteur le permet
   maintenant, pour un morceau de style comme pour une mixtape.

   LE TRAIT RESTE FIN, LA CIBLE NE L'EST PAS : deux pixels a l'ecran, vingt-
   quatre sous le doigt, par une zone invisible qui deborde de part et
   d'autre. On clique, ou on tire : pendant qu'on tire, le filet montre la
   position visee, et le lecteur n'y saute qu'au lacher, une fois. Au
   clavier, les fleches reculent ou avancent de dix secondes, Debut et Fin
   vont aux deux bouts. */
const SAUT = 10;

function Filet({
  position,
  duree,
  chercher,
  libelle,
}: {
  readonly position: number;
  readonly duree: number;
  readonly chercher: (secondes: number) => void;
  readonly libelle: string;
}) {
  const boite = useRef<HTMLDivElement | null>(null);
  const [tire, setTire] = useState<number | null>(null);
  const montre = tire ?? position;
  const avancee = duree > 0 ? Math.min(1, Math.max(0, montre / duree)) : 0;

  const versSecondes = (x: number): number => {
    const r = boite.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return 0;
    return Math.min(1, Math.max(0, (x - r.left) / r.width)) * duree;
  };
  const appuyer = (e: PointerEvent<HTMLDivElement>) => {
    if (duree <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTire(versSecondes(e.clientX));
  };
  const bouger = (e: PointerEvent<HTMLDivElement>) => {
    if (tire !== null) setTire(versSecondes(e.clientX));
  };
  const lacher = (e: PointerEvent<HTMLDivElement>) => {
    if (tire === null) return;
    chercher(versSecondes(e.clientX));
    setTire(null);
  };
  /* LES FLECHES S'ARRETENT ICI : la vue des styles ecoute aussi les fleches,
     sur toute la fenetre, et le saut se ferait deux fois. */
  const touche = (e: KeyboardEvent<HTMLDivElement>) => {
    if (duree <= 0) return;
    const cible =
      e.key === 'ArrowLeft' ? position - SAUT
        : e.key === 'ArrowRight' ? position + SAUT
          : e.key === 'Home' ? 0
            : e.key === 'End' ? duree - 1
              : null;
    if (cible === null) return;
    e.preventDefault();
    e.stopPropagation();
    chercher(Math.min(Math.max(0, cible), duree));
  };

  return (
    <div
      ref={boite}
      className="mini-filet"
      role="slider"
      tabIndex={0}
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={Math.round(duree)}
      aria-valuenow={Math.round(montre)}
      aria-valuetext={`${mmss(montre)} / ${mmss(duree)}`}
      data-tire={tire !== null}
      onPointerDown={appuyer}
      onPointerMove={bouger}
      onPointerUp={lacher}
      onPointerCancel={() => setTire(null)}
      onKeyDown={touche}
    >
      <span className="mini-filet-fait" style={{ width: `${avancee * 100}%` }} />
      <span className="mini-filet-poignee" style={{ left: `${avancee * 100}%` }} />
    </div>
  );
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
    const chemin = cheminDuGenre(genre.lecture.listeId);
    return (
      <div className="mini" role="region" aria-label={t.lectureEnCours} data-joue={joue}>
        <Filet
          position={genre.lecture.position}
          duree={genre.lecture.duree}
          chercher={genre.chercher}
          libelle={t.positionDansLeMorceau}
        />
        <a className="mini-pochette" href={chemin} aria-hidden="true" tabIndex={-1}>
          {piste.cover ? <img src={piste.cover} alt="" /> : <span className="mini-pochette-vide" />}
        </a>
        <a className="mini-texte" href={chemin}>
          <strong>{piste.title}</strong>
          {/* L'ETAT EN TOUTES LETTRES quand ce n'est pas la lecture. La barre
              de Parcourir le disait, et elle est partie le 30 septembre 2026 :
              un morceau qui n'a pas obtenu le son doit le montrer ici. */}
          <span>
            {genre.lecture.etat === 'chargement'
              ? t.chargement
              : genre.lecture.etat === 'bloque'
                ? t.appuyezEncoreCourt
                : genre.lecture.etat === 'erreur'
                  ? t.pisteIllisible
                  : piste.artist}
          </span>
        </a>
        {/* PRECEDENT ET SUIVANT, depuis que ce lecteur est le seul : la liste
            du style s'enchaine toute seule, et ces deux boutons permettent
            d'y passer un morceau. */}
        <button type="button" className="mini-pas" onClick={() => genre.deplacer(-1)} aria-label={t.morceauPrecedent}>
          <FaIcon icon={faBackwardStep} />
        </button>
        <button type="button" className="mini-bouton" onClick={genre.basculer} aria-label={joue ? t.pause : t.ecouter}>
          <FaIcon icon={joue ? faPause : faPlay} />
        </button>
        <button type="button" className="mini-pas" onClick={() => genre.deplacer(1)} aria-label={t.morceauSuivant}>
          <FaIcon icon={faForwardStep} />
        </button>
        <button type="button" className="mini-fermer" onClick={genre.arreter} aria-label={t.fermerLecteur}>
          <FaIcon icon={faXmark} />
        </button>
      </div>
    );
  }

  if (!set) return null;

  const image = urlPochette(set.cover_path) ?? urlAvatar(set.artiste_avatar);

  return (
    <div className="mini" role="region" aria-label={t.lectureEnCours} data-joue={lecture.joue}>
      <Filet position={lecture.position} duree={lecture.duree} chercher={chercherDansLeSet} libelle={t.avancerDansLaMixtape} />
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
