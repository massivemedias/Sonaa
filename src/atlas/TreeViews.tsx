/* Les deux vues DOM du multi-vues (ADR-043) : LINÉAIRE et COLONNES.

   La vue linéaire est un document : les grands ensembles en sections, les
   familles en blocs teintés, les genres en rangées serrées indentées par
   génération. La vue colonnes pose les mêmes blocs de familles dans une
   maçonnerie multi-colonnes : quatorze cartes qui tiennent l'écran.

   Les deux réutilisent le même arbre de rangées : une rangée est un genre,
   pastille à la teinte de la famille, nom, BPM, compte de tracks, badge
   débattu. Cliquer le nom ouvre la fiche ; le bouton lecture ouvre le
   lecteur. Aucune donnée n'est inventée : tout vient de STRUCTURES. */

import { useMemo } from 'react';
import { FAMILIES, STRUCTURES, SUPERFAMILIES, type Genre } from './structures.ts';
import './tree-views.css';

interface Props {
  mode: 'lineaire' | 'colonnes';
  onShowCard: (familyIndex: number, genreLocal: number) => void;
  onListen: (familyIndex: number, genreLocal: number) => void;
}

const familyIndexOf = (id: string): number => FAMILIES.findIndex((f) => f.id === id);

/** Rangées d'une famille, en profondeur d'abord : l'ordre généalogique. */
const rowsOf = (familyIndex: number): { genre: Genre; local: number }[] => {
  const structure = STRUCTURES[familyIndex];
  if (!structure) return [];
  const rows: { genre: Genre; local: number }[] = [];
  const walk = (local: number): void => {
    const genre = structure.genres[local];
    if (!genre) return;
    rows.push({ genre, local });
    for (const child of genre.children) walk(child);
  };
  walk(0);
  return rows;
};

function FamilyBlock({
  familyIndex,
  onShowCard,
  onListen
}: {
  familyIndex: number;
  onShowCard: Props['onShowCard'];
  onListen: Props['onListen'];
}) {
  const family = FAMILIES[familyIndex];
  const rows = useMemo(() => rowsOf(familyIndex), [familyIndex]);
  if (!family) return null;

  return (
    <section
      className="tv-family"
      style={{ ['--family' as string]: `oklch(0.72 0.15 ${family.hue})` }}
      aria-label={`Famille ${family.label}`}
    >
      <h3 className="tv-family-name">{family.label}</h3>
      <ul className="tv-rows">
        {rows.map(({ genre, local }) => (
          <li key={genre.id} className="tv-row" style={{ ['--depth' as string]: genre.depth }}>
            <span
              className="tv-dot"
              data-extinct={genre.labelsActuels !== null && genre.labelsActuels.length === 0}
              title={
                genre.labelsActuels !== null && genre.labelsActuels.length === 0
                  ? 'genre éteint, plus aucun label ne le porte'
                  : undefined
              }
            />
            <button
              className="tv-name"
              onClick={() => onShowCard(familyIndex, local)}
              title="Ouvrir la fiche"
            >
              {genre.label}
            </button>
            {genre.confidence === 'debated' && (
              <span className="tv-debated" title="Filiation débattue">?</span>
            )}
            {genre.bpmRange && (
              <span className="tv-bpm">{genre.bpmRange[0]}-{genre.bpmRange[1]}</span>
            )}
            {genre.tracksEssentiel.length + genre.tracksActuel.length > 0 && (
              <button
                className="tv-listen"
                onClick={() => onListen(familyIndex, local)}
                aria-label={`Écouter ${genre.label}`}
                title={`${genre.tracksEssentiel.length + genre.tracksActuel.length} tracks`}
              >
                ▶
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TreeViews({ mode, onShowCard, onListen }: Props) {
  return (
    <div className={`tv tv-${mode}`} data-view={mode}>
      {SUPERFAMILIES.map((sf) => (
        <section key={sf.id} className="tv-ensemble" aria-label={sf.label}>
          <h2 className="tv-ensemble-name">{sf.label}</h2>
          <div className="tv-ensemble-body">
            {sf.members
              .map(familyIndexOf)
              .filter((fi) => fi >= 0)
              .map((fi) => (
                <FamilyBlock
                  key={FAMILIES[fi]?.id}
                  familyIndex={fi}
                  onShowCard={onShowCard}
                  onListen={onListen}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
