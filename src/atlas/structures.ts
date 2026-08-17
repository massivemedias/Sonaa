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

/* PLUS DE NIVEAU ZÉRO (ADR-053) : les grands ensembles sont supprimés,
   leurs noms étaient artificiels. L'atlas a trois niveaux : les quatorze
   familles, les genres, les sous-genres. */

/* PLACEMENT PAR PROXIMITÉ STYLISTIQUE, calculé depuis les données, jamais
   décoratif. L'affinité entre deux familles est la somme de leurs greffes
   croisées, pondérée, plus la proximité de leurs tempos moyens. Les cinq
   ensembles se rangent autour d'un cercle dans l'ordre qui maximise
   l'affinité entre voisins, essayé exhaustivement : cinq ensembles font
   vingt-quatre ordres, le calcul est trivial et DÉTERMINISTE. Les familles
   d'un ensemble se placent autour de son ancre, tournées pour que la famille
   la plus affine avec l'ensemble voisin lui fasse face. */
const familyAffinity = (() => {
  const ids = CORPUS.families.map((f) => f.id);
  const index = new Map<string, number>(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const grafts: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  const bpmSum: number[] = Array.from({ length: n }, () => 0);
  const bpmCount: number[] = Array.from({ length: n }, () => 0);

  for (const g of CORPUS.genres) {
    const gi = index.get(g.family);
    if (gi === undefined) continue;
    if (g.bpm) {
      bpmSum[gi] = (bpmSum[gi] ?? 0) + (g.bpm[0] + g.bpm[1]) / 2;
      bpmCount[gi] = (bpmCount[gi] ?? 0) + 1;
    }
    for (const p of g.parents) {
      const pi = index.get(p.family);
      if (pi === undefined || pi === gi) continue;
      const row = grafts[gi];
      const col = grafts[pi];
      if (row) row[pi] = (row[pi] ?? 0) + 1;
      if (col) col[gi] = (col[gi] ?? 0) + 1;
    }
  }

  const mid = ids.map((_, i) => ((bpmCount[i] ?? 0) > 0 ? (bpmSum[i] ?? 0) / (bpmCount[i] ?? 1) : 120));
  const score = (a: number, b: number): number => {
    const g = grafts[a]?.[b] ?? 0;
    const bpmClose = Math.max(0, 1 - Math.abs((mid[a] ?? 120) - (mid[b] ?? 120)) / 80);
    return g * 2 + bpmClose;
  };
  return { ids, index, score };
})();

/* PLACEMENT PAR PROXIMITÉ STYLISTIQUE, calculé depuis les données. Un seul
   anneau de quatorze familles (ADR-053, plus de niveau zéro) : l'affinité
   entre deux familles est la somme de leurs greffes croisées pondérée plus
   la proximité de leurs tempos moyens, ET les voisinages EXIGÉS par le
   verdict portent un bonus explicite pour être garantis, pas espérés :
   Hardcore près de Techno et Breaks, Psy près de Trance, Minimal près de
   Techno et House, Bass près de Breaks, Downtempo près d'Ambient, Disco
   près de House et Roots. L'ordre de l'anneau est glouton puis affiné par
   2-opt jusqu'à stabilité : déterministe, départages alphabétiques. */
export const REQUIRED_NEIGHBORS: readonly [string, string][] = [
  ['hardcore', 'techno'],
  ['hardcore', 'breaks'],
  ['psy', 'trance'],
  ['minimal', 'techno'],
  ['minimal', 'house'],
  ['bass', 'breaks'],
  ['downtempo', 'ambient'],
  ['disco', 'house'],
  ['disco', 'roots']
];

const RING_ORDER: readonly number[] = (() => {
  const { ids, index, score } = familyAffinity;
  const bonus = (a: number, b: number): number =>
    REQUIRED_NEIGHBORS.some(
      ([x, y]) =>
        (index.get(x) === a && index.get(y) === b) ||
        (index.get(x) === b && index.get(y) === a)
    )
      ? 12
      : 0;
  const s2 = (a: number, b: number): number => score(a, b) + bonus(a, b);
  const ringSum = (ord: number[]): number => {
    let t = 0;
    for (let i = 0; i < ord.length; i += 1) t += s2(ord[i] ?? 0, ord[(i + 1) % ord.length] ?? 0);
    return t;
  };

  /* Un seul départ glouton laissait le 2-opt dans un optimum local qui
     éloignait Hardcore de Techno (mesuré). QUATORZE départs, un par
     famille, chacun affiné par 2-opt : on garde le meilleur anneau, à
     départage déterministe. */
  const build = (startIdx: number): number[] => {
    const order: number[] = [startIdx];
    const remaining = ids.map((_, i) => i).filter((i) => i !== startIdx);
    while (remaining.length > 0) {
      const last = order[order.length - 1] ?? 0;
      remaining.sort(
        (a, b) => s2(last, b) - s2(last, a) || (ids[a] ?? '').localeCompare(ids[b] ?? '')
      );
      order.push(remaining.shift() ?? 0);
    }
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < order.length - 1; i += 1) {
        for (let j = i + 1; j < order.length; j += 1) {
          const candidate = [
            ...order.slice(0, i),
            ...order.slice(i, j + 1).reverse(),
            ...order.slice(j + 1)
          ];
          if (ringSum(candidate) > ringSum(order)) {
            order.splice(0, order.length, ...candidate);
            improved = true;
          }
        }
      }
    }
    return order;
  };

  let best: number[] = build(0);
  for (let s0 = 1; s0 < ids.length; s0 += 1) {
    const cand = build(s0);
    const d = ringSum(cand) - ringSum(best);
    if (d > 0 || (d === 0 && cand.join(',') < best.join(','))) best = cand;
  }
  return best;
})();

