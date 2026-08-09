/* DISPOSITION FIXE. L'orbite libre est abandonnée (ADR-042).

   L'atlas est un arbre généalogique couché : sur poste, les familles se lisent
   de GAUCHE À DROITE, une génération par colonne ; sur mobile, la même chose
   pivotée, une génération par rangée, lecture de haut en bas.

   Tout est DÉTERMINISTE : deux chargements donnent la même carte au pixel
   près. Aucun aléa, aucune relaxation itérative dépendante de l'ordre des
   frames. La seule entrée est le corpus.

   LA PLACE DES LABELS EST RÉSERVÉE ICI, dans le calcul de position, pas
   testée au rendu : chaque noeud possède un créneau dont l'étendue comprend
   sa sphère ET son nom. Deux labels ne peuvent pas se recouvrir parce que
   deux créneaux ne se recouvrent pas. C'est la mise en page qui garantit,
   le rendu n'arbitre plus.

   CROISEMENTS. Les liens structurels forment un arbre par famille : dessinés
   en intervalles imbriqués (un parent centré sur le bloc contigu de ses
   enfants), ils ne peuvent PAS se croiser, par construction. Les croisements
   possibles viennent des liens ENTRE familles : on ordonne donc les familles
   par la médiane des positions de leurs partenaires de greffe, en plusieurs
   passes, à l'intérieur de leur grand ensemble. L'ordre des enfants d'un
   même parent utilise la même médiane sur les greffes externes, à défaut le
   tempo croissant. */

import {
  FAMILIES,
  FAMILY_LINKS,
  STRUCTURES,
  SUPERFAMILIES,
  TOTAL_GENRES
} from './structures.ts';

// ------------------------------------------------------------- métriques

/* Hauteurs de texte en unités monde. Le rapport largeur/hauteur d'un glyphe
   Inter tourne autour de 0,58 em : l'estimation est volontairement large,
   un créneau trop généreux ne casse rien, un créneau trop juste fait se
   toucher deux noms. */
const GENRE_LH = 2.4;
const FAMILY_LH = 4.0;
const ENSEMBLE_LH = 5.2;
const CHAR_W = 0.58;
const SLOT_GAP = 1.1;
const COL_GAP = 7;
const FAMILY_GAP = 9;
const ENSEMBLE_GAP = 16;

const labelWidth = (text: string, lh: number): number => text.length * lh * CHAR_W + lh * 0.5;

export interface AtlasLayout {
  /** Position monde de chaque sphère, indexée comme slotsData (x, y, z). */
  readonly positions: Float32Array;
  /** Ancre du nom de famille (au-dessus du fondateur). */
  readonly familyAnchor: { x: number; y: number }[];
  /** Ancres des grands ensembles, toujours nommés. */
  readonly ensembleAnchor: { label: string; x: number; y: number }[];
  /** Boîte englobante, créneaux de labels compris. */
  readonly bbox: { minX: number; maxX: number; minY: number; maxY: number };
  /** Boîte englobante par famille, pour cadrer une sélection. */
  readonly familyBBox: { minX: number; maxX: number; minY: number; maxY: number }[];
  /* Pas minimal entre deux créneaux d'une même génération, en unités monde,
     le long de l'axe des fratries. Le moteur n'affiche les noms d'une
     génération que quand ce pas projeté dépasse la hauteur du label : la
     garantie de non-recouvrement tient à TOUS les zooms, pas seulement au
     zoom de confort. Indice 0 = familles, 1.. = générations de genres. */
  readonly minPitch: number[];
  readonly portrait: boolean;
}

/* Ordre des familles : groupées par grand ensemble, puis médiane des
   partenaires de greffe à l'intérieur de chaque groupe, deux passes. */
