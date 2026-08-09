/* Fiche d'un genre.

   Elle s'ouvre au clic sur une sphère, AVANT les morceaux. Cliquer ne doit pas
   faire tomber dans un lecteur sans savoir où on est : la fiche dit de quoi on
   parle, d'où ça vient et ce que ça a donné. Écouter est une action de la fiche.

   Elle est en DOM plat, pas en plaque 3D : c'est du texte à lire, pas un objet
   à contempler. La plaque 3D reste réservée aux morceaux. */

import { FAMILIES, STRUCTURES } from './structures.ts';
import './genre-card.css';

interface Props {
  familyIndex: number;
  genreLocal: number;
  onClose: () => void;
  onTracks: (familyIndex: number, genreLocal: number) => void;
  onGoToGenre: (familyIndex: number, genreLocal: number) => void;
}

export function GenreCard({ familyIndex, genreLocal, onClose, onTracks, onGoToGenre }: Props) {
  const family = FAMILIES[familyIndex];
  const structure = STRUCTURES[familyIndex];
  const genre = structure?.genres[genreLocal];
  if (!family || !structure || !genre) return null;

  const parent = genre.parent >= 0 ? structure.genres[genre.parent] : undefined;
  const children = genre.children
    .map((i) => ({ local: i, genre: structure.genres[i] }))
    .filter((c): c is { local: number; genre: NonNullable<typeof c.genre> } => Boolean(c.genre));

  const tracks = genre.tracksEssentiel.length + genre.tracksActuel.length;
  const hue = family.hue;

  return (
    <aside
      className="card"
      style={{ ['--family' as string]: `oklch(0.72 0.15 ${hue})` }}
      aria-label={`Fiche du genre ${genre.label}`}
    >
      <header className="card-head">
        <p className="card-family">{family.label}</p>
        <h2 className="card-name">{genre.label}</h2>
        <p className="card-bpm">
          {/* Pas de tempo inventé : certains genres n'en ont pas. */}
          {genre.bpmRange ? `${genre.bpmRange[0]}-${genre.bpmRange[1]} BPM` : 'sans tempo'}
          {genre.major && <span className="card-major"> · genre majeur</span>}
        </p>

        {/* Le doute est affiché, pas caché. La note dit quelles sources se
            contredisent et laquelle a été suivie. */}
        {genre.confidence === 'debated' && (
          <p className="card-debated">
            <span className="card-badge">filiation débattue</span>
            {genre.note}
          </p>
        )}
      </header>

      <dl className="card-rows">
        <dt>{genre.structuralOnly ? 'Rattaché à' : 'Vient de'}</dt>
        <dd>
          {parent ? (
            <>
              <button className="card-link" onClick={() => onGoToGenre(familyIndex, genre.parent)}>
                {parent.label}
              </button>
              {/* Un rattachement conventionnel doit se dire : le funk n'est pas
                  issu de la musique concrète, il est seulement rangé sous elle
                  parce qu'un arbre exige une racine unique. */}
              {genre.structuralOnly && (
                <span className="card-convention">
                  {' '}
                  par convention d&apos;arbre, ce n&apos;est pas une filiation
                </span>
              )}
            </>
          ) : (
            <span className="card-founder">fondateur de la famille {family.label}</span>
          )}
        </dd>

        {/* Les greffes : ascendances qui traversent une famille. C'est ce qui
            dit que la généalogie est un graphe et non un arbre. */}
        {genre.externalParents.length > 0 && (
          <>
            <dt>Aussi de</dt>
            <dd>
              {genre.externalParents.map((x, i) => (
                <span key={`${x.family}-${i}`} className="card-graft">
                  <span
                    className="card-dot"
                    style={{
                      background: `oklch(0.72 0.15 ${FAMILIES[x.family]?.hue ?? hue})`
                    }}
                    aria-hidden="true"
                  />
                  famille {x.label}
                </span>
              ))}
            </dd>
          </>
        )}

        <dt>A donné</dt>
        <dd>
          {children.length === 0 ? (
            <span className="card-none">rien, c&apos;est une feuille</span>
          ) : (
            <span className="card-chips">
              {children.map((c) => (
                <button
                  key={c.local}
                  className="card-chip"
                  onClick={() => onGoToGenre(familyIndex, c.local)}
                >
                  {c.genre.label}
                </button>
              ))}
            </span>
          )}
        </dd>

        {/* Morceaux charnières du genre : partagés avec d'autres genres, et
            c'est ce qui les rend intéressants. Cliquable, comme les dérivés. */}
        {(() => {
          const shared = [...genre.tracksEssentiel, ...genre.tracksActuel].filter(
            (t) => t.sharedWith.length > 0
          );
          if (shared.length === 0) return null;
          return (
            <>
              <dt>Charnières</dt>
              <dd className="card-shared">
                {shared.map((t) => (
                  <span key={t.youtubeId} className="card-shared-row">
                    {t.title},{' '}
                    <span className="card-none">aussi revendiqué par </span>
                    {t.sharedWith.map((x, i) => (
                      <span key={`${x.familyIndex}-${x.genreLocal}`}>
                        {i > 0 && ', '}
                        <button
                          className="card-link"
                          onClick={() => onGoToGenre(x.familyIndex, x.genreLocal)}
                        >
                          {x.label}
                        </button>
                      </span>
                    ))}
                  </span>
                ))}
              </dd>
            </>
          );
        })()}

        {genre.aliases.length > 0 && (
          <>
            <dt>Aussi appelé</dt>
            <dd className="card-aliases">{genre.aliases.join(', ')}</dd>
          </>
        )}
      </dl>

      <footer className="card-actions">
        <button
          className="card-listen"
          onClick={() => onTracks(familyIndex, genreLocal)}
          disabled={tracks === 0}
        >
          {tracks === 0
            ? 'Aucun morceau vérifié'
            : `Écouter, ${tracks} morceau${tracks > 1 ? 'x' : ''}`}
        </button>
        <button className="card-close" onClick={onClose}>
          Fermer
        </button>
      </footer>
    </aside>
  );
}
