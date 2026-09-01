/* LE LECTEUR EST UNE COLONNE LATÉRALE, et depuis la mission « clic
   direct », LA FICHE VIT DEDANS : plus aucun panneau flottant
   intermédiaire. Hiérarchie, de haut en bas : nom du genre en grand,
   famille en couleur, BPM, badges ; pochette, titre, artiste, transport ;
   la liste des tracks ; les infos du genre (ouvertes par défaut) ; les
   filiations, toutes cliquables (un clic fait voler la caméra et remplace
   le contenu de la colonne). La carte reste VIVANTE à gauche, la lecture
   ne s'arrête jamais à cause de la navigation.

   Desktop : colonne fixe à droite, 420 px (jamais moins de 380), la carte se
   recadre en douceur. Mobile : feuille du bas à trois positions (barre,
   moitié, plein écran), glissement vertical pour passer de l'une à l'autre.

   Contenu, de haut en bas : pochette carrée (la vidéo prend sa place exacte
   en lecture), titre et artiste, genre cliquable en couleur de famille,
   métadonnées de sortie (chaque champ seulement s'il existe), LES INFOS DU
   GENRE (description, machines, labels deux colonnes, artistes, repliables,
   ouvertes par défaut), la liste verticale des tracks, les charnières. Le
   transport est fixé en bas de colonne, toujours visible.

   L'iframe YouTube n'est JAMAIS démontée ni reparentée : elle vit dans un
   conteneur de premier niveau positionné par mesure, la lecture survit à
   tout, fermeture de colonne comprise (elle devient barre discrète). */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES, type Track } from './structures.ts';
import { ProceduralCover } from './ProceduralCover.tsx';
import { poidsDe, ecouteDe, releveReach, releveVues, SEUIL_REACH } from './poids.ts';
import { CommentsSection } from './CommentsSection.tsx';
import { ContributeActions } from './ContributeActions.tsx';
import { VolumeControl } from './VolumeControl.tsx';
import { TrackVote } from './TrackVote.tsx';
import { contributionsActives } from '../lib/config.ts';
import {
  mesVotesDuGenre,
  NonConnecte,
  scoresDuGenre,
  sessionProbable,
  voterTrack
} from '../lib/track-votes.ts';
import {
  faBackwardStep,
  faForwardStep,
  faPlay,
  faPause,
  faChevronUp,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import './player-layer.css';

export interface Playback {
  familyIndex: number;
  genreLocal: number;
  trackIndex: number;
}

interface Props {
  /* Genre affiché par la colonne. JAMAIS null : la colonne est ouverte en
     permanence et montre un genre tiré au sort tant qu'on n'a rien ouvert.
     Change souvent : le contenu se remplace, la lecture continue. */
  panelGenre: { familyIndex: number; genreLocal: number };
  /* L'accueil est passé : la colonne peut faire son entrée. Tant que l'écran
     de bienvenue est là, elle attend, sinon elle glisserait par-dessus. */
  demarrer: boolean;
  onReopen: (familyIndex: number, genreLocal: number) => void;
  onGoToGenre: (familyIndex: number, genreLocal: number) => void;
  /** Une greffe pointe une famille : le clic vole vers elle. */
  onGoToFamily: (familyIndex: number) => void;
  /** Recadre la carte sur le niveau courant quand la zone visible change. */
  onFrameCurrent: () => void;
}

/** Position de la feuille mobile : barre, moitié, plein écran. */
type SheetPos = 'bar' | 'half' | 'full';

// ------------------------------------------------------- API IFrame YouTube

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (id: string) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

const loadYouTubeApi = (): Promise<YTNamespace> => {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('API IFrame YouTube indisponible'));
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) resolve(window.YT);
      else reject(new Error('API IFrame YouTube chargée mais vide'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
};

const mmss = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};

// -------------------------------------------------------------- composant

