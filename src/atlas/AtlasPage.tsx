/* Coquille de l'atlas. Elle route les vues et ne dessine rien elle-même :
   la 3D est dans webgl.ts et webgl-orbit.ts, les vues document dans
   TreeViews, le lecteur ET la fiche dans PlayerLayer (le clic ouvre
   directement les tracks, la fiche vit dans la colonne), la recherche dans
   SearchOverlay. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES } from './structures.ts';
import { PlayerLayer } from './PlayerLayer.tsx';
import { SearchOverlay } from './SearchOverlay.tsx';
import { Welcome } from './Welcome.tsx';
import { TreeViews } from './TreeViews.tsx';
import type { NavState, PanelState, AtlasApi, AtlasStats } from './webgl.ts';
import './atlas.css';
import './welcome.css';

type Mode = 'attente' | 'webgl' | 'dom' | 'repli';

/* QUATRE VUES AU CHOIX (ADR-043) : la 3D libre (l'orbite planétaire
   ressuscitée), la 3D fixe (l'arbre généalogique), la linéaire (document
   dense) et les colonnes (maçonnerie de cartes). Le choix se fait à
   l'entrée, se change à tout moment, et se retient. */
export type ViewId = 'libre' | 'fixe' | 'lineaire' | 'colonnes';
const VIEW_KEY = 'sonaa-view';
const VIEWS: { id: ViewId; label: string; hint: string }[] = [
  { id: 'libre', label: '3D libre', hint: 'orbiter autour du système planétaire' },
  { id: 'fixe', label: '3D fixe', hint: 'l\'arbre généalogique, pan et zoom' },
  { id: 'lineaire', label: 'Linéaire', hint: 'le corpus en document dense' },
  { id: 'colonnes', label: 'Colonnes', hint: 'les familles en cartes' }
];
const readView = (): ViewId | null => {
  const raw = localStorage.getItem(VIEW_KEY);
  return VIEWS.some((v) => v.id === raw) ? (raw as ViewId) : null;
};

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
  // 3D libre par défaut (verdict de Mika) ; un choix mémorisé est respecté.
  const [view, setView] = useState<ViewId>(() => readView() ?? 'libre');
  const [stats, setStats] = useState<AtlasStats | null>(null);
  const [nav, setNav] = useState<NavState | null>(null);
  const [panelGenre, setPanelGenre] = useState<{ familyIndex: number; genreLocal: number } | null>(
    null
  );
  const [searchOpen, setSearchOpen] = useState(false);
  /* Fil d'Ariane replié sur petit écran : deux segments et un chevron. */
  const [crumbsExpanded, setCrumbsExpanded] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 600px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const onChange = (): void => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
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

  /* Le panneau n'a plus de géométrie par image : le moteur signale
     seulement l'ouverture et la fermeture. */
  const onPanel = useCallback((state: PanelState | null) => {
    if (state === null) setPanelGenre(null);
  }, []);

  /* La colonne du lecteur ne suspend PLUS la carte : elle reste vivante à
     côté, on navigue pendant que la musique joue. */

  const dismissHelp = useCallback(() => {
    setShowHelp((visible) => {
      if (visible) localStorage.setItem(HELP_KEY, '1');
      return false;
    });
  }, []);

  useEffect(() => {
    // Les vues DOM n'ont pas de moteur : rien à charger, rien à perdre.
    if (view === 'lineaire' || view === 'colonnes') {
      setMode('dom');
      setNav(null);
      return;
    }
    if (!hasWebGL()) {
      setMode('repli');
      setReason('WebGL indisponible sur ce navigateur.');
      return;
    }

    let disposed = false;
    const id = window.setTimeout(() => {
      const load =
        view === 'libre'
          ? import('./webgl-orbit.ts').then((m) => m.initAtlasOrbit)
          : import('./webgl.ts').then((m) => m.initAtlas);
      void load.then((init) => {
        if (disposed) return;
        const canvas = canvasRef.current;
        const labelLayer = labelRef.current;
        if (!canvas || !labelLayer) return;

        apiRef.current = init({
          canvas,
          labelLayer,
          onStats,
          onNavigate,
          onTracks,
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
  }, [view, onStats, onNavigate, onTracks, onPanel]);

  const chooseView = useCallback((next: ViewId) => {
    localStorage.setItem(VIEW_KEY, next);
    setMode('attente');
    setNav(null);
    setView(next);
  }, []);

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
  }, []);

  /* Retour à l'Atlas : ferme le panneau, ferme la fiche, referme la famille.
     C'est ce que fait le premier segment du fil d'Ariane, et le logotype. */
  const backToAtlas = useCallback(() => {
    setPanelGenre(null);
    apiRef.current?.closePanel();
    apiRef.current?.goToFamily(-1);
  }, []);

  const dismissWelcome = useCallback((picked?: ViewId) => {
    localStorage.setItem(WELCOME_KEY, '1');
    setShowWelcome(false);
    /* L'accueil vient de dire comment on navigue : répéter la même chose dans
       la ligne d'aide juste après serait du bruit. */
    localStorage.setItem(HELP_KEY, '1');
    setShowHelp(false);
    if (picked && picked !== view) {
      chooseView(picked);
      return;
    }
    // L'intro se joue après l'accueil, jamais dessous.
    if (localStorage.getItem(INTRO_KEY) !== '1') {
      apiRef.current?.playIntro();
    }
  }, [view, chooseView]);

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
    if (!apiRef.current) {
      // Vue DOM : aller à un genre, c'est ouvrir sa colonne de tracks.
      setPanelGenre({ familyIndex, genreLocal });
      return;
    }
    apiRef.current.goToGenre(familyIndex, genreLocal);
  }, []);

  /* Écouter passe par le MOTEUR, pas par l'état React seul. C'est lui qui pose
     la plaque dans la scène et qui en émet la géométrie ; le prévenir est la
     seule façon d'avoir une fenêtre vidéo positionnée. Appeler onTracks
     directement affichait un panneau sans plaque ni fenêtre. */
  const openTracks = useCallback((familyIndex: number, genreLocal: number) => {
    if (!apiRef.current) {
      setPanelGenre({ familyIndex, genreLocal });
      return;
    }
    apiRef.current.openPanel(familyIndex, genreLocal);
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
      <div ref={labelRef} className="atlas-labels" data-suspended={false} aria-hidden="true" />

      {mode === 'dom' && (
        <TreeViews
          mode={view === 'colonnes' ? 'colonnes' : 'lineaire'}
          onOpen={openTracks}
        />
      )}

      {mode !== 'webgl' && mode !== 'dom' && <Fallback notice={reason} />}

      {/* Le sélecteur de vue : quatre façons de lire la même carte. */}
      <div className="view-switch" role="group" aria-label="Choisir la vue">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            data-current={view === v.id}
            onClick={() => view !== v.id && chooseView(v.id)}
            title={v.hint}
          >
            {v.label}
          </button>
        ))}
      </div>

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
      <nav
        className="crumbs"
        data-hidden={false}
        data-expanded={crumbsExpanded}
        aria-label="Fil d'Ariane"
      >
        {(() => {
          /* Sous 600 px : deux segments au plus, précédés d'un chevron qui
             déploie le chemin complet. Une ligne, jamais deux. */
          const totalSegments =
            1 + (nav && nav.familyIndex >= 0 ? 1 : 0) + (nav?.path.length ?? 0) + (panelGenre ? 1 : 0);
          if (narrow && !crumbsExpanded && totalSegments > 2) {
            return (
              <button
                className="crumb-ellipsis"
                onClick={() => setCrumbsExpanded(true)}
                aria-label="Déployer le chemin complet"
              >
                ‹ …
              </button>
            );
          }
          if (narrow && crumbsExpanded) {
            return (
              <button
                className="crumb-ellipsis"
                onClick={() => setCrumbsExpanded(false)}
                aria-label="Replier le chemin"
              >
                ×
              </button>
            );
          }
          return null;
        })()}
        {(() => {
          /* Segments en données : le repli mobile ne garde que les deux
             derniers, sans dupliquer la logique de rendu. */
          interface Seg {
            key: string;
            label: string;
            current: boolean;
            onClick?: () => void;
          }
          const segments: Seg[] = [
            { key: 'atlas', label: 'Atlas', current: level === 'atlas' && !panelGenre, onClick: act(backToAtlas) }
          ];
          if (nav && nav.familyIndex >= 0) {
            const fi = nav.familyIndex;
            segments.push({
              key: 'family',
              label: nav.familyLabel,
              current: level === 'family' && !panelGenre,
              onClick: act(() => {
                setPanelGenre(null);
                apiRef.current?.closePanel();
                apiRef.current?.goToFamily(fi);
              })
            });
          }
          nav?.path.forEach((seg, i) => {
            segments.push({
              key: `g-${seg.index}`,
              label: seg.label,
              current: !panelGenre && i === (nav.path.length - 1),
              onClick: act(() => {
                setPanelGenre(null);
                apiRef.current?.closePanel();
              })
            });
          });
          if (panelGenre) segments.push({ key: 'tracks', label: 'Tracks', current: true });

          const shown = narrow && !crumbsExpanded ? segments.slice(-2) : segments;
          return shown.map((seg, i) => (
            <span key={seg.key} className="crumb-group">
              {i > 0 && <span className="crumb-sep" aria-hidden="true">›</span>}
              {seg.onClick ? (
                <button className="crumb" data-current={seg.current} onClick={seg.onClick}>
                  {seg.label}
                </button>
              ) : (
                <span className="crumb" data-current={seg.current}>{seg.label}</span>
              )}
            </span>
          ));
        })()}
      </nav>

      {showHelp && !showWelcome && mode === 'webgl' && !panelGenre && (
        <p className="help-line" role="status">
          {view === 'libre'
            ? 'Glisser pour tourner · molette pour zoomer · clic sur une sphère pour ses tracks · espace pour chercher'
            : 'Glisser pour déplacer la carte · molette pour zoomer · clic sur une sphère pour ses tracks · espace pour chercher'}
        </p>
      )}

      {/* Contrôles visibles en permanence : la navigation ne doit pas se
          deviner. Ils font exactement ce que font la souris et le clavier. */}
      {mode === 'webgl' && (
        <div className="controls" aria-label="Contrôles de navigation">
          <button onClick={act(() => apiRef.current?.zoom(1))} aria-label="Zoom avant" title="Zoom avant (+)">+</button>
          <button onClick={act(() => apiRef.current?.zoom(-1))} aria-label="Zoom arrière" title="Zoom arrière (-)">−</button>
          {/* L'orbite est abandonnée : la carte se déplace, elle ne tourne
              plus. Les flèches remplacent la rotation. */}
          <button onClick={act(() => apiRef.current?.pan(-1, 0))} aria-label="Déplacer vers la gauche" title="Déplacer (flèches)">←</button>
          <button onClick={act(() => apiRef.current?.pan(1, 0))} aria-label="Déplacer vers la droite" title="Déplacer (flèches)">→</button>
          <button onClick={act(() => apiRef.current?.recenter())} aria-label="Recentrer" title="Recentrer (0)">⌂</button>
          <button onClick={act(() => apiRef.current?.goUp())} aria-label="Remonter d'un niveau" title="Remonter (Échap)">↑</button>
        </div>
      )}

      {searchOpen && (
        <SearchOverlay
          onPick={goToGenre}
          onListen={openTracks}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {showWelcome && <Welcome views={VIEWS} current={view} onDismiss={dismissWelcome} />}

      {/* MONTÉ EN PERMANENCE, sans condition de mode : le démontage pendant
          la transition de vue détruisait l'iframe et coupait la lecture.
          La règle est absolue : la lecture survit à tout. */}
      <PlayerLayer
        panelGenre={panelGenre}
        onClose={closePanel}
        onReopen={reopenPanel}
        onGoToGenre={goToGenre}
        onGoToFamily={(familyIndex: number) => apiRef.current?.goToFamily(familyIndex)}
      />

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
