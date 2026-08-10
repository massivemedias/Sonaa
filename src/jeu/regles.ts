/* LE MÉCANISME DU JEU. Aucune dépendance au rendu, à React ou au DOM :
   uniquement des données et des fonctions pures, pour que les règles soient
   vérifiables sans lancer une image.

   CE QUE LES DONNÉES ONT IMPOSÉ, contre la conception initiale. L'arbre du
   corpus n'a pas trois niveaux mais SEPT : Breaks descend à six générations
   sous son fondateur. « Famille, puis genres, puis sous-genres » ne décrit
   donc pas le corpus. La fragmentation est récursive et suit l'arbre réel,
   sur autant de vagues qu'il en faut.

   Corollaire mesuré : un astéroïde ne se brise PAS en tous les genres de
   sa famille. Le fondateur de Breaks n'a que cinq enfants directs. Breaks
   reste pourtant la famille la plus redoutable, parce qu'elle libère 23
   astéroïdes AU TOTAL, sur sept vagues. C'est la même intention, comptée
   juste. Mesures complètes : scripts/check-game-rules.ts. */

import { FAMILIES, STRUCTURES, type Genre } from '../atlas/structures.ts';

/* ------------------------------------------------------------- l'univers */

export interface Asteroide {
  /** Identifiant d'instance, unique dans la partie. */
  readonly cle: string;
  /** Identifiant de genre. Tout astéroïde EST un genre, y compris les
      quatorze du départ : voir flotteInitiale. */
  readonly genreId: string;
  readonly label: string;
  readonly familyIndex: number;
  /** Profondeur dans l'arbre : 0 pour un fondateur de famille. */
  readonly niveau: number;
  readonly rayon: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation propre, purement visuelle. */
  angle: number;
  readonly vitesseAngulaire: number;
}

/* Sept paliers de taille, autant que l'arbre a de générations. */
const RAYON_FONDATEUR = 46;
const DECROISSANCE = 0.74;
/* Plancher : sous 7 px un astéroïde n'est plus une cible, c'est un pixel. */
const RAYON_MIN = 7;

export const rayonDuNiveau = (niveau: number): number =>
  Math.max(RAYON_MIN, RAYON_FONDATEUR * Math.pow(DECROISSANCE, niveau));

/* Plus c'est petit, plus c'est rapide : la règle d'Asteroids. La croissance
   est modérée (1,16) parce qu'avec sept niveaux, un facteur trop fort
   rendrait les derniers fragments injouables. */
const VITESSE_FONDATEUR = 14; // pixels par seconde
const ACCELERATION = 1.16;

export const vitesseDuNiveau = (niveau: number): number =>
  VITESSE_FONDATEUR * Math.pow(ACCELERATION, niveau);

/* ------------------------------------------------- l'arbre, côté client */

/** Enfants directs d'un genre, dans sa propre famille. */
export const enfantsDe = (familyIndex: number, genreId: string): Genre[] => {
  const structure = STRUCTURES[familyIndex];
  if (!structure) return [];
  const parent = structure.genres.find((g) => g.id === genreId);
  if (!parent) return [];
  return parent.children
    .map((local) => structure.genres[local])
    .filter((g): g is Genre => g !== undefined);
};

/** Fondateurs d'une famille : les genres sans parent dans leur famille. */
export const fondateursDe = (familyIndex: number): Genre[] => {
  const structure = STRUCTURES[familyIndex];
  if (!structure) return [];
  return structure.genres.filter((g) => g.parent < 0);
};

/** Total de descendants d'une famille, fondateurs compris. C'est ce nombre
    qui dit la dangerosité réelle : Breaks vaut 23. */
export const tailleDeFamille = (familyIndex: number): number =>
  STRUCTURES[familyIndex]?.genres.length ?? 0;

/** Nombre total d'astéroïdes de genre dans une partie complète. */
export const TOTAL_GENRES = STRUCTURES.reduce((n, s) => n + s.genres.length, 0);

/* ----------------------------------------------------------- la physique */

export interface Monde {
  readonly largeur: number;
  readonly hauteur: number;
}

/** L'écran s'enroule : sortir par la droite fait rentrer par la gauche. */
export const enrouler = (v: number, max: number): number => {
  if (v < 0) return v + max * Math.ceil(-v / max);
  if (v >= max) return v - max * Math.floor(v / max);
  return v;
};

/** Distance la plus courte entre deux points sur un tore. Sans elle, deux
    objets de part et d'autre du bord se croiseraient sans se toucher. */
export const distanceEnroulee = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  monde: Monde
): number => {
  let dx = Math.abs(ax - bx);
  let dy = Math.abs(ay - by);
  if (dx > monde.largeur / 2) dx = monde.largeur - dx;
  if (dy > monde.hauteur / 2) dy = monde.hauteur - dy;
  return Math.hypot(dx, dy);
};