export function PlayerLayer({ panelGenre, demarrer, onReopen, onGoToGenre, onGoToFamily, onFrameCurrent }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const [playback, setPlayback] = useState<Playback | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [apiFailed, setApiFailed] = useState(false);
  /* LES INFOS DU GENRE SONT REPLIEES SUR TELEPHONE, ouvertes ailleurs.

     Elles font plusieurs ecrans de haut. Sur un telephone elles repoussaient
     la liste des titres si loin qu'elle n'existait plus : le lecteur montrait
     une pochette geante, un paragraphe, et rien a ecouter. */
  const [infoOpen, setInfoOpen] = useState(
    () => !(typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches)
  );

  /* LA VIDEO NE S'AGRANDIT QUE SI ON LA DEMANDE.

     Le lecteur YouTube vit dans le meme bloc que la pochette. Sur telephone ce
     bloc occupait la moitie de la hauteur pour montrer une image que personne
     ne regarde pendant qu'il ecoute. Il reste donc une vignette, et il ne
     s'ouvre en grand que sur une tape. Le drapeau retombe quand le titre
     change : on ne veut pas qu'un morceau suivant herite d'un ecran de video. */
  const [videoAgrandie, setVideoAgrandie] = useState(false);
  /* LA FEUILLE MOBILE ARRIVE EN BARRE, pas à mi-hauteur. Sur un téléphone la
     carte a besoin de toute la place, et une feuille à mi-hauteur au premier
     chargement cache la moitié de ce qu'on vient d'ouvrir le site pour voir.
     Elle monte à mi-hauteur quand on OUVRE un genre, ce qui est une action,
     pas un défaut. */
  const [sheetPos, setSheetPos] = useState<SheetPos>('bar');

  /* LA COLONNE NE SE FERME PLUS, ELLE SE RÉDUIT.

     Un bouton explicite la réduit, le même la rappelle. La différence n'est
     pas cosmétique : une colonne fermée n'existe plus et il faut savoir
     comment la faire revenir ; une colonne réduite laisse son bouton à
     l'écran, donc le chemin du retour est visible en permanence. */
  const [reduite, setReduite] = useState(false);

  /* L'ENTRÉE, une seule fois dans la vie du navigateur.

     Elle arrive IMMÉDIATEMENT, en glissant depuis la droite en une seconde.
     Une première version la faisait attendre cinq secondes pour laisser voir
     la carte : le compte était juste, l'effet ne l'était pas. Cinq secondes
     d'écran incomplet ne se lisent pas comme une mise en scène, elles se
     lisent comme un chargement qui traîne, et la colonne arrivait alors que
     l'oeil était déjà ailleurs.

     Aux visites suivantes elle est là sans glissement : une animation
     d'arrivée qu'on rejoue à chaque fois devient une attente. */
  const ENTREE_KEY = 'sonaa-colonne-vue';
  const dejaVue = (): boolean => {
    try {
      return localStorage.getItem(ENTREE_KEY) === '1';
    } catch {
      return true; // navigation privée : pas d'animation, jamais de blocage.
    }
  };
  const mouvementReduit =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [entree, setEntree] = useState<'attente' | 'glisse' | 'posee'>(() =>
    dejaVue() || mouvementReduit ? 'posee' : 'attente'
  );

  useEffect(() => {
    if (entree !== 'attente') return;
    if (!demarrer) return; // l'écran d'accueil est encore là : on ne monte pas dessus.
    setEntree('glisse');
    try {
      localStorage.setItem(ENTREE_KEY, '1');
    } catch {
      /* sans écriture, l'entrée se rejouera : dégradé, jamais cassé. */
    }
    /* Une seconde de glissement, puis l'état se fige : garder la classe
       d'animation ferait rejouer la transition au moindre re-rendu. */
    const id = window.setTimeout(() => setEntree('posee'), 1000);
    return () => window.clearTimeout(id);
  }, [entree, demarrer]);
  /* Erreur YouTube : vidéo retirée ou bloquée. Message honnête, passage à
     la suivante, et on s'arrête si tout un tour de liste a échoué. */
  const [notice, setNotice] = useState<string | null>(null);
  const errorStreak = useRef(0);
  const narrow = window.matchMedia('(max-width: 700px)').matches;
  const dragStart = useRef<{ y: number; pos: SheetPos } | null>(null);

  /* --- Largeur de colonne réglable à la souris (desktop) ------------------
     La largeur vit dans la variable CSS --player-w : la carte recadrée et la
     colonne la partagent déjà, régler la variable règle tout. Bornes 320 px
     et la moitié de l'écran (plafond 640 px), retenue par localStorage. */
  const resizeStart = useRef<{ x: number; w: number } | null>(null);

  const applyPlayerWidth = useCallback((px: number) => {
    const max = Math.min(640, Math.round(window.innerWidth * 0.5));
    const w = Math.round(Math.min(Math.max(px, 320), max));
    /* La transition de 300 ms sur la carte recadrée gèle sa largeur quand la
       variable change (mesuré : la carte restait à l'ancienne valeur). Toute
       écriture de largeur coupe la transition le temps de deux frames ; le
       drag pose l'attribut plus longtemps, c'est le même mécanisme. */
    const root = document.documentElement;
    const held = root.dataset['playerResizing'] === '1';
    root.dataset['playerResizing'] = '1';
    root.style.setProperty('--player-w', `${w}px`);
    if (!held) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!resizeStart.current) delete root.dataset['playerResizing'];
        })
      );
    }
    return w;
  }, []);

  useEffect(() => {
    if (narrow) return;
    const stored = Number(localStorage.getItem('sonaa-player-w'));
    if (stored >= 320) applyPlayerWidth(stored);
  }, [narrow, applyPlayerWidth]);

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = document.querySelector('.pcol')?.getBoundingClientRect().width ?? 400;
    resizeStart.current = { x: e.clientX, w: cur };
    document.documentElement.dataset['playerResizing'] = '1';
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = resizeStart.current;
    if (!s) return;
    applyPlayerWidth(s.w + (s.x - e.clientX));
  };
  const onResizeUp = () => {
    if (!resizeStart.current) return;
    resizeStart.current = null;
    delete document.documentElement.dataset['playerResizing'];
    const w = document.querySelector('.pcol')?.getBoundingClientRect().width;
    if (w) localStorage.setItem('sonaa-player-w', String(Math.round(w)));
  };
  const onResizeKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const cur = document.querySelector('.pcol')?.getBoundingClientRect().width ?? 400;
    const w = applyPlayerWidth(cur + (e.key === 'ArrowLeft' ? 16 : -16));
    localStorage.setItem('sonaa-player-w', String(w));
  };

  // --- données ------------------------------------------------------------

  const genreOf = (familyIndex: number, genreLocal: number) =>
    STRUCTURES[familyIndex]?.genres[genreLocal];

  const panelTracks: Track[] = useMemo(() => {
    if (!panelGenre) return [];
    const g = genreOf(panelGenre.familyIndex, panelGenre.genreLocal);
    if (!g) return [];
    return g.tracks;
  }, [panelGenre]);

  const playedTracks: Track[] = useMemo(() => {
    if (!playback) return [];
    const g = genreOf(playback.familyIndex, playback.genreLocal);
    if (!g) return [];
    return g.tracks;
  }, [playback]);

  /* ---- VOTE SUR LES TRACKS -------------------------------------------- */

  const panelGenreId = panelGenre
    ? (genreOf(panelGenre.familyIndex, panelGenre.genreLocal)?.id ?? null)
    : null;

  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [mesVotes, setMesVotes] = useState<Map<string, number>>(new Map());
  const [voteErreur, setVoteErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!panelGenreId || !contributionsActives) {
      setScores(new Map());
      setMesVotes(new Map());
      return;
    }
    let vivant = true;
    setVoteErreur(null);
    void scoresDuGenre(panelGenreId).then((s) => {
      if (vivant) setScores(s);
    });
    /* On ne charge le SDK par anticipation que si une session semble déjà
       là : sinon il n'arrive qu'au premier clic sur une flèche. */
    if (sessionProbable()) {
      void mesVotesDuGenre(panelGenreId).then((v) => {
        if (vivant) setMesVotes(v);
      });
    }
    return () => {
      vivant = false;
    };
  }, [panelGenreId]);

  /* L'ORDRE AFFICHÉ, et l'index d'ORIGINE qui va avec.

     Le lecteur repère une track par sa position dans la liste du corpus.
     Trier l'affichage sans conserver cet index ferait jouer la mauvaise
     track à chaque clic : le piège est silencieux, et il aurait fallu
     l'entendre pour s'en apercevoir. */
  const lignes = useMemo(() => {
    const avecIndex = panelTracks.map((track, indexOrigine) => ({ track, indexOrigine }));
    if (scores.size === 0) return avecIndex;
    return avecIndex
      .map((l) => ({ ...l, score: scores.get(l.track.youtubeId) ?? 0 }))
      .sort((a, b) => b.score - a.score || a.indexOrigine - b.indexOrigine);
  }, [panelTracks, scores]);

  /* Vote optimiste : le score bouge au clic, l'écriture suit, et tout
     revient exactement en arrière si elle échoue. */
  const voterSurTrack = useCallback(
    (videoId: string, valeur: 1 | -1) => {
      if (!panelGenreId) return;
      const ancien = mesVotes.get(videoId) ?? 0;
      const nouveau = ancien === valeur ? 0 : valeur;
      const delta = nouveau - ancien;
      if (delta === 0) return;

      const appliquer = (v: number, d: number) => {
        setMesVotes((m) => {
          const c = new Map(m);
          if (v === 0) c.delete(videoId);
          else c.set(videoId, v);
          return c;
        });
        setScores((s) => {
          const c = new Map(s);
          c.set(videoId, (c.get(videoId) ?? 0) + d);
          return c;
        });
      };

      appliquer(nouveau, delta);
      void voterTrack(panelGenreId, videoId, nouveau as 1 | -1 | 0)
        .then(() => setVoteErreur(null))
        .catch((e: unknown) => {
          appliquer(ancien, -delta);
          setVoteErreur(
            e instanceof NonConnecte
              ? 'Connectez-vous pour classer les tracks : le bouton « Proposer une track » plus bas envoie un lien.'
              : e instanceof Error
                ? e.message
                : 'Vote impossible.'
          );
        });
    },
    [panelGenreId, mesVotes]
  );

  const currentTrack = playback ? playedTracks[playback.trackIndex] : undefined;

  /* LE LECTEUR ANNONCE S'IL A QUELQUE CHOSE EN MAIN.

     La page en a besoin pour arbitrer la barre d'espace, et elle n'a aucun
     moyen de le savoir : l'etat de lecture vit ici. Plutot que de lui donner
     un second acces a cet etat, ce qui ferait deux sources d'une meme verite,
     le lecteur EMET et la page ECOUTE. Une ecriture, une lecture. */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sonaa:lecture', { detail: { actif: Boolean(currentTrack) } })
    );
  }, [currentTrack]);
  const playedTracksRef = useRef(0);
  playedTracksRef.current = playedTracks.length;

  const panelGenreData = panelGenre
    ? STRUCTURES[panelGenre.familyIndex]?.genres[panelGenre.genreLocal]
    : undefined;
  const panelFamily = panelGenre ? FAMILIES[panelGenre.familyIndex] : undefined;

  const playingHere =
    Boolean(playback) &&
    Boolean(panelGenre) &&
    playback?.familyIndex === panelGenre?.familyIndex &&
    playback?.genreLocal === panelGenre?.genreLocal;

  const shownInPanel: Track | undefined = playingHere ? currentTrack : panelTracks[0];

  /* Le drapeau de la video retombe des que le titre change ou que la lecture
     s'arrete. Sans cela, un morceau suivant heriterait d'un ecran de video que
     personne n'a demande. */
  useEffect(() => {
    setVideoAgrandie(false);
  }, [shownInPanel?.id, playingHere]);

  /* La colonne signale sa présence à la coquille : la carte se recadre par
     CSS (marge droite en desktop, zone haute en mobile selon la position de
     la feuille), le moteur suit par son observateur de taille. */
  useEffect(() => {
    const root = document.querySelector('.atlas-root');
    if (!root) return;
    /* La carte doit compter avec la colonne EN PERMANENCE, et non plus
       seulement quand elle s'ouvrait : c'est cet attribut qui rétrécit le
       canvas, et le moteur recalcule le cadrage des quatorze familles sur la
       zone réellement disponible. Tant que l'entrée n'a pas eu lieu, la
       colonne n'est pas là et la carte a tout l'écran.
       Réduite, la colonne rend sa place : c'est tout l'intérêt du bouton. */
    const presente = !reduite && entree !== 'attente';
    if (presente && !narrow) root.setAttribute('data-player-open', 'true');
    else root.removeAttribute('data-player-open');
    if (presente && narrow) root.setAttribute('data-sheet-pos', sheetPos);
    else root.removeAttribute('data-sheet-pos');
    return () => {
      root.removeAttribute('data-player-open');
      root.removeAttribute('data-sheet-pos');
    };
  }, [reduite, entree, narrow, sheetPos]);

  /* OUVRIR UN GENRE DONNE LE MINI LECTEUR, PAS LA FEUILLE OUVERTE.

     Elle s'ouvrait a mi-hauteur, et c'etait faux deux fois. D'abord parce que
     Mika demande explicitement une barre de 64 px au clic sur un genre, la
     feuille ne s'ouvrant qu'a la fleche. Ensuite et surtout parce que cet
     effet se rejoue a CHAQUE changement de genre : naviguer d'un genre a un
     autre rouvrait la feuille par-dessus la carte, mesure. On navigue pour
     voir la carte ; la lui reprendre a chaque pas est le contraire du but.

     Le garde compare la VALEUR precedente, il ne compte pas les rendus. Une
     premiere version marquait « premier rendu vu » dans une reference : en
     developpement React monte, demonte et remonte les effets, la marque
     survivait au demontage. Comparer la valeur est vrai quel que soit le
     nombre de fois ou l'effet est rejoue. */
  const dernierGenre = useRef(panelGenre);
  useEffect(() => {
    if (dernierGenre.current === panelGenre) return;
    dernierGenre.current = panelGenre;
    setReduite(false); // ouvrir un genre rappelle une colonne réduite.
    if (narrow) setSheetPos('bar');
  }, [panelGenre, narrow]);

  /* VUE DÉDOUBLÉE : la zone visible de la carte change quand la colonne
     s'ouvre ou que la feuille bouge. On recadre alors sur la FAMILLE du
     genre ouvert, après que l'observateur de taille du moteur a vu la
     nouvelle zone (deux frames). Le vol est celui du moteur, 850 ms. */
  /* IL NE SE DÉCLENCHE PLUS SUR UN CHANGEMENT DE GENRE, seulement quand la
     ZONE VISIBLE change vraiment, c'est-à-dire quand la feuille mobile
     bouge. C'était le sens de ce recadrage depuis le début ; il se
     déclenchait aussi sur le genre parce que, à l'époque, ouvrir un genre
     ouvrait la colonne et changeait donc la zone visible.

     La colonne est maintenant permanente : ouvrir un genre ne déplace plus
     rien. Le laisser sur le genre annulait la règle du genre sans dérivés,
     mesuré : le clic ne bougeait pas la caméra, et ce recadrage la bougeait
     90 ms plus tard. */
  useEffect(() => {
    if (!narrow) return;
    if (sheetPos === 'full') return; // carte couverte, rien à cadrer
    const id = window.setTimeout(() => onFrameCurrent(), 90);
    return () => window.clearTimeout(id);
  }, [sheetPos, narrow, onFrameCurrent]);

  /* Le logotype ramène à l'accueil. Sur mobile la feuille redescend en barre
     pour rendre la carte entière ; sur poste de bureau la colonne ne bouge
     pas, puisqu'elle ne se ferme plus. La lecture continue dans les deux
     cas, c'est la règle qui n'a jamais changé. L'événement vient d'AtlasPage. */
  useEffect(() => {
    const onHome = (): void => {
      if (narrow) setSheetPos('bar');
    };
    window.addEventListener('sonaa:home', onHome);
    return () => window.removeEventListener('sonaa:home', onHome);
  }, [narrow]);

  // --- lecteur ------------------------------------------------------------

  const play = useCallback(
    (familyIndex: number, genreLocal: number, trackIndex: number) => {
      setPlayback({ familyIndex, genreLocal, trackIndex });
    },
    []
  );

  const step = useCallback((delta: number) => {
    setPlayback((p) => {
      if (!p) return p;
      const g = STRUCTURES[p.familyIndex]?.genres[p.genreLocal];
      const list = g?.tracks ?? [];
      if (list.length === 0) return p;
      return { ...p, trackIndex: (p.trackIndex + delta + list.length) % list.length };
    });
  }, []);

  /* LE LECTEUR NE SE MONTE QU'A LA PREMIERE ECOUTE.

     Il se montait au chargement de la page. Mesure sur le site construit :
     l'API YouTube arrivait a 650 ms, son widget a 1394 ms, l'iframe du
     lecteur a 1649 ms, et le premier pixel n'apparaissait qu'a 2588 ms.
     Personne n'avait encore rien demande a ecouter.

     Deux raisons de differer, et la seconde compte autant que la premiere.
     La page s'affiche sans attendre un tiers. Et YouTube n'est contacte
     qu'une fois que le visiteur a choisi d'ecouter quelque chose, ce qui
     est la seule chose qui le justifie. */
  const [lecteurDemande, setLecteurDemande] = useState(false);
  useEffect(() => {
    if (playback) setLecteurDemande(true);
  }, [playback]);

  useEffect(() => {
    let cancelled = false;
    const slot = slotRef.current;
    if (!slot || !lecteurDemande) return;

    const mount = document.createElement('div');
    mount.className = 'yt-mount';
    slot.appendChild(mount);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: 0,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              setReady(true);
              playerRef.current?.setVolume(volume);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === 1) {
                setPlaying(true);
                errorStreak.current = 0;
                setNotice(null);
              }
              if (event.data === 2) setPlaying(false);
              if (event.data === 0) {
                setPlaying(false);
                step(1);
              }
            },
            onError: (event) => {
              if (cancelled) return;
              setPlaying(false);
              const reason =
                event.data === 100
                  ? 'retirée de YouTube'
                  : event.data === 101 || event.data === 150
                    ? "bloquée à l'intégration ou dans ce pays"
                    : 'illisible';
              errorStreak.current += 1;
              /* Un tour complet d'échecs : on s'arrête, on ne boucle pas. */
              if (errorStreak.current >= Math.max(2, playedTracksRef.current)) {
                setNotice(`Track ${reason}. Aucune track lisible dans cette liste.`);
                return;
              }
              setNotice(`Track ${reason}, passage à la suivante.`);
              window.setTimeout(() => step(1), 1600);
            }
          }
        });
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // Monté une seule fois, à la première écoute demandée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecteurDemande]);

  useEffect(() => {
    if (!ready || !currentTrack) return;
    playerRef.current?.loadVideoById(currentTrack.youtubeId);
    setPosition(0);
    setDuration(0);
    setPlaying(true);
  }, [ready, currentTrack]);

  useEffect(() => {
    if (ready) playerRef.current?.setVolume(volume);
  }, [ready, volume]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setPosition(p.getCurrentTime());
      setDuration(p.getDuration());
    }, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p || !currentTrack) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  }, [playing, currentTrack]);

  /* ═══════════════════════════════════════════════════════════════════════
     LA BARRE SE SAISIT ET SE GLISSE, comme partout ailleurs.

     Elle ne repondait qu'au clic : il fallait viser un point precis pour
     sauter, et attraper la poignee pour la deplacer ne faisait rien. C'est le
     geste que tout le monde connait, et son absence se remarque plus qu'elle
     ne se raconte.

     TROIS TEMPS, et c'est le deuxieme qui compte.
       1. l'appui saisit, ou qu'il tombe sur la barre ;
       2. le glissement deplace l'AFFICHAGE seulement, pas la lecture. Sauter
          a chaque pixel parcouru ferait hoqueter le lecteur et saturerait
          l'iframe de demandes ;
       3. le relachement seul fait sauter la lecture.

     setPointerCapture est ce qui permet au geste de survivre a la sortie de
     la barre : sans lui, un pointeur qui derive de quelques pixels vers le
     haut perd le suivi, et le morceau saute a l'endroit ou l'on a laisse le
     bouton, pas a celui qu'on visait. */
  const [saisie, setSaisie] = useState<number | null>(null);
  const barreRef = useRef<HTMLDivElement>(null);

  const ratioSousLePointeur = (clientX: number, el: HTMLElement): number => {
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
  };

  const sauterA = useCallback(
    (ratio: number) => {
      const p = playerRef.current;
      if (!p || duration <= 0) return;
      p.seekTo(ratio * duration, true);
      setPosition(ratio * duration);
    },
    [duration]
  );

  const onBarreDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    event.preventDefault(); // sur mobile, empeche le defilement de la page
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSaisie(ratioSousLePointeur(event.clientX, event.currentTarget));
  }, [duration]);

  const onBarreMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (saisie === null) return;
    event.preventDefault();
    /* La coordonnee verticale n'est jamais lue : sortir de la barre par le
       haut ou par le bas ne change rien, seul le relachement termine. */
    setSaisie(ratioSousLePointeur(event.clientX, event.currentTarget));
  }, [saisie]);

  const onBarreUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (saisie === null) return;
    const final = ratioSousLePointeur(event.clientX, event.currentTarget);
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* deja relache */
    }
    setSaisie(null);
    /* Un appui sans glissement passe par le meme chemin : le ratio final est
       celui de l'appui, donc un clic simple saute directement. */
    sauterA(final);
  }, [saisie, sauterA]);

  /* Position de l'iframe : sur la fenêtre média de la colonne quand la
     lecture est ici et visible, sur la barre sinon. Mesure au montage, au
     redimensionnement et au déplacement de la feuille. */
  useEffect(() => {
    const place = (): void => {
      const wrap = wrapRef.current;
      const slot = slotRef.current;
      if (!wrap || !slot) return;

      const media = mediaRef.current;
      /* LA VIDEO NE S'AFFICHE QUE SI L'UTILISATEUR LA DEMANDE.
         Par défaut la pochette reste visible. La vidéo ne prend sa place
         que quand videoAgrandie est true (tap sur la pochette). */
      const mediaVisible = media && panelGenre && playingHere && videoAgrandie && !(narrow && sheetPos === 'bar');
      if (mediaVisible && media) {
        const rect = media.getBoundingClientRect();
        wrap.style.opacity = '1';
        wrap.style.zIndex = '16';
        wrap.style.pointerEvents = 'auto';
        slot.style.width = `${rect.width}px`;
        slot.style.height = `${rect.height}px`;
        slot.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
        return;
      }
      if (playback) {
        /* L'IFRAME GAREE PASSE DERRIERE LA BARRE, ET NON DEVANT.

           DEFAUT SIGNALE : « en mobile il y a toujours un lecteur youtube qui
           s'ouvre avec meme la video ». Elle etait garee a 78 x 44 en bas a
           gauche, en opacite 1 et en `z-index` 16, c'est-a-dire PAR-DESSUS le
           mini lecteur, a l'endroit exact de la pochette. Ce n'etait pas un
           lecteur qui s'ouvrait, c'etait celui-la qu'on n'avait jamais cache.

           On ne peut pas la masquer vraiment : une iframe en `display: none`
           ou en opacite nulle se fait suspendre par le navigateur, et la
           lecture s'arrete. Elle reste donc rendue, mais RANGEE DERRIERE : le
           fond de la barre est opaque depuis sa correction, il la couvre
           entierement. Et elle se cale a l'interieur de la bande plutot que de
           la depasser de six pixels par le haut. */
        wrap.style.opacity = '1';
        wrap.style.zIndex = '1';
        wrap.style.pointerEvents = 'none';
        slot.style.width = '78px';
        slot.style.height = '44px';
        slot.style.transform = 'translate3d(18px, calc(100dvh - 52px), 0)';
        return;
      }
      wrap.style.opacity = '0';
      wrap.style.pointerEvents = 'none';
    };

    place();
    // La colonne glisse en 300 ms : on suit le mouvement, puis on se cale.
    const id = window.setInterval(place, 90);
    const stop = window.setTimeout(() => window.clearInterval(id), 480);
    window.addEventListener('resize', place);
    const observer = mediaRef.current ? new ResizeObserver(place) : null;
    if (mediaRef.current && observer) observer.observe(mediaRef.current);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
      window.removeEventListener('resize', place);
      observer?.disconnect();
    };
  }, [panelGenre, playingHere, playback, narrow, sheetPos, videoAgrandie]);

  // --- clavier ------------------------------------------------------------

  /* ÉCHAP N'APPARTIENT PLUS À LA COLONNE. Il la fermait ; elle ne se ferme
     plus. Le laisser ici aurait avalé la touche avant la carte, et le mode
     focus n'aurait eu aucun moyen de sortie au clavier. Échap est à la
     carte, l'espace est au lecteur : chacun sa touche, aucune des deux
     partagée. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.code === 'Space' && playback) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playback, toggle]);

  // --- feuille mobile : glissement vertical entre les trois positions ------

  /* LE PANNEAU SE FERME VERS LA DROITE, il ne descend plus.

     Le geste suivait la geometrie precedente, une feuille qui montait et
     descendait par le bas. Le lecteur arrive maintenant PAR LA DROITE : le
     geste qui le renvoie est donc horizontal, dans la direction d'ou il vient.
     Un panneau lateral qu'on ferme en glissant vers le bas serait un geste
     appris contre l'intuition. */
  const onHandleDown = useCallback((event: React.PointerEvent) => {
    dragStart.current = { y: event.clientY, pos: sheetPos };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }, [sheetPos]);

  const onHandleMove = useCallback((event: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    /* LE GESTE SUIT LA FEUILLE. Elle revient du bas, il redevient vertical :
       vers le bas on referme, vers le haut on ouvre. Un panneau lateral se
       fermait vers la droite, et garder ce geste sur une feuille du bas
       serait un geste appris contre l'intuition. */
    const dx = event.clientY - start.y;
    if (dx > 70 && start.pos !== 'bar') {
      setSheetPos('bar');
      dragStart.current = null;
    } else if (dx < -70 && start.pos === 'bar') {
      setSheetPos('half');
      dragStart.current = null;
    }
  }, []);

  const onHandleUp = useCallback(() => {
    dragStart.current = null;
  }, []);

  // --- rendu --------------------------------------------------------------

  /* Pendant la saisie, la barre et le temps suivent le POINTEUR ; sinon ils
     suivent la lecture. C'est la seule difference entre les deux etats, et
     elle tient en une ligne. */
  const progress =
    saisie !== null ? saisie * 100 : duration > 0 ? (position / duration) * 100 : 0;
  const tempsAffiche = saisie !== null ? saisie * duration : position;

  /* CE QUI MANQUE A CE GENRE, ET POURQUOI ON LE DIT.

     Douze genres n'atteignent pas cinq morceaux fondateurs, et quatre-vingt-
     onze n'ont aucune sortie recente. Ce ne sont pas des trous a cacher : les
     sources publiques sont epuisees, Discogs ne connait pas darkpsy ni
     zenonesque, et forcer produirait des entrees fausses.

     C'est exactement ce que le systeme de propositions existe pour resoudre,
     et c'est son premier usage reel. Le ton est donc un appel, pas un message
     d'erreur : quelqu'un qui connait le style saura quoi proposer. */
  /* CONNECTE OU NON. `sessionProbable` lit le jeton depose par Supabase dans
     le stockage local, sans toucher au reseau ni charger le SDK : on peut
     donc adapter l'interface sans rien couter a qui ne contribuera jamais. */
  const [connecte, setConnecte] = useState(() => sessionProbable());
  useEffect(() => {
    const verifier = () => setConnecte(sessionProbable());
    window.addEventListener('focus', verifier);
    window.addEventListener('storage', verifier);
    return () => {
      window.removeEventListener('focus', verifier);
      window.removeEventListener('storage', verifier);
    };
  }, []);

  /* CINQ MORCEAUX, LE MEME SEUIL QU'AVANT LA FUSION DES LISTES.

     Il y avait deux messages, un par onglet : « manque de fondateurs » et
     « aucune sortie recente ». Le second disparait avec les onglets, et
     surtout il disait quelque chose de faux depuis le debut : un genre eteint
     n'a pas de sorties recentes, ce n'est pas un trou. Il fallait donc une
     exception pour ne pas lui reprocher d'etre mort.

     Un seul compte, une seule phrase, plus d'exception a maintenir. */
  const CIBLE = 5;
  const manque = useMemo(() => {
    if (!panelGenreData) return null;
    if (panelGenreData.tracks.length >= CIBLE) return null;
    /* Sur un genre incomplet, l'appel est plus direct : c'est la que la
       contribution a le plus de valeur, et le visiteur voit le manque. */
    return connecte
      ? 'Ce genre manque de morceaux. Propose les tiens.'
      : 'Ce genre manque de morceaux. Connecte-toi et propose les tiens.';
  }, [panelGenreData, connecte]);


  /* Les données de sortie, MISES EN VALEUR : le label de disque compte
     autant que l'artiste pour du digging. Ligne dédiée label + catalogue
     avec du poids, puis pays et format en dessous, plus discrets. Chaque
     champ n'apparaît que s'il existe. */
  const release = shownInPanel?.release ?? null;
  const releaseMeta = ((): string[] => {
    if (!shownInPanel) return [];
    const parts: string[] = [];
    const year = release?.year ?? shownInPanel.year;
    if (year) parts.push(String(year));
    if (release?.country) parts.push(release.country);
    if (release?.format) parts.push(release.format);
    if (!release && shownInPanel.album) parts.push(`Album ${shownInPanel.album}`);
    if (panelGenreData?.bpmRange)
      parts.push(`${panelGenreData.bpmRange[0]}-${panelGenreData.bpmRange[1]} BPM`);
    if (shownInPanel.key) parts.push(`Tonalité ${shownInPanel.key}`);
    return parts;
  })();

  return (
    <>
      {/* Conteneur de l'iframe. Monté une fois, jamais démonté. */}
      <div ref={wrapRef} className="yt-wrap" aria-hidden={!playback}>
        <div ref={slotRef} className="yt-slot" data-idle={!playback} />
      </div>

      {/* RAPPEL DE LA COLONNE RÉDUITE. Le seul chemin de retour, donc il est
          toujours visible : une colonne qu'on réduit sans laisser de bouton
          est une colonne qu'on a fermée. */}
      {reduite && panelGenreData && (
        <button
          className="pcol-rappel"
          onClick={() => setReduite(false)}
          aria-label={`Rouvrir le lecteur, ${panelGenreData.label}`}
          title="Rouvrir le lecteur"
        >
          <span className="pcol-rappel-nom">{panelGenreData.label}</span>
          <span aria-hidden="true">‹</span>
        </button>
      )}

      {!reduite && panelGenreData && panelFamily && (
        <aside
          className="pcol"
          data-sheet={narrow ? sheetPos : undefined}
          data-entree={entree}
          /* LE GESTE APPARTIENT AU PANNEAU, PAS A LA FLECHE.

             Il n'etait pose que sur la fleche : a 320 px, ou le panneau
             commence six pixels avant elle, un glissement parti du bord ne la
             touchait pas et ne fermait rien. Mesure : trois passages sur trois
             en echec a 320, aucun a 390. Un geste offert sur une cible de
             quarante-quatre pixels n'est pas un geste, c'est un bouton
             deguise. */
          onPointerDown={narrow ? onHandleDown : undefined}
          onPointerMove={narrow ? onHandleMove : undefined}
          onPointerUp={narrow ? onHandleUp : undefined}
          role="complementary"
          aria-label={`Lecteur, genre ${panelGenreData.label}`}
          style={{ ['--family' as string]: `oklch(0.72 0.15 ${panelFamily.hue})` }}
        >
          {/* Poignée de redimensionnement, bord gauche (desktop). */}
          {!narrow && (
            <div
              className="pcol-resize"
              role="separator"
              aria-orientation="vertical"
              aria-label="Régler la largeur de la colonne, flèches gauche et droite"
              tabIndex={0}
              onPointerDown={onResizeDown}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeUp}
              onPointerCancel={onResizeUp}
              onKeyDown={onResizeKey}
            />
          )}

          {/* LA FLECHE DE FERMETURE, en haut a gauche du panneau. Le glissement
              vers la droite fait la meme chose : deux chemins pour un geste,
              parce qu'un panneau qui ne se ferme QUE par un glissement laisse
              sans issue qui ne devine pas le geste. */}
          {narrow && sheetPos !== 'bar' && (
            <button
              className="pcol-fermer"
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onClick={() => setSheetPos('bar')}
              aria-label="Fermer le lecteur"
            >
              <FaIcon icon={faChevronDown} className="pcol-mini-glyphe" />
            </button>
          )}

          {/* LE MINI LECTEUR : panneau ferme, la lecture reste a portee.

              Il ne remplace pas le panneau, il en garde la trace. Sans lui,
              fermer le lecteur pour naviguer donnerait le sentiment d'avoir
              arrete la musique, alors qu'elle continue : l'ecran mentirait sur
              l'etat reel. */}
          {narrow && sheetPos === 'bar' && (
            <div
              className="pcol-mini"
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
            >
              <div className="pcol-mini-progres" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
              <button
                className="pcol-mini-ouvrir"
                onClick={() => setSheetPos('half')}
                aria-label="Ouvrir le lecteur"
              >
                {/* UNE VIGNETTE DE VIDEO N'EST PAS UNE POCHETTE. Celles qui
                    viennent de YouTube portent le triangle rouge de lecture
                    incruste, et rognees en carre elles affichent un bouton
                    Play dessine juste au-dessus du vrai. La couverture
                    generee, elle, est carree et propre. */}
                {shownInPanel?.cover ? (
                  <img className="pcol-mini-vignette" src={shownInPanel.cover} alt="" draggable={false} />
                ) : (
                  <span className="pcol-mini-vignette pcol-cover-generated">
                    {shownInPanel && (
                      <ProceduralCover
                        artist={shownInPanel.artist}
                        title={shownInPanel.title}
                        hue={panelFamily.hue}
                      />
                    )}
                  </span>
                )}
                <span className="pcol-mini-texte">
                  <span className="pcol-mini-titre">{shownInPanel?.title ?? panelGenreData.label}</span>
                  <span className="pcol-mini-artiste">{shownInPanel?.artist ?? ''}</span>
                </span>
              </button>
              {/* LE TRANSPORT EN ICONES, ET C'EST UNE QUESTION DE COHERENCE.

                  Il etait dessine avec des CARACTERES de police : trois
                  glyphes de graisses differentes, mal alignes verticalement,
                  sans rapport avec les icones du reste de l'ecran. Sur un
                  telephone ce sont les trois boutons les plus utilises du
                  site. Ils viennent desormais du meme jeu que la loupe et la
                  cible de la carte. */}
              <div className="pcol-mini-transport">
                <button onClick={() => step(-1)} disabled={!playingHere} aria-label="Précédente">
                  <FaIcon icon={faBackwardStep} className="pcol-mini-glyphe" />
                </button>
                <button
                  onClick={() =>
                    playingHere
                      ? toggle()
                      : play(panelGenre.familyIndex, panelGenre.genreLocal, 0)
                  }
                  aria-label={playing && playingHere ? 'Pause' : 'Lecture'}
                >
                  <FaIcon
                    icon={playing && playingHere ? faPause : faPlay}
                    className="pcol-mini-glyphe"
                  />
                </button>
                <button onClick={() => step(1)} disabled={!playingHere} aria-label="Suivante">
                  <FaIcon icon={faForwardStep} className="pcol-mini-glyphe" />
                </button>
              </div>
              {/* LA FLECHE EST LE SEUL MOYEN DE DECOUVRIR QUE LE LECTEUR
                  S'AGRANDIT, donc elle doit se voir. Elle etait un chevron
                  gris et fin, invisible sur la capture. Blanche, epaisse, dans
                  un rond de 44 px. Le glissement vers le haut fait la meme
                  chose, mais il faut le deviner ; la fleche, elle, se lit. */}
              <button
                className="pcol-mini-fleche"
                onClick={() => setSheetPos('half')}
                aria-label="Ouvrir le lecteur"
              >
                <FaIcon icon={faChevronUp} className="pcol-mini-glyphe" />
              </button>
            </div>
          )}

          <div className="pcol-scroll">
            {/* 1. Le GENRE d'abord : nom en grand, famille en couleur, BPM,
                badges. C'est la fiche qui ouvre, les tracks suivent. */}
            <header className="pcol-head">
              <h2 className="pcol-genre-title">{panelGenreData.label}</h2>
              <p className="pcol-genre-line">
                <span className="pcol-family-name">{panelFamily.label}</span>
                {panelGenreData.bpmRange && (
                  <span className="pcol-bpm">
                    {panelGenreData.bpmRange[0]}-{panelGenreData.bpmRange[1]} BPM
                  </span>
                )}
                {panelGenreData.confidence === 'debated' && (
                  <span className="pcol-badge" title={panelGenreData.note}>filiation débattue</span>
                )}
                {panelGenreData.redaction === 'brouillon' && (
                  <span className="pcol-badge pcol-badge-draft">fiche à relire</span>
                )}
              </p>
            </header>

            <div className="pcol-media" ref={mediaRef} data-agrandie={videoAgrandie}>
              {/* Bouton pour ouvrir/fermer la vid\u00e9o pendant la lecture */}
              {playingHere && (
                <button
                  className="pcol-media-tap"
                  onClick={() => setVideoAgrandie((v) => !v)}
                  aria-label={videoAgrandie ? 'R\u00e9duire la vid\u00e9o' : 'Voir la vid\u00e9o'}
                >
                  <span aria-hidden="true">{videoAgrandie ? '\u00d7' : '\u25b6'}</span>
                </button>
              )}
              {/* LA POCHETTE S'AFFICHE TOUJOURS, sauf si la vidéo est agrandie.
                  Un tap sur la pochette pendant la lecture ouvre la vidéo. */}
              {shownInPanel && (!playingHere || !videoAgrandie) && (
                shownInPanel.cover ? (
                  <img
                    className="pcol-cover"
                    src={shownInPanel.cover}
                    alt={`Pochette de ${shownInPanel.title}`}
                    draggable={false}
                  />
                ) : (
                  <span className="pcol-cover pcol-cover-generated">
                    <ProceduralCover
                      artist={shownInPanel.artist}
                      title={shownInPanel.title}
                      hue={panelFamily.hue}
                    />
                  </span>
                )
              )}
              {!playingHere && shownInPanel && (
                <button
                  className="pcol-bigplay"
                  onClick={() => play(panelGenre.familyIndex, panelGenre.genreLocal, 0)}
                  aria-label={`Lire ${shownInPanel.title}`}
                >
                  ▶
                </button>
              )}
              {apiFailed && (
                <p className="pcol-failed">
                  Le lecteur YouTube n&apos;a pas pu se charger. La pochette reste affichée.
                </p>
              )}
            </div>

            <h2 className="pcol-title">{shownInPanel ? shownInPanel.title : panelGenreData.label}</h2>
            <p className="pcol-artist">
              {shownInPanel ? shownInPanel.artist : `${panelTracks.length} tracks`}
            </p>


            {notice && (
              <p className="pcol-notice" role="status">{notice}</p>
            )}
            {release?.label && (
              <p className="pcol-imprint">
                <strong>{release.label}</strong>
                {release.catno && <span className="pcol-catno">{release.catno}</span>}
              </p>
            )}
            {releaseMeta.length > 0 && (
              <p className="pcol-release">{releaseMeta.join(' · ')}</p>
            )}

              {/* 2. Le transport, sous l'identité de la track (hiérarchie du clic direct). */}
            {/* LES MEMES ICONES QUE DANS LA BARRE, et c'etait le dernier
                endroit ou trainaient des caracteres de police. Le lecteur
                ouvert gardait « precedent » et « suivant » en glyphes bruts,
                de graisses differentes et mal alignes, juste a cote d'icones
                dessinees. */}
            <div className="pcol-transport">
              <button onClick={() => step(-1)} disabled={!playingHere} aria-label="Précédente">
                <FaIcon icon={faBackwardStep} className="pcol-glyphe" />
              </button>
              <button
                className="pcol-main"
                onClick={() =>
                  playingHere
                    ? toggle()
                    : play(panelGenre.familyIndex, panelGenre.genreLocal, 0)
                }
                aria-label={playing && playingHere ? 'Pause' : 'Lecture'}
              >
                <FaIcon icon={playing && playingHere ? faPause : faPlay} className="pcol-glyphe" />
              </button>
              <button onClick={() => step(1)} disabled={!playingHere} aria-label="Suivante">
                <FaIcon icon={faForwardStep} className="pcol-glyphe" />
              </button>

              {/* Sous 380 px, rien ne tient sur une seule rangée sans écraser
                  les temps à zéro. Ce saut vide renvoie temps, barre et temps
                  à la ligne, où la barre récupère toute la largeur. Il n'a
                  aucune existence au-dessus de ce seuil. */}
              <span className="pcol-saut" aria-hidden="true" />

              <span className="pcol-time">{playingHere ? mmss(tempsAffiche) : '0:00'}</span>
              <div
                ref={barreRef}
                className="pcol-bar"
                data-saisie={saisie !== null}
                onPointerDown={onBarreDown}
                onPointerMove={onBarreMove}
                onPointerUp={onBarreUp}
                onPointerCancel={onBarreUp}
                role="slider"
                tabIndex={0}
                aria-label="Position dans la track"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration)}
                aria-valuenow={Math.floor(position)}
              >
                <div className="pcol-bar-fill" style={{ width: `${playingHere ? progress : 0}%` }} />
              </div>
              <span className="pcol-time">{playingHere ? mmss(duration) : '0:00'}</span>

              <VolumeControl volume={volume} onChange={setVolume} />
              {/* LE LIEN VERS YOUTUBE RESTE, MAIS PAS SUR TELEPHONE.

                  Sur la feuille mobile il occupait une largeur fixe au milieu
                  des commandes, et c'est la barre de progression qui payait :
                  elle tombait a une quarantaine de pixels, impossible a viser
                  pour deplacer la tete de lecture. Un lien de sortie ne vaut
                  pas la commande la plus utilisee du lecteur.

                  Sur ordinateur la place ne manque pas et il ne coute rien :
                  il y reste. La feuille de style le masque sous 700 px, la
                  fonction n'est pas retiree du produit. */}
              {shownInPanel && (
                <a
                  className="pcol-youtube"
                  href={`https://www.youtube.com/watch?v=${shownInPanel.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ouvrir sur YouTube"
                >
                  YT ↗
                </a>
              )}
            </div>


            {/* La liste verticale : AUCUNE ligne muette. Chaque track affiche
                titre, artiste, année, label et catalogue quand ils existent.
                La track en cours reste distinguée et plus détaillée (sa durée
                est la seule que le lecteur connaît, on n'invente pas les
                autres). */}
            {voteErreur && (
              <p className="pcol-vote-erreur" role="alert">
                {voteErreur}
              </p>
            )}

            {/* BANDEAU DE CONNEXION. Discret et permanent pour qui n'est pas
                connecte : la contribution demande un compte, autant le dire
                avant le clic plutot qu'au moment de le refuser.

                Il ne bloque RIEN : consulter et ecouter restent libres, et
                c'est un choix, pas un oubli. */}
            {/* UN VRAI BOUTON, ET NON UNE PHRASE. Le texte disait quoi faire
                sans offrir de le faire : il fallait deviner qu'aucune porte
                n'existait. Le bouton ouvre le panneau la ou l'on est. */}
            {contributionsActives && !connecte && !manque && (
              <button
                className="pcol-connexion"
                onClick={() => window.dispatchEvent(new CustomEvent('sonaa:connexion'))}
              >
                Se connecter pour voter et proposer des morceaux
              </button>
            )}

            <ul className="pcol-list">
              {lignes.map(({ track, indexOrigine }) => {
                const active = playingHere && playback?.trackIndex === indexOrigine;
                const meta: string[] = [];
                const y = track.release?.year ?? track.year;
                if (y) meta.push(String(y));
                if (track.release?.label) meta.push(track.release.label);
                if (track.release?.catno) meta.push(track.release.catno);
                return (
                  <li key={track.id} className="pcol-li">
                    {contributionsActives && (
                      <TrackVote
                        score={scores.get(track.youtubeId) ?? 0}
                        monVote={mesVotes.get(track.youtubeId) ?? 0}
                        titre={track.title}
                        onVote={(v) => voterSurTrack(track.youtubeId, v)}
                      />
                    )}
                    <button
                      className="pcol-row"
                      data-active={active}
                      onClick={() =>
                        play(panelGenre.familyIndex, panelGenre.genreLocal, indexOrigine)
                      }
                      aria-label={`Lire ${track.title} de ${track.artist}`}
                    >
                      <span className="pcol-row-cover" aria-hidden="true">
                        {track.cover ? (
                          <img src={track.cover} alt="" draggable={false} />
                        ) : (
                          <ProceduralCover
                            artist={track.artist}
                            title={track.title}
                            hue={panelFamily.hue}
                            size={80}
                          />
                        )}
                      </span>
                      <span className="pcol-row-text">
                        <strong>
                          {track.title}
                          {/* LE ROLE SE LIT SUR LE MORCEAU, PAS SUR UN ONGLET.
                              Un mot court plutot qu'une pastille de couleur :
                              la colonne porte deja la teinte de la famille, et
                              une seconde couleur y dirait autre chose sans que
                              rien ne dise quoi. Absent sur la majorite des
                              morceaux, ce qui est l'etat normal. */}
                          {track.role && (
                            <span className="pcol-row-role" data-role={track.role}>
                              {track.role === 'origine' ? 'origine' : 'canon'}
                            </span>
                          )}
                        </strong>
                        <span>{track.artist}</span>
                        {meta.length > 0 && (
                          <span className="pcol-row-meta">{meta.join(' · ')}</span>
                        )}
                      </span>
                      {active && duration > 0 && (
                        <span className="pcol-row-duration">{mmss(duration)}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* LA LEGENDE N'APPARAIT QUE SI LES SIGNES SONT LA. Sur un genre
                dont aucun morceau ne porte de role, elle expliquerait des
                marques absentes, ce qui est du bruit. */}
            {panelTracks.some((t) => t.role) && (
              <p className="pcol-legende">
                <strong>origine</strong> le morceau qui fonde le genre ·{' '}
                <strong>canon</strong> une référence établie
              </p>
            )}

            {manque && contributionsActives && (
              <div className="pcol-manque">
                <p>{manque}</p>
                <ContributeActions
                  genreId={panelGenreData?.id ?? ''}
                  genreLabel={panelGenreData?.label ?? ''}
                  filiationDebattue={false}
                />
              </div>
            )}

            {/* LES INFOS DU GENRE : la fiche en résumé, dans la colonne.
                Repliable, ouverte par défaut. */}
            {(panelGenreData.description ||
              panelGenreData.machines.length > 0 ||
              panelGenreData.artistesCles.length > 0) && (
              <section className="pcol-info" data-open={infoOpen}>
                <button
                  className="pcol-info-toggle"
                  onClick={() => setInfoOpen((v) => !v)}
                  aria-expanded={infoOpen}
                >
                  Le genre {infoOpen ? '▾' : '▸'}
                </button>
                {infoOpen && (
                  <div className="pcol-info-body">
                    {/* CE QUE CE GENRE PESE, EN TROIS CHIFFRES QUI DISENT
                        TROIS CHOSES DIFFERENTES, ET AUCUN NE DEFORME LA CARTE.

                        La DESCENDANCE vient du corpus, elle ne depend d'aucun
                        service. Les deux autres sont des mesures d'ecoute
                        ecartees de la geometrie apres mesure, et gardees ici
                        parce qu'une donnee biaisee pour dimensionner reste
                        lisible comme information. Chacune porte sa DATE : sans
                        elle, un chiffre d'audience se lit comme du temps reel
                        alors qu'il a l'age de son releve. */}
                    {(() => {
                      const q = poidsDe(panelGenreData.id);
                      const e = ecouteDe(panelGenreData.id);
                      const nb = (n: number): string => n.toLocaleString('fr-FR');
                      return (
                        <ul className="pcol-poids">
                          <li>
                            <strong>{nb(q.derivesDirects)}</strong> dérivé{q.derivesDirects > 1 ? 's' : ''} direct
                            {q.derivesDirects > 1 ? 's' : ''}
                            {q.descendance !== q.derivesDirects && (
                              <>, <strong>{nb(q.descendance)}</strong> genre{q.descendance > 1 ? 's' : ''} en descendent au total</>
                            )}
                          </li>
                          {e.reach > 0 && (
                            <li>
                              {e.reach >= SEUIL_REACH ? (
                                <>connu de <strong>{nb(e.reach)}</strong> auditeurs sur Last.fm</>
                              ) : (
                                /* SOUS CENT AUDITEURS, ON N'ECRIT PAS LE
                                   CHIFFRE : trente-sept genres sont dans ce
                                   cas, et donner l'autorite d'un releve a
                                   vingt-quatre personnes serait un mensonge
                                   poli. */
                                <>peu documenté sur Last.fm</>
                              )}
                              {releveReach && <span className="pcol-poids-date"> · relevé du {releveReach}</span>}
                            </li>
                          )}
                          {e.vues > 0 && (
                            <li>
                              médiane de <strong>{nb(e.vues)}</strong> vues par morceau sur YouTube
                              {releveVues && <span className="pcol-poids-date"> · relevé du {releveVues}</span>}
                            </li>
                          )}
                        </ul>
                      );
                    })()}
                    {panelGenreData.redaction === 'brouillon' && (
                      <p className="pcol-draft">fiche en brouillon, à relire</p>
                    )}
                    {panelGenreData.description && (
                      <p className="pcol-description">{panelGenreData.description}</p>
                    )}
                    {/* Le mot de l'auteur : un point de vue assume, pas une
                        donnee. Il porte une signature pour qu'on sache qui
                        parle, et se distingue visuellement du factuel. */}
                    {panelGenreData.motDeLAuteur && (
                      <aside className="pcol-mot-auteur">
                        {/* Un paragraphe par bloc : le texte en compte
                            quatre, et rendu d'un seul tenant il formait un
                            mur de quatre-vingts mots dans une colonne de
                            420 px. Même séparation que la page À propos, une
                            ligne vide. */}
                        {panelGenreData.motDeLAuteur.split('\n\n').map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                        <p className="pcol-mot-signature">Mika</p>
                      </aside>
                    )}
                    {panelGenreData.machines.length > 0 && (
                      <>
                        <h4>Machines</h4>
                        <p className="pcol-info-line">{panelGenreData.machines.join(' · ')}</p>
                      </>
                    )}
                    {(panelGenreData.labelsHistoriques.length > 0 ||
                      panelGenreData.labelsActuels !== null) && (
                      <div className="pcol-labels">
                        <div>
                          <h4>Labels historiques</h4>
                          {panelGenreData.labelsHistoriques.length > 0 ? (
                            <p className="pcol-info-line">
                              {panelGenreData.labelsHistoriques.join(' · ')}
                            </p>
                          ) : (
                            <p className="pcol-none">sans label fondateur identifié</p>
                          )}
                        </div>
                        <div>
                          <h4>Labels actuels</h4>
                          {panelGenreData.labelsActuels && panelGenreData.labelsActuels.length > 0 ? (
                            <p className="pcol-info-line">{panelGenreData.labelsActuels.join(' · ')}</p>
                          ) : (
                            <p className="pcol-none">aucun, le genre ne produit plus</p>
                          )}
                        </div>
                      </div>
                    )}
                    {panelGenreData.artistesCles.length > 0 && (
                      <>
                        <h4>Artistes clés</h4>
                        <p className="pcol-info-line">{panelGenreData.artistesCles.join(' · ')}</p>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* 3 bis. LA DISCUSSION, sous les infos du genre et avant les
                filiations : on lit ce que d'autres en disent apres avoir vu
                la fiche, pas avant d'avoir entendu un morceau. */}
            <CommentsSection genreId={panelGenreData.id} couleurFamille="var(--family)" />

            {/* 4. LES FILIATIONS : elles survivent au déménagement de la
                fiche. Un clic fait voler la caméra et remplace le contenu
                de la colonne. Aucun geste caché. */}
            <section className="pcol-filiations" aria-label="Filiations">
              <h4>{panelGenreData.structuralOnly ? 'Rattaché à' : 'Vient de'}</h4>
              {panelGenreData.parent >= 0 ? (
                <p>
                  <button
                    className="pcol-fil-link"
                    onClick={() => onGoToGenre(panelGenre.familyIndex, panelGenreData.parent)}
                  >
                    {STRUCTURES[panelGenre.familyIndex]?.genres[panelGenreData.parent]?.label}
                  </button>
                  {panelGenreData.structuralOnly && (
                    <span className="pcol-none"> par convention d&apos;arbre, ce n&apos;est pas une filiation</span>
                  )}
                </p>
              ) : (
                <p className="pcol-none">fondateur de la famille {panelFamily.label}</p>
              )}

              <h4>A donné</h4>
              {panelGenreData.children.length === 0 ? (
                <p className="pcol-none">rien, c&apos;est une feuille</p>
              ) : (
                <p className="pcol-fil-chips">
                  {panelGenreData.children.map((childLocal) => (
                    <button
                      key={childLocal}
                      className="pcol-fil-link"
                      onClick={() => onGoToGenre(panelGenre.familyIndex, childLocal)}
                    >
                      {STRUCTURES[panelGenre.familyIndex]?.genres[childLocal]?.label}
                    </button>
                  ))}
                </p>
              )}

              {panelGenreData.externalParents.length > 0 && (
                <>
                  <h4>Greffes</h4>
                  <p className="pcol-fil-chips">
                    {panelGenreData.externalParents.map((x, i) => (
                      <button
                        key={`${x.family}-${i}`}
                        className="pcol-fil-link"
                        onClick={() => onGoToFamily(x.family)}
                      >
                        famille {x.label}
                      </button>
                    ))}
                  </p>
                </>
              )}

              {(() => {
                const shared = panelGenreData.tracks.filter(
                  (t) => t.sharedWith.length > 0
                );
                if (shared.length === 0) return null;
                return (
                  <>
                    <h4>Charnières</h4>
                    {shared.map((t) => (
                      <p key={t.youtubeId} className="pcol-fil-shared">
                        {t.title},{' '}
                        <span className="pcol-none">aussi revendiquée par </span>
                        {t.sharedWith.map((x, i) => (
                          <span key={`${x.familyIndex}-${x.genreLocal}`}>
                            {i > 0 && ', '}
                            <button
                              className="pcol-fil-link"
                              onClick={() => onGoToGenre(x.familyIndex, x.genreLocal)}
                            >
                              {x.label}
                            </button>
                          </span>
                        ))}
                      </p>
                    ))}
                  </>
                );
              })()}

              {panelGenreData.aliases.length > 0 && (
                <>
                  <h4>Aussi appelé</h4>
                  <p className="pcol-none">{panelGenreData.aliases.join(', ')}</p>
                </>
              )}
            </section>

            {/* 5. CONTRIBUER. En bas, après la fiche : on propose une
                correction quand on a lu ce qui est écrit, pas avant. Le bloc
                disparaît entièrement si la base n'est pas configurée. */}
            <ContributeActions
              genreId={panelGenreData.id}
              genreLabel={panelGenreData.label}
              filiationDebattue={panelGenreData.confidence === 'debated'}
            />

          </div>


          {/* RÉDUIRE, et non fermer. Le chevron dit le geste : la colonne
              part vers la droite et laisse un onglet qui la rappelle. Une
              croix aurait promis une fermeture qui n'existe plus. */}
          <button
            className="pcol-close"
            onClick={() => setReduite(true)}
            aria-label="Réduire le lecteur"
            title="Réduire le lecteur"
          >
            ›
          </button>
        </aside>
      )}

      {/* Barre discrète : la lecture continue, colonne fermée. */}
      {/* Barre discrète : la lecture reste pilotable quand la colonne est
          réduite. Elle n'apparaît plus « colonne fermée », puisqu'il n'y a
          plus de fermeture. */}
      {playback && reduite && currentTrack && (
        <div className="mini" role="region" aria-label="Lecture en cours">
          <button
            className="mini-back"
            onClick={() => onReopen(playback.familyIndex, playback.genreLocal)}
            aria-label="Rouvrir la colonne du genre"
          >
            <span className="mini-slot" aria-hidden="true" />
            <span className="mini-text">
              <strong>{currentTrack.title}</strong>
              <span>{currentTrack.artist}</span>
            </span>
          </button>

          <span className="mini-transport">
            <button onClick={() => step(-1)} aria-label="Précédente">⏮</button>
            <button onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button onClick={() => step(1)} aria-label="Suivante">⏭</button>
          </span>

          {notice && <span className="mini-notice">{notice}</span>}
          <div
            className="mini-bar"
            onPointerDown={onBarreDown}
            onPointerMove={onBarreMove}
            onPointerUp={onBarreUp}
            onPointerCancel={onBarreUp}
            role="presentation"
          >
            <div className="mini-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <button className="mini-stop" onClick={() => setPlayback(null)} aria-label="Arrêter">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
