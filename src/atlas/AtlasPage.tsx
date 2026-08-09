/* Coquille de l'atlas. Elle route les vues et ne dessine rien elle-même :
   la 3D est dans webgl.ts, les morceaux dans PlayerLayer, la fiche dans
   GenreCard, la recherche dans SearchOverlay. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES } from './structures.ts';
import { PlayerLayer, type PanelBus } from './PlayerLayer.tsx';
import { GenreCard } from './GenreCard.tsx';
import { SearchOverlay } from './SearchOverlay.tsx';
import { Welcome } from './Welcome.tsx';
import type { NavState, PanelState, AtlasApi, AtlasStats } from './webgl.ts';
import './atlas.css';
import './welcome.css';

type Mode = 'attente' | 'webgl' | 'repli';

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const fmt = (ms: number): string => `${ms.toFixed(2)} ms`;
const HELP_KEY = 'sonaa-help-seen';
/* L'écran d'accueil se montre une seule fois dans la vie du navigateur. Clé
   distincte de la ligne d'aide : ce sont deux choses différentes. */
const WELCOME_KEY = 'sonaa-welcome-seen';
/* L'intro, la naissance des familles, se joue une seule fois. Clé distincte de
   l'accueil : « revoir l'intro » sur les crédits n'a pas à repasser l'accueil. */
const INTRO_KEY = 'sonaa-intro-seen';

function Fallback({ notice }: { notice: string }) {
  return (
    <div className="atlas-fallback">
      <p className="atlas-fallback-notice">{notice}</p>
      <p className="atlas-fallback-notice">
        <a href="#/index">Ouvrir l&apos;index, navigation complète des familles et des genres</a>
      </p>
    </div>
  );
}

