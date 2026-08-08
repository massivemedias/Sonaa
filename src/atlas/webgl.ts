/* Couche WebGL du prototype. JETABLE.
   Import dynamique après le premier rendu. Imports nommés (ADR-019). */

import {
  BufferAttribute,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  BufferGeometry,
  InstancedBufferGeometry,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';

import {
  FAMILIES,
  FAMILY_LINKS,
  STRUCTURES,
  TOTAL_GENRES,
  TOTAL_INTERNAL_LINKS,
  FAMILY_CENTERS,
  FAMILY_MARGIN,
  DEFAULT_AZIMUTH,
  DEFAULT_ELEVATION,
  familyRadius,
  ATLAS_CENTER,
  pathToGenre
} from './structures.ts';

import {
  backgroundFrag,
  backgroundVert,
  linkFrag,
  linkVert,
  sphereFrag,
  sphereVert,
  panelVert,
  panelFrag
} from './shaders.ts';

// ------------------------------------------------------------------ couleur

const oklchToSrgb = (L: number, C: number, hDeg: number): [number, number, number] => {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
  const gamma = (v: number): number => {
    const c = Math.min(1, Math.max(0, v));
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return [gamma(lin[0] ?? 0), gamma(lin[1] ?? 0), gamma(lin[2] ?? 0)];
};

// ------------------------------------------------------------------ types

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
  /** Chemin complet de descente, pour le fil d'Ariane. */
  path: { index: number; label: string }[];
}

/* Géométrie du panneau, recalculée à chaque image et transmise au DOM.
   La fenêtre vidéo et les commandes se positionnent dessus : l'iframe YouTube
   ne peut pas se rendre dans une texture WebGL, donc elle se superpose au
   canvas en suivant exactement la plaque rendue en 3D. */
export interface PanelState {
  familyIndex: number;
  genreLocal: number;
  /** Centre de la plaque, en pixels CSS. */
  x: number;
  y: number;
  /** Taille projetée de la plaque, en pixels CSS. */
  width: number;
  height: number;
  /** Inclinaison de la plaque, en degrés. Le DOM applique la même. */
  tiltDeg: number;
  /** Faux quand la plaque passe derrière la caméra. */
  visible: boolean;
}

export interface AtlasHandles {
  canvas: HTMLCanvasElement;
  labelLayer: HTMLElement;
  onStats: (stats: AtlasStats) => void;
  onNavigate: (nav: NavState) => void;
  /** Demande d'ouverture du panneau morceaux pour un genre. */
  onTracks: (familyIndex: number, genreLocal: number) => void;
  /** Géométrie du panneau à chaque image, ou null quand il est fermé. */
  onPanel: (panel: PanelState | null) => void;
  onContextLost: () => void;
}

export interface AtlasApi {
  dispose: () => void;
  runProfile: () => Promise<void>;
  recenter: () => void;
  zoom: (direction: 1 | -1) => void;
  rotate: (direction: 1 | -1) => void;
  goUp: () => void;
  goToFamily: (familyIndex: number) => void;
  setSuspended: (suspended: boolean) => void;
  /** Ouvre la plaque devant la sphère d'un genre, et vole vers elle. */
  openPanel: (familyIndex: number, genreLocal: number) => void;
  closePanel: () => void;
}

const FOV = 40;
/* Distance de cadrage de l'atlas : les 14 familles doivent occuper environ
   70 pour cent de la hauteur de l'écran. Calculée, pas devinée. */
const ATLAS_FILL = 0.7;
const LABEL_POOL = 64;
/* Amplitude de dolly large : on doit pouvoir arriver assez près pour qu'une
   sphère occupe la moitié de la hauteur de l'écran. À 40 degrés de champ, cela
   demande une distance d'environ 5,7 fois le rayon, soit 6 unités pour une
   petite sphère. On descend nettement en dessous pour garder de la marge. */
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 520;

/* Taille des labels : plancher et plafond stricts. Jamais de texte à 8 px
   parce qu'un noeud est loin, jamais de titre géant parce qu'il est proche. */
const LABEL_PX_CEILING = 22;
const DESKTOP = { maxLabels: 56, floorPx: 13 };
const MOBILE = { maxLabels: 20, floorPx: 15 };

/* Le panneau morceaux.
   Proportion portrait : une fenêtre 16:9 en haut, puis le texte, la bande de
   pochettes et le transport. Il occupe 66 pour cent de la hauteur de l'écran au
   moment où on arrive dessus, et il est décalé vers le haut pour que la sphère
   du genre reste visible en dessous. */
/* Rapport largeur sur hauteur. Mesuré sur le contenu réel : fenêtre 16:9,
   quatre lignes de texte, bande de pochettes et transport ne tiennent pas dans
   0.92, la bande se faisait rogner. */
const PANEL_ASPECT = 0.86;
const PANEL_FILL = 0.52;
const PANEL_TILT_DEG = 9;
const PANEL_RISE = 0.2;
/** Suivi amorti : la plaque accompagne la caméra, elle ne lui colle pas. */
const PANEL_FOLLOW = 0.14;

/* La diffusion. Rapide et énergique : c'est l'animation signature. */
const OPEN_MS = 480;
const OPEN_DELAY_MS = 40;
const CLOSE_MS = 300;
const CLOSE_DELAY_MS = 22;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/* Easing avec léger dépassement. Un ease-out mou donnerait un fondu, pas une
   propagation : le dépassement est ce qui met de l'énergie dans le geste. */
const backOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

// ------------------------------------------------------------------ init

export const initAtlas = (handles: AtlasHandles): AtlasApi => {
  const { canvas, labelLayer, onStats, onNavigate, onTracks, onPanel, onContextLost } = handles;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.info.autoReset = false;
  const gl = renderer.getContext();

  const detectReduced = (): boolean => {
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;
    if ((navigator.hardwareConcurrency ?? 8) <= 4) return true;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
      const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      if (/Adreno|Mali|PowerVR|Apple A\d|SwiftShader|llvmpipe/i.test(name)) return true;
    } catch {
      // Extension absente : on reste en mode complet.
    }
    return false;
  };

  const reduced = detectReduced();
  const maxPixelRatio = reduced ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

  const onLost = (event: Event): void => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  // ---------------------------------------------------------------- fond

  const bgScene = new Scene();
  const bgCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgUniforms = {
    uResolution: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uGrain: { value: 1 }
  };
  const bgMesh = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({ vertexShader: backgroundVert, fragmentShader: backgroundFrag, uniforms: bgUniforms, depthTest: false, depthWrite: false })
  );
  bgScene.add(bgMesh);

  // --------------------------------------------------------------- scène

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.5, 4000);
  const cameraPos = new Vector3();
  const fogColor = new Vector3(0.042, 0.047, 0.058);

  // ------------------------------------------------------------ sphères

  /* Toutes les familles à plat dans un seul tampon : un appel de dessin pour
     les 204 sphères de l'atlas. */
  const sphereCenters = new Float32Array(TOTAL_GENRES * 3);
  const sphereRadii = new Float32Array(TOTAL_GENRES);
  const sphereColors = new Float32Array(TOTAL_GENRES * 3);
  const sphereState = new Float32Array(TOTAL_GENRES * 4);
  /* Mis à jour par la passe de labels, consommé par le shader à l'image
     suivante : 33 ms de retard, invisible. */
  const labelled = new Uint8Array(TOTAL_GENRES);

  interface Slot {
    family: number;
    local: number;
    parent: number;
    major: boolean;
    children: number[];
    depth: number;
    label: string;
    bpm: number;
    compact: Vector3;
    deployed: Vector3;
    world: Vector3;
  }

  const slotsData: Slot[] = [];
  const familyOffset: number[] = [];

  {
    let cursor = 0;
    FAMILIES.forEach((family, fi) => {
      familyOffset[fi] = cursor;
      const structure = STRUCTURES[fi];
      if (!structure) return;
      const [cx, cy, cz] = FAMILY_CENTERS[fi] ?? family.center;

      structure.genres.forEach((genre, li) => {
        const i = cursor + li;
        sphereRadii[i] = genre.radius;
        const [r, g, b] = oklchToSrgb(genre.lightness, genre.chroma, family.hue);
        sphereColors[i * 3] = r;
        sphereColors[i * 3 + 1] = g;
        sphereColors[i * 3 + 2] = b;
        sphereState[i * 4] = 1;
        sphereState[i * 4 + 1] = 0;
        sphereState[i * 4 + 2] = genre.children.length;
        sphereState[i * 4 + 3] = 0;

        slotsData.push({
          family: fi,
          local: li,
          depth: genre.depth,
          label: genre.label,
          bpm: genre.bpm,
          children: genre.children,
          parent: genre.parent,
          major: genre.major,
          // Offsets RELATIFS au centre de famille : le centre bouge quand une
          // famille se déploie et pousse les autres.
          compact: new Vector3(...genre.compact),
          deployed: new Vector3(...genre.deployed),
          world: new Vector3(cx + genre.compact[0], cy + genre.compact[1], cz + genre.compact[2])
        });
      });
      cursor += structure.genres.length;
    });
  }

  const quad = new PlaneGeometry(1, 1);
  const quadPosition = quad.getAttribute('position') as BufferAttribute;
  const quadUv = quad.getAttribute('uv') as BufferAttribute;
  const quadIndex = quad.getIndex();

  const sphereGeometry = new InstancedBufferGeometry();
  sphereGeometry.setAttribute('position', quadPosition);
  sphereGeometry.setAttribute('uv', quadUv);
  if (quadIndex) sphereGeometry.setIndex(quadIndex);
  sphereGeometry.instanceCount = TOTAL_GENRES;

  const sphereCenterAttr = new InstancedBufferAttribute(sphereCenters, 3);
  const sphereStateAttr = new InstancedBufferAttribute(sphereState, 4);
  sphereCenterAttr.setUsage(35048);
  sphereStateAttr.setUsage(35048);
  sphereGeometry.setAttribute('aCenter', sphereCenterAttr);
  sphereGeometry.setAttribute('aRadius', new InstancedBufferAttribute(sphereRadii, 1));
  sphereGeometry.setAttribute('aColor', new InstancedBufferAttribute(sphereColors, 3));
  sphereGeometry.setAttribute('aState', sphereStateAttr);

  const sphereUniforms = {
    uCameraPos: { value: cameraPos },
    uLightDir: { value: new Vector3(0.42, 0.72, 0.55).normalize() },
    uPixelScale: { value: 0.001 },
    uFog: { value: new Vector2(190, 620) },
    uFogColor: { value: fogColor }
  };

  const sphereMaterial = new ShaderMaterial({
    vertexShader: sphereVert,
    fragmentShader: sphereFrag,
    uniforms: sphereUniforms,
    transparent: true,
    // Les sphères écrivent la profondeur : l'occultation entre corps est
    // correcte sans aucun tri par instance.
    depthTest: true,
    depthWrite: true
  });

  const sphereMesh = new Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.frustumCulled = false;
  sphereMesh.renderOrder = 1;
  scene.add(sphereMesh);

  // -------------------------------------------------------------- liens

  const LINK_COUNT = TOTAL_INTERNAL_LINKS + FAMILY_LINKS.length;
  const linkP0 = new Float32Array(LINK_COUNT * 3);
  const linkP1 = new Float32Array(LINK_COUNT * 3);
  const linkC0 = new Float32Array(LINK_COUNT * 3);
  const linkC1 = new Float32Array(LINK_COUNT * 3);
  const linkMeta = new Float32Array(LINK_COUNT * 3);

  interface LinkRef {
    a: number; // index global de sphère, ou -1 pour un lien de famille
    b: number;
    familyA: number;
    familyB: number;
    internal: boolean;
  }

  const linkRefs: LinkRef[] = [];

  {
    let cursor = 0;
    FAMILIES.forEach((family, fi) => {
      const structure = STRUCTURES[fi];
      const base = familyOffset[fi] ?? 0;
      if (!structure) return;
      for (const link of structure.links) {
        const gi = base + link.from;
        const gj = base + link.to;
        const ci = oklchToSrgb(0.7, 0.07, family.hue);
        linkC0.set(ci, cursor * 3);
        linkC1.set(ci, cursor * 3);
        linkMeta[cursor * 3] = 0.35;
        linkMeta[cursor * 3 + 1] = 1;
        linkMeta[cursor * 3 + 2] = 0;
        linkRefs.push({ a: gi, b: gj, familyA: fi, familyB: fi, internal: true });
        cursor += 1;
      }
    });

    for (const link of FAMILY_LINKS) {
      const fa = FAMILIES[link.from];
      const fb = FAMILIES[link.to];
      if (!fa || !fb) continue;
      linkC0.set(oklchToSrgb(0.66, 0.06, fa.hue), cursor * 3);
      linkC1.set(oklchToSrgb(0.66, 0.06, fb.hue), cursor * 3);
      linkMeta[cursor * 3] = link.weight;
      linkMeta[cursor * 3 + 1] = 1;
      linkMeta[cursor * 3 + 2] = 1;
      linkRefs.push({ a: -1, b: -1, familyA: link.from, familyB: link.to, internal: false });
      cursor += 1;
    }
  }

  const SEGMENTS = 12;
  const vertCount = (SEGMENTS + 1) * 2;
  const ribbonPos = new Float32Array(vertCount * 3);
  const ribbonT = new Float32Array(vertCount);
  const ribbonSide = new Float32Array(vertCount);
  const ribbonIndex: number[] = [];
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = i / SEGMENTS;
    ribbonT[i * 2] = t;
    ribbonT[i * 2 + 1] = t;
    ribbonSide[i * 2] = -1;
    ribbonSide[i * 2 + 1] = 1;
    if (i < SEGMENTS) {
      const a = i * 2;
      ribbonIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const linkGeometry = new InstancedBufferGeometry();
  linkGeometry.setAttribute('position', new Float32BufferAttribute(ribbonPos, 3));
  linkGeometry.setAttribute('aT', new Float32BufferAttribute(ribbonT, 1));
  linkGeometry.setAttribute('aSide', new Float32BufferAttribute(ribbonSide, 1));
  linkGeometry.setIndex(ribbonIndex);
  linkGeometry.instanceCount = LINK_COUNT;

  const linkP0Attr = new InstancedBufferAttribute(linkP0, 3);
  const linkP1Attr = new InstancedBufferAttribute(linkP1, 3);
  const linkMetaAttr = new InstancedBufferAttribute(linkMeta, 3);
  for (const a of [linkP0Attr, linkP1Attr, linkMetaAttr]) a.setUsage(35048);
  linkGeometry.setAttribute('aP0', linkP0Attr);
  linkGeometry.setAttribute('aP1', linkP1Attr);
  linkGeometry.setAttribute('aColor0', new InstancedBufferAttribute(linkC0, 3));
  linkGeometry.setAttribute('aColor1', new InstancedBufferAttribute(linkC1, 3));
  linkGeometry.setAttribute('aMeta', linkMetaAttr);

  const linkUniforms = {
    uCameraPos: { value: cameraPos },
    uPixelScale: { value: 0.001 },
    uMinPixels: { value: 1.1 },
    uWidthWorld: { value: 0.075 },
    uFog: { value: sphereUniforms.uFog.value },
    uFogColor: { value: fogColor }
  };

  const linkMaterial = new ShaderMaterial({
    vertexShader: linkVert,
    fragmentShader: linkFrag,
    uniforms: linkUniforms,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });

  const linkMesh = new Mesh(linkGeometry, linkMaterial);
  linkMesh.frustumCulled = false;
  linkMesh.renderOrder = 2;
  scene.add(linkMesh);

  // -------------------------------------------------------------- panneau

  /* La plaque est un quad de quatre sommets recalculés en espace monde à
     chaque image : face caméra, inclinée d'un angle fixe, jamais en rotation
     propre. Faire le billboard côté CPU plutôt qu'en GLSL permet de projeter
     exactement les mêmes coins pour positionner le DOM par-dessus. */
  const panelPositions = new Float32Array(12);
  const panelGeometry = new BufferGeometry();
  /* BufferAttribute et NON Float32BufferAttribute : ce dernier recopie le
     tableau qu'on lui passe, si bien que les écritures faites ensuite dans
     panelPositions n'atteignaient jamais la géométrie et le quad restait
     dégénéré à l'origine. */
  const panelPosAttr = new BufferAttribute(panelPositions, 3);
  panelPosAttr.setUsage(35048);
  panelGeometry.setAttribute('position', panelPosAttr);
  panelGeometry.setAttribute('aQuadUv', new Float32BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
  panelGeometry.setIndex([0, 1, 2, 2, 1, 3]);

  const panelUniforms = {
    uTint: { value: new Vector3(1, 1, 1) },
    uOpacity: { value: 0 },
    uAspect: { value: new Vector2(PANEL_ASPECT, 1) },
    uEdgePx: { value: 0.004 }
  };

  const panelMesh = new Mesh(
    panelGeometry,
    new ShaderMaterial({
      vertexShader: panelVert,
      fragmentShader: panelFrag,
      uniforms: panelUniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false
    })
  );
  panelMesh.frustumCulled = false;
  panelMesh.renderOrder = 3;
  panelMesh.visible = false;
  scene.add(panelMesh);

  let panelSlot = -1;
  let panelHeight = 6;
  let panelOpacity = 0;
  const panelPos = new Vector3();
  const panelTarget = new Vector3();
  const panelRight = new Vector3();
  const panelUp = new Vector3();
  const panelFwd = new Vector3();
  const panelCorner = new Vector3();
  let lastPanelEmit = '';

  // ------------------------------------------------------------- caméra

  const atlasTarget = new Vector3(...ATLAS_CENTER);

  /* Cadrage de l'atlas mesuré, pas déduit d'une sphère englobante. Celle-ci
     est presque vide : deux familles excentrées en fixent le rayon alors que
     les douze autres se concentrent au centre, et la scène apparaissait deux
     fois trop petite. On mesure l'étendue VERTICALE réelle en espace caméra,
     qui ne dépend pas de la distance, et on résout. */
  /* Cadrage de l'atlas. On mesure l'étendue réelle dans les DEUX axes de la
     caméra, pas seulement la verticale : sur une fenêtre en portrait, c'est la
     largeur qui déborde, et deux familles sur six sortaient de l'écran. */
  const atlasDistanceFor = (aspect: number): number => {
    const az = DEFAULT_AZIMUTH;
    const el = DEFAULT_ELEVATION;
    // Axe vertical de la caméra pour cette orientation d'orbite.
    const upX = -Math.sin(el) * Math.sin(az);
    const upY = Math.cos(el);
    const upZ = -Math.sin(el) * Math.cos(az);
    // Axe horizontal : perpendiculaire à la direction de vue, dans le plan.
    const rightX = Math.cos(az);
    const rightZ = -Math.sin(az);

    let halfV = 1;
    let halfH = 1;
    FAMILIES.forEach((family, i) => {
      const dx = family.center[0] - ATLAS_CENTER[0];
      const dy = family.center[1] - ATLAS_CENTER[1];
      const dz = family.center[2] - ATLAS_CENTER[2];
      const r = STRUCTURES[i]?.compactRadius ?? 6;
      halfV = Math.max(halfV, Math.abs(dx * upX + dy * upY + dz * upZ) + r);
      halfH = Math.max(halfH, Math.abs(dx * rightX + dz * rightZ) + r);
    });

    const tan = Math.tan((FOV * Math.PI) / 360);
    const byHeight = halfV / (ATLAS_FILL * tan);
    const byWidth = halfH / (ATLAS_FILL * tan * Math.max(0.2, aspect));
    return clamp(Math.max(byHeight, byWidth), MIN_DISTANCE, MAX_DISTANCE);
  };

  let atlasDistance = atlasDistanceFor(1);

  const target = atlasTarget.clone();
  const targetSmooth = target.clone();
  let azimuth = DEFAULT_AZIMUTH;
  let elevation = DEFAULT_ELEVATION;
  let distance = atlasDistance;
  let azVel = 0;
  let elVel = 0;
  let dollyVel = 0;
  const ELEVATION_LIMIT = (82 * Math.PI) / 180;

  // ------------------------------------------------------- état déploiement

  const deployStart = new Float32Array(FAMILIES.length).fill(-1e9);
  const deployDir = new Int8Array(FAMILIES.length); // 1 ouverture, -1 fermeture
  const familyProgress = new Float32Array(FAMILIES.length);
  let openIndex = -1;
  let nearestIndex = 0;
  let nearestDist = 0;

  /* Trois niveaux de descente. Le niveau ne change jamais sans vol de caméra :
     on ne doit pas pouvoir se retrouver ailleurs sans avoir vu le trajet. */
  type Level = 'atlas' | 'family' | 'genre';
  let level: Level = 'atlas';
  let activeFamily = -1;
  /* Chemin de descente : Atlas puis famille puis genre puis sous-genre. Le fil
     d'Ariane en est la lecture directe, et chaque clic le recalcule depuis la
     racine, donc il ne peut jamais mentir. */
  let genrePath: number[] = [];
  let activeGenre = -1;

  // Animation de descente, distincte de la diffusion de famille.
  let focusStart = -1e9;
  let focusIndex = -1;
  let focusDir = 0; // 1 on descend, -1 on remonte
  const FOCUS_MS = 400;
  const FOCUS_DELAY_MS = 45;

  // Vol de caméra : cible et distance interpolées, easing doux.
  const flyFrom = new Vector3();
  const flyTo = new Vector3();
  let flyFromDist = 0;
  let flyToDist = 0;
  let flyStart = -1e9;
  let flying = false;
  const FLY_MS = 600;

  const easeInOut = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* Cadrage serré. Le facteur précédent, 1.7, laissait l'amas occuper à peine
     un quart de l'écran : six labels ne pouvaient pas y tenir sans se marcher
     dessus, et l'évitement de collision en supprimait la moitié. Le vrai levier
     de lisibilité était le cadrage, pas la largeur des plaques. */
  const frameDistance = (radius: number): number =>
    clamp((radius * 1.12) / Math.tan((FOV * Math.PI) / 360), MIN_DISTANCE, MAX_DISTANCE);

  const startFly = (to: Vector3, dist: number, now: number): void => {
    if (reducedMotion) {
      targetSmooth.copy(to);
      target.copy(to);
      distance = dist;
      applyCamera();
      return;
    }
    flyFrom.copy(targetSmooth);
    flyTo.copy(to);
    flyFromDist = distance;
    flyToDist = dist;
    flyStart = now;
    flying = true;
    azVel = 0;
    elVel = 0;
    dollyVel = 0;
  };

  const emitNav = (): void => {
    const fam = activeFamily >= 0 ? FAMILIES[activeFamily] : undefined;
    const gen = activeGenre >= 0 ? slotsData[activeGenre] : undefined;
    onNavigate({
      level,
      familyIndex: activeFamily,
      familyLabel: fam?.label ?? '',
      genreIndex: activeGenre,
      genreLabel: gen?.label ?? '',
      genreHasChildren: (gen?.children.length ?? 0) > 0,
      path: genrePath.map((gi) => ({ index: gi, label: slotsData[gi]?.label ?? '' }))
    });
  };

  /* Un noeud descend-il du noeud focalisé ? Profondeur maximale de 4, donc la
     remontée de parents est négligeable, et ça évite de matérialiser des
     ensembles à chaque image. */
  const isDescendant = (globalIndex: number, ancestor: number): boolean => {
    if (ancestor < 0) return false;
    const anc = slotsData[ancestor];
    if (!anc) return false;
    const base = familyOffset[anc.family] ?? 0;
    let cursor: number = globalIndex;
    let guard = 0;
    while (cursor >= 0 && guard < 8) {
      if (cursor === ancestor) return true;
      const node: Slot | undefined = slotsData[cursor];
      if (!node || node.family !== anc.family) return false;
      cursor = node.parent >= 0 ? base + node.parent : -1;
      guard += 1;
    }
    return false;
  };

  const setDeploy = (familyIndex: number, open: boolean, now: number): void => {
    if (familyIndex < 0) return;
    const dir = open ? 1 : -1;

    /* Une seule famille déployée à la fois. Au niveau Atlas, toutes sont
       compactes ; ouvrir l'une referme l'autre, sans exception. */
    if (open) {
      for (let i = 0; i < FAMILIES.length; i += 1) {
        if (i !== familyIndex && deployDir[i] === 1) {
          deployDir[i] = -1;
          deployStart[i] = now;
        }
      }
    }

    if (deployDir[familyIndex] === dir) return;
    deployDir[familyIndex] = dir;
    deployStart[familyIndex] = now;
    if (open) openIndex = familyIndex;
    else if (openIndex === familyIndex) openIndex = -1;
  };

  /* Avancement d'un genre : la cascade descend le long de la filiation, chaque
     niveau décalé de quelques dizaines de millisecondes. À la fermeture, la
     cascade s'inverse, les plus profonds partent en premier. */
  const genreProgress = (slot: Slot, now: number): number => {
    if (reducedMotion) return deployDir[slot.family] === 1 ? 1 : 0;

    const dir = deployDir[slot.family] ?? 0;
    const start = deployStart[slot.family] ?? -1e9;
    const opening = dir === 1;
    const duration = opening ? OPEN_MS : CLOSE_MS;
    const delay = (opening ? OPEN_DELAY_MS : CLOSE_DELAY_MS) * slot.depth;
    const elapsed = now - start - (opening ? delay : 0);

    const raw = clamp(elapsed / duration, 0, 1);
    if (opening) return backOut(raw);
    return 1 - backOut(clamp((now - start - CLOSE_DELAY_MS * (6 - Math.min(slot.depth, 6))) / duration, 0, 1));
  };

  // -------------------------------------------------------------- taille

  let width = 1;
  let height = 1;

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width || window.innerWidth || 1));
    height = Math.max(1, Math.floor(rect.height || window.innerHeight || 1));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Le cadrage de l'atlas dépend du format de la fenêtre : on le refait.
    const wasAtlas = Math.abs(distance - atlasDistance) < 0.5;
    atlasDistance = atlasDistanceFor(camera.aspect);
    if (wasAtlas) distance = atlasDistance;
    bgUniforms.uResolution.value.set(width, height);
    const pixelScale = (2 * Math.tan((FOV * Math.PI) / 360)) / height;
    sphereUniforms.uPixelScale.value = pixelScale;
    linkUniforms.uPixelScale.value = pixelScale;
  };

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener('resize', resize);

  // -------------------------------------------------------- interactions

  /* Molette et pincement font tous deux avancer et reculer. C'est ce que tout
     le monde attend d'une molette, et le glissement suffit pour tourner. */
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (suspended) return;
    const k = event.ctrlKey ? 0.03 : 0.026;
    dollyVel += event.deltaY * k;
    // Un glissement horizontal franc au trackpad fait quand même tourner.
    if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.5) {
      dollyVel -= event.deltaY * k;
      azVel -= event.deltaX * 0.0022;
    }
  };

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let suspended = false;
  let interacted = false;

  const onFirstInteraction = (): void => {
    if (interacted) return;
    interacted = true;
    document.documentElement.dataset['atlasTouched'] = '1';
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (suspended) return;
    onFirstInteraction();
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };

  /* Survol : le noeud sous le curseur, son parent et ses enfants directs
     restent lisibles, le reste s'efface. Réutilise la projection déjà faite
     pour le clic, donc coût nul. */
  const onHover = (event: PointerEvent): void => {
    if (suspended) return;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    let best = -1;
    let bestD = 34;
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      if ((projected[i * 3 + 2] ?? 2) > 1) continue;
      const d = Math.hypot(px - (projected[i * 3] ?? 0), py - (projected[i * 3 + 1] ?? 0));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best !== hovered) {
      hovered = best;
      lastLabelPass = 0;
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    onHover(event);
    if (!dragging || suspended) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    azVel -= dx * 0.0026;
    elVel += dy * 0.0026;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const projected = new Float32Array(TOTAL_GENRES * 3); // sx, sy, depth
  const scratch = new Vector3();

  const familyFrameRadius = (fi: number): number => STRUCTURES[fi]?.deployedRadius ?? 12;

  /* Rayon de cadrage d'un genre : lui et ses enfants directs. */
  const genreFrameRadius = (globalIndex: number): number => {
    const slot = slotsData[globalIndex];
    if (!slot) return 6;
    const base = familyOffset[slot.family] ?? 0;
    let r = sphereRadii[globalIndex] ?? 2;
    for (const child of slot.children) {
      const cs = slotsData[base + child];
      if (!cs) continue;
      r = Math.max(r, slot.world.distanceTo(cs.world) + (sphereRadii[base + child] ?? 2));
    }
    return r * 1.35;
  };

  const selectFamily = (fi: number, now: number): void => {
    if (activeFamily >= 0 && activeFamily !== fi) setDeploy(activeFamily, false, now);
    activeFamily = fi;
    activeGenre = -1;
    genrePath = [];
    focusIndex = -1;
    focusDir = -1;
    focusStart = now;
    level = 'family';
    setDeploy(fi, true, now);
    const c = familyCenters[fi];
    if (c) startFly(c, frameDistance(familyFrameRadius(fi)), now);
    emitNav();
  };

  /* Ouvrir le panneau, c'est voler jusqu'à la sphère et poser la plaque
     devant. La taille de la plaque est fixée en unités monde à l'ouverture,
     pas recalculée à chaque image : c'est un objet de la scène, il doit
     grandir quand on avance, pas rester collé à l'écran. */
  const openPanel = (familyIndex: number, genreLocal: number): void => {
    const base = familyOffset[familyIndex] ?? 0;
    const globalIndex = base + genreLocal;
    const slot = slotsData[globalIndex];
    if (!slot) return;

    const now = performance.now();
    panelSlot = globalIndex;
    panelHeight = Math.max(4.2, (sphereRadii[globalIndex] ?? 2) * 3.6);

    // Distance telle que la plaque occupe PANEL_FILL de la hauteur de l'écran.
    const dist = clamp(
      panelHeight / (2 * Math.tan((FOV * Math.PI) / 360) * PANEL_FILL),
      MIN_DISTANCE,
      MAX_DISTANCE
    );
    startFly(slot.world, dist, now);

    // Première pose sans amortissement, sinon la plaque arrive en glissant
    // depuis sa position précédente, à l'autre bout de l'atlas.
    panelPos.copy(slot.world);
    panelMesh.visible = true;

    /* Le panneau est une descente : le fil d'Ariane doit montrer le chemin
       complet jusqu'au genre, pas s'arrêter à la famille. */
    const path = pathToGenre(familyIndex, genreLocal).map((local) => base + local);
    genrePath = path;
    activeGenre = globalIndex;
    focusIndex = globalIndex;
    focusDir = 1;
    focusStart = now;
    level = 'genre';

    const family = FAMILIES[slot.family];
    if (family) {
      const [r, g, b] = oklchToSrgb(0.7, 0.15, family.hue);
      panelUniforms.uTint.value.set(r, g, b);
    }

    onTracks(familyIndex, genreLocal);
    emitNav();
  };

  const closePanel = (): void => {
    if (panelSlot < 0) return;
    panelSlot = -1;
    lastPanelEmit = '';
    onPanel(null);
  };

  const selectGenre = (globalIndex: number, now: number): void => {
    const slot = slotsData[globalIndex];
    if (!slot) return;

    // Second clic sur un genre déjà actif, ou feuille : les morceaux.
    if (activeGenre === globalIndex || slot.children.length === 0) {
      openPanel(slot.family, slot.local);
      return;
    }

    /* Vraie descente. Le chemin est recalculé depuis la racine de la famille,
       donc le fil d'Ariane reflète toujours la filiation réelle et non
       l'historique des clics. */
    const base = familyOffset[slot.family] ?? 0;
    genrePath = pathToGenre(slot.family, slot.local).map((local) => base + local);
    activeGenre = globalIndex;
    level = 'genre';

    focusIndex = globalIndex;
    focusDir = 1;
    focusStart = now;

    startFly(slot.world, frameDistance(genreFrameRadius(globalIndex)), now);
    emitNav();
  };

  const goUp = (): void => {
    const now = performance.now();
    if (level === 'genre') {
      /* On remonte d'un cran dans le chemin, pas directement à la famille :
         Atlas > Bass > UK Garage > 2-step doit revenir sur UK Garage. */
      genrePath = genrePath.slice(0, -1);
      const parent = genrePath[genrePath.length - 1];
      focusDir = -1;
      focusStart = now;

      if (parent !== undefined) {
        activeGenre = parent;
        focusIndex = parent;
        focusDir = 1;
        const slot = slotsData[parent];
        if (slot) startFly(slot.world, frameDistance(genreFrameRadius(parent)), now);
        emitNav();
        return;
      }

      activeGenre = -1;
      focusIndex = -1;
      level = 'family';
      const c = activeFamily >= 0 ? familyCenters[activeFamily] : undefined;
      if (c) startFly(c, frameDistance(familyFrameRadius(activeFamily)), now);
    } else if (level === 'family') {
      if (activeFamily >= 0) setDeploy(activeFamily, false, now);
      activeFamily = -1;
      activeGenre = -1;
      genrePath = [];
      focusIndex = -1;
      focusDir = -1;
      focusStart = now;
      level = 'atlas';
      startFly(atlasTarget, atlasDistance, now);
    }
    emitNav();
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (dragging && moved < 5 && !suspended) {
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      let best = -1;
      let bestD = 44;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if ((projected[i * 3 + 2] ?? 2) > 1) continue;
        const d = Math.hypot(px - (projected[i * 3] ?? 0), py - (projected[i * 3 + 1] ?? 0));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }

      const now = performance.now();
      const slot = best >= 0 ? slotsData[best] : undefined;

      if (!slot) {
        // Clic dans le vide : on remonte d'un niveau.
        goUp();
      } else if (level === 'atlas' || slot.family !== activeFamily) {
        selectFamily(slot.family, now);
      } else {
        selectGenre(best, now);
      }
    }
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  /* Clavier : flèches pour tourner, plus et moins pour zoomer, 0 pour
     recentrer, Échap pour remonter. La navigation ne dépend pas d'un geste
     trackpad que personne ne devine. */
  const onKey = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
    switch (event.key) {
      case 'ArrowLeft': azVel -= 0.045; break;
      case 'ArrowRight': azVel += 0.045; break;
      case 'ArrowUp': elVel += 0.035; break;
      case 'ArrowDown': elVel -= 0.035; break;
      case '+': case '=': dollyVel -= 5.5; break;
      case '-': case '_': dollyVel += 5.5; break;
      case '0': recenter(); break;
      /* Échap appartient au panneau tant qu'il est ouvert : c'est la couche
         DOM qui le ferme puis remonte, sinon on remonterait deux fois. */
      case 'Escape': if (panelSlot < 0) goUp(); break;
      default: return;
    }
    event.preventDefault();
    onFirstInteraction();
  };
  window.addEventListener('keydown', onKey);

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  /* Recentrer, c'est revenir à l'atlas, pas seulement replacer la caméra.
     Sans remise à zéro de la navigation, le fil d'Ariane continuait d'annoncer
     une famille sélectionnée qu'on ne voyait plus. */
  const recenter = (): void => {
    closePanel();
    target.copy(atlasTarget);
    targetSmooth.copy(atlasTarget);
    distance = atlasDistance;
    azVel = 0;
    elVel = 0;
    dollyVel = 0;
    for (let i = 0; i < FAMILIES.length; i += 1) setDeploy(i, false, performance.now());
    activeFamily = -1;
    activeGenre = -1;
    genrePath = [];
    focusIndex = -1;
    focusDir = -1;
    focusStart = performance.now();
    level = 'atlas';
    emitNav();
  };

  // ------------------------------------------------------------- labels

  interface LabelSlot {
    el: HTMLSpanElement;
    key: string;
    x: number;
    y: number;
    px: number;
    opacity: number;
    visible: boolean;
  }

  const labelSlots: LabelSlot[] = [];
  for (let i = 0; i < LABEL_POOL; i += 1) {
    const el = document.createElement('span');
    el.className = 'atlas-label';
    el.style.transform = 'translate3d(-9999px,-9999px,0)';
    labelLayer.appendChild(el);
    labelSlots.push({ el, key: '', x: -9999, y: -9999, px: 14, opacity: 0, visible: false });
  }

  const touch = window.matchMedia('(pointer: coarse), (max-width: 767px)').matches;
  const labelRules = touch ? MOBILE : DESKTOP;

  let labelCpuAccum = 0;
  let labelCpuFrames = 0;
  let lastLabelPass = 0;
  let labelsShown = 0;
  let genreLabelsShown = 0;
  let hovered = -1;

  interface Candidate {
    key: string;
    text: string;
    sx: number;
    sy: number;
    depth: number;
    kind: 'family' | 'genre';
    /** Index global de la sphère, ou -1 pour un label de famille. */
    slot: number;
    /** Jamais masqué par une collision. */
    pinned: boolean;
    opacity: number;
    px: number;
    w: number;
    h: number;
  }

  const candidates: Candidate[] = [];
  const placed: Candidate[] = [];

