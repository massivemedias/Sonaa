/* Coquille du prototype. JETABLE, non branchée au reste du projet.

   Trois vues, deux techniques :
   - Atlas, en 3D, quatorze amas orbitables ;
   - Famille, en 2D, un arbre à plat par-dessus la 3D atténuée ;
   - Morceaux, en 2D également.

   La descente en 3D a été retirée : plus de niveaux 'family'/'genre' dans le
   moteur, plus de couronnes, plus d'anneaux. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES } from './masses.ts';
import { FamilyTree } from './FamilyTree.tsx';
import { TracksView } from './TracksView.tsx';
import type { ProtoApi, ProtoStats } from './webgl.ts';
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
  const [family, setFamily] = useState<number>(-1);
  const [treePath, setTreePath] = useState<number[]>([]);
  const [tracks, setTracks] = useState<{ family: number; genre: number } | null>(null);
  const [reason, setReason] = useState('Chargement de la couche WebGL…');
  const [showHelp, setShowHelp] = useState(() => localStorage.getItem(HELP_KEY) !== '1');
  const [showHud, setShowHud] = useState(false);

  const onStats = useCallback((next: ProtoStats) => setStats(next), []);
  const onFamily = useCallback((index: number) => setFamily(index), []);
  const onPath = useCallback((path: number[]) => setTreePath(path), []);
  const onTracks = useCallback((fam: number, genre: number) => setTracks({ family: fam, genre }), []);

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
          onFamily,
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
  }, [onStats, onFamily]);

  // La 3D passe en arrière-plan dès qu'une vue 2D est devant.
  const overlay = family >= 0 || tracks !== null;
  useEffect(() => {
    apiRef.current?.setSuspended(overlay);
  }, [overlay]);

  const backToAtlas = useCallback(() => {
    setTracks(null);
    setFamily(-1);
    setTreePath([]);
    apiRef.current?.recenter();
  }, []);

  const act = (fn: () => void) => () => {
    dismissHelp();
    fn();
  };

  const results = stats?.results ?? null;
  const genres = family >= 0 ? (STRUCTURES[family]?.genres ?? []) : [];
  const level = tracks ? 'morceaux' : family >= 0 ? 'famille' : 'atlas';

  return (
    <div className="proto-root" onPointerDown={dismissHelp} onWheel={dismissHelp}>
      <canvas ref={canvasRef} className="proto-canvas" data-active={mode === 'webgl'} data-suspended={overlay} />
      <div ref={labelRef} className="proto-labels" data-suspended={overlay} aria-hidden="true" />

      {mode !== 'webgl' && <Fallback notice={reason} />}

      {/* Fil d'Ariane permanent : on sait toujours où on est, et on remonte
          en un clic sur n'importe quel segment. */}
      <nav className="crumbs" data-hidden={tracks !== null} aria-label="Fil d'Ariane">
        <button className="crumb" data-current={level === 'atlas'} onClick={act(backToAtlas)}>
          Atlas
        </button>

        {family >= 0 && (
          <>
            <span className="crumb-sep" aria-hidden="true">›</span>
            <button
              className="crumb"
              data-current={level === 'famille' && treePath.length <= 1}
              onClick={act(() => setTracks(null))}
            >
              {FAMILIES[family]?.label ?? '—'}
            </button>
          </>
        )}

        {treePath.slice(1).map((local) => (
          <span key={local} className="crumb-group">
            <span className="crumb-sep" aria-hidden="true">›</span>
            <button className="crumb" onClick={act(() => setTracks(null))}>
              {genres[local]?.label ?? '—'}
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

      {showHelp && mode === 'webgl' && !overlay && (
        <p className="help-line" role="status">
          Glisser pour tourner · molette pour zoomer · clic sur une famille pour ouvrir son arbre
        </p>
      )}

      {/* Contrôles de l'atlas. Ils disparaissent en 2D : l'arbre a les siens. */}
      {mode === 'webgl' && !overlay && (
        <div className="controls" aria-label="Contrôles de navigation">
          <button onClick={act(() => apiRef.current?.zoom(1))} aria-label="Zoom avant" title="Zoom avant (+)">+</button>
          <button onClick={act(() => apiRef.current?.zoom(-1))} aria-label="Zoom arrière" title="Zoom arrière (-)">−</button>
          <button onClick={act(() => apiRef.current?.rotate(-1))} aria-label="Tourner à gauche" title="Tourner à gauche (flèche gauche)">↺</button>
          <button onClick={act(() => apiRef.current?.rotate(1))} aria-label="Tourner à droite" title="Tourner à droite (flèche droite)">↻</button>
          <button onClick={act(() => apiRef.current?.recenter())} aria-label="Recentrer" title="Recentrer (0)">⌂</button>
        </div>
      )}

      {family >= 0 && !tracks && (
        <FamilyTree familyIndex={family} onTracks={onTracks} onClose={backToAtlas} onPath={onPath} />
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
            <dd>{level}</dd>
            <dt>labels</dt>
            <dd>{stats?.labelsShown ?? '—'}</dd>
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
