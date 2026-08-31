/* LA CHAÎNE CHRONOLOGIQUE.

   Une timeline par famille, accordéon sur mobile, 14 colonnes en desktop.
   L'axe vertical utilise la racine carrée du nombre de genres par décennie
   pour éviter que les années 90 (96 genres) écrasent les années 60 (6 genres).

   Les dates sont DÉDUITES de la track la plus ancienne du corpus, pas
   renseignées. L'affichage dit "vers" pour être honnête sur la marge (~2 ans).

   La filiation montre le parent direct seulement. Les greffes inter-familles
   sont signalées par une pastille colorée, pas un trait qui traverse l'écran. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES, type Genre } from './structures.ts';
import { SiteNav } from './SiteNav.tsx';
import './chronology.css';

/* LA HAUTEUR D'UN CRAN, ecrite une seule fois : la carte, la case de decennie
   et le trait de filiation la lisent tous les trois. Trois ecritures d'un meme
   nombre finiraient par diverger, et ce projet en a fait la demonstration. */
const CRAN_PX = 44;
const MARGE_DECENNIE_PX = 10;

/* LA VUE PAR EPOQUE. Chaque nombre est ecrit une seule fois et lu par le
   placement ET par le style, via des variables CSS : deux ecritures d'une meme
   grandeur finissent toujours par diverger. */
/* L'AXE COMMENCE AU COMMENCEMENT, 1948, et non a 1960.

   Il partait de 1960 parce que la deduction ne trouvait rien avant. Depuis que
   les dates saisies font remonter la musique concrete et l'electroacoustique a
   1948, les plus anciens genres tombaient en x NEGATIF, c'est-a-dire hors
   ecran a gauche : la vue commencait douze ans apres son sujet. */
const AN_DEBUT = 1948;
const DECENNIES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const PX_PAR_AN = 26;
const LARGEUR_CASE = 128;
/* L'ecart minimal entre deux cases d'un meme couloir : la largeur d'une case
   plus une respiration. En dessous, elles se toucheraient. */
const ECART_CASE = LARGEUR_CASE + 8;
const COULOIR_PX = 40;

/* LA MEME GEOMETRIE, TOURNEE D'UN QUART DE TOUR.

   Sur telephone, l'axe est VERTICAL : on commence en 1948 en haut et l'on
   defile vers aujourd'hui, ce qui est le geste naturel du pouce. Les cases
   vont a gauche et a droite au lieu d'aller en haut et en bas.

   Le calcul de placement ne change pas d'un mot : il raisonne en « position le
   long de l'axe » et « distance a l'axe », deux notions qui n'ont pas
   d'orientation. Seules changent les constantes, parce qu'une case est large
   de 128 et haute de 34 : ce qui doit s'ecarter n'est pas la meme dimension.
   C'est la difference entre une geometrie parametree et deux geometries. */
/* SUR TELEPHONE, LA CASE EST UNE CIBLE, PAS UN TIMBRE.

   Trente-quatre pixels de haut et onze de texte : illisible et intouchable.
   Quarante-huit ne suffisait pas encore : cinquante-deux, c'est le seuil
   tactile avec une ligne de lecture. L'axe s'allonge d'autant : on defile
   plus, on vise juste. */
const HAUTEUR_CASE = 52;
const ECART_CASE_V = HAUTEUR_CASE + 10;
const PX_PAR_AN_V = 16;
const COULOIR_PX_V = 176;

interface GenreWithYear extends Genre {
  yearDeduced: number;
  /** Vrai si la date vient de `yearStart` et non d'une deduction. */
  dateSure: boolean;
  hasGraft: boolean;
  graftFamilies: number[];
}

interface Props {
  onOpen: (familyIndex: number, genreLocal: number) => void;
}