export const avancer = (a: Asteroide, dt: number, monde: Monde): void => {
  a.x = enrouler(a.x + a.vx * dt, monde.largeur);
  a.y = enrouler(a.y + a.vy * dt, monde.hauteur);
  a.angle += a.vitesseAngulaire * dt;
};

/* --------------------------------------------------- la partie, en objets */

/* Générateur déterministe. Math.random() rendrait toute partie
   irreproductible, donc tout bug de fragmentation impossible à rejouer, et
   toute vérification de séquence impossible à écrire. La graine vient du
   serveur à l'ouverture de la session. */
export const generateur = (graine: number): (() => number) => {
  let etat = graine >>> 0 || 1;
  return () => {
    etat ^= etat << 13;
    etat >>>= 0;
    etat ^= etat >> 17;
    etat ^= etat << 5;
    etat >>>= 0;
    return etat / 0x100000000;
  };
};

let compteur = 0;
const nouvelleCle = (): string => `a${(compteur += 1)}`;

const creer = (
  genreId: string,
  label: string,
  familyIndex: number,
  niveau: number,
  x: number,
  y: number,
  hasard: () => number
): Asteroide => {
  const vitesse = vitesseDuNiveau(niveau);
  const direction = hasard() * Math.PI * 2;
  return {
    cle: nouvelleCle(),
    genreId,
    label,
    familyIndex,
    niveau,
    rayon: rayonDuNiveau(niveau),
    x,
    y,
    vx: Math.cos(direction) * vitesse,
    vy: Math.sin(direction) * vitesse,
    angle: hasard() * Math.PI * 2,
    vitesseAngulaire: (hasard() - 0.5) * 0.6
  };
};

/** Les quatorze astéroïdes du départ : un par famille, et c'est SON
    FONDATEUR, pas une abstraction posée au-dessus de lui.

    MESURÉ : un niveau « famille » distinct des genres donnait une première
    vague creuse. Chaque famille du corpus n'a qu'un seul fondateur, donc
    détruire un astéroïde « Breaks » aurait libéré un unique astéroïde
    « Breakbeat » avant que le jeu ne commence vraiment. Les quatorze
    premiers astéroïdes sont donc les quatorze fondateurs : détruire
    Breakbeat libère aussitôt ses cinq enfants.

    Posés en anneau, pour qu'aucun ne soit sur le vaisseau au premier
    souffle. */
export const flotteInitiale = (monde: Monde, graine: number): Asteroide[] => {
  const hasard = generateur(graine);
  const cx = monde.largeur / 2;
  const cy = monde.hauteur / 2;
  const rayonAnneau = Math.min(monde.largeur, monde.hauteur) * 0.38;

  return FAMILIES.flatMap((_, i) => {
    const angle = (i / FAMILIES.length) * Math.PI * 2;
    return fondateursDe(i).map((g) =>
      creer(
        g.id,
        g.label,
        i,
        0,
        enrouler(cx + Math.cos(angle) * rayonAnneau, monde.largeur),
        enrouler(cy + Math.sin(angle) * rayonAnneau, monde.hauteur),
        hasard
      )
    );
  });
};

/** Ce que libère un astéroïde détruit. Rien pour une feuille : elle
    disparaît, et c'est ainsi qu'une partie peut finir. */
export const fragmenter = (
  a: Asteroide,
  monde: Monde,
  hasard: () => number
): Asteroide[] => {
  const enfants = enfantsDe(a.familyIndex, a.genreId);

  return enfants.map((g, i) => {
    /* Les fragments partent en éventail depuis le point d'impact, décalés
       du rayon du parent : sans ce décalage ils naîtraient superposés et
       un seul tir les emporterait tous. */
    const ecart = (i / Math.max(1, enfants.length)) * Math.PI * 2;
    const d = a.rayon * 0.8;
    return creer(
      g.id,
      g.label,
      a.familyIndex,
      a.niveau + 1,
      enrouler(a.x + Math.cos(ecart) * d, monde.largeur),
      enrouler(a.y + Math.sin(ecart) * d, monde.hauteur),
      hasard
    );
  });
};

/* ------------------------------------------------------- ce que ça donne */

/** Dangerosité d'une famille : le nombre d'astéroïdes qu'elle finira par
    libérer, et le nombre de vagues qu'il faudra pour en venir à bout. */
export const profilDeFamille = (
  familyIndex: number
): { total: number; premiereVague: number; vagues: number } => {
  const structure = STRUCTURES[familyIndex];
  if (!structure) return { total: 0, premiereVague: 0, vagues: 0 };
  const profondeurMax = structure.genres.reduce((m, g) => Math.max(m, g.depth), 0);
  /* Premier éclat : ce que libère la destruction du fondateur, donc du
     tout premier astéroïde de cette famille. */
  const premiereVague = fondateursDe(familyIndex).reduce(
    (n, g) => n + enfantsDe(familyIndex, g.id).length,
    0
  );
  return { total: structure.genres.length, premiereVague, vagues: profondeurMax + 1 };
};
