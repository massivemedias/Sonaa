/* Vue tracks, 2D par-dessus la 3D. JETABLE.

   Deux onglets : ACTUEL, les sorties récentes triées par vues décroissantes,
   et ESSENTIEL, les fondateurs du genre.

   TRANSPORT SIMULÉ. Le prototype ne charge aucun audio et n'invente aucun
   identifiant YouTube : la règle du projet est qu'aucun identifiant non
   vérifié n'existe (ADR-006). L'iframe YouTube se branche sur cette même
   interface en P3, une fois les identifiants figés au build par
   scripts/fetch-tracks.ts. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES, type Track } from './masses.ts';
import { Cover } from './Cover.tsx';

interface Props {
  familyIndex: number;
  genreLocal: number;
  onClose: () => void;
}

const mmss = (s: number): string => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};

export function TracksView({ familyIndex, genreLocal, onClose }: Props) {
  const family = FAMILIES[familyIndex];
  const genre = STRUCTURES[familyIndex]?.genres[genreLocal];

  const [tab, setTab] = useState<'actuel' | 'essentiel'>('actuel');
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const rafRef = useRef<number | null>(null);
  const lastTick = useRef(0);

  const list: Track[] = useMemo(() => {
    if (!genre) return [];
    return tab === 'actuel' ? genre.tracksCurrent : genre.tracksEssential;
  }, [genre, tab]);

  const current = index >= 0 ? list[index] : undefined;

  const next = useCallback(() => {
    setIndex((i) => (list.length === 0 ? -1 : (i + 1) % list.length));
    setPosition(0);
  }, [list.length]);

  const prev = useCallback(() => {
    setIndex((i) => (list.length === 0 ? -1 : (i - 1 + list.length) % list.length));
    setPosition(0);
  }, [list.length]);

  // Transport simulé : une horloge, rien d'autre. Aucun son n'est produit.
  useEffect(() => {
    if (!playing || !current) return;
    lastTick.current = performance.now();
    const tick = (): void => {
      const now = performance.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setPosition((p) => {
        const np = p + dt;
        if (np >= current.duration) {
          next();
          return 0;
        }
        return np;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, current, next]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === ' ' && current) {
        event.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, current]);

  if (!family || !genre) return null;

  const play = (i: number): void => {
    setIndex(i);
    setPosition(0);
    setPlaying(true);
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setPosition(Math.max(0, Math.min(1, ratio)) * current.duration);
  };

  return (
    <section className="tracks" aria-label={`Morceaux du genre ${genre.label}`}>
      <header className="tracks-head">
        <div>
          <p className="tracks-crumb">{family.label}</p>
          <h2>{genre.label}</h2>
          <p className="tracks-meta">{genre.bpm} BPM · {list.length} morceaux</p>
        </div>

        <div className="tracks-head-right">
          <div className="tracks-tabs" role="tablist" aria-label="Sélection">
            <button role="tab" aria-selected={tab === 'actuel'} onClick={() => setTab('actuel')}>
              Actuel
            </button>
            <button role="tab" aria-selected={tab === 'essentiel'} onClick={() => setTab('essentiel')}>
              Essentiel
            </button>
          </div>
          <button className="tracks-close" onClick={onClose}>
            Retour au graphe (Échap)
          </button>
        </div>
      </header>

      <p className="tracks-warning">
        Transport simulé. Aucun audio n&apos;est chargé et aucun identifiant YouTube n&apos;a été
        inventé : la lecture réelle arrive en P3, sur des identifiants vérifiés au build.
      </p>

      <ul className="tracks-grid">
        {list.map((track, i) => (
          <li key={track.id}>
            <button
              className="track-card"
              data-active={i === index}
              onClick={() => play(i)}
              aria-label={`Lire ${track.title} de ${track.artist}`}
            >
              <span className="track-cover">
                <Cover seed={track.seed} hue={family.hue} size={220} />
                <span className="track-play" aria-hidden="true">
                  {i === index && playing ? '❚❚' : '▶'}
                </span>
              </span>
              <span className="track-artist">{track.artist}</span>
              <span className="track-title">{track.title}</span>
              <span className="track-label">{track.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <footer className="player" aria-label="Lecteur">
        <span className="player-cover">
          {current ? <Cover seed={current.seed} hue={family.hue} size={44} /> : null}
        </span>

        <span className="player-meta">
          <strong>{current ? current.title : 'Aucun morceau'}</strong>
          <span>{current ? current.artist : '—'}</span>
        </span>

        <span className="player-transport">
          <button onClick={prev} disabled={!current} aria-label="Précédent">⏮</button>
          <button
            className="player-main"
            onClick={() => setPlaying((p) => !p)}
            disabled={!current}
            aria-label={playing ? 'Pause' : 'Lecture'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button onClick={next} disabled={!current} aria-label="Suivant">⏭</button>
        </span>

        <span className="player-time">{mmss(position)}</span>

        <div
          className="player-bar"
          onClick={seek}
          role="slider"
          tabIndex={0}
          aria-label="Position dans le morceau"
          aria-valuemin={0}
          aria-valuemax={current?.duration ?? 0}
          aria-valuenow={Math.floor(position)}
        >
          <div
            className="player-bar-fill"
            style={{ width: `${current ? (position / current.duration) * 100 : 0}%` }}
          />
        </div>

        <span className="player-time">{current ? mmss(current.duration) : '0:00'}</span>

        <label className="player-volume">
          <span className="visually-hidden">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      </footer>
    </section>
  );
}
