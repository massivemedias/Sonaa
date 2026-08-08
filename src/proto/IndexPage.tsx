/* Vue alternative, route #/index.

   Ce n'est plus un repli graphique : c'est un chemin de première classe, avec le
   même contenu et les mêmes liens que l'espace 3D. Elle sert d'index accessible
   pour tout le monde, pas seulement quand WebGL manque (ADR-008).

   Construite sur des éléments natifs : details et summary sont nativement
   atteignables au clavier et annoncés correctement par les lecteurs d'écran.
   Aucun aria-expanded à maintenir à la main, donc aucune occasion de mentir. */

import { useMemo } from 'react';
import { FAMILIES, FAMILY_LINKS, STRUCTURES } from './masses.ts';
import './index-view.css';

export function IndexPage() {
  const families = useMemo(
    () =>
      FAMILIES.map((mass, i) => ({
        mass,
        genres: STRUCTURES[i]?.genres ?? [],
        parents: FAMILY_LINKS.filter((link) => link.to === i).map((link) => FAMILIES[link.from]?.label ?? ''),
        children: FAMILY_LINKS.filter((link) => link.from === i).map((link) => FAMILIES[link.to]?.label ?? '')
      })),
    []
  );

  const total = families.reduce((sum, f) => sum + f.genres.length, 0);

  return (
    <div className="index-root">
      <a className="index-skip" href="#familles">
        Aller à la liste des familles
      </a>

      <header className="index-head">
        <h1>SONAA, index</h1>
        <p>
          Navigation hiérarchique des {FAMILIES.length} familles et de leurs {total} genres. Même
          contenu et mêmes liens que l&apos;espace, sans la matière.
        </p>
        <p className="index-mono">
          <a href="#/proto">Ouvrir l&apos;espace 3D</a>
        </p>
      </header>

      <main id="familles">
        <ol className="index-families">
          {families.map(({ mass, genres, parents, children }) => (
            <li key={mass.id}>
              <details>
                <summary>
                  <span className="index-dot" style={{ ['--h' as string]: String(mass.hue) }} />
                  <span className="index-family-name">{mass.label}</span>
                  <span className="index-mono">{genres.length} genres</span>
                </summary>

                <div className="index-family-body">
                  <dl className="index-relations">
                    {parents.length > 0 && (
                      <>
                        <dt>Née de</dt>
                        <dd>{parents.join(', ')}</dd>
                      </>
                    )}
                    {children.length > 0 && (
                      <>
                        <dt>A donné</dt>
                        <dd>{children.join(', ')}</dd>
                      </>
                    )}
                  </dl>

                  <table className="index-genres">
                    <caption className="index-visually-hidden">
                      Genres de la famille {mass.label}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Genre</th>
                        <th scope="col">BPM</th>
                        <th scope="col">Morceaux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genres.map((genre) => (
                        <tr key={genre.id}>
                          <th scope="row">{genre.label}</th>
                          <td className="index-mono">
                            {genre.bpmRange[0]}-{genre.bpmRange[1]}
                          </td>
                          <td className="index-mono">{genre.tracks.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </main>

      <footer className="index-foot">
        <p className="index-mono">
          Données factices, prototype. Le corpus réel arrive en P1.
        </p>
      </footer>
    </div>
  );
}
