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
import { t } from '../langue/langue.ts';

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
              ? t.lecteurBloque
              : t.lecteurIndisponible
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
        ? t.erreurRetiree
        : code === 101 || code === 150
          ? t.erreurNonAutorisee
          : code === 2
            ? t.erreurIdentifiant
            : t.erreurIllisible;

    annulerMinuteurs();
    erreursDeSuite.current += 1;
    const d = demandeRef.current;
    const total = d?.tracks.length ?? 0;

    if (erreursDeSuite.current >= Math.max(2, total)) {
      setLecture((l) => ({
        ...l,
        etat: 'erreur',
        message: `${t.cettePiste} ${raison}. ${t.aucuneLisible}`
      }));
      return;
    }
    setLecture((l) => ({
      ...l,
      etat: 'erreur',
      message: `${t.cettePiste} ${raison}. ${t.passageSuivant}`
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
          message: t.sansVideo
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

      /* CE QUE LE SYSTEME AFFICHERA. Sans cela, le centre de controle de macOS
         montre « sonaa.ca » et un carre vide ; avec, il montre le morceau et
         sa pochette. La pochette est celle que le site sert deja, donc aucun
         appel supplementaire. */
      const ms = navigator.mediaSession;
      if (ms && typeof MediaMetadata === 'function') {
        const art = piste.cover
          ? [{ src: new URL(piste.cover, window.location.href).href, sizes: '512x512', type: 'image/jpeg' }]
          : [];
        ms.metadata = new MediaMetadata({
          title: piste.title,
          artist: piste.artist,
          album: 'SONAA',
          artwork: art
        });
      }

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
            ? { ...l, etat: 'bloque', message: t.appuyezEncore }
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
                ? { ...l, etat: 'bloque', message: t.appuyezEncore }
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
          ? { ...l, etat: 'bloque', message: t.appuyezEncore }
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
    const p = playerRef.current;
    if (!p || !pretRef.current) return;
    const cible = Math.max(0, secondes);
    p.seekTo(cible, true);
    /* ON AFFICHE LA POSITION DEMANDEE TOUT DE SUITE, et ce n'est pas le
       mensonge que le reste de ce fichier combat.

       La difference est nette : dire « ca joue » sans que YouTube l'ait
       confirme est une AFFIRMATION sur un etat qu'on ne controle pas ; dire
       « on est a 0:37 » apres avoir ordonne d'y aller est le compte rendu
       d'un ordre qui a ete donne. Le releve periodique corrigera des que la
       lecture reprend.

       DEFAUT QUE CELA REPARE : on tirait jusqu'a 0:37, on relachait, et la
       barre revenait a 0:00, parce que la position n'etait suivie qu'en
       lecture. Le geste semblait n'avoir servi a rien. */
    setLecture((l) => ({ ...l, position: cible }));
  }, []);

  /* --- La progression ----------------------------------------------------- */

  /* LA DUREE SE LIT DES QUE LA VIDEO EST CHARGEE, pas seulement pendant la
     lecture.

     Defaut constate : en pause, ou apres un demarrage refuse par le
     navigateur, la barre affichait « --:-- » et refusait qu'on la tire. La
     video etait pourtant chargee et sa duree connue. On ne pouvait donc pas
     se placer dans un morceau avant de le lancer, ce qui est exactement le
     geste qu'on fait quand on veut entendre un passage precis.

     LA POSITION, elle, ne se rafraichit qu'en lecture : la relire en pause
     ferait sauter la poignee sous le doigt pendant qu'on la tire. */
  useEffect(() => {
    if (lecture.listeId === null) return;
    const relever = (): void => {
      const p = playerRef.current;
      if (!p || !pretRef.current) return;
      const d = p.getDuration();
      const enLecture = p.getPlayerState() === 1;
      setLecture((l) => {
        const duree = Number.isFinite(d) && d > 0 ? d : l.duree;
        const position = enLecture ? p.getCurrentTime() : l.position;
        if (duree === l.duree && position === l.position) return l;
        return { ...l, duree, position };
      });
    };
    relever();
    const id = window.setInterval(relever, 500);
    return () => window.clearInterval(id);
  }, [lecture.listeId, lecture.index]);

  /* L'etat courant, lisible par les rappels du systeme sans les recreer a
     chaque seconde : les reattacher a chaque changement de position ferait
     huit ecritures par seconde dans la session multimedia. */
  const lectureRef = useRef(lecture);
  lectureRef.current = lecture;

  /* --- REPRENDRE LA SESSION MULTIMEDIA A L'IFRAME ------------------------- */

  /* POURQUOI LES TOUCHES DU MAC NE MARCHAIENT PAS, ET CE QUE CE SILENCE COUTE.

     Declarer les commandes ne suffisait pas, et Mika l'a constate : les
     touches restaient sans effet. La raison est que le son ne sort pas de
     notre page mais d'une iframe YouTube, qui declare SA propre session
     multimedia. Le systeme envoie donc la touche a YouTube, qui ne connait ni
     notre liste ni notre morceau suivant, et il ne se passe rien.

     ON REPREND LA SESSION avec un element audio silencieux joue par la page
     elle-meme. C'est un procede connu et un peu brutal, mais il n'y a pas
     d'autre porte : la propriete de la session appartient a qui joue du son,
     et il faut donc jouer du son.

     LE SILENCE EST UN VRAI FICHIER, une seconde de rien en WAV, pose en ligne
     dans le code plutot que servi : quelques centaines d'octets valent mieux
     qu'une requete reseau qui peut echouer.

     IL NE DEMARRE QU'AVEC LA LECTURE et s'arrete avec elle. Le laisser tourner
     en permanence ferait apparaitre SONAA dans le centre de controle du Mac
     alors que rien ne joue, ce qui est pire que le defaut qu'on repare. */
  const silence = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (lecture.listeId === null) {
      silence.current?.pause();
      return;
    }
    if (!silence.current) {
      /* Une seconde de silence, 8 kHz mono : l'entete WAV suivi de zeros. */
      const octets = 8000;
      const buf = new Uint8Array(44 + octets);
      const vue = new DataView(buf.buffer);
      const txt = (o: number, t: string): void => {
        for (let i = 0; i < t.length; i += 1) vue.setUint8(o + i, t.charCodeAt(i));
      };
      txt(0, 'RIFF');
      vue.setUint32(4, 36 + octets, true);
      txt(8, 'WAVEfmt ');
      vue.setUint32(16, 16, true);
      vue.setUint16(20, 1, true);
      vue.setUint16(22, 1, true);
      vue.setUint32(24, 8000, true);
      vue.setUint32(28, 8000, true);
      vue.setUint16(32, 1, true);
      vue.setUint16(34, 8, true);
      txt(36, 'data');
      vue.setUint32(40, octets, true);
      buf.fill(128, 44);
      const a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      a.loop = true;
      a.volume = 0;
      /* ATTACHE AU DOCUMENT, alors qu'un element audio detache jouerait tout
         aussi bien. La raison n'est pas technique, elle est de verification :
         detache, il est invisible a l'inspection et on ne peut pas dire s'il
         joue. Ma premiere sonde a d'ailleurs conclu « aucun audio » alors que
         le code etait bon. Ce qu'on ne peut pas observer, on ne peut pas le
         corriger. */
      a.setAttribute('data-role', 'silence-session');
      a.style.display = 'none';
      document.body.appendChild(a);
      silence.current = a;
    }
    void silence.current.play().catch(() => {
      /* Refuse faute de geste : la lecture YouTube vient d'un appui, donc le
         geste existe. Si le navigateur refuse quand meme, on perd les touches
         mais rien d'autre. */
    });
    return () => {
      silence.current?.pause();
    };
  }, [lecture.listeId]);

  /* --- LES TOUCHES MULTIMEDIA DU CLAVIER --------------------------------- */

  /* CE QUI FAIT MARCHER LES TOUCHES DU MACBOOK, et pourquoi ce n'est pas un
     ecouteur de clavier.

     Les touches lecture, precedent et suivant d'un Mac ne produisent AUCUN
     evenement clavier dans la page : le systeme les intercepte avant. Un
     addEventListener('keydown') ne les verra jamais, quel que soit le code
     qu'on y cherche. Elles passent par une autre porte, la session
     multimedia, que le navigateur expose au systeme.

     ON DECLARE DONC CE QU'ON SAIT FAIRE, et le systeme appelle. Au passage,
     la meme declaration alimente l'ecran de verrouillage, le centre de
     controle, et les commandes des ecouteurs Bluetooth : c'est la meme
     mecanique.

     LA METADONNEE N'EST PAS DECORATIVE. Sans titre ni pochette, macOS affiche
     « sonaa.ca » et une page blanche dans son centre de controle. Avec, il
     affiche le morceau. On la tient donc a jour a chaque changement de piste. */
  useEffect(() => {
    const ms = navigator.mediaSession;
    if (!ms) return;

    const poser = (
      action: MediaSessionAction,
      h: MediaSessionActionHandler | null
    ): void => {
      try {
        ms.setActionHandler(action, h);
      } catch {
        /* Une action que ce navigateur ne connait pas leve : on l'ignore
           plutot que de perdre les autres, qui sont peut-etre supportees. */
      }
    };

    poser('play', () => basculer());
    poser('pause', () => basculer());
    poser('previoustrack', () => deplacer(-1));
    poser('nexttrack', () => deplacer(1));
    poser('seekbackward', (d) => chercher(Math.max(0, lectureRef.current.position - (d.seekOffset ?? 10))));
    poser('seekforward', (d) => chercher(lectureRef.current.position + (d.seekOffset ?? 10)));
    poser('seekto', (d) => {
      if (typeof d.seekTime === 'number') chercher(d.seekTime);
    });
    poser('stop', () => {
      playerRef.current?.pauseVideo();
    });

    return () => {
      for (const a of [
        'play',
        'pause',
        'previoustrack',
        'nexttrack',
        'seekbackward',
        'seekforward',
        'seekto',
        'stop'
      ] as MediaSessionAction[]) {
        poser(a, null);
      }
    };
  }, [basculer, deplacer, chercher]);

  useEffect(() => {
    const ms = navigator.mediaSession;
    if (!ms) return;
    ms.playbackState =
      lecture.etat === 'joue' ? 'playing' : lecture.etat === 'inactif' ? 'none' : 'paused';
  }, [lecture.etat]);

  return { lecture, jouer, basculer, deplacer, chercher };
}
