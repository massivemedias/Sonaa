/* LE LECTEUR D'UN SET : un bouton, une forme d'onde, et rien d'autre.

   ═══ POURQUOI CE LECTEUR N'EST PAS CELUI DES MORCEAUX ═══

   Le site a deja un lecteur, dans lecture/useLecteur.ts. Il pilote une iframe
   YouTube, avec ses etats a lui, son delai de chargement, son verrou
   d'autoplay. Un set depose ici est un fichier que le navigateur sait lire
   nativement : le passer par la meme machinerie serait ajouter des pannes
   possibles sans rien gagner.

   ═══ LA BALISE AUDIO N'EST PLUS ICI ═══

   Elle vit dans lib/lecture-set.ts, une pour tout le site, et ce composant
   ne fait que la regarder et la commander. C'est ce qui permet au son de
   continuer quand on quitte la page des sons : avant, la balise mourait avec
   le composant, et l'ecoute avec elle. Deux lecteurs de la meme page
   montrent donc le meme etat, et la barre du bas aussi.

   Les deux lecteurs du site, celui-ci et YouTube, s'annoncent l'un a l'autre
   par un evenement : voir lecture-set.ts. Il n'y a jamais deux sons a la
   fois, et cela ne tient plus aux routes mais a cette regle.

   ═══ LA FORME D'ONDE NE TELECHARGE RIEN ═══

   Elle est dessinee a partir des 800 valeurs calculees au depot et stockees
   dans la ligne du set, soit environ 1,1 ko. Une liste de dix sets affiche
   donc dix formes d'onde pour 11 ko, la ou lire les fichiers pour les
   dessiner aurait coute 500 Mo, c'est-a-dire un dixieme du quota de sortie
   MENSUEL du plan gratuit pour une page qu'on regarde sans rien ecouter. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaIcon } from './FaIcon.tsx';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import { lireOnde, mmss, type SetDJ } from '../lib/sets.ts';
import {
  basculerLeSet,
  chercherDansLeSet,
  jouerLeSet,
  useLectureSet,
} from '../lib/lecture-set.ts';
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
  const toileRef = useRef<HTMLCanvasElement | null>(null);
  const [survol, setSurvol] = useState<number | null>(null);

  /* CE LECTEUR NE MONTRE QUE CE QUI LE CONCERNE. Le son en cours est peut-etre
     un autre set ; alors celui-ci est au repos, a zero, et son bouton dit
     « ecouter ». Un seul etat pour tout le site, lu par chacun a sa place. */
  const lecture = useLectureSet();
  const courant = lecture.set?.id === set.id;
  const joue = courant && lecture.joue;
  const position = courant ? lecture.position : 0;
  const duree = courant && lecture.duree > 0 ? lecture.duree : (set.duree_s ?? 0);
  const erreur = courant && lecture.erreur ? t.setIllisible : null;

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

  /* Toujours dans un geste. Si ce set n'est pas celui qui est charge, on le
     charge et on le lance ; sinon on bascule. */
  const basculer = useCallback(() => {
    if (courant) basculerLeSet();
    else jouerLeSet(set);
  }, [courant, set]);

  /* Se placer dans un set qui n'est pas charge le charge d'abord : le clic
     sur la forme d'onde d'un set au repos doit mener la, et pas nulle part. */
  const placer = useCallback(
    (secondes: number) => {
      if (!courant) jouerLeSet(set);
      chercherDansLeSet(secondes);
    },
    [courant, set]
  );

  const positionDuClic = (e: React.MouseEvent<HTMLCanvasElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  const chercher = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (duree <= 0) return;
    placer(positionDuClic(e) * duree);
  };

  return (
    <div className={compact ? 'ls ls-compact' : 'ls'}>

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
            if (e.key === 'ArrowRight') placer(Math.min(duree, position + 15));
            else if (e.key === 'ArrowLeft') placer(Math.max(0, position - 15));
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
