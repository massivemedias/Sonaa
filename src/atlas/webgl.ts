/* Couche WebGL. DISPOSITION FIXE (ADR-042).

   L'orbite libre est abandonnée. La 3D reste pour la profondeur et la
   matière : sphères imposteurs, halo, grain du fond. La caméra ne tourne
   plus : pan dans le plan de la carte et zoom, rien d'autre. Les positions
   viennent de layout.ts, déterministes au pixel près.

   La profondeur en Z ne sert qu'à la hiérarchie visuelle : le niveau courant
   vient légèrement en avant, le reste recule et s'estompe. Le champ de la
   caméra est étroit (14 degrés) : la perspective ne fausse jamais la lecture
   des tailles.

   Import dynamique après le premier rendu. Imports nommés (ADR-019). */

import {
  BufferAttribute,
  Float32BufferAttribute,
  InstancedBufferAttribute,
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
  pathToGenre
} from './structures.ts';

import { buildLayout, LABEL_WORLD, type AtlasLayout } from './layout.ts';

import {
  backgroundFrag,
  backgroundVert,
  linkFrag,
  linkVert,
  sphereFrag,
  sphereVert
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
  /* Fiche du genre atteint. Cliquer une sphère ouvre d'abord la fiche : on veut
     savoir de quoi on parle, d'où ça vient et ce que ça a donné, AVANT de
     décider d'écouter. Les tracks se demandent depuis la fiche. */
  onGenreInfo: (familyIndex: number, genreLocal: number) => void;
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
}

/* Champ étroit : la projection est quasi orthographique. Les décalages en Z
   de la hiérarchie (±3 unités sur des distances de plusieurs centaines) font
   moins d'un pour cent de variation de taille : la lecture des tailles reste
   celle de la mise en page. */
const FOV = 14;
const LABEL_POOL = 96;
const MIN_DISTANCE = 40;
const MAX_DISTANCE = 9000;

/* Taille des labels : plancher et plafond stricts. Plancher 11 px (mission),
   jamais de troncature ni d'abréviation : un nom qui ne tient pas à 11 px
   attend le zoom suivant, il ne s'ampute pas. */
const LABEL_PX_FLOOR = 11;
const LABEL_PX_CEILING = 22;

/* Décalage de hiérarchie en Z : le sous-arbre courant vient devant. */
const Z_FRONT = 3;
const Z_BACK = -3;

const CHROME_TOP = 64;
const CHROME_BOTTOM = 74;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const backOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

// ------------------------------------------------------------------ init

