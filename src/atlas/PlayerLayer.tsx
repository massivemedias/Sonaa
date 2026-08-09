/* Le lecteur. Panneau rectangulaire DROIT, face caméra, aligné sur la grille
   de l'écran (ADR-042) : la plaque inclinée dans la scène est abandonnée, la
   3D recule et s'estompe derrière.

   Colonne gauche : la pochette carrée en grand, la vidéo prend sa place en
   lecture. Colonne droite : le titre, l'artiste, LE GENRE en couleur de
   famille et cliquable vers la fiche, l'année, le label, le numéro de
   catalogue, le pays, le format, la tonalité et le BPM quand ils existent,
   puis la liste verticale des autres tracks du genre. Transport en bas,
   pleine largeur.

   Une contrainte a survécu à la refonte : l'iframe YouTube ne doit JAMAIS
   être démontée ni reparentée, sinon la lecture s'arrête. Elle vit dans un
   conteneur de premier niveau, monté une fois, positionné par mesure sur la
   fenêtre média du panneau ou sur le mini-lecteur. */

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
  /** Genre dont le panneau est ouvert, ou null. Change rarement. */
  panelGenre: { familyIndex: number; genreLocal: number } | null;
  onClose: () => void;
  /** Le mini-lecteur demande de revenir au panneau du genre en cours. */
  onReopen: (familyIndex: number, genreLocal: number) => void;
  /** Une track charnière mène à l'autre genre qui la revendique. */
  onGoToGenre: (familyIndex: number, genreLocal: number) => void;
  /** Le nom du genre sur le panneau ouvre sa fiche. */
  onShowCard: (familyIndex: number, genreLocal: number) => void;
}

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

