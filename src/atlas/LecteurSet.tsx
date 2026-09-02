/* LE LECTEUR D'UN SET : un bouton, une forme d'onde, et rien d'autre.

   ═══ POURQUOI CE LECTEUR N'EST PAS CELUI DES MORCEAUX ═══

   Le site a deja un lecteur, dans lecture/useLecteur.ts. Il pilote une iframe
   YouTube, avec ses etats a lui, son delai de chargement, son verrou
   d'autoplay. Un set depose ici est un fichier que le navigateur sait lire
   nativement : le passer par la meme machinerie serait ajouter des pannes
   possibles sans rien gagner.

   Les deux ne se marchent pas dessus : le routeur de main.tsx est exclusif,
   la vue Parcourir et sa balise YouTube sont demontees quand on est sur
   #/sets. Il n'y a donc jamais deux sons a la fois, et cela ne tient pas a
   une precaution mais a la structure des routes.

   ═══ LA FORME D'ONDE NE TELECHARGE RIEN ═══

   Elle est dessinee a partir des 800 valeurs calculees au depot et stockees
   dans la ligne du set, soit environ 1,1 ko. Une liste de dix sets affiche
   donc dix formes d'onde pour 11 ko, la ou lire les fichiers pour les
   dessiner aurait coute 500 Mo, c'est-a-dire un dixieme du quota de sortie
   MENSUEL du plan gratuit pour une page qu'on regarde sans rien ecouter. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaIcon } from './FaIcon.tsx';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import { compterEcoute, lireOnde, mmss, urlAudio, type SetDJ } from '../lib/sets.ts';
import { t } from '../langue/langue.ts';

/* Barres serrees, comme demande : 2 px de barre, 1 px d'ecart. A 800 barres
   cela fait 2400 px de dessin ideal, ramene a la largeur reelle par le
   sous-echantillonnage ci-dessous. */
const LARGEUR_BARRE = 2;
const ECART = 1;

interface Props {
  readonly set: SetDJ;
  /** Le grand lecteur de la page d'un set, ou la version compacte des listes. */
  readonly compact?: boolean;
}

