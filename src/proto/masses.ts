/* Structures de familles. JETABLE.

   Une famille n'est plus une brume, c'est un CORPS CONSTRUIT : un arbre de
   sphères reliées par des liens fins. La filiation interne se voit de
   l'extérieur, avant même d'entrer. Référence visée : une structure
   moléculaire, quelque chose de net et de compté.

   Chaque genre a deux positions : compacte, quand la famille est refermée sur
   elle-même, et déployée, quand elle s'ouvre. La diffusion anime le passage de
   l'une à l'autre, en cascade le long des liens. */

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
export const FAMILIES: readonly Family[] = [
  { id: 'roots',      label: 'Roots',      center: [0, -8, 0],      hue: 40,  count: 12 },
  { id: 'disco',      label: 'Disco',      center: [-30, 4, 12],    hue: 15,  count: 14 },
  { id: 'house',      label: 'House',      center: [-40, 16, -22],  hue: 350, count: 22 },
  { id: 'electro',    label: 'Electro',    center: [-10, 24, 38],   hue: 130, count: 10 },
  { id: 'techno',     label: 'Techno',     center: [14, 20, -32],   hue: 218, count: 26 },
  { id: 'minimal',    label: 'Minimal',    center: [36, 6, -54],    hue: 196, count: 12 },
  { id: 'trance',     label: 'Trance',     center: [48, 34, -8],    hue: 262, count: 16 },
  { id: 'psy',        label: 'Psy',        center: [72, 24, 18],    hue: 240, count: 12 },
  { id: 'breaks',     label: 'Breaks',     center: [-54, 34, 26],   hue: 306, count: 18 },
  { id: 'bass',       label: 'Bass',       center: [-74, 22, 54],   hue: 328, count: 16 },
  { id: 'hardcore',   label: 'Hardcore',   center: [-18, 50, -10],  hue: 284, count: 12 },
  { id: 'industrial', label: 'Industrial', center: [26, 50, 40],    hue: 62,  count: 10 },
  { id: 'ambient',    label: 'Ambient',    center: [4, -32, 48],    hue: 174, count: 14 },
  { id: 'downtempo',  label: 'Downtempo',  center: [-28, -26, 62],  hue: 152, count: 10 }
];

const idx = (id: string): number => FAMILIES.findIndex((f) => f.id === id);

export const FAMILY_LINKS: readonly FamilyLink[] = [
  { from: idx('roots'), to: idx('disco'), weight: 1 },
  { from: idx('roots'), to: idx('industrial'), weight: 0.6 },
  { from: idx('roots'), to: idx('ambient'), weight: 0.6 },
  { from: idx('disco'), to: idx('house'), weight: 1 },
  { from: idx('disco'), to: idx('electro'), weight: 0.7 },
  { from: idx('house'), to: idx('techno'), weight: 1 },
  { from: idx('house'), to: idx('breaks'), weight: 0.8 },
  { from: idx('techno'), to: idx('minimal'), weight: 1 },
  { from: idx('techno'), to: idx('trance'), weight: 0.8 },
  { from: idx('techno'), to: idx('hardcore'), weight: 0.7 },
  { from: idx('trance'), to: idx('psy'), weight: 1 },
  { from: idx('breaks'), to: idx('bass'), weight: 1 },
  { from: idx('breaks'), to: idx('hardcore'), weight: 0.6 },
  { from: idx('ambient'), to: idx('downtempo'), weight: 0.8 }
];

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
  readonly bpm: number;
  /** Sorties récentes, triées par vues décroissantes au build. */
  readonly tracksCurrent: Track[];
  /** Fondateurs du genre, toutes époques. */
  readonly tracksEssential: Track[];
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
  readonly label: string;
  /** Durée en secondes. Transport SIMULÉ : aucun audio n'est chargé ici. */
  readonly duration: number;
  /** Graine de pochette : la pochette est générée, jamais téléchargée. */
  readonly seed: number;
  /** Vide dans le prototype. Aucun identifiant n'est inventé (ADR-006). */
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