/** Identifiants de familles dans l'ordre de l'anneau : la vue fixe et les
    vues document suivent le même voisinage stylistique que la carte. */
export const FAMILY_RING_IDS: readonly string[] = RING_ORDER.map(
  (i) => familyAffinity.ids[i] ?? ''
);

const CENTERS: Record<string, readonly [number, number, number]> = (() => {
  const R = 40;
  const out: Record<string, [number, number, number]> = {};
  RING_ORDER.forEach((fi, k) => {
    const id = familyAffinity.ids[fi];
    if (!id) return;
    const theta = (k / RING_ORDER.length) * Math.PI * 2 - Math.PI / 2;
    // Léger relief vertical, déterministe par position dans l'anneau.
    const lift = ((k % 3) - 1) * 4;
    out[id] = [Math.cos(theta) * R, lift, Math.sin(theta) * R];
  });
  return out;
})();

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
  /* La date d'origine DOCUMENTEE, saisie a la main, quand la deduction par le
     plus ancien enregistrement se trompe. Voir le schema du corpus. */
  readonly yearStart?: number;
  /** Milieu de l'intervalle, pour l'affichage. L'intervalle est la donnée. */
  /** Milieu de l'intervalle, ou 0 quand le genre n'a pas de tempo. */
  readonly bpm: number;
  /** `null` quand le genre n'a pas de tempo : on n'en invente pas un. */
  readonly bpmRange: readonly [number, number] | null;
  /** 'debated' quand deux sources se contredisent sur la filiation. */
  readonly confidence: 'established' | 'debated';
  /** Ce que disent les sources, et laquelle a été suivie. */
  readonly note: string;
  /** Rattachement de convention : ce n est PAS une filiation. */
  readonly structuralOnly: boolean;
  /** Autres noms, pour la recherche. */
  readonly aliases: readonly string[];
  /* LA FICHE ENRICHIE : le vrai contenu du site (ADR-043). Champs absents
     quand la donnée n'existe pas, jamais de gabarit vide. `redaction`
     'brouillon' marque les fiches écrites par la machine sur les terrains
     réservés à Mika, à relire. */
  readonly description: string | null;
  /* LE MOT DE L'AUTEUR, distinct de la description.

     La description dit ce que le genre EST, du dehors, et se veut verifiable.
     Ce champ-ci porte un point de vue assume, a la premiere personne, sur les
     genres ou Mika a quelque chose a dire que personne d'autre ne dira. Il
     est signe a l'affichage, justement pour qu'on ne le confonde pas avec le
     reste de la fiche.

     Vide ou absent sur la quasi-totalite des genres, et c'est voulu : une
     voix qui parle partout ne dit plus rien. */
  readonly motDeLAuteur: string | null;
  readonly machines: readonly string[];
  readonly labelsHistoriques: readonly string[];
  readonly labelsActuels: readonly string[] | null;
  readonly artistesCles: readonly string[];
  readonly redaction: 'brouillon' | null;
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
  /* Sortie ORIGINALE, relevée sur Discogs par correspondance exigeante :
     une donnée fausse est pire qu'aucune, donc chaque champ peut manquer. */
  readonly release: {
    readonly label: string | null;
    readonly catno: string | null;
    readonly country: string | null;
    readonly year: number | null;
    readonly format: string | null;
  } | null;
  /** Tonalité relevée, jamais déduite ni inventée. Absent le plus souvent. */
  readonly key: string | null;
  /** Chemin de la pochette, servi par le site : aucun appel tiers au runtime.
      Vide quand aucune image n'existe : l'interface en dessine une, dérivée du
      nom de l'artiste et du titre, sans graine à stocker. */
  readonly cover: string;
  /** Identifiant vérifié par oEmbed au build. Jamais inventé (ADR-006). */
  readonly youtubeId: string;
  /** Morceau charnière : les AUTRES genres qui le revendiquent, résolus. */
  readonly sharedWith: readonly { familyIndex: number; genreLocal: number; label: string }[];
}

