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
  familyLabel: string;
  hue: number;
  artist: string;
  title: string;
  year: number | null;
  releaseLabel: string | null;
  /* L'IDENTIFIANT VIDÉO IDENTIFIE LE MORCEAU, pas le couple titre-artiste.
     C'est lui qui permet de savoir qu'un même morceau est revendiqué par
     plusieurs genres : les charnières du corpus. */
  videoId: string;
  fArtist: string;
  fTitle: string;
  fLabel: string;
}

interface Index {
  genres: GenreEntry[];
  tracks: TrackEntry[];
  artists: Map<string, { name: string; tracks: TrackEntry[] }>;
  labels: Map<string, { name: string; tracks: TrackEntry[] }>;
  /** Toutes les entrées d'un même morceau, par identifiant vidéo. */
  parVideo: Map<string, TrackEntry[]>;
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
          familyLabel: family.label,
          hue: family.hue,
          artist: t.artist,
          title: t.title,
          year: t.year ?? null,
          videoId: t.youtubeId,
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
  /* Les charnières : un même enregistrement revendiqué par plusieurs genres.
     Le corpus les déclare en répétant l'identifiant vidéo, et c'est la seule
     façon de les retrouver. On les regroupe ici une fois pour toutes. */
  const parVideo = new Map<string, TrackEntry[]>();
  for (const t of tracks) {
    const l = parVideo.get(t.videoId);
    if (l) l.push(t);
    else parVideo.set(t.videoId, [t]);
  }

  return { genres, tracks, artists, labels, parVideo };
};

/* ─────────────────────────────────────────────────────────────────────────
   LA RECHERCHE TOLÈRE LES FAUTES, ET CHERCHE PARTOUT À LA FOIS.

   Elle était EXACTE : une sous-chaîne, dans un seul champ. « moroder feel
   love » ne trouvait rien, parce qu'aucun titre ne contient ces trois mots et
   que l'artiste n'était pas interrogé en même temps que le titre. Or c'est
   exactement ainsi qu'on cherche un morceau dont on ne se rappelle qu'à moitié.

   Trois règles, dans l'ordre où elles s'appliquent.

   1. LES MOTS SONT INDÉPENDANTS. La requête est découpée, et chaque mot doit
      se retrouver quelque part dans le titre OU dans l'artiste. L'ordre ne
      compte pas, ni le champ où le mot tombe.
   2. UNE FAUTE DE FRAPPE EST TOLÉRÉE. Distance d'édition de 1 à partir de
      quatre lettres, de 2 à partir de sept : « morodr » trouve Moroder,
      « techhno » trouve techno. En dessous de quatre lettres, aucune
      tolérance, sinon « the » trouverait la moitié du corpus.
   3. CE QUI COMMENCE PAR LA REQUÊTE PASSE DEVANT. Un préfixe est un signe
      d'intention plus fort qu'une occurrence au milieu d'un mot.
   ───────────────────────────────────────────────────────────────────────── */

/** Distance d'édition, bornée : au-delà de `max` on abandonne, c'est inutile
    de compter plus loin et cela coupe le coût sur les longues chaînes. */
const distance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let precedente = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const courante = [i];
    let meilleur = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(
        (courante[j - 1] ?? 0) + 1,
        (precedente[j] ?? 0) + 1,
        (precedente[j - 1] ?? 0) + cout
      );
      courante[j] = v;
      if (v < meilleur) meilleur = v;
    }
    if (meilleur > max) return max + 1;
    precedente = courante;
  }
  return precedente[b.length] ?? max + 1;
};

const toleranceDe = (mot: string): number => (mot.length >= 7 ? 2 : mot.length >= 4 ? 1 : 0);

/** Un mot se retrouve-t-il dans ce texte, faute de frappe comprise ? Rend un
    score : 3 exact au début, 2 exact ailleurs, 1 approché, 0 absent. */
const motDans = (mot: string, texte: string): number => {
  if (texte.startsWith(mot)) return 3;
  if (texte.includes(mot)) return 2;
  const tol = toleranceDe(mot);
  if (tol === 0) return 0;
  for (const m of texte.split(' ')) {
    if (m.length === 0) continue;
    if (distance(mot, m, tol) <= tol) return 1;
  }
  return 0;
};