export function AtlasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AtlasApi | null>(null);

  const [mode, setMode] = useState<Mode>('attente');
  const [stats, setStats] = useState<AtlasStats | null>(null);
  const [nav, setNav] = useState<NavState | null>(null);
  /* La géométrie du panneau change à chaque image pendant un vol de caméra.
     Elle ne passe donc pas par un état React : le bus la transmet en impératif
     à la couche lecteur, et React ne se rerend que quand le genre change. */
  const busRef = useRef<PanelBus>({ current: null, listeners: new Set() });
  const [panelGenre, setPanelGenre] = useState<{ familyIndex: number; genreLocal: number } | null>(
    null
  );
  /* Fiche du genre atteint. Elle s'ouvre au clic sur une sphère, avant les
     morceaux : écouter est une action de la fiche, pas un effet du clic. */
  const [cardGenre, setCardGenre] = useState<{ familyIndex: number; genreLocal: number } | null>(
    null
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem(WELCOME_KEY) !== '1'
  );
  const [reason, setReason] = useState('Chargement de la couche WebGL…');
  const [showHelp, setShowHelp] = useState(() => localStorage.getItem(HELP_KEY) !== '1');
  const [showHud, setShowHud] = useState(false);

  const onStats = useCallback((next: AtlasStats) => setStats(next), []);
  const onNavigate = useCallback((next: NavState) => setNav(next), []);
  const onTracks = useCallback(
    (familyIndex: number, genreLocal: number) => setPanelGenre({ familyIndex, genreLocal }),
    []
  );

  const onGenreInfo = useCallback(
    (familyIndex: number, genreLocal: number) => setCardGenre({ familyIndex, genreLocal }),
    []
  );

  const onPanel = useCallback((state: PanelState | null) => {
    const bus = busRef.current;
    bus.current = state;
    for (const listener of bus.listeners) listener(state);
    if (state === null) setPanelGenre(null);
  }, []);

  const dismissHelp = useCallback(() => {
    setShowHelp((visible) => {
      if (visible) localStorage.setItem(HELP_KEY, '1');
      return false;
    });
  }, []);

  useEffect(() => {
    if (!hasWebGL()) {
      setMode('repli');
      setReason('WebGL indisponible sur ce navigateur.');
      return;
    }

    let disposed = false;
    const id = window.setTimeout(() => {
      void import('./webgl.ts').then(({ initAtlas }) => {
        if (disposed) return;
        const canvas = canvasRef.current;
        const labelLayer = labelRef.current;
        if (!canvas || !labelLayer) return;

        apiRef.current = initAtlas({
          canvas,
          labelLayer,
          onStats,
          onNavigate,
          onTracks,
          onGenreInfo,
          onPanel,
          onContextLost: () => {
            setMode('repli');
            setReason('Contexte WebGL perdu, bascule sur le repli.');
          }
        });
        setMode('webgl');
        if (
          localStorage.getItem(INTRO_KEY) !== '1' &&
          localStorage.getItem(WELCOME_KEY) === '1'
        ) {
          apiRef.current?.playIntro();
        }
      });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(id);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [onStats, onNavigate, onTracks, onGenreInfo, onPanel]);

  /* Le balayage du logo s'arrête quand l'onglet est en arrière-plan : une
     animation CSS ne se met pas en pause toute seule. */
  useEffect(() => {
    const onVisibility = (): void => {
      document.documentElement.toggleAttribute('data-tab-hidden', document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* La 3D n'est plus suspendue : le panneau vit DANS la scène, devant la
     sphère du genre. On continue donc à orbiter et à zoomer pendant qu'il est
     ouvert, et la plaque suit la caméra sans jamais tourner sur elle-même. */

  const closePanel = useCallback(() => {
    setPanelGenre(null);
    apiRef.current?.closePanel();
    apiRef.current?.goUp();
  }, []);

  /* Retour à l'Atlas : ferme le panneau, ferme la fiche, referme la famille.
     C'est ce que fait le premier segment du fil d'Ariane, et le logotype. */
  const backToAtlas = useCallback(() => {
    setPanelGenre(null);
    setCardGenre(null);
    apiRef.current?.closePanel();
    apiRef.current?.goToFamily(-1);
  }, []);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, '1');
    setShowWelcome(false);
    /* L'accueil vient de dire comment on navigue : répéter la même chose dans
       la ligne d'aide juste après serait du bruit. */
    localStorage.setItem(HELP_KEY, '1');
    setShowHelp(false);
    // L'intro se joue après l'accueil, jamais dessous.
    if (localStorage.getItem(INTRO_KEY) !== '1') {
      apiRef.current?.playIntro();
    }
  }, []);

  /* L'ESPACE ouvre la recherche, la barre oblique reste en second raccourci.
     Exception : quand le panneau tracks est ouvert, l'espace appartient au
     lecteur, c'est lecture et pause partout ailleurs sur le web et ici aussi.
     Échap referme, et c'est SearchOverlay qui s'en charge. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (searchOpen) return;
      const spaceForSearch = event.code === 'Space' && panelGenre === null;
      if (event.key === '/' || spaceForSearch) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, panelGenre]);

  const goToGenre = useCallback((familyIndex: number, genreLocal: number) => {
    setPanelGenre(null);
    apiRef.current?.closePanel();
    apiRef.current?.goToGenre(familyIndex, genreLocal);
  }, []);

  /* Écouter passe par le MOTEUR, pas par l'état React seul. C'est lui qui pose
     la plaque dans la scène et qui en émet la géométrie ; le prévenir est la
     seule façon d'avoir une fenêtre vidéo positionnée. Appeler onTracks
     directement affichait un panneau sans plaque ni fenêtre. */
  const openTracks = useCallback((familyIndex: number, genreLocal: number) => {
    apiRef.current?.openPanel(familyIndex, genreLocal);
  }, []);

  const reopenPanel = useCallback((familyIndex: number, genreLocal: number) => {
    apiRef.current?.openPanel(familyIndex, genreLocal);
  }, []);

  const act = (fn: () => void) => () => {
    dismissHelp();
    fn();
  };

  /* Le titre du document suit la navigation : un onglet ouvert doit dire où on
     en est, et un lien copié depuis la barre d'adresse doit être lisible.
     Point médian et non tiret cadratin. */
  useEffect(() => {
    const parts: string[] = [];
    if (panelGenre) {
      const genre = STRUCTURES[panelGenre.familyIndex]?.genres[panelGenre.genreLocal];
      if (genre) parts.push(`${genre.label}, tracks`);
    } else if (nav && nav.path.length > 0) {
      const last = nav.path[nav.path.length - 1];
      if (last) parts.push(last.label);
    } else if (nav && nav.familyIndex >= 0) {
      parts.push(nav.familyLabel);
    }
    document.title = parts.length > 0 ? `${parts.join(' ')} · SONAA` : 'SONAA';
  }, [nav, panelGenre]);

  const results = stats?.results ?? null;
  const level = nav?.level ?? 'atlas';

  return (
    <div className="atlas-root" onPointerDown={dismissHelp} onWheel={dismissHelp}>
      <canvas
        ref={canvasRef}
        className="atlas-canvas"
        data-active={mode === 'webgl'}
        data-suspended={false}
      />
      <div ref={labelRef} className="atlas-labels" data-suspended={panelGenre !== null} aria-hidden="true" />

      {mode !== 'webgl' && <Fallback notice={reason} />}

      {/* Le logotype est le retour à l'accueil. Discret et petit : il ne doit
          pas concurrencer la carte, qui est le sujet. */}
      <button
        className="brand"
        onClick={act(backToAtlas)}
        aria-label="SONAA, revenir à la vue Atlas"
        title="Revenir à l'Atlas"
      >
        <img src={`${import.meta.env.BASE_URL}brand/sonaa-wordmark.png`} alt="SONAA" draggable={false} />
        {/* Le balayage lumineux. Le PNG n'a pas de tracé vectoriel : c'est un
            masque en dégradé qui respecte la transparence, la lumière n'existe
            que sur les pixels du glyphe, donc le point semble suivre le trait.
            Choix documenté dans DESIGN.md, section identité. */}
        <span className="brand-sweep" aria-hidden="true" />
      </button>

      {/* Fil d'Ariane permanent : on sait toujours où on est, et on remonte
          en un clic sur n'importe quel segment. */}
      <nav className="crumbs" data-hidden={false} aria-label="Fil d'Ariane">
        <button
          className="crumb"
          data-current={level === 'atlas' && !panelGenre}
          onClick={act(backToAtlas)}
        >
          Atlas
        </button>

        {nav && nav.familyIndex >= 0 && (
          <>
            <span className="crumb-sep" aria-hidden="true">›</span>
            <button
              className="crumb"
              data-current={level === 'family' && !panelGenre}
              onClick={act(() => {
                setPanelGenre(null);
                apiRef.current?.closePanel();
                apiRef.current?.goToFamily(nav.familyIndex);
              })}
            >
              {nav.familyLabel}
            </button>
          </>
        )}

        {nav?.path.map((seg, i) => (
          <span key={seg.index} className="crumb-group">
            <span className="crumb-sep" aria-hidden="true">›</span>
            <button
              className="crumb"
              data-current={!panelGenre && i === (nav.path.length - 1)}
              onClick={act(() => { setPanelGenre(null); apiRef.current?.closePanel(); })}
            >
              {seg.label}
            </button>
          </span>
        ))}

        {panelGenre && (
          <>
            <span className="crumb-sep" aria-hidden="true">›</span>
            <span className="crumb" data-current="true">Tracks</span>
          </>
        )}
      </nav>

      {showHelp && !showWelcome && mode === 'webgl' && !panelGenre && (
        <p className="help-line" role="status">
          Glisser pour tourner · molette pour zoomer · clic sur une sphère pour sa fiche ·
          espace pour chercher · Échap pour remonter
        </p>
      )}

      {/* Contrôles visibles en permanence : la navigation ne doit pas se
          deviner. Ils font exactement ce que font la souris et le clavier. */}
      {mode === 'webgl' && (
        <div className="controls" aria-label="Contrôles de navigation">
          <button onClick={act(() => apiRef.current?.zoom(1))} aria-label="Zoom avant" title="Zoom avant (+)">+</button>
          <button onClick={act(() => apiRef.current?.zoom(-1))} aria-label="Zoom arrière" title="Zoom arrière (-)">−</button>
          <button onClick={act(() => apiRef.current?.rotate(-1))} aria-label="Tourner à gauche" title="Tourner à gauche (flèche gauche)">↺</button>
          <button onClick={act(() => apiRef.current?.rotate(1))} aria-label="Tourner à droite" title="Tourner à droite (flèche droite)">↻</button>
          <button onClick={act(() => apiRef.current?.recenter())} aria-label="Recentrer" title="Recentrer (0)">⌂</button>
          <button onClick={act(() => apiRef.current?.goUp())} aria-label="Remonter d'un niveau" title="Remonter (Échap)">↑</button>
        </div>
      )}

      {/* La fiche s'efface quand les morceaux passent devant : les deux ne se
          lisent pas en même temps. */}
      {mode === 'webgl' && cardGenre && !panelGenre && (
        <GenreCard
          familyIndex={cardGenre.familyIndex}
          genreLocal={cardGenre.genreLocal}
          onClose={() => setCardGenre(null)}
          onTracks={openTracks}
          onGoToGenre={goToGenre}
        />
      )}

      {searchOpen && <SearchOverlay onPick={goToGenre} onClose={() => setSearchOpen(false)} />}

      {showWelcome && <Welcome onDismiss={dismissWelcome} />}

      {mode === 'webgl' && (
        <PlayerLayer
          bus={busRef.current}
          panelGenre={panelGenre}
          onClose={closePanel}
          onReopen={reopenPanel}
          onGoToGenre={goToGenre}
          onShowCard={(familyIndex: number, genreLocal: number) => {
            setPanelGenre(null);
            apiRef.current?.closePanel();
            setCardGenre({ familyIndex, genreLocal });
          }}
        />
      )}

      {/* Pied de page discret : les crédits ne concurrencent pas la carte. */}
      <a className="credits-link" href="#/credits">
        Crédits
      </a>

      <button className="hud-toggle" onClick={() => setShowHud((v) => !v)}>
        {showHud ? 'Masquer les mesures' : 'Mesures'}
      </button>

      {showHud && (
        <div className="atlas-hud">
          <p className="atlas-hud-title">Prototype jetable</p>
          <dl className="atlas-hud-grid">
            <dt>familles</dt>
            <dd>{FAMILIES.length}</dd>
            <dt>sphères</dt>
            <dd>{stats?.spheres ?? '—'}</dd>
            <dt>liens</dt>
            <dd>{stats?.links ?? '—'}</dd>
            <dt>fps</dt>
            <dd data-alert={stats ? stats.fps < 40 : false}>{stats ? stats.fps.toFixed(0) : '—'}</dd>
            <dt>draw calls</dt>
            <dd>{stats?.drawCalls ?? '—'}</dd>
            <dt>niveau</dt>
            <dd>{panelGenre ? 'tracks' : level}</dd>
            <dt>diffusion</dt>
            <dd>{stats ? `${stats.deployPct.toFixed(0)} %` : '—'}</dd>
            <dt>rendu</dt>
            <dd data-alert={stats?.reduced === true}>{stats ? (stats.reduced ? 'réduit' : 'complet') : '—'}</dd>
          </dl>

          {results ? (
            <dl className="atlas-hud-grid">
              <dt>fond</dt>
              <dd>{fmt(results.backgroundMs)}</dd>
              <dt>sphères</dt>
              <dd>{fmt(results.spheresMs)}</dd>
              <dt>liens</dt>
              <dd>{fmt(results.linksMs)}</dd>
              <dt>image complète</dt>
              <dd data-alert={results.totalMs > 16.67}>{fmt(results.totalMs)}</dd>
            </dl>
          ) : (
            <p className="atlas-hud-wait">Mesure en cours…</p>
          )}

          <div className="atlas-hud-actions">
            <button onClick={() => void apiRef.current?.runProfile()}>Remesurer</button>
            <a className="atlas-hud-link" href="#/index">Index accessible</a>
          </div>
        </div>
      )}
    </div>
  );
}