export interface Structure {
  readonly genres: Genre[];
  /** Liens internes, index locaux. */
  readonly links: { from: number; to: number }[];
  /** Rayon de la silhouette déployée, sert au seuil d'entrée. */
  readonly deployedRadius: number;
  /** Fondateur + première génération : le cadrage du niveau unique. */
  readonly crownRadius: number;
  /* Centroïde des positions déployées, relatif au centre de famille. La
     couronne pousse surtout vers le haut depuis la racine : cadrer la racine
     laissait la moitié de l'arbre hors champ. On cadre le nuage, pas le pied. */
  readonly deployedCenter: readonly [number, number, number];
  readonly compactRadius: number;
}

/* Générateur déterministe. Il ne fabrique AUCUNE donnée : il ne sert qu'à la
   variation géométrique des couronnes, pour que les anneaux ne soient pas
   mécaniquement réguliers. Les noms, les BPM, les filiations et les morceaux
   viennent tous du corpus, sans exception. */
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
/* SYSTÈME PLANÉTAIRE. Les écarts de taille entre générations sont MARQUÉS,
   pas une progression douce : la planète domine d'un facteur 3,4 ses
   satellites, qui dominent d'un facteur 2,7 les leurs. L'appartenance doit se
   comprendre d'un coup d'oeil, sans lire un seul label. */
const DEPTH_RADIUS = [4.6, 1.35, 0.5, 0.28];

/* Résolution des charnières. Un morceau partagé pointe vers ses autres genres
   par identifiant ; l'interface a besoin d'indices navigables. Résolu après
   la construction de toutes les familles, car un partage peut traverser. */
const trackShared: { track: { sharedWith: Track['sharedWith'] }; ids: string[] }[] = [];

const toTracks = (list: CorpusGenre['tracks']['essentiel']): Track[] =>
  list.map((t) => {
    const track = {
      id: t.youtubeId,
      artist: t.artist,
      title: t.title,
      year: t.year,
      album: t.album ?? null,
      release: t.release ?? null,
      key: t.key ?? null,
      /* `import.meta.env` n'existe que sous Vite. Le repli à vide rend ce
         module chargeable par un script Node, ce dont les contrôles de CI
         ont besoin pour vérifier les règles du jeu sans navigateur. En
         production la valeur est toujours là, le repli ne sert jamais. */
      cover: t.cover ? `${import.meta.env?.BASE_URL ?? ''}${t.cover.local}` : '',
      youtubeId: t.youtubeId,
      sharedWith: [] as { familyIndex: number; genreLocal: number; label: string }[]
    };
    if (t.shared && t.shared.length > 0) {
      trackShared.push({ track, ids: t.shared });
    }
    return track;
  });

