/* LA CHAÎNE CHRONOLOGIQUE.

   Une timeline par famille, accordéon sur mobile, 14 colonnes en desktop.
   L'axe vertical utilise la racine carrée du nombre de genres par décennie
   pour éviter que les années 90 (96 genres) écrasent les années 60 (6 genres).

   Les dates sont DÉDUITES de la track la plus ancienne du corpus, pas
   renseignées. L'affichage dit "vers" pour être honnête sur la marge (~2 ans).

   La filiation montre le parent direct seulement. Les greffes inter-familles
   sont signalées par une pastille colorée, pas un trait qui traverse l'écran. */

import { useCallback, useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES, type Genre } from './structures.ts';
import './chronology.css';

/* LA HAUTEUR D'UN CRAN, ecrite une seule fois : la carte, la case de decennie
   et le trait de filiation la lisent tous les trois. Trois ecritures d'un meme
   nombre finiraient par diverger, et ce projet en a fait la demonstration. */
const CRAN_PX = 44;
const MARGE_DECENNIE_PX = 10;

interface GenreWithYear extends Genre {
  yearDeduced: number;
  hasGraft: boolean;
  graftFamilies: number[];
}

interface Props {
  onOpen: (familyIndex: number, genreLocal: number) => void;
}

export function ChronologyView({ onOpen }: Props) {
  const [openFamily, setOpenFamily] = useState<number | null>(null);
  const [showMajorsOnly, setShowMajorsOnly] = useState(false);
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  const genresByFamily = useMemo(() => {
    const result: GenreWithYear[][] = [];

    STRUCTURES.forEach((structure, familyIndex) => {
      const genres: GenreWithYear[] = [];

      structure.genres.forEach((genre) => {
        const allTracks = [...(genre.tracksEssentiel || []), ...(genre.tracksActuel || [])];
        const years = allTracks.map(t => t.year).filter((y): y is number => y !== null && y !== undefined);
        const yearDeduced = years.length > 0 ? Math.min(...years) : 1990;

        const graftFamilies = (genre.externalParents || [])
          .map(p => p.family)
          .filter(f => f !== familyIndex);

        genres.push({
          ...genre,
          yearDeduced,
          hasGraft: graftFamilies.length > 0,
          graftFamilies
        });
      });

      genres.sort((a, b) => a.yearDeduced - b.yearDeduced);
      result.push(genres);
    });

    return result;
  }, []);

  const stats = useMemo(() => {
    const all = genresByFamily.flat();
    const majors = all.filter(g => g.major);
    return { total: all.length, majors: majors.length };
  }, [genresByFamily]);

  const decadeScale = useMemo(() => {
    const counts: Record<number, number> = {};
    genresByFamily.flat().forEach(g => {
      const decade = Math.floor(g.yearDeduced / 10) * 10;
      counts[decade] = (counts[decade] || 0) + 1;
    });

    const decades = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const minDecade = decades[0] || 1960;
    const maxDecade = decades[decades.length - 1] || 2020;

    /* ═══════════════════════════════════════════════════════════════════
       UNE DECENNIE EST HAUTE COMME SA COLONNE LA PLUS CHARGEE.

       LE DEFAUT : chaque carte etait posee a la position de son ANNEE dans la
       decennie, et rien d'autre. Deux genres nes a deux ans d'intervalle se
       retrouvaient donc l'un sur l'autre, et le plus recent masquait le plus
       ancien : « Disco » sous « Hi-NRG », « Chicago House » sous « Deep
       House », « Musique concrete » a cheval sur « Funk » et « Krautrock ».
       Ce n'etait pas un reglage trop serre, c'etait l'absence de toute notion
       d'empilement : le recouvrement etait garanti par construction.

       LA REGLE : dans sa case de decennie, chaque carte occupe un CRAN, et
       les crans se suivent. La hauteur de la case vaut donc le nombre de
       crans de la colonne la plus chargee de cette decennie, toutes familles
       confondues, puisque les cases sont alignees horizontalement. Une
       decennie saturee allonge la colonne et l'on defile, ce qui est le prix
       assume : mieux vaut defiler que ne pas pouvoir lire.

       ON PASSE DONC DES POURCENTAGES AUX PIXELS. Une hauteur en pourcentage
       ne peut pas exprimer « autant de crans qu'il en faut » : elle dit une
       part d'un total, et le total est justement ce qu'on ne connait qu'apres
       avoir compte. */
    const parDecennieEtFamille: Record<number, number> = {};
    genresByFamily.forEach((genres) => {
      const parDecennie: Record<number, number> = {};
      genres.forEach((g) => {
        const d = Math.floor(g.yearDeduced / 10) * 10;
        parDecennie[d] = (parDecennie[d] || 0) + 1;
      });
      Object.entries(parDecennie).forEach(([d, n]) => {
        const k = Number(d);
        parDecennieEtFamille[k] = Math.max(parDecennieEtFamille[k] ?? 0, n);
      });
    });

    const positions: Record<number, { start: number; height: number }> = {};
    let cumulative = 0;

    for (let d = minDecade; d <= maxDecade; d += 10) {
      const crans = Math.max(1, parDecennieEtFamille[d] ?? 1);
      const height = crans * CRAN_PX + MARGE_DECENNIE_PX;
      positions[d] = { start: cumulative, height };
      cumulative += height;
    }

    return { positions, minDecade, maxDecade, hauteurTotale: cumulative };
  }, [genresByFamily]);

  /* LE CRAN D'UNE CARTE DANS SA DECENNIE, et non sa position dans l'annee.

     L'ordre a l'interieur de la case reste chronologique : on trie par annee,
     donc la lecture de haut en bas suit toujours le temps. Ce qu'on perd est
     la position exacte a l'annee pres, ce qui ne se lisait de toute facon pas
     quand deux cartes se recouvraient. */
  const getYPosition = useCallback((year: number, cran = 0): number => {
    const decade = Math.floor(year / 10) * 10;
    const pos = decadeScale.positions[decade];
    if (!pos) return 0;
    return pos.start + MARGE_DECENNIE_PX / 2 + cran * CRAN_PX;
  }, [decadeScale]);

  /* Le cran de chaque genre, calcule PAR COLONNE : deux familles peuvent
     occuper le meme cran de la meme decennie, elles ne se croisent jamais. */
  const cransParFamille = useCallback((genres: GenreWithYear[]) => {
    const compteur: Record<number, number> = {};
    const crans = new Map<string, number>();
    [...genres]
      .sort((a, b) => a.yearDeduced - b.yearDeduced)
      .forEach((g) => {
        const d = Math.floor(g.yearDeduced / 10) * 10;
        crans.set(g.id, compteur[d] ?? 0);
        compteur[d] = (compteur[d] ?? 0) + 1;
      });
    return crans;
  }, []);

  const formatYear = (year: number): string => {
    const fiveYear = Math.floor(year / 5) * 5;
    return `vers ${fiveYear}`;
  };

  const toggleFamily = useCallback((index: number) => {
    setOpenFamily(prev => prev === index ? null : index);
  }, []);

  const filteredGenres = useCallback((genres: GenreWithYear[]) => {
    if (!showMajorsOnly) return genres;
    return genres.filter(g => g.major);
  }, [showMajorsOnly]);

  const renderGenre = (genre: GenreWithYear, familyIndex: number, genreLocal: number, cran = 0) => {
    const family = FAMILIES[familyIndex];
    const yPos = getYPosition(genre.yearDeduced, cran);

    return (
      <button
        key={genre.id}
        className="chrono-genre"
        style={{
          '--y': `${yPos}px`,
          '--hue': family?.hue ?? 0
        } as React.CSSProperties}
        onClick={() => onOpen(familyIndex, genreLocal)}
        data-major={genre.major}
      >
        <span className="chrono-genre-label">{genre.label}</span>
        <span className="chrono-genre-year">{formatYear(genre.yearDeduced)}</span>
        {genre.hasGraft && (
          <span className="chrono-graft" title="Parent d'une autre famille">
            {genre.graftFamilies.map(fi => (
              <span
                key={fi}
                className="chrono-graft-dot"
                style={{ '--graft-hue': FAMILIES[fi]?.hue ?? 0 } as React.CSSProperties}
              />
            ))}
          </span>
        )}
      </button>
    );
  };

  const renderTimeline = (familyIndex: number) => {
    const genres = filteredGenres(genresByFamily[familyIndex] || []);
    const family = FAMILIES[familyIndex];

    return (
      <div
        className="chrono-timeline"
        style={{ '--hue': family?.hue ?? 0, '--h-totale': `${decadeScale.hauteurTotale}px` } as React.CSSProperties}
      >
        <div className="chrono-axis">
          {Object.entries(decadeScale.positions).map(([decade, pos]) => (
            <div
              key={decade}
              className="chrono-decade"
              style={{ '--start': `${pos.start}px`, '--h': `${pos.height}px` } as React.CSSProperties}
            >
              <span className="chrono-decade-label">{decade}s</span>
            </div>
          ))}
        </div>
        <div className="chrono-genres">
          {(() => {
            const crans = cransParFamille(genres);
            return genres.map((genre) => {
              const genreLocal = (genresByFamily[familyIndex] || []).findIndex(g => g.id === genre.id);
              return renderGenre(genre, familyIndex, genreLocal, crans.get(genre.id) ?? 0);
            });
          })()}
          {genres.length > 1 && genres.map((genre, i) => {
            if (genre.parent < 0) return null;
            const parentGenre = (genresByFamily[familyIndex] || [])[genre.parent];
            if (!parentGenre) return null;
            const crans = cransParFamille(genres);
            const y1 = getYPosition(parentGenre.yearDeduced, crans.get(parentGenre.id) ?? 0);
            const y2 = getYPosition(genre.yearDeduced, crans.get(genre.id) ?? 0);
            return (
              <svg key={`line-${i}`} className="chrono-line" preserveAspectRatio="none">
                <line x1="50%" y1={`${y1}px`} x2="50%" y2={`${y2}px`} />
              </svg>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="chrono-root" data-narrow={narrow}>
      <header className="chrono-header">
        <h1 className="chrono-title">Chaîne chronologique</h1>
        <p className="chrono-legend">
          <span className="chrono-legend-graft">
            <span className="chrono-graft-dot" style={{ '--graft-hue': 280 } as React.CSSProperties} />
            Une pastille signale un parent d'une autre famille
          </span>
        </p>
        <label className="chrono-filter">
          <input
            type="checkbox"
            checked={showMajorsOnly}
            onChange={(e) => setShowMajorsOnly(e.target.checked)}
          />
          <span>Genres principaux ({stats.majors} sur {stats.total})</span>
        </label>
      </header>

      {narrow ? (
        <div className="chrono-accordion">
          {FAMILIES.map((family, i) => {
            const genres = filteredGenres(genresByFamily[i] || []);
            const isOpen = openFamily === i;
            return (
              <div key={family.id} className="chrono-family" data-open={isOpen}>
                <button
                  className="chrono-family-header"
                  onClick={() => toggleFamily(i)}
                  style={{ '--hue': family.hue } as React.CSSProperties}
                >
                  <span className="chrono-family-name">{family.label}</span>
                  <span className="chrono-family-count">{genres.length}</span>
                  <span className="chrono-family-chevron" aria-hidden="true">
                    {isOpen ? '▾' : '▸'}
                  </span>
                </button>
                {isOpen && (
                  <div className="chrono-family-body">
                    {renderTimeline(i)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chrono-columns">
          {FAMILIES.map((family, i) => (
            <div key={family.id} className="chrono-column">
              <h2
                className="chrono-column-header"
                style={{ '--hue': family.hue } as React.CSSProperties}
              >
                {family.label}
              </h2>
              {renderTimeline(i)}
            </div>
          ))}
        </div>
      )}

      <footer className="chrono-footer">
        <p>
          Les dates sont déduites de la track la plus ancienne du corpus.
          Marge d'erreur : environ 2 ans.
        </p>
      </footer>
    </div>
  );
}
