/* LE MOTEUR DE LECTURE, ecrit a l'envers de l'ancien.

   L'ANCIEN MENTAIT. Des qu'il demandait une video, il posait `playing = true`
   sans attendre que YouTube confirme. Comme il n'ecoutait ni l'etat 5 (video
   en attente) ni l'etat -1 (jamais demarree), une lecture refusee par la
   politique de demarrage automatique du navigateur restait affichee comme
   « en cours ». Le bouton montrait donc une PAUSE, et l'appui suivant partait
   dans pauseVideo() au moment precis ou le geste de l'utilisateur aurait
   debloque la lecture. D'ou le defaut rapporte : « des fois quand on appuie
   sur play ca ne fonctionne juste pas ».

   TROIS REGLES ICI, et elles suffisent a couvrir tout ce qui precede.

   1. L'ETAT VIENT DE YOUTUBE, JAMAIS DE NOTRE INTENTION. On demande, puis on
      attend un evenement. Entre les deux, l'etat est « chargement », qui est
      la verite : on ne sait pas encore.

   2. LE PREMIER playVideo() DOIT PARTIR DANS LE GESTE. Les navigateurs
      n'autorisent le son que si l'appel descend d'un vrai appui. On cree donc
      le lecteur EN AVANCE, quand la page du genre s'ouvre, pour qu'il soit
      pret quand le doigt arrive. L'ancien le creait au premier appui : le
      lecteur devenait pret une seconde plus tard, hors du geste, et le son
      etait refuse.

   3. CE QUI ECHOUE SE DIT. Un blocage de demarrage automatique, une video
      retiree, une liste vide : chacun a son etat et son message. Rien ne
      reste silencieux, parce qu'un bouton muet est indistinguable d'un bouton
      casse. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '../atlas/structures.ts';

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allow: boolean) => void;
  setVolume: (v: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

/* LA MEME FORME QUE DANS PlayerLayer, exactement : deux `declare global` qui
   decrivent `window.YT` differemment ne compilent pas ensemble. On ne
   redeclare donc rien ici, on lit `window` a travers une vue typee. */
interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      width?: string;
      height?: string;
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

interface FenetreYT {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
}

const fenetre = (): FenetreYT => window as unknown as FenetreYT;

/* LA PROMESSE N'EST PAS MISE EN CACHE QUAND ELLE ECHOUE. L'ancien gardait une
   promesse rejetee pour toute la session : un bloqueur de publicite, et le
   lecteur restait mort jusqu'au rechargement de la page, meme apres l'avoir
   desactive. Ici un echec efface le cache, donc une nouvelle tentative est
   possible. */
let apiPromise: Promise<YTNamespace> | null = null;

const chargerApi = (): Promise<YTNamespace> => {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (fenetre().YT?.Player) {
      resolve(fenetre().YT as YTNamespace);
      return;
    }
    /* UN DELAI MAXIMAL, que l'ancien n'avait pas. Si le script se charge mais
       que le rappel global ne part jamais, la promesse pendait pour toujours
       et le lecteur restait muet sans le dire. */
    const minuteur = window.setTimeout(() => {
      reject(new Error("L'API YouTube n'a jamais repondu."));
    }, 12000);

    const precedent = fenetre().onYouTubeIframeAPIReady;
    fenetre().onYouTubeIframeAPIReady = () => {
      precedent?.();
      window.clearTimeout(minuteur);
      if (fenetre().YT?.Player) resolve(fenetre().YT as YTNamespace);
      else reject(new Error('API YouTube chargee sans lecteur.'));
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(minuteur);
      reject(new Error('Script YouTube bloque ou injoignable.'));
    };
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    apiPromise = null;
    throw e;
  });
  return apiPromise;
};

export type EtatLecture =
  /** Rien n'a ete demande. */
  | 'inactif'
  /** Le lecteur se construit, ou la video se charge. On ne sait pas encore. */
  | 'chargement'
  | 'joue'
  | 'pause'
  /** Le navigateur a refuse le son. Un second appui, lui, partira du geste. */
  | 'bloque'
  | 'erreur';