export function ChronologyView({ onOpen }: Props) {
  /* Premiere famille ouverte d'office sur telephone : quatorze accordéons
     fermés, c'est un écran vide. Sur grand écran on n'en a pas besoin,
     les quatorze colonnes sont déjà là. */
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  const [openFamily, setOpenFamily] = useState<number | null>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 0 : null
  );
  const [showMajorsOnly, setShowMajorsOnly] = useState(false);
  /* DEUX VUES COMPLEMENTAIRES, ET ON GARDE LES DEUX.

     « Par famille » regroupe : on lit la filiation d'un courant. « Par epoque »
     aligne tout sur un seul axe : on lit la DENSITE reelle, et l'on voit que
     les annees 90 explosent, ce que quatorze colonnes separees ne peuvent pas
     montrer. Chacune perd ce que l'autre gagne, d'ou le selecteur plutot qu'un
     remplacement. */
  const [vue, setVue] = useState<'familles' | 'epoque'>('familles');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const suivre = (): void => setNarrow(mq.matches);
    mq.addEventListener('change', suivre);
    return () => mq.removeEventListener('change', suivre);
  }, []);

  const genresByFamily = useMemo(() => {
    const result: GenreWithYear[][] = [];

    STRUCTURES.forEach((structure, familyIndex) => {
      const genres: GenreWithYear[] = [];

      structure.genres.forEach((genre) => {
        const allTracks = genre.tracks;
        const years = allTracks.map(t => t.year).filter((y): y is number => y !== null && y !== undefined);
        /* LA DATE SAISIE PRIME SUR LA DEDUITE.

           La deduction se trompe dans les deux sens, et c'est mesure : trop
           tard sur les fondateurs, dont le corpus n'a pas les enregistrements
           d'origine ; trop tot sur les genres batis sur un materiau ancien,
           ou le morceau de reference est un ancetre samplE et non un acte de
           naissance. Une date saisie a la main n'a pas ces deux travers.

           Absente, on garde la deduction ET l'on ecrit « vers » : le lecteur
           doit savoir laquelle des deux il lit. */
        const yearDeduced = genre.yearStart ?? (years.length > 0 ? Math.min(...years) : 1990);
        const dateSure = genre.yearStart !== undefined;

        const graftFamilies = (genre.externalParents || [])
          .map(p => p.family)
          .filter(f => f !== familyIndex);

        genres.push({
          ...genre,
          yearDeduced,
          dateSure,
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

  /* LISTE TACTILE, PAS LA FRISE DESKTOP RETRECIE.

     L'accordeon rejouait le rendu en colonnes : cartes de 40 px, texte a
     12 px, positionnement absolu. Sur 390 px c'est illisible et intouchable.
     Ici, une rangee par genre, 52 px, 17 px de nom, l'annee a droite, la
     profondeur en retrait. On lit une famille du pouce, on n'essaie pas de
     viser un timbre. */
  const renderListeMobile = (familyIndex: number) => {
    const family = FAMILIES[familyIndex];
    const genres = filteredGenres(genresByFamily[familyIndex] || []);
    const parDecennie = new Map<number, { genre: GenreWithYear; local: number }[]>();
    genres.forEach((genre) => {
      const d = Math.floor(genre.yearDeduced / 10) * 10;
      const local = (genresByFamily[familyIndex] || []).findIndex((g) => g.id === genre.id);
      const pile = parDecennie.get(d) ?? [];
      pile.push({ genre, local });
      parDecennie.set(d, pile);
    });
    const decennies = [...parDecennie.keys()].sort((a, b) => a - b);

    return (
      <ol className="chrono-liste" style={{ '--hue': family?.hue ?? 0 } as React.CSSProperties}>
        {decennies.map((d) => (
          <li key={d} className="chrono-liste-bloc">
            <h3 className="chrono-liste-decennie">{d}s</h3>
            <ul className="chrono-liste-genres">
              {(parDecennie.get(d) ?? []).map(({ genre, local }) => (
                <li key={genre.id}>
                  <button
                    type="button"
                    className="chrono-liste-genre"
                    data-major={genre.major}
                    style={{ '--retrait': `${8 + genre.depth * 14}px` } as React.CSSProperties}
                    onClick={() => onOpen(familyIndex, local)}
                  >
                    <span className="chrono-liste-nom">{genre.label}</span>
                    <span className="chrono-liste-an">
                      {genre.dateSure ? genre.yearDeduced : formatYear(genre.yearDeduced)}
                    </span>
                    {genre.hasGraft && (
                      <span className="chrono-graft" title="Parent d'une autre famille">
                        {genre.graftFamilies.map((fi) => (
                          <span
                            key={fi}
                            className="chrono-graft-dot"
                            style={{ '--graft-hue': FAMILIES[fi]?.hue ?? 0 } as React.CSSProperties}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    );
  };

  /* PAR EPOQUE SUR TELEPHONE : une liste, pas une geometrie.

     La frise verticale posait l'axe a plusieurs milliers de pixels hors
     cadre (overflow-x coupe) : on voyait un ecran vide. Deux cent dix-neuf
     cases ne tiennent pas en couloirs sur 390 px. On lit le temps de haut
     en bas, une rangee par genre, la pastille dit la famille. */
  const renderListeEpoqueMobile = () => {
    const tous = genresByFamily
      .flatMap((genres, fi) =>
        filteredGenres(genres).map((genre) => ({
          genre,
          fi,
          local: (genresByFamily[fi] || []).findIndex((g) => g.id === genre.id)
        }))
      )
      .sort((a, b) => a.genre.yearDeduced - b.genre.yearDeduced);
    const parDecennie = new Map<number, typeof tous>();
    tous.forEach((e) => {
      const d = Math.floor(e.genre.yearDeduced / 10) * 10;
      const pile = parDecennie.get(d) ?? [];
      pile.push(e);
      parDecennie.set(d, pile);
    });
    const decennies = [...parDecennie.keys()].sort((a, b) => a - b);

    return (
      <ol className="chrono-liste chrono-liste-mixte">
        {decennies.map((d) => (
          <li key={d} className="chrono-liste-bloc">
            <h3 className="chrono-liste-decennie">{d}s</h3>
            <ul className="chrono-liste-genres">
              {(parDecennie.get(d) ?? []).map(({ genre, fi, local }) => (
                <li key={genre.id}>
                  <button
                    type="button"
                    className="chrono-liste-genre"
                    data-major={genre.major}
                    data-mixte="true"
                    style={{ '--hue': FAMILIES[fi]?.hue ?? 0 } as React.CSSProperties}
                    onClick={() => onOpen(fi, local)}
                    title={FAMILIES[fi]?.label}
                  >
                    <span className="chrono-liste-nom">{genre.label}</span>
                    <span className="chrono-liste-an">
                      {genre.dateSure ? genre.yearDeduced : formatYear(genre.yearDeduced)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    );
  };

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

  /* ═══════════════════════════════════════════════════════════════════════
     LA VUE PAR EPOQUE : un axe, et des cases de part et d'autre.

     LE PLACEMENT EST LE TOUT DU PROBLEME. Deux cent dix-huit genres sur
     soixante ans, avec des annees 90 qui en portent quatre-vingt-seize : les
     poser a leur date sans plus reviendrait a refaire le defaut qu'on vient de
     corriger dans l'autre vue, en pire.

     TROIS REGLES, dans cet ordre.

     1. L'alternance haut/bas divise la densite par deux, et c'est gratuit.
     2. De chaque cote, les cases se rangent en COULOIRS : on descend d'un
        couloir tant que la place a la date voulue est prise. Le premier
        couloir libre gagne, donc une case n'est jamais posee sur une autre.
     3. La position horizontale reste EXACTE, a la date. C'est ce qui fait la
        valeur de cette vue : deplacer une case en x mentirait sur la
        chronologie, alors que la descendre d'un couloir ne coute qu'un trait
        de rappel un peu plus long. */
  const placementEpoque = useMemo(() => {
    const tous = genresByFamily
      .flatMap((genres, fi) => genres.map((g, gl) => ({ g, fi, gl })))
      .filter((e) => (showMajorsOnly ? e.g.major : true))
      .sort((a, b) => a.g.yearDeduced - b.g.yearDeduced);

    const parAn = narrow ? PX_PAR_AN_V : PX_PAR_AN;
    const ecart = narrow ? ECART_CASE_V : ECART_CASE;
    const couloirs: { haut: number[][]; bas: number[][] } = { haut: [], bas: [] };
    const poses = tous.map((e, i) => {
      const x = (e.g.yearDeduced - AN_DEBUT) * parAn;
      const largeur = narrow ? HAUTEUR_CASE : LARGEUR_CASE;
      const cote: 'haut' | 'bas' = i % 2 === 0 ? 'haut' : 'bas';
      const pile = couloirs[cote];
      let couloir = 0;
      for (;;) {
        if (!pile[couloir]) pile[couloir] = [];
        const occupe = pile[couloir] as number[];
        /* `occupe` porte la borne droite du dernier pose dans ce couloir : les
           cases arrivant triees par date, il suffit de comparer a elle. */
        const derniere = occupe.length > 0 ? (occupe[occupe.length - 1] ?? -1e9) : -1e9;
        if (x >= derniere + ecart) {
          occupe.push(x + largeur);
          break;
        }
        couloir += 1;
      }
      return { ...e, x, cote, couloir };
    });

    const profondeur = {
      haut: couloirs.haut.length,
      bas: couloirs.bas.length
    };
    const largeurTotale =
      poses.reduce((m, p) => Math.max(m, p.x + (narrow ? HAUTEUR_CASE : LARGEUR_CASE)), 0) + 80;
    return { poses, profondeur, largeurTotale };
  }, [genresByFamily, showMajorsOnly, narrow]);

  const renderEpoque = () => {
    const { poses, profondeur, largeurTotale } = placementEpoque;
    const couloir = narrow ? COULOIR_PX_V : COULOIR_PX;
    const parAn = narrow ? PX_PAR_AN_V : PX_PAR_AN;
    const hautPx = profondeur.haut * couloir + 40;
    const basPx = profondeur.bas * couloir + 40;
    return (
      <div
        className="chrono-epoque"
        data-orientation={narrow ? 'verticale' : 'horizontale'}
        style={{
          '--largeur': `${largeurTotale}px`,
          '--haut': `${hautPx}px`,
          '--bas': `${basPx}px`
        } as React.CSSProperties}
      >
        <div className="chrono-epoque-piste">
          <div className="chrono-epoque-axe" aria-hidden="true" />
          {DECENNIES.map((d) => (
            <span
              key={d}
              className="chrono-epoque-graduation"
              style={{ '--x': `${(d - AN_DEBUT) * parAn}px` } as React.CSSProperties}
            >
              {d}
            </span>
          ))}
          {poses.map(({ g, fi, gl, x, cote, couloir: couloirIdx }) => {
            const family = FAMILIES[fi];
            const distance = (couloirIdx + 1) * (narrow ? COULOIR_PX_V : COULOIR_PX);
            return (
              <div
                key={g.id}
                className="chrono-epoque-groupe"
                data-cote={cote}
                style={{
                  '--x': `${x}px`,
                  '--d': `${distance}px`,
                  '--hue': family?.hue ?? 0
                } as React.CSSProperties}
              >
                {/* LE TRAIT DE RAPPEL relie la case a SA date sur l'axe : sans
                    lui, une case descendue de trois couloirs ne dirait plus a
                    quelle annee elle appartient. */}
                <span className="chrono-epoque-trait" aria-hidden="true" />
                <button className="chrono-epoque-case" onClick={() => onOpen(fi, gl)}>
                  <span className="chrono-epoque-nom">{g.label}</span>
                  <span className="chrono-epoque-an">
                    {g.dateSure ? g.yearDeduced : `vers ${g.yearDeduced}`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="chrono-root" data-narrow={narrow} data-vue={vue}>
      <header className="chrono-header">
        <div className="chrono-chrome">
          <a href="#/" className="chrono-logo" aria-label="SONAA, revenir à l'accueil">
            <img
              src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`}
              alt="SONAA"
              draggable={false}
            />
          </a>
          <SiteNav variant="overlay" />
        </div>
        <h1 className="chrono-title">Chaîne chronologique</h1>
        <p className="chrono-legend">
          <span className="chrono-legend-graft">
            <span className="chrono-graft-dot" style={{ '--graft-hue': 280 } as React.CSSProperties} />
            Une pastille signale un parent d'une autre famille
          </span>
        </p>
        {/* LE SELECTEUR, en tete : le filtre des principaux vit a cote et
            s'applique aux DEUX vues, puisqu'il est lu par les deux calculs. */}
        <div className="chrono-selecteur" role="tablist" aria-label="Mode d'affichage">
          <button
            role="tab"
            aria-selected={vue === 'familles'}
            onClick={() => setVue('familles')}
          >
            Par famille
          </button>
          <button
            role="tab"
            aria-selected={vue === 'epoque'}
            onClick={() => setVue('epoque')}
          >
            Par époque
          </button>
        </div>
        <label className="chrono-filter">
          <input
            type="checkbox"
            checked={showMajorsOnly}
            onChange={(e) => setShowMajorsOnly(e.target.checked)}
          />
          <span>Genres principaux ({stats.majors} sur {stats.total})</span>
        </label>
      </header>

      {vue === 'epoque' ? (narrow ? renderListeEpoqueMobile() : renderEpoque()) : narrow ? (
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
                    {renderListeMobile(i)}
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