export const buildStructure = (familyIndex: number): Structure => {
  const family = FAMILIES[familyIndex];
  if (!family)
    return { genres: [], links: [], deployedRadius: 1, crownRadius: 1, compactRadius: 1, deployedCenter: [0, 0, 0] };

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

    const [lo, hi] = entry.bpm ?? [0, 0];
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
      ...(entry.yearStart !== undefined ? { yearStart: entry.yearStart } : {}),
      bpm: Math.round((lo + hi) / 2),
      bpmRange: entry.bpm ? [lo, hi] : null,
      confidence: entry.confidence,
      note: entry.note,
      structuralOnly: entry.structuralOnly ?? false,
      aliases: entry.aliases ?? [],
      description: entry.description ?? null,
      motDeLAuteur: entry.motDeLAuteur ?? null,
      machines: entry.machines ?? [],
      labelsHistoriques: entry.labelsHistoriques ?? [],
      labelsActuels: entry.labelsActuels ?? null,
      artistesCles: entry.artistesCles ?? [],
      redaction: entry.redaction ?? null,
      externalParents: entry.parents
        .filter((pp) => pp.family !== entry.family)
        .map((pp) => ({
          family: familyIndexOf(pp.family),
          label: FAMILIES[familyIndexOf(pp.family)]?.label ?? pp.family
        })),
      tracksEssentiel: toTracks(entry.tracks.essentiel),
      tracksActuel: toTracks(entry.tracks.actuel),
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
  if (!founderEntry)
    return { genres: [], links: [], deployedRadius: 1, crownRadius: 1, compactRadius: 1, deployedCenter: [0, 0, 0] };
  walk(founderEntry, -1, 0);

  const root = 0;

  /* Disposition PLANÉTAIRE. Les enfants d'un noeud se rangent sur un ANNEAU
     autour de lui, dans un plan proche de l'horizontale, jamais en tas : la
     lecture est celle d'un système solaire, la planète au centre et ses
     satellites en orbite. Chaque famille a sa propre inclinaison d'écliptique,
     légère, pour que l'atlas ne soit pas un damier de disques parallèles. */
  const eclTilt = 0.18 + rand() * 0.22;
  const eclSpin = rand() * Math.PI * 2;
  // Base du plan orbital : quasi horizontal, incliné de eclTilt.
  const axisY: [number, number, number] = [
    Math.sin(eclTilt) * Math.cos(eclSpin),
    Math.cos(eclTilt),
    Math.sin(eclTilt) * Math.sin(eclSpin)
  ];
  const seed0: [number, number, number] = Math.abs(axisY[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const eA: [number, number, number] = (() => {
    const c: [number, number, number] = [
      seed0[1] * axisY[2] - seed0[2] * axisY[1],
      seed0[2] * axisY[0] - seed0[0] * axisY[2],
      seed0[0] * axisY[1] - seed0[1] * axisY[0]
    ];
    const l = Math.hypot(...c) || 1;
    return [c[0] / l, c[1] / l, c[2] / l];
  })();
  const eB: [number, number, number] = [
    axisY[1] * eA[2] - axisY[2] * eA[1],
    axisY[2] * eA[0] - axisY[0] * eA[2],
    axisY[0] * eA[1] - axisY[1] * eA[0]
  ];

  const place = (index: number): void => {
    const node = genres[index];
    if (!node) return;
    const kids = node.children;
    if (kids.length === 0) return;

    /* Rayon d'orbite PROPORTIONNEL AU NOMBRE D'ENFANTS (verdict « étale
       davantage ») : l'anneau est dimensionné pour les NOMS, pas seulement
       pour les corps. Le pas minimal par enfant est en unités monde, plus
       large en première génération où les noms sont les plus présents :
       une famille de 24 genres occupe nettement plus qu'une de 8, et la
       caméra recule d'elle-même (le cadrage mesure les positions). */
    const parentR = node.radius;
    const childR = Math.max(...kids.map((k) => genres[k]?.radius ?? 0.5), 0.3);
    const byBody = parentR * 1.9 + childR * 1.6;
    /* Le pas est celui d'un NOM, pas d'une sphère, et l'orbite d'un enfant
       grandit avec la POPULATION de son sous-arbre : une branche de huit
       genres réclame plus d'espace qu'une feuille. */
    /* Niveau unique (ADR-056) : un seul anneau se déploie à la fois, le
       pas n'a plus à réserver la place des petits-enfants. */
    /* PAS ANGULAIRE DIMENSIONNÉ SUR LE NOM LE PLUS LONG (bug de la
       descente, prouvé par la trace : reculer la caméra ne sert à rien, le
       rapport largeur-de-nom sur rayon-d'anneau est INVARIANT au zoom, les deux décroissent en 1/distance. Le seul levier est l'orbite en
       unités monde. Un pas constant de 5 unités laissait six noms de
       « Liquid Drum and Bass » se recouvrir quel que soit le zoom. */
    const longest = Math.max(...kids.map((k) => (genres[k]?.label.length ?? 8)), 8);
    /* Le pas dépend du NOMBRE d'enfants, pas de la profondeur : une petite
       couronne peut être généreuse, une grande passe au second rang. */
    const LABEL_STEP = (kids.length > 7 ? 0.62 : 1.15) * longest;
    const step = Math.max(childR * 2 * 1.7, LABEL_STEP);
    const ringNeed = (kids.length * step) / (2 * Math.PI);

    /* Les voisins d'anneau sont des voisins de style : l'ordre autour de
       l'orbite suit le TEMPO, du plus lent au plus rapide en tournant. C'est
       déterministe et ça se vérifie à l'oreille. */
    const ordered = [...kids].sort((x, y) => (genres[x]?.bpm ?? 0) - (genres[y]?.bpm ?? 0));

    /* Les GÉNÉRATIONS S'ÉTIRENT VERS L'EXTÉRIEUR : les enfants d'un noeud
       déjà en orbite se placent dans l'arc qui tourne le dos au centre de
       la famille, au lieu du cercle complet. Sans ça, les lignées
       profondes (Breaks : darkcore, jungle, drum and bass...) s'enroulaient
       sur elles-mêmes en grappe illisible où les noms s'entretuaient
       (mesuré : 4 genres de Breaks nommés sur 23). L'appartenance reste
       lisible : tout tourne autour de la famille, en s'en éloignant. */
    const radialPhi = (() => {
      const nd = node.deployed;
      const px = nd[0] * eA[0] + nd[1] * eA[1] + nd[2] * eA[2];
      const py = nd[0] * eB[0] + nd[1] * eB[1] + nd[2] * eB[2];
      return Math.hypot(px, py) < 0.5 ? null : Math.atan2(py, px);
    })();

    const putRing = (ring: number[], orbit: number, phase: number): void => {
      ring.forEach((kid, k) => {
        const child = genres[kid];
        if (!child) return;
        const angle =
          radialPhi === null
            ? (k / ring.length) * Math.PI * 2 + index * 0.9 + phase + rand() * 0.15
            : radialPhi +
              (ring.length === 1 ? 0 : (k / (ring.length - 1) - 0.5) * (Math.PI * 1.15)) +
              phase +
              rand() * 0.1;
        // Léger relief : l'anneau ondule d'une fraction du rayon du corps, la
        // profondeur se sent sans casser la lecture en anneau.
        const lift = (rand() - 0.5) * parentR * 0.35;
        child.deployed = [
          node.deployed[0] + eA[0] * Math.cos(angle) * orbit + eB[0] * Math.sin(angle) * orbit + axisY[0] * lift,
          node.deployed[1] + eA[1] * Math.cos(angle) * orbit + eB[1] * Math.sin(angle) * orbit + axisY[1] * lift,
          node.deployed[2] + eA[2] * Math.cos(angle) * orbit + eB[2] * Math.sin(angle) * orbit + axisY[2] * lift
        ];
        place(kid);
      });
    };

    if (node.depth === 0 && ordered.length > 7) {
      /* DEUX RANGS pour les grandes couronnes : les genres majeurs (et ceux
         qui portent une descendance) sur l'anneau intérieur, les autres sur
         l'anneau extérieur, angles décalés d'un demi-pas pour que les noms
         ne s'alignent jamais radialement. Le tri par tempo tient dans
         chaque rang. */
      const isInner = (k: number): boolean => {
        const g = genres[k];
        return Boolean(g && (g.major || g.children.length > 0));
      };
      let inner = ordered.filter(isInner);
      let outer = ordered.filter((k) => !isInner(k));
      if (inner.length === 0 || outer.length === 0) {
        inner = ordered.filter((_, i) => i % 2 === 0);
        outer = ordered.filter((_, i) => i % 2 === 1);
      }
      const orbitIn = Math.max(byBody, (inner.length * step) / (2 * Math.PI));
      const orbitOut = Math.max(
        orbitIn * 1.55,
        byBody + 4,
        (outer.length * step) / (2 * Math.PI)
      );
      putRing(inner, orbitIn, 0);
      putRing(outer, orbitOut, Math.PI / Math.max(1, outer.length));
      return;
    }

    const orbit = Math.max(byBody, ringNeed);
    putRing(ordered, orbit, 0);
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

  /* État compact, celui de l'atlas : la planète ET son premier anneau sont
     déjà visibles, c'est ce qui fait lire chaque famille comme un système
     solaire dès la première vue. Les générations suivantes sont repliées sur
     leur ancêtre de première génération, d'où elles surgiront au déploiement. */
  for (const g of genres) {
    if (g.depth <= 1) {
      g.compact = [g.deployed[0], g.deployed[1], g.deployed[2]];
      continue;
    }
    let cursor = g;
    while (cursor.depth > 1 && cursor.parent >= 0) {
      cursor = genres[cursor.parent] ?? cursor;
      if (cursor === g) break;
    }
    g.compact = [cursor.deployed[0], cursor.deployed[1], cursor.deployed[2]];
  }

  const radiusOf = (key: 'deployed' | 'compact'): number =>
    genres.reduce((max, g) => Math.max(max, Math.hypot(...g[key]) + g.radius), 1);

  const n = Math.max(1, genres.length);
  const deployedCenter: [number, number, number] = [
    genres.reduce((a, g) => a + g.deployed[0], 0) / n,
    genres.reduce((a, g) => a + g.deployed[1], 0) / n,
    genres.reduce((a, g) => a + g.deployed[2], 0) / n
  ];
  /* Rayon de COURONNE : fondateur + première génération seulement. C'est
     LUI que la caméra cadre à l'ouverture (niveau unique) ; deployedRadius
     reste le rayon de l'arbre complet, pour l'écartement des voisines au
     pire cas. */
  const crownRadius = genres.reduce(
    (max, g) =>
      g.depth <= 1 ? Math.max(max, Math.hypot(...g.deployed) + g.radius) : max,
    1
  );

  // Rayon mesuré depuis le centroïde : l'étendue de l'arbre complet.
  const deployedRadius = genres.reduce(
    (max, g) =>
      Math.max(
        max,
        Math.hypot(
          g.deployed[0] - deployedCenter[0],
          g.deployed[1] - deployedCenter[1],
          g.deployed[2] - deployedCenter[2]
        ) + g.radius
      ),
    1
  );

  return {
    genres,
    links,
    deployedRadius,
    crownRadius,
    deployedCenter,
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

/* Deuxième passe des charnières : toutes les structures existent, on peut
   résoudre chaque identifiant de genre en position navigable. */
{
  const locate = new Map<string, { familyIndex: number; genreLocal: number; label: string }>();
  STRUCTURES.forEach((structure, familyIndex) => {
    structure.genres.forEach((genre, genreLocal) => {
      locate.set(genre.id, { familyIndex, genreLocal, label: genre.label });
    });
  });
  for (const { track, ids } of trackShared) {
    (track as { sharedWith: unknown }).sharedWith = ids
      .map((id) => locate.get(id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }
}

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
