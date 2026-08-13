/* Recherche ÉTENDUE (ADR-045) : genres, ARTISTES, TITRES et LABELS de
   disque. Trouver « Warp » ou « R&S » et voir tous les tracks du corpus sur
   ce label, c'est ce qui transforme l'atlas en outil.

   Résultats groupés par type. Un clic sur un artiste ou un label ouvre la
   liste de ses tracks présents dans le corpus, avec le genre de chacun :
   la rangée ouvre le lecteur sur ce genre, la pastille de genre vole vers
   la carte. Les labels viennent des données de sortie Discogs ; un track
   sans sortie relevée n'apparaît pas côté labels, on n'invente rien. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES } from './structures.ts';
import './search.css';

interface Props {
  onPick: (familyIndex: number, genreLocal: number) => void;
  /** Ouvre le lecteur sur le genre d'un track trouvé. */
  onListen: (familyIndex: number, genreLocal: number) => void;
  onClose: () => void;
}

const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

interface GenreEntry {
  familyIndex: number;
  genreLocal: number;
  label: string;
  familyLabel: string;
  hue: number;
  aliases: readonly string[];
  haystack: string;
  major: boolean;
}

interface TrackEntry {
  familyIndex: number;
  genreLocal: number;
  genreLabel: string;
  hue: number;
  artist: string;
  title: string;
  releaseLabel: string | null;
  fArtist: string;
  fTitle: string;
  fLabel: string;
}

interface Index {
  genres: GenreEntry[];
  tracks: TrackEntry[];
  artists: Map<string, { name: string; tracks: TrackEntry[] }>;
  labels: Map<string, { name: string; tracks: TrackEntry[] }>;
}

const buildIndex = (): Index => {
  const genres: GenreEntry[] = [];
  const tracks: TrackEntry[] = [];
  const artists = new Map<string, { name: string; tracks: TrackEntry[] }>();
  const labels = new Map<string, { name: string; tracks: TrackEntry[] }>();

  FAMILIES.forEach((family, familyIndex) => {
    STRUCTURES[familyIndex]?.genres.forEach((genre, genreLocal) => {
      genres.push({
        familyIndex,
        genreLocal,
        label: genre.label,
        familyLabel: family.label,
        hue: family.hue,
        aliases: genre.aliases,
        haystack: fold(`${genre.label} ${genre.aliases.join(' ')} ${family.label}`),
        major: genre.major
      });

      for (const t of [...genre.tracksEssentiel, ...genre.tracksActuel]) {
        const entry: TrackEntry = {
          familyIndex,
          genreLocal,
          genreLabel: genre.label,
          hue: family.hue,
          artist: t.artist,
          title: t.title,
          releaseLabel: t.release?.label ?? null,
          fArtist: fold(t.artist),
          fTitle: fold(t.title),
          fLabel: t.release?.label ? fold(t.release.label) : ''
        };
        tracks.push(entry);

        const aKey = entry.fArtist;
        if (!artists.has(aKey)) artists.set(aKey, { name: t.artist, tracks: [] });
        artists.get(aKey)?.tracks.push(entry);

        if (entry.releaseLabel && entry.fLabel) {
          if (!labels.has(entry.fLabel)) labels.set(entry.fLabel, { name: entry.releaseLabel, tracks: [] });
          labels.get(entry.fLabel)?.tracks.push(entry);
        }
      }
    });
  });
  return { genres, tracks, artists, labels };
};

/** Un item actionnable de la liste plate (le clavier navigue dessus). */
type Item =
  | { type: 'genre'; entry: GenreEntry; via: string | null }
  | { type: 'artist'; name: string; count: number; key: string }
  | { type: 'track'; entry: TrackEntry }
  | { type: 'label'; name: string; count: number; key: string };