export const initAtlas = (handles: AtlasHandles): AtlasApi => {
  const { canvas, labelLayer, onStats, onNavigate, onTracks, onGenreInfo, onPanel, onContextLost } =
    handles;
  let engineReady = false;
  /** Vrai tant que la caméra est au cadrage par défaut de l'atlas. */
  let cameraAtDefault = true;
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
    uGrain: { value: reduced ? 0.5 : 1 }
  };
  const bgMesh = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({ vertexShader: backgroundVert, fragmentShader: backgroundFrag, uniforms: bgUniforms, depthTest: false, depthWrite: false })
  );
  bgScene.add(bgMesh);

  // --------------------------------------------------------------- scène

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.5, 30000);
  const cameraPos = new Vector3();
  const fogColor = new Vector3(0.042, 0.047, 0.058);

  // ------------------------------------------------------- mise en page

  let layout: AtlasLayout = buildLayout(false);

  // ------------------------------------------------------------ sphères

  const sphereCenters = new Float32Array(TOTAL_GENRES * 3);
  const sphereRadii = new Float32Array(TOTAL_GENRES);
  const sphereColors = new Float32Array(TOTAL_GENRES * 3);
  const sphereState = new Float32Array(TOTAL_GENRES * 4);
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
          world: new Vector3()
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
  const sphereRadiusAttr = new InstancedBufferAttribute(sphereRadii, 1);
  sphereRadiusAttr.setUsage(35048);
  sphereGeometry.setAttribute('aRadius', sphereRadiusAttr);
  sphereGeometry.setAttribute('aColor', new InstancedBufferAttribute(sphereColors, 3));
  sphereGeometry.setAttribute('aState', sphereStateAttr);
  /* Genre ÉTEINT : labelsActuels existe et est vide, c'est une information
     éditoriale du corpus, pas une déduction. Attribut statique. */
  {
    const extinct = new Float32Array(TOTAL_GENRES);
    let cursor = 0;
    STRUCTURES.forEach((structure) => {
      structure.genres.forEach((genre, li) => {
        extinct[cursor + li] =
          genre.labelsActuels !== null && genre.labelsActuels.length === 0 ? 1 : 0;
      });
      cursor += structure.genres.length;
    });
    sphereGeometry.setAttribute('aExtinct', new InstancedBufferAttribute(extinct, 1));
  }

  /* Brouillard neutralisé : la profondeur ne raconte plus la distance à une
     scène orbitale, elle sépare deux plans à quelques unités d'écart. */
  const sphereUniforms = {
    uCameraPos: { value: cameraPos },
    uLightDir: { value: new Vector3(0.42, 0.72, 0.55).normalize() },
    uPixelScale: { value: 0.001 },
    uFog: { value: new Vector2(8000, 24000) },
    uFogColor: { value: fogColor }
  };

  const sphereMaterial = new ShaderMaterial({
    vertexShader: sphereVert,
    fragmentShader: sphereFrag,
    uniforms: sphereUniforms,
    transparent: true,
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
  const linkCtrl0 = new Float32Array(LINK_COUNT * 3);
  const linkCtrl1 = new Float32Array(LINK_COUNT * 3);
  const linkColor0 = new Float32Array(LINK_COUNT * 3);
  const linkColor1 = new Float32Array(LINK_COUNT * 3);
  const linkMeta = new Float32Array(LINK_COUNT * 3);

  interface LinkRef {
    a: number; // index global de sphère ; les liens de famille visent les fondateurs
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
        const ci = oklchToSrgb(0.7, 0.07, family.hue);
        linkColor0.set(ci, cursor * 3);
        linkColor1.set(ci, cursor * 3);
        linkMeta[cursor * 3] = 0.35;
        linkMeta[cursor * 3 + 1] = 1;
        linkMeta[cursor * 3 + 2] = 1;
        linkRefs.push({ a: base + link.from, b: base + link.to, familyA: fi, familyB: fi, internal: true });
        cursor += 1;
      }
    });

    for (const link of FAMILY_LINKS) {
      const fa = FAMILIES[link.from];
      const fb = FAMILIES[link.to];
      if (!fa || !fb) continue;
      linkColor0.set(oklchToSrgb(0.66, 0.06, fa.hue), cursor * 3);
      linkColor1.set(oklchToSrgb(0.66, 0.06, fb.hue), cursor * 3);
      linkMeta[cursor * 3] = link.weight;
      linkMeta[cursor * 3 + 1] = 1;
      linkMeta[cursor * 3 + 2] = 1;
      linkRefs.push({
        a: (familyOffset[link.from] ?? 0),
        b: (familyOffset[link.to] ?? 0),
        familyA: link.from,
        familyB: link.to,
        internal: false
      });
      cursor += 1;
    }
  }

  const SEGMENTS = 16;
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
  const linkCtrl0Attr = new InstancedBufferAttribute(linkCtrl0, 3);
  const linkCtrl1Attr = new InstancedBufferAttribute(linkCtrl1, 3);
  const linkMetaAttr = new InstancedBufferAttribute(linkMeta, 3);
  for (const a of [linkP0Attr, linkP1Attr, linkCtrl0Attr, linkCtrl1Attr, linkMetaAttr]) a.setUsage(35048);
  linkGeometry.setAttribute('aP0', linkP0Attr);
  linkGeometry.setAttribute('aP1', linkP1Attr);
  linkGeometry.setAttribute('aCtrl0', linkCtrl0Attr);
  linkGeometry.setAttribute('aCtrl1', linkCtrl1Attr);
  linkGeometry.setAttribute('aColor0', new InstancedBufferAttribute(linkColor0, 3));
  linkGeometry.setAttribute('aColor1', new InstancedBufferAttribute(linkColor1, 3));
  linkGeometry.setAttribute('aMeta', linkMetaAttr);

  const linkUniforms = {
    uCameraPos: { value: cameraPos },
    uPixelScale: { value: 0.001 },
    uMinPixels: { value: 1.1 },
    uWidthWorld: { value: 0.075 },
    uFog: { value: sphereUniforms.uFog.value },
    uFogColor: { value: fogColor },
    uFlowTime: { value: 0 }
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

  // -------------------------------------------- application de la mise en page

  /* Repose toutes les positions et les courbes des liens. Appelé au
     démarrage et au changement d'orientation, jamais pendant une frame. */
  const atlasTarget = new Vector3();

  const applyLayout = (portrait: boolean): void => {
    layout = buildLayout(portrait);
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot) continue;
      slot.world.set(
        layout.positions[i * 3] ?? 0,
        layout.positions[i * 3 + 1] ?? 0,
        layout.positions[i * 3 + 2] ?? 0
      );
    }
    atlasTarget.set(
      (layout.bbox.minX + layout.bbox.maxX) / 2,
      (layout.bbox.minY + layout.bbox.maxY) / 2,
      0
    );

    /* Courbes des liens. L'axe des générations est +x en paysage, -y en
       portrait : chaque lien part du bord aval du parent et arrive au bord
       amont de l'enfant, en S. Les liens entre familles relient les
       fondateurs par une arche dans la marge amont, pour ne pas traverser
       les blocs. */
    const ux = portrait ? 0 : 1;
    const uy = portrait ? -1 : 0;
    for (let i = 0; i < LINK_COUNT; i += 1) {
      const ref = linkRefs[i];
      if (!ref) continue;
      const a = slotsData[ref.a];
      const b = slotsData[ref.b];
      if (!a || !b) continue;
      const ra = sphereRadii[ref.a] ?? 1;
      const rb = sphereRadii[ref.b] ?? 1;

      if (ref.internal) {
        const p0x = a.world.x + ux * (ra + 0.4);
        const p0y = a.world.y + uy * (ra + 0.4);
        const p1x = b.world.x - ux * (rb + 0.7);
        const p1y = b.world.y - uy * (rb + 0.7);
        const gap = Math.abs((p1x - p0x) * ux + (p1y - p0y) * uy);
        const k = gap * 0.48;
        linkP0.set([p0x, p0y, 0], i * 3);
        linkP1.set([p1x, p1y, 0], i * 3);
        linkCtrl0.set([p0x + ux * k, p0y + uy * k, 0], i * 3);
        linkCtrl1.set([p1x - ux * k, p1y - uy * k, 0], i * 3);
      } else {
        const p0x = a.world.x - ux * (ra + 1.2);
        const p0y = a.world.y - uy * (ra + 1.2);
        const p1x = b.world.x - ux * (rb + 1.2);
        const p1y = b.world.y - uy * (rb + 1.2);
        const dist = Math.hypot(p1x - p0x, p1y - p0y);
        const bow = 14 + dist * 0.14;
        linkP0.set([p0x, p0y, 0], i * 3);
        linkP1.set([p1x, p1y, 0], i * 3);
        linkCtrl0.set([p0x - ux * bow, p0y - uy * bow, 0], i * 3);
        linkCtrl1.set([p1x - ux * bow, p1y - uy * bow, 0], i * 3);
      }
    }
    linkP0Attr.needsUpdate = true;
    linkP1Attr.needsUpdate = true;
    linkCtrl0Attr.needsUpdate = true;
    linkCtrl1Attr.needsUpdate = true;
  };

  applyLayout(false);

  // ------------------------------------------------------------- caméra

  /* La caméra regarde la carte de face, toujours. Distance = zoom. */
  const target = atlasTarget.clone();
  const targetSmooth = target.clone();
  let distance = 600;
  let dollyVel = 0;
  const tanHalf = Math.tan((FOV * Math.PI) / 360);

  const applyCamera = (): void => {
    cameraPos.set(targetSmooth.x, targetSmooth.y, targetSmooth.z + distance);
    camera.position.copy(cameraPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(targetSmooth);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  };

  /** Monde par pixel à la profondeur du plan de la carte. */
  const worldPerPixel = (): number => (2 * tanHalf * distance) / Math.max(1, height);

  /* Cadrage d'une boîte : la distance qui la fait tenir entière, marges
     comprises. Les labels sont DANS la boîte : layout.ts les réserve. */
  const fitDistance = (bb: { minX: number; maxX: number; minY: number; maxY: number }): number => {
    const halfW = Math.max(1, (bb.maxX - bb.minX) / 2);
    const halfH = Math.max(1, (bb.maxY - bb.minY) / 2);
    const fill = 0.92;
    const byH = halfH / (tanHalf * fill);
    const byW = halfW / (tanHalf * fill * Math.max(0.2, camera.aspect));
    return clamp(Math.max(byH, byW), MIN_DISTANCE, MAX_DISTANCE);
  };

  let atlasDistance = 600;

  /* CADRAGE PAR DÉFAUT : une PAGE, pas une vignette. La carte est un
     document long dans l'axe des familles ; le faire tenir en entier donnait
     un filet de poussière illisible. On cadre donc l'AXE DES GÉNÉRATIONS en
     entier (la profondeur de l'arbre, courte), et la vue s'ouvre au DÉBUT de
     la lecture : en haut sur poste, à gauche sur mobile. Le reste se
     parcourt au pan, comme une page se parcourt au défilement. Si la carte
     tient entière à ce zoom, elle est simplement centrée. */
  const computeDefaultFraming = (): void => {
    const bb = layout.bbox;
    const halfCross = layout.portrait
      ? Math.max(1, (bb.maxY - bb.minY) / 2)
      : Math.max(1, (bb.maxX - bb.minX) / 2);
    const fill = 0.9;
    atlasDistance = layout.portrait
      ? clamp(halfCross / (tanHalf * fill), MIN_DISTANCE, MAX_DISTANCE)
      : clamp(halfCross / (tanHalf * fill * Math.max(0.2, camera.aspect)), MIN_DISTANCE, MAX_DISTANCE);

    const halfViewW = tanHalf * camera.aspect * atlasDistance;
    const halfViewH = tanHalf * atlasDistance;
    /* On s'ouvre sur la PREMIÈRE tête de section, pas sur le bord brut : le
       bord d'un bloc, ce sont des feuilles sans contexte, tandis que la tête
       de section montre l'ensemble, la famille et son fondateur. */
    const first = layout.ensembleAnchor[0];
    if (layout.portrait) {
      const x = bb.maxX - bb.minX <= halfViewW * 2
        ? (bb.minX + bb.maxX) / 2
        : clamp(first?.x ?? bb.minX, bb.minX + halfViewW, bb.maxX - halfViewW);
      atlasTarget.set(x, (bb.minY + bb.maxY) / 2, 0);
    } else {
      /* Le bandeau du fil d'Ariane occupe le haut de l'écran : la borne
         haute laisse la marge correspondante au-dessus de la carte, sinon la
         première tête de section tombait dessous et disparaissait. */
      const chromeWorld = ((CHROME_TOP + 14) / Math.max(1, height)) * (2 * halfViewH);
      const y = bb.maxY - bb.minY <= halfViewH * 2
        ? (bb.minY + bb.maxY) / 2
        : clamp(
            (first?.y ?? bb.maxY) - halfViewH * 0.65,
            bb.minY + halfViewH,
            bb.maxY + chromeWorld - halfViewH
          );
      atlasTarget.set((bb.minX + bb.maxX) / 2, y, 0);
    }
  };

  // ------------------------------------------------------------ vol

  const FLY_MS = 900;
  const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  let flying = false;
  let flyStart = 0;
  const flyFrom = new Vector3();
  const flyTo = new Vector3();
  let flyFromDist = 1;
  let flyToDist = 1;

  const startFly = (to: Vector3, dist: number, now: number): void => {
    cameraAtDefault = false;
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
    dollyVel = 0;
  };

  // ------------------------------------------------------------- navigation

  let level: NavState['level'] = 'atlas';
  let activeFamily = -1;
  let activeGenre = -1;
  let focusIndex = -1;
  let genrePath: number[] = [];
  let panelSlot = -1;

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

  const isDescendant = (globalIndex: number, ancestor: number): boolean => {
    if (globalIndex === ancestor) return true;
    const slot = slotsData[globalIndex];
    const anc = slotsData[ancestor];
    if (!slot || !anc || slot.family !== anc.family) return false;
    const base = familyOffset[slot.family] ?? 0;
    let cursor = slot;
    while (cursor && cursor.parent >= 0) {
      const next = slotsData[base + cursor.parent];
      if (!next) return false;
      if (base + cursor.parent === ancestor) return true;
      cursor = next;
    }
    return false;
  };

  /* Boîte d'un sous-arbre, labels compris (approchés par le créneau : rayon
     plus hauteur de nom sous la sphère). */
  const subtreeBBox = (globalIndex: number): { minX: number; maxX: number; minY: number; maxY: number } => {
    const root = slotsData[globalIndex];
    const bb = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    if (!root) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot || slot.family !== root.family) continue;
      if (!isDescendant(i, globalIndex)) continue;
      const r = sphereRadii[i] ?? 1;
      const labelW = slot.label.length * LABEL_WORLD.genre * 0.58;
      bb.minX = Math.min(bb.minX, slot.world.x - Math.max(r, labelW / 2) - 2);
      bb.maxX = Math.max(bb.maxX, slot.world.x + Math.max(r, labelW / 2) + 2);
      bb.minY = Math.min(bb.minY, slot.world.y - r - LABEL_WORLD.genre - 2);
      bb.maxY = Math.max(bb.maxY, slot.world.y + r + 2);
    }
    return bb;
  };

  const flyToBBox = (bb: { minX: number; maxX: number; minY: number; maxY: number }, now: number): void => {
    startFly(
      new Vector3((bb.minX + bb.maxX) / 2, (bb.minY + bb.maxY) / 2, 0),
      fitDistance(bb),
      now
    );
  };

  const selectFamily = (fi: number, now: number): void => {
    activeFamily = fi;
    activeGenre = -1;
    genrePath = [];
    focusIndex = -1;
    level = 'family';
    const bb = layout.familyBBox[fi];
    if (bb) flyToBBox(bb, now);
    emitNav();
  };

  const openPanel = (familyIndex: number, genreLocal: number): void => {
    const base = familyOffset[familyIndex] ?? 0;
    const globalIndex = base + genreLocal;
    const slot = slotsData[globalIndex];
    if (!slot) return;
    panelSlot = globalIndex;
    onTracks(familyIndex, genreLocal);
    onPanel({ familyIndex, genreLocal });
  };

  const closePanel = (): void => {
    if (panelSlot < 0) return;
    panelSlot = -1;
    onPanel(null);
  };

  const selectGenre = (globalIndex: number, now: number): void => {
    const slot = slotsData[globalIndex];
    if (!slot) return;

    /* Un genre à dérivés ouvre sa FICHE, une feuille lance le lecteur
       directement : la fiche reste accessible par le nom du genre sur le
       panneau. */
    if (slot.children.length === 0) {
      const path = pathToGenre(slot.family, slot.local).map(
        (local) => (familyOffset[slot.family] ?? 0) + local
      );
      genrePath = path;
      activeGenre = globalIndex;
      focusIndex = globalIndex;
      level = 'genre';
      emitNav();
      openPanel(slot.family, slot.local);
      return;
    }
    /* La colonne du lecteur reste ouverte pendant la navigation : la
       lecture ne s'interrompt jamais à cause d'un clic. */

    const base = familyOffset[slot.family] ?? 0;
    genrePath = pathToGenre(slot.family, slot.local).map((local) => base + local);
    activeGenre = globalIndex;
    level = 'genre';
    focusIndex = globalIndex;

    flyToBBox(subtreeBBox(globalIndex), now);
    emitNav();
    onGenreInfo(slot.family, slot.local);
  };

  const goToGenre = (familyIndex: number, genreLocal: number): void => {
    const now = performance.now();
    const base = familyOffset[familyIndex] ?? 0;
    activeFamily = familyIndex;
    selectGenre(base + genreLocal, now);
  };

  const goUp = (): void => {
    const now = performance.now();
    if (level === 'genre') {
      genrePath = genrePath.slice(0, -1);
      const parent = genrePath[genrePath.length - 1];
      if (parent !== undefined) {
        activeGenre = parent;
        focusIndex = parent;
        flyToBBox(subtreeBBox(parent), now);
        emitNav();
        return;
      }
      activeGenre = -1;
      focusIndex = -1;
      level = 'family';
      const bb = activeFamily >= 0 ? layout.familyBBox[activeFamily] : undefined;
      if (bb) flyToBBox(bb, now);
    } else if (level === 'family') {
      activeFamily = -1;
      activeGenre = -1;
      genrePath = [];
      focusIndex = -1;
      level = 'atlas';
      startFly(atlasTarget, atlasDistance, now);
      cameraAtDefault = true;
    }
    emitNav();
  };

  const recenter = (): void => {
    cameraAtDefault = true;
    closePanel();
    target.copy(atlasTarget);
    targetSmooth.copy(atlasTarget);
    distance = atlasDistance;
    dollyVel = 0;
    activeFamily = -1;
    activeGenre = -1;
    genrePath = [];
    focusIndex = -1;
    level = 'atlas';
    emitNav();
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

    if (engineReady) {
      const portrait = camera.aspect < 0.9;
      if (portrait !== layout.portrait) {
        applyLayout(portrait);
      }
      computeDefaultFraming();
      if (cameraAtDefault) {
        distance = atlasDistance;
        targetSmooth.copy(atlasTarget);
        target.copy(atlasTarget);
      }
    }

    bgUniforms.uResolution.value.set(width, height);
    const pixelScale = (2 * tanHalf) / height;
    sphereUniforms.uPixelScale.value = pixelScale;
    linkUniforms.uPixelScale.value = pixelScale;
  };

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener('resize', resize);

  // -------------------------------------------------------- interactions

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let suspended = false;
  let interacted = false;

  /* Molette : zoom vers le curseur. Le point du monde sous le curseur reste
     sous le curseur, c'est la loupe qu'on attend d'une carte. */
  const onWheel = (event: WheelEvent): void => {
    cameraAtDefault = false;
    event.preventDefault();
    if (suspended) return;
    onFirstInteraction();

    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / Math.max(1, width)) * 2 - 1;
    const ndcY = -(((event.clientY - rect.top) / Math.max(1, height)) * 2 - 1);
    const worldX = target.x + ndcX * tanHalf * camera.aspect * distance;
    const worldY = target.y + ndcY * tanHalf * distance;

    const factor = Math.exp(event.deltaY * 0.0022);
    const next = clamp(distance * factor, MIN_DISTANCE, MAX_DISTANCE);
    const k = next / distance;
    target.x = worldX - (worldX - target.x) * k;
    target.y = worldY - (worldY - target.y) * k;
    targetSmooth.copy(target);
    distance = next;
    flying = false;
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

  /* Survol : il MET EN VALEUR (halo de la sphère), il ne révèle rien. Les
     labels ne lisent jamais cet état. */
  let hovered = -1;
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
    hovered = best;
  };

  const onPointerMove = (event: PointerEvent): void => {
    onHover(event);
    if (!dragging || suspended) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 4) cameraAtDefault = false;
    const wpp = worldPerPixel();
    target.x -= dx * wpp;
    target.y += dy * wpp;
    targetSmooth.copy(target);
    flying = false;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const projected = new Float32Array(TOTAL_GENRES * 3); // sx, sy, profondeur
  const scratch = new Vector3();

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

  /* Clavier : flèches pour se déplacer dans le plan, plus et moins pour
     zoomer, 0 pour recentrer, Échap pour remonter. */
  const pan = (dx: number, dy: number): void => {
    cameraAtDefault = false;
    const wpp = worldPerPixel();
    target.x += dx * 60 * wpp;
    target.y -= dy * 60 * wpp;
    targetSmooth.copy(target);
    flying = false;
  };

  const onKey = (event: KeyboardEvent): void => {
    if (introActive) { finishIntro(); return; }
    if (event.target instanceof HTMLInputElement) return;
    switch (event.key) {
      case 'ArrowLeft': pan(-1, 0); break;
      case 'ArrowRight': pan(1, 0); break;
      case 'ArrowUp': pan(0, -1); break;
      case 'ArrowDown': pan(0, 1); break;
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

  // --------------------------------------------------------------- intro

  /* L'INTRO : la naissance des familles, adaptée à la disposition fixe. Les
     familles apparaissent dans l'ordre chronologique du corpus, chacune
     éclot en place en s'écartant du centre de la carte, et les liens entre
     familles se tracent depuis la famille d'origine. La caméra ne bouge
     pas : elle est au cadrage par défaut du début à la fin. */
  const INTRO_ORDER = [
    'roots', 'disco', 'industrial', 'ambient', 'electro', 'house', 'techno',
    'breaks', 'trance', 'hardcore', 'minimal', 'downtempo', 'psy', 'bass'
  ].map((id) => FAMILIES.findIndex((f) => f.id === id));
  const INTRO_STEP_MS = 350;
  const INTRO_POP_MS = 700;

  let introActive = false;
  let introStart = 0;
  let introDone: (() => void) | null = null;
  const baseRadii = Float32Array.from(sphereRadii);

  /* ANIMATIONS SOBRES (mission). Respiration très lente des sphères, 2 pour
     cent d'amplitude, phase décalée par noeud pour éviter la pulsation
     collective. Survol : la sphère grossit de 8 pour cent en 150 ms environ
     (lissage exponentiel). Tout est coupé par prefers-reduced-motion. */
  const breathPhase = Float32Array.from({ length: TOTAL_GENRES }, (_, i) => (i * 2.399963) % 6.2832);
  const hoverAmount = new Float32Array(TOTAL_GENRES);

  const introBirth = (fi: number, now: number): number => {
    const rank = INTRO_ORDER.indexOf(fi);
    if (rank < 0) return 1;
    return clamp((now - introStart - rank * INTRO_STEP_MS) / INTRO_POP_MS, 0, 1);
  };

  const popScale = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : backOut(t) * (1 + 0.3 * Math.sin(t * Math.PI)));

  const finishIntro = (): void => {
    if (!introActive) return;
    introActive = false;
    sphereRadii.set(baseRadii);
    sphereRadiusAttr.needsUpdate = true;
    try { localStorage.setItem('sonaa-intro-seen', '1'); } catch { /* stockage privé */ }
    introDone?.();
    introDone = null;
  };

  const playIntro = (onEnd?: () => void): void => {
    if (reducedMotion) { onEnd?.(); return; }
    introDone = onEnd ?? null;
    introStart = performance.now();
    introActive = true;
  };

  const onFirstInteraction = (): void => {
    if (introActive) finishIntro();
    if (interacted) return;
    interacted = true;
    document.documentElement.dataset['atlasTouched'] = '1';
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

  let labelCpuAccum = 0;
  let labelCpuFrames = 0;
  let lastLabelPass = 0;
  let labelsShown = 0;
  let genreLabelsShown = 0;

  interface Candidate {
    key: string;
    text: string;
    sx: number;
    sy: number;
    kind: 'ensemble' | 'family' | 'genre';
    slot: number;
    opacity: number;
    px: number;
    w: number;
    h: number;
  }

  const candidates: Candidate[] = [];
  const placed: Candidate[] = [];

  /* Largeur RÉELLE du texte, mesurée avec la fonte chargée : l'estimation
     au glyphe moyen sous-estimait largement les capitales espacées des
     familles, et des noms se chevauchaient malgré le filet. Mesure canvas
     2D, déterministe à fonte égale ; l'interlettrage s'ajoute à la main. */
  const measureCtx = document.createElement('canvas').getContext('2d');
  const textWidth = (text: string, px: number, kind: string): number => {
    const upper = kind !== 'genre';
    if (!measureCtx) return text.length * px * (upper ? 0.85 : 0.58) + px * 0.4;
    measureCtx.font = `${upper ? 700 : 600} ${px}px Inter, sans-serif`;
    let w = measureCtx.measureText(upper ? text.toUpperCase() : text).width;
    w += text.length * px * (upper ? 0.14 : 0.01);
    return w + 6;
  };

  /* 1 px et non 4 : avec les noms toujours visibles, la tolérance de 4 px
   laissait des paires se mordre visiblement. Se toucher, oui ; se
   recouvrir, jamais. */
const OVERLAP_TOLERANCE = 1;
  const overlaps = (a: Candidate, b: Candidate): boolean => {
    const t = OVERLAP_TOLERANCE;
    return (
      a.sx + t < b.sx + b.w &&
      a.sx + a.w - t > b.sx &&
      a.sy + t < b.sy + b.h &&
      a.sy + a.h - t > b.sy
    );
  };

  /* RÈGLES (ADR-042, chantier labels) :
     1. Aucun nom n'est jamais révélé ni caché par le survol : cette passe ne
        lit PAS l'état de survol, et un contrôle CI le garantit.
     2. La mise en page a réservé un créneau par nom : à un zoom donné, une
        génération s'affiche ENTIÈRE quand son pas minimal projeté dépasse la
        hauteur du label, sinon elle attend le zoom suivant. Tout ce qui est
        visible est nommé, il n'y a pas de tri au mérite.
     3. Plancher 11 px, plafond 22 px, jamais de troncature.
     Le test de chevauchement reste comme FILET DE SÉCURITÉ : si la mise en
     page tient sa garantie, il ne masque jamais rien. */
  const projectLabels = (now: number): void => {
    if (now - lastLabelPass < 33) return;
    lastLabelPass = now;
    const start = performance.now();

    candidates.length = 0;
    placed.length = 0;
    const halfW = width / 2;
    const halfH = height / 2;
    const ppw = height / (2 * tanHalf * Math.max(1, distance));

    const add = (
      key: string,
      text: string,
      worldX: number,
      worldY: number,
      kind: Candidate['kind'],
      lhWorld: number,
      opacityScale: number,
      slot = -1,
      dropBelowRadius = 0
    ): void => {
      scratch.set(worldX, worldY, 0).project(camera);
      if (scratch.z > 1) return;
      const px = clamp(lhWorld * ppw, LABEL_PX_FLOOR, LABEL_PX_CEILING);
      const w = textWidth(text, px, kind);
      const h = px * 1.45;
      const cx = scratch.x * halfW + halfW;
      let cy = -scratch.y * halfH + halfH;
      if (dropBelowRadius > 0) cy += dropBelowRadius * ppw + 4 + h / 2;
      const sx = cx - w / 2;
      const sy = cy - h / 2;
      if (sx > width + 40 || sx + w < -40 || sy > height + 40 || sy + h < -40) return;
      if (cy < CHROME_TOP || cy > height - CHROME_BOTTOM) return;

      candidates.push({ key, text, sx, sy, kind, slot, opacity: opacityScale, px, w, h });
    };

    /* PLUS AUCUNE PORTE DE ZOOM (verdict de Mika) : les noms des styles
       sont TOUJOURS candidats, sans zoomer. Quand la place manque
       physiquement, le placement garde les plus gros et les plus proches et
       masque le reste : on ne superpose jamais, on n'exige jamais un zoom
       pour qu'un nom existe. */
    for (const anchor of layout.ensembleAnchor) {
      add(`e-${anchor.label}`, anchor.label, anchor.x, anchor.y, 'ensemble', LABEL_WORLD.ensemble, 1);
    }

    FAMILIES.forEach((family, fi) => {
      if (introActive && introBirth(fi, now) < 0.4) return;
      const anchor = layout.familyAnchor[fi];
      if (!anchor) return;
      add(`f-${family.id}`, family.label, anchor.x, anchor.y, 'family', LABEL_WORLD.family, 1);
    });

    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot) continue;
      if (introActive && introBirth(slot.family, now) < 0.75) continue;

      add(
        `g-${slot.family}-${slot.local}`,
        slot.label,
        slot.world.x,
        slot.world.y,
        'genre',
        LABEL_WORLD.genre,
        1,
        i,
        sphereRadii[i] ?? 1
      );
    }

    /* Placement : ensembles, puis familles, puis genres du plus gros au
       plus petit (la taille projetée dit la proximité et la génération).
       Le filet masque en cas de collision au lieu de déplacer : un label
       déplacé ne désigne plus rien. */
    const rank = { ensemble: 0, family: 1, genre: 2 } as const;
    candidates.sort((a, b) => {
      const d = rank[a.kind] - rank[b.kind];
      if (d !== 0) return d;
      // Générations hautes d'abord : à zoom égal leur nom prime, les
      // feuilles se nomment dès qu'il reste de la place.
      const da = a.slot >= 0 ? (slotsData[a.slot]?.depth ?? 9) : 9;
      const db = b.slot >= 0 ? (slotsData[b.slot]?.depth ?? 9) : 9;
      return da - db;
    });

    for (const c of candidates) {
      if (placed.length >= LABEL_POOL) break;
      if (placed.some((other) => overlaps(c, other))) continue;
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
        ls.el.dataset['kind'] = entry.kind;
        ls.el.dataset['major'] = entry.kind === 'genre' ? '0' : '1';
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

  // --------------------------------------------------------------- rendu

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

  const frame = (): void => {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();

    if (!reducedMotion) {
      bgUniforms.uTime.value = now / 1000;
      // Flux lent le long des liens actifs : une bande toutes les 7 secondes.
      linkUniforms.uFlowTime.value = (now / 7000) % 1;
    }

    const friction = reducedMotion ? 0 : 0.9;
    distance = clamp(distance * Math.exp(dollyVel * 0.02), MIN_DISTANCE, MAX_DISTANCE);
    dollyVel *= friction * 0.96;

    if (flying) {
      const k = easeInOut(clamp((now - flyStart) / FLY_MS, 0, 1));
      targetSmooth.lerpVectors(flyFrom, flyTo, k);
      distance = flyFromDist + (flyToDist - flyFromDist) * k;
      target.copy(targetSmooth);
      if (k >= 1) flying = false;
    }

    applyCamera();

    const focusSlot = focusIndex >= 0 ? slotsData[focusIndex] : undefined;

    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot) continue;

      let presence = 1;
      let z = 0;

      /* Hiérarchie par la profondeur : le niveau courant vient en avant,
         le reste recule et s'estompe. Les POSITIONS dans le plan ne bougent
         jamais : la carte est fixe, seule l'emphase circule. */
      if (focusSlot) {
        const inSubtree = isDescendant(i, focusIndex);
        if (inSubtree) {
          z = Z_FRONT;
        } else if (slot.family === focusSlot.family) {
          z = Z_BACK;
          presence = 0.38;
        } else {
          z = Z_BACK;
          presence = 0.22;
        }
      } else if (level === 'family' && activeFamily >= 0) {
        if (slot.family === activeFamily) {
          z = Z_FRONT;
        } else {
          z = Z_BACK;
          presence = 0.42;
        }
      }

      /* Intro : la famille non née est absente, la naissante gonfle et
         éclate en s'écartant du centre de la carte vers sa place fixe. */
      let px = slot.world.x;
      let py = slot.world.y;
      if (introActive) {
        const birth = introBirth(slot.family, now);
        const sc = popScale(birth);
        sphereRadii[i] = (baseRadii[i] ?? 1) * sc;
        presence = sc <= 0.02 ? 0 : Math.min(1, sc);
        const e = 1 - Math.pow(1 - birth, 3);
        px = atlasTarget.x + (px - atlasTarget.x) * e;
        py = atlasTarget.y + (py - atlasTarget.y) * e;
      }

      /* Respiration et survol : le rayon vit, dans des bornes infimes. */
      if (!reducedMotion && !introActive) {
        const target = i === hovered ? 1 : 0;
        hoverAmount[i] = (hoverAmount[i] ?? 0) + (target - (hoverAmount[i] ?? 0)) * 0.22;
        const breath = 1 + 0.02 * Math.sin(now / 2300 + (breathPhase[i] ?? 0));
        sphereRadii[i] = (baseRadii[i] ?? 1) * breath * (1 + 0.08 * (hoverAmount[i] ?? 0));
      }

      sphereCenters[i * 3] = px;
      sphereCenters[i * 3 + 1] = py;
      sphereCenters[i * 3 + 2] = z;
      sphereState[i * 4] = suspended ? presence * 0.35 : presence;
      sphereState[i * 4 + 1] = i === focusIndex ? 0.22 : i === hovered ? 0.14 : 0;
      sphereState[i * 4 + 2] = slot.children.length;
      sphereState[i * 4 + 3] = labelled[i] ?? 0;

      // Projection écran pour le clic et le survol.
      scratch.set(px, py, z).project(camera);
      projected[i * 3] = scratch.x * (width / 2) + width / 2;
      projected[i * 3 + 1] = -scratch.y * (height / 2) + height / 2;
      projected[i * 3 + 2] = scratch.z;
    }
    sphereCenterAttr.needsUpdate = true;
    sphereStateAttr.needsUpdate = true;
    if (!reducedMotion) sphereRadiusAttr.needsUpdate = true;
    if (introActive) {
      sphereRadiusAttr.needsUpdate = true;
      const last = INTRO_ORDER.length * INTRO_STEP_MS + INTRO_POP_MS + 400;
      if (now - introStart > last) finishIntro();
    }

    // Liens : les extrémités sont fixes, seule l'emphase se met à jour.
    for (let i = 0; i < LINK_COUNT; i += 1) {
      const ref = linkRefs[i];
      if (!ref) continue;
      if (ref.internal) {
        if (introActive) {
          linkMeta[i * 3 + 1] = 1;
          linkMeta[i * 3 + 2] = clamp(introBirth(ref.familyA, now) * 1.4 - 0.2, 0, 1);
          continue;
        }
        linkMeta[i * 3 + 2] = 1;
        if (focusIndex >= 0 && ref.familyA === (slotsData[focusIndex]?.family ?? -1)) {
          const inSubtree = isDescendant(ref.b, focusIndex) && isDescendant(ref.a, focusIndex);
          linkMeta[i * 3] = inSubtree ? 1 : 0.12;
          linkMeta[i * 3 + 1] = inSubtree ? 1 : 0.1;
        } else {
          linkMeta[i * 3] = 0.35;
          linkMeta[i * 3 + 1] = 1;
        }
        /* Survol : les liens du noeud s'éclairent, du parent vers l'enfant
           (le flux du shader suit déjà ce sens). */
        if (hovered >= 0 && (ref.a === hovered || ref.b === hovered)) {
          linkMeta[i * 3] = 1;
          linkMeta[i * 3 + 1] = 1;
        }
      } else {
        if (introActive) {
          const bornA = introBirth(ref.familyA, now);
          const bornB = introBirth(ref.familyB, now);
          linkMeta[i * 3 + 1] = bornA > 0.5 ? 0.55 : 0;
          linkMeta[i * 3 + 2] = clamp(bornB * 1.4, 0, 1);
          continue;
        }
        linkMeta[i * 3 + 2] = 1;
        const hoveredFamily = hovered >= 0 ? (slotsData[hovered]?.family ?? -1) : -1;
        const concerned =
          ref.familyA === activeFamily ||
          ref.familyB === activeFamily ||
          ref.familyA === hoveredFamily ||
          ref.familyB === hoveredFamily;
        linkMeta[i * 3 + 1] = concerned ? 0.9 : 0.1;
      }
    }
    linkMetaAttr.needsUpdate = true;

    if (profiling) return;

    renderer.info.reset();
    renderOnce(true);
    projectLabels(now);

    frames += 1;
    if (now - fpsWindowStart > 500) {
      fps = (frames * 1000) / (now - fpsWindowStart);
      frames = 0;
      fpsWindowStart = now;
    }

    if (now - lastStatsPush > 500) {
      lastStatsPush = now;
      const fam = activeFamily >= 0 ? FAMILIES[activeFamily] : undefined;
      // La famille la plus proche du centre de vue, pour la ligne d'état.
      let nearestIdx = 0;
      let nearestD = Infinity;
      FAMILIES.forEach((_, fi) => {
        const anchor = layout.familyAnchor[fi];
        if (!anchor) return;
        const d = Math.hypot(anchor.x - targetSmooth.x, anchor.y - targetSmooth.y);
        if (d < nearestD) {
          nearestD = d;
          nearestIdx = fi;
        }
      });
      onStats({
        fps,
        drawCalls: renderer.info.render.calls,
        spheres: TOTAL_GENRES,
        links: LINK_COUNT,
        openLabel: fam?.label ?? '',
        deployPct: 1,
        distance,
        nearestLabel: FAMILIES[nearestIdx]?.label ?? '',
        nearestDistance: nearestD,
        labelsShown,
        genreLabelsShown,
        reduced,
        results
      });
    }
  };

  // ------------------------------------------------------------- énergie

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  applyCamera();
  engineReady = true;
  resize();
  requestAnimationFrame(frame);
  void runProfile();

  (window as unknown as { __atlas?: unknown }).__atlas = {
    framing: () => ({
      distance,
      atlasDistance,
      cameraAtDefault,
      width,
      height,
      aspect: camera.aspect,
      portrait: layout.portrait,
      bbox: layout.bbox,
      ensembles: layout.ensembleAnchor,
      families: layout.familyAnchor,
      minPitch: layout.minPitch,
      introActive
    }),
    measureGpu,
    measureLabels,
    runProfile,
    recenter,
    openPanel,
    closePanel,
    goToGenre,
    playIntro
  };

  return {
    zoom: (direction: 1 | -1) => {
      onFirstInteraction();
      cameraAtDefault = false;
      dollyVel += direction === 1 ? -5.5 : 5.5;
    },
    pan: (dx: number, dy: number) => {
      onFirstInteraction();
      pan(dx, dy);
    },
    goUp,
    goToFamily: (familyIndex: number) => {
      if (familyIndex < 0) {
        activeFamily = -1;
        activeGenre = -1;
        genrePath = [];
        focusIndex = -1;
        level = 'atlas';
        startFly(atlasTarget, atlasDistance, performance.now());
        cameraAtDefault = true;
        emitNav();
      } else {
        selectFamily(familyIndex, performance.now());
      }
    },
    openPanel,
    closePanel,
    goToGenre,
    playIntro,
    setSuspended: (value: boolean) => {
      suspended = value;
    },
    recenter,
    runProfile,
    dispose: () => {
      running = false;
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      for (const ls of labelSlots) ls.el.remove();
      renderer.dispose();
      delete (window as unknown as { __atlas?: unknown }).__atlas;
    }
  };
};
