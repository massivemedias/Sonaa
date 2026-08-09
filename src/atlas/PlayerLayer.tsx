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
import './player-layer.css';

export interface Playback {
  familyIndex: number;
  genreLocal: number;
  trackIndex: number;
  /** Liste d'où vient la track : l'enchaînement reste dans celle-là. */
  list: 'essentiel' | 'actuel';
}

interface Props {
  /** Genre dont la colonne est ouverte, ou null. Change souvent : le contenu
      se remplace, la lecture continue. */
  panelGenre: { familyIndex: number; genreLocal: number } | null;
  onClose: () => void;
  onReopen: (familyIndex: number, genreLocal: number) => void;
  onGoToGenre: (familyIndex: number, genreLocal: number) => void;
  /** Une greffe pointe une famille : le clic vole vers elle. */
  onGoToFamily: (familyIndex: number) => void;
  /** Recadre la carte sur la famille entière sans toucher à la sélection. */
  onFrameFamily: (familyIndex: number) => void;
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

export function PlayerLayer({ panelGenre, onClose, onReopen, onGoToGenre, onGoToFamily, onFrameFamily }: Props) {
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
  const [tab, setTab] = useState<'essentiel' | 'actuel'>('essentiel');
  const [infoOpen, setInfoOpen] = useState(true);
  const [sheetPos, setSheetPos] = useState<SheetPos>('half');
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

  const panelActuel: Track[] = useMemo(() => {
    if (!panelGenre) return [];
    return genreOf(panelGenre.familyIndex, panelGenre.genreLocal)?.tracksActuel ?? [];
  }, [panelGenre]);

  const panelTracks: Track[] = useMemo(() => {
    if (!panelGenre) return [];
    const g = genreOf(panelGenre.familyIndex, panelGenre.genreLocal);
    if (!g) return [];
    return tab === 'actuel' && g.tracksActuel.length > 0 ? g.tracksActuel : g.tracksEssentiel;
  }, [panelGenre, tab]);

  const playedTracks: Track[] = useMemo(() => {
    if (!playback) return [];
    const g = genreOf(playback.familyIndex, playback.genreLocal);
    if (!g) return [];
    return playback.list === 'actuel' ? g.tracksActuel : g.tracksEssentiel;
  }, [playback]);

  const currentTrack = playback ? playedTracks[playback.trackIndex] : undefined;
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

  /* La colonne signale sa présence à la coquille : la carte se recadre par
     CSS (marge droite en desktop, zone haute en mobile selon la position de
     la feuille), le moteur suit par son observateur de taille. */
  useEffect(() => {
    const root = document.querySelector('.atlas-root');
    if (!root) return;
    if (panelGenre && !narrow) root.setAttribute('data-player-open', 'true');
    else root.removeAttribute('data-player-open');
    if (panelGenre && narrow) root.setAttribute('data-sheet-pos', sheetPos);
    else root.removeAttribute('data-sheet-pos');
    return () => {
      root.removeAttribute('data-player-open');
      root.removeAttribute('data-sheet-pos');
    };
  }, [panelGenre, narrow, sheetPos]);

  // Ouvrir une colonne remet la feuille mobile à mi-hauteur.
  useEffect(() => {
    if (panelGenre) setSheetPos('half');
  }, [panelGenre]);

  /* VUE DÉDOUBLÉE : la zone visible de la carte change quand la colonne
     s'ouvre ou que la feuille bouge. On recadre alors sur la FAMILLE du
     genre ouvert, après que l'observateur de taille du moteur a vu la
     nouvelle zone (deux frames). Le vol est celui du moteur, 850 ms. */
  useEffect(() => {
    if (!panelGenre) return;
    if (narrow && sheetPos === 'full') return; // carte couverte, rien à cadrer
    const id = window.setTimeout(() => onFrameFamily(panelGenre.familyIndex), 90);
    return () => window.clearTimeout(id);
  }, [panelGenre, sheetPos, narrow, onFrameFamily]);

  /* Le logotype ramène à l'accueil : si quelque chose joue sur mobile, la
     feuille passe en barre discrète, la lecture continue ; sinon la colonne
     se ferme. L'événement vient d'AtlasPage. */
  useEffect(() => {
    const onHome = (): void => {
      if (!panelGenre) return;
      if (narrow && playback) setSheetPos('bar');
      else onClose();
    };
    window.addEventListener('sonaa:home', onHome);
    return () => window.removeEventListener('sonaa:home', onHome);
  }, [panelGenre, narrow, playback, onClose]);

  // --- lecteur ------------------------------------------------------------

  const play = useCallback(
    (familyIndex: number, genreLocal: number, trackIndex: number, list: 'essentiel' | 'actuel') => {
      setPlayback({ familyIndex, genreLocal, trackIndex, list });
    },
    []
  );

  const step = useCallback((delta: number) => {
    setPlayback((p) => {
      if (!p) return p;
      const g = STRUCTURES[p.familyIndex]?.genres[p.genreLocal];
      const list = (p.list === 'actuel' ? g?.tracksActuel : g?.tracksEssentiel) ?? [];
      if (list.length === 0) return p;
      return { ...p, trackIndex: (p.trackIndex + delta + list.length) % list.length };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const slot = slotRef.current;
    if (!slot) return;

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
    // Monté une seule fois, volontairement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const seek = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const p = playerRef.current;
      if (!p || duration <= 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      p.seekTo(ratio * duration, true);
      setPosition(ratio * duration);
    },
    [duration]
  );

  const fullscreen = useCallback(() => {
    void wrapRef.current?.requestFullscreen?.();
  }, []);

  /* Position de l'iframe : sur la fenêtre média de la colonne quand la
     lecture est ici et visible, sur la barre sinon. Mesure au montage, au
     redimensionnement et au déplacement de la feuille. */
  useEffect(() => {
    const place = (): void => {
      const wrap = wrapRef.current;
      const slot = slotRef.current;
      if (!wrap || !slot) return;

      const media = mediaRef.current;
      const mediaVisible = media && panelGenre && playingHere && !(narrow && sheetPos === 'bar');
      if (mediaVisible && media) {
        const rect = media.getBoundingClientRect();
        wrap.style.opacity = '1';
        wrap.style.pointerEvents = 'auto';
        slot.style.width = `${rect.width}px`;
        slot.style.height = `${rect.height}px`;
        slot.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
        return;
      }
      if (playback) {
        wrap.style.opacity = '1';
        wrap.style.pointerEvents = 'none';
        slot.style.width = '78px';
        slot.style.height = '44px';
        slot.style.transform = 'translate3d(18px, calc(100dvh - 62px), 0)';
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
  }, [panelGenre, playingHere, playback, narrow, sheetPos]);

  // --- clavier ------------------------------------------------------------

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'Escape' && panelGenre) {
        event.preventDefault();
        onClose();
      }
      if (event.code === 'Space' && playback) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelGenre, playback, onClose, toggle]);

  // --- feuille mobile : glissement vertical entre les trois positions ------

  const onHandleDown = useCallback((event: React.PointerEvent) => {
    dragStart.current = { y: event.clientY, pos: sheetPos };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }, [sheetPos]);

  const onHandleMove = useCallback((event: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    const dy = event.clientY - start.y;
    const order: SheetPos[] = ['bar', 'half', 'full'];
    const idx = order.indexOf(start.pos);
    if (dy < -70 && idx < 2) {
      setSheetPos(order[idx + 1] ?? 'full');
      dragStart.current = null;
    } else if (dy > 70 && idx > 0) {
      setSheetPos(order[idx - 1] ?? 'bar');
      dragStart.current = null;
    }
  }, []);

  const onHandleUp = useCallback(() => {
    dragStart.current = null;
  }, []);

  // --- rendu --------------------------------------------------------------

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const currentList: 'essentiel' | 'actuel' =
    tab === 'actuel' && panelActuel.length > 0 ? 'actuel' : 'essentiel';

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

      {panelGenre && panelGenreData && panelFamily && (
        <aside
          className="pcol"
          data-sheet={narrow ? sheetPos : undefined}
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

          {/* Poignée de la feuille mobile. */}
          {narrow && (
            <button
              className="pcol-handle"
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onClick={() => setSheetPos(sheetPos === 'bar' ? 'half' : sheetPos === 'half' ? 'full' : 'half')}
              aria-label="Déplacer la feuille du lecteur"
            >
              <span aria-hidden="true" />
            </button>
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

            <div className="pcol-media" ref={mediaRef}>
              {!playingHere && shownInPanel && (
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
                  onClick={() => play(panelGenre.familyIndex, panelGenre.genreLocal, 0, currentList)}
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
            <div className="pcol-transport">
              <button onClick={() => step(-1)} disabled={!playingHere} aria-label="Précédente">⏮</button>
              <button
                className="pcol-main"
                onClick={() =>
                  playingHere
                    ? toggle()
                    : play(panelGenre.familyIndex, panelGenre.genreLocal, 0, currentList)
                }
                aria-label={playing && playingHere ? 'Pause' : 'Lecture'}
              >
                {playing && playingHere ? '❚❚' : '▶'}
              </button>
              <button onClick={() => step(1)} disabled={!playingHere} aria-label="Suivante">⏭</button>

              <span className="pcol-time">{playingHere ? mmss(position) : '0:00'}</span>
              <div
                className="pcol-bar"
                onClick={seek}
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

              <label className="pcol-volume">
                <span className="visually-hidden">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              </label>

              <button
                className="pcol-fullscreen"
                onClick={fullscreen}
                disabled={!playingHere}
                aria-label="Plein écran"
                title="Plein écran"
              >
                ⛶
              </button>
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


            {panelActuel.length > 0 && (
              <div className="pcol-tabs" role="tablist" aria-label="Sélection de tracks">
                <button
                  role="tab"
                  aria-selected={currentList === 'essentiel'}
                  onClick={() => setTab('essentiel')}
                >
                  Essentiel
                </button>
                <button
                  role="tab"
                  aria-selected={currentList === 'actuel'}
                  onClick={() => setTab('actuel')}
                >
                  Actuel
                </button>
              </div>
            )}

            {/* La liste verticale : AUCUNE ligne muette. Chaque track affiche
                titre, artiste, année, label et catalogue quand ils existent.
                La track en cours reste distinguée et plus détaillée (sa durée
                est la seule que le lecteur connaît, on n'invente pas les
                autres). */}
            <ul className="pcol-list">
              {panelTracks.map((track, i) => {
                const active = playingHere && playback?.trackIndex === i;
                const meta: string[] = [];
                const y = track.release?.year ?? track.year;
                if (y) meta.push(String(y));
                if (track.release?.label) meta.push(track.release.label);
                if (track.release?.catno) meta.push(track.release.catno);
                return (
                  <li key={track.id}>
                    <button
                      className="pcol-row"
                      data-active={active}
                      onClick={() =>
                        play(panelGenre.familyIndex, panelGenre.genreLocal, i, currentList)
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
                        <strong>{track.title}</strong>
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
                    {panelGenreData.redaction === 'brouillon' && (
                      <p className="pcol-draft">fiche en brouillon, à relire</p>
                    )}
                    {panelGenreData.description && (
                      <p className="pcol-description">{panelGenreData.description}</p>
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
                const shared = [...panelGenreData.tracksEssentiel, ...panelGenreData.tracksActuel].filter(
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

          </div>


          <button className="pcol-close" onClick={onClose} aria-label="Fermer la colonne (Échap)">
            ✕
          </button>
        </aside>
      )}

      {/* Barre discrète : la lecture continue, colonne fermée. */}
      {playback && !panelGenre && currentTrack && (
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
          <div className="mini-bar" onClick={seek} role="presentation">
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