export function SearchOverlay({ onPick, onListen, onClose }: Props) {
  const index = useMemo(buildIndex, []);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  /** Vue de détail : la liste des tracks d'un artiste ou d'un label. */
  const [drill, setDrill] = useState<{ type: 'artist' | 'label'; key: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    if (drill) {
      const source = drill.type === 'artist' ? index.artists : index.labels;
      const tracks = source.get(drill.key)?.tracks ?? [];
      return tracks.map((entry) => ({ type: 'track', entry }));
    }

    const q = fold(query);
    if (q.length === 0) {
      return index.genres
        .filter((e) => e.major)
        .slice(0, 8)
        .map((entry) => ({ type: 'genre', entry, via: null }) as Item);
    }

    const out: Item[] = [];

    // Genres : nom, alias, famille.
    const genreHits = index.genres
      .map((e) => {
        const label = fold(e.label);
        let s = -1;
        if (label === q) s = 100;
        else if (label.startsWith(q)) s = 80;
        else if (label.includes(q)) s = 60;
        let via: string | null = null;
        for (const alias of e.aliases) {
          const a = fold(alias);
          const as = a === q ? 70 : a.startsWith(q) ? 55 : a.includes(q) ? 40 : -1;
          if (as > s) {
            s = as;
            via = alias;
          }
        }
        if (s < 0 && e.haystack.includes(q)) {
          s = 20;
          via = e.familyLabel;
        }
        return s < 0 ? null : { e, s: s + (e.major ? 4 : 0), via };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
    out.push(...genreHits.map(({ e, via }) => ({ type: 'genre', entry: e, via }) as Item));

    // Artistes.
    const artistHits = [...index.artists.entries()]
      .filter(([k]) => k.includes(q))
      .sort((a, b) => (a[0].startsWith(q) === b[0].startsWith(q) ? b[1].tracks.length - a[1].tracks.length : a[0].startsWith(q) ? -1 : 1))
      .slice(0, 4);
    out.push(
      ...artistHits.map(([key, v]) => ({ type: 'artist', name: v.name, count: v.tracks.length, key }) as Item)
    );

    // Tracks, par titre.
    const trackHits = index.tracks
      .filter((t) => t.fTitle.includes(q))
      .sort((a, b) => (a.fTitle.startsWith(q) === b.fTitle.startsWith(q) ? 0 : a.fTitle.startsWith(q) ? -1 : 1))
      .slice(0, 6);
    out.push(...trackHits.map((entry) => ({ type: 'track', entry }) as Item));

    // Labels de disque.
    const labelHits = [...index.labels.entries()]
      .filter(([k]) => k.includes(q))
      .sort((a, b) => b[1].tracks.length - a[1].tracks.length)
      .slice(0, 4);
    out.push(
      ...labelHits.map(([key, v]) => ({ type: 'label', name: v.name, count: v.tracks.length, key }) as Item)
    );

    return out;
  }, [index, query, drill]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ÉCHAP FERME, DANS TOUS LES CAS.

     Il ne fermait que si le focus se trouvait DANS la boîte : le gestionnaire
     vivait sur elle. Un clic dans la zone sombre, un champ qui perd le focus,
     et la touche ne répondait plus. On sort donc l'écoute sur la fenêtre :
     tant que la recherche est montée, Échap la ferme, d'où que vienne la
     frappe. */
  useEffect(() => {
    const surTouche = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (drill) setDrill(null);
      else onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [drill, onClose]);

  useEffect(() => {
    setCursor(0);
  }, [query, drill]);

  const act = (item: Item | undefined): void => {
    if (!item) return;
    if (item.type === 'genre') {
      onPick(item.entry.familyIndex, item.entry.genreLocal);
      onClose();
      return;
    }
    if (item.type === 'track') {
      onListen(item.entry.familyIndex, item.entry.genreLocal);
      onClose();
      return;
    }
    setDrill({ type: item.type, key: item.key, name: item.name });
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (drill) setDrill(null);
      else onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(items.length - 1, c + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    /* ESPACE SUR UN CHAMP VIDE REFERME. Sur un champ qui contient du texte,
       il écrit une espace, ce qui est le comportement attendu de la touche et
       ne se discute pas : la fermeture ne vaut que sur le vide. */
    if (event.code === 'Space' && query.length === 0 && !drill) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      act(items[cursor]);
    }
  };

  /* Rendu groupé : l'ordre plat des items suit l'ordre visuel, le clavier
     et la souris désignent donc la même chose. */
  const groups: { title: string; from: number; to: number }[] = [];
  if (!drill) {
    let i = 0;
    for (const type of ['genre', 'artist', 'track', 'label'] as const) {
      const from = i;
      while (i < items.length && items[i]?.type === type) i += 1;
      if (i > from) {
        groups.push({
          title:
            type === 'genre' ? 'Genres' : type === 'artist' ? 'Artistes' : type === 'track' ? 'Tracks' : 'Labels',
          from,
          to: i
        });
      }
    }
  }

  const row = (item: Item, i: number) => {
    const active = i === cursor;
    if (item.type === 'genre') {
      return (
        <button
          role="option"
          aria-selected={active}
          data-active={active}
          className="search-hit"
          onMouseEnter={() => setCursor(i)}
          onClick={() => act(item)}
        >
          <span className="search-dot" style={{ background: `oklch(0.72 0.15 ${item.entry.hue})` }} aria-hidden="true" />
          <span className="search-label">{item.entry.label}</span>
          <span className="search-family">{item.entry.familyLabel}</span>
          {item.via && item.via !== item.entry.familyLabel && <span className="search-via">alias {item.via}</span>}
        </button>
      );
    }
    if (item.type === 'track') {
      return (
        <button
          role="option"
          aria-selected={active}
          data-active={active}
          className="search-hit"
          onMouseEnter={() => setCursor(i)}
          onClick={() => act(item)}
        >
          <span className="search-dot" style={{ background: `oklch(0.72 0.15 ${item.entry.hue})` }} aria-hidden="true" />
          <span className="search-label">{item.entry.title}</span>
          <span className="search-sub">{item.entry.artist}</span>
          <span
            className="search-genre-chip"
            role="link"
            tabIndex={-1}
            title="Voir sur la carte"
            onClick={(e) => {
              e.stopPropagation();
              onPick(item.entry.familyIndex, item.entry.genreLocal);
              onClose();
            }}
          >
            {item.entry.genreLabel}
          </span>
        </button>
      );
    }
    // artiste ou label : ouvre sa liste de tracks.
    return (
      <button
        role="option"
        aria-selected={active}
        data-active={active}
        className="search-hit"
        onMouseEnter={() => setCursor(i)}
        onClick={() => act(item)}
      >
        <span className="search-label">{item.name}</span>
        <span className="search-family">
          {item.count} track{item.count > 1 ? 's' : ''} au corpus ›
        </span>
      </button>
    );
  };

  return (
    <div
      className="search"
      role="dialog"
      aria-modal="true"
      aria-label="Chercher"
      /* UN CLIC EN DEHORS DE LA BOÎTE REFERME. Le test porte sur la CIBLE du
         clic : si elle est le fond lui-même, le geste visait le vide. Un clic
         dans la boîte remonte jusqu'ici par propagation, et il ne doit rien
         fermer. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-box" onKeyDown={onKeyDown}>
        {drill ? (
          <div className="search-drill-head">
            <button className="search-back" onClick={() => setDrill(null)} aria-label="Revenir à la recherche">
              ‹
            </button>
            <span className="search-drill-name">{drill.name}</span>
            <span className="search-family">{drill.type === 'artist' ? 'artiste' : 'label'}</span>
          </div>
        ) : (
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            value={query}
            placeholder="Genre, artiste, track ou label"
            aria-label="Chercher un genre, un artiste, un track ou un label"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        <ul className="search-results" role="listbox">
          {items.length === 0 && <li className="search-empty">Rien ne correspond.</li>}
          {drill
            ? items.map((item, i) => <li key={i}>{row(item, i)}</li>)
            : groups.map((g) => (
                <li key={g.title} className="search-group">
                  <p className="search-group-title">{g.title}</p>
                  <ul>
                    {items.slice(g.from, g.to).map((item, k) => (
                      <li key={g.from + k}>{row(item, g.from + k)}</li>
                    ))}
                  </ul>
                </li>
              ))}
        </ul>

        <p className="search-hint">
          {drill
            ? 'La rangée ouvre le lecteur, la pastille de genre vole vers la carte. Échap pour revenir.'
            : 'Flèches pour choisir, Entrée pour ouvrir, Échap pour fermer.'}
        </p>
      </div>
    </div>
  );
}
