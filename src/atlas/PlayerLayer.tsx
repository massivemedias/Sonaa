/* Panneau morceaux flottant, et lecteur persistant.

   La plaque est rendue en WebGL, dans la scène. Ce fichier ne dessine que ce
   qui ne peut pas l'être : le texte, les commandes, et surtout la fenêtre
   vidéo. Une iframe ne peut pas se rendre dans une texture WebGL, donc elle se
   superpose au canvas en reprenant exactement la transformation de la plaque,
   inclinaison comprise.

   Deux contraintes ont dicté la structure :

   1. L'iframe ne doit JAMAIS être démontée ni reparentée, sinon la lecture
      s'arrête. Elle vit donc dans un conteneur de premier niveau, monté une
      fois, qu'on déplace par transformation vers la fenêtre du panneau ou vers
      le mini-lecteur. Rien d'autre ne la touche.

   2. La géométrie du panneau change à chaque image pendant un vol de caméra.
      La faire passer par un état React ferait un rendu complet soixante fois
      par seconde. Elle passe donc par un bus impératif : React ne se rerend
      que quand le genre change, la position est appliquée en style direct. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES, type Track } from './structures.ts';
import { ProceduralCover } from './ProceduralCover.tsx';
import type { PanelState } from './webgl.ts';
import './player-layer.css';

export interface PanelBus {
  current: PanelState | null;
  listeners: Set<(state: PanelState | null) => void>;
}

export interface Playback {
  familyIndex: number;
  genreLocal: number;
  trackIndex: number;
  /** Liste d'où vient le morceau : l'enchaînement reste dans celle-là. */
  list: 'essentiel' | 'actuel';
}

interface Props {
  bus: PanelBus;
  /** Genre dont le panneau est ouvert, ou null. Change rarement. */
  panelGenre: { familyIndex: number; genreLocal: number } | null;
  onClose: () => void;
  /** Le mini-lecteur demande de revenir au panneau du genre en cours. */
  onReopen: (familyIndex: number, genreLocal: number) => void;
}

/* Perspective du panneau. Assez longue pour que l'inclinaison se sente sans
   déformer le texte. */
const PERSPECTIVE = 1600;
/** Marge intérieure de la plaque, en fraction de sa largeur. */
const PAD = 0.055;

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

/** Charge l'API IFrame officielle, une seule fois pour toute la page. */
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

