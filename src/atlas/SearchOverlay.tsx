/* Recherche d'un genre. Raccourci « / », comme dans un lecteur de code.

   Elle cherche sur le nom, sur les alias et sur le nom de famille. Les alias
   viennent du champ `aka` d'Ishkur, filtrés : un alias qui est le nom d'un
   AUTRE genre du corpus est écarté, sinon taper « Detroit Techno » enverrait
   sur Minimal Techno, dont Ishkur en fait un alias alors que c'est son ancêtre.

   Le résultat fait voler la caméra, il ne téléporte pas : on doit voir le
   trajet, sinon on ne sait plus où on est. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES } from './structures.ts';
import './search.css';

interface Props {
  onPick: (familyIndex: number, genreLocal: number) => void;
  onClose: () => void;
}

interface Entry {
  familyIndex: number;
  genreLocal: number;
  label: string;
  familyLabel: string;
  hue: number;
  aliases: readonly string[];
  /** Chaîne de recherche préparée une fois pour toutes. */
  haystack: string;
  major: boolean;
}

const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Index construit une fois : 68 genres, ce n'est pas la peine d'en faire plus. */
const buildIndex = (): Entry[] => {
  const out: Entry[] = [];
  FAMILIES.forEach((family, familyIndex) => {
    STRUCTURES[familyIndex]?.genres.forEach((genre, genreLocal) => {
      out.push({
        familyIndex,
        genreLocal,
        label: genre.label,
        familyLabel: family.label,
        hue: family.hue,
        aliases: genre.aliases,
        haystack: fold(`${genre.label} ${genre.aliases.join(' ')} ${family.label}`),
        major: genre.major
      });
    });
  });
  return out;
};

interface Scored extends Entry {
  score: number;
  /** L'alias qui a permis la trouvaille, s'il ne s'agit pas du nom. */
  via: string | null;
}

const score = (entry: Entry, q: string): Scored | null => {
  const label = fold(entry.label);
  let s = -1;

  if (label === q) s = 100;
  else if (label.startsWith(q)) s = 80;
  else if (label.includes(q)) s = 60;

  let via: string | null = null;
  for (const alias of entry.aliases) {
    const a = fold(alias);
    const as = a === q ? 70 : a.startsWith(q) ? 55 : a.includes(q) ? 40 : -1;
    if (as > s) {
      s = as;
      via = alias;
    }
  }

  if (s < 0 && entry.haystack.includes(q)) {
    s = 20;
    via = entry.familyLabel;
  }
  if (s < 0) return null;

  // À score égal, un genre majeur passe devant, puis le nom le plus court.
  return { ...entry, score: s + (entry.major ? 4 : 0) - entry.label.length * 0.05, via };
};

export function SearchOverlay({ onPick, onClose }: Props) {
  const index = useMemo(buildIndex, []);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<Scored[]>(() => {
    const q = fold(query);
    /* Champ vide : on propose les genres majeurs, pour que la recherche serve
       aussi de sommaire quand on ne sait pas quoi chercher. */
    if (q.length === 0) {
      return index.filter((e) => e.major).slice(0, 8).map((e) => ({ ...e, score: 0, via: null }));
    }
    return index
      .map((e) => score(e, q))
      .filter((e): e is Scored => e !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 9);
  }, [index, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const pick = (i: number): void => {
    const hit = results[i];
    if (!hit) return;
    onPick(hit.familyIndex, hit.genreLocal);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      pick(cursor);
    }
  };

  return (
    <div className="search" role="dialog" aria-modal="true" aria-label="Chercher un genre">
      <div className="search-box" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          className="search-input"
          type="search"
          value={query}
          placeholder="Chercher un genre, un alias, une famille"
          aria-label="Chercher un genre"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
        />

        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="search-empty">Aucun genre ne correspond.</li>}
          {results.map((hit, i) => (
            <li key={`${hit.familyIndex}-${hit.genreLocal}`}>
              <button
                role="option"
                aria-selected={i === cursor}
                data-active={i === cursor}
                className="search-hit"
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(i)}
              >
                <span
                  className="search-dot"
                  style={{ background: `oklch(0.72 0.15 ${hit.hue})` }}
                  aria-hidden="true"
                />
                <span className="search-label">{hit.label}</span>
                <span className="search-family">{hit.familyLabel}</span>
                {hit.via && hit.via !== hit.familyLabel && (
                  <span className="search-via">alias {hit.via}</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <p className="search-hint">
          Flèches pour choisir, Entrée pour y aller, Échap pour fermer.
        </p>
      </div>
    </div>
  );
}
