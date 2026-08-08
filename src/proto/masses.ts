/* Données du prototype. JETABLE.

   Partage définitif : la 3D sert l'atlas, la 2D sert tout le reste.

   Ce fichier ne contient donc PLUS aucun placement 3D des genres. Les couronnes,
   les positions déployées et la relaxation anti-chevauchement des genres sont
   supprimées : en perspective, la taille d'un noeud dépend de sa distance à la
   caméra, donc elle ne peut pas encoder la génération. La hiérarchie se lit
   désormais dans un arbre 2D, où la mise en page est calculée et où aucun
   chevauchement n'est possible.

   Ce qui reste en 3D : la position des sphères DANS l'amas compact d'une
   famille, qui ne sert qu'à donner un corps à la famille vue de loin. */

export interface Family {
  readonly id: string;
  readonly label: string;
  readonly center: readonly [number, number, number];
  readonly hue: number;
  readonly count: number;
}

export const FAMILIES: readonly Family[] = [
  { id: 'roots',      label: 'Roots',      center: [0, -5, 0],      hue: 40,  count: 12 },
  { id: 'disco',      label: 'Disco',      center: [-19, 2, 7],     hue: 15,  count: 14 },
  { id: 'house',      label: 'House',      center: [-25, 10, -14],  hue: 350, count: 22 },
  { id: 'electro',    label: 'Electro',    center: [-6, 15, 24],    hue: 130, count: 10 },
  { id: 'techno',     label: 'Techno',     center: [9, 12, -20],    hue: 218, count: 26 },
  { id: 'minimal',    label: 'Minimal',    center: [22, 4, -33],    hue: 196, count: 12 },
  { id: 'trance',     label: 'Trance',     center: [30, 21, -5],    hue: 262, count: 16 },
  { id: 'psy',        label: 'Psy',        center: [45, 15, 11],    hue: 240, count: 12 },
  { id: 'breaks',     label: 'Breaks',     center: [-34, 21, 16],   hue: 306, count: 18 },
  { id: 'bass',       label: 'Bass',       center: [-46, 14, 33],   hue: 355, count: 16 },
  { id: 'hardcore',   label: 'Hardcore',   center: [-11, 31, -6],   hue: 284, count: 12 },
  { id: 'industrial', label: 'Industrial', center: [16, 31, 25],    hue: 62,  count: 10 },
  { id: 'ambient',    label: 'Ambient',    center: [2, -20, 30],    hue: 174, count: 14 },
  { id: 'downtempo',  label: 'Downtempo',  center: [-17, -16, 38],  hue: 160, count: 10 }
];


// ------------------------------------------------------------------ morceaux

export interface Track {
  readonly id: string;
  readonly artist: string;
  readonly title: string;
  readonly label: string;
  /** Durée en secondes. Transport SIMULÉ : aucun audio n'est chargé ici. */
  readonly duration: number;
  readonly seed: number;
  /** Vide dans le prototype. Aucun identifiant n'est inventé. */
  readonly youtubeId: string;
}

const ARTISTS = ['Kern', 'Vasso', 'Ondine', 'Sabla', 'Mörk', 'Tenax', 'Duval', 'Rives', 'Halo', 'Cassel', 'Nyx', 'Brut'];
const WORDS = ['Sillon', 'Onde', 'Basalte', 'Ferrite', 'Cendre', 'Palier', 'Ruche', 'Cobalt', 'Lisière', 'Halogène', 'Tréma', 'Vertige'];
const LABELS = ['Ostgut', 'Perlon', 'Rekids', 'Hessle', 'Livity', 'Kompakt', 'Warp', 'Tresor', 'Peacefrog', 'Delsin'];

const buildTracks = (genreId: string, rand: () => number, n: number, tag: string): Track[] => {
  const out: Track[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push({
      id: `${genreId}-${tag}${i}`,
      artist: ARTISTS[Math.floor(rand() * ARTISTS.length)] ?? 'Kern',
      title: `${WORDS[Math.floor(rand() * WORDS.length)] ?? 'Onde'} ${1 + Math.floor(rand() * 9)}`,
      label: LABELS[Math.floor(rand() * LABELS.length)] ?? 'Tresor',
      duration: 210 + Math.floor(rand() * 300),
      seed: Math.floor(rand() * 65536),
      youtubeId: ''
    });
  }
  return out;
};