export function PlayerLayer({ bus, panelGenre, onClose, onReopen }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [playback, setPlayback] = useState<Playback | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [expanded, setExpanded] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  /* Deux listes : les fondateurs du genre, et les sorties récentes. L'onglet ne
     s'affiche que si la seconde contient quelque chose, sinon on promettrait une
     vue morte : elle demande la YouTube Data API et donc une clé. */
  const [tab, setTab] = useState<'essentiel' | 'actuel'>('essentiel');

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

  /* La lecture suit sa propre liste : changer d'onglet ne doit pas couper le
     morceau en cours. On retrouve donc le morceau joué dans les deux listes. */
  const playedTracks: Track[] = useMemo(() => {
    if (!playback) return [];
    const g = genreOf(playback.familyIndex, playback.genreLocal);
    if (!g) return [];
    return playback.list === 'actuel' ? g.tracksActuel : g.tracksEssentiel;
  }, [playback]);

  const currentTrack = playback ? playedTracks[playback.trackIndex] : undefined;

  const panelGenreData = panelGenre
    ? STRUCTURES[panelGenre.familyIndex]?.genres[panelGenre.genreLocal]
    : undefined;
  const panelFamily = panelGenre ? FAMILIES[panelGenre.familyIndex] : undefined;

  /* Le morceau montré dans la fenêtre du panneau : celui qui joue s'il
     appartient à ce genre, sinon le premier de la liste, en pochette. */
  const shownInPanel: Track | undefined =
    playback &&
    panelGenre &&
    playback.familyIndex === panelGenre.familyIndex &&
    playback.genreLocal === panelGenre.genreLocal
      ? currentTrack
      : panelTracks[0];

  const playingHere =
    Boolean(playback) &&
    Boolean(panelGenre) &&
    playback?.familyIndex === panelGenre?.familyIndex &&
    playback?.genreLocal === panelGenre?.genreLocal;

  // --- lecteur ------------------------------------------------------------

  const play = useCallback(
    (familyIndex: number, genreLocal: number, trackIndex: number, list: 'essentiel' | 'actuel') => {
      setPlayback({ familyIndex, genreLocal, trackIndex, list });
    },
    []
  );

  const step = useCallback(
    (delta: number) => {
      setPlayback((p) => {
        if (!p) return p;
        const g = STRUCTURES[p.familyIndex]?.genres[p.genreLocal];
        const list = (p.list === 'actuel' ? g?.tracksActuel : g?.tracksEssentiel) ?? [];
        if (list.length === 0) return p;
        return { ...p, trackIndex: (p.trackIndex + delta + list.length) % list.length };
      });
    },
    []
  );

  // Création unique du lecteur. Le noeud cible est créé impérativement :
  // React ne doit jamais réconcilier ce que l'API IFrame remplace.
  useEffect(() => {
    let cancelled = false;
    const slot = slotRef.current;
    if (!slot) return;

    const mount = document.createElement('div');
    mount.className = 'yt-mount';
    slot.appendChild(mount);
    mountRef.current = mount;

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
              // 1 lecture, 2 pause, 0 fin.
              if (event.data === 1) setPlaying(true);
              if (event.data === 2) setPlaying(false);
              if (event.data === 0) {
                setPlaying(false);
                step(1);
              }
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

  // Changement de morceau.
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

  // Horloge de la barre de défilement. Quatre fois par seconde suffit.
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

  // --- géométrie, appliquée en impératif ----------------------------------

  useEffect(() => {
    const apply = (state: PanelState | null): void => {
      const wrap = wrapRef.current;
      const slot = slotRef.current;
      const panel = panelRef.current;
      if (!wrap || !slot) return;

      const inPanel = Boolean(state?.visible) && Boolean(panelGenre);

      if (inPanel && state) {
        const w = state.width;
        const h = state.height;
        const pad = w * PAD;
        const videoW = w - pad * 2;
        const videoH = expanded ? h - pad * 2 : (videoW * 9) / 16;
        // Décalage du centre de la fenêtre vidéo par rapport au centre de la
        // plaque, dans le repère de la plaque.
        const dy = -h / 2 + pad + videoH / 2;

        wrap.style.transform =
          `translate3d(${state.x}px, ${state.y}px, 0) ` +
          `perspective(${PERSPECTIVE}px) rotateX(${state.tiltDeg}deg)`;
        wrap.style.opacity = '1';
        wrap.style.pointerEvents = 'auto';
        slot.style.width = `${videoW}px`;
        slot.style.height = `${videoH}px`;
        slot.style.transform = `translate3d(${-videoW / 2}px, ${dy - videoH / 2}px, 0)`;

        if (panel) {
          panel.style.transform =
            `translate3d(${state.x}px, ${state.y}px, 0) ` +
            `perspective(${PERSPECTIVE}px) rotateX(${state.tiltDeg}deg)`;
          panel.style.width = `${w}px`;
          panel.style.height = `${h}px`;
          panel.style.marginLeft = `${-w / 2}px`;
          panel.style.marginTop = `${-h / 2}px`;
          // Tout le texte est dimensionné à partir de la plaque : le panneau
          // grandit et rétrécit d'une seule pièce quand on avance.
          panel.style.setProperty('--panel-w', `${w}px`);
          panel.style.setProperty('--panel-pad', `${pad}px`);
          panel.style.setProperty('--video-h', `${videoH}px`);
          panel.style.opacity = '1';
        }
        return;
      }

      // Hors panneau : la fenêtre vidéo rejoint le mini-lecteur.
      if (panel) panel.style.opacity = '0';
      if (playback) {
        wrap.style.transform = 'translate3d(0, 0, 0)';
        wrap.style.opacity = '1';
        wrap.style.pointerEvents = 'none';
        slot.style.width = '78px';
        slot.style.height = '44px';
        slot.style.transform = 'translate3d(18px, calc(100vh - 62px), 0)';
      } else {
        wrap.style.opacity = '0';
        wrap.style.pointerEvents = 'none';
      }
    };

    apply(bus.current);
    bus.listeners.add(apply);
    return () => {
      bus.listeners.delete(apply);
    };
  }, [bus, panelGenre, expanded, playback]);

  // --- clavier ------------------------------------------------------------

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'Escape' && panelGenre) {
        event.preventDefault();
        setExpanded(false);
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

  // --- rendu --------------------------------------------------------------

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const currentList: 'essentiel' | 'actuel' =
    tab === 'actuel' && panelActuel.length > 0 ? 'actuel' : 'essentiel';

  return (
    <>
      {/* Conteneur de l'iframe. Monté une fois, jamais démonté : c'est ce qui
          permet à la lecture de survivre à la fermeture du panneau. */}
      <div ref={wrapRef} className="yt-wrap" aria-hidden={!playback}>
        <div ref={slotRef} className="yt-slot" data-idle={!playback} />
      </div>

      {panelGenre && panelGenreData && panelFamily && (
        <div
          ref={panelRef}
          className="panel"
          data-expanded={expanded}
          style={{ ['--family' as string]: `oklch(0.72 0.15 ${panelFamily.hue})` }}
        >
          {/* Fenêtre vidéo : au repos la pochette, en lecture la vidéo, au
              même endroit et au même gabarit. */}
          <div className="panel-window">
            {/* Ni pochette iTunes ni vignette de vidéo : on en dessine une
                plutôt que de laisser un trou ou une image cassée. */}
            {!playingHere && shownInPanel && (
              shownInPanel.cover ? (
                <img
                  className="panel-cover"
                  src={shownInPanel.cover}
                  alt={`Pochette de ${shownInPanel.title}`}
                  draggable={false}
                />
              ) : (
                <span className="panel-cover panel-cover-generated">
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
                className="panel-bigplay"
                onClick={() => play(panelGenre.familyIndex, panelGenre.genreLocal, 0, currentList)}
                aria-label={`Lire ${shownInPanel.title}`}
              >
                ▶
              </button>
            )}
            {apiFailed && (
              <p className="panel-failed">
                Le lecteur YouTube n&apos;a pas pu se charger. La pochette reste affichée.
              </p>
            )}
          </div>

          <div className="panel-body">
            {/* La greffe est nommée ici : c'est la seule trace visible qu'un
                genre descend aussi d'une autre famille. */}
            <p className="panel-genre">
              {panelFamily.label}
              {panelGenreData.externalParents.length > 0 && (
                <> · greffe {panelGenreData.externalParents.map((x) => x.label).join(', ')}</>
              )}{' '}
              {panelGenreData.bpmRange
                ? ` · ${panelGenreData.bpmRange[0]}-${panelGenreData.bpmRange[1]} BPM`
                : ''}
            </p>
            <h2 className="panel-title">{shownInPanel ? shownInPanel.title : panelGenreData.label}</h2>
            <p className="panel-artist">
              {shownInPanel ? shownInPanel.artist : `${panelTracks.length} morceaux`}
            </p>
            {/* Album et non label de disque : le label demanderait un jeton
                Discogs, et nommer « label » ce qui est un album serait faux. */}
            <p className="panel-meta">
              {shownInPanel?.album ? `Album ${shownInPanel.album}` : panelGenreData.label}
              {shownInPanel?.year ? ` · ${shownInPanel.year}` : ''}
            </p>

            {/* L'onglet Actuel n'existe que s'il a du contenu. */}
            {panelActuel.length > 0 && (
              <div className="panel-tabs" role="tablist" aria-label="Sélection de morceaux">
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

            <ul className="panel-strip">
              {panelTracks.map((track, i) => (
                <li key={track.id}>
                  <button
                    className="panel-thumb"
                    data-active={playingHere && playback?.trackIndex === i}
                    onClick={() => play(panelGenre.familyIndex, panelGenre.genreLocal, i, currentList)}
                    aria-label={`Lire ${track.title} de ${track.artist}`}
                    title={`${track.artist} - ${track.title}`}
                  >
                    {track.cover ? (
                      <img src={track.cover} alt="" draggable={false} />
                    ) : (
                      <ProceduralCover
                        artist={track.artist}
                        title={track.title}
                        hue={panelFamily.hue}
                        size={120}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <div className="panel-transport">
              <button onClick={() => step(-1)} disabled={!playingHere} aria-label="Précédent">⏮</button>
              <button
                className="panel-main"
                onClick={() =>
                  playingHere ? toggle() : play(panelGenre.familyIndex, panelGenre.genreLocal, 0, currentList)
                }
                aria-label={playing && playingHere ? 'Pause' : 'Lecture'}
              >
                {playing && playingHere ? '❚❚' : '▶'}
              </button>
              <button onClick={() => step(1)} disabled={!playingHere} aria-label="Suivant">⏭</button>

              <span className="panel-time">{playingHere ? mmss(position) : '0:00'}</span>
              <div
                className="panel-bar"
                onClick={seek}
                role="slider"
                tabIndex={0}
                aria-label="Position dans le morceau"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration)}
                aria-valuenow={Math.floor(position)}
              >
                <div className="panel-bar-fill" style={{ width: `${playingHere ? progress : 0}%` }} />
              </div>
              <span className="panel-time">{playingHere ? mmss(duration) : '0:00'}</span>

              <label className="panel-volume">
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
                className="panel-expand"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Réduire la vidéo' : 'Agrandir la vidéo'}
                title={expanded ? 'Réduire la vidéo' : 'Agrandir la vidéo'}
              >
                {expanded ? '⤢' : '⤡'}
              </button>
            </div>
          </div>

          <button className="panel-close" onClick={onClose} aria-label="Fermer (Échap)">
            ✕
          </button>
        </div>
      )}

      {/* Mini-lecteur : la lecture continue quand on remonte dans l'atlas. */}
      {playback && !panelGenre && currentTrack && (
        <div className="mini" role="region" aria-label="Lecture en cours">
          <button
            className="mini-back"
            onClick={() => onReopen(playback.familyIndex, playback.genreLocal)}
            aria-label="Revenir au panneau du genre"
          >
            <span className="mini-slot" aria-hidden="true" />
            <span className="mini-text">
              <strong>{currentTrack.title}</strong>
              <span>{currentTrack.artist}</span>
            </span>
          </button>

          <span className="mini-transport">
            <button onClick={() => step(-1)} aria-label="Précédent">⏮</button>
            <button onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button onClick={() => step(1)} aria-label="Suivant">⏭</button>
          </span>

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
