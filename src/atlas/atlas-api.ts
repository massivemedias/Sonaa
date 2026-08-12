/* Le contrat entre l'application et le moteur 3D.

   Ces types vivaient dans webgl.ts, le moteur de la vue « 3D fixe ». Quand
   cette vue a ete supprimee, ils sont restes : ils ne decrivaient pas ce
   moteur-la, ils decrivaient ce que TOUT moteur doit rendre a AtlasPage.
   Les laisser dans un fichier de moteur avait produit une dependance a
   l'envers, ou webgl-orbit.ts importait des types depuis son concurrent. */


export interface AtlasStats {
  fps: number;
  drawCalls: number;
  spheres: number;
  links: number;
  openLabel: string;
  deployPct: number;
  distance: number;
  nearestLabel: string;
  nearestDistance: number;
  labelsShown: number;
  genreLabelsShown: number;
  reduced: boolean;
  results: AtlasResults | null;
}

export interface AtlasResults {
  backgroundMs: number;
  spheresMs: number;
  linksMs: number;
  totalMs: number;
  labelCpuMs: number;
}

export interface NavState {
  level: 'atlas' | 'family' | 'genre';
  familyIndex: number;
  familyLabel: string;
  genreIndex: number;
  genreLabel: string;
  genreHasChildren: boolean;
  /* Chemin complet de descente, pour le fil d'Ariane. `index` est global,
     `local` est l'index dans la famille : le fil d'Ariane redescend sur un
     segment, et l'API de descente parle en index local. Sans lui, la coquille
     devait refaire la conversion, et elle ne pouvait pas : les décalages de
     famille vivent dans le moteur. */
  path: { index: number; local: number; label: string }[];
}

/* Le lecteur n'est plus une plaque dans la scène : c'est un panneau DOM
   rectangulaire, droit, aligné sur la grille de l'écran (ADR-042). Le moteur
   n'émet plus une géométrie par image, seulement l'ouverture et la
   fermeture. */
export interface PanelState {
  familyIndex: number;
  genreLocal: number;
}

export interface AtlasHandles {
  canvas: HTMLCanvasElement;
  labelLayer: HTMLElement;
  onStats: (stats: AtlasStats) => void;
  onNavigate: (nav: NavState) => void;
  /** Demande d'ouverture du panneau tracks pour un genre. */
  onTracks: (familyIndex: number, genreLocal: number) => void;
  /** Ouverture et fermeture du panneau lecteur. */
  onPanel: (panel: PanelState | null) => void;
  onContextLost: () => void;
}

export interface AtlasApi {
  dispose: () => void;
  runProfile: () => Promise<void>;
  recenter: () => void;
  zoom: (direction: 1 | -1) => void;
  /** Pan clavier ou boutons : décale la vue d'un pas dans le plan. */
  pan: (dx: number, dy: number) => void;
  goUp: () => void;
  goToFamily: (familyIndex: number) => void;
  /** Vol vers un genre nommé, depuis la recherche ou la fiche. */
  goToGenre: (familyIndex: number, genreLocal: number) => void;
  setSuspended: (suspended: boolean) => void;
  openPanel: (familyIndex: number, genreLocal: number) => void;
  closePanel: () => void;
  /** Joue la naissance des familles. Rappel à la fin ou à l'interruption. */
  playIntro: (onEnd?: () => void) => void;
  /** Recadre la caméra sur la famille entière, sans toucher à la sélection.
      Sert quand la feuille mobile ou la colonne changent la zone visible. */
  /** Compte les pixels qui changent entre deux images rendues a etat
      IDENTIQUE. Une scene stable doit rendre zero. Tout pixel instable est
      un papillotement mesurable. Voir webgl-orbit.ts. */
  composante?: (nom: string, actif: boolean) => { nom: string; actif: boolean };
  compteDessine?: () => {
    instancesSoumises: number; dessinees: number;
    repliesVisibles: { label: string; depth: number; presence: number; distanceAuParent: number }[];
  };
  spheresSuperposees?: () => {
    a: string; b: string; depthA: number; depthB: number;
    presenceA: number; presenceB: number; distance: number;
    rayonA: number; rayonB: number;
  }[];
  lignePixels?: (cx: number, cy: number, longueur: number, vertical?: boolean) => {
    x0: number; y0: number; largeur: number; hauteur: number;
    inversions: number; luminances: number[];
  };
  capturerZone?: (cx: number, cy: number, taille: number, agrandissement?: number) => string | null;
  mesurerScintillement?: (
    images?: number,
    seuil?: number,
    pasMs?: number
  ) => {
    largeur: number;
    hauteur: number;
    pixels: number;
    images: number;
    seuil: number;
    sautsMax: number;
    sautsMoyen: number;
    ecartMax: number;
    variationsDouces: number;
  };
  frameFamily: (familyIndex: number) => void;
  /** Recadre le niveau courant : couronne au niveau famille, sous-anneau en
      descente. */
  frameCurrent: () => void;
  /** Boîtes réellement testées par la dernière passe de placement des labels
      (lecture seule, pour verify:visual : boîte testée = boîte rendue). */
  labelSnapshot: () => {
    key: string;
    text: string;
    sx: number;
    sy: number;
    w: number;
    h: number;
    px: number;
    opacity: number;
  }[];
}