export interface Lecture {
  readonly etat: EtatLecture;
  /** Index dans la liste passee a `jouer`, ou -1. */
  readonly index: number;
  /** Identifiant de la liste en cours, pour distinguer deux genres. */
  readonly listeId: string | null;
  readonly position: number;
  readonly duree: number;
  /** Ce qui ne va pas, en clair, ou null. Toujours affichable. */
  readonly message: string | null;
}

const VIDE: Lecture = {
  etat: 'inactif',
  index: -1,
  listeId: null,
  position: 0,
  duree: 0,
  message: null
};

interface Options {
  /* Construire le lecteur AVANT le premier appui. La page d'un genre le met a
     vrai en s'ouvrant : le temps que l'oeil descende la liste, l'iframe est
     prete, et le playVideo() du premier appui part bien du geste. */
  readonly precharger: boolean;
}

export function useLecteur({ precharger }: Options) {
  const [lecture, setLecture] = useState<Lecture>(VIDE);

  const playerRef = useRef<YTPlayer | null>(null);
  const pretRef = useRef(false);
  const monteRef = useRef<HTMLDivElement | null>(null);

  /* CE QU'ON A DEMANDE, hors de React : les rappels de YouTube arrivent en
     dehors du cycle de rendu et doivent lire la demande courante, pas celle
     capturee au montage. */
  const demandeRef = useRef<{
    listeId: string;
    index: number;
    tracks: readonly Track[];
    /* Vrai quand l'appel descend d'un appui : c'est la seule situation ou le
       navigateur accorde le son. */
    duGeste: boolean;
  } | null>(null);

  const chienDeGarde = useRef<number | null>(null);
  const suiteMinuteur = useRef<number | null>(null);
  const erreursDeSuite = useRef(0);

  const annulerMinuteurs = useCallback(() => {
    if (chienDeGarde.current !== null) window.clearTimeout(chienDeGarde.current);
    if (suiteMinuteur.current !== null) window.clearTimeout(suiteMinuteur.current);
    chienDeGarde.current = null;
    suiteMinuteur.current = null;
  }, []);

  /* --- Construction du lecteur ------------------------------------------- */

  useEffect(() => {
    if (!precharger) return;
    let annule = false;

    const hote = document.createElement('div');
    hote.setAttribute('aria-hidden', 'true');
    /* L'IFRAME RESTE DANS LA PAGE ET VISIBLE POUR LE NAVIGATEUR. En
       display:none ou en opacite nulle, le navigateur suspend la lecture. On
       la sort donc du champ par la position, ce qui ne la suspend pas. */
    hote.style.cssText =
      'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
    const mount = document.createElement('div');
    hote.appendChild(mount);
    document.body.appendChild(hote);
    monteRef.current = hote;

    chargerApi()
      .then((YT) => {
        if (annule) return;
        playerRef.current = new YT.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          width: '320',
          height: '180',
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
              if (annule) return;
              pretRef.current = true;
              /* Une demande posee pendant la construction s'execute ici. Elle
                 ne descend plus du geste : le son peut etre refuse, et c'est
                 exactement le cas que l'etat « bloque » sait dire. */
              const d = demandeRef.current;
              if (d) chargerPiste(d.tracks, d.index, d.listeId, false);
            },
            onStateChange: (e: { data: number }) => {
              if (annule) return;
              auChangementDEtat(e.data);
            },
            onError: (e: { data: number }) => {
              if (annule) return;
              surErreur(e.data);
            }
          }
        });
      })
      .catch((e: unknown) => {
        if (annule) return;
        setLecture((l) => ({
          ...l,
          etat: 'erreur',
          message:
            e instanceof Error && e.message.includes('bloque')
              ? "Le lecteur YouTube est bloque par une extension du navigateur."
              : "Le lecteur YouTube n'a pas pu se charger."
        }));
      });

    return () => {
      annule = true;
      annulerMinuteurs();
      try {
        playerRef.current?.destroy();
      } catch {
        /* Une iframe deja detachee : rien a faire. */
      }
      playerRef.current = null;
      /* REMIS A FAUX, ce que l'ancien oubliait : un lecteur detruit avec le
         drapeau reste a vrai produisait des appels sur null, avales par
         l'operateur optionnel, et un blocage muet. */
      pretRef.current = false;
      monteRef.current?.remove();
      monteRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precharger]);

  /* --- Evenements de YouTube --------------------------------------------- */

  const auChangementDEtat = useCallback((code: number) => {
    /* LES CINQ ETATS SONT TRAITES, pas seulement trois. L'ancien ignorait -1,
       3 et 5, et c'est precisement dans ces trois-la que se cache une lecture
       qui n'a pas demarre. */
    if (code === 1) {
      annulerMinuteurs();
      erreursDeSuite.current = 0;
      setLecture((l) => ({ ...l, etat: 'joue', message: null }));
      return;
    }
    if (code === 3) {
      setLecture((l) => (l.etat === 'joue' ? l : { ...l, etat: 'chargement' }));
      return;
    }
    if (code === 2) {
      setLecture((l) => ({ ...l, etat: 'pause' }));
      return;
    }
    if (code === 0) {
      setLecture((l) => ({ ...l, etat: 'pause' }));
      suivant();
      return;
    }
    /* -1 et 5 : la video est prete mais ne demarre pas. On ne conclut pas
       tout de suite, le chien de garde tranchera. */
  }, []);

  const surErreur = useCallback((code: number) => {
    const raison =
      code === 100
        ? 'a ete retiree de YouTube'
        : code === 101 || code === 150
          ? "n'est pas autorisee hors de YouTube"
          : code === 2
            ? 'a un identifiant invalide'
            : 'est illisible';

    annulerMinuteurs();
    erreursDeSuite.current += 1;
    const d = demandeRef.current;
    const total = d?.tracks.length ?? 0;

    if (erreursDeSuite.current >= Math.max(2, total)) {
      setLecture((l) => ({
        ...l,
        etat: 'erreur',
        message: `Cette piste ${raison}. Aucune piste de cette liste n'est lisible.`
      }));
      return;
    }
    setLecture((l) => ({
      ...l,
      etat: 'erreur',
      message: `Cette piste ${raison}. Passage a la suivante.`
    }));
    suiteMinuteur.current = window.setTimeout(() => {
      suiteMinuteur.current = null;
      suivant();
    }, 1500);
  }, []);

  /* --- Chargement d'une piste -------------------------------------------- */

  const chargerPiste = useCallback(
    (tracks: readonly Track[], index: number, listeId: string, duGeste: boolean) => {
      const piste = tracks[index];
      if (!piste) return;

      demandeRef.current = { listeId, index, tracks, duGeste };
      annulerMinuteurs();

      if (!piste.youtubeId) {
        setLecture({
          etat: 'erreur',
          index,
          listeId,
          position: 0,
          duree: 0,
          message: "Cette piste n'a pas de video associee."
        });
        return;
      }

      setLecture({
        etat: 'chargement',
        index,
        listeId,
        position: 0,
        duree: 0,
        message: null
      });

      const p = playerRef.current;
      if (!p || !pretRef.current) return; /* onReady reprendra la demande. */

      p.loadVideoById(piste.youtubeId);
      if (duGeste) p.playVideo();

      /* LE CHIEN DE GARDE. Passe ce delai sans etat 1 ni 3, la lecture n'a pas
         demarre : soit le navigateur a refuse le son, soit la video reste en
         attente. On le DIT, au lieu d'afficher une fausse pause. */
      chienDeGarde.current = window.setTimeout(() => {
        chienDeGarde.current = null;
        const etatYt = playerRef.current?.getPlayerState?.() ?? -1;
        if (etatYt === 1 || etatYt === 3) return;
        setLecture((l) =>
          l.etat === 'chargement'
            ? { ...l, etat: 'bloque', message: 'Appuyez encore pour lancer le son.' }
            : l
        );
      }, 2600);
    },
    []
  );

  /* --- L'interface publique ---------------------------------------------- */

  /** Lance une piste. A appeler DANS le gestionnaire d'appui, pas apres. */
  const jouer = useCallback(
    (tracks: readonly Track[], index: number, listeId: string) => {
      if (tracks.length === 0) return;
      const i = Math.max(0, Math.min(index, tracks.length - 1));
      erreursDeSuite.current = 0;

      const d = demandeRef.current;
      const memeePiste = d?.listeId === listeId && d.index === i;

      /* REJOUER LA MEME PISTE MARCHE. L'ancien liait son chargement a
         l'identite de l'objet piste : redemander la meme ne changeait rien,
         donc rien ne se passait, sans un mot. Ici on regarde l'etat reel. */
      if (memeePiste && playerRef.current && pretRef.current) {
        const etatYt = playerRef.current.getPlayerState();
        if (etatYt === 2 || etatYt === 5 || etatYt === -1 || etatYt === 0) {
          playerRef.current.playVideo();
          setLecture((l) => ({ ...l, etat: 'chargement', message: null }));
          annulerMinuteurs();
          chienDeGarde.current = window.setTimeout(() => {
            chienDeGarde.current = null;
            const s = playerRef.current?.getPlayerState?.() ?? -1;
            if (s === 1 || s === 3) return;
            setLecture((l) =>
              l.etat === 'chargement'
                ? { ...l, etat: 'bloque', message: 'Appuyez encore pour lancer le son.' }
                : l
            );
          }, 2600);
          return;
        }
      }
      chargerPiste(tracks, i, listeId, true);
    },
    [chargerPiste, annulerMinuteurs]
  );

  /** Bascule lecture/pause sur la piste en cours. Toujours dans un geste. */
  const basculer = useCallback(() => {
    const p = playerRef.current;
    const d = demandeRef.current;
    if (!p || !pretRef.current || !d) return;

    /* ON INTERROGE LE LECTEUR, pas notre memoire. C'est toute la difference :
       l'ancien decidait de mettre en pause a partir d'un drapeau qui pouvait
       etre faux depuis une seconde. */
    const etatYt = p.getPlayerState();
    if (etatYt === 1) {
      p.pauseVideo();
      return;
    }
    p.playVideo();
    setLecture((l) => ({ ...l, etat: 'chargement', message: null }));
    annulerMinuteurs();
    chienDeGarde.current = window.setTimeout(() => {
      chienDeGarde.current = null;
      const s = playerRef.current?.getPlayerState?.() ?? -1;
      if (s === 1 || s === 3) return;
      setLecture((l) =>
        l.etat === 'chargement'
          ? { ...l, etat: 'bloque', message: 'Appuyez encore pour lancer le son.' }
          : l
      );
    }, 2600);
  }, [annulerMinuteurs]);

  const deplacer = useCallback((n: number) => {
    const d = demandeRef.current;
    if (!d || d.tracks.length === 0) return;
    const suivant = (d.index + n + d.tracks.length) % d.tracks.length;
    erreursDeSuite.current = 0;
    chargerPiste(d.tracks, suivant, d.listeId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargerPiste]);

  const suivant = useCallback(() => {
    const d = demandeRef.current;
    if (!d || d.tracks.length === 0) return;
    chargerPiste(d.tracks, (d.index + 1) % d.tracks.length, d.listeId, false);
  }, [chargerPiste]);

  const chercher = useCallback((secondes: number) => {
    playerRef.current?.seekTo(secondes, true);
  }, []);

  /* --- La progression ----------------------------------------------------- */

  useEffect(() => {
    if (lecture.etat !== 'joue') return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setLecture((l) => ({ ...l, position: p.getCurrentTime(), duree: p.getDuration() }));
    }, 500);
    return () => window.clearInterval(id);
  }, [lecture.etat]);

  return { lecture, jouer, basculer, deplacer, chercher };
}