const familyOrder = (): number[] => {
  const groups = SUPERFAMILIES.map((sf) =>
    sf.members
      .map((id) => FAMILIES.findIndex((f) => f.id === id))
      .filter((i) => i >= 0)
  );

  const partners = new Map<number, number[]>();
  for (const link of FAMILY_LINKS) {
    partners.set(link.from, [...(partners.get(link.from) ?? []), link.to]);
    partners.set(link.to, [...(partners.get(link.to) ?? []), link.from]);
  }

  for (let pass = 0; pass < 2; pass += 1) {
    const rank = new Map<number, number>();
    groups.flat().forEach((fi, i) => rank.set(fi, i));
    for (const group of groups) {
      group.sort((a, b) => {
        const med = (fi: number): number => {
          const ps = (partners.get(fi) ?? [])
            .map((p) => rank.get(p) ?? 0)
            .sort((x, y) => x - y);
          const m = ps[Math.floor(ps.length / 2)];
          return ps.length > 0 && m !== undefined ? m : (rank.get(fi) ?? 0);
        };
        const d = med(a) - med(b);
        // Départage stable par identifiant : le même corpus donne le même ordre.
        return d !== 0 ? d : (FAMILIES[a]?.id ?? '').localeCompare(FAMILIES[b]?.id ?? '');
      });
    }
  }
  return groups.flat();
};