/* Arbre explicite à trois niveaux minimum : une racine, des genres, des
   sous-genres. L'ancien générateur tirait un parent au hasard parmi les
   précédents, ce qui produisait un arbre plat où tout était au même niveau.
   Rien ne pouvait s'y lire. */
const DEPTH_RADIUS = [3.2, 2.05, 1.4, 1.05];

export const buildStructure = (familyIndex: number): Structure => {
  const family = FAMILIES[familyIndex];
  if (!family) return { genres: [], links: [], deployedRadius: 1, compactRadius: 1 };

  const rand = mulberry32(7717 + familyIndex * 131);
  const genres: Genre[] = [];
  const links: { from: number; to: number }[] = [];

  const push = (parent: number, depth: number): number => {
    const i = genres.length;
    const founder = depth === 0;
    genres.push({
      id: `${family.id}-${i.toString(36)}`,
      label: `${family.id}-${i.toString(36)}`,
      family: familyIndex,
      parent,
      depth,
      // Taille indexée sur la PROFONDEUR : une racine domine ses dérivés, et
      // ça décroît à chaque génération. C'est ce qui rend l'arbre lisible.
      radius: (DEPTH_RADIUS[Math.min(depth, 3)] ?? 1) * (0.88 + rand() * 0.24),
      lightness: founder ? 0.75 : 0.72 - depth * 0.04 + rand() * 0.06,
      chroma: founder ? 0.175 : 0.145 + rand() * 0.03,
      major: depth <= 1,
      bpm: 108 + Math.floor(rand() * 46),
      tracksCurrent: buildTracks(`${family.id}-${i.toString(36)}`, rand, 12 + Math.floor(rand() * 8), 'c'),
      tracksEssential: buildTracks(`${family.id}-${i.toString(36)}`, rand, 4 + Math.floor(rand() * 4), 'e'),
      children: [],
      deployed: [0, 0, 0],
      compact: [0, 0, 0]
    });
    if (parent >= 0) {
      genres[parent]?.children.push(i);
      links.push({ from: parent, to: i });
    }
    return i;
  };

  /* Construction par niveaux, avec un budget d'effectif. Les grandes familles
     obtiennent une troisième génération, les petites s'arrêtent à deux. */
  const budget = family.count;
  const root = push(-1, 0);
  const wantsDeep = budget >= 16;

  const level1: number[] = [];
  const branches = Math.min(budget - 1, 3 + Math.floor(rand() * 3));
  for (let i = 0; i < branches; i += 1) level1.push(push(root, 1));

  const level2: number[] = [];
  let cursor = level1.length;
  for (const parent of level1) {
    if (genres.length >= budget) break;
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n && genres.length < budget; i += 1) {
      level2.push(push(parent, 2));
      cursor += 1;
    }
  }

  if (wantsDeep) {
    for (const parent of level2) {
      if (genres.length >= budget) break;
      if (rand() < 0.45) push(parent, 3);
    }
  }

  // S'il reste du budget, on épaissit les branches existantes plutôt que
  // d'ajouter des orphelins au même niveau.
  while (genres.length < budget) {
    const pool = level2.length > 0 && rand() < 0.6 ? level2 : level1;
    const parent = pool[Math.floor(rand() * pool.length)] ?? root;
    const depth = (genres[parent]?.depth ?? 0) + 1;
    push(parent, Math.min(depth, 3));
  }

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
    g.compact = [g.deployed[0] * 0.24, g.deployed[1] * 0.24, g.deployed[2] * 0.24];
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

export const TOTAL_GENRES = STRUCTURES.reduce((n, s) => n + s.genres.length, 0);
export const TOTAL_INTERNAL_LINKS = STRUCTURES.reduce((n, s) => n + s.links.length, 0);
