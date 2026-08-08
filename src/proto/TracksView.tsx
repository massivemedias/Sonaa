/* Vue morceaux, 2D par-dessus la 3D.

   Le transport n'est plus simulé : chaque morceau porte un identifiant YouTube
   VÉRIFIÉ au build par l'endpoint oEmbed public, sans clé. Un identifiant qui
   ne répond pas 200 est retiré du corpus, jamais marqué faux (ADR-006). La
   lecture passe par l'iframe officielle, sur le domaine sans cookie, qui est
   le seul appel tiers du runtime. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES, type Track } from './masses.ts';
import { Cover } from './Cover.tsx';

interface Props {
  familyIndex: number;
  genreLocal: number;
  onClose: () => void;
}

export function TracksView({ familyIndex, genreLocal, onClose }: Props) {
  const family = FAMILIES[familyIndex];
  const genre = STRUCTURES[familyIndex]?.genres[genreLocal];

  const [index, setIndex] = useState(-1);
  const [showNote, setShowNote] = useState(false);

  const list: Track[] = useMemo(() => genre?.tracks ?? [], [genre]);
  const current = index >= 0 ? list[index] : undefined;

  useEffect(() => {
    setIndex(-1);
    setShowNote(false);
  }, [familyIndex, genreLocal]);

  const step = useCallback(
    (delta: number) => {
      if (list.length === 0) return;
      setIndex((i) => (i < 0 ? 0 : (i + delta + list.length) % list.length));
    },
    [list.length]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!family || !genre) return null;

  const [lo, hi] = genre.bpmRange;

  return (
    <section className="tracks" aria-label={`Morceaux de ${genre.label}`}>
      <header className="tracks-head">
        <div>
          <p className="tracks-crumb">
            {family.label}
            {genre.externalParents.length > 0 && (
              <> · greffe {genre.externalParents.map((p) => p.label).join(', ')}</>
            )}
          </p>
          <h2>{genre.label}</h2>
          <p className="tracks-meta">
            {lo}-{hi} BPM · {list.length} morceau{list.length > 1 ? 'x' : ''} vérifié
            {list.length > 1 ? 's' : ''}
            {genre.confidence === 'debated' && (
              <>
                {' · '}
                <button className="tracks-flag" onClick={() => setShowNote((v) => !v)}>
                  filiation débattue
                </button>
              </>
            )}
          </p>
        </div>

        <div className="tracks-head-right">
          <button className="tracks-close" onClick={onClose}>
            Fermer (Échap)
          </button>
        </div>
      </header>

      {showNote && <p className="tracks-warning">{genre.note}</p>}

      {list.length === 0 ? (
        <p className="tracks-warning">
          Sélection en cours de vérification. Aucun identifiant non vérifié n&apos;entre dans le
          corpus, la liste reste donc vide plutôt qu&apos;approximative.
        </p>
      ) : (
        <ul className="tracks-grid">
          {list.map((track, i) => (
            <li key={track.id}>
              <button
                className="track-card"
                data-active={i === index}
                onClick={() => setIndex(i)}
                aria-label={`Lire ${track.title} de ${track.artist}`}
              >
                <span className="track-cover">
                  <Cover seed={track.seed} hue={family.hue} size={220} />
                  <span className="track-play" aria-hidden="true">
                    ▶
                  </span>
                </span>
                <span className="track-artist">{track.artist}</span>
                <span className="track-title">{track.title}</span>
                <span className="track-label">{track.year ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {current && (
        <footer className="player" aria-label="Lecteur">
          <div className="player-frame">
            {/* Domaine sans cookie : rien n'est déposé tant que la lecture
                n'a pas commencé. */}
            <iframe
              key={current.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${current.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={`${current.artist} - ${current.title}`}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <span className="player-meta">
            <strong>{current.title}</strong>
            <span>
              {current.artist}
              {current.year ? ` · ${current.year}` : ''}
            </span>
          </span>

          <span className="player-transport">
            <button onClick={() => step(-1)} aria-label="Précédent">⏮</button>
            <button onClick={() => step(1)} aria-label="Suivant">⏭</button>
          </span>

          <button className="player-stop" onClick={() => setIndex(-1)} aria-label="Arrêter la lecture">
            ✕
          </button>
        </footer>
      )}
    </section>
  );
}