export const buildLayout = (portrait: boolean): AtlasLayout => {
  const positions = new Float32Array(TOTAL_GENRES * 3);
  const familyAnchor: { x: number; y: number }[] = FAMILIES.map(() => ({ x: 0, y: 0 }));
  const familyBBox = FAMILIES.map(() => ({ minX: 0, maxX: 0, minY: 0, maxY: 0 }));
  const ensembleAnchor: { label: string; x: number; y: number }[] = [];

  const familyOffset: number[] = [];
  {
    let cursor = 0;
    STRUCTURES.forEach((s, fi) => {
      familyOffset[fi] = cursor;
      cursor += s.genres.length;
    });
  }

  /* Étendue d'un créneau LE LONG de l'axe des fratries. En paysage les
     fratries s'empilent verticalement : le créneau doit contenir la sphère
     et le nom l'un sous l'autre. En portrait elles se déploient
     horizontalement : c'est la LARGEUR du nom qui dimensionne. */
  const slotExtent = (radius: number, label: string): number =>
    portrait
      ? Math.max(radius * 2, labelWidth(label, GENRE_LH)) + SLOT_GAP
      : radius * 2 + GENRE_LH + SLOT_GAP;

  /* Épaisseur d'une colonne de génération, EN TRAVERS de l'axe des fratries.
     En paysage c'est la largeur du plus long nom de la colonne ; en portrait
     c'est la hauteur sphère plus nom. */
  const MAX_DEPTH = 8;
  const colThickness = new Array<number>(MAX_DEPTH).fill(0);
  STRUCTURES.forEach((s) => {
    s.genres.forEach((g) => {
      const t = portrait
        ? g.radius * 2 + GENRE_LH + SLOT_GAP
        : Math.max(g.radius * 2, labelWidth(g.label, GENRE_LH));
      colThickness[g.depth] = Math.max(colThickness[g.depth] ?? 0, t);
    });
  });

  // Position du centre de chaque colonne le long de l'axe des générations.
  const colCenter: number[] = [];
  {
    let u = 0;
    for (let d = 0; d < MAX_DEPTH; d += 1) {
      const t = colThickness[d] ?? 0;
      if (t === 0) break;
      colCenter[d] = u + t / 2;
      u += t + COL_GAP;
    }
  }

  const minPitch: number[] = [Infinity];

  /* Passe par famille : ordre des enfants, hauteurs de sous-arbres, puis
     positions. Tout est relatif au haut du bloc de la famille, converti en
     coordonnées monde à l'empilement. */
  interface Placed {
    v: number;
    extent: number;
  }

  const familySpan: number[] = [];
  const placedByFamily: Placed[][] = [];

  const order = familyOrder();

  for (const fi of order) {
    const structure = STRUCTURES[fi];
    if (!structure) {
      familySpan[fi] = 0;
      placedByFamily[fi] = [];
      continue;
    }
    const genres = structure.genres;

    /* Ordre des enfants : médiane du rang de bloc des familles de greffe
       quand il y en a, sinon rang de la famille elle-même ; départage au
       tempo croissant puis à l'identifiant. Deux passes n'apportent rien de
       plus ici : le rang de bloc des familles est déjà figé. */
    const blockRank = new Map<number, number>();
    order.forEach((f, i) => blockRank.set(f, i));
    const childKey = (li: number): [number, number, string] => {
      const g = genres[li];
      if (!g) return [0, 0, ''];
      const ranks = g.externalParents
        .map((p) => blockRank.get(p.family) ?? blockRank.get(fi) ?? 0)
        .sort((a, b) => a - b);
      const med = ranks[Math.floor(ranks.length / 2)];
      return [
        ranks.length > 0 && med !== undefined ? med : (blockRank.get(fi) ?? 0),
        g.bpm,
        g.id
      ];
    };
    const sortedChildren = (li: number): number[] =>
      [...(genres[li]?.children ?? [])].sort((a, b) => {
        const ka = childKey(a);
        const kb = childKey(b);
        if (ka[0] !== kb[0]) return ka[0] - kb[0];
        if (ka[1] !== kb[1]) return ka[1] - kb[1];
        return ka[2].localeCompare(kb[2]);
      });

    // Étendue d'un sous-arbre le long de l'axe des fratries.
    const extentOf = new Array<number>(genres.length).fill(0);
    const measure = (li: number): number => {
      const g = genres[li];
      if (!g) return 0;
      let own = slotExtent(g.radius, g.label);
      // Le fondateur porte le nom de la famille au-dessus de lui : réservé.
      if (g.depth === 0) own += portrait ? 0 : FAMILY_LH * 1.6;
      const kids = g.children.reduce((sum, c) => sum + measure(c), 0);
      const extent = Math.max(own, kids);
      extentOf[li] = extent;
      return extent;
    };
    measure(0);

    // Positions relatives : parent centré sur le bloc contigu de ses enfants.
    const placed: Placed[] = genres.map(() => ({ v: 0, extent: 0 }));
    const put = (li: number, top: number): void => {
      const g = genres[li];
      if (!g) return;
      const extent = extentOf[li] ?? 0;
      placed[li] = { v: top + extent / 2, extent };
      const kids = sortedChildren(li);
      const kidsTotal = kids.reduce((sum, c) => sum + (extentOf[c] ?? 0), 0);
      let cursor = top + (extent - kidsTotal) / 2;
      for (const c of kids) {
        put(c, cursor);
        cursor += extentOf[c] ?? 0;
      }
      const gen = g.depth + 1; // 0 = familles
      minPitch[gen] = Math.min(minPitch[gen] ?? Infinity, slotExtent(g.radius, g.label));
    };
    put(0, 0);

    familySpan[fi] = extentOf[0] ?? 0;
    placedByFamily[fi] = placed;
  }

  // ------------------------------------------------- empilement des blocs

  const groupOf = new Map<number, number>();
  SUPERFAMILIES.forEach((sf, si) => {
    for (const id of sf.members) {
      const fi = FAMILIES.findIndex((f) => f.id === id);
      if (fi >= 0) groupOf.set(fi, si);
    }
  });

  let v = 0;
  let lastGroup = -1;
  let familyPitchMin = Infinity;
  let prevFamilyCenter: number | null = null;

  for (const fi of order) {
    const group = groupOf.get(fi) ?? -1;
    if (group !== lastGroup) {
      v += lastGroup >= 0 ? ENSEMBLE_GAP : 0;
      const sf = SUPERFAMILIES[group];
      ensembleAnchor.push({
        label: sf?.label ?? '',
        x: portrait ? v + (familySpan[fi] ?? 0) / 2 : colCenter[0] ?? 0,
        y: 0 // corrigé après : dépend de l'orientation
      });
      v += ENSEMBLE_LH * 1.8;
      lastGroup = group;
    }

    const span = familySpan[fi] ?? 0;
    const top = v;
    const center = top + span / 2;
    if (prevFamilyCenter !== null) {
      familyPitchMin = Math.min(familyPitchMin, center - prevFamilyCenter);
    }
    prevFamilyCenter = center;

    const base = familyOffset[fi] ?? 0;
    const placed = placedByFamily[fi] ?? [];
    const structure = STRUCTURES[fi];
    let bMinX = Infinity;
    let bMaxX = -Infinity;
    let bMinY = Infinity;
    let bMaxY = -Infinity;

    structure?.genres.forEach((g, li) => {
      const p = placed[li];
      if (!p) return;
      const u = colCenter[g.depth] ?? 0;
      const along = top + p.v;
      /* Paysage : u vers la droite, fratries vers le bas (y négatif pour
         lire de haut en bas). Portrait : u vers le bas, fratries vers la
         droite. */
      const x = portrait ? along : u;
      const y = portrait ? -u : -along;
      const i = (base + li) * 3;
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = 0;
      const halfAlong = (p.extent - SLOT_GAP) / 2;
      const crossBefore = g.radius;
      const crossAfter = g.radius + GENRE_LH; // le nom pend sous la sphère
      bMinX = Math.min(bMinX, portrait ? x - halfAlong : x - crossBefore - (colThickness[g.depth] ?? 0) / 2);
      bMaxX = Math.max(bMaxX, portrait ? x + halfAlong : x + (colThickness[g.depth] ?? 0) / 2);
      bMinY = Math.min(bMinY, portrait ? y - crossAfter : y - halfAlong);
      bMaxY = Math.max(bMaxY, portrait ? y + crossBefore : y + halfAlong);

      if (li === 0) {
        const anchor = familyAnchor[fi];
        if (anchor) {
          anchor.x = x;
          anchor.y = y + g.radius + FAMILY_LH;
          // Le nom de famille fait partie du bloc : la boîte le comprend.
          bMinX = Math.min(bMinX, anchor.x - labelWidth(FAMILIES[fi]?.label ?? '', FAMILY_LH) / 2);
          bMaxX = Math.max(bMaxX, anchor.x + labelWidth(FAMILIES[fi]?.label ?? '', FAMILY_LH) / 2);
          bMaxY = Math.max(bMaxY, anchor.y + FAMILY_LH);
        }
      }
    });

    familyBBox[fi] = { minX: bMinX, maxX: bMaxX, minY: bMinY, maxY: bMaxY };
    v = top + span + FAMILY_GAP;
  }

  minPitch[0] = familyPitchMin;

  // Ancres d'ensemble : posées maintenant que l'orientation des axes est connue.
  {
    let cursor = 0;
    let gi = 0;
    let last = -1;
    for (const fi of order) {
      const group = groupOf.get(fi) ?? -1;
      if (group !== last) {
        const anchor = ensembleAnchor[gi];
        const bb = familyBBox[fi];
        if (anchor && bb) {
          /* Nettement AU-DESSUS du bloc, nom de famille compris : la tête
             de section ne se bat jamais avec un nom de famille. */
          anchor.x = portrait
            ? (bb.minX + bb.maxX) / 2
            : bb.minX + labelWidth(anchor.label, ENSEMBLE_LH) / 2;
          anchor.y = bb.maxY + ENSEMBLE_LH * 1.6;
        }
        gi += 1;
        last = group;
      }
      cursor += 1;
    }
    void cursor;
  }

  // Boîte englobante globale, ancres comprises.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const bb of familyBBox) {
    minX = Math.min(minX, bb.minX);
    maxX = Math.max(maxX, bb.maxX);
    minY = Math.min(minY, bb.minY);
    maxY = Math.max(maxY, bb.maxY);
  }
  for (const a of ensembleAnchor) {
    minX = Math.min(minX, a.x - labelWidth(a.label, ENSEMBLE_LH) / 2);
    maxX = Math.max(maxX, a.x + labelWidth(a.label, ENSEMBLE_LH) / 2);
    minY = Math.min(minY, a.y - ENSEMBLE_LH);
    maxY = Math.max(maxY, a.y + ENSEMBLE_LH);
  }

  return {
    positions,
    familyAnchor,
    ensembleAnchor,
    bbox: { minX, maxX, minY, maxY },
    familyBBox,
    minPitch: minPitch.map((p) => (Number.isFinite(p) ? p : 10)),
    portrait
  };
};

/** Hauteurs de texte exportées : le moteur dimensionne les labels avec. */
export const LABEL_WORLD = {
  genre: GENRE_LH,
  family: FAMILY_LH,
  ensemble: ENSEMBLE_LH
} as const;