/** Score d'un morceau pour une requête découpée. Zéro si un mot manque. */
const scoreTrack = (mots: string[], t: TrackEntry): number => {
  const champs = [t.fTitle, t.fArtist, t.fLabel];
  let total = 0;
  for (const mot of mots) {
    let meilleur = 0;
    for (let i = 0; i < champs.length; i += 1) {
      const s = motDans(mot, champs[i] ?? '');
      /* Le titre pèse plus que l'artiste, qui pèse plus que le label : on
         cherche un morceau, pas une discographie. */
      const pondere = s === 0 ? 0 : s * (i === 0 ? 1.2 : i === 1 ? 1 : 0.6);
      if (pondere > meilleur) meilleur = pondere;
    }
    if (meilleur === 0) return 0;
    total += meilleur;
  }
  return total;
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
        /* Faute de frappe sur le nom du genre : « techhno » trouve Techno. */
        if (s < 0 && motDans(q, label) > 0) {
          s = 15;
          via = null;
        }
        return s < 0 ? null : { e, s: s + (e.major ? 4 : 0), via };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
    out.push(...genreHits.map(({ e, via }) => ({ type: 'genre', entry: e, via }) as Item));

    // Artistes.
    const artistHits = [...index.artists.entries()]
      .filter(([k]) => motDans(q, k) > 0)
      .sort((a, b) => (a[0].startsWith(q) === b[0].startsWith(q) ? b[1].tracks.length - a[1].tracks.length : a[0].startsWith(q) ? -1 : 1))
      .slice(0, 4);
    out.push(
      ...artistHits.map(([key, v]) => ({ type: 'artist', name: v.name, count: v.tracks.length, key }) as Item)
    );

    /* Tracks : titre ET artiste ET label, tous les mots, fautes tolérées.
       On dédoublonne par identifiant vidéo : une charnière revendiquée par
       trois genres est UN morceau, pas trois résultats. */
    const mots = q.split(' ').filter((m) => m.length > 0);
    const vus = new Set<string>();
    const trackHits = index.tracks
      .map((t) => ({ t, s: scoreTrack(mots, t) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .filter((x) => {
        if (vus.has(x.t.videoId)) return false;
        vus.add(x.t.videoId);
        return true;
      })
      .slice(0, 8);
    out.push(...trackHits.map(({ t }) => ({ type: 'track', entry: t }) as Item));

    // Labels de disque.
    const labelHits = [...index.labels.entries()]
      .filter(([k]) => motDans(q, k) > 0)
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
      /* LE GENRE EST LA RÉPONSE, DONC IL PASSE EN PREMIER.

         C'est la question qu'on vient poser au site : « ce morceau, c'est
         quoi ? ». Le titre et l'artiste ne servent qu'à confirmer qu'on parle
         bien du même morceau ; le genre, lui, est ce qu'on est venu chercher,
         et il était relégué en pastille au bout de la ligne.

         LES CHARNIÈRES SONT DITES, PAS CACHÉES. Un même enregistrement
         revendiqué par plusieurs genres est un fait du corpus, et c'est
         souvent le cas le plus intéressant : on affiche tous les genres qui le
         revendiquent, et on écrit que la scène ne tranche pas. Taire le
         désaccord donnerait une fausse certitude. */
      const jumeaux = index.parVideo.get(item.entry.videoId) ?? [item.entry];
      const charniere = jumeaux.length > 1;
      return (
        <button
          role="option"
          aria-selected={active}
          data-active={active}
          className="search-hit search-hit-track"
          onMouseEnter={() => setCursor(i)}
          onClick={() => act(item)}
        >
          <span className="search-track-tete">
            <span className="search-track-titre">{item.entry.title}</span>
            <span className="search-track-artiste">{item.entry.artist}</span>
          </span>

          <span className="search-track-genres">
            {jumeaux.map((j) => (
              <span
                key={`${j.familyIndex}-${j.genreLocal}`}
                className="search-track-genre"
                role="link"
                tabIndex={-1}
                title={`Voir ${j.genreLabel} sur la carte`}
                style={{ color: `oklch(0.78 0.15 ${j.hue})` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPick(j.familyIndex, j.genreLocal);
                  onClose();
                }}
              >
                {j.genreLabel}
                <span className="search-track-famille">{j.familyLabel}</span>
              </span>
            ))}
          </span>

          {charniere && (
            <span className="search-track-charniere">
              {jumeaux.length} genres le revendiquent, la scène ne tranche pas
            </span>
          )}

          {(item.entry.year || item.entry.releaseLabel) && (
            <span className="search-track-sortie">
              {[item.entry.year, item.entry.releaseLabel].filter(Boolean).join(' · ')}
            </span>
          )}

          <span className="search-track-actions">
            <span
              className="search-track-bouton"
              role="link"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onListen(item.entry.familyIndex, item.entry.genreLocal);
                onClose();
              }}
            >
              Écouter
            </span>
            <span
              className="search-track-bouton"
              role="link"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onPick(item.entry.familyIndex, item.entry.genreLocal);
                onClose();
              }}
            >
              Voir sur la carte
            </span>
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
          {/* RIEN TROUVÉ N'EST PAS UNE FIN, C'EST UNE OCCASION.

              Le corpus tient 1763 morceaux. Il en existe des millions : la
              recherche qui ne trouve rien est donc le cas LE PLUS FRÉQUENT, pas
              l'exception. « Rien ne correspond » traitait ce cas comme un échec
              du visiteur, alors que c'est une limite de l'atlas, et que la
              personne qui cherche connaît peut-être la réponse qui manque.

              On lui dit donc l'état des choses et on lui tend le stylo. Le
              texte cherché est mis de côté : quand elle ouvrira une fiche de
              genre, la proposition sera déjà remplie. */}
          {items.length === 0 && query.trim().length > 0 && (
            <li className="search-vide">
              <p className="search-vide-titre">Ce morceau n&apos;est pas encore dans l&apos;atlas.</p>
              <p className="search-vide-texte">
                Tu sais dans quel genre il va&nbsp;? Propose-le, on le relira.
              </p>
              <button
                className="search-vide-bouton"
                onClick={() => {
                  try {
                    sessionStorage.setItem('sonaa-proposition-brouillon', query.trim());
                  } catch {
                    /* Navigation privée : la proposition partira vide, ce qui
                       reste mieux que de ne rien proposer du tout. */
                  }
                  setQuery('');
                }}
              >
                Choisir le genre et proposer
              </button>
              <p className="search-vide-aide">
                Cherche le genre ci-dessus, ouvre-le, puis « Proposer une track ».
              </p>
            </li>
          )}
          {items.length === 0 && query.trim().length === 0 && (
            <li className="search-empty">Rien ne correspond.</li>
          )}
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