export function LecteurSet({ set, compact = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toileRef = useRef<HTMLCanvasElement | null>(null);
  const [joue, setJoue] = useState(false);
  const [position, setPosition] = useState(0);
  const [duree, setDuree] = useState(set.duree_s ?? 0);
  const [survol, setSurvol] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const compte = useRef(false);

  const onde = useRef<Uint8Array | null>(null);
  if (onde.current === null) onde.current = lireOnde(set.onde);

  /* --- Le dessin ---------------------------------------------------------- */

  const dessiner = useCallback(() => {
    const toile = toileRef.current;
    if (!toile) return;
    const ctx = toile.getContext('2d');
    if (!ctx) return;

    /* LE RAPPORT DE PIXELS EST OBLIGATOIRE ICI. Une toile dessinee en pixels
       CSS sur un ecran Retina rend des barres floues, et une forme d'onde
       floue ressemble a une image ratee plutot qu'a un choix. */
    const dpr = window.devicePixelRatio || 1;
    const largeurCss = toile.clientWidth;
    const hauteurCss = toile.clientHeight;
    if (largeurCss === 0 || hauteurCss === 0) return;
    if (toile.width !== Math.round(largeurCss * dpr)) {
      toile.width = Math.round(largeurCss * dpr);
      toile.height = Math.round(hauteurCss * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largeurCss, hauteurCss);

    const pas = LARGEUR_BARRE + ECART;
    const nBarres = Math.max(1, Math.floor(largeurCss / pas));
    const donnees = onde.current;
    const avancee = duree > 0 ? position / duree : 0;
    const survolFrac = survol;

    for (let i = 0; i < nBarres; i += 1) {
      /* On rechantillonne les 800 valeurs vers le nombre de barres qui tient
         a l'ecran, en prenant le MAXIMUM de la tranche et non sa moyenne :
         moyenner deux fois de suite aplatit le dessin jusqu'a la ligne
         droite. */
      let v = 0;
      if (donnees) {
        const d0 = Math.floor((i / nBarres) * donnees.length);
        const d1 = Math.max(d0 + 1, Math.floor(((i + 1) / nBarres) * donnees.length));
        for (let j = d0; j < d1 && j < donnees.length; j += 1) {
          const x = donnees[j] ?? 0;
          if (x > v) v = x;
        }
      } else {
        /* SANS DESSIN, UNE LIGNE BASSE ET REGULIERE plutot que rien : la
           barre de progression reste lisible, et l'absence se voit sans
           ressembler a une panne. */
        v = 46;
      }

      const h = Math.max(2, (v / 255) * (hauteurCss - 2));
      const x = i * pas;
      const y = (hauteurCss - h) / 2;
      const frac = (i + 0.5) / nBarres;

      ctx.fillStyle =
        frac <= avancee
          ? 'oklch(0.78 0.17 85)'
          : survolFrac !== null && frac <= survolFrac
            ? 'oklch(0.52 0.03 260)'
            : 'oklch(0.38 0.012 260)';
      ctx.fillRect(x, y, LARGEUR_BARRE, h);
    }
  }, [position, duree, survol]);

  useEffect(() => {
    dessiner();
  }, [dessiner]);

  useEffect(() => {
    const surRedimension = (): void => dessiner();
    window.addEventListener('resize', surRedimension);
    return () => window.removeEventListener('resize', surRedimension);
  }, [dessiner]);

  /* --- Le son ------------------------------------------------------------- */

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const surTemps = (): void => setPosition(a.currentTime);
    const surDuree = (): void => {
      if (Number.isFinite(a.duration)) setDuree(a.duration);
    };
    const surFin = (): void => {
      setJoue(false);
      setPosition(0);
    };
    const surErreur = (): void => {
      setJoue(false);
      setErreur(t.setIllisible);
    };
    a.addEventListener('timeupdate', surTemps);
    a.addEventListener('loadedmetadata', surDuree);
    a.addEventListener('durationchange', surDuree);
    a.addEventListener('ended', surFin);
    a.addEventListener('error', surErreur);
    a.addEventListener('play', () => setJoue(true));
    a.addEventListener('pause', () => setJoue(false));
    return () => {
      a.removeEventListener('timeupdate', surTemps);
      a.removeEventListener('loadedmetadata', surDuree);
      a.removeEventListener('durationchange', surDuree);
      a.removeEventListener('ended', surFin);
      a.removeEventListener('error', surErreur);
    };
  }, []);

  /* L'ETAT SUIT L'ELEMENT, IL NE LE DEVANCE PAS. Le bouton n'affiche « en
     lecture » que quand l'evenement `play` est arrive. C'est la lecon du
     lecteur de morceaux : afficher Pause avant que le son ait demarre faisait
     envoyer une pause au moment exact ou le geste allait debloquer. */
  const basculer = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setErreur(null);
    if (a.paused) {
      void a.play().catch(() => setErreur(t.setIllisible));
      if (!compte.current) {
        compte.current = true;
        void compterEcoute(set.id);
      }
    } else {
      a.pause();
    }
  }, [set.id]);

  const positionDuClic = (e: React.MouseEvent<HTMLCanvasElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  const chercher = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const a = audioRef.current;
    if (!a || duree <= 0) return;
    const cible = positionDuClic(e) * duree;
    a.currentTime = cible;
    setPosition(cible);
  };

  return (
    <div className={compact ? 'ls ls-compact' : 'ls'}>
      <audio ref={audioRef} src={urlAudio(set.audio_path)} preload="metadata" />

      <button
        className="ls-bouton"
        onClick={basculer}
        aria-label={joue ? t.pause : t.ecouter}
      >
        <FaIcon icon={joue ? faPause : faPlay} />
      </button>

      <div className="ls-corps">
        <canvas
          className="ls-onde"
          ref={toileRef}
          onClick={chercher}
          onMouseMove={(e) => setSurvol(positionDuClic(e))}
          onMouseLeave={() => setSurvol(null)}
          role="slider"
          tabIndex={0}
          aria-label={t.avancerDansLeSet}
          aria-valuemin={0}
          aria-valuemax={Math.round(duree)}
          aria-valuenow={Math.round(position)}
          aria-valuetext={mmss(position)}
          onKeyDown={(e) => {
            const a = audioRef.current;
            if (!a) return;
            if (e.key === 'ArrowRight') a.currentTime = Math.min(duree, a.currentTime + 15);
            else if (e.key === 'ArrowLeft') a.currentTime = Math.max(0, a.currentTime - 15);
            else if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              basculer();
            }
          }}
        />
        <p className="ls-temps">
          <span>{mmss(position)}</span>
          <span>{duree > 0 ? mmss(duree) : ''}</span>
        </p>
      </div>

      {erreur && <p className="ls-erreur">{erreur}</p>}
    </div>
  );
}
