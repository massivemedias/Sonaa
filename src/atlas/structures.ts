/* Structures de familles. JETABLE dans sa mise en page, PAS dans ses données.

   Une famille est un CORPS CONSTRUIT : un arbre de sphères reliées par des
   liens fins. La filiation interne se voit de l'extérieur, avant même d'entrer.
   Référence visée : une structure moléculaire, quelque chose de net et de
   compté.

   Les genres ne sont plus générés : ils viennent de src/data/corpus.json,
   validé par le schéma Zod. Six familles, 60 genres, filiations sourcées, et
   des identifiants YouTube vérifiés un par un. */

import corpus from '../data/corpus.json' with { type: 'json' };
import type { Corpus, CorpusGenre } from '../data/schema.ts';

export interface Family {
  readonly id: string;
  readonly label: string;
  readonly center: readonly [number, number, number];
  readonly hue: number;
  readonly count: number;
}

export interface FamilyLink {
  readonly from: number;
  readonly to: number;
  readonly weight: number;
}

/* Échelle chromatique refaite. Trois règles :
   chroma soutenue mais jamais fluo (0.13 à 0.18), teintes espacées d'au moins
   22 degrés pour qu'aucune paire ne se confonde, et rien entre 90 et 120
   degrés, la zone olive-kaki qui salit tout. */
/* Échelle chromatique refaite. Trois règles :
   chroma soutenue mais jamais fluo (0.13 à 0.18), teintes espacées d'au moins
   22 degrés pour qu'aucune paire ne se confonde, et rien entre 90 et 120
   degrés, la zone olive-kaki qui salit tout.

   Positions resserrées d'un facteur 0.62 par rapport à la version précédente :
   l'atlas était si large et si plat que le faire tenir à l'écran réduisait les
   amas à des points. On veut voir des corps, pas des billes perdues. */
const CORPUS = corpus as unknown as Corpus;

/* Positions éditoriales : elles encodent la proximité stylistique. La
   séparation garantie est faite plus bas par relaxation, ces valeurs ne sont
   qu'un point de départ. */
const CENTERS: Record<string, readonly [number, number, number]> = {
  disco:   [-19, 2, 7],
  house:   [-25, 10, -14],
  techno:  [9, 12, -20],
  minimal: [22, 4, -33],
  trance:  [30, 21, -5],
  psy:     [45, 15, 11],
  industrial: [16, 31, 25]
};

export const FAMILIES: readonly Family[] = CORPUS.families.map((f) => ({
  id: f.id,
  label: f.label,
  center: CENTERS[f.id] ?? [0, 0, 0],
  hue: f.hue,
  count: CORPUS.genres.filter((g) => g.family === f.id).length
}));

const familyIndexOf = (id: string): number => FAMILIES.findIndex((f) => f.id === id);

/* Les liens entre familles ne sont pas écrits à la main : ils sont DÉDUITS des
   ascendances qui traversent une famille (ADR-030). Une seule source de vérité,
   donc aucun risque que la carte contredise les données. */