/* Tolérance de chevauchement : deux plaques peuvent se toucher sur 4 pixels
   avant qu'on masque la plus lointaine. Sans elle, l'évitement est si strict
   qu'il supprime des labels qui se frôlent à peine. */
const OVERLAP_TOLERANCE = 4;

  const overlaps = (a: Candidate, b: Candidate): boolean => {
    const t = OVERLAP_TOLERANCE;
    return (
      a.sx + t < b.sx + b.w &&
      a.sx + a.w - t > b.sx &&
      a.sy + t < b.sy + b.h &&
      a.sy + a.h - t > b.sy
    );
  };

  const projectLabels = (now: number): void => {
    if (now - lastLabelPass < 33) return;
    lastLabelPass = now;
    const start = performance.now();

    candidates.length = 0;
    placed.length = 0;
    const halfW = width / 2;
    const halfH = height / 2;

    let nearest = Infinity;

    const add = (
      key: string,
      text: string,
      world: Vector3,
      kind: 'family' | 'genre',
      pinned: boolean,
      opacityScale: number,
      slot = -1
    ): void => {
      scratch.copy(world).project(camera);
      if (scratch.z > 1) return;
      const sx = scratch.x * halfW + halfW;
      const sy = -scratch.y * halfH + halfH;
      if (sx < -200 || sx > width + 200 || sy < -80 || sy > height + 80) return;

      const depth = camera.position.distanceTo(world);
      nearest = Math.min(nearest, depth);

      /* Compensation de distance, bornée. La formule seule donnerait 5 px au
         loin et 60 px au premier plan : le plancher et le plafond sont ce qui
         rend l'ensemble lisible à tous les zooms. */
      /* Les noms de familles sont plus petits que les noms de genres au niveau
         Atlas : sinon le texte fait la largeur de l'amas qu'il désigne. Ils
         grandissent normalement quand on approche. */
      const isAtlasFamily = kind === 'family' && level === 'atlas';
      const raw = (1500 / Math.max(depth, 1)) * (isAtlasFamily ? 0.72 : 1);
      const px = clamp(raw, isAtlasFamily ? 10 : labelRules.floorPx, LABEL_PX_CEILING);

      candidates.push({
        key,
        text,
        sx,
        sy,
        depth,
        kind,
        slot,
        pinned,
        opacity: opacityScale,
        px,
        // Estimation de largeur : SF Pro tourne autour de 0,52 em par glyphe.
        w: text.length * px * 0.52 + px * 0.4,
        h: px * 1.45
      });
    };

    const hov = hovered >= 0 ? slotsData[hovered] : undefined;

    // Sous-arbre du survolé : lui, son parent, ses enfants directs.
    const highlighted = new Set<number>();
    if (hov) {
      const base = familyOffset[hov.family] ?? 0;
      highlighted.add(hovered);
      if (hov.parent >= 0) highlighted.add(base + hov.parent);
      for (const c of hov.children) highlighted.add(base + c);
    }

    FAMILIES.forEach((family, fi) => {
      const p = familyProgress[fi] ?? 0;
      const isCurrent = fi === activeFamily;
      add(
        `f-${family.id}`,
        family.label,
        familyCenters[fi] ?? new Vector3(),
        'family',
        isCurrent,
        isCurrent ? 1 : 1 - p * 0.5
      );
    });

    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot) continue;
      if ((familyProgress[slot.family] ?? 0) < 0.999) continue;

      const focusSlot = focusIndex >= 0 ? slotsData[focusIndex] : undefined;
      const inFocusFamily = focusSlot ? slot.family === focusSlot.family : false;
      const inSubtree = focusIndex >= 0 ? isDescendant(i, focusIndex) : false;

      /* Au niveau genre, TOUS les dérivés du noeud focalisé sont étiquetés,
         sans filtre de majeur : on est dans le détail, on ne cache plus rien.
         Le reste de la famille perd ses labels. */
      if (focusIndex >= 0) {
        if (inFocusFamily && !inSubtree) continue;
        if (!inFocusFamily) continue;
      } else {
        const isPinned = i === hovered;
        if (!slot.major && !isPinned && !highlighted.has(i)) continue;
      }

      const isPinned = i === focusIndex || i === hovered || inSubtree;
      let opacity = 1;
      if (hov && !highlighted.has(i) && focusIndex < 0) opacity = 0.2;

      /* Indice de descente dans le texte : on sait avant de cliquer s'il y a
         quelque chose dessous, et sinon que le clic mène aux morceaux. */
      /* Suffixe compact. « 3 dérivés » écrit en clair faisait 230 px de plaque
         et l'évitement de collision en supprimait la moitié. Le nom et le
         compte suffisent, l'anneau porte déjà le sens. */
      const suffix = slot.children.length > 0 ? ` · ${slot.children.length}` : ' ♪';

      add(`g-${slot.label}`, `${slot.label}${suffix}`, slot.world, 'genre', isPinned, opacity, i);
    }

    /* Atténuation des lointains : plus on s'approche, plus l'arrière-plan
       s'efface, pour que le premier plan gagne en contraste. */
    const fadeFar = nearest * 4 + 90;
    for (const c of candidates) {
      c.opacity *= clamp(1.15 - c.depth / fadeFar, 0, 1);
    }

    /* Placement. Les épinglés d'abord, puis les familles, puis les genres, du
       plus proche au plus lointain. En cas de collision, on masque le plus
       lointain : on ne décale JAMAIS un label, sinon il ne désigne plus rien. */
    candidates.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === 'family' ? -1 : 1;
      return a.depth - b.depth;
    });

    for (const c of candidates) {
      if (c.opacity < 0.06) continue;
      if (placed.length >= labelRules.maxLabels) break;
      if (!c.pinned && placed.some((other) => overlaps(c, other))) continue;
      placed.push(c);
    }

    labelsShown = placed.length;
    genreLabelsShown = placed.filter((c) => c.kind === 'genre').length;

    labelled.fill(0);
    for (const c of placed) {
      if (c.slot >= 0) labelled[c.slot] = 1;
    }

    for (let i = 0; i < LABEL_POOL; i += 1) {
      const ls = labelSlots[i];
      if (!ls) continue;

      const entry = placed[i];
      if (!entry) {
        if (ls.visible) {
          ls.el.style.transform = 'translate3d(-9999px,-9999px,0)';
          ls.visible = false;
        }
        continue;
      }

      if (ls.key !== entry.key) {
        ls.key = entry.key;
        ls.el.textContent = entry.text;
        ls.el.dataset['major'] = entry.kind === 'family' ? '1' : '0';
        ls.el.dataset['kind'] = entry.kind;
        ls.el.dataset['focus'] = entry.key === `g-${slotsData[focusIndex]?.label ?? ''}` ? '1' : '0';
      }

      if (Math.abs(entry.px - ls.px) >= 0.4) {
        ls.px = entry.px;
        ls.el.style.fontSize = `${entry.px.toFixed(1)}px`;
      }

      if (Math.abs(entry.sx - ls.x) >= 1 || Math.abs(entry.sy - ls.y) >= 1 || !ls.visible) {
        ls.x = entry.sx;
        ls.y = entry.sy;
        ls.el.style.transform = `translate3d(${entry.sx.toFixed(1)}px, ${entry.sy.toFixed(1)}px, 0)`;
        ls.visible = true;
      }

      if (Math.abs(entry.opacity - ls.opacity) >= 0.04) {
        ls.opacity = entry.opacity;
        ls.el.style.opacity = entry.opacity.toFixed(2);
      }
    }

    labelCpuAccum += performance.now() - start;
    labelCpuFrames += 1;
  };

  /* Centres de familles dynamiques. `base` vient de la relaxation qui garantit
     la séparation à l'état compact. Quand une famille s'ouvre, les autres sont
     poussées radialement pour lui laisser la place réellement occupée par son
     déploiement, et rejoignent leur cible avec amortissement. */
  const familyBase = FAMILY_CENTERS.map((c) => new Vector3(c[0], c[1], c[2]));
  const familyTarget = familyBase.map((c) => c.clone());
  const familyCenters = familyBase.map((c) => c.clone());
  const pushDir = new Vector3();

  const updateFamilyCenters = (): void => {
    const open = openIndex;
    const progress = open >= 0 ? clamp(familyProgress[open] ?? 0, 0, 1) : 0;

    for (let i = 0; i < familyBase.length; i += 1) {
      const base = familyBase[i];
      const target = familyTarget[i];
      if (!base || !target) continue;

      if (open < 0 || i === open || progress <= 0.001) {
        target.copy(base);
      } else {
        const origin = familyBase[open];
        if (!origin) continue;
        pushDir.copy(base).sub(origin);
        const dist = pushDir.length() || 0.001;
        pushDir.divideScalar(dist);

        const needed =
          familyRadius(open, true) * progress + familyRadius(i, false) + FAMILY_MARGIN;
        target.copy(origin).addScaledVector(pushDir, Math.max(dist, needed));
      }
    }

    const k = reducedMotion ? 1 : 0.12;
    for (let i = 0; i < familyCenters.length; i += 1) {
      const c = familyCenters[i];
      const t = familyTarget[i];
      if (c && t) c.lerp(t, k);
    }
  };

  // --------------------------------------------------------------- rendu


  /* Mise à jour de la plaque. Trois choses, dans cet ordre : la base face
     caméra, le suivi amorti de la cible, puis la projection des coins pour
     que le DOM se pose exactement dessus. */
  const updatePanel = (now: number): void => {
    if (panelSlot < 0) {
      if (panelOpacity > 0.001) {
        panelOpacity *= 0.82;
        panelUniforms.uOpacity.value = panelOpacity;
      } else {
        panelMesh.visible = false;
        panelOpacity = 0;
      }
      return;
    }

    const slot = slotsData[panelSlot];
    if (!slot) return;

    panelMesh.visible = true;
    panelOpacity = Math.min(0.965, panelOpacity + 0.09);
    panelUniforms.uOpacity.value = panelOpacity;

    // Base orthonormée face caméra. La plaque ne tourne jamais sur elle-même :
    // son axe horizontal est celui de la caméra, toujours.
    panelFwd.copy(cameraPos).sub(slot.world).normalize();
    panelRight.crossVectors(camera.up, panelFwd).normalize();
    panelUp.crossVectors(panelFwd, panelRight).normalize();

    const halfH = panelHeight / 2;
    const halfW = (panelHeight * PANEL_ASPECT) / 2;
    const radius = sphereRadii[panelSlot] ?? 2;

    // Devant la sphère, et relevée : la sphère reste visible en dessous.
    panelTarget
      .copy(slot.world)
      .addScaledVector(panelFwd, radius + halfH * 0.35)
      .addScaledVector(panelUp, halfH * PANEL_RISE * 2);

    // Suivi amorti, sauf en mouvement réduit où tout est direct.
    panelPos.lerp(panelTarget, reducedMotion ? 1 : PANEL_FOLLOW);

    /* Inclinaison fixe autour de l'axe horizontal. Le haut de la plaque part
       vers l'arrière, le bas vient vers l'avant : c'est ce qui la fait lire
       comme un objet posé dans l'espace et non comme un rectangle collé. */
    const tilt = (PANEL_TILT_DEG * Math.PI) / 180;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const upX = panelUp.x * cos - panelFwd.x * sin;
    const upY = panelUp.y * cos - panelFwd.y * sin;
    const upZ = panelUp.z * cos - panelFwd.z * sin;

    const corner = (sx: number, sy: number, out: number): void => {
      panelCorner.set(
        panelPos.x + panelRight.x * halfW * sx + upX * halfH * sy,
        panelPos.y + panelRight.y * halfW * sx + upY * halfH * sy,
        panelPos.z + panelRight.z * halfW * sx + upZ * halfH * sy
      );
      panelPositions[out] = panelCorner.x;
      panelPositions[out + 1] = panelCorner.y;
      panelPositions[out + 2] = panelCorner.z;
    };
    corner(-1, -1, 0);
    corner(1, -1, 3);
    corner(-1, 1, 6);
    corner(1, 1, 9);

    panelPosAttr.needsUpdate = true;

    panelUniforms.uAspect.value.set(PANEL_ASPECT, 1);
    // Douceur de bord constante à l'écran : elle dépend de la profondeur.
    const viewDepth = Math.max(0.1, cameraPos.distanceTo(panelPos));
    void upX; void upY; void upZ;
    panelUniforms.uEdgePx.value = clamp(
      (sphereUniforms.uPixelScale.value * viewDepth) / panelHeight,
      0.0012,
      0.02
    );

    /* Projection. Le DOM ne recalcule rien : il reçoit un centre, une taille
       et l'inclinaison, et applique la même transformation. */
    const halfWpx = width / 2;
    const halfHpx = height / 2;
    scratch.copy(panelPos).project(camera);
    const cx = scratch.x * halfWpx + halfWpx;
    const cy = -scratch.y * halfHpx + halfHpx;
    const behind = scratch.z > 1;

    /* Échelle analytique plutôt que deux projections séparées. Hors de l'axe
       optique, projeter le bord haut puis le bord droit donne des demi-tailles
       qui ne sont pas dans le rapport de la plaque : le DOM ne collait plus au
       rendu. Une plaque face caméra se réduit à une seule échelle. */
    const pxPerWorld = height / (2 * Math.tan((FOV * Math.PI) / 360) * Math.max(0.001, viewDepth));
    const wPx = panelHeight * PANEL_ASPECT * pxPerWorld;
    // L'inclinaison raccourcit la plaque à l'écran, exactement comme le fera la
    // rotation CSS appliquée au DOM.
    const hPx = panelHeight * pxPerWorld;

    const state: PanelState = {
      familyIndex: slot.family,
      genreLocal: slot.local,
      x: cx,
      y: cy,
      width: wPx,
      height: hPx,
      tiltDeg: PANEL_TILT_DEG,
      /* Une seule image mal cadrée suffit à faire clignoter le panneau à
         l'autre bout de l'écran : on exige aussi qu'il soit à peu près là. */
      visible:
        !behind &&
        wPx > 40 &&
        hPx > 40 &&
        cx > -width &&
        cx < width * 2 &&
        cy > -height &&
        cy < height * 2
    };

    // On n'émet que si quelque chose a bougé d'au moins un demi-pixel :
    // sinon React se rerend soixante fois par seconde pour rien.
    const key = `${slot.family}/${slot.local}/${Math.round(cx * 2)}/${Math.round(cy * 2)}/${Math.round(wPx * 2)}/${Math.round(hPx * 2)}/${state.visible}`;
    if (key !== lastPanelEmit) {
      lastPanelEmit = key;
      onPanel(state);
    }
    void now;
  };

  const renderOnce = (bg: boolean): void => {
    renderer.autoClear = true;
    if (bg) {
      renderer.render(bgScene, bgCamera);
      renderer.autoClear = false;
      renderer.clearDepth();
    }
    renderer.render(scene, camera);
    renderer.autoClear = true;
  };

  const yieldToLoop = (): Promise<void> =>
    new Promise((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => {
        ch.port1.close();
        resolve();
      };
      ch.port2.postMessage(0);
    });

  const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;

  const measureGpu = async (opts: { bg: boolean; spheres: boolean; links: boolean }, iterations = 150): Promise<number | null> => {
    if (!timerExt || !('createQuery' in gl)) return null;
    const gl2 = gl as WebGL2RenderingContext;
    const prev = [sphereMesh.visible, linkMesh.visible] as const;
    sphereMesh.visible = opts.spheres;
    linkMesh.visible = opts.links;

    for (let i = 0; i < 6; i += 1) renderOnce(opts.bg);
    const query = gl2.createQuery();
    if (!query) return null;

    gl2.beginQuery(timerExt.TIME_ELAPSED_EXT, query);
    for (let i = 0; i < iterations; i += 1) renderOnce(opts.bg);
    gl2.endQuery(timerExt.TIME_ELAPSED_EXT);
    gl2.flush();

    let nanos: number | null = null;
    const deadline = performance.now() + 6000;
    while (performance.now() < deadline) {
      await yieldToLoop();
      if (gl2.getQueryParameter(query, gl2.QUERY_RESULT_AVAILABLE) === true) {
        if (gl2.getParameter(timerExt.GPU_DISJOINT_EXT) !== true) nanos = gl2.getQueryParameter(query, gl2.QUERY_RESULT) as number;
        break;
      }
    }
    gl2.deleteQuery(query);
    sphereMesh.visible = prev[0];
    linkMesh.visible = prev[1];
    return nanos === null ? null : nanos / 1e6 / iterations;
  };

  const measureLabels = (iterations = 200): number => {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      lastLabelPass = 0;
      projectLabels(performance.now());
    }
    return (performance.now() - t0) / iterations;
  };

  let results: AtlasResults | null = null;
  let profiling = false;

  const runProfile = async (): Promise<void> => {
    if (profiling) return;
    profiling = true;
    results = null;
    const bg = (await measureGpu({ bg: true, spheres: false, links: false })) ?? 0;
    const bs = (await measureGpu({ bg: true, spheres: true, links: false })) ?? 0;
    const all = (await measureGpu({ bg: true, spheres: true, links: true })) ?? 0;
    results = {
      backgroundMs: bg,
      spheresMs: Math.max(0, bs - bg),
      linksMs: Math.max(0, all - bs),
      totalMs: all,
      labelCpuMs: measureLabels(150)
    };
    profiling = false;
  };

  // -------------------------------------------------------------- boucle

  let running = true;
  let frames = 0;
  let fpsWindowStart = performance.now();
  let fps = 60;
  let lastStatsPush = 0;

  const applyCamera = (): void => {
    const cosE = Math.cos(elevation);
    cameraPos.set(
      targetSmooth.x + distance * cosE * Math.sin(azimuth),
      targetSmooth.y + distance * Math.sin(elevation),
      targetSmooth.z + distance * cosE * Math.cos(azimuth)
    );
    camera.position.copy(cameraPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(targetSmooth);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  };

  const expand = new Vector3();
  const recede = new Vector3();

  const frame = (): void => {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();

    if (!reducedMotion) bgUniforms.uTime.value = now / 1000;

    const friction = reducedMotion ? 0 : 0.9;
    azimuth += azVel;
    elevation = clamp(elevation + elVel, -ELEVATION_LIMIT, ELEVATION_LIMIT);
    distance = clamp(distance * Math.exp(dollyVel * 0.02), MIN_DISTANCE, MAX_DISTANCE);
    azVel *= friction;
    elVel *= friction;
    dollyVel *= friction * 0.96;

    /* Vol de caméra : on ne change jamais de niveau sans voir le trajet.
       Le vol doit se TERMINER même si l'image suivante arrive après la fin de
       l'intervalle : sinon, sur une machine lente ou un onglet en arrière-plan,
       la caméra n'atteint jamais sa destination. */
    if (flying) {
      const k = easeInOut(clamp((now - flyStart) / FLY_MS, 0, 1));
      targetSmooth.lerpVectors(flyFrom, flyTo, k);
      distance = flyFromDist + (flyToDist - flyFromDist) * k;
      target.copy(targetSmooth);
      if (k >= 1) flying = false;
    }

    /* Suivi continu quand un panneau est ouvert. La descente sur un genre
       déplace les sphères après le clic : viser une position figée laisserait
       la plaque sortir du cadre. On recale donc la cible à chaque image, en
       douceur, sans toucher à l'azimut ni à la distance choisis par l'usager. */
    if (panelSlot >= 0 && !flying) {
      const slot = slotsData[panelSlot];
      if (slot) {
        target.copy(slot.world);
        targetSmooth.lerp(target, reducedMotion ? 1 : 0.12);
      }
    }

    applyCamera();

    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < familyCenters.length; i += 1) {
      const c = familyCenters[i];
      if (!c) continue;
      const d = cameraPos.distanceTo(c);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    nearestIndex = best;
    nearestDist = bestDist;

    // Les autres familles s'écartent avant qu'on calcule les positions.
    updateFamilyCenters();

    // Positions : interpolation compacte vers déployée, en cascade.
    for (let fi = 0; fi < FAMILIES.length; fi += 1) familyProgress[fi] = 1;

    const focusSlot = focusIndex >= 0 ? slotsData[focusIndex] : undefined;
    const focusBase = focusSlot ? focusSlot.deployed : null;

    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot) continue;

      const p = clamp(genreProgress(slot, now), -0.2, 1.2);
      const center = familyCenters[slot.family];
      slot.world.lerpVectors(slot.compact, slot.deployed, p);
      if (center) slot.world.add(center);

      const fp = familyProgress[slot.family] ?? 1;
      familyProgress[slot.family] = Math.min(fp, clamp(p, 0, 1));

      /* Descente : le sous-arbre du noeud focalisé s'écarte de lui, en cascade
         par génération, tandis que le reste de la famille se replie. C'est la
         même grammaire que la diffusion de famille, un cran plus bas. */
      let presence = 1;
      /* Anneaux uniquement sur le niveau actuellement navigable. Au niveau
         Atlas on ne descend pas encore dans les genres, donc aucun anneau :
         c'est ce qui encombrait le plus la vue d'ensemble. */
      let ringOn =
        slot.family === openIndex && (familyProgress[slot.family] ?? 0) > 0.5
          ? slot.children.length
          : 0;

      if (focusSlot && focusBase && slot.family === focusSlot.family) {
        const fc = familyCenters[slot.family];
        const bx = focusBase.x + (fc?.x ?? 0);
        const by = focusBase.y + (fc?.y ?? 0);
        const bz = focusBase.z + (fc?.z ?? 0);
        const inSubtree = isDescendant(i, focusIndex);
        const generation = Math.max(0, slot.depth - focusSlot.depth);
        const delay = focusDir === 1 ? FOCUS_DELAY_MS * generation : 0;
        const raw = clamp((now - focusStart - delay) / FOCUS_MS, 0, 1);
        const k = focusDir === 1 ? backOut(raw) : 1 - raw;

        if (inSubtree) {
          // On écarte le sous-arbre depuis le noeud focalisé.
          expand.set(
            bx + (slot.deployed.x - focusBase.x) * 1.95,
            by + (slot.deployed.y - focusBase.y) * 1.95,
            bz + (slot.deployed.z - focusBase.z) * 1.95
          );
          slot.world.lerp(expand, clamp(k, 0, 1));
        } else {
          // Le reste recule et s'atténue à 12 pour cent, il reste du contexte.
          recede.set(
            (fc?.x ?? 0) + slot.compact.x + (slot.deployed.x - slot.compact.x) * 0.45,
            (fc?.y ?? 0) + slot.compact.y + (slot.deployed.y - slot.compact.y) * 0.45,
            (fc?.z ?? 0) + slot.compact.z + (slot.deployed.z - slot.compact.z) * 0.45
          );
          slot.world.lerp(recede, clamp(k, 0, 1));
          presence = 1 - clamp(k, 0, 1) * 0.88;
          ringOn = 0;
        }
      } else if (level === 'family' && activeFamily >= 0) {
        presence = slot.family === activeFamily ? 1 : 0.5;
      }

      sphereCenters[i * 3] = slot.world.x;
      sphereCenters[i * 3 + 1] = slot.world.y;
      sphereCenters[i * 3 + 2] = slot.world.z;
      sphereState[i * 4] = suspended ? presence * 0.35 : presence;
      sphereState[i * 4 + 1] = i === focusIndex ? 0.22 : 0;
      sphereState[i * 4 + 2] = ringOn;
      sphereState[i * 4 + 3] = labelled[i] ?? 0;
    }
    sphereCenterAttr.needsUpdate = true;
    sphereStateAttr.needsUpdate = true;

    // Liens : extrémités suivies, tracé du parent vers l'enfant.
    for (let i = 0; i < LINK_COUNT; i += 1) {
      const ref = linkRefs[i];
      if (!ref) continue;
      if (ref.internal) {
        const a = slotsData[ref.a];
        const b = slotsData[ref.b];
        if (!a || !b) continue;
        linkP0.set([a.world.x, a.world.y, a.world.z], i * 3);
        linkP1.set([b.world.x, b.world.y, b.world.z], i * 3);
        linkMeta[i * 3 + 2] = clamp(genreProgress(b, now), 0, 1);

        /* Les liens du sous-arbre focalisé passent au premier plan et
           s'épaississent, les autres liens de la famille s'effacent presque. */
        if (focusIndex >= 0 && a.family === (slotsData[focusIndex]?.family ?? -1)) {
          const inSubtree = isDescendant(ref.b, focusIndex) && isDescendant(ref.a, focusIndex);
          linkMeta[i * 3] = inSubtree ? 1 : 0.12;
          linkMeta[i * 3 + 1] = inSubtree ? 1 : 0.1;
        } else {
          linkMeta[i * 3] = 0.35;
          linkMeta[i * 3 + 1] = 1;
        }
      } else {
        const ca = familyCenters[ref.familyA];
        const cb = familyCenters[ref.familyB];
        if (!ca || !cb) continue;
        linkP0.set([ca.x, ca.y, ca.z], i * 3);
        linkP1.set([cb.x, cb.y, cb.z], i * 3);
        linkMeta[i * 3 + 2] = 1;

        /* Les liens entre familles traversaient tout l'écran en diagonale et
           brouillaient la lecture. Ils sont désormais quasi invisibles par
           défaut, et ne s'allument que si l'une de leurs deux extrémités est
           la famille sélectionnée ou celle du noeud survolé. */
        const hoveredFamily = hovered >= 0 ? (slotsData[hovered]?.family ?? -1) : -1;
        const concerned =
          ref.familyA === activeFamily ||
          ref.familyB === activeFamily ||
          ref.familyA === hoveredFamily ||
          ref.familyB === hoveredFamily;
        linkMeta[i * 3 + 1] = concerned ? 0.9 : 0.1;
      }
    }
    linkP0Attr.needsUpdate = true;
    linkP1Attr.needsUpdate = true;
    linkMetaAttr.needsUpdate = true;

    if (profiling) return;

    // Projection des sphères, réutilisée par le clic et par les labels.
    {
      const halfW = width / 2;
      const halfH = height / 2;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        const slot = slotsData[i];
        if (!slot) continue;
        scratch.copy(slot.world).project(camera);
        projected[i * 3] = scratch.x * halfW + halfW;
        projected[i * 3 + 1] = -scratch.y * halfH + halfH;
        projected[i * 3 + 2] = scratch.z;
      }
    }

    updatePanel(now);
    projectLabels(now);
    renderer.info.reset();
    renderOnce(true);

    frames += 1;
    if (now - fpsWindowStart >= 500) {
      fps = (frames * 1000) / (now - fpsWindowStart);
      frames = 0;
      fpsWindowStart = now;
    }

    if (now - lastStatsPush > 250) {
      lastStatsPush = now;
      onStats({
        fps,
        drawCalls: renderer.info.render.calls,
        spheres: TOTAL_GENRES,
        links: LINK_COUNT,
        openLabel: openIndex >= 0 ? (FAMILIES[openIndex]?.label ?? '—') : '—',
        deployPct: openIndex >= 0 ? (familyProgress[openIndex] ?? 0) * 100 : 0,
        distance,
        nearestLabel: FAMILIES[nearestIndex]?.label ?? '—',
        nearestDistance: nearestDist,
        labelsShown,
        genreLabelsShown,
        reduced,
        results
      });
    }
  };

  applyCamera();
  requestAnimationFrame(frame);
  void runProfile();

  (window as unknown as { __atlas?: unknown }).__atlas = {
    measureGpu,
    measureLabels,
    runProfile,
    recenter,
    openPanel,
    closePanel,
    open: (familyIndex: number) => setDeploy(familyIndex, true, performance.now()),
    close: (familyIndex: number) => setDeploy(familyIndex, false, performance.now()),
    setOrbit: (az: number, el: number, dist: number) => {
      azimuth = (az * Math.PI) / 180;
      elevation = clamp((el * Math.PI) / 180, -ELEVATION_LIMIT, ELEVATION_LIMIT);
      distance = clamp(dist, MIN_DISTANCE, MAX_DISTANCE);
      azVel = 0;
      elVel = 0;
      dollyVel = 0;
      applyCamera();
    },
    info: () => ({
      spheres: TOTAL_GENRES,
      links: LINK_COUNT,
      reduced,
      pixelRatio: renderer.getPixelRatio(),
      size: [width, height],
      triangles: renderer.info.render.triangles
    }),
    drawCallsPerFrame: () => {
      renderer.info.reset();
      renderOnce(true);
      return renderer.info.render.calls;
    }
  };

  emitNav();

  return {
    zoom: (direction: 1 | -1) => {
      onFirstInteraction();
      dollyVel += direction === 1 ? -5.5 : 5.5;
    },
    rotate: (direction: 1 | -1) => {
      onFirstInteraction();
      azVel += direction * 0.05;
    },
    goUp,
    goToFamily: (familyIndex: number) => {
      if (familyIndex < 0) {
        const now = performance.now();
        if (activeFamily >= 0) setDeploy(activeFamily, false, now);
        activeFamily = -1;
        activeGenre = -1;
        level = 'atlas';
        startFly(atlasTarget, atlasDistance, now);
        emitNav();
      } else {
        selectFamily(familyIndex, performance.now());
      }
    },
    openPanel,
    closePanel,
    setSuspended: (value: boolean) => {
      suspended = value;
    },
    dispose: () => {
      running = false;
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKey);
      for (const ls of labelSlots) ls.el.remove();
      sphereGeometry.dispose();
      linkGeometry.dispose();
      sphereMaterial.dispose();
      linkMaterial.dispose();
      renderer.dispose();
    },
    runProfile,
    recenter
  };
};