export function PlayerLayer({ panelGenre, onClose, onReopen, onGoToGenre, onShowCard }: Props) {
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

  /* La lecture suit sa propre liste : changer d'onglet ne coupe pas la track
     en cours. */
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

  const playingHere =
    Boolean(playback) &&
    Boolean(panelGenre) &&
    playback?.familyIndex === panelGenre?.familyIndex &&
    playback?.genreLocal === panelGenre?.genreLocal;

  /* La track mise en avant : celle qui joue si elle est de ce genre, sinon
     la première de la liste. */
  const shownInPanel: Track | undefined = playingHere ? currentTrack : panelTracks[0];

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

  // Création unique du lecteur. Le noeud cible est créé impérativement :
  // React ne doit jamais réconcilier ce que l'API IFrame remplace.
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

  // Changement de track.
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

  const fullscreen = useCallback(() => {
    void wrapRef.current?.requestFullscreen?.();
  }, []);

  /* Position de l'iframe : mesurée sur la fenêtre média du panneau quand il
     est ouvert et que la lecture est ici, sur le mini-lecteur sinon. Le
     panneau est une boîte fixe : une mesure au montage et au resize suffit,
     plus aucune géométrie par image. */
  useEffect(() => {
    const place = (): void => {
      const wrap = wrapRef.current;
      const slot = slotRef.current;
      if (!wrap || !slot) return;

      const media = mediaRef.current;
      if (media && panelGenre && playingHere) {
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
    window.addEventListener('resize', place);
    const observer = mediaRef.current ? new ResizeObserver(place) : null;
    if (mediaRef.current && observer) observer.observe(mediaRef.current);
    return () => {
      window.removeEventListener('resize', place);
      observer?.disconnect();
    };
  }, [panelGenre, playingHere, playback]);

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

  // --- rendu --------------------------------------------------------------

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const currentList: 'essentiel' | 'actuel' =
    tab === 'actuel' && panelActuel.length > 0 ? 'actuel' : 'essentiel';

  /* Champs de sortie : seulement ce qui existe, jamais de gabarit vide. */
  const releaseLine = (track: Track | undefined): string[] => {
    if (!track) return [];
    const parts: string[] = [];
    const r = track.release;
    const year = r?.year ?? track.year;
    if (year) parts.push(String(year));
    if (r?.label) parts.push(r.label);
    if (r?.catno) parts.push(r.catno);
    if (r?.country) parts.push(r.country);
    if (r?.format) parts.push(r.format);
    if (!r && track.album) parts.push(`Album ${track.album}`);
    return parts;
  };

  return (
    <>
      {/* Conteneur de l'iframe. Monté une fois, jamais démonté : c'est ce qui
          permet à la lecture de survivre à la fermeture du panneau. */}
      <div ref={wrapRef} className="yt-wrap" aria-hidden={!playback}>
        <div ref={slotRef} className="yt-slot" data-idle={!playback} />
      </div>

      {panelGenre && panelGenreData && panelFamily && (
        <>
          <div className="panel-backdrop" onClick={onClose} aria-hidden="true" />
          <section
            className="panel"
            role="dialog"
            aria-label={`Tracks du genre ${panelGenreData.label}`}
            style={{ ['--family' as string]: `oklch(0.72 0.15 ${panelFamily.hue})` }}
          >
            <div className="panel-columns">
              {/* Colonne gauche : la pochette carrée en grand. La vidéo prend
                  sa place en lecture, même boîte, rien ne saute. */}
              <div className="panel-media" ref={mediaRef}>
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

              {/* Colonne droite : l'identité de la track, puis la liste. */}
              <div className="panel-body">
                <h2 className="panel-title">
                  {shownInPanel ? shownInPanel.title : panelGenreData.label}
                </h2>
                <p className="panel-artist">
                  {shownInPanel ? shownInPanel.artist : `${panelTracks.length} tracks`}
                </p>

                <p className="panel-genre">
                  <button
                    className="panel-genre-name"
                    onClick={() => onShowCard(panelGenre.familyIndex, panelGenre.genreLocal)}
                    title="Ouvrir la fiche du genre"
                  >
                    {panelGenreData.label}
                  </button>
                  <span className="panel-genre-meta">{panelFamily.label}</span>
                </p>

                {releaseLine(shownInPanel).length > 0 && (
                  <p className="panel-release">{releaseLine(shownInPanel).join(' · ')}</p>
                )}
                {(shownInPanel?.key || panelGenreData.bpmRange) && (
                  <p className="panel-keybpm">
                    {shownInPanel?.key ? `Tonalité ${shownInPanel.key}` : ''}
                    {shownInPanel?.key && panelGenreData.bpmRange ? ' · ' : ''}
                    {panelGenreData.bpmRange
                      ? `${panelGenreData.bpmRange[0]}-${panelGenreData.bpmRange[1]} BPM`
                      : ''}
                  </p>
                )}

                {shownInPanel && shownInPanel.sharedWith.length > 0 && (
                  <p className="panel-shared">
                    aussi revendiquée par{' '}
                    {shownInPanel.sharedWith.map((x, i) => (
                      <span key={`${x.familyIndex}-${x.genreLocal}`}>
                        {i > 0 && ', '}
                        <button
                          className="panel-shared-link"
                          onClick={() => onGoToGenre(x.familyIndex, x.genreLocal)}
                        >
                          {x.label}
                        </button>
                      </span>
                    ))}
                  </p>
                )}

                {panelActuel.length > 0 && (
                  <div className="panel-tabs" role="tablist" aria-label="Sélection de tracks">
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

                {/* La liste VERTICALE des tracks du genre : petite pochette,
                    titre, artiste. Plus de bande de vignettes. */}
                <ul className="panel-list">
                  {panelTracks.map((track, i) => (
                    <li key={track.id}>
                      <button
                        className="panel-row"
                        data-active={playingHere && playback?.trackIndex === i}
                        onClick={() =>
                          play(panelGenre.familyIndex, panelGenre.genreLocal, i, currentList)
                        }
                        aria-label={`Lire ${track.title} de ${track.artist}`}
                      >
                        <span className="panel-row-cover" aria-hidden="true">
                          {track.cover ? (
                            <img src={track.cover} alt="" draggable={false} />
                          ) : (
                            <ProceduralCover
                              artist={track.artist}
                              title={track.title}
                              hue={panelFamily.hue}
                              size={88}
                            />
                          )}
                        </span>
                        <span className="panel-row-text">
                          <strong>{track.title}</strong>
                          <span>{track.artist}</span>
                        </span>
                        {track.year && <span className="panel-row-year">{track.year}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Transport pleine largeur, en bas. */}
            <div className="panel-transport">
              <button onClick={() => step(-1)} disabled={!playingHere} aria-label="Précédente">⏮</button>
              <button
                className="panel-main"
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

              <span className="panel-time">{playingHere ? mmss(position) : '0:00'}</span>
              <div
                className="panel-bar"
                onClick={seek}
                role="slider"
                tabIndex={0}
                aria-label="Position dans la track"
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
                className="panel-fullscreen"
                onClick={fullscreen}
                disabled={!playingHere}
                aria-label="Plein écran"
                title="Plein écran"
              >
                ⛶
              </button>
              {shownInPanel && (
                <a
                  className="panel-youtube"
                  href={`https://www.youtube.com/watch?v=${shownInPanel.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ouvrir sur YouTube"
                >
                  YouTube ↗
                </a>
              )}
            </div>

            <button className="panel-close" onClick={onClose} aria-label="Fermer (Échap)">
              ✕
            </button>
          </section>
        </>
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
            <button onClick={() => step(-1)} aria-label="Précédente">⏮</button>
            <button onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button onClick={() => step(1)} aria-label="Suivante">⏭</button>
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