// -------------------------------------------------------------------- genres

/** Ascendance venue d'une autre famille. C'est la greffe, rendue en pointillé. */
export interface ExternalParent {
  readonly family: number;
  readonly label: string;
}

export interface Genre {
  readonly id: string;
  readonly label: string;
  readonly family: number;
  /** Index du parent DANS la même famille, -1 pour le fondateur. */
  readonly parent: number;
  readonly depth: number;
  readonly children: number[];
  /** Sert au diamètre du noeud dans l'arbre 2D, 0 à 1. */
  readonly importance: number;
  /** Sert au rayon de la sphère dans l'amas 3D de l'atlas. */
  readonly sphereRadius: number;
  readonly lightness: number;
  readonly chroma: number;
  readonly bpm: number;
  readonly externalParents: ExternalParent[];
  readonly tracksCurrent: Track[];
  readonly tracksEssential: Track[];
  /** Position DANS l'amas compact. Aucune position déployée : plus de 3D ici. */
  packed: [number, number, number];
}

export interface Structure {
  readonly genres: Genre[];
  readonly compactRadius: number;
}

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/* Empilement déterministe dans une boule. Aucune relaxation : ce nuage ne sert
   qu'à donner un corps à la famille vue de loin, il ne porte aucune lecture. */
const packInBall = (i: number, n: number, radius: number): [number, number, number] => {
  const y = 1 - (i / Math.max(1, n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN * i;
  const shell = radius * Math.cbrt((i + 0.5) / n);
  return [Math.cos(theta) * r * shell, y * shell, Math.sin(theta) * r * shell];
};

const DEPTH_SPHERE_RADIUS = [2.1, 1.5, 1.1, 0.9];

export const buildStructure = (familyIndex: number): Structure => {
  const family = FAMILIES[familyIndex];
  if (!family) return { genres: [], compactRadius: 4 };

  const rand = mulberry32(7717 + familyIndex * 131);
  const genres: Genre[] = [];

  const push = (parent: number, depth: number): number => {
    const i = genres.length;
    const founder = depth === 0;
    const gid = `${family.id}-${i.toString(36)}`;
    genres.push({
      id: gid,
      label: gid,
      family: familyIndex,
      parent,
      depth,
      children: [],
      importance: founder ? 1 : Math.max(0.28, 1 - depth * 0.26 - rand() * 0.12),
      sphereRadius: (DEPTH_SPHERE_RADIUS[Math.min(depth, 3)] ?? 1) * (0.9 + rand() * 0.2),
      lightness: founder ? 0.75 : 0.72 - depth * 0.04 + rand() * 0.06,
      chroma: founder ? 0.175 : 0.145 + rand() * 0.03,
      bpm: 108 + Math.floor(rand() * 46),
      externalParents: [],
      tracksCurrent: buildTracks(gid, rand, 12 + Math.floor(rand() * 8), 'c'),
      tracksEssential: buildTracks(gid, rand, 4 + Math.floor(rand() * 4), 'e'),
      packed: [0, 0, 0]
    });
    if (parent >= 0) genres[parent]?.children.push(i);
    return i;
  };

  // Arbre explicite par niveaux : une racine, des genres, des sous-genres.
  const budget = family.count;
  const root = push(-1, 0);
  const level1: number[] = [];
  const branches = Math.min(budget - 1, 3 + Math.floor(rand() * 3));
  for (let i = 0; i < branches; i += 1) level1.push(push(root, 1));

  const level2: number[] = [];
  for (const parent of level1) {
    if (genres.length >= budget) break;
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n && genres.length < budget; i += 1) level2.push(push(parent, 2));
  }

  if (budget >= 16) {
    for (const parent of level2) {
      if (genres.length >= budget) break;
      if (rand() < 0.45) push(parent, 3);
    }
  }

  while (genres.length < budget) {
    const pool = level2.length > 0 && rand() < 0.6 ? level2 : level1;
    const parent = pool[Math.floor(rand() * pool.length)] ?? root;
    push(parent, Math.min((genres[parent]?.depth ?? 0) + 1, 3));
  }

  // Positions dans l'amas compact.
  const compactRadius = 3.2 + Math.sqrt(genres.length) * 0.55;
  genres.forEach((g, i) => {
    g.packed = packInBall(i, genres.length, compactRadius * 0.82);
  });

  return { genres, compactRadius };
};

export const STRUCTURES: readonly Structure[] = FAMILIES.map((_, i) => buildStructure(i));

/* Greffes factices. Un genre sur six reçoit une ascendance venue d'une autre
   famille, pour que le rendu en pointillé de l'arbre 2D soit testable. */
(() => {
  const rand = mulberry32(4242);
  STRUCTURES.forEach((structure, fi) => {
    structure.genres.forEach((genre) => {
      if (genre.depth === 0 || rand() > 0.17) return;
      let other = Math.floor(rand() * FAMILIES.length);
      if (other === fi) other = (other + 3) % FAMILIES.length;
      const donor = STRUCTURES[other]?.genres[0];
      if (!donor) return;
      genre.externalParents.push({ family: other, label: donor.label });
    });
  });
})();

/** Liens entre familles DÉRIVÉS des greffes. Une seule source de vérité. */
export const FAMILY_LINKS: readonly { from: number; to: number; weight: number }[] = (() => {
  const seen = new Map<string, { from: number; to: number; weight: number }>();
  STRUCTURES.forEach((structure, fi) => {
    for (const genre of structure.genres) {
      for (const ext of genre.externalParents) {
        const key = `${ext.family}>${fi}`;
        const existing = seen.get(key);
        if (existing) existing.weight = Math.min(1, existing.weight + 0.25);
        else seen.set(key, { from: ext.family, to: fi, weight: 0.5 });
      }
    }
  });
  return [...seen.values()];
})();

// -------------------------------------------------- séparation des familles

export const FAMILY_MARGIN = 14;
export const PROJECTED_MARGIN = 10;
export const DEFAULT_AZIMUTH = 0.55;
export const DEFAULT_ELEVATION = 0.2;

/* Deux relaxations, en volume puis dans le plan de l'écran à l'angle par
   défaut. La seconde est nécessaire : deux familles éloignées mais alignées
   avec l'axe de vue se recouvrent à l'écran. */
export const FAMILY_CENTERS: readonly (readonly [number, number, number])[] = (() => {
  const pos = FAMILIES.map((f) => [...f.center] as [number, number, number]);
  const radius = FAMILIES.map((_, i) => STRUCTURES[i]?.compactRadius ?? 6);

  const volumePass = (strength: number): void => {
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
          const push = ((want - d) / d) * strength;
          pa[0] -= dx * push; pa[1] -= dy * push; pa[2] -= dz * push;
          pb[0] += dx * push; pb[1] += dy * push; pb[2] += dz * push;
          moved += want - d;
        }
      }
      if (moved < 0.01) break;
    }
  };

  volumePass(0.5);

  const az = DEFAULT_AZIMUTH;
  const el = DEFAULT_ELEVATION;
  const fwd = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)] as const;
  const up = [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)] as const;
  const right = [
    fwd[1] * up[2] - fwd[2] * up[1],
    fwd[2] * up[0] - fwd[0] * up[2],
    fwd[0] * up[1] - fwd[1] * up[0]
  ] as const;

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
        const sx = up[0] * du * push + right[0] * dr * push;
        const sy = up[1] * du * push + right[1] * dr * push;
        const sz = up[2] * du * push + right[2] * dr * push;
        pa[0] -= sx; pa[1] -= sy; pa[2] -= sz;
        pb[0] += sx; pb[1] += sy; pb[2] += sz;
        moved += want - onScreen;
      }
    }
    if (moved < 0.01) break;
  }

  volumePass(0.35);
  return pos.map((p) => [p[0], p[1], p[2]] as const);
})();

export const ATLAS_CENTER: readonly [number, number, number] = (() => {
  const n = FAMILY_CENTERS.length || 1;
  const sum = FAMILY_CENTERS.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]] as [number, number, number],
    [0, 0, 0] as [number, number, number]
  );
  return [sum[0] / n, sum[1] / n, sum[2] / n] as const;
})();

export const TOTAL_GENRES = STRUCTURES.reduce((n, s) => n + s.genres.length, 0);

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
