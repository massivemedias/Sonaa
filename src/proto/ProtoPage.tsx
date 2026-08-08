/* Coquille du prototype. JETABLE, non branchée au reste du projet. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FAMILIES } from './masses.ts';
import { TracksView } from './TracksView.tsx';
import type { NavState, ProtoApi, ProtoStats } from './webgl.ts';
import './proto.css';

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
const HELP_KEY = 'sonaa-proto-help-seen';

function Fallback({ notice }: { notice: string }) {
  return (
    <div className="proto-fallback">
      <p className="proto-fallback-notice">{notice}</p>
      <p className="proto-fallback-notice">
        <a href="#/index">Ouvrir l&apos;index, navigation complète des familles et des genres</a>
      </p>
    </div>
  );
}

export function ProtoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ProtoApi | null>(null);

  const [mode, setMode] = useState<Mode>('attente');
  const [stats, setStats] = useState<ProtoStats | null>(null);
  const [nav, setNav] = useState<NavState | null>(null);
  const [tracks, setTracks] = useState<{ family: number; genre: number } | null>(null);
  const [reason, setReason] = useState('Chargement de la couche WebGL…');
  const [showHelp, setShowHelp] = useState(() => localStorage.getItem(HELP_KEY) !== '1');
  const [showHud, setShowHud] = useState(false);

  const onStats = useCallback((next: ProtoStats) => setStats(next), []);
  const onNavigate = useCallback((next: NavState) => setNav(next), []);
  const onTracks = useCallback((family: number, genre: number) => setTracks({ family, genre }), []);

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
      void import('./webgl.ts').then(({ initProto }) => {
        if (disposed) return;
        const canvas = canvasRef.current;
        const labelLayer = labelRef.current;
        if (!canvas || !labelLayer) return;

        apiRef.current = initProto({
          canvas,
          labelLayer,
          onStats,
          onNavigate,
          onTracks,
          onContextLost: () => {
            setMode('repli');
            setReason('Contexte WebGL perdu, bascule sur le repli.');
          }
        });
        setMode('webgl');
      });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(id);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [onStats, onNavigate, onTracks]);

  // La 3D est suspendue tant que la vue tracks est devant.
  useEffect(() => {
    apiRef.current?.setSuspended(tracks !== null);
  }, [tracks]);

  const act = (fn: () => void) => () => {
    dismissHelp();
    fn();
  };

  const results = stats?.results ?? null;
  const level = nav?.level ?? 'atlas';

  return (
    <div className="proto-root" onPointerDown={dismissHelp} onWheel={dismissHelp}>
      <canvas
        ref={canvasRef}
        className="proto-canvas"
        data-active={mode === 'webgl'}
        data-suspended={tracks !== null}
      />
      <div ref={labelRef} className="proto-labels" data-suspended={tracks !== null} aria-hidden="true" />

      {mode !== 'webgl' && <Fallback notice={reason} />}

      {/* Fil d'Ariane permanent : on sait toujours où on est, et on remonte
          en un clic sur n'importe quel segment. */}
      <nav className="crumbs" data-hidden={tracks !== null} aria-label="Fil d'Ariane">
        <button
          className="crumb"
          data-current={level === 'atlas' && !tracks}
          onClick={act(() => {
            setTracks(null);
            apiRef.current?.goToFamily(-1);
          })}
        >
          Atlas
        </button>

        {nav && nav.familyIndex >= 0 && (
          <>
            <span className="crumb-sep" aria-hidden="true">›</span>
            <button
              className="crumb"
              data-current={level === 'family' && !tracks}
              onClick={act(() => {
                setTracks(null);
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
              data-current={!tracks && i === (nav.path.length - 1)}
              onClick={act(() => setTracks(null))}
            >
              {seg.label}
            </button>
          </span>
        ))}

        {tracks && (
          <>
            <span className="crumb-sep" aria-hidden="true">›</span>
            <span className="crumb" data-current="true">Morceaux</span>
          </>
        )}
      </nav>

      {showHelp && mode === 'webgl' && !tracks && (
        <p className="help-line" role="status">
          Glisser pour tourner · molette pour zoomer · clic sur une sphère pour y descendre ·
          Échap pour remonter
        </p>
      )}

      {/* Contrôles visibles en permanence : la navigation ne doit pas se
          deviner. Ils font exactement ce que font la souris et le clavier. */}
      {mode === 'webgl' && !tracks && (
        <div className="controls" aria-label="Contrôles de navigation">
          <button onClick={act(() => apiRef.current?.zoom(1))} aria-label="Zoom avant" title="Zoom avant (+)">+</button>
          <button onClick={act(() => apiRef.current?.zoom(-1))} aria-label="Zoom arrière" title="Zoom arrière (-)">−</button>
          <button onClick={act(() => apiRef.current?.rotate(-1))} aria-label="Tourner à gauche" title="Tourner à gauche (flèche gauche)">↺</button>
          <button onClick={act(() => apiRef.current?.rotate(1))} aria-label="Tourner à droite" title="Tourner à droite (flèche droite)">↻</button>
          <button onClick={act(() => apiRef.current?.recenter())} aria-label="Recentrer" title="Recentrer (0)">⌂</button>
          <button onClick={act(() => apiRef.current?.goUp())} aria-label="Remonter d'un niveau" title="Remonter (Échap)">↑</button>
        </div>
      )}

      {tracks && (
        <TracksView familyIndex={tracks.family} genreLocal={tracks.genre} onClose={() => setTracks(null)} />
      )}

      <button className="hud-toggle" onClick={() => setShowHud((v) => !v)}>
        {showHud ? 'Masquer les mesures' : 'Mesures'}
      </button>

      {showHud && (
        <div className="proto-hud">
          <p className="proto-hud-title">Prototype jetable</p>
          <dl className="proto-hud-grid">
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
            <dd>{tracks ? 'tracks' : level}</dd>
            <dt>diffusion</dt>
            <dd>{stats ? `${stats.deployPct.toFixed(0)} %` : '—'}</dd>
            <dt>rendu</dt>
            <dd data-alert={stats?.reduced === true}>{stats ? (stats.reduced ? 'réduit' : 'complet') : '—'}</dd>
          </dl>

          {results ? (
            <dl className="proto-hud-grid">
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
            <p className="proto-hud-wait">Mesure en cours…</p>
          )}

          <div className="proto-hud-actions">
            <button onClick={() => void apiRef.current?.runProfile()}>Remesurer</button>
            <a className="proto-hud-link" href="#/index">Index accessible</a>
          </div>
        </div>
      )}
    </div>
  );
}