export const FAMILY_LINKS: readonly FamilyLink[] = (() => {
  const weight = new Map<string, number>();
  for (const g of CORPUS.genres) {
    for (const p of g.parents) {
      if (p.family === g.family) continue;
      const from = familyIndexOf(p.family);
      const to = familyIndexOf(g.family);
      if (from < 0 || to < 0) continue;
      const key = `${from}:${to}`;
      weight.set(key, (weight.get(key) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...weight.values());
  return [...weight.entries()].map(([key, n]) => {
    const [from, to] = key.split(':').map(Number);
    return { from: from ?? 0, to: to ?? 0, weight: 0.45 + 0.55 * (n / max) };
  });
})();

export interface Genre {
  readonly id: string;
  readonly label: string;
  readonly family: number;
  /** Index du parent dans la même famille, -1 pour le fondateur. */
  readonly parent: number;
  /** Profondeur dans l'arbre de filiation. Pilote le décalage de la cascade. */
  readonly depth: number;
  readonly radius: number;
  /** 0.60 à 0.75 : les sphères doivent ressortir du fond sombre. */
  readonly lightness: number;
  readonly chroma: number;
  /** Étiqueté par défaut quand la famille est déployée. */
  readonly major: boolean;
  /** Milieu de l'intervalle, pour l'affichage. L'intervalle est la donnée. */
  readonly bpm: number;
  readonly bpmRange: readonly [number, number];
  /** 'debated' quand deux sources se contredisent sur la filiation. */
  readonly confidence: 'established' | 'debated';
  /** Ce que disent les sources, et laquelle a été suivie. */
  readonly note: string;
  /** Autres noms, pour la recherche. */
  readonly aliases: readonly string[];
  /** Ascendances hors famille, déjà résolues. */
  readonly externalParents: { readonly family: number; readonly label: string }[];
  /** Fondateurs du genre, toutes époques. Rempli sans clé, par oEmbed. */
  readonly tracksEssentiel: Track[];
  /** Sorties récentes. Demande la YouTube Data API, donc vide pour l'instant. */
  readonly tracksActuel: Track[];
  /** Enfants directs dans l'arbre de filiation, remplis après construction. */
  children: number[];
  /** Position déployée, relative au centre de famille. */
  deployed: [number, number, number];
  /** Position compacte, relative au centre de famille. */
  compact: [number, number, number];
}

export interface Track {
  readonly id: string;
  readonly artist: string;
  readonly title: string;
  readonly year: number | null;
  /** Album donné par iTunes. Ce n'est pas le label de disque. */
  readonly album: string | null;
  /** Chemin de la pochette, servi par le site : aucun appel tiers au runtime. */
  readonly cover: string;
  /** Graine de repli, quand aucune pochette n'a été trouvée. */
  readonly seed: number;
  /** Identifiant vérifié par oEmbed au build. Jamais inventé (ADR-006). */
  readonly youtubeId: string;
}

export interface Structure {
  readonly genres: Genre[];
  /** Liens internes, index locaux. */
  readonly links: { from: number; to: number }[];
  /** Rayon de la silhouette déployée, sert au seuil d'entrée. */
  readonly deployedRadius: number;
  readonly compactRadius: number;
}

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Arbre explicite à trois niveaux minimum : une racine, des genres, des
   sous-genres. L'ancien générateur tirait un parent au hasard parmi les
   précédents, ce qui produisait un arbre plat où tout était au même niveau.
   Rien ne pouvait s'y lire. */
const DEPTH_RADIUS = [3.2, 2.05, 1.4, 1.05];

const toTracks = (list: CorpusGenre['tracks']['essentiel'], rand: () => number): Track[] =>
  list.map((t, k) => ({
    id: t.youtubeId,
    artist: t.artist,
    title: t.title,
    year: t.year,
    album: t.album ?? null,
    cover: t.cover ? `${import.meta.env.BASE_URL}${t.cover.local}` : '',
    seed: Math.floor(rand() * 65536) + k,
    youtubeId: t.youtubeId
  }));

export const buildStructure = (familyIndex: number): Structure => {
  const family = FAMILIES[familyIndex];
  if (!family) return { genres: [], links: [], deployedRadius: 1, compactRadius: 1 };

  const rand = mulberry32(7717 + familyIndex * 131);
  const genres: Genre[] = [];
  const links: { from: number; to: number }[] = [];

  /* L'arbre vient du CORPUS, plus d'un générateur. On parcourt en profondeur
     depuis le fondateur, ce qui garantit qu'un parent a toujours un index
     inférieur à celui de ses enfants. */
  const inFamily = CORPUS.genres.filter((g) => g.family === family.id);
  const localOf = new Map<string, number>();

  const walk = (entry: CorpusGenre, parent: number, depth: number): void => {
    const founder = depth === 0;
    const i = genres.length;
    localOf.set(entry.id, i);

    const [lo, hi] = entry.bpm;
    genres.push({
      id: entry.id,
      label: entry.label,
      family: familyIndex,
      parent,
      depth,
      // Taille indexée sur la PROFONDEUR : une racine domine ses dérivés, et
      // ça décroît à chaque génération. C'est ce qui rend l'arbre lisible.
      radius: (DEPTH_RADIUS[Math.min(depth, 3)] ?? 1) * (entry.major ? 1.12 : 0.92),
      lightness: founder ? 0.75 : 0.72 - depth * 0.04 + (entry.major ? 0.04 : 0),
      chroma: founder ? 0.175 : entry.major ? 0.165 : 0.14,
      major: entry.major,
      bpm: Math.round((lo + hi) / 2),
      bpmRange: [lo, hi],
      confidence: entry.confidence,
      note: entry.note,
      aliases: entry.aliases ?? [],
      externalParents: entry.parents
        .filter((pp) => pp.family !== entry.family)
        .map((pp) => ({
          family: familyIndexOf(pp.family),
          label: FAMILIES[familyIndexOf(pp.family)]?.label ?? pp.family
        })),
      tracksEssentiel: toTracks(entry.tracks.essentiel, rand),
      tracksActuel: toTracks(entry.tracks.actuel, rand),
      children: [],
      deployed: [0, 0, 0],
      compact: [0, 0, 0]
    });

    if (parent >= 0) {
      genres[parent]?.children.push(i);
      links.push({ from: parent, to: i });
    }

    for (const child of inFamily.filter((c) => c.structuralParent === entry.id)) {
      walk(child, i, depth + 1);
    }
  };

  const founderEntry = inFamily.find((g) => g.structuralParent === null);
  if (!founderEntry) return { genres: [], links: [], deployedRadius: 1, compactRadius: 1 };
  walk(founderEntry, -1, 0);

  const root = 0;

  /* Disposition en COURONNES. Les enfants d'un noeud s'organisent autour de
     lui, dans un disque perpendiculaire à la direction qui vient de son propre
     parent. Chaque génération forme donc un anneau identifiable, au lieu de se
     mélanger dans un tas commun. */
  const dirOf = new Map<number, [number, number, number]>();
  dirOf.set(root, [0, 1, 0]);

  const place = (index: number): void => {
    const node = genres[index];
    if (!node) return;
    const kids = node.children;
    if (kids.length === 0) return;

    const inDir = dirOf.get(index) ?? [0, 1, 0];
    // Base orthonormée autour de la direction entrante.
    const up: [number, number, number] = Math.abs(inDir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const ax: [number, number, number] = [
      up[1] * inDir[2] - up[2] * inDir[1],
      up[2] * inDir[0] - up[0] * inDir[2],
      up[0] * inDir[1] - up[1] * inDir[0]
    ];
    const axLen = Math.hypot(...ax) || 1;
    const a: [number, number, number] = [ax[0] / axLen, ax[1] / axLen, ax[2] / axLen];
    const b: [number, number, number] = [
      inDir[1] * a[2] - inDir[2] * a[1],
      inDir[2] * a[0] - inDir[0] * a[2],
      inDir[0] * a[1] - inDir[1] * a[0]
    ];

    const spread = 8.4 - node.depth * 1.5;
    const tilt = 0.55;

    kids.forEach((kid, k) => {
      const child = genres[kid];
      if (!child) return;
      const angle = (k / kids.length) * Math.PI * 2 + node.depth * 0.7;
      const wobble = 0.82 + rand() * 0.36;
      const r = spread * wobble;

      const dir: [number, number, number] = [
        a[0] * Math.cos(angle) * r + b[0] * Math.sin(angle) * r + inDir[0] * r * tilt,
        a[1] * Math.cos(angle) * r + b[1] * Math.sin(angle) * r + inDir[1] * r * tilt,
        a[2] * Math.cos(angle) * r + b[2] * Math.sin(angle) * r + inDir[2] * r * tilt
      ];

      child.deployed = [
        node.deployed[0] + dir[0],
        node.deployed[1] + dir[1],
        node.deployed[2] + dir[2]
      ];

      const dl = Math.hypot(...dir) || 1;
      dirOf.set(kid, [dir[0] / dl, dir[1] / dl, dir[2] / dl]);
      place(kid);
    });
  };

  place(root);

  /* Relaxation légère et RESPECTUEUSE des couronnes : on ne déplace que les
     feuilles, et faiblement. L'ancienne version brassait tout et détruisait
     la structure qu'on venait de construire. */
  for (let pass = 0; pass < 10; pass += 1) {
    for (let x = 0; x < genres.length; x += 1) {
      for (let y = x + 1; y < genres.length; y += 1) {
        const ga = genres[x];
        const gb = genres[y];
        if (!ga || !gb) continue;
        if (ga.parent === y || gb.parent === x) continue;

        const dx = gb.deployed[0] - ga.deployed[0];
        const dy = gb.deployed[1] - ga.deployed[1];
        const dz = gb.deployed[2] - ga.deployed[2];
        const d = Math.hypot(dx, dy, dz) || 0.001;
        const want = (ga.radius + gb.radius) * 1.7;
        if (d >= want) continue;

        const push2 = ((want - d) / d) * 0.16;
        if (ga.children.length === 0) {
          ga.deployed[0] -= dx * push2;
          ga.deployed[1] -= dy * push2;
          ga.deployed[2] -= dz * push2;
        }
        if (gb.children.length === 0) {
          gb.deployed[0] += dx * push2;
          gb.deployed[1] += dy * push2;
          gb.deployed[2] += dz * push2;
        }
      }
    }
  }

  for (const g of genres) {
    g.compact = [g.deployed[0] * 0.17, g.deployed[1] * 0.17, g.deployed[2] * 0.17];
  }

  const radiusOf = (key: 'deployed' | 'compact'): number =>
    genres.reduce((max, g) => Math.max(max, Math.hypot(...g[key]) + g.radius), 1);

  return {
    genres,
    links,
    deployedRadius: radiusOf('deployed'),
    compactRadius: radiusOf('compact')
  };
};

/** Chaîne de la racine jusqu'au genre, pour le fil d'Ariane. */
export const pathToGenre = (familyIndex: number, local: number): number[] => {
  const genres = STRUCTURES[familyIndex]?.genres;
  if (!genres) return [];
  const out: number[] = [];
  let cursor = local;
  let guard = 0;
  while (cursor >= 0 && guard < 32) {
    out.unshift(cursor);
    cursor = genres[cursor]?.parent ?? -1;
    guard += 1;
  }
  return out;
};

export const STRUCTURES: readonly Structure[] = FAMILIES.map((_, i) => buildStructure(i));

/** Seuil d'entrée : franchi en avançant, la structure se déploie. */
export const enterDistance = (familyIndex: number): number =>
  (STRUCTURES[familyIndex]?.compactRadius ?? 6) * 4.2;

/* SÉPARATION DES FAMILLES.

   Les centres écrits à la main encodent la proximité stylistique, mais rien ne
   garantissait qu'ils ne se chevauchent pas : sur la capture, Breaks passait
   devant Disco et House débordait. On relaxe donc ces positions pour imposer
   une marge minimale entre volumes compacts, en partant des positions
   éditoriales pour préserver l'arrangement voulu.

   La séparation à l'état déployé n'est pas garantie ici : elle le serait au
   prix d'un atlas quatre fois plus large et d'amas minuscules. C'est le
   déplacement dynamique des familles, à l'ouverture de l'une d'elles, qui s'en
   charge côté rendu. */
/* 14 unités et non 6 : la séparation en 3D ne garantit pas la séparation en
   projection. Deux familles distantes mais alignées avec l'axe de vue se
   recouvraient à l'écran. Une marge large réduit fortement ce cas, sans le
   supprimer complètement, ce qui est une limite inhérente à une projection. */
export const FAMILY_MARGIN = 14;
/** Marge exigée dans le plan de l'écran à l'angle par défaut. */
export const PROJECTED_MARGIN = 10;

/* Angles de la vue par défaut. Une seule source de vérité, partagée avec le
   moteur de rendu : la seconde relaxation en dépend. */
export const DEFAULT_AZIMUTH = 0.55;
export const DEFAULT_ELEVATION = 0.2;

export const FAMILY_CENTERS: readonly (readonly [number, number, number])[] = (() => {
  const pos = FAMILIES.map((f) => [...f.center] as [number, number, number]);
  const radius = FAMILIES.map((_, i) => STRUCTURES[i]?.compactRadius ?? 6);

  // Passe 1, séparation en volume.
  for (let pass = 0; pass < 220; pass += 1) {
    let moved = 0;
    for (let a = 0; a < pos.length; a += 1) {
      for (let b = a + 1; b < pos.length; b += 1) {
        const pa = pos[a];
        const pb = pos[b];
        if (!pa || !pb) continue;
        const dx = pb[0] - pa[0];
        const dy = pb[1] - pa[1];
        const dz = pb[2] - pa[2];
        const d = Math.hypot(dx, dy, dz) || 0.001;
        const want = (radius[a] ?? 6) + (radius[b] ?? 6) + FAMILY_MARGIN;
        if (d >= want) continue;
        const push = ((want - d) / d) * 0.5;
        pa[0] -= dx * push; pa[1] -= dy * push; pa[2] -= dz * push;
        pb[0] += dx * push; pb[1] += dy * push; pb[2] += dz * push;
        moved += want - d;
      }
    }
    if (moved < 0.01) break;
  }

  /* Passe 2, séparation EN PROJECTION à l'angle par défaut.
     La séparation en volume ne suffit pas : deux familles éloignées mais
     alignées avec l'axe de vue se recouvrent à l'écran, c'était le cas de
     House et Electro. On les écarte donc aussi dans le plan de l'écran, sans
     toucher à leur profondeur, puis on relance la passe 1 pour ne rien casser. */
  const az = DEFAULT_AZIMUTH;
  const el = DEFAULT_ELEVATION;
  const fwd: [number, number, number] = [
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az)
  ];
  const up: [number, number, number] = [
    -Math.sin(el) * Math.sin(az),
    Math.cos(el),
    -Math.sin(el) * Math.cos(az)
  ];
  const right: [number, number, number] = [
    fwd[1] * up[2] - fwd[2] * up[1],
    fwd[2] * up[0] - fwd[0] * up[2],
    fwd[0] * up[1] - fwd[1] * up[0]
  ];

  for (let pass = 0; pass < 260; pass += 1) {
    let moved = 0;
    for (let a = 0; a < pos.length; a += 1) {
      for (let b = a + 1; b < pos.length; b += 1) {
        const pa = pos[a];
        const pb = pos[b];
        if (!pa || !pb) continue;
        const dx = pb[0] - pa[0];
        const dy = pb[1] - pa[1];
        const dz = pb[2] - pa[2];
        const du = dx * up[0] + dy * up[1] + dz * up[2];
        const dr = dx * right[0] + dy * right[1] + dz * right[2];
        const onScreen = Math.hypot(du, dr) || 0.001;
        const want = (radius[a] ?? 6) + (radius[b] ?? 6) + PROJECTED_MARGIN;
        if (onScreen >= want) continue;

        const push = ((want - onScreen) / onScreen) * 0.5;
        const mu = du * push;
        const mr = dr * push;
        const sx = up[0] * mu + right[0] * mr;
        const sy = up[1] * mu + right[1] * mr;
        const sz = up[2] * mu + right[2] * mr;
        pa[0] -= sx; pa[1] -= sy; pa[2] -= sz;
        pb[0] += sx; pb[1] += sy; pb[2] += sz;
        moved += want - onScreen;
      }
    }
    if (moved < 0.01) break;
  }

  // Passe 1 rejouée : la passe 2 peut avoir rapproché deux familles en volume.
  for (let pass = 0; pass < 220; pass += 1) {
    let moved = 0;
    for (let a = 0; a < pos.length; a += 1) {
      for (let b = a + 1; b < pos.length; b += 1) {
        const pa = pos[a];
        const pb = pos[b];
        if (!pa || !pb) continue;
        const dx = pb[0] - pa[0];
        const dy = pb[1] - pa[1];
        const dz = pb[2] - pa[2];
        const d = Math.hypot(dx, dy, dz) || 0.001;
        const want = (radius[a] ?? 6) + (radius[b] ?? 6) + FAMILY_MARGIN;
        if (d >= want) continue;
        const push = ((want - d) / d) * 0.35;
        pa[0] -= dx * push; pa[1] -= dy * push; pa[2] -= dz * push;
        pb[0] += dx * push; pb[1] += dy * push; pb[2] += dz * push;
        moved += want - d;
      }
    }
    if (moved < 0.01) break;
  }

  return pos.map((p) => [p[0], p[1], p[2]] as const);
})();

/** Rayon réservé d'une famille selon son état. */
export const familyRadius = (i: number, deployed: boolean): number =>
  (deployed ? STRUCTURES[i]?.deployedRadius : STRUCTURES[i]?.compactRadius) ?? 6;

/* Rayon englobant de l'atlas, centre inclus. Sert à calculer la distance de
   cadrage par défaut : les 14 familles doivent occuper environ 70 pour cent de
   la hauteur de l'écran, pas 20. */
export const ATLAS_CENTER: readonly [number, number, number] = (() => {
  const n = FAMILY_CENTERS.length || 1;
  const sum = FAMILY_CENTERS.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]] as [number, number, number],
    [0, 0, 0] as [number, number, number]
  );
  return [sum[0] / n, sum[1] / n, sum[2] / n] as const;
})();

export const ATLAS_RADIUS = FAMILY_CENTERS.reduce((max, c, i) => {
  const dx = c[0] - ATLAS_CENTER[0];
  const dy = c[1] - ATLAS_CENTER[1];
  const dz = c[2] - ATLAS_CENTER[2];
  return Math.max(max, Math.hypot(dx, dy, dz) + (STRUCTURES[i]?.compactRadius ?? 6));
}, 1);

export const TOTAL_GENRES = STRUCTURES.reduce((n, s) => n + s.genres.length, 0);
export const TOTAL_INTERNAL_LINKS = STRUCTURES.reduce((n, s) => n + s.links.length, 0);
